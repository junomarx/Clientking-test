# 🚀 GitHub Setup für Handyshop Desktop App

## Schritt 1: Repository erstellen

1. Gehen Sie zu [GitHub.com](https://github.com) und melden Sie sich an
2. Klicken Sie auf **"New"** oder das **"+"** Symbol → **"New repository"**
3. Repository-Name: `handyshop-desktop-app`
4. Beschreibung: `Handyshop Verwaltung - Desktop App mit lokaler Datenspeicherung`
5. Wählen Sie **"Private"** (für Ihre kommerzielle Software)
6. Klicken Sie **"Create repository"**

## Schritt 2: Code hochladen

### Von Replit aus:
1. In Replit: Klicken Sie auf **"Version control"** (Git-Symbol in der Seitenleiste)
2. Klicken Sie auf **"Connect to GitHub"**
3. Authorisieren Sie Replit für GitHub
4. Wählen Sie Ihr neues Repository aus
5. Klicken Sie **"Connect"**

### Oder manuell:
```bash
# Repository klonen
git clone https://github.com/IhrUsername/handyshop-desktop-app.git
cd handyshop-desktop-app

# Alle Dateien aus diesem Projekt kopieren
# Dann:
git add .
git commit -m "Initial commit: Handyshop Desktop App"
git push origin main
```

## Schritt 3: Desktop-Apps automatisch bauen lassen

Sobald Ihr Code auf GitHub ist:

1. Gehen Sie zu Ihrem Repository auf GitHub
2. Klicken Sie auf **"Actions"** 
3. Die Workflows werden automatisch ausgeführt und erstellen:
   - **macOS DMG-Datei** 
   - **Windows EXE-Datei**

## Schritt 4: Download Ihrer Apps

### Option A: Von Actions (Entwicklungsbuilds)
1. Gehen Sie zu **"Actions"** → neuester **"Build Desktop App"** Workflow
2. Scrollen Sie zu **"Artifacts"**
3. Laden Sie herunter:
   - `handyshop-macos-dmg.zip` → Ihre macOS App! 🍎
   - `handyshop-windows-installer.zip` → Ihre Windows App! 🪟

### Option B: Offizielle Releases erstellen
1. Gehen Sie zu **"Actions"** → **"Release Desktop App"** 
2. Klicken Sie **"Run workflow"**
3. Geben Sie Version ein (z.B. `v1.0.0`)
4. Klicken Sie **"Run workflow"**
5. Nach ~10 Minuten: Gehen Sie zu **"Releases"** → Download-Links sind verfügbar!

## 🎉 Fertig!

Sie haben jetzt:
- ✅ Automatische Builds für macOS und Windows
- ✅ Professionelle Download-Seite auf GitHub
- ✅ Versionierung und Release-Management
- ✅ Ihre eigene installierbare Desktop-App!

## 🔄 Updates veröffentlichen

Für neue Versionen:
1. Ändern Sie den Code in Replit
2. Pushen Sie zu GitHub (oder nutzen Sie Replit's Git-Integration)
3. Erstellen Sie einen neuen Release → Neue Apps werden automatisch gebaut!