# Handy-Reparaturshop - Deployment Guide

## Überblick

Diese Anleitung zeigt, wie die Anwendung auf einer eigenen Domain gehostet werden kann. Die Anwendung besteht aus zwei Teilen:

1. **Frontend**: React-Anwendung mit Vite erstellt
2. **Backend**: Node.js Express-Server, der die API bereitstellt

## Vorbereitung: Deployment-Paket direkt von Replit herunterladen

Die einfachste Möglichkeit, alle Dateien zu bekommen, ist:

1. Im Replit-Interface oben links auf das Dreipunkt-Menü klicken
2. "Download as zip" wählen, um das gesamte Projekt herunterzuladen
3. Die heruntergeladene ZIP-Datei auf Ihrem Computer entpacken

## Schnellstart: Deployment-Paket manuell erstellen

Um ein Deployment-Paket manuell vorzubereiten, folgen Sie diesen Schritten:

1. Erstellen Sie einen neuen Ordner `deployment`
2. Kopieren Sie folgende Ordner und Dateien in diesen Ordner:
   - `client/` (Frontend-Quellcode)
   - `server/` (Backend-Code)
   - `shared/` (Gemeinsam genutzte Dateien)
   - `package.json` und `package-lock.json` (für Abhängigkeiten)

3. Erstellen Sie eine Datei `.env.example` im `deployment`-Ordner mit folgendem Inhalt:

```
# Datenbankverbindung
DATABASE_URL=postgresql://username:password@hostname:port/database

# SMTP Konfiguration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password

# Brevo API Key (für E-Mail-Templates)
BREVO_API_KEY=your-brevo-api-key

# Session Secret (für Sicherheit)
SESSION_SECRET=replace-with-a-long-random-string
```

4. Komprimieren Sie den `deployment`-Ordner zu einer ZIP-Datei
5. Übertragen Sie diese ZIP-Datei auf Ihren Server

Mit diesem manuellen Ansatz wird der Quellcode direkt auf den Server übertragen, und der Build erfolgt auf dem Server selbst.

## Schritt 1: Produktionsbuild erstellen (Alternative)

### Frontend und Backend bauen

```bash
npm run build
```

Dies erstellt:
- Frontend-Assets in `dist/public`
- Backend-Code in `dist/index.js`

## Schritt 2: Konfiguration für Ihre Domain

### Option 1: Vollständige Anwendung hosten (empfohlen)

Wenn Sie die vollständige Anwendung mit Frontend und Backend auf Ihrem Server hosten möchten:

1. Kopieren Sie das gesamte `dist`-Verzeichnis auf Ihren Server
2. Installieren Sie die Abhängigkeiten auf dem Server:

```bash
npm install --production
```

3. Erstellen Sie eine `.env`-Datei auf dem Server mit Ihren Umgebungsvariablen:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
BREVO_API_KEY=your-brevo-api-key
```

4. Starten Sie den Server mit dem bereitgestellten Startskript:

```bash
node server.js
```

Oder direkt mit:

```bash
NODE_ENV=production node server/index.js
```

5. Verwenden Sie einen Reverse-Proxy wie Nginx oder Apache, um Anfragen von Ihrer Domain an den Server weiterzuleiten.

### Option 2: Nur Frontend hosten (mit separater API-Bereitstellung)

Wenn Sie nur das Frontend auf einem statischen Hosting-Dienst bereitstellen möchten und das Backend separat hosten:

1. Erstellen Sie eine `.env`-Datei im Projektroot mit:

```
VITE_API_URL=https://your-api-domain.com
```

2. Passen Sie die Datei `client/src/lib/queryClient.ts` an, um die API-URL zu verwenden:

```typescript
import { QueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "";

export const queryClient = new QueryClient();

export function getQueryFn(options?: { on401?: "throw" | "returnNull" }) {
  return async function queryFn({ queryKey }: { queryKey: string[] }): Promise<any> {
    const path = queryKey[0];
    const response = await fetch(`${API_URL}${path}`);
    
    if (response.status === 401) {
      if (options?.on401 === "returnNull") return null;
      throw new Error("Nicht angemeldet");
    }
    
    if (!response.ok) {
      throw new Error(`API-Fehler: ${response.status}`);
    }
    
    return response.json();
  };
}

export async function apiRequest(method: string, path: string, body?: any) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  
  return response;
}
```

3. Führen Sie den Build aus:

```bash
npm run build
```

4. Kopieren Sie nur den Inhalt von `dist/public` auf Ihren statischen Hosting-Dienst

## Schritt 3: Datenbank-Setup

Stellen Sie sicher, dass eine PostgreSQL-Datenbank auf Ihrem Server eingerichtet ist:

1. Erstellen Sie eine neue Datenbank für die Anwendung
2. Verwenden Sie denselben Verbindungsstring für die `DATABASE_URL` in der `.env`-Datei
3. Migrationsscripts werden automatisch beim ersten Start der Anwendung ausgeführt

## Schritt 4: Domain-Konfiguration

### Nginx Konfiguration (Beispiel)

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    ServerName your-domain.com
    
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

## Schritt 5: SSL-Zertifikat (optional, aber empfohlen)

Verwenden Sie Let's Encrypt, um ein kostenloses SSL-Zertifikat für Ihre Domain zu erhalten.

```bash
sudo apt install certbot
sudo certbot --nginx -d your-domain.com
```

## Schritt 6: PM2 für Prozessverwaltung (optional, aber empfohlen)

Installieren Sie PM2, um sicherzustellen, dass Ihre Anwendung nach einem Neustart oder Absturz automatisch neu gestartet wird:

```bash
npm install -g pm2
pm2 start dist/index.js --name handyshop
pm2 startup
pm2 save
```

## Fehlerbehebung

1. **Datenbankfehler**: Stellen Sie sicher, dass die korrekte `DATABASE_URL` in der `.env`-Datei angegeben ist
2. **CORS-Fehler**: Wenn Sie Frontend und Backend separat hosten, müssen Sie CORS-Header konfigurieren
3. **Session-Cookie-Fehler**: Stellen Sie sicher, dass die Domain in der Session-Konfiguration richtig eingestellt ist

## Support

Bei Fragen oder Problemen wenden Sie sich an Ihren Entwickler oder erstellen Sie ein Issue im GitHub-Repository.
