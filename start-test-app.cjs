#!/usr/bin/env node

// Einfacher Starter für die Test-Desktop-App
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starte Handyshop Desktop Test-App...');

const electronProcess = spawn('npx', ['electron', 'electron/simple-main.js'], {
  stdio: 'inherit',
  shell: true
});

electronProcess.on('close', (code) => {
  console.log(`Desktop-App beendet mit Code: ${code}`);
});

electronProcess.on('error', (error) => {
  console.error('Fehler beim Starten der Desktop-App:', error);
});