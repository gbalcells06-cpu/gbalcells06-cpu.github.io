import MatchChip from "./MatchChip.jsx";
import GroupTable from "./GroupTable.jsx";

const STATUS_ORDER = { playing: 0, intent: 1, scheduled: 2, pending: 3, finished: 4, bye: 5 };

function sortMatches(matches) {
  return [...matches].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
}

export default function TournamentBoard({ tournament, playersById, you, onSelectMatch }) {
  const groupMatches = tournament.matches.filter((m) => m.stage === "group");
  const bracketMatches = tournament.matches.filter((m) => m.stage === "bracket");
  const bracketRounds = groupByRound(bracketMatches);

  return (
    <div className="stack">
      {tournament.format === "groups_bracket" ? (
        <>
          <div className="stack">
            <h3 style={{ marginBottom: 4 }}>Fase de grupos</h3>
            {tournament.groups.map((group) => (
              <details key={group.id} className="card" open>
                <summary style={{ cursor: "pointer", fontWeight: 800, color: "var(--navy)", fontFamily: "var(--font-display)" }}>
                  {group.name}
                </summary>
                <div style={{ marginTop: 12 }}>
                  <GroupTable group={group} playersById={playersById} />
                </div>
                <div className="stack" style={{ marginTop: 14, gap: 8 }}>
                  {sortMatches(groupMatches.filter((m) => m.groupId === group.id)).map((m) => (
                    <MatchChip
                      key={m.id}
                      match={m}
                      playersById={playersById}
                      onClick={() => onSelectMatch(m.id)}
                      highlight={involves(m, you)}
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>

          {bracketMatches.length > 0 && (
            <div className="stack">
              <h3 style={{ marginBottom: 4 }}>Eliminatorias</h3>
              <div className="bracket-scroll">
                {Object.entries(bracketRounds).map(([round, matches]) => (
                  <div key={round} className="bracket-col">
                    <div className="bracket-col-title">
                      {round === String(Math.max(...Object.keys(bracketRounds).map(Number))) ? "🏆 Final" : `Ronda ${round}`}
                    </div>
                    <div className="stack" style={{ gap: 24 }}>
                      {matches.map((m) => (
                        <MatchChip
                          key={m.id}
                          match={m}
                          playersById={playersById}
                          onClick={() => onSelectMatch(m.id)}
                          highlight={involves(m, you)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {sortMatches(tournament.matches).map((m) => (
            <MatchChip
              key={m.id}
              match={m}
              playersById={playersById}
              onClick={() => onSelectMatch(m.id)}
              highlight={involves(m, you)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function involves(match, playerId) {
  return match.playerA === playerId || match.playerB === playerId;
}

function groupByRound(matches) {
  const out = {};
  for (const m of matches) {
    out[m.round] = out[m.round] || [];
    out[m.round].push(m);
  }
  return out;
}
