const ICON = { C: "🤝", D: "🗡️" };

export default function ComicStrip({ match, playerA, playerB }) {
  const winnerName =
    match.winner === match.playerA ? playerA?.name : match.winner === match.playerB ? playerB?.name : null;

  return (
    <div className="stack fade-in">
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 34 }}>{winnerName ? "🏆" : "🤝"}</div>
        <h2 style={{ marginBottom: 4 }}>{winnerName ? `¡${winnerName} gana el enfrentamiento!` : "Empate"}</h2>
        <p style={{ margin: 0 }}>
          {playerA?.name} {match.scoreA} — {match.scoreB} {playerB?.name}
        </p>
        {match.roundsMode === "random" && (
          <p style={{ fontSize: 12.5, marginTop: 6 }}>La partida duró {match.rounds.length} rondas (nadie lo sabía de antemano).</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12, fontSize: 15 }}>La tira cómica de la partida</h3>
        <div className="comic-panel">
          {match.rounds.map((r) => (
            <div key={r.round} className="comic-cell">
              <span style={{ fontSize: 10, fontWeight: 800, color: "var(--steel)" }}>R{r.round}</span>
              <span style={{ fontSize: 20 }}>{ICON[r.realizedA]}</span>
              <span style={{ fontSize: 10, color: "var(--steel)" }}>vs</span>
              <span style={{ fontSize: 20 }}>{ICON[r.realizedB]}</span>
              <span style={{ fontSize: 10, fontWeight: 800 }}>
                {r.scoreA}-{r.scoreB}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
