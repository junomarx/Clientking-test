// Startskript für die Electron Desktop-App
import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starte Handyshop Verwaltung Desktop-App...');

// Starte den Development-Server und dann Electron
const viteProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Warte auf Vite-Server und starte dann Electron
setTimeout(() => {
  console.log('🖥️  Starte Electron-App...');
  const electronProcess = spawn('npx', ['electron', 'electron/main.js'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Cleanup bei Exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Beende Desktop-App...');
    viteProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });
}, 3000);