/**
 * Notfall-Server für einfache Authentifizierung
 * Unterstützt nur die Direct-Auth-Funktionalität ohne andere Funktionen
 * Kann separat mit 'node emergency-server.js' gestartet werden
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM-Ersatz für __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001; // Andere Port als Hauptserver

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische Dateien direkt bereitstellen
app.use(express.static(path.join(__dirname, 'client/dist')));

// Direktes Bereitstellen der Notfall-Login-Seite
app.get('/emergency-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'emergency-login.html'));
});

// Notfall-Login-Route
app.post('/api/emergency-login', (req, res) => {
  const { username, password } = req.body;
  
  // Sehr einfache Authentifizierung für Testzwecke
  if (username === 'bugi' && password === 'password') {
    res.json({
      success: true,
      user: {
        id: 3,
        username: 'bugi',
        isAdmin: true,
        shop_id: 1
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Ungültige Anmeldeinformationen'
    });
  }
});

// Status-Endpoint
app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'running',
    mode: 'emergency',
    timestamp: new Date().toISOString()
  });
});

// Einfacher Benutzerprofilendpunkt
app.get('/api/user', (req, res) => {
  res.json({
    id: 3,
    username: 'bugi',
    isAdmin: true,
    shop_id: 1,
    email: 'bugi@example.com',
    shopName: 'Notfall-Shop',
    note: 'Dies ist ein Notfall-Benutzerprofil mit eingeschränkter Funktionalität.'
  });
});

// Fallback-Route für SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Globale Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error('Server-Fehler:', err);
  res.status(500).json({
    error: 'Server-Fehler',
    message: 'Ein interner Serverfehler ist aufgetreten.'
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚨 Notfall-Server läuft auf Port ${PORT}`);
  console.log(`🌐 Zugriff über: http://localhost:${PORT}/emergency-login`);
  console.log(`🔑 Verwenden Sie Benutzer 'bugi' mit Passwort 'password' für den Login`);
});

// Prozess-Fehlerbehandlung
process.on('uncaughtException', (err) => {
  console.error('Unbehandelter Fehler:', err);
  // Server läuft weiter
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unbehandelte Promise-Ablehnung:', reason);
  // Server läuft weiter
});