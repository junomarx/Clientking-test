import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { sql } from 'drizzle-orm';

console.log("Initialisiere einfache Datenbankverbindung...");

// Grundlegende WebSocket-Konfiguration für Neon
neonConfig.webSocketConstructor = ws;

// Fehlerbehandlung für unbehandelte Ablehnungen
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Einfache Pool-Konfiguration mit minimalen Parametern
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1 // Nur eine Verbindung erlauben für Stabilität
});

// Event-Handler für Pool-Fehler
pool.on('error', (err) => {
  console.error('Unerwarteter Fehler im Verbindungspool:', err);
});

// Drizzle ORM mit Pool und Schema konfigurieren
export const db = drizzle(pool, { schema });

// Hilfsfunktion zum Verzögern
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Robuste Abfragefunktion für wichtige Operationen
export async function executeWithRetry(query: any, retries = 1) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await db.execute(query);
    } catch (error) {
      lastError = error;
      console.error(`Abfrage fehlgeschlagen (Versuch ${attempt+1}/${retries+1}):`, error);
      
      if (attempt < retries) {
        const delay = 1000 * (attempt + 1);
        console.log(`Warte ${delay}ms vor dem nächsten Versuch...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}