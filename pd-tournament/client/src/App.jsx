import { useEffect, useRef, useState } from "react";
import { useRoom } from "./state/RoomContext.jsx";
import { useRoomCodeFromUrl, goHome } from "./state/router.js";
import Home from "./pages/Home.jsx";
import Lobby from "./pages/Lobby.jsx";
import Tournament from "./pages/Tournament.jsx";
import Results from "./pages/Results.jsx";
import ConnectionBadge from "./components/ConnectionBadge.jsx";

export default function App() {
  const { room, connected, hasSession, tryReconnect } = useRoom();
  const urlCode = useRoomCodeFromUrl();
  const [reconnectState, setReconnectState] = useState("idle"); // idle | trying | failed
  const attempted = useRef(null);

  useEffect(() => {
    if (!urlCode) {
      setReconnectState("idle");
      return;
    }
    if (room && room.code === urlCode) return;
    if (attempted.current === urlCode) return;
    if (!hasSession(urlCode)) {
      setReconnectState("failed");
      return;
    }
    attempted.current = urlCode;
    setReconnectState("trying");
    tryReconnect(urlCode).then((res) => {
      setReconnectState(res.ok ? "idle" : "failed");
    });
  }, [urlCode, room, hasSession, tryReconnect]);

  let content;

  if (urlCode && room && room.code === urlCode) {
    if (room.status === "lobby") content = <Lobby />;
    else if (room.status === "in_progress") content = <Tournament />;
    else content = <Results />;
  } else if (urlCode && reconnectState === "trying") {
    content = (
      <div className="center-page fade-in">
        <div className="avatar-lg">⏳</div>
        <h2>Reconectando a la sala {urlCode}…</h2>
        <p>Un momento, estamos recuperando tu sitio en el torneo.</p>
      </div>
    );
  } else {
    content = <Home prefillCode={urlCode} onGoHome={goHome} joinFailed={reconnectState === "failed" && urlCode} />;
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <ConnectionBadge connected={connected} />
        {content}
      </div>
    </div>
  );
}
