// Lógica pura de emparejamientos del torneo. No conoce sockets ni I/O:
// recibe listas de jugadores/resultados y devuelve estructuras de datos.
import { generateId } from "./utils/codeGenerator.js";

const ROUND_ROBIN_MAX_PLAYERS = 6;
const GROUP_TARGET_SIZE = 5;
const QUALIFIERS_PER_GROUP = 2;

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMatch({ stage, round, groupId, playerA, playerB, bracketSlot }) {
  // 'pending': todavía no se conocen ambos jugadores (ronda de bracket futura).
  // 'bye': se conoce un único jugador real y no habrá rival (avanza solo).
  // 'scheduled': ambos jugadores conocidos, lista para jugarse.
  let status;
  if (playerA && playerB) status = "scheduled";
  else if (playerA && !playerB) status = "bye";
  else status = "pending";
  return {
    id: generateId("m"),
    stage, // 'group' | 'bracket'
    round, // número de ronda dentro de la fase (para mostrar el bracket)
    groupId: groupId ?? null,
    bracketSlot: bracketSlot ?? null, // posición en el bracket, para dibujar líneas
    playerA,
    playerB, // null => aún sin rival conocido, o bye si playerA ya está fijado
    status,
    winner: status === "bye" ? playerA : null,
    scoreA: 0,
    scoreB: 0,
    nextMatchId: null,
    nextMatchSlot: null, // 'A' | 'B'
  };
}

/** Todos contra todos, cada pareja una vez. */
function roundRobinPairs(players) {
  const pairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      pairs.push([players[i], players[j]]);
    }
  }
  return pairs;
}

/** Reparte jugadores en grupos de 4-5 lo más equilibrados posible. */
function splitIntoGroups(players, targetSize = GROUP_TARGET_SIZE) {
  const shuffled = shuffle(players);
  const numGroups = Math.max(2, Math.ceil(shuffled.length / targetSize));
  const groups = Array.from({ length: numGroups }, () => []);
  shuffled.forEach((player, idx) => {
    groups[idx % numGroups].push(player);
  });
  return groups.map((members, idx) => ({
    id: `G${idx + 1}`,
    name: `Grupo ${String.fromCharCode(65 + idx)}`,
    memberIds: members.map((p) => p.id),
  }));
}

/**
 * Decide el formato y genera la fase inicial del torneo.
 * <=6 jugadores: round robin simple.
 * >=7 jugadores: grupos de 4-5 + bracket eliminatorio posterior (generado
 * cuando termina la fase de grupos, ver buildBracketFromGroups).
 */
export function buildTournament(players) {
  if (players.length < 2) {
    throw new Error("Se necesitan al menos 2 jugadores para iniciar el torneo");
  }

  if (players.length <= ROUND_ROBIN_MAX_PLAYERS) {
    const pairs = shuffle(roundRobinPairs(players));
    const matches = pairs.map(([a, b], idx) =>
      makeMatch({ stage: "group", round: 1, groupId: null, playerA: a.id, playerB: b.id, bracketSlot: idx })
    );
    return {
      format: "round_robin",
      groups: [],
      matches,
      stage: "group",
    };
  }

  const groups = splitIntoGroups(players);
  const byId = new Map(players.map((p) => [p.id, p]));
  const matches = [];
  for (const group of groups) {
    const groupPlayers = group.memberIds.map((id) => byId.get(id));
    const pairs = roundRobinPairs(groupPlayers);
    pairs.forEach(([a, b]) => {
      matches.push(makeMatch({ stage: "group", round: 1, groupId: group.id, playerA: a.id, playerB: b.id }));
    });
  }

  return {
    format: "groups_bracket",
    groups,
    matches,
    stage: "group",
  };
}

/** Siguiente potencia de dos >= n (mínimo 2). */
function nextPowerOfTwo(n) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/**
 * Orden de siembra estándar de un bracket de tamaño `size` (potencia de 2),
 * p.ej. para 8: [1,8,4,5,2,7,3,6]. Evita que las dos mejores semillas se
 * crucen antes de la final.
 */
function standardSeedOrder(size) {
  let order = [1];
  let n = 1;
  while (n < size) {
    n *= 2;
    const next = [];
    for (const s of order) next.push(s, n + 1 - s);
    order = next;
  }
  return order;
}

/** Calcula la clasificación de un grupo (o de todo el round robin) a partir de sus partidas. */
export function computeStandings(players, matches) {
  const table = new Map(
    players.map((p) => [
      p.id,
      { playerId: p.id, played: 0, wins: 0, draws: 0, losses: 0, points: 0, matchPoints: 0 },
    ])
  );

  for (const match of matches) {
    if (match.status !== "finished" && match.status !== "bye") continue;
    if (!match.playerB) continue; // bye no cuenta para estadísticas
    const rowA = table.get(match.playerA);
    const rowB = table.get(match.playerB);
    if (!rowA || !rowB) continue;
    rowA.played += 1;
    rowB.played += 1;
    rowA.points += match.scoreA;
    rowB.points += match.scoreB;
    if (match.scoreA > match.scoreB) {
      rowA.wins += 1;
      rowB.losses += 1;
      rowA.matchPoints += 3;
    } else if (match.scoreB > match.scoreA) {
      rowB.wins += 1;
      rowA.losses += 1;
      rowB.matchPoints += 3;
    } else {
      rowA.draws += 1;
      rowB.draws += 1;
      rowA.matchPoints += 1;
      rowB.matchPoints += 1;
    }
  }

  return [...table.values()].sort(
    (a, b) => b.matchPoints - a.matchPoints || b.points - a.points || b.wins - a.wins
  );
}

/**
 * A partir de los grupos terminados, calcula quién clasifica y arma el
 * bracket eliminatorio (con "byes" si hace falta para llegar a potencia de 2).
 */
export function buildBracketFromGroups(groups, allPlayers, allMatches) {
  const byId = new Map(allPlayers.map((p) => [p.id, p]));
  const qualifiersByRank = []; // [ [primeros...], [segundos...] ]
  for (let rank = 0; rank < QUALIFIERS_PER_GROUP; rank++) qualifiersByRank.push([]);

  for (const group of groups) {
    const groupPlayers = group.memberIds.map((id) => byId.get(id));
    const groupMatches = allMatches.filter((m) => m.groupId === group.id);
    const standings = computeStandings(groupPlayers, groupMatches);
    standings.slice(0, QUALIFIERS_PER_GROUP).forEach((row, rank) => {
      qualifiersByRank[rank].push({ playerId: row.playerId, groupId: group.id, ...row });
    });
  }

  // Semillas: todos los primeros de grupo (mejor a peor), luego todos los segundos.
  const seeds = qualifiersByRank.flat();
  const bracketSize = nextPowerOfTwo(seeds.length);
  const order = standardSeedOrder(bracketSize);

  const slots = new Array(bracketSize).fill(null);
  order.forEach((seedNumber, position) => {
    slots[position] = seeds[seedNumber - 1] ?? null;
  });

  // Ronda 1 del bracket.
  const round1 = [];
  for (let i = 0; i < bracketSize; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    round1.push(
      makeMatch({
        stage: "bracket",
        round: 1,
        playerA: a ? a.playerId : null,
        playerB: b ? b.playerId : null,
        bracketSlot: i / 2,
      })
    );
  }
  // Si un lado quedó vacío por completo (bye contra bye), no debería pasar con
  // el redondeo a potencia de 2 salvo tableros muy pequeños; se filtra por seguridad.
  const round1Clean = round1.filter((m) => m.playerA || m.playerB);
  round1Clean.forEach((m) => {
    if (!m.playerA && m.playerB) {
      m.playerA = m.playerB;
      m.playerB = null;
    }
    if (!m.playerB) {
      m.status = "bye";
      m.winner = m.playerA;
    }
  });

  const allBracketMatches = [...round1Clean];
  let currentRound = round1Clean;
  let roundNumber = 2;
  while (currentRound.length > 1) {
    const nextRound = [];
    for (let i = 0; i < currentRound.length; i += 2) {
      const match = makeMatch({
        stage: "bracket",
        round: roundNumber,
        playerA: null,
        playerB: null,
        bracketSlot: i / 2,
      });
      currentRound[i].nextMatchId = match.id;
      currentRound[i].nextMatchSlot = "A";
      if (currentRound[i + 1]) {
        currentRound[i + 1].nextMatchId = match.id;
        currentRound[i + 1].nextMatchSlot = "B";
      }
      nextRound.push(match);
    }
    allBracketMatches.push(...nextRound);
    currentRound = nextRound;
    roundNumber += 1;
  }

  // Propaga automáticamente los "byes" de la primera ronda hacia la siguiente.
  for (const match of allBracketMatches) {
    if (match.status === "bye" && match.nextMatchId) {
      propagateWinner(allBracketMatches, match);
    }
  }

  return allBracketMatches;
}

export function propagateWinner(bracketMatches, finishedMatch) {
  if (!finishedMatch.nextMatchId) return;
  const next = bracketMatches.find((m) => m.id === finishedMatch.nextMatchId);
  if (!next) return;
  if (finishedMatch.nextMatchSlot === "A") next.playerA = finishedMatch.winner;
  else next.playerB = finishedMatch.winner;

  if (next.playerA && next.playerB) {
    next.status = "scheduled";
  } else if (next.playerA && matchHasNoOpponentComing(bracketMatches, next)) {
    next.status = "bye";
    next.winner = next.playerA;
    propagateWinner(bracketMatches, next);
  }
}

function matchHasNoOpponentComing(bracketMatches, match) {
  const feeders = bracketMatches.filter((m) => m.nextMatchId === match.id);
  return feeders.every((f) => f.status === "finished" || f.status === "bye");
}

export const TOURNAMENT_LIMITS = { ROUND_ROBIN_MAX_PLAYERS, GROUP_TARGET_SIZE, QUALIFIERS_PER_GROUP };
