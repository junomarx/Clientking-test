# 📧 SMTP-Konfiguration für E-Mail-Versand

## Problem
Nach der Entfernung der veralteten Brevo/SendGrid-Services müssen Sie Ihre eigenen SMTP-Einstellungen konfigurieren, um E-Mails versenden zu können.

## Lösung: SMTP-Einstellungen konfigurieren

### Schritt-für-Schritt Anleitung:

1. **Anmelden im System**
   - Melden Sie sich mit Ihrem Benutzerkonto an

2. **Einstellungen öffnen**
   - Klicken Sie auf das Benutzer-Menü (oben rechts)
   - Wählen Sie "Einstellungen" oder "Geschäftseinstellungen"

3. **E-Mail-Tab finden**
   - Gehen Sie zum "E-Mail-Einstellungen" Reiter
   - Scrollen Sie zu den SMTP-Einstellungen

4. **SMTP-Daten eingeben**

### Gmail-Konfiguration (Empfohlen):
```
Absendername: Ihr Geschäftsname
SMTP-Server: smtp.gmail.com
SMTP-Port: 587
SMTP-Benutzername: ihre.email@gmail.com
SMTP-Passwort: [App-Passwort - siehe unten]
```

### Outlook/Hotmail-Konfiguration:
```
Absendername: Ihr Geschäftsname  
SMTP-Server: smtp.live.com
SMTP-Port: 587
SMTP-Benutzername: ihre.email@outlook.com
SMTP-Passwort: Ihr Passwort
```

### Andere E-Mail-Anbieter:
- **1&1**: smtp.1und1.de, Port 587
- **T-Online**: securesmtp.t-online.de, Port 587
- **GMX**: mail.gmx.net, Port 587

## Gmail App-Passwort erstellen:

1. **Google-Konto öffnen**
   - Gehen Sie zu https://myaccount.google.com

2. **Sicherheit**
   - Klicken Sie auf "Sicherheit" im Menü

3. **2-Faktor-Authentifizierung**
   - Aktivieren Sie die 2-Faktor-Authentifizierung (falls noch nicht aktiviert)

4. **App-Passwörter**
   - Suchen Sie nach "App-Passwörter"
   - Klicken Sie auf "App-Passwörter"

5. **Neues App-Passwort**
   - Wählen Sie "Mail" als App
   - Wählen Sie "Anderes Gerät" und geben Sie "Handyshop Verwaltung" ein
   - Klicken Sie auf "Generieren"

6. **Passwort kopieren**
   - Kopieren Sie das 16-stellige Passwort (Format: xxxx xxxx xxxx xxxx)
   - Verwenden Sie dieses Passwort in der SMTP-Konfiguration

## Test der Konfiguration:

1. **SMTP-Test durchführen**
   - Nach dem Speichern der Einstellungen
   - Klicken Sie auf "Test-E-Mail senden"
   - Geben Sie Ihre E-Mail-Adresse ein
   - Prüfen Sie Ihren Posteingang

2. **Funktionen testen**
   - Kostenvoranschlag per E-Mail versenden
   - A4-Reparaturauftrag per E-Mail versenden

## Nach erfolgreicher Konfiguration funktionieren:

✅ **Kostenvoranschläge per E-Mail**
- PDF-Anhang mit professionellem Layout
- Automatische E-Mail-Benachrichtigung an Kunden

✅ **A4-Reparaturaufträge per E-Mail**  
- Vollständige Auftragsdetails als PDF
- Kundenspezifische E-Mail-Nachrichten

✅ **Weitere E-Mail-Funktionen**
- Test-E-Mails zur Überprüfung
- E-Mail-Vorlagen anpassbar
- Automatische E-Mail-Historie

## Häufige Probleme und Lösungen:

### "E-Mail konnte nicht gesendet werden"
- Überprüfen Sie SMTP-Server und Port
- Stellen Sie sicher, dass das Passwort korrekt ist
- Bei Gmail: Verwenden Sie App-Passwort statt normalem Passwort

### "Authentifizierung fehlgeschlagen"
- Überprüfen Sie Benutzername (vollständige E-Mail-Adresse)
- Überprüfen Sie das Passwort
- Bei Gmail: 2-Faktor-Auth und App-Passwort erforderlich

### "Verbindung timeout"
- Überprüfen Sie SMTP-Server-Adresse
- Überprüfen Sie Port (587 für TLS, 465 für SSL)
- Prüfen Sie Ihre Internetverbindung

## Support:

Falls Sie weiterhin Probleme haben:
1. Überprüfen Sie die Konsole im Browser (F12) für Fehlermeldungen
2. Testen Sie die SMTP-Einstellungen mit einem anderen E-Mail-Client
3. Kontaktieren Sie Ihren E-Mail-Anbieter für SMTP-Details

---

**Wichtig**: Nach der korrekten SMTP-Konfiguration funktionieren alle E-Mail-Funktionen wieder vollständig! 🎉