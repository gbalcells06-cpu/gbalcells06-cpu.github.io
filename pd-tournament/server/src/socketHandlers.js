import {
  createRoom,
  getRoom,
  createPlayer,
  addPlayer,
  findPlayerBySession,
  touchRoom,
  getMatch,
  onRoomSwept,
} from "./roomStore.js";
import { serializeRoom } from "./serialize.js";
import { buildTournament } from "./tournament.js";
import { activateReadyMatches, submitChoice, submitIntent, clearTimersForRoom } from "./matchLifecycle.js";

const MAX_PLAYERS = 16;

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeConfig(partial, base) {
  const next = structuredClone(base);
  if (!partial || typeof partial !== "object") return next;

  if (partial.roundsMode === "fixed" || partial.roundsMode === "random") {
    next.roundsMode = partial.roundsMode;
  }
  if (partial.fixedRounds !== undefined) {
    next.fixedRounds = clamp(partial.fixedRounds, 1, 50, base.fixedRounds);
  }
  if (Array.isArray(partial.roundsRange) && partial.roundsRange.length === 2) {
    const min = clamp(partial.roundsRange[0], 2, 40, base.roundsRange[0]);
    const max = clamp(partial.roundsRange[1], min, 40, Math.max(min, base.roundsRange[1]));
    next.roundsRange = [min, max];
  }
  if (partial.decisionTimeLimit !== undefined) {
    next.decisionTimeLimit = clamp(partial.decisionTimeLimit, 5, 120, base.decisionTimeLimit);
  }
  if (partial.intentTimeLimit !== undefined) {
    next.intentTimeLimit = clamp(partial.intentTimeLimit, 5, 60, base.intentTimeLimit);
  }
  if (partial.payoff && typeof partial.payoff === "object") {
    const pf = partial.payoff;
    if (Array.isArray(pf.CC)) next.payoff.CC = [clamp(pf.CC[0], 0, 20, base.payoff.CC[0]), clamp(pf.CC[1], 0, 20, base.payoff.CC[1])];
    if (Array.isArray(pf.DD)) next.payoff.DD = [clamp(pf.DD[0], 0, 20, base.payoff.DD[0]), clamp(pf.DD[1], 0, 20, base.payoff.DD[1])];
    if (Array.isArray(pf.CD)) next.payoff.CD = [clamp(pf.CD[0], 0, 20, base.payoff.CD[0]), clamp(pf.CD[1], 0, 20, base.payoff.CD[1])];
  }
  if (partial.noise && typeof partial.noise === "object") {
    next.noise = {
      enabled: Boolean(partial.noise.enabled),
      probability: clamp(partial.noise.probability, 0, 0.5, base.noise.probability),
    };
  }
  return next;
}

export function registerSocketHandlers(io) {
  // socket.id -> { roomCode, playerId }
  const socketMeta = new Map();

  function broadcastRoomState(room) {
    touchRoom(room);
    for (const player of room.players.values()) {
      if (player.connected && player.socketId) {
        io.to(player.socketId).emit("room:state", serializeRoom(room, player.id));
      }
    }
  }

  function withRoomAck(ack, fn) {
    try {
      fn();
    } catch (err) {
      ack?.({ ok: false, error: err.message || "Error inesperado" });
    }
  }

  io.on("connection", (socket) => {
    socket.on("room:create", ({ name, avatar } = {}, ack) => {
      withRoomAck(ack, () => {
        const room = createRoom();
        const player = createPlayer({ name, avatar });
        player.socketId = socket.id;
        addPlayer(room, player);
        socket.join(room.code);
        socketMeta.set(socket.id, { roomCode: room.code, playerId: player.id });
        ack?.({ ok: true, roomCode: room.code, playerId: player.id, sessionToken: player.sessionToken });
        broadcastRoomState(room);
      });
    });

    socket.on("room:join", ({ roomCode, name, avatar } = {}, ack) => {
      withRoomAck(ack, () => {
        const room = getRoom(roomCode);
        if (!room) return ack?.({ ok: false, error: "No existe una sala con ese código" });
        if (room.players.size >= MAX_PLAYERS) {
          return ack?.({ ok: false, error: "La sala está llena (máximo 16 jugadores)" });
        }
        const player = createPlayer({ name, avatar });
        player.socketId = socket.id;
        addPlayer(room, player);
        socket.join(room.code);
        socketMeta.set(socket.id, { roomCode: room.code, playerId: player.id });
        ack?.({ ok: true, roomCode: room.code, playerId: player.id, sessionToken: player.sessionToken });
        broadcastRoomState(room);
      });
    });

    socket.on("room:reconnect", ({ roomCode, sessionToken } = {}, ack) => {
      withRoomAck(ack, () => {
        const room = getRoom(roomCode);
        if (!room) return ack?.({ ok: false, error: "La sala ya no existe" });
        const player = findPlayerBySession(room, sessionToken);
        if (!player) return ack?.({ ok: false, error: "No se pudo restaurar tu sesión en esta sala" });
        player.connected = true;
        player.socketId = socket.id;
        socket.join(room.code);
        socketMeta.set(socket.id, { roomCode: room.code, playerId: player.id });
        ack?.({ ok: true, roomCode: room.code, playerId: player.id, sessionToken: player.sessionToken });
        broadcastRoomState(room);
      });
    });

    socket.on("room:updateConfig", ({ config } = {}, ack) => {
      withRoomAck(ack, () => {
        const meta = socketMeta.get(socket.id);
        const room = meta && getRoom(meta.roomCode);
        if (!room) return ack?.({ ok: false, error: "Sala no encontrada" });
        if (room.hostId !== meta.playerId) return ack?.({ ok: false, error: "Solo el anfitrión puede cambiar la configuración" });
        if (room.status !== "lobby") return ack?.({ ok: false, error: "El torneo ya ha empezado" });
        room.config = sanitizeConfig(config, room.config);
        ack?.({ ok: true });
        broadcastRoomState(room);
      });
    });

    socket.on("room:start", (_payload, ack) => {
      withRoomAck(ack, () => {
        const meta = socketMeta.get(socket.id);
        const room = meta && getRoom(meta.roomCode);
        if (!room) return ack?.({ ok: false, error: "Sala no encontrada" });
        if (room.hostId !== meta.playerId) return ack?.({ ok: false, error: "Solo el anfitrión puede iniciar el torneo" });
        if (room.status !== "lobby") return ack?.({ ok: false, error: "El torneo ya ha empezado" });
        const players = [...room.players.values()];
        if (players.length < 2) return ack?.({ ok: false, error: "Hacen falta al menos 2 jugadores" });

        room.tournament = buildTournament(players);
        room.status = "in_progress";
        ack?.({ ok: true });
        activateReadyMatches(room, () => broadcastRoomState(room));
        broadcastRoomState(room);
      });
    });

    socket.on("match:intent", ({ matchId, message } = {}, ack) => {
      withRoomAck(ack, () => {
        const meta = socketMeta.get(socket.id);
        const room = meta && getRoom(meta.roomCode);
        if (!room) return ack?.({ ok: false, error: "Sala no encontrada" });
        const match = getMatch(room, matchId);
        if (!match) return ack?.({ ok: false, error: "Partida no encontrada" });
        const ok = submitIntent(match, meta.playerId, String(message ?? "").slice(0, 60));
        if (!ok) return ack?.({ ok: false, error: "No participas en esta partida" });
        ack?.({ ok: true });
        broadcastRoomState(room);
      });
    });

    socket.on("match:choice", ({ matchId, choice } = {}, ack) => {
      withRoomAck(ack, () => {
        const meta = socketMeta.get(socket.id);
        const room = meta && getRoom(meta.roomCode);
        if (!room) return ack?.({ ok: false, error: "Sala no encontrada" });
        const match = getMatch(room, matchId);
        if (!match) return ack?.({ ok: false, error: "Partida no encontrada" });
        const ok = submitChoice(room, match, meta.playerId, choice, () => broadcastRoomState(room));
        if (!ok) return ack?.({ ok: false, error: "No se pudo registrar tu elección" });
        ack?.({ ok: true });
        broadcastRoomState(room);
      });
    });

    socket.on("room:leave", (_payload, ack) => {
      withRoomAck(ack, () => {
        const meta = socketMeta.get(socket.id);
        if (!meta) return ack?.({ ok: true });
        const room = getRoom(meta.roomCode);
        if (room) {
          const player = room.players.get(meta.playerId);
          if (player) {
            player.connected = false;
            player.socketId = null;
          }
          broadcastRoomState(room);
        }
        socket.leave(meta.roomCode);
        socketMeta.delete(socket.id);
        ack?.({ ok: true });
      });
    });

    socket.on("disconnect", () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const room = getRoom(meta.roomCode);
      if (room) {
        const player = room.players.get(meta.playerId);
        if (player && player.socketId === socket.id) {
          player.connected = false;
          player.socketId = null;
          broadcastRoomState(room);
        }
      }
      socketMeta.delete(socket.id);
    });
  });

  onRoomSwept((room) => clearTimersForRoom(room));
}
