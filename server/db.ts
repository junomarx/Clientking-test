import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Konfiguriere WebSocket-Unterstützung für Neon-Datenbankverbindung
neonConfig.webSocketConstructor = ws;

// Stelle sicher, dass die Datenbank-URL vorhanden ist
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Verbindungspool mit verbesserten Einstellungen für Stabilität
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Maximale Anzahl gleichzeitiger Verbindungen
  idleTimeoutMillis: 30000,     // Zeit in ms, die Verbindungen im Pool bleiben
  connectionTimeoutMillis: 5000, // Zeit in ms, bevor eine Verbindungsanfrage abläuft
  allowExitOnIdle: false,       // Vermeidet das Beenden, wenn der Pool inaktiv ist
  maxUses: 5000,                // Maximale Anzahl der Verwendungen pro Verbindung
  keepAlive: true,              // TCP Keep-Alive aktivieren
  keepAliveInitialDelayMillis: 10000 // Initialer Verzögerung für Keep-Alive
});

// Event-Handler für Verbindungsprobleme
pool.on('error', (err, client) => {
  console.error('Unerwarteter Datenbank-Poolverbindungsfehler', err);
  // Wir schließen den Client nicht, da der Pool dies übernimmt
});

pool.on('connect', (client) => {
  console.log('Neue Datenbankverbindung hergestellt');
  client.on('error', (err) => {
    console.error('Datenbank-Client-Fehler:', err);
  });
});

// Verbesserte Drizzle-Instanz mit Schema
export const db = drizzle(pool, { schema });

// Funktion zum Testen der Datenbankverbindung
export async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Datenbankverbindung erfolgreich:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    return false;
  }
}

// Initialer Verbindungstest
checkDatabaseConnection()
  .then(connected => {
    if (!connected) {
      console.warn('Die initiale Datenbankverbindung konnte nicht hergestellt werden, wird im Hintergrund weiter versucht');
    }
  })
  .catch(err => {
    console.error('Fehler beim initialen Datenbankverbindungstest:', err);
  });