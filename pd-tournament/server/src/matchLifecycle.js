// Orquesta el ciclo de vida de las partidas dentro de una sala: activa
// enfrentamientos cuando los jugadores están libres, gestiona los tiempos
// límite de la fase de intención y de cada ronda, y hace avanzar el torneo
// de fase de grupos a bracket y finalmente al podio.
import * as G from "./game.js";
import { buildBracketFromGroups, computeStandings, propagateWinner } from "./tournament.js";
import { computeTournamentAwards } from "./stats.js";
import { isBusy } from "./roomStore.js";

// matchId -> { intentTimer, roundTimer }
const timers = new Map();

function clearMatchTimers(matchId) {
  const t = timers.get(matchId);
  if (!t) return;
  if (t.intentTimer) clearTimeout(t.intentTimer);
  if (t.roundTimer) clearTimeout(t.roundTimer);
  timers.delete(matchId);
}

function setTimer(matchId, key, handle) {
  const t = timers.get(matchId) ?? {};
  t[key] = handle;
  timers.set(matchId, t);
}

function initMatchGame(match, config) {
  const state = G.createMatch({ playerA: match.playerA, playerB: match.playerB, config });
  delete state.id;
  Object.assign(match, state);
}

/** Busca partidas listas para empezar (ambos jugadores libres) y las activa. */
export function activateReadyMatches(room, onChange) {
  if (!room.tournament) return;
  const ready = room.tournament.matches.filter(
    (m) =>
      m.status === "scheduled" &&
      m.playerA &&
      m.playerB &&
      !isBusy(room, m.playerA) &&
      !isBusy(room, m.playerB)
  );
  for (const match of ready) {
    startMatch(room, match, onChange);
  }
  if (ready.length > 0) onChange();
}

function startMatch(room, match, onChange) {
  initMatchGame(match, room.config);
  match.intentDeadline = Date.now() + room.config.intentTimeLimit * 1000;
  const handle = setTimeout(() => beginRoundPhase(room, match, onChange), room.config.intentTimeLimit * 1000);
  setTimer(match.id, "intentTimer", handle);
}

function beginRoundPhase(room, match, onChange) {
  if (match.status !== "intent") return;
  G.beginPlay(match);
  match.roundDeadline = Date.now() + room.config.decisionTimeLimit * 1000;
  const handle = setTimeout(() => handleRoundTimeout(room, match, onChange), room.config.decisionTimeLimit * 1000);
  setTimer(match.id, "roundTimer", handle);
  onChange();
}

function handleRoundTimeout(room, match, onChange) {
  if (match.status !== "playing") return;
  G.applyTimeoutDefaults(match);
  resolveAndAdvance(room, match, onChange);
}

/** Llamado cuando un jugador envía su elección para la ronda actual. */
export function submitChoice(room, match, playerId, choice, onChange) {
  const side = G.playerSide(match, playerId);
  if (!side || match.status !== "playing") return false;
  const applied = G.submitChoice(match, side, choice);
  if (!applied) return false;
  if (G.bothChoseThisRound(match)) {
    clearMatchTimers(match.id);
    resolveAndAdvance(room, match, onChange);
  } else {
    onChange();
  }
  return true;
}

function resolveAndAdvance(room, match, onChange) {
  G.resolveRound(match);

  if (match.status === "finished" && match.stage === "bracket" && match.winner === null) {
    // Una eliminatoria no puede terminar en empate: se juega una ronda extra
    // de "muerte súbita" hasta que haya un ganador claro.
    match.status = "playing";
    match.totalRounds += 1;
    match.currentRound += 1;
  }

  if (match.status === "finished") {
    clearMatchTimers(match.id);
    onMatchFinished(room, match, onChange);
  } else {
    match.roundDeadline = Date.now() + room.config.decisionTimeLimit * 1000;
    const handle = setTimeout(
      () => handleRoundTimeout(room, match, onChange),
      room.config.decisionTimeLimit * 1000
    );
    setTimer(match.id, "roundTimer", handle);
  }
  onChange();
}

export function submitIntent(match, playerId, message) {
  const side = G.playerSide(match, playerId);
  if (!side) return false;
  G.submitIntent(match, side, message);
  return true;
}

function onMatchFinished(room, match, onChange) {
  if (match.nextMatchId) {
    propagateWinner(room.tournament.matches, match);
  }
  progressTournament(room, onChange);
  activateReadyMatches(room, onChange);
}

function progressTournament(room, onChange) {
  const t = room.tournament;
  if (!t) return;

  if (t.format === "groups_bracket" && t.stage === "group") {
    const groupMatches = t.matches.filter((m) => m.stage === "group");
    const groupDone = groupMatches.every((m) => m.status === "finished" || m.status === "bye");
    if (groupDone) {
      const players = [...room.players.values()];
      const bracketMatches = buildBracketFromGroups(t.groups, players, t.matches);
      t.matches.push(...bracketMatches);
      t.stage = "bracket";
      onChange();
    }
    return;
  }

  const relevantMatches =
    t.format === "round_robin" ? t.matches : t.matches.filter((m) => m.stage === "bracket");
  const allDone = relevantMatches.length > 0 && relevantMatches.every((m) => m.status === "finished" || m.status === "bye");
  if (allDone) {
    finishTournament(room);
    onChange();
  }
}

function finishTournament(room) {
  const t = room.tournament;
  const players = [...room.players.values()];
  room.status = "finished";
  room.awards = computeTournamentAwards(players, t.matches);
  room.finalRanking = computeFinalRanking(room, t, players);
}

function computeFinalRanking(room, t, players) {
  const globalStandings = computeStandings(players, t.matches);
  if (t.format === "round_robin") {
    return globalStandings.map((row) => row.playerId);
  }
  // groups_bracket: la final decide 1º y 2º; el resto se ordena por puntos totales.
  const finalMatch = t.matches.find((m) => m.stage === "bracket" && m.nextMatchId === null);
  const ranking = [];
  if (finalMatch?.winner) ranking.push(finalMatch.winner);
  const loser =
    finalMatch && finalMatch.playerA && finalMatch.playerB
      ? finalMatch.playerA === finalMatch.winner
        ? finalMatch.playerB
        : finalMatch.playerA
      : null;
  if (loser) ranking.push(loser);
  for (const row of globalStandings) {
    if (!ranking.includes(row.playerId)) ranking.push(row.playerId);
  }
  return ranking;
}

export function clearTimersForRoom(room) {
  if (!room.tournament) return;
  for (const m of room.tournament.matches) clearMatchTimers(m.id);
}
