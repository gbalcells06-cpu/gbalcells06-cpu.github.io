export default function PlayersList({ players, hostId }) {
  return (
    <div className="stack">
      {players.map((p) => (
        <div key={p.id} className="row-between" style={{ padding: "8px 4px" }}>
          <div className="row">
            <div className="avatar" style={{ opacity: p.connected ? 1 : 0.4 }}>
              {p.avatar}
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "var(--ink)", opacity: p.connected ? 1 : 0.5 }}>{p.name}</div>
              {!p.connected && (
                <div style={{ fontSize: 12, color: "var(--steel)", fontWeight: 700 }}>Desconectado</div>
              )}
            </div>
          </div>
          {p.id === hostId && <span className="pill pill-gold">👑 Anfitrión</span>}
        </div>
      ))}
    </div>
  );
}
