/**
 * Minimaler Express-Server zum Testen der Anwendung
 * Startet einen einfachen Express-Server ohne Datenbankabhängigkeiten
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische Dateien aus dem client/dist Verzeichnis bereitstellen
app.use(express.static(path.join(__dirname, 'client/dist')));

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

// Statusendpunkt
app.get('/api/server-status', (req, res) => {
  res.json({
    status: 'running',
    mode: 'emergency',
    timestamp: new Date().toISOString()
  });
});

// Fallback-Route für SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚨 Notfall-Server läuft auf Port ${PORT}`);
  console.log(`🔑 Verwenden Sie Benutzer 'bugi' mit Passwort 'password' für den Login`);
});