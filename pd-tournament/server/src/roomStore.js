// Almacén en memoria de las salas. Vive mientras el proceso esté vivo: no
// hay base de datos, como pide el encargo (torneos de una sesión).
import { generateRoomCode, generateId } from "./utils/codeGenerator.js";

const rooms = new Map(); // code -> room

export const DEFAULT_CONFIG = {
  roundsMode: "random", // 'random' | 'fixed'
  roundsRange: [5, 8],
  fixedRounds: 6,
  payoff: { CC: [3, 3], DD: [1, 1], CD: [5, 0] }, // CD: [puntos del traidor, puntos del cooperador]
  decisionTimeLimit: 20, // segundos
  intentTimeLimit: 18, // segundos para la fase de "fanfarronería"
  noise: { enabled: false, probability: 0.07 },
};

export function createRoom() {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));
  const room = {
    code,
    hostId: null,
    status: "lobby", // lobby | in_progress | finished
    config: structuredClone(DEFAULT_CONFIG),
    players: new Map(),
    tournament: null,
    awards: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(String(code || "").toUpperCase());
}

export function touchRoom(room) {
  room.lastActivity = Date.now();
}

export function createPlayer({ name, avatar }) {
  return {
    id: generateId("p"),
    name: sanitizeName(name),
    avatar: avatar || "🙂",
    sessionToken: generateId("tok"),
    connected: true,
    socketId: null,
    joinedAt: Date.now(),
  };
}

function sanitizeName(name) {
  const trimmed = (name || "").toString().trim().slice(0, 20);
  return trimmed || "Jugador";
}

export function addPlayer(room, player) {
  room.players.set(player.id, player);
  if (!room.hostId) room.hostId = player.id;
  touchRoom(room);
}

export function findPlayerBySession(room, sessionToken) {
  return [...room.players.values()].find((p) => p.sessionToken === sessionToken);
}

export function isBusy(room, playerId) {
  if (!room.tournament) return false;
  return room.tournament.matches.some(
    (m) =>
      (m.playerA === playerId || m.playerB === playerId) &&
      (m.status === "intent" || m.status === "playing")
  );
}

export function findActiveMatchForPlayer(room, playerId) {
  if (!room.tournament) return null;
  return room.tournament.matches.find(
    (m) =>
      (m.playerA === playerId || m.playerB === playerId) &&
      (m.status === "intent" || m.status === "playing")
  );
}

export function getMatch(room, matchId) {
  if (!room.tournament) return null;
  return room.tournament.matches.find((m) => m.id === matchId);
}

export function allPlayersArray(room) {
  return [...room.players.values()];
}

const sweepListeners = [];
/** Se llama justo antes de borrar una sala abandonada (p.ej. para limpiar temporizadores). */
export function onRoomSwept(listener) {
  sweepListeners.push(listener);
}

// Limpieza periódica de salas abandonadas para no acumular memoria indefinidamente.
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const allDisconnected =
      room.players.size === 0 || [...room.players.values()].every((p) => !p.connected);
    const stale = now - room.lastActivity > ROOM_TTL_MS;
    if (stale && allDisconnected) {
      for (const listener of sweepListeners) listener(room);
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);
sweeper.unref?.();
