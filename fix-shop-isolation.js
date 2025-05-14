/**
 * DSGVO-Fix: Skript zur Entfernung aller "shopId || 1" Fallbacks aus storage.ts
 * 
 * Dieses Skript ersetzt alle Instanzen des kritischen "shopId || 1" Fallbacks
 * durch eine strikte Shop-Isolation, die sicherstellt, dass jeder Benutzer nur
 * die Daten seines eigenen Shops sehen kann.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pfad zur storage.ts-Datei
const filePath = path.join(__dirname, 'server', 'storage.ts');

// Lies den Inhalt der Datei
let content = fs.readFileSync(filePath, 'utf8');

// Definiere das Suchmuster und den Ersatz für Funktionen, die Daten zurückgeben
const userPattern = /const user = await this\.getUser\(userId\);[\s\S]*?if \(!user\) return \[?\]?;[\s\S]*?const shopId = user\.shopId \|\| 1;/g;
const userReplacement = 
`const user = await this.getUser(userId);
    if (!user) return [];

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
    if (!user.shopId) {
      console.warn(\`❌ Benutzer \${user.username} (ID: \${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert\`);
      return [];
    }

    // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
    const shopId = user.shopId;`;

// Ähnliches Muster für currentUser
const currentUserPattern = /const currentUser = await this\.getUser\(currentUserId\);[\s\S]*?if \(!currentUser\) return \[?\]?;[\s\S]*?const shopIdValue = currentUser\.shopId \|\| 1;/g;
const currentUserReplacement = 
`const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
    if (!currentUser.shopId) {
      console.warn(\`❌ Benutzer \${currentUser.username} (ID: \${currentUser.id}) hat keine Shop-Zuordnung – Zugriff verweigert\`);
      return [];
    }

    // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
    const shopIdValue = currentUser.shopId;`;

// Für Funktionen, die ein einzelnes Objekt zurückgeben (undefined statt leere Liste)
const currentUserSinglePattern = /const currentUser = await this\.getUser\(currentUserId\);[\s\S]*?if \(!currentUser\) return undefined;[\s\S]*?const shopIdValue = currentUser\.shopId \|\| 1;/g;
const currentUserSingleReplacement = 
`const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben statt Fallback auf Shop 1
    if (!currentUser.shopId) {
      console.warn(\`❌ Benutzer \${currentUser.username} (ID: \${currentUser.id}) hat keine Shop-Zuordnung – Zugriff verweigert\`);
      return undefined;
    }

    // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
    const shopIdValue = currentUser.shopId;`;

// Einfacher, nur den direkten Fallback ersetzen
// Dieser ist weniger präzise, daher wird er nach den spezifischeren Mustern angewendet
const fallbackPattern = /user\.shopId \|\| 1/g;
const fallbackReplacement = `user.shopId /* DSGVO-Fix: Fallback auf Shop 1 entfernt */`;

const fallbackPatternCurrentUser = /currentUser\.shopId \|\| 1/g;
const fallbackReplacementCurrentUser = `currentUser.shopId /* DSGVO-Fix: Fallback auf Shop 1 entfernt */`;

// Wende die Ersetzungen an
content = content.replace(userPattern, userReplacement);
content = content.replace(currentUserPattern, currentUserReplacement);
content = content.replace(currentUserSinglePattern, currentUserSingleReplacement);
content = content.replace(fallbackPattern, fallbackReplacement);
content = content.replace(fallbackPatternCurrentUser, fallbackReplacementCurrentUser);

// Schreibe den geänderten Inhalt zurück in die Datei
fs.writeFileSync(filePath, content, 'utf8');

console.log('DSGVO-Fix: Alle "shopId || 1" Fallbacks wurden entfernt und durch strikte Shop-Isolation ersetzt.');
console.log('Bitte überprüfe die Datei storage.ts auf korrekte Implementierung und teste die Anwendung gründlich.');