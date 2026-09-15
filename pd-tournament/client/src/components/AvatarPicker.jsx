export const AVATARS = ["🦊", "🦉", "🐼", "🐢", "🐬", "🐺", "🦦", "🐨", "🐧", "🦫", "🦔", "🐙"];

export default function AvatarPicker({ value, onChange }) {
  return (
    <div className="field">
      <label>Elige un avatar</label>
      <div className="row" role="radiogroup" aria-label="Avatar">
        {AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={value === emoji}
            onClick={() => onChange(emoji)}
            className="avatar"
            style={{
              cursor: "pointer",
              borderColor: value === emoji ? "var(--teal)" : "var(--line)",
              borderWidth: value === emoji ? 2 : 1.5,
              background: value === emoji ? "rgba(46,125,123,0.12)" : "var(--bg-soft)",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
