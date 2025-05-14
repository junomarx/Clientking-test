#!/bin/bash

# Skript zum Starten des Notfall-Servers
# Stellt sicher, dass Node.js installiert ist und startet den Server

# Terminal-Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Handyshop Verwaltung - Notfallserver-Starter${NC}"
echo -e "----------------------------------------"

# Prüfen, ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js ist nicht installiert!${NC}"
    echo -e "Bitte installieren Sie Node.js von https://nodejs.org/"
    exit 1
fi

# Node.js-Version ausgeben
NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js gefunden:${NC} $NODE_VERSION"

# Express-Abhängigkeit prüfen
if [ ! -d "node_modules/express" ]; then
    echo -e "${YELLOW}Express nicht gefunden. Wird installiert...${NC}"
    npm install express
    if [ $? -ne 0 ]; then
        echo -e "${RED}Fehler beim Installieren von Express!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Starte Notfallserver...${NC}"

# Server starten
node minimal-server.js

# Falls der Server beendet wird
echo -e "${RED}Notfallserver wurde beendet.${NC}"
echo -e "Drücken Sie eine Taste, um dieses Fenster zu schließen..."
read -n 1 -s