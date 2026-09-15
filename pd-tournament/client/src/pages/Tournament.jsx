import { useEffect, useMemo, useState } from "react";
import { useRoom } from "../state/RoomContext.jsx";
import TournamentBoard from "../components/TournamentBoard.jsx";
import Leaderboard from "../components/Leaderboard.jsx";
import Match from "./Match.jsx";

export default function Tournament() {
  const { room } = useRoom();
  const { tournament, players, you } = room;
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const [tab, setTab] = useState("board");
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const myActiveMatch = tournament.matches.find(
    (m) => (m.playerA === you || m.playerB === you) && (m.status === "intent" || m.status === "playing")
  );

  useEffect(() => {
    if (myActiveMatch && !selectedMatchId) {
      setSelectedMatchId(myActiveMatch.id);
    }
  }, [myActiveMatch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedMatchId) {
    const match = tournament.matches.find((m) => m.id === selectedMatchId);
    if (match) {
      return (
        <Match
          match={match}
          playersById={playersById}
          you={you}
          onBack={() => setSelectedMatchId(null)}
        />
      );
    }
  }

  return (
    <div className="stack fade-in">
      <div className="top-bar">
        <div className="brand">
          <div className="brand-mark">⚔️</div>
          Torneo en curso
        </div>
        <div className="room-code-chip">{room.code}</div>
      </div>

      {myActiveMatch && (
        <button className="card" style={{ textAlign: "left", cursor: "pointer", border: "2px solid var(--teal)" }} onClick={() => setSelectedMatchId(myActiveMatch.id)}>
          <div className="row-between">
            <strong style={{ color: "var(--teal-deep)" }}>🎮 Tienes una partida esperándote</strong>
            <span className="btn btn-primary" style={{ padding: "6px 16px", fontSize: 13 }}>Entrar</span>
          </div>
        </button>
      )}

      <div className="tabs">
        <button className={`tab ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")} type="button">
          Cuadro del torneo
        </button>
        <button className={`tab ${tab === "table" ? "active" : ""}`} onClick={() => setTab("table")} type="button">
          Clasificación general
        </button>
      </div>

      {tab === "board" ? (
        <TournamentBoard tournament={tournament} playersById={playersById} you={you} onSelectMatch={setSelectedMatchId} />
      ) : (
        <div className="card">
          <Leaderboard standings={tournament.globalStandings} playersById={playersById} you={you} />
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 13 }}>
        ¿No estás jugando ahora mismo? Toca cualquier partida en directo para verla en tiempo real.
      </p>
    </div>
  );
}
