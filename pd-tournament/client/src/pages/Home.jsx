import { useState } from "react";
import { useRoom, loadProfile } from "../state/RoomContext.jsx";
import { goToRoom } from "../state/router.js";
import AvatarPicker from "../components/AvatarPicker.jsx";

export default function Home({ prefillCode, joinFailed }) {
  const { createRoom, joinRoom, error, busy, clearError } = useRoom();
  const profile = loadProfile();
  const [mode, setMode] = useState(prefillCode ? "join" : "create");
  const [name, setName] = useState(profile.name || "");
  const [avatar, setAvatar] = useState(profile.avatar || "🦊");
  const [code, setCode] = useState(prefillCode || "");

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    if (!name.trim()) return;
    const res =
      mode === "create"
        ? await createRoom({ name, avatar })
        : await joinRoom({ roomCode: code, name, avatar });
    if (res.ok) goToRoom(res.roomCode);
  }

  return (
    <div className="center-page">
      <div className="stack fade-in" style={{ width: "100%" }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🕊️ 🤝 🗡️</div>
          <h1>Torneo del Dilema del Prisionero</h1>
          <p>Reúne a tus amigos, forma un torneo y descubre quién es realmente de fiar.</p>
        </div>

        <div className="card" style={{ textAlign: "left" }}>
          <div className="tabs" style={{ marginBottom: 20 }}>
            <button className={`tab ${mode === "create" ? "active" : ""}`} onClick={() => setMode("create")} type="button">
              Crear sala
            </button>
            <button className={`tab ${mode === "join" ? "active" : ""}`} onClick={() => setMode("join")} type="button">
              Unirme con código
            </button>
          </div>

          {joinFailed && mode === "join" && (
            <div className="error-banner" style={{ marginBottom: 14 }}>
              No hemos podido reconectarte automáticamente a la sala {prefillCode}. Introduce tu nombre para unirte de nuevo.
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack">
            {mode === "join" && (
              <div className="field">
                <label htmlFor="code">Código de sala</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="AB3F9"
                  autoComplete="off"
                  required
                  style={{ letterSpacing: "0.15em", fontFamily: "var(--font-display)" }}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="name">Tu nombre</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como te conocen tus amigos"
                maxLength={20}
                required
              />
            </div>

            <AvatarPicker value={avatar} onChange={setAvatar} />

            {error && <div className="error-banner">{error}</div>}

            <button className="btn btn-primary btn-block" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Un momento…" : mode === "create" ? "Crear sala" : "Unirme a la sala"}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 13 }}>Sin cuentas ni contraseñas. Solo comparte el código con tu grupo.</p>
      </div>
    </div>
  );
}
