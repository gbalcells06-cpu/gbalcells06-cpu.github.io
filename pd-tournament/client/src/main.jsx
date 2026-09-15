import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { RoomProvider } from "./state/RoomContext.jsx";
import "./styles/theme.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RoomProvider>
      <App />
    </RoomProvider>
  </StrictMode>
);
