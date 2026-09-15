import { useState } from "react";
import { useRoom } from "../state/RoomContext.jsx";

export default function ConfigPanel({ config: initialConfig }) {
  const { updateConfig } = useRoom();
  // Estado local optimista: cada cambio se fusiona sobre el último valor local
  // conocido (no sobre la prop, que puede estar desactualizada mientras el
  // cambio anterior todavía está en tránsito hacia el servidor).
  const [config, setConfig] = useState(initialConfig);

  function patch(partial) {
    setConfig((prev) => {
      const merged = deepMerge(prev, partial);
      updateConfig(merged);
      return merged;
    });
  }

  return (
    <div className="stack">
      <div className="field">
        <label>Duración de cada enfrentamiento</label>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${config.roundsMode === "random" ? "active" : ""}`}
            onClick={() => patch({ roundsMode: "random" })}
          >
            Aleatoria (recomendado)
          </button>
          <button
            type="button"
            className={`tab ${config.roundsMode === "fixed" ? "active" : ""}`}
            onClick={() => patch({ roundsMode: "fixed" })}
          >
            Fija
          </button>
        </div>
        <div className="field-hint">
          {config.roundsMode === "random"
            ? "Nadie sabrá cuál es la última ronda: evita que se traicione \"por si acaso\" al final."
            : "Todos sabrán de antemano el número exacto de rondas."}
        </div>
      </div>

      {config.roundsMode === "random" ? (
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="rounds-min">Mínimo de rondas</label>
            <input
              id="rounds-min"
              type="number"
              min={2}
              max={config.roundsRange[1]}
              value={config.roundsRange[0]}
              onChange={(e) => patch({ roundsRange: [Number(e.target.value), config.roundsRange[1]] })}
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="rounds-max">Máximo de rondas</label>
            <input
              id="rounds-max"
              type="number"
              min={config.roundsRange[0]}
              max={40}
              value={config.roundsRange[1]}
              onChange={(e) => patch({ roundsRange: [config.roundsRange[0], Number(e.target.value)] })}
            />
          </div>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="rounds-fixed">Número de rondas</label>
          <input
            id="rounds-fixed"
            type="number"
            min={1}
            max={50}
            value={config.fixedRounds}
            onChange={(e) => patch({ fixedRounds: Number(e.target.value) })}
          />
        </div>
      )}

      <div className="field">
        <label>Matriz de puntuación</label>
        <PayoffGrid payoff={config.payoff} onChange={(payoff) => patch({ payoff })} />
      </div>

      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="decision-time">Segundos por decisión</label>
          <input
            id="decision-time"
            type="number"
            min={5}
            max={120}
            value={config.decisionTimeLimit}
            onChange={(e) => patch({ decisionTimeLimit: Number(e.target.value) })}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="intent-time">Segundos de fanfarronería</label>
          <input
            id="intent-time"
            type="number"
            min={5}
            max={60}
            value={config.intentTimeLimit}
            onChange={(e) => patch({ intentTimeLimit: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="field">
        <label className="row" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={config.noise.enabled}
            onChange={(e) => patch({ noise: { ...config.noise, enabled: e.target.checked } })}
            style={{ width: 18, height: 18 }}
          />
          Ruido de comunicación (errores aleatorios)
        </label>
        <div className="field-hint">
          Con cierta probabilidad, una decisión se invierte antes de mostrarse al rival, simulando un malentendido. Los
          jugadores sabrán que el ruido está activo, pero no cuándo ocurre.
        </div>
        {config.noise.enabled && (
          <div style={{ marginTop: 8 }}>
            <label htmlFor="noise-prob" style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>
              Probabilidad: {Math.round(config.noise.probability * 100)}%
            </label>
            <input
              id="noise-prob"
              type="range"
              min={1}
              max={30}
              value={Math.round(config.noise.probability * 100)}
              onChange={(e) => patch({ noise: { ...config.noise, probability: Number(e.target.value) / 100 } })}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PayoffGrid({ payoff, onChange }) {
  function set(key, idx, value) {
    const next = { ...payoff, [key]: [...payoff[key]] };
    next[key][idx] = Number(value);
    onChange(next);
  }

  const rows = [
    { key: "CC", label: "🤝 Ambos cooperan", hintA: "Tú", hintB: "Rival" },
    { key: "DD", label: "🗡️ Ambos traicionan", hintA: "Tú", hintB: "Rival" },
    { key: "CD", label: "⚖️ Uno traiciona, otro coopera", hintA: "Traidor/a", hintB: "Cooperador/a" },
  ];

  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map((row) => (
        <div key={row.key} className="row-between" style={{ background: "var(--bg-soft)", borderRadius: 10, padding: "8px 10px" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>{row.label}</span>
          <div className="row" style={{ gap: 6 }}>
            <input
              type="number"
              min={0}
              max={20}
              value={payoff[row.key][0]}
              onChange={(e) => set(row.key, 0, e.target.value)}
              style={{ width: 52, padding: "6px 8px", textAlign: "center" }}
              title={row.hintA}
            />
            <input
              type="number"
              min={0}
              max={20}
              value={payoff[row.key][1]}
              onChange={(e) => set(row.key, 1, e.target.value)}
              style={{ width: 52, padding: "6px 8px", textAlign: "center" }}
              title={row.hintB}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function deepMerge(base, partial) {
  const out = { ...base, ...partial };
  if (partial.noise) out.noise = { ...base.noise, ...partial.noise };
  if (partial.payoff) out.payoff = { ...base.payoff, ...partial.payoff };
  return out;
}
