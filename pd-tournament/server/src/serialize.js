// Convierte el estado interno del servidor en vistas seguras para el
// cliente: nunca se envía la elección pendiente de un rival ni el número
// total de rondas de una partida "sorpresa" antes de que termine.
import { computeStandings } from "./tournament.js";
import { playerSide } from "./game.js";

export function serializePlayer(player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    connected: player.connected,
  };
}

function visibleTotalRounds(match) {
  if (match.roundsMode === "fixed") return match.totalRounds ?? null;
  return match.status === "finished" ? match.totalRounds : null;
}

export function serializeMatch(match, viewerPlayerId) {
  if (!match) return null;
  const side = viewerPlayerId ? playerSide(match, viewerPlayerId) : null;
  const base = {
    id: match.id,
    stage: match.stage,
    round: match.round,
    groupId: match.groupId,
    playerA: match.playerA,
    playerB: match.playerB,
    status: match.status,
    winner: match.winner,
    scoreA: match.scoreA ?? 0,
    scoreB: match.scoreB ?? 0,
    currentRound: match.currentRound ?? null,
    totalRounds: visibleTotalRounds(match),
    roundsMode: match.roundsMode ?? null,
    intents: match.intents ?? { A: null, B: null },
    rounds: match.rounds ?? [],
    intentDeadline: match.intentDeadline ?? null,
    roundDeadline: match.roundDeadline ?? null,
    noiseEnabled: match.config?.noise?.enabled ?? false,
  };
  if (side) {
    const other = side === "A" ? "B" : "A";
    base.yourSide = side;
    base.yourChoiceSubmitted = Boolean(match.pendingChoices?.[side]);
    base.opponentChoiceSubmitted = Boolean(match.pendingChoices?.[other]);
  }
  return base;
}

export function serializeTournament(room, viewerPlayerId) {
  const t = room.tournament;
  if (!t) return null;
  return {
    format: t.format,
    groups: t.groups.map((g) => ({
      ...g,
      standings: computeStandings(
        g.memberIds.map((id) => room.players.get(id)).filter(Boolean),
        t.matches.filter((m) => m.groupId === g.id)
      ),
    })),
    matches: t.matches.map((m) => serializeMatch(m, viewerPlayerId)),
    globalStandings: computeStandings([...room.players.values()], t.matches),
    stage: t.stage,
  };
}

export function serializeRoom(room, viewerPlayerId) {
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    config: room.config,
    players: [...room.players.values()].map(serializePlayer),
    tournament: serializeTournament(room, viewerPlayerId),
    awards: room.awards,
    finalRanking: room.finalRanking ?? null,
    you: viewerPlayerId,
  };
}
