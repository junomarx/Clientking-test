# Deployment-Anleitung für Handyshop Verwaltung

## Vollständige App auf Ihrer Domain deployen

### 1. Vorbereitung für Production Build

```bash
# Browserslist aktualisieren
npx update-browserslist-db@latest

# Production Build erstellen
NODE_ENV=production npm run build
```

### 2. Umgebungsvariablen für Production

Erstellen Sie eine `.env.production` Datei:

```env
# Datenbank
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
PGDATABASE=ihr_database_name
PGHOST=ihr_database_host
PGPASSWORD=ihr_database_password
PGPORT=5432
PGUSER=ihr_database_user

# E-Mail (Brevo/SMTP)
BREVO_API_KEY=ihr_brevo_api_key
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=ihr_smtp_user
SMTP_PASSWORD=ihr_smtp_password

# Session Secret (generieren Sie einen sicheren String)
SESSION_SECRET=ihr_sehr_sicherer_session_schluessel_hier

# Domain-spezifische Einstellungen
NODE_ENV=production
PORT=5000
```

### 3. Server-Konfiguration für Ihre Domain

#### Option A: Direktes Node.js Deployment

```bash
# Nach dem Build:
node dist/index.js
```

#### Option B: PM2 Process Manager (empfohlen)

```bash
# PM2 installieren
npm install -g pm2

# App starten
pm2 start dist/index.js --name handyshop-app

# Auto-restart bei Server-Neustart
pm2 startup
pm2 save
```

### 4. Nginx Reverse Proxy Konfiguration

Erstellen Sie `/etc/nginx/sites-available/handyshop`:

```nginx
server {
    listen 80;
    server_name ihre-domain.com www.ihre-domain.com;
    
    # Weiterleitung zu HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ihre-domain.com www.ihre-domain.com;
    
    # SSL Zertifikate (Let's Encrypt empfohlen)
    ssl_certificate /etc/letsencrypt/live/ihre-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ihre-domain.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy zu Node.js App
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
    
    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5. SSL Zertifikat mit Let's Encrypt

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# SSL Zertifikat erstellen
sudo certbot --nginx -d ihre-domain.com -d www.ihre-domain.com

# Auto-renewal testen
sudo certbot renew --dry-run
```

### 6. Deployment-Skript

Erstellen Sie `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deployment der Handyshop Verwaltung startet..."

# Git Pull
git pull origin main

# Dependencies installieren
npm ci --production=false

# Build erstellen
NODE_ENV=production npm run build

# PM2 App neustarten
pm2 restart handyshop-app

# Nginx neuladen
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment erfolgreich abgeschlossen!"
echo "🌐 App verfügbar unter: https://ihre-domain.com"
```

### 7. Datenbank Migration

```bash
# Drizzle Push für Production
npm run db:push
```

### 8. Firewall Konfiguration

```bash
# UFW Firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 9. Monitoring & Logs

```bash
# PM2 Logs anzeigen
pm2 logs handyshop-app

# PM2 Status
pm2 status

# Nginx Logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 10. Backup-Strategie

```bash
# Datenbank Backup (PostgreSQL)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Automatisches Backup (Crontab)
0 2 * * * /usr/bin/pg_dump $DATABASE_URL > /backup/handyshop_$(date +\%Y\%m\%d).sql
```

## Wichtige Sicherheitshinweise

1. **Session Secret**: Verwenden Sie einen kryptographisch sicheren, zufälligen String
2. **Datenbankzugriff**: Nutzen Sie SSL-Verbindungen
3. **HTTPS**: Obligatorisch für Production
4. **Updates**: Halten Sie Node.js und alle Dependencies aktuell
5. **Monitoring**: Überwachen Sie Server-Performance und Logs

## Support

Bei Problemen während des Deployments:
1. Prüfen Sie die PM2 Logs: `pm2 logs`
2. Prüfen Sie die Nginx Logs: `sudo tail -f /var/log/nginx/error.log`
3. Prüfen Sie die Datenbankverbindung
4. Stellen Sie sicher, dass alle Umgebungsvariablen korrekt gesetzt sind

Ihre Handyshop Verwaltung ist nach diesem Setup vollständig produktionsbereit! 🎉