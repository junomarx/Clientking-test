#!/bin/bash

echo "🍎 Erstelle macOS Desktop-App für Handyshop Verwaltung..."

# Frontend build für Electron
echo "📦 Baue Frontend..."
npm run build

# Electron App für macOS bauen
echo "🖥️  Erstelle macOS Installer..."
npx electron-builder --mac --publish=never

echo "✅ macOS Desktop-App wurde erstellt!"
echo "📁 Installer-Datei: dist-electron/Handyshop Verwaltung-1.0.0.dmg"
echo ""
echo "🚀 Installation:"
echo "1. Öffnen Sie die .dmg Datei"
echo "2. Ziehen Sie die App in den Programme-Ordner"
echo "3. Starten Sie die App aus dem Launchpad"