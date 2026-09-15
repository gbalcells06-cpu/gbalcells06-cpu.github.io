import { useEffect, useState } from "react";

const CHOICE_ICON = { C: "🤝", D: "🗡️" };
const CHOICE_LABEL = { C: "Coopera", D: "Traiciona" };

export default function RoundReveal({ round, playerA, playerB, onDone }) {
  const [phase, setPhase] = useState("count3");

  useEffect(() => {
    const sequence = [
      ["count3", 420],
      ["count2", 420],
      ["count1", 420],
      ["clash", 950],
      ["done", 0],
    ];
    let total = 0;
    const timers = sequence.map(([p, delay]) => {
      total += delay;
      return setTimeout(() => setPhase(p), total);
    });
    const doneTimer = setTimeout(onDone, total + 250);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [round.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const counting = phase === "count3" || phase === "count2" || phase === "count1";
  const countNumber = { count3: 3, count2: 2, count1: 1 }[phase];

  return (
    <div className="reveal-overlay fade-in">
      {counting && <div className="reveal-count">{countNumber}</div>}
      {(phase === "clash" || phase === "done") && (
        <div className="reveal-clash">
          <RevealSide player={playerA} choice={round.realizedA} noisy={round.noisyA} />
          <div className="reveal-vs">⚡</div>
          <RevealSide player={playerB} choice={round.realizedB} noisy={round.noisyB} />
        </div>
      )}
      {phase === "clash" && (
        <div className="reveal-score">
          +{round.scoreA} · +{round.scoreB}
        </div>
      )}
    </div>
  );
}

function RevealSide({ player, choice, noisy }) {
  return (
    <div className="reveal-side">
      <div className={`reveal-icon ${choice === "D" ? "reveal-icon-d" : "reveal-icon-c"}`}>{CHOICE_ICON[choice]}</div>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{player?.name}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: choice === "D" ? "var(--indigo)" : "var(--teal-deep)" }}>
        {CHOICE_LABEL[choice]}
      </div>
      {noisy && <div className="pill pill-indigo" style={{ marginTop: 4, fontSize: 10 }}>⚡ alterado por ruido</div>}
    </div>
  );
}
