import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { socket, emitAck } from "./socket.js";

const RoomContext = createContext(null);

function sessionKey(roomCode) {
  return `pd_session:${roomCode.toUpperCase()}`;
}

function loadSession(roomCode) {
  try {
    const raw = localStorage.getItem(sessionKey(roomCode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(roomCode, session) {
  try {
    localStorage.setItem(sessionKey(roomCode), JSON.stringify(session));
  } catch {
    // almacenamiento no disponible (modo privado, etc.): la sesión simplemente no persiste
  }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem("pd_profile");
    return raw ? JSON.parse(raw) : { name: "", avatar: "🦊" };
  } catch {
    return { name: "", avatar: "🦊" };
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem("pd_profile", JSON.stringify(profile));
  } catch {
    // ignorar
  }
}

export { loadProfile };

export function RoomProvider({ children }) {
  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const currentRoomCode = useRef(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      const code = currentRoomCode.current;
      if (code) {
        const session = loadSession(code);
        if (session) {
          emitAck("room:reconnect", { roomCode: code, sessionToken: session.sessionToken });
        }
      }
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onState(state) {
      setRoom(state);
      currentRoomCode.current = state.code;
    }
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onState);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onState);
    };
  }, []);

  const runAction = useCallback(async (event, payload) => {
    setBusy(true);
    setError(null);
    const res = await emitAck(event, payload);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Ha ocurrido un error");
    }
    return res;
  }, []);

  const createRoom = useCallback(
    async ({ name, avatar }) => {
      const res = await runAction("room:create", { name, avatar });
      if (res.ok) {
        currentRoomCode.current = res.roomCode;
        saveSession(res.roomCode, { playerId: res.playerId, sessionToken: res.sessionToken });
        saveProfile({ name, avatar });
      }
      return res;
    },
    [runAction]
  );

  const joinRoom = useCallback(
    async ({ roomCode, name, avatar }) => {
      const res = await runAction("room:join", { roomCode: roomCode.toUpperCase(), name, avatar });
      if (res.ok) {
        currentRoomCode.current = res.roomCode;
        saveSession(res.roomCode, { playerId: res.playerId, sessionToken: res.sessionToken });
        saveProfile({ name, avatar });
      }
      return res;
    },
    [runAction]
  );

  const tryReconnect = useCallback(
    async (roomCode) => {
      const session = loadSession(roomCode);
      if (!session) return { ok: false, error: "No hay una sesión guardada para esta sala" };
      currentRoomCode.current = roomCode.toUpperCase();
      const res = await runAction("room:reconnect", { roomCode: roomCode.toUpperCase(), sessionToken: session.sessionToken });
      return res;
    },
    [runAction]
  );

  const hasSession = useCallback((roomCode) => Boolean(loadSession(roomCode)), []);

  const updateConfig = useCallback((config) => runAction("room:updateConfig", { config }), [runAction]);
  const startTournament = useCallback(() => runAction("room:start", {}), [runAction]);
  const sendIntent = useCallback((matchId, message) => runAction("match:intent", { matchId, message }), [runAction]);
  const sendChoice = useCallback((matchId, choice) => runAction("match:choice", { matchId, choice }), [runAction]);

  const value = {
    connected,
    room,
    error,
    busy,
    clearError: () => setError(null),
    createRoom,
    joinRoom,
    tryReconnect,
    hasSession,
    updateConfig,
    startTournament,
    sendIntent,
    sendChoice,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom debe usarse dentro de RoomProvider");
  return ctx;
}
