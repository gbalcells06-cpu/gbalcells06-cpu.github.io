// Cálculo de estadísticas estilo "Spotify Wrapped" a partir del historial de
// partidas de un jugador, inspiradas en los rasgos que Axelrod identificó
// como clave en los torneos reales del Dilema del Prisionero.

/** Normaliza el historial de un jugador a una lista de rondas desde su punto de vista. */
function playerRounds(playerId, matches) {
  const rounds = [];
  for (const match of matches) {
    if (match.status !== "finished" || !match.playerB) continue;
    const isA = match.playerA === playerId;
    const isB = match.playerB === playerId;
    if (!isA && !isB) continue;
    for (const r of match.rounds) {
      rounds.push({
        matchId: match.id,
        round: r.round,
        own: isA ? r.realizedA : r.realizedB,
        rival: isA ? r.realizedB : r.realizedA,
        ownScore: isA ? r.scoreA : r.scoreB,
        rivalScore: isA ? r.scoreB : r.scoreA,
      });
    }
  }
  return rounds;
}

/** Agrupa rondas consecutivas por partida (para no mezclar el final de una partida con el inicio de otra). */
function byMatch(rounds) {
  const map = new Map();
  for (const r of rounds) {
    if (!map.has(r.matchId)) map.set(r.matchId, []);
    map.get(r.matchId).push(r);
  }
  return [...map.values()].map((list) => list.sort((a, b) => a.round - b.round));
}

export function computePlayerStats(playerId, matches) {
  const rounds = playerRounds(playerId, matches);
  const matchGroups = byMatch(rounds);

  if (rounds.length === 0) {
    return {
      playerId,
      roundsPlayed: 0,
      cooperationRate: 0,
      defectionRate: 0,
      niceScore: 0,
      forgivenessScore: 0,
      retaliationScore: 0,
      unpredictabilityScore: 0,
      bestStreak: 0,
    };
  }

  let cooperations = 0;
  let defections = 0;
  let unprovokedDefections = 0;
  let provokedOpportunities = 0; // rondas donde el rival defeccionó en la ronda anterior
  let retaliations = 0; // de esas, cuántas veces el jugador defeccionó también
  let forgivenessSamples = []; // rondas hasta volver a cooperar tras sufrir una traición
  let switches = 0;
  let transitions = 0;
  let bestStreak = 0;
  let currentStreak = 0;

  for (const roundsInMatch of matchGroups) {
    let roundsSinceBetrayed = null; // contador para medir "forgiveness" dentro de esta partida
    for (let i = 0; i < roundsInMatch.length; i++) {
      const r = roundsInMatch[i];
      if (r.own === "C") cooperations += 1;
      else defections += 1;

      if (r.ownScore >= r.rivalScore) {
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }

      const prev = roundsInMatch[i - 1];
      if (!prev) {
        // Primera ronda: cualquier traición es "no provocada" por definición.
        if (r.own === "D") unprovokedDefections += 1;
      } else {
        if (prev.rival === "D") {
          provokedOpportunities += 1;
          if (r.own === "D") retaliations += 1;
        } else if (r.own === "D") {
          unprovokedDefections += 1;
        }
        if (r.own !== prev.own) switches += 1;
        transitions += 1;
      }

      // Forgiveness: cuenta cuántas rondas tarda en volver a cooperar tras ser traicionado.
      if (prev && prev.rival === "D") {
        if (roundsSinceBetrayed === null) roundsSinceBetrayed = 0;
      }
      if (roundsSinceBetrayed !== null) {
        if (r.own === "C") {
          forgivenessSamples.push(roundsSinceBetrayed);
          roundsSinceBetrayed = null;
        } else {
          roundsSinceBetrayed += 1;
        }
      }
    }
  }

  const totalRounds = rounds.length;
  const cooperationRate = cooperations / totalRounds;
  const defectionRate = defections / totalRounds;
  // niceScore: 1 = nunca traiciona sin provocación, 0 = siempre lo hace.
  const niceScore = 1 - unprovokedDefections / totalRounds;
  // retaliationScore: probabilidad de responder a una traición con otra.
  const retaliationScore = provokedOpportunities > 0 ? retaliations / provokedOpportunities : 0;
  // forgivenessScore: 1 = perdona inmediatamente (0 rondas de represalia), decae con la espera.
  const avgForgiveWait =
    forgivenessSamples.length > 0
      ? forgivenessSamples.reduce((a, b) => a + b, 0) / forgivenessSamples.length
      : 0;
  const forgivenessScore = 1 / (1 + avgForgiveWait);
  const unpredictabilityScore = transitions > 0 ? switches / transitions : 0;

  return {
    playerId,
    roundsPlayed: totalRounds,
    cooperationRate,
    defectionRate,
    niceScore,
    forgivenessScore,
    retaliationScore,
    unpredictabilityScore,
    bestStreak,
  };
}

const BADGES = [
  { key: "nice", label: "El/La más noble", metric: "niceScore", icon: "🕊️" },
  { key: "forgiving", label: "El/La más indulgente", metric: "forgivenessScore", icon: "🌊" },
  { key: "retaliatory", label: "El/La más justiciero/a", metric: "retaliationScore", icon: "⚡" },
  { key: "unpredictable", label: "El/La más impredecible", metric: "unpredictabilityScore", icon: "🌀" },
  { key: "traitor", label: "El/La más traidor/a", metric: "defectionRate", icon: "🗡️" },
  { key: "cooperator", label: "El/La más cooperador/a", metric: "cooperationRate", icon: "🤝" },
  { key: "streak", label: "Mejor racha", metric: "bestStreak", icon: "🔥" },
];

/**
 * Calcula las estadísticas de todos los jugadores y asigna las "insignias"
 * a quien tenga el valor más alto en cada categoría (para las tarjetas Wrapped).
 */
export function computeTournamentAwards(players, matches) {
  const statsByPlayer = new Map(players.map((p) => [p.id, computePlayerStats(p.id, matches)]));
  const eligible = players.filter((p) => statsByPlayer.get(p.id).roundsPlayed > 0);

  const awards = {};
  for (const badge of BADGES) {
    let best = null;
    for (const p of eligible) {
      const value = statsByPlayer.get(p.id)[badge.metric];
      if (best === null || value > best.value) {
        best = { playerId: p.id, value };
      }
    }
    if (best) awards[badge.key] = { ...badge, playerId: best.playerId, value: best.value };
  }

  return { statsByPlayer: Object.fromEntries(statsByPlayer), awards, badges: BADGES };
}
