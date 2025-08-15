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
  window.addEventListener('load', async () => {
    try {
      // Alte Service Worker und Caches entfernen
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('Alter Service Worker entfernt');
      }
      
      // Alle Caches löschen
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('Alle Caches gelöscht');
      
      // Neuen Service Worker registrieren
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('PWA Service Worker neu registriert:', registration.scope);
    } catch (error) {
      console.log('Service Worker Setup fehlgeschlagen:', error);
    }
  });
} else {
  console.log('PWA Service Worker wird von diesem Browser nicht unterstützt');
}

createRoot(document.getElementById("root")!).render(<App />);
