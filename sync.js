// ---- Sincronización de progreso entre dispositivos (Firebase Firestore) ----
// API expuesta en window.progressSync: isConfigured(), isLinked(), getCode(),
// generateAndLink(), linkExisting(code), unlink(), notifyLocalChange(),
// onProgressChanged(cb), onStatusChange(cb), getStatus().
//
// El SDK de Firebase no se carga con <script> fijos en index.html: se pide
// por código bajo demanda (ver ensureFirebase() más abajo) y solo si
// SYNC_FIREBASE_CONFIG.apiKey no está vacío, para no pagar ese peso cuando la
// sincronización ni siquiera está configurada.
//
// Modelo de datos en Firestore: una colección "progress", un documento por
// código de sincronización, con un único campo "stats" que tiene EXACTAMENTE
// la misma forma que capitalsStats en localStorage (continente -> iso ->
// {assist, fail, streak, attempts, points}).
//
// Estrategia de fusión: no hay un servidor "autoritativo" que arbitre qué
// dispositivo tiene la razón, así que en vez de sumar contadores (lo que
// duplicaría datos cada vez que se sincroniza dos veces) se toma el máximo
// campo a campo entre las dos copias. Esto es idempotente (fusionar el mismo
// dato dos veces no cambia nada) y conmutativo, así que es seguro aplicarlo
// tanto al vincular por primera vez como en cada actualización en tiempo real,
// sin arriesgarse a bucles de escritura infinitos ni a inflar los contadores.
(function () {
  const STATS_KEY = "capitalsStats";
  const SYNC_CODE_KEY = "syncCode";
  const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L, para que no se confundan al copiarlos a mano
  const CODE_LENGTH = 6;
  const PUSH_DEBOUNCE_MS = 1500;

  let db = null;
  let configured = false;
  try {
    configured = !!(typeof SYNC_FIREBASE_CONFIG !== "undefined" && SYNC_FIREBASE_CONFIG.apiKey);
  } catch {
    configured = false;
  }

  // El SDK de Firebase (app + firestore) pesa varios cientos de KB y, si no
  // hay sincronización configurada, no aporta nada: en vez de cargarlo
  // siempre desde index.html, aquí se piden los <script> por código y solo la
  // primera vez que de verdad hacen falta (al vincular un código o al
  // reanudar una sincronización ya vinculada de una sesión anterior). Con
  // SYNC_FIREBASE_CONFIG.apiKey vacío (como viene por defecto) esto no
  // descarga ni un byte de Firebase.
  const FIREBASE_SCRIPTS = [
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
  ];
  let firebaseReadyPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.head.appendChild(el);
    });
  }

  // Devuelve una promesa que resuelve a true si Firebase está listo para
  // usarse (cargado e inicializado) o false si no hay nada configurado o la
  // carga ha fallado (sin red, bloqueado por un bloqueador de anuncios, etc.).
  // Se puede llamar tantas veces como se quiera: solo carga los scripts una vez.
  function ensureFirebase() {
    if (!configured) return Promise.resolve(false);
    if (!firebaseReadyPromise) {
      firebaseReadyPromise = FIREBASE_SCRIPTS.reduce(
        (chain, src) => chain.then(() => loadScript(src)),
        Promise.resolve()
      )
        .then(() => {
          firebase.initializeApp(SYNC_FIREBASE_CONFIG);
          db = firebase.firestore();
          return true;
        })
        .catch(() => {
          setStatus("error");
          return false;
        });
    }
    return firebaseReadyPromise;
  }

  let linkedCode = null;
  try {
    linkedCode = localStorage.getItem(SYNC_CODE_KEY);
  } catch {
    linkedCode = null;
  }

  let unsubscribeSnapshot = null;
  let remoteMirrorJson = null; // último contenido que sabemos que hay en Firestore para este código
  let pushDebounceTimer = null;
  let status = configured ? (linkedCode ? "linked" : "unlinked") : "not-configured";
  const progressListeners = [];
  const statusListeners = [];

  function setStatus(next) {
    status = next;
    statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch {
        // un listener roto no debe tumbar la sincronización del resto
      }
    });
  }

  function readLocalStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function writeLocalStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // sin persistencia disponible (privado/cuota llena): se sigue sin guardar
    }
  }

  // Lógica compartida con tests/ (ver lib/pure-helpers.js) — se cubre allí
  // con pruebas unitarias en vez de solo comprobándose sincronizando dos
  // dispositivos a mano.
  function mergeEntry(a, b) {
    return PureHelpers.mergeStatsEntry(a, b);
  }

  function mergeAllStats(localStats, remoteStats) {
    const merged = {};
    const continentIds = new Set([...Object.keys(localStats || {}), ...Object.keys(remoteStats || {})]);
    continentIds.forEach((cid) => {
      const localC = (localStats && localStats[cid]) || {};
      const remoteC = (remoteStats && remoteStats[cid]) || {};
      const isos = new Set([...Object.keys(localC), ...Object.keys(remoteC)]);
      merged[cid] = {};
      isos.forEach((iso) => {
        merged[cid][iso] = mergeEntry(localC[iso], remoteC[iso]);
      });
    });
    return merged;
  }

  function notifyProgressChanged() {
    progressListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // idem: un listener roto no debe tumbar la sincronización del resto
      }
    });
  }

  function docRef(code) {
    return db.collection("progress").doc(code);
  }

  // Envía el estado fusionado a Firestore solo si de verdad aporta algo nuevo
  // respecto a lo último que sabemos que hay guardado: evita el bucle en el
  // que cada dispositivo reenvía en eco lo que acaba de recibir del otro.
  function maybePush(code, mergedStats) {
    const json = JSON.stringify(mergedStats);
    if (json === remoteMirrorJson) return;
    setStatus("syncing");
    ensureFirebase().then((ready) => {
      if (!ready) {
        setStatus("error");
        return;
      }
      docRef(code)
        .set({ stats: mergedStats, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => {
          remoteMirrorJson = json;
          setStatus("synced");
        })
        .catch(() => {
          setStatus("error"); // el próximo cambio local o el siguiente snapshot lo reintentará
        });
    });
  }

  function startListening(code) {
    ensureFirebase().then((ready) => {
      if (!ready) {
        setStatus("error");
        return;
      }
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeSnapshot = docRef(code).onSnapshot(
        (snap) => {
          const remoteStats = (snap.exists && snap.data().stats) || {};
          const remoteJson = JSON.stringify(remoteStats);
          const localStats = readLocalStats();
          const merged = mergeAllStats(localStats, remoteStats);
          const mergedJson = JSON.stringify(merged);

          if (mergedJson !== JSON.stringify(localStats)) {
            writeLocalStats(merged);
            notifyProgressChanged();
          }

          if (mergedJson === remoteJson) {
            remoteMirrorJson = remoteJson;
            setStatus("synced");
          } else {
            maybePush(code, merged);
          }
        },
        () => setStatus("error")
      );
    });
  }

  function randomCode() {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }

  function link(code) {
    linkedCode = code;
    try {
      localStorage.setItem(SYNC_CODE_KEY, code);
    } catch {
      // sin persistencia disponible: la sincronización seguirá funcionando
      // mientras dure esta pestaña, pero no se recordará el código al recargar
    }
    startListening(code);
  }

  // ---- API pública ----
  function isConfigured() {
    return configured;
  }

  function isLinked() {
    return !!linkedCode;
  }

  function getCode() {
    return linkedCode;
  }

  function getStatus() {
    return status;
  }

  // Genera un código nuevo, comprueba que no esté ya en uso (muy improbable,
  // pero con reintento por seguridad) y sube el progreso actual del
  // dispositivo bajo ese código.
  async function generateAndLink() {
    if (!configured) return { ok: false, error: "not-configured" };
    const ready = await ensureFirebase();
    if (!ready) return { ok: false, error: "network" };
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      try {
        const snap = await docRef(code).get();
        if (snap.exists) continue; // colisión: se prueba con otro código
        const localStats = readLocalStats();
        await docRef(code).set({ stats: localStats, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        remoteMirrorJson = JSON.stringify(localStats);
        link(code);
        setStatus("synced");
        return { ok: true, code };
      } catch {
        return { ok: false, error: "network" };
      }
    }
    return { ok: false, error: "network" };
  }

  // Vincula este dispositivo a un código ya existente (creado en otro
  // dispositivo): fusiona el progreso de ambos y deja el resultado en los dos
  // sitios, para no perder el progreso que ya hubiera en este dispositivo.
  async function linkExisting(rawCode) {
    if (!configured) return { ok: false, error: "not-configured" };
    const code = (rawCode || "").trim().toUpperCase();
    if (code.length !== CODE_LENGTH) return { ok: false, error: "invalid" };
    const ready = await ensureFirebase();
    if (!ready) return { ok: false, error: "network" };
    try {
      const snap = await docRef(code).get();
      if (!snap.exists) return { ok: false, error: "not-found" };
      const remoteStats = snap.data().stats || {};
      const localStats = readLocalStats();
      const merged = mergeAllStats(localStats, remoteStats);
      writeLocalStats(merged);
      notifyProgressChanged();
      await docRef(code).set({ stats: merged, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      remoteMirrorJson = JSON.stringify(merged);
      link(code);
      setStatus("synced");
      return { ok: true, code };
    } catch {
      return { ok: false, error: "network" };
    }
  }

  // Deja de sincronizar en este dispositivo: el progreso local se queda tal
  // cual (no se borra nada), simplemente deja de viajar a partir de ahora.
  function unlink() {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    linkedCode = null;
    remoteMirrorJson = null;
    try {
      localStorage.removeItem(SYNC_CODE_KEY);
    } catch {
      // sin acceso a localStorage: igualmente se deja de escuchar en esta sesión
    }
    setStatus("unlinked");
  }

  // Aviso de script.js tras cada recordOutcome(): fusiona con lo último que
  // se sepa del remoto y sube el resultado, con un pequeño retardo para no
  // escribir en Firestore en cada letra/click sueltos.
  function notifyLocalChange() {
    if (!configured || !linkedCode) return;
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = setTimeout(() => {
      const localStats = readLocalStats();
      const remoteStats = remoteMirrorJson ? JSON.parse(remoteMirrorJson) : {};
      const merged = mergeAllStats(localStats, remoteStats);
      if (JSON.stringify(merged) !== JSON.stringify(localStats)) {
        writeLocalStats(merged);
        notifyProgressChanged();
      }
      maybePush(linkedCode, merged);
    }, PUSH_DEBOUNCE_MS);
  }

  function onProgressChanged(cb) {
    progressListeners.push(cb);
  }

  function onStatusChange(cb) {
    statusListeners.push(cb);
  }

  // Si este dispositivo ya estaba vinculado de una sesión anterior, retoma la
  // sincronización en tiempo real sin que el usuario tenga que hacer nada.
  if (configured && linkedCode) {
    startListening(linkedCode);
  }

  window.progressSync = {
    isConfigured,
    isLinked,
    getCode,
    getStatus,
    generateAndLink,
    linkExisting,
    unlink,
    notifyLocalChange,
    onProgressChanged,
    onStatusChange,
  };
})();
