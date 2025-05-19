import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { sql } from 'drizzle-orm';

console.log("Initialisiere verbesserte Datenbankverbindung...");

// WebSocket-Konfiguration für Neon mit Timeouts
neonConfig.webSocketConstructor = ws;
neonConfig.webSocketConnectionTimeout = 30000; // 30 Sekunden Timeout
neonConfig.wsProxy = undefined; // Proxy deaktivieren für direkte Verbindung
neonConfig.useSecureWebSocket = true; // Sichere Verbindung erzwingen

// Fehlerbehandlung für unbehandelte Ablehnungen
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimierte Pool-Konfiguration mit besseren Parametern
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Erhöhen für parallele Verbindungen
  idleTimeoutMillis: 30000, // 30 Sekunden bis zum Schließen ungenutzter Verbindungen
  connectionTimeoutMillis: 10000, // 10 Sekunden Timeout für Verbindungsaufbau
  allowExitOnIdle: false, // Verhindern, dass der Pool beendet wird
});

// Event-Handler für Pool-Fehler
pool.on('error', (err) => {
  console.error('Unerwarteter Fehler im Verbindungspool:', err);
  console.log('Versuche die Datenbankverbindung wiederherzustellen...');
});

// Drizzle ORM mit Pool und Schema konfigurieren
const db = drizzle(pool, { schema });

// Hilfsfunktion zum Verzögern
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Verbesserte robuste Abfragefunktion mit mehreren Retry-Versuchen
async function executeWithRetry(query: any, retries = 3) { // Erhöht auf 3 Versuche
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Verbindungs-Wiederherstellungsversuch ${attempt} von ${retries}`);
      }
      return await db.execute(query);
    } catch (error: any) {
      lastError = error;
      
      // Speziell für Control Plane Fehler
      if (error && error.code === 'XX000' && error.message && error.message.includes('Control plane request failed')) {
        console.error(`Control plane request Fehler erkannt (Versuch ${attempt+1}/${retries+1})`);
        
        if (attempt < retries) {
          const delay = 2000 * Math.pow(2, attempt); // Exponentielles Backoff
          console.log(`Erkannt: Control plane request Fehler, versuche erneut nach Verzögerung von ${delay}ms...`);
          await sleep(delay);
        }
      } else {
        console.error(`Datenbankabfrage fehlgeschlagen (Versuch ${attempt+1}/${retries+1}):`, error);
        
        if (attempt < retries) {
          const delay = 1000 * (attempt + 1);
          console.log(`Warte ${delay}ms vor dem nächsten Versuch...`);
          await sleep(delay);
        }
      }
    }
  }
  
  throw lastError;
}

// Hilfsfunktion zur Prüfung der Datenbankverbindung
async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1 as test');
    if (result.rows && result.rows[0] && result.rows[0].test === 1) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Datenbankverbindungsprüfung fehlgeschlagen:', error);
    return false;
  }
}

export { pool, db, executeWithRetry, checkDatabaseConnection };