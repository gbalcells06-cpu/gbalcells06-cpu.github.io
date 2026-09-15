// Prueba manual end-to-end: levanta el server real y simula N jugadores
// jugando un torneo completo por sockets, sin necesidad de abrir el cliente.
// Uso: node scripts/smoke-test.mjs   (o E2E_N=9 node scripts/smoke-test.mjs)
import http from "node:http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { registerSocketHandlers } from "../src/socketHandlers.js";

const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });
registerSocketHandlers(io);

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const url = `http://localhost:${port}`;
console.log("Server listening on", url);

function connect() {
  return ioClient(url, { transports: ["websocket"] });
}
function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

const N = Number(process.env.E2E_N || 4);
const sockets = await Promise.all(
  Array.from({ length: N }, () => new Promise((resolve) => {
    const s = connect();
    s.on("connect", () => resolve(s));
  }))
);

const states = new Map(); // socket -> latest room state
for (const s of sockets) {
  s.on("room:state", (state) => states.set(s, state));
}

const createAck = await emitAck(sockets[0], "room:create", { name: "Host", avatar: "🦊" });
console.log("create ack:", createAck);
const roomCode = createAck.roomCode;

const joinAcks = [];
for (let i = 1; i < N; i++) {
  joinAcks.push(await emitAck(sockets[i], "room:join", { roomCode, name: `P${i}`, avatar: "🐼" }));
}
console.log("join acks ok:", joinAcks.every((a) => a.ok));

await new Promise((r) => setTimeout(r, 100));

const cfgAck = await emitAck(sockets[0], "room:updateConfig", {
  config: { decisionTimeLimit: 2, intentTimeLimit: 1, roundsMode: "fixed", fixedRounds: 3 },
});
console.log("config ack:", cfgAck);

const startAck = await emitAck(sockets[0], "room:start", {});
console.log("start ack:", startAck);

await new Promise((r) => setTimeout(r, 300));

// Bucle: cada vez que un socket ve una partida activa en la que participa, envía una elección aleatoria.
const answered = new Set(); // `${socketIndex}-${matchId}-${round}`
let iterations = 0;
const maxIterations = 1200;

function tick() {
  iterations++;
  let anyFinished = false;
  let torneoTerminado = false;
  for (let i = 0; i < sockets.length; i++) {
    const s = sockets[i];
    const state = states.get(s);
    if (!state) continue;
    if (state.status === "finished") torneoTerminado = true;
    if (!state.tournament) continue;
    const match = state.tournament.matches.find(
      (m) => (m.playerA === state.you || m.playerB === state.you) && m.status === "playing"
    );
    if (match) {
      const key = `${i}-${match.id}-${match.currentRound}`;
      const already = match.yourChoiceSubmitted;
      if (!already && !answered.has(key)) {
        answered.add(key);
        s.emit("match:choice", { matchId: match.id, choice: Math.random() < 0.5 ? "C" : "D" }, () => {});
      }
    }
  }
  return torneoTerminado;
}

let done = false;
while (!done && iterations < maxIterations) {
  done = tick();
  await new Promise((r) => setTimeout(r, 50));
}

if (!done) {
  console.error("FALLO: el torneo no terminó dentro del límite de iteraciones");
  const state = states.get(sockets[0]);
  console.error("status:", state.status);
  for (const m of state.tournament.matches) {
    console.error(
      m.id, m.stage, m.round, "A=" + m.playerA, "B=" + m.playerB, m.status,
      "round", m.currentRound, "/", m.totalRounds, "intentDeadline", m.intentDeadline, "roundDeadline", m.roundDeadline
    );
  }
  process.exit(1);
}

const finalState = states.get(sockets[0]);
console.log("\nTorneo terminado. status:", finalState.status);
console.log("Ranking final (ids):", finalState.tournament ? "ver awards" : "-");
console.log("Awards:", finalState.awards ? Object.keys(finalState.awards.awards) : null);
console.log("Global standings:", finalState.tournament.globalStandings.map((r) => `${r.playerId}:${r.matchPoints}pts`));

for (const s of sockets) s.close();
server.close();
console.log("\nE2E OK");
process.exit(0);
