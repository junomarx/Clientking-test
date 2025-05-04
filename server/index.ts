/**
 * Hauptdatei für den Server der Handyshop-Verwaltung
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer } from 'http';
import { setupAuth } from './auth';
import { registerLogoRoutes } from './logo-upload';
import { registerAdminRoutes } from './admin-routes';
import { setupVite } from './vite';

// ESM-kompatible __dirname Lösung
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session-Konfiguration
app.use(session({
  secret: process.env.SESSION_SECRET || 'handyshop-management-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Passport für Authentifizierung konfigurieren
setupAuth(app);

// Statische Dateien (für Logo-Uploads und andere Dateien)
app.use('/uploads', express.static(path.join(__dirname, '../static/uploads')));

// HTML-Demo-Seite für Logo-Upload
app.use('/logo-demo', express.static(path.join(__dirname, '../static')));

// Logo-Upload-Routen registrieren
registerLogoRoutes(app);

// Admin-Routen registrieren
registerAdminRoutes(app);

// Weitere API-Routen hier hinzufügen

// Vite-Integration für das Frontend
const startServer = async () => {
  try {
    // Vite-Integration für Frontend
    await setupVite(app, server);
    
    // Server starten
    server.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
  }
};

startServer();
