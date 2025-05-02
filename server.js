/**
 * Einfaches Startskript für die Handyshop-Anwendung auf dem eigenen Server
 * Dieses Skript startet den Server mit den richtigen Einstellungen
 */

const { spawn } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const dotenv = require('dotenv');

// Banner anzeigen
console.log(`
==========================================================
   Handyshop Verwaltung - Server
   Version: 1.0.0
==========================================================
`);

// Prüfe, ob die .env Datei existiert
if (!existsSync(join(__dirname, '.env'))) {
  console.warn('Warnung: .env Datei nicht gefunden.');
  console.warn('Bitte kopiere .env.example zu .env und passe die Werte an.');
  console.warn('Verwende vorläufig Standardwerte und Umgebungsvariablen...');
  
  // Versuche, .env.example zu laden, falls vorhanden
  if (existsSync(join(__dirname, '.env.example'))) {
    console.log('Lade Beispielkonfiguration aus .env.example...');
    dotenv.config({ path: join(__dirname, '.env.example') });
  }
} else {
  // Lade Umgebungsvariablen aus .env
  console.log('Lade Konfiguration aus .env...');
  dotenv.config();
}

// Prüfe wichtige Umgebungsvariablen
if (!process.env.DATABASE_URL) {
  console.error('\nFehler: DATABASE_URL nicht konfiguriert.');
  console.error('Bitte stelle sicher, dass eine PostgreSQL-Datenbank konfiguriert ist.');
  process.exit(1);
}

// Setze die Umgebungsvariable für die Produktionsumgebung
process.env.NODE_ENV = 'production';

// Port konfigurieren
const PORT = process.env.PORT || 5000;
console.log(`Server wird auf Port ${PORT} gestartet...`);
process.env.PORT = PORT.toString();

// Informationen anzeigen
console.log('\nKonfigurationszusammenfassung:');
console.log(` - Umgebung: ${process.env.NODE_ENV}`);
console.log(` - Port: ${PORT}`);
console.log(` - Datenbank: ${process.env.DATABASE_URL ? 'Konfiguriert' : 'Nicht konfiguriert'}`);
console.log(` - SMTP: ${process.env.SMTP_HOST ? 'Konfiguriert' : 'Nicht konfiguriert'}`);
console.log('\nStarte Server...');

// Starte den Server
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`\nServer beendet mit Code ${code}`);
  }
});

// Behandle Prozessbeendigung
process.on('SIGINT', () => {
  console.log('\nServer wird beendet...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nServer wird beendet...');
  server.kill('SIGTERM');
});
