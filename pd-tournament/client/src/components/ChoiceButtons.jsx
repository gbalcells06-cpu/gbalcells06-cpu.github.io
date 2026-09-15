export default function ChoiceButtons({ onChoose, disabled, selected }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <button
        type="button"
        className={`choice-btn choice-btn-cooperate ${selected === "C" ? "choice-btn-selected" : ""}`}
        disabled={disabled}
        onClick={() => onChoose("C")}
      >
        <span className="choice-btn-icon">🤝</span>
        <strong>Cooperar</strong>
      </button>
      <button
        type="button"
        className={`choice-btn choice-btn-defect ${selected === "D" ? "choice-btn-selected" : ""}`}
        disabled={disabled}
        onClick={() => onChoose("D")}
      >
        <span className="choice-btn-icon">🗡️</span>
        <strong>Traicionar</strong>
      </button>
    </div>
  );
}
