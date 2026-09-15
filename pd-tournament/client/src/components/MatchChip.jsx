const STATUS_LABEL = {
  pending: "Por definir",
  scheduled: "En cola",
  intent: "Fanfarronería",
  playing: "🔴 En directo",
  finished: "Finalizada",
  bye: "Pase directo",
};

function PlayerSide({ player, score, winner }) {
  if (!player) {
    return (
      <div className="row" style={{ opacity: 0.4 }}>
        <div className="avatar" style={{ width: 30, height: 30, fontSize: 15 }}>
          ❔
        </div>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Por definir</span>
      </div>
    );
  }
  return (
    <div className="row" style={{ opacity: winner === false ? 0.55 : 1 }}>
      <div className="avatar" style={{ width: 30, height: 30, fontSize: 15 }}>
        {player.avatar}
      </div>
      <span style={{ fontWeight: winner ? 900 : 700, fontSize: 13, color: winner ? "var(--teal-deep)" : "var(--ink)" }}>
        {player.name}
      </span>
      {score !== undefined && (
        <span style={{ marginLeft: "auto", fontWeight: 900, fontFamily: "var(--font-display)" }}>{score}</span>
      )}
    </div>
  );
}

export default function MatchChip({ match, playersById, onClick, highlight }) {
  const a = playersById.get(match.playerA);
  const b = playersById.get(match.playerB);
  const isFinished = match.status === "finished" || match.status === "bye";
  const winnerA = isFinished ? match.winner === match.playerA : undefined;
  const winnerB = isFinished ? match.winner === match.playerB : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        textAlign: "left",
        padding: 12,
        width: "100%",
        cursor: onClick ? "pointer" : "default",
        border: highlight ? "2px solid var(--teal)" : "1.5px solid var(--line)",
        boxShadow: highlight ? "0 0 0 4px rgba(46,125,123,0.14)" : "none",
      }}
    >
      <div className="stack" style={{ gap: 6 }}>
        <PlayerSide player={a} score={isFinished ? match.scoreA : undefined} winner={isFinished ? winnerA : undefined} />
        <div style={{ height: 1, background: "var(--line)" }} />
        <PlayerSide player={b} score={isFinished ? match.scoreB : undefined} winner={isFinished ? winnerB : undefined} />
      </div>
      <div className="row-between" style={{ marginTop: 8 }}>
        <span className={`pill ${match.status === "playing" ? "pill-teal" : ""}`}>{STATUS_LABEL[match.status]}</span>
        {match.status === "playing" && (
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--steel)" }}>Ronda {match.currentRound}</span>
        )}
      </div>
    </button>
  );
}
