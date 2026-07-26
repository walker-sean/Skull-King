import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { createSocketClient } from "./socketClient.js";
import "./index.css";

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
const socketClient = createSocketClient(serverUrl);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App socketClient={socketClient} />
  </StrictMode>,
);
