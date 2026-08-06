// Funciones puras compartidas entre el navegador y las pruebas (tests/).
// No dependen del DOM, de localStorage ni de ningún estado global, así que
// se pueden llamar igual desde script.js/sync.js en el navegador que desde
// Node en tests/*.test.js. Sin este fichero, la única forma de comprobar
// esta lógica (comparación de respuestas, fusión de progreso al
// sincronizar, cálculo de la racha diaria) era jugar una partida a mano
// cada vez y confiar en no haber roto nada.
//
// Patrón UMD mínimo: expone window.PureHelpers en el navegador (cargado con
// un <script> normal, sin módulos ES) y module.exports en Node (para los
// tests, que lo cargan con require()).
(function (root, factory) {
  const helpers = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = helpers;
  } else {
    root.PureHelpers = helpers;
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Compara respuestas de capital ignorando mayúsculas, tildes y espacios
  // sueltos alrededor. Misma lógica que normalize() en script.js.
  function normalizeAnswer(str) {
    const decomposed = String(str).trim().toLowerCase().normalize("NFD");
    let result = "";
    for (const ch of decomposed) {
      const code = ch.codePointAt(0);
      if (code < 0x0300 || code > 0x036f) result += ch; // descarta acentos
    }
    return result;
  }

  // 0 (siempre mal) .. 1 (siempre bien a la primera), o null si no hay
  // intentos todavía. Misma fórmula que getCountryScore() en script.js.
  function computeCountryScore(entry) {
    if (!entry || !entry.attempts) return null;
    return entry.points / entry.attempts;
  }

  function normalizeStatsEntry(e) {
    return {
      assist: (e && e.assist) || 0,
      fail: (e && e.fail) || 0,
      attempts: (e && e.attempts) || 0,
      points: (e && e.points) || 0,
      streak: (e && e.streak) || 0,
    };
  }

  // Fusión "máximo campo a campo" usada al sincronizar progreso entre
  // dispositivos: idempotente y conmutativa (ver el comentario de estrategia
  // al principio de sync.js). Misma lógica que mergeEntry() allí.
  function mergeStatsEntry(a, b) {
    const ea = normalizeStatsEntry(a);
    const eb = normalizeStatsEntry(b);
    return {
      assist: Math.max(ea.assist, eb.assist),
      fail: Math.max(ea.fail, eb.fail),
      attempts: Math.max(ea.attempts, eb.attempts),
      points: Math.max(ea.points, eb.points),
      streak: Math.max(ea.streak, eb.streak),
    };
  }

  // Nº de días naturales entre dos fechas "YYYY-MM-DD" (para la racha diaria).
  function daysBetweenDates(a, b) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((new Date(b) - new Date(a)) / msPerDay);
  }

  return { normalizeAnswer, computeCountryScore, mergeStatsEntry, daysBetweenDates };
});
