import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { clearAllBrands, clearAllModels, clearAllDeviceTypes } from './components/repairs/ClearCacheHelpers';

// Optional: Cache beim Start der Anwendung löschen
// Dies ist hilfreich während der Entwicklung, um Probleme mit alten Daten zu vermeiden
// In Produktion könnte man dies entfernen oder auf einen Button beschränken
const clearCacheOnStartup = true;
if (clearCacheOnStartup) {
  clearAllBrands();
  clearAllModels();
  clearAllDeviceTypes();
  console.log('Cache für Gerätearten und Hersteller wurde beim Start gelöscht');
}

// PWA Service Worker registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA Service Worker erfolgreich registriert:', registration);
      })
      .catch((error) => {
        console.log('PWA Service Worker Registrierung fehlgeschlagen:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
