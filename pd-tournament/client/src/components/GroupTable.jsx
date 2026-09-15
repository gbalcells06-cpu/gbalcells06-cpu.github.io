export default function GroupTable({ group, playersById }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      {group.standings.map((row, idx) => {
        const player = playersById.get(row.playerId);
        if (!player) return null;
        return (
          <div
            key={row.playerId}
            className="row-between"
            style={{ padding: "6px 8px", borderRadius: 8, background: idx < 2 ? "rgba(46,125,123,0.08)" : "transparent" }}
          >
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--steel)", width: 14 }}>{idx + 1}</span>
              <span style={{ fontSize: 15 }}>{player.avatar}</span>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{player.name}</span>
              {idx < 2 && <span className="pill pill-teal" style={{ fontSize: 10, padding: "2px 8px" }}>Clasifica</span>}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)" }}>{row.matchPoints} pts</span>
          </div>
        );
      })}
    </div>
  );
}
