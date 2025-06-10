# Deployment Guide - Handyshop Verwaltung

## Option 1: VPS/Dedicated Server (Empfohlen)

### Systemanforderungen
- Ubuntu 20.04+ oder Debian 11+
- Node.js 18+
- PostgreSQL 14+
- Nginx (als Reverse Proxy)
- SSL-Zertifikat (Let's Encrypt)

### 1. Server vorbereiten
```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL installieren
sudo apt install postgresql postgresql-contrib -y

# Nginx installieren
sudo apt install nginx -y

# PM2 für Prozess-Management
sudo npm install -g pm2
```

### 2. Datenbank einrichten
```bash
# PostgreSQL Benutzer erstellen
sudo -u postgres createuser --interactive
# Datenbank erstellen
sudo -u postgres createdb handyshop_db
```

### 3. App-Code hochladen
```bash
# Repository klonen
git clone <your-repo-url> /var/www/handyshop
cd /var/www/handyshop

# Dependencies installieren
npm install

# Production Build erstellen
npm run build
```

### 4. Umgebungsvariablen konfigurieren
```bash
# .env Datei erstellen
cp .env.example .env

# Konfiguration anpassen
nano .env
```

Wichtige Variablen:
```
DATABASE_URL=postgresql://username:password@localhost:5432/handyshop_db
NODE_ENV=production
SESSION_SECRET=<sicherer-random-string>
SMTP_HOST=<ihr-smtp-server>
SMTP_USER=<ihr-smtp-benutzer>
SMTP_PASSWORD=<ihr-smtp-passwort>
SMTP_PORT=587
```

### 5. PM2 Konfiguration
```bash
# PM2 Prozess starten
pm2 start npm --name "handyshop" -- run start

# PM2 beim Systemstart aktivieren
pm2 startup
pm2 save
```

### 6. Nginx Konfiguration
Erstellen Sie `/etc/nginx/sites-available/handyshop`:
```nginx
server {
    listen 80;
    server_name ihre-domain.de www.ihre-domain.de;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Site aktivieren
sudo ln -s /etc/nginx/sites-available/handyshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL-Zertifikat mit Let's Encrypt
```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx -y

# SSL-Zertifikat erstellen
sudo certbot --nginx -d ihre-domain.de -d www.ihre-domain.de
```

## Option 2: Docker Deployment

### Dockerfile erstellen
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/handyshop
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: handyshop
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Option 3: Cloud-Hosting (Alternativen)

### Hetzner Cloud
- Günstige VPS ab 3€/Monat
- Deutsche Datacenter
- Einfache Skalierung

### DigitalOcean
- App Platform für automatisches Deployment
- Managed Database verfügbar

### AWS/Azure
- Höhere Kosten, aber Enterprise-Features
- Auto-Scaling und Load Balancing

## Sicherheitshinweise

1. **Firewall konfigurieren**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Automatische Updates**
```bash
sudo apt install unattended-upgrades
```

3. **Backup-Strategie**
- Tägliche Datenbank-Backups
- Regelmäßige Snapshots des Servers

4. **Monitoring**
- PM2 Monit für App-Überwachung
- Nginx Access Logs überwachen

## Domain-Konfiguration

1. **DNS-Einträge setzen**
```
A Record: ihre-domain.de → Server-IP
A Record: www.ihre-domain.de → Server-IP
```

2. **SSL-Weiterleitung testen**
- HTTP auf HTTPS umleiten
- HSTS Header aktivieren

## Wartung und Updates

```bash
# App aktualisieren
cd /var/www/handyshop
git pull origin main
npm install
npm run build
pm2 restart handyshop

# Datenbank-Backup
pg_dump handyshop_db > backup_$(date +%Y%m%d).sql
```

Benötigen Sie Hilfe bei einem spezifischen Schritt oder haben Sie bereits einen Server/Hosting-Provider ausgewählt?