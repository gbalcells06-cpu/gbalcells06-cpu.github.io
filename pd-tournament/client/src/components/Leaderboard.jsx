export default function Leaderboard({ standings, playersById, you }) {
  if (!standings.length) return <div className="empty-state">Todavía no hay resultados.</div>;

  return (
    <div className="stack" style={{ gap: 4 }}>
      {standings.map((row, idx) => {
        const player = playersById.get(row.playerId);
        if (!player) return null;
        return (
          <div
            key={row.playerId}
            className="row-between"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: row.playerId === you ? "rgba(46,125,123,0.1)" : "transparent",
            }}
          >
            <div className="row">
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--steel)", width: 22 }}>
                {idx + 1}
              </span>
              <div className="avatar" style={{ width: 34, height: 34, fontSize: 17 }}>
                {player.avatar}
              </div>
              <span style={{ fontWeight: 800 }}>{player.name}</span>
            </div>
            <div className="row" style={{ gap: 14 }}>
              <span style={{ fontSize: 12, color: "var(--steel)", fontWeight: 700 }}>
                {row.wins}V {row.draws}E {row.losses}D
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 16, color: "var(--navy)" }}>
                {row.points} pts
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
