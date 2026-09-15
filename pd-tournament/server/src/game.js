// Máquina de estados de una partida (enfrentamiento 1 vs 1) del Dilema del
// Prisionero iterado. Lógica pura: no sabe nada de sockets.
import { generateId } from "./utils/codeGenerator.js";

export const DEFAULT_CHOICE = "C"; // acción por defecto si no se responde a tiempo
export const MIN_RANDOM_ROUNDS = 5;
export const MAX_RANDOM_ROUNDS = 8;

function pickTotalRounds(config) {
  if (config.roundsMode === "fixed") {
    return config.fixedRounds;
  }
  const [min, max] = config.roundsRange ?? [MIN_RANDOM_ROUNDS, MAX_RANDOM_ROUNDS];
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function createMatch({ playerA, playerB, config }) {
  return {
    id: generateId("game"),
    playerA,
    playerB,
    status: "intent", // intent -> playing -> finished
    config: {
      payoff: config.payoff,
      decisionTimeLimit: config.decisionTimeLimit,
      noise: config.noise,
    },
    totalRounds: pickTotalRounds(config), // SECRETO si roundsMode === 'random'
    roundsMode: config.roundsMode,
    currentRound: 1,
    intents: { A: null, B: null },
    pendingChoices: {},
    rounds: [], // { round, choiceA, choiceB, realizedA, realizedB, noisyA, noisyB, scoreA, scoreB }
    scoreA: 0,
    scoreB: 0,
    winner: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

export function submitIntent(match, side, message) {
  match.intents[side] = message;
}

export function beginPlay(match) {
  match.status = "playing";
}

/** Registra la elección de un jugador para la ronda actual. Idempotente. */
export function submitChoice(match, side, choice) {
  if (match.status !== "playing") return false;
  if (match.pendingChoices[side]) return false;
  if (choice !== "C" && choice !== "D") return false;
  match.pendingChoices[side] = choice;
  return true;
}

export function bothChoseThisRound(match) {
  return Boolean(match.pendingChoices.A && match.pendingChoices.B);
}

function applyNoise(choice, noiseConfig) {
  if (!noiseConfig?.enabled) return { value: choice, flipped: false };
  const p = noiseConfig.probability ?? 0;
  if (Math.random() < p) {
    return { value: choice === "C" ? "D" : "C", flipped: true };
  }
  return { value: choice, flipped: false };
}

function scoreFor(realizedA, realizedB, payoff) {
  if (realizedA === "C" && realizedB === "C") return payoff.CC;
  if (realizedA === "D" && realizedB === "D") return payoff.DD;
  if (realizedA === "D" && realizedB === "C") return [payoff.CD[0], payoff.CD[1]];
  // realizedA === 'C' && realizedB === 'D'
  return [payoff.CD[1], payoff.CD[0]];
}

/**
 * Si ambos jugadores ya eligieron (o se les aplicó la elección por defecto
 * por timeout), resuelve la ronda: aplica ruido, calcula puntos, y decide si
 * la partida continúa o termina. Devuelve el registro de la ronda o null si
 * todavía falta alguna elección.
 */
export function resolveRound(match) {
  if (!bothChoseThisRound(match)) return null;

  const choiceA = match.pendingChoices.A;
  const choiceB = match.pendingChoices.B;
  const noiseA = applyNoise(choiceA, match.config.noise);
  const noiseB = applyNoise(choiceB, match.config.noise);
  const [scoreA, scoreB] = scoreFor(noiseA.value, noiseB.value, match.config.payoff);

  const roundRecord = {
    round: match.currentRound,
    choiceA,
    choiceB,
    realizedA: noiseA.value,
    realizedB: noiseB.value,
    noisyA: noiseA.flipped,
    noisyB: noiseB.flipped,
    scoreA,
    scoreB,
  };

  match.rounds.push(roundRecord);
  match.scoreA += scoreA;
  match.scoreB += scoreB;
  match.pendingChoices = {};

  if (match.currentRound >= match.totalRounds) {
    finishMatch(match);
  } else {
    match.currentRound += 1;
  }

  return roundRecord;
}

export function finishMatch(match) {
  match.status = "finished";
  match.finishedAt = Date.now();
  if (match.scoreA > match.scoreB) match.winner = match.playerA;
  else if (match.scoreB > match.scoreA) match.winner = match.playerB;
  else match.winner = null; // empate
}

/** Aplica la elección por defecto a quien no haya respondido a tiempo. */
export function applyTimeoutDefaults(match) {
  let applied = false;
  for (const side of ["A", "B"]) {
    if (!match.pendingChoices[side]) {
      match.pendingChoices[side] = DEFAULT_CHOICE;
      applied = true;
    }
  }
  return applied;
}

export function playerSide(match, playerId) {
  if (match.playerA === playerId) return "A";
  if (match.playerB === playerId) return "B";
  return null;
}
