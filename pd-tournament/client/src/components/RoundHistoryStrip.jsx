const ICON = { C: "🤝", D: "🗡️" };

export default function RoundHistoryStrip({ rounds }) {
  if (!rounds.length) {
    return <div className="empty-state" style={{ padding: 12 }}>Todavía no se ha jugado ninguna ronda.</div>;
  }
  return (
    <div className="history-strip">
      {rounds.map((r) => (
        <div key={r.round} className="history-chip">
          <span>{ICON[r.realizedA]}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--steel)" }}>R{r.round}</span>
          <span>{ICON[r.realizedB]}</span>
        </div>
      ))}
    </div>
  );
}
