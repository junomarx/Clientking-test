/**
 * Einfaches Startskript für die Handyshop-Anwendung auf dem eigenen Server
 * Dieses Skript startet den Server mit den richtigen Einstellungen
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

// Prüfe, ob die .env Datei existiert
if (!existsSync(join(__dirname, '.env'))) {
  console.error('Fehler: .env Datei nicht gefunden.');
  console.error('Bitte kopiere .env.example zu .env und passe die Werte an.');
  process.exit(1);
}

// Setze die Umgebungsvariable für die Produktionsumgebung
process.env.NODE_ENV = 'production';

console.log('Starte Handyshop Server in Produktionsumgebung...');

// Starte den Server
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`Server beendet mit Code ${code}`);
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
