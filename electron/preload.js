const { contextBridge, ipcRenderer } = require('electron');

// Sichere API für den Renderer-Prozess
contextBridge.exposeInMainWorld('electronAPI', {
  // Datenbank-Operationen
  dbQuery: (query, params) => ipcRenderer.invoke('db-query', query, params),
  
  // App-Informationen
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Lizenz-Prüfung
  checkLicenseStatus: () => ipcRenderer.invoke('check-license-status'),
  
  // Plattform-Erkennung
  platform: process.platform,
  
  // Ist Electron-App
  isElectron: true
});