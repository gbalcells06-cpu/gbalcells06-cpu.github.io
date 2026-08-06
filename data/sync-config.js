// Configuración del proyecto Firebase usado únicamente para sincronizar el
// progreso (aciertos/fallos por país) entre dispositivos mediante un código.
// Estos valores son la configuración pública del cliente de Firebase: no son
// un secreto que haya que ocultar (la seguridad real la dan las reglas de
// Firestore, no esconder este objeto), así que es seguro tenerlos aquí.
//
// Para rellenarlos: Firebase Console > Configuración del proyecto > tu app
// web > "Configuración del SDK".
//
// Si SYNC_FIREBASE_CONFIG.apiKey se deja vacío, la sincronización se
// desactiva sola y el resto de la app sigue funcionando con normalidad
// (solo con el progreso local, como hasta ahora).
const SYNC_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
