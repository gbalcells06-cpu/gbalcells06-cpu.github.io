import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useRoom } from "../state/RoomContext.jsx";
import WrappedCard from "../components/WrappedCard.jsx";

export default function Results() {
  const { room } = useRoom();
  const { players, tournament, awards, finalRanking, you } = room;
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const ranking = finalRanking && finalRanking.length ? finalRanking : tournament.globalStandings.map((r) => r.playerId);

  const [selectedId, setSelectedId] = useState(you || ranking[0]);
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const podium = ranking.slice(0, 3);
  const selectedPlayer = playersById.get(selectedId);
  const selectedStats = awards?.statsByPlayer?.[selectedId];
  const earnedBadges = Object.values(awards?.awards ?? {}).filter((b) => b.playerId === selectedId);

  async function downloadCard() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement("a");
      link.download = `torneo-${(selectedPlayer?.name || "jugador").toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="stack fade-in">
      <div className="center-page" style={{ paddingTop: 0, paddingBottom: 0, gap: 6 }}>
        <div style={{ fontSize: 36 }}>🏆</div>
        <h1 style={{ marginBottom: 0 }}>¡Torneo terminado!</h1>
        <p style={{ marginTop: 0 }}>Gracias por jugar. Esto es lo que ha dado de sí vuestro torneo.</p>
      </div>

      <div className="podium">
        {[podium[1], podium[0], podium[2]].map((playerId, i) => {
          if (!playerId) return <div key={i} style={{ width: 92 }} />;
          const player = playersById.get(playerId);
          const place = [2, 1, 3][i];
          if (!player) return null;
          return (
            <div key={playerId} className={`podium-step podium-${place}`}>
              <div className="avatar avatar-lg">{player.avatar}</div>
              <strong style={{ fontSize: 13, textAlign: "center" }}>{player.name}</strong>
              <div className="podium-block">{["🥇", "🥈", "🥉"][place - 1]}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Clasificación final</h2>
        <div className="stack" style={{ gap: 4 }}>
          {ranking.map((playerId, idx) => {
            const player = playersById.get(playerId);
            if (!player) return null;
            const row = tournament.globalStandings.find((s) => s.playerId === playerId);
            return (
              <div key={playerId} className="row-between" style={{ padding: "6px 4px" }}>
                <div className="row">
                  <span style={{ width: 18, fontWeight: 800, color: "var(--steel)" }}>{idx + 1}</span>
                  <span>{player.avatar}</span>
                  <strong style={{ fontSize: 13.5 }}>{player.name}</strong>
                </div>
                {row && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--steel)" }}>{row.points} pts</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
        <h2 style={{ fontSize: 16, textAlign: "center" }}>Tu resumen estilo Wrapped 🎁</h2>
        <div className="row" style={{ justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {ranking.map((playerId) => {
            const player = playersById.get(playerId);
            if (!player) return null;
            return (
              <button
                key={playerId}
                type="button"
                onClick={() => setSelectedId(playerId)}
                className="avatar"
                style={{
                  cursor: "pointer",
                  borderColor: selectedId === playerId ? "var(--teal)" : "var(--line)",
                  borderWidth: selectedId === playerId ? 2 : 1.5,
                }}
                title={player.name}
              >
                {player.avatar}
              </button>
            );
          })}
        </div>

        {selectedPlayer && (
          <>
            <WrappedCard ref={cardRef} player={selectedPlayer} stats={selectedStats} badgesEarned={earnedBadges} />
            <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
              <button className="btn btn-primary" type="button" onClick={downloadCard} disabled={downloading}>
                {downloading ? "Generando…" : "📥 Descargar tarjeta"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
