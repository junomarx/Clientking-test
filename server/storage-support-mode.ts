/**
 * DSGVO-konforme Schutzmechanismen für den Support-Modus
 * 
 * Diese Datei stellt Hilfsfunktionen und Wrapper für den DSGVO-konformen Support-Modus bereit,
 * der es Superadmins nur nach expliziter Anforderung und unter protokollierter Aufsicht erlaubt,
 * auf Daten anderer Shops zuzugreifen.
 */

import { storage } from "./storage";
import { hasActiveSupportAccess, logAffectedEntities } from "./support-access";

/**
 * Prüft, ob der angegebene Benutzer Zugriff auf den Shop hat
 * Berücksichtigt sowohl normale Shop-Zugehörigkeit als auch Support-Zugriff
 */
export async function hasShopAccess(userId: number, shopId: number): Promise<boolean> {
  // Hole den Benutzer
  const user = await storage.getUser(userId);
  
  if (!user) {
    return false;
  }
  
  // Shop-Zugehörigkeit prüfen (wenn der Shop des Benutzers mit dem angefragten Shop übereinstimmt)
  if (user.shopId === shopId) {
    return true;
  }
  
  // Wenn der Benutzer ein Superadmin ist, prüfe Support-Zugriff
  if (user.isSuperadmin) {
    return await hasActiveSupportAccess(userId, shopId);
  }
  
  return false;
}

/**
 * Überprüft, ob ein Superadmin auf ein Objekt zugreifen darf
 * Verwendet für Funktionen, bei denen ein Superadmin nur mit aktivem Support-Zugriff
 * auf Daten eines anderen Shops zugreifen darf.
 * 
 * Auch geeignet, wenn kein bestimmter Shop bereits bekannt ist, sondern nur über
 * die Objekt-ID ermittelt werden muss.
 */
export async function canSuperadminAccessObject(
  userId: number, 
  objectType: string,
  objectId: number,
  getObjectShopIdFn: (id: number) => Promise<number | null>
): Promise<boolean> {
  // Hole den Benutzer
  const user = await storage.getUser(userId);
  
  if (!user) {
    return false;
  }
  
  // Wenn kein Superadmin, kann nur auf eigene Objekte zugreifen
  if (!user.isSuperadmin) {
    return true; // Normale Benutzer werden durch reguläre Filterung eingeschränkt
  }
  
  // Hole die Shop-ID des angefragten Objekts
  const objectShopId = await getObjectShopIdFn(objectId);
  
  if (objectShopId === null) {
    return false; // Objekt existiert nicht
  }
  
  // Shop-Zugehörigkeit prüfen
  if (user.shopId === objectShopId) {
    return true; // Darf auf eigene Shop-Daten zugreifen
  }
  
  // Prüfe Support-Zugriff
  const hasAccess = await hasActiveSupportAccess(userId, objectShopId);
  
  // Wenn Zugriff erlaubt, protokolliere die betroffene Entität
  if (hasAccess) {
    try {
      // Finde aktiven Support-Zugriff (für die Protokollierung)
      const accessLogs = await storage.getActiveSupportAccessLogs(userId, objectShopId);
      if (accessLogs && accessLogs.length > 0) {
        await logAffectedEntities(accessLogs[0].id, objectType, [objectId]);
      }
    } catch (error) {
      console.error("Fehler bei der Protokollierung des Support-Zugriffs:", error);
      // Aber Zugriff trotzdem erlauben, wenn grundsätzlich berechtigt
    }
  }
  
  return hasAccess;
}

/**
 * Überprüft, ob ein Superadmin auf Shop-Daten zugreifen darf
 * Auch geeignet für Listenanfragen, bei denen mehrere Objekte zurückgegeben werden.
 * Der aufgerufene Datenbankzugriff muss die Filterung nach shopId selbst vornehmen.
 */
export async function canSuperadminAccessShop(userId: number, shopId: number): Promise<boolean> {
  // Hole den Benutzer
  const user = await storage.getUser(userId);
  
  if (!user) {
    return false;
  }
  
  // Wenn kein Superadmin, kann nur auf eigene Shop-Daten zugreifen
  if (!user.isSuperadmin) {
    return user.shopId === shopId;
  }
  
  // Shop-Zugehörigkeit prüfen
  if (user.shopId === shopId) {
    return true; // Darf auf eigene Shop-Daten zugreifen
  }
  
  // Prüfe Support-Zugriff
  return await hasActiveSupportAccess(userId, shopId);
}

// Die Funktion zum Abrufen aktiver Support-Zugriffsprofile wurde in die DatabaseStorage-Klasse integriert
// Siehe storage.ts - getActiveSupportAccessLogs

// Export der Funktionen, um sie in storage.ts verfügbar zu machen
export const supportModeHelpers = {
  hasShopAccess,
  canSuperadminAccessObject,
  canSuperadminAccessShop,
  getActiveSupportAccessLogs
};