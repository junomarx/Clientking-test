import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// WebSocket-Konfiguration für Neon
neonConfig.webSocketConstructor = ws;
// Erhöhen der Timeout-Werte für stabilere Verbindung
neonConfig.connectionTimeoutMillis = 30000; // 30 Sekunden
neonConfig.pipelineConnect = false; // Verbindungsaufbau vereinfachen

// Fehlerbehandlung für Pool-Verbindung
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection bei:', promise, 'Grund:', reason);
  // Die Anwendung nicht beenden, nur den Fehler protokollieren
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Robustere Pool-Konfiguration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Maximale Anzahl gleichzeitiger Verbindungen
  idleTimeoutMillis: 30000, // Timeout für inaktive Verbindungen
  connectionTimeoutMillis: 10000, // Verbindungs-Timeout
  maxUses: 100, // Verbindungen nach dieser Anzahl von Verwendungen zurücksetzen
});

// Event-Handler für Pool-Fehler
pool.on('error', (err) => {
  console.error('Unerwarteter Fehler im Verbindungspool', err);
});

// Drizzle ORM mit Pool und Schema konfigurieren
export const db = drizzle(pool, { schema });