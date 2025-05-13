/**
 * Notfall-Server für einfache Authentifizierung
 * Unterstützt nur die Direct-Auth-Funktionalität ohne andere Funktionen
 * Kann separat mit 'node emergency-server.js' gestartet werden
 */

const express = require('express');
const app = express();
const PORT = 5001;

// Standard-Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS für lokale Entwicklung aktivieren
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Fake-Benutzer für den Notfallzugang
const EMERGENCY_USER = {
  id: 3,
  username: "bugi",
  displayName: "Bugi (Notfallzugang)",
  email: "bugi@example.com",
  role: "admin",
  is_admin: true,
  shop_id: 1
};

// Statischer Notfall-Token
const EMERGENCY_TOKEN = "bugi-emergency-token-123";

// Endpunkt für die Notfall-Anmeldung
app.post('/api/emergency-login', (req, res) => {
  const { username, password } = req.body;
  
  console.log(`Notfall-Login-Versuch für: ${username}`);
  
  if (username === 'bugi' && password === 'password') {
    console.log('Notfall-Login erfolgreich');
    return res.status(200).json({
      success: true,
      message: "Notfall-Anmeldung erfolgreich",
      user: EMERGENCY_USER,
      token: EMERGENCY_TOKEN
    });
  }
  
  console.log('Notfall-Login fehlgeschlagen: Falsche Anmeldedaten');
  return res.status(401).json({
    success: false,
    message: "Ungültige Anmeldedaten"
  });
});

// Endpunkt zum Abrufen des Benutzers mit Token
app.get('/api/emergency-user', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Keine Authentifizierung angegeben"
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (token !== EMERGENCY_TOKEN) {
    return res.status(401).json({
      success: false,
      message: "Ungültiger oder abgelaufener Token"
    });
  }
  
  return res.status(200).json({
    success: true,
    user: EMERGENCY_USER
  });
});

// Einfacher Logout-Endpunkt (tut nichts, da wir keine Sessions verwenden)
app.post('/api/emergency-logout', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Erfolgreich abgemeldet"
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`🚨 Notfall-Server läuft auf Port ${PORT}`);
  console.log(`Notfall-Login verwenden: { username: 'bugi', password: 'password' }`);
});