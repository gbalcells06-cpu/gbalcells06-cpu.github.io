import { useState } from "react";
import { useRoom } from "../state/RoomContext.jsx";
import PlayersList from "../components/PlayersList.jsx";
import ConfigPanel from "../components/ConfigPanel.jsx";

export default function Lobby() {
  const { room, startTournament, busy, error } = useRoom();
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === room.you;
  const shareUrl = `${window.location.origin}/room/${room.code}`;

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const format =
    room.players.length <= 6
      ? "Todos contra todos"
      : "Fase de grupos + eliminatorias";

  return (
    <div className="stack fade-in">
      <div className="top-bar">
        <div className="brand">
          <div className="brand-mark">🤝</div>
          Sala de espera
        </div>
        <div className="room-code-chip">{room.code}</div>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h2 style={{ marginBottom: 0 }}>Invita a tu grupo</h2>
        </div>
        <p style={{ marginTop: 0 }}>Comparte este enlace por WhatsApp para que se unan directamente:</p>
        <div className="row-between" style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "10px 14px" }}>
          <span style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {shareUrl}
          </span>
          <button className="btn btn-secondary" type="button" onClick={copyLink} style={{ flexShrink: 0, padding: "8px 14px" }}>
            {copied ? "¡Copiado! ✅" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Jugadores ({room.players.length}/16)</h2>
        <PlayersList players={room.players} hostId={room.hostId} />
        <p className="field-hint" style={{ marginTop: 10 }}>
          Formato previsto con este número de jugadores: <strong style={{ color: "var(--teal-deep)" }}>{format}</strong>
        </p>
      </div>

      {isHost ? (
        <div className="card">
          <h2>Configuración del torneo</h2>
          <ConfigPanel config={room.config} />
          {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 18 }}
            disabled={busy || room.players.length < 2}
            onClick={() => startTournament()}
          >
            {room.players.length < 2 ? "Esperando a más jugadores…" : "🚀 Empezar torneo"}
          </button>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>⏳</div>
          <p style={{ margin: 0, fontWeight: 700, color: "var(--navy)" }}>
            Esperando a que el anfitrión/a inicie el torneo…
          </p>
        </div>
      )}
    </div>
  );
}
