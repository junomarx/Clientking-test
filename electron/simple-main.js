const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let mainWindow;
let db;

// Einfache lokale Datenbank für Tests
function initSimpleDatabase() {
  console.log('🗄️ Erstelle Test-Datenbank...');
  
  // In-Memory Datenbank für schnelle Tests
  db = new Database(':memory:');
  
  // Einfache Test-Tabellen
  db.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderCode TEXT UNIQUE NOT NULL,
      customerId INTEGER,
      deviceType TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      issue TEXT NOT NULL,
      status TEXT DEFAULT 'eingegangen',
      cost REAL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customerId) REFERENCES customers (id)
    );
  `);

  // Test-Daten einfügen
  const insertCustomer = db.prepare('INSERT INTO customers (firstName, lastName, phone, email) VALUES (?, ?, ?, ?)');
  const insertRepair = db.prepare('INSERT INTO repairs (orderCode, customerId, deviceType, brand, model, issue, status, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Beispiel-Kunden
  insertCustomer.run('Max', 'Mustermann', '0123-456789', 'max@example.com');
  insertCustomer.run('Anna', 'Schmidt', '0987-654321', 'anna@example.com');
  insertCustomer.run('Tom', 'Weber', '0555-123456', 'tom@example.com');
  
  // Beispiel-Reparaturen
  insertRepair.run('REP-001', 1, 'smartphone', 'Apple', 'iPhone 14', 'Display kaputt', 'in_reparatur', 199.90);
  insertRepair.run('REP-002', 2, 'smartphone', 'Samsung', 'Galaxy S22', 'Akku defekt', 'eingegangen', 89.90);
  insertRepair.run('REP-003', 3, 'tablet', 'iPad', 'iPad Air', 'Ladebuchse defekt', 'abholbereit', 129.90);
  insertRepair.run('REP-004', 1, 'smartphone', 'Huawei', 'P30', 'Wasserschaden', 'abgeholt', 159.90);
  
  console.log('✅ Test-Daten erstellt!');
}

function createWindow() {
  console.log('🖥️ Erstelle Desktop-Fenster...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'simple-preload.js')
    },
    titleBarStyle: 'hiddenInset',
    title: 'Handyshop Verwaltung - Desktop Test',
    show: false
  });

  // Test-HTML laden
  mainWindow.loadFile(path.join(__dirname, 'test-app.html'));
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('🎉 Desktop-App gestartet!');
  });

  mainWindow.webContents.openDevTools(); // Für Tests
}

app.whenReady().then(() => {
  initSimpleDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  app.quit();
});

// API für Frontend
ipcMain.handle('get-customers', async () => {
  return db.prepare('SELECT * FROM customers ORDER BY lastName').all();
});

ipcMain.handle('get-repairs', async () => {
  const query = `
    SELECT 
      r.*,
      c.firstName || ' ' || c.lastName as customerName,
      c.phone as customerPhone
    FROM repairs r
    LEFT JOIN customers c ON r.customerId = c.id
    ORDER BY r.createdAt DESC
  `;
  return db.prepare(query).all();
});

ipcMain.handle('get-stats', async () => {
  const total = db.prepare('SELECT COUNT(*) as count FROM repairs').get();
  const inRepair = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'in_reparatur'").get();
  const completed = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'abgeholt'").get();
  const ready = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'abholbereit'").get();
  
  return {
    totalOrders: total.count,
    inRepair: inRepair.count,
    completed: completed.count,
    readyForPickup: ready.count
  };
});

ipcMain.handle('add-repair', async (event, repair) => {
  const stmt = db.prepare(`
    INSERT INTO repairs (orderCode, customerId, deviceType, brand, model, issue, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    repair.orderCode,
    repair.customerId,
    repair.deviceType,
    repair.brand,
    repair.model,
    repair.issue,
    repair.cost || 0
  );
  
  return { id: result.lastInsertRowid, ...repair };
});

console.log('🚀 Handyshop Desktop-App startet...');