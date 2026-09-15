import { useEffect, useState } from "react";

export default function CountdownTimer({ deadline, label }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const urgent = remaining <= 5;

  return (
    <div className="row" style={{ gap: 8, justifyContent: "center" }}>
      {label && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--steel)" }}>{label}</span>}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 18,
          color: urgent ? "var(--indigo)" : "var(--navy)",
        }}
      >
        {remaining}s
      </span>
    </div>
  );
}
