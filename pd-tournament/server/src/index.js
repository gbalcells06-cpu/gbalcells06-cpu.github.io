import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socketHandlers.js";

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const allowedOrigins = CLIENT_ORIGIN === "*" ? "*" : CLIENT_ORIGIN.split(",").map((o) => o.trim());

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "pd-tournament-server" });
});
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`Servidor del torneo escuchando en el puerto ${PORT}`);
  console.log(`Orígenes permitidos: ${Array.isArray(allowedOrigins) ? allowedOrigins.join(", ") : allowedOrigins}`);
});
