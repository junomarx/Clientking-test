# Handyshop Verwaltung - Deployment Anleitung

## Überblick

Diese Anleitung hilft Ihnen dabei, die Handyshop Verwaltungssoftware auf Ihrem eigenen Server zu installieren und mit Ihrer Domain zu verbinden.

## Systemvoraussetzungen

- **Node.js**: Version 18 oder höher
- **PostgreSQL**: Version 13 oder höher
- **Webserver**: Nginx oder Apache (für die Domain-Weiterleitung)
- **Betriebssystem**: Linux (empfohlen), Windows Server oder macOS

## Installation

### 1. Vorbereitung

1. Entpacken Sie die `handyshop-deployment.zip` Datei auf Ihrem Server:
   ```bash
   unzip handyshop-deployment.zip -d handyshop
   cd handyshop
   ```

2. Installieren Sie die Abhängigkeiten:
   ```bash
   npm install --production
   ```

### 2. Datenbank einrichten

1. Erstellen Sie eine PostgreSQL-Datenbank:
   ```bash
   sudo -u postgres createdb handyshop
   ```

2. Konfigurieren Sie einen Datenbankbenutzer (ersetzen Sie `meinpasswort` durch ein sicheres Passwort):
   ```bash
   sudo -u postgres psql -c "CREATE USER handyshop WITH ENCRYPTED PASSWORD 'meinpasswort';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE handyshop TO handyshop;"
   ```

### 3. Umgebungsvariablen konfigurieren

1. Kopieren Sie die Beispielkonfiguration:
   ```bash
   cp .env.example .env
   ```

2. Bearbeiten Sie die `.env` Datei mit Ihren Einstellungen:
   ```bash
   nano .env
   ```

3. Passen Sie mindestens die folgenden Einstellungen an:
   - `DATABASE_URL`: Die Verbindungs-URL für Ihre PostgreSQL-Datenbank
   - `SMTP_*`: SMTP-Server-Konfiguration für den E-Mail-Versand
   - `SESSION_SECRET`: Ein langer, zufälliger String für die Sitzungssicherheit

### 4. Server starten

1. Starten Sie die Anwendung:
   ```bash
   node server.js
   ```

2. Für eine dauerhafte Installation empfehlen wir PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name handyshop
   pm2 startup
   pm2 save
   ```

## Domain-Konfiguration

### Nginx Konfiguration (Beispiel)

Erstellen Sie eine neue Konfigurationsdatei für Ihre Domain:

```nginx
server {
    listen 80;
    server_name ihre-domain.de;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache Konfiguration (Beispiel)

```apache
<VirtualHost *:80>
    ServerName ihre-domain.de
    
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyVia Full
    
    <Proxy *>
        Require all granted
    </Proxy>
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
</VirtualHost>
```

## SSL-Zertifikat (empfohlen)

Für eine sichere Verbindung empfehlen wir die Einrichtung eines SSL-Zertifikats mit Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ihre-domain.de
```

## Erste Anmeldung

1. Öffnen Sie einen Webbrowser und rufen Sie Ihre Domain auf
2. Melden Sie sich mit dem Standardbenutzerkonto an (falls vorhanden):
   - Benutzername: `admin`
   - Passwort: `admin123`
3. Ändern Sie sofort das Passwort nach der Anmeldung!

## Aktualisierungen

Für Updates stellen wir neue Versionen der ZIP-Datei bereit. Der Aktualisierungsprozess beinhaltet:

1. Sichern der aktuellen `.env` Datei
2. Entpacken der neuen Version
3. Wiederherstellen der `.env` Datei
4. Ausführen von `npm install --production`
5. Neustart der Anwendung mit `pm2 restart handyshop`

## Fehlerbehebung

- **Datenbank-Verbindungsprobleme**: Überprüfen Sie die `DATABASE_URL` in der `.env` Datei
- **E-Mail-Versandprobleme**: Überprüfen Sie die SMTP-Einstellungen in der `.env` Datei
- **Zugriffsprobleme**: Überprüfen Sie die Firewall-Einstellungen für Port 5000

## Support

Bei Fragen oder Problemen wenden Sie sich an unseren Support unter:
- E-Mail: support@example.com
- Telefon: 01234-56789