import { useState } from "react";
import { useRoom } from "../state/RoomContext.jsx";
import CountdownTimer from "./CountdownTimer.jsx";

const INTENT_OPTIONS = [
  "🤝 Prometo cooperar",
  "😈 Vas a sufrir",
  "🤔 Depende de ti",
  "🎯 Juego limpio, lo prometo",
  "🃏 Ya veremos qué pasa...",
  "🔥 Sin piedad",
  "🕊️ Empecemos en paz",
  "🎭 No te fíes de mí",
];

export default function IntentPhase({ match, playersById, isParticipant }) {
  const { sendIntent } = useRoom();
  const [sent, setSent] = useState(false);
  const playerA = playersById.get(match.playerA);
  const playerB = playersById.get(match.playerB);
  const mySide = match.yourSide;
  const myIntent = mySide === "A" ? match.intents.A : mySide === "B" ? match.intents.B : null;

  function choose(message) {
    sendIntent(match.id, message);
    setSent(true);
  }

  return (
    <div className="stack fade-in">
      <div className="card" style={{ textAlign: "center" }}>
        <div className="pill pill-indigo" style={{ marginBottom: 10 }}>
          Fase de fanfarronería
        </div>
        <div className="row" style={{ justifyContent: "center", gap: 28 }}>
          <PlayerBadge player={playerA} message={match.intents.A} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--steel)" }}>vs</span>
          <PlayerBadge player={playerB} message={match.intents.B} />
        </div>
        <div style={{ marginTop: 14 }}>
          <CountdownTimer deadline={match.intentDeadline} label="Empieza en" />
        </div>
        <p style={{ fontSize: 13, marginTop: 10 }}>
          Nada de esto es vinculante — es pura estrategia y fanfarronería antes de jugar de verdad.
        </p>
      </div>

      {isParticipant && !myIntent && !sent && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Elige tu mensaje</h3>
          <div className="row" style={{ gap: 8 }}>
            {INTENT_OPTIONS.map((opt) => (
              <button key={opt} type="button" className="btn btn-secondary" onClick={() => choose(opt)}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerBadge({ player, message }) {
  if (!player) return null;
  return (
    <div className="stack" style={{ alignItems: "center", gap: 6, width: 140 }}>
      <div className="avatar avatar-lg">{player.avatar}</div>
      <strong style={{ fontSize: 14 }}>{player.name}</strong>
      <div
        style={{
          minHeight: 34,
          fontSize: 12.5,
          fontWeight: 700,
          color: message ? "var(--navy)" : "var(--steel)",
          background: message ? "var(--bg-soft)" : "transparent",
          borderRadius: 10,
          padding: message ? "6px 10px" : 0,
        }}
      >
        {message || "…pensando"}
      </div>
    </div>
  );
}
