export default function ConnectionBadge({ connected }) {
  if (connected) return null;
  return (
    <div
      className="fade-in"
      style={{
        position: "fixed",
        top: "max(12px, env(safe-area-inset-top, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "var(--navy)",
        color: "#fdfdfb",
        padding: "8px 16px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 800,
        boxShadow: "var(--shadow)",
      }}
    >
      🔌 Reconectando…
    </div>
  );
}
