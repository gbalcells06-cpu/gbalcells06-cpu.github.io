import { forwardRef } from "react";

const WrappedCard = forwardRef(function WrappedCard({ player, stats, badgesEarned }, ref) {
  const cooperationPct = Math.round((stats?.cooperationRate ?? 0) * 100);
  const defectionPct = Math.round((stats?.defectionRate ?? 0) * 100);
  const headline = badgesEarned[0];

  return (
    <div ref={ref} className="wrapped-card">
      <div className="wrapped-card-inner">
        <div className="wrapped-kicker">Torneo del Dilema del Prisionero</div>
        <div className="wrapped-avatar">{player.avatar}</div>
        <h2 className="wrapped-name">{player.name}</h2>

        {headline ? (
          <div className="wrapped-headline">
            <span style={{ fontSize: 30 }}>{headline.icon}</span>
            <span>{headline.label}</span>
          </div>
        ) : (
          <div className="wrapped-headline">
            <span style={{ fontSize: 30 }}>🎲</span>
            <span>Jugador/a del torneo</span>
          </div>
        )}

        {badgesEarned.length > 1 && (
          <div className="row" style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            {badgesEarned.slice(1).map((b) => (
              <span key={b.key} className="wrapped-pill">
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        )}

        <div className="wrapped-stats">
          <div className="wrapped-stat">
            <span className="wrapped-stat-value">{cooperationPct}%</span>
            <span className="wrapped-stat-label">Cooperación</span>
          </div>
          <div className="wrapped-stat">
            <span className="wrapped-stat-value">{defectionPct}%</span>
            <span className="wrapped-stat-label">Traición</span>
          </div>
          <div className="wrapped-stat">
            <span className="wrapped-stat-value">{stats?.bestStreak ?? 0}</span>
            <span className="wrapped-stat-label">Mejor racha</span>
          </div>
          <div className="wrapped-stat">
            <span className="wrapped-stat-value">{stats?.roundsPlayed ?? 0}</span>
            <span className="wrapped-stat-label">Rondas jugadas</span>
          </div>
        </div>

        <div className="wrapped-footer">🕊️ 🤝 🗡️ · Dilema del Prisionero</div>
      </div>
    </div>
  );
});

export default WrappedCard;
