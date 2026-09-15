import IntentPhase from "../components/IntentPhase.jsx";
import PlayPhase from "../components/PlayPhase.jsx";
import ComicStrip from "../components/ComicStrip.jsx";

export default function Match({ match, playersById, you, onBack }) {
  const playerA = playersById.get(match.playerA);
  const playerB = playersById.get(match.playerB);
  const isParticipant = Boolean(match.yourSide);

  return (
    <div className="stack fade-in">
      <button className="btn btn-ghost" type="button" onClick={onBack} style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
        ← Volver al torneo
      </button>

      {match.status === "intent" && <IntentPhase match={match} playersById={playersById} isParticipant={isParticipant} />}

      {match.status === "playing" && (
        <PlayPhase match={match} playerA={playerA} playerB={playerB} isParticipant={isParticipant} />
      )}

      {(match.status === "finished" || match.status === "bye") && (
        <ComicStrip match={match} playerA={playerA} playerB={playerB} />
      )}

      {(match.status === "scheduled" || match.status === "pending") && (
        <div className="card empty-state">Esta partida todavía no ha empezado.</div>
      )}
    </div>
  );
}
