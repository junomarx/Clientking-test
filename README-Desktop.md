# 📱 Handyshop Verwaltung - Desktop App

Eine professionelle Desktop-Anwendung für die Verwaltung von Handyreparaturen mit lokaler Datenspeicherung und Online-Lizenzvalidierung.

## 🚀 Features

- **Lokale Datenspeicherung**: Alle Kundendaten bleiben auf dem Computer des Benutzers
- **DSGVO-konform**: Maximaler Datenschutz durch lokale SQLite-Datenbank
- **Online-Lizenzprüfung**: Abosystem mit regelmäßiger Validierung
- **Cross-Platform**: Verfügbar für macOS und Windows
- **Offline-fähig**: Arbeitet ohne Internetverbindung (außer Lizenzprüfung)

## 📥 Download

### Automatische Builds

Die neuesten Versionen werden automatisch über GitHub Actions erstellt:

1. Gehen Sie zu den **[Actions](../../actions)** in diesem Repository
2. Klicken Sie auf den neuesten **"Build Desktop App"** Workflow
3. Scrollen Sie nach unten zu **"Artifacts"**
4. Laden Sie die gewünschte Version herunter:
   - **macOS**: `handyshop-macos-dmg.zip` 
   - **Windows**: `handyshop-windows-installer.zip`

### Installation

#### macOS
1. Entpacken Sie die heruntergeladene ZIP-Datei
2. Öffnen Sie die `.dmg` Datei
3. Ziehen Sie die App in den Programme-Ordner
4. Starten Sie die App aus dem Launchpad

#### Windows
1. Entpacken Sie die heruntergeladene ZIP-Datei
2. Führen Sie die `.exe` Datei aus
3. Folgen Sie den Installationsanweisungen
4. Starten Sie die App über das Desktop-Icon

## 🛠️ Entwicklung

### Voraussetzungen
- Node.js 20 oder höher
- npm oder yarn

### Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Desktop-App im Entwicklungsmodus starten
npm run electron:dev

# Frontend für Produktion bauen
npm run build

# Desktop-App für aktuelles System bauen
npm run electron:build
```

### Build für spezifische Plattformen

```bash
# macOS
npm run electron:build -- --mac

# Windows
npm run electron:build -- --win

# Beide Plattformen
npm run electron:build -- --mac --win
```

## 📊 Datenbank

Die App verwendet SQLite für lokale Datenspeicherung:

- **Speicherort**: `~/Library/Application Support/Handyshop Verwaltung/handyshop.db` (macOS)
- **Speicherort**: `%APPDATA%/Handyshop Verwaltung/handyshop.db` (Windows)
- **Automatische Backups**: Empfohlen über Time Machine (macOS) oder File History (Windows)

## 🔐 Lizenzierung

Die App prüft beim Start die Gültigkeit der Lizenz über eine Online-Verbindung:

- **Grace Period**: 7 Tage offline-Betrieb möglich
- **Lizenzserver**: Konfigurierbar in der App
- **Abosystem**: Monatliche oder jährliche Lizenzen

## 🏗️ Architektur

```
├── electron/                 # Electron Hauptprozess
│   ├── main.js              # App-Hauptdatei
│   ├── preload.js           # Sicherer API-Bridge
│   └── database-adapter.js   # SQLite-Datenbankschicht
├── client/                   # React Frontend
├── dist/                     # Gebaute Frontend-Dateien
└── dist-electron/           # Fertige Desktop-Apps
```

## 🔧 Konfiguration

### Lizenzserver anpassen

Bearbeiten Sie `electron/main.js` und ändern Sie die `checkLicense()` Funktion:

```javascript
async function checkLicense() {
  try {
    const response = await fetch('https://ihr-lizenzserver.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: licenseKey })
    });
    // Implementierung...
  } catch (error) {
    // Fehlerbehandlung...
  }
}
```

## 📝 Lizenz

Proprietäre Software - Alle Rechte vorbehalten

## 🆘 Support

Bei Fragen oder Problemen:
- Erstellen Sie ein [Issue](../../issues)
- E-Mail: support@handyshop-verwaltung.de