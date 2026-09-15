import { useEffect, useRef, useState } from "react";
import { useRoom } from "../state/RoomContext.jsx";
import CountdownTimer from "./CountdownTimer.jsx";
import ChoiceButtons from "./ChoiceButtons.jsx";
import RoundHistoryStrip from "./RoundHistoryStrip.jsx";
import RoundReveal from "./RoundReveal.jsx";

export default function PlayPhase({ match, playerA, playerB, isParticipant }) {
  const { sendChoice } = useRoom();
  const lastShown = useRef(match.rounds.length);
  const [revealRound, setRevealRound] = useState(null);
  const [localChoice, setLocalChoice] = useState(null);

  useEffect(() => {
    if (match.rounds.length > lastShown.current) {
      const newest = match.rounds[match.rounds.length - 1];
      setRevealRound(newest);
      lastShown.current = match.rounds.length;
      setLocalChoice(null);
    }
  }, [match.rounds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(choice) {
    setLocalChoice(choice);
    sendChoice(match.id, choice);
  }

  const alreadyChosen = match.yourChoiceSubmitted || Boolean(localChoice);

  return (
    <div className="stack fade-in">
      {revealRound && (
        <RoundReveal round={revealRound} playerA={playerA} playerB={playerB} onDone={() => setRevealRound(null)} />
      )}

      <div className="card">
        <div className="row-between">
          <ScoreBadge player={playerA} score={match.scoreA} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--steel)" }}>
              Ronda {match.currentRound}
              {match.totalRounds ? ` / ${match.totalRounds}` : ""}
            </div>
            {match.noiseEnabled && (
              <div className="pill pill-indigo" style={{ marginTop: 4, fontSize: 10 }}>
                ⚡ Ruido activo
              </div>
            )}
          </div>
          <ScoreBadge player={playerB} score={match.scoreB} align="right" />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10, fontSize: 15 }}>Historial de la partida</h3>
        <RoundHistoryStrip rounds={match.rounds} />
      </div>

      {isParticipant ? (
        <div className="card" style={{ textAlign: "center" }}>
          {alreadyChosen ? (
            <div className="stack" style={{ alignItems: "center" }}>
              <div style={{ fontSize: 30 }}>🤫</div>
              <strong>Ya has elegido. Esperando al rival…</strong>
            </div>
          ) : (
            <>
              <h3 style={{ marginBottom: 12 }}>¿Qué haces esta ronda?</h3>
              <ChoiceButtons onChoose={choose} disabled={alreadyChosen} selected={localChoice} />
            </>
          )}
          <div style={{ marginTop: 14 }}>
            <CountdownTimer deadline={match.roundDeadline} label="Tiempo restante" />
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="pill">👀 Modo espectador</div>
          <div style={{ marginTop: 10 }}>
            <CountdownTimer deadline={match.roundDeadline} label="Tiempo restante" />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ player, score, align = "left" }) {
  if (!player) return null;
  return (
    <div className="stack" style={{ alignItems: align === "right" ? "flex-end" : "flex-start", gap: 2 }}>
      <div className="row" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <div className="avatar" style={{ width: 34, height: 34, fontSize: 17 }}>
          {player.avatar}
        </div>
        <strong style={{ fontSize: 13 }}>{player.name}</strong>
      </div>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 22, color: "var(--navy)" }}>{score}</span>
    </div>
  );
}
