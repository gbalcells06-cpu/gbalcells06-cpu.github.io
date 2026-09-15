import { useEffect, useState } from "react";

function parseRoomCode(pathname) {
  const match = pathname.match(/\/room\/([A-Za-z0-9]+)/);
  return match ? match[1].toUpperCase() : null;
}

export function useRoomCodeFromUrl() {
  const [code, setCode] = useState(() => parseRoomCode(window.location.pathname));
  useEffect(() => {
    function onPop() {
      setCode(parseRoomCode(window.location.pathname));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return code;
}

export function goToRoom(code) {
  const path = `/room/${code}`;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function goHome() {
  window.history.pushState({}, "", "/");
  window.dispatchEvent(new PopStateEvent("popstate"));
}
