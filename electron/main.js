const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Lokale Datenbank-Pfad
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'handyshop.db');

let mainWindow;
let db;

// Lizenz-Prüfung
async function checkLicense() {
  try {
    // TODO: Hier wird später die Online-Lizenzprüfung implementiert
    // Für jetzt geben wir true zurück
    return { valid: true, message: 'Lizenz gültig' };
  } catch (error) {
    return { valid: false, message: 'Lizenzprüfung fehlgeschlagen' };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset', // Für macOS nativen Look
    show: false
  });

  // In der Entwicklung laden wir die lokale Vite-URL
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In der Produktion laden wir die gebaute App
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Datenbank initialisieren
function initDatabase() {
  console.log('Initialisiere lokale Datenbank:', dbPath);
  
  db = new Database(dbPath);
  
  // Tabellen erstellen falls sie nicht existieren
  const createTables = `
    -- Benutzer Tabelle
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      isActive BOOLEAN DEFAULT true,
      isAdmin BOOLEAN DEFAULT false,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Kunden Tabelle
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reparaturen Tabelle
    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderCode TEXT UNIQUE NOT NULL,
      customerId INTEGER NOT NULL,
      deviceType TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serialNumber TEXT,
      issue TEXT NOT NULL,
      status TEXT DEFAULT 'eingegangen',
      estimatedCost REAL,
      finalCost REAL,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customerId) REFERENCES customers (id)
    );

    -- Geschäftseinstellungen Tabelle
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      businessName TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      vatNumber TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Lizenz-Info Tabelle
    CREATE TABLE IF NOT EXISTS license_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      licenseKey TEXT,
      lastCheck DATETIME,
      validUntil DATETIME,
      status TEXT DEFAULT 'active'
    );
  `;

  db.exec(createTables);
  console.log('Datenbank-Tabellen erstellt/überprüft');
}

app.whenReady().then(async () => {
  // Lizenz prüfen beim Start
  const licenseStatus = await checkLicense();
  
  if (!licenseStatus.valid) {
    dialog.showErrorBox('Lizenzfehler', licenseStatus.message);
    app.quit();
    return;
  }

  // Datenbank initialisieren
  initDatabase();
  
  // Hauptfenster erstellen
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers für Datenbank-Operationen
ipcMain.handle('db-query', async (event, query, params = []) => {
  try {
    const stmt = db.prepare(query);
    if (query.trim().toLowerCase().startsWith('select')) {
      return stmt.all(params);
    } else {
      return stmt.run(params);
    }
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-license-status', async () => {
  return await checkLicense();
});

process.on('exit', () => {
  if (db) db.close();
});