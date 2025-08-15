import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// PWA Service Worker registrieren (vereinfacht)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.log);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
