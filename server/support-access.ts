/**
 * Dieses Modul implementiert den DSGVO-konformen Support-Modus für Superadmins.
 * 
 * Der Support-Modus erlaubt Superadmins temporären Zugriff auf die Daten eines bestimmten Shops.
 * Alle Zugriffe werden protokolliert und haben eine begrenzte Gültigkeitsdauer.
 * Dies stellt sicher, dass datenschutzrechtliche Anforderungen erfüllt werden und
 * gleichzeitig technischer Support möglich bleibt.
 */

import { db } from "./db";
import { supportAccessLogs } from "./add-support-access-table";
import { eq, and, sql } from "drizzle-orm";

// Standardzeitraum für Support-Zugriffe in Minuten
const DEFAULT_SUPPORT_ACCESS_DURATION = 30;

/**
 * Prüft, ob ein aktiver Support-Zugriff für den angegebenen Superadmin und Shop besteht
 */
export async function hasActiveSupportAccess(superadminId: number, shopId: number): Promise<boolean> {
  try {
    const activeSessions = await db
      .select({ id: supportAccessLogs.id })
      .from(supportAccessLogs)
      .where(
        and(
          eq(supportAccessLogs.superadminId, superadminId),
          eq(supportAccessLogs.shopId, shopId),
          eq(supportAccessLogs.isActive, true),
          sql`${supportAccessLogs.startedAt} > NOW() - INTERVAL '${DEFAULT_SUPPORT_ACCESS_DURATION} minutes'`
        )
      );
    
    return activeSessions.length > 0;
  } catch (error) {
    console.error("Fehler beim Prüfen des Support-Zugriffs:", error);
    return false;
  }
}

/**
 * Erstellt einen neuen Support-Zugriff
 */
export async function createSupportAccess(
  superadminId: number, 
  shopId: number, 
  reason: string, 
  accessType: string
): Promise<number | null> {
  try {
    // Deaktiviere alle bestehenden aktiven Zugriffe für diesen Superadmin und Shop
    await deactivateAllSupportAccess(superadminId, shopId);
    
    // Erstelle einen neuen Support-Zugriff
    const [result] = await db
      .insert(supportAccessLogs)
      .values({
        superadminId,
        shopId,
        reason,
        accessType,
        isActive: true,
      })
      .returning({ id: supportAccessLogs.id });
    
    return result?.id || null;
  } catch (error) {
    console.error("Fehler beim Erstellen des Support-Zugriffs:", error);
    return null;
  }
}

/**
 * Beendet alle aktiven Support-Zugriffe für den angegebenen Superadmin und Shop
 */
export async function deactivateAllSupportAccess(superadminId: number, shopId: number): Promise<void> {
  try {
    await db
      .update(supportAccessLogs)
      .set({
        isActive: false,
        endedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(supportAccessLogs.superadminId, superadminId),
          eq(supportAccessLogs.shopId, shopId),
          eq(supportAccessLogs.isActive, true)
        )
      );
  } catch (error) {
    console.error("Fehler beim Deaktivieren des Support-Zugriffs:", error);
  }
}

/**
 * Protokolliert die betroffenen Entitäten bei einem Support-Zugriff
 */
export async function logAffectedEntities(
  accessId: number, 
  entityType: string, 
  entityIds: number[]
): Promise<void> {
  try {
    const [currentLog] = await db
      .select({ affectedEntities: supportAccessLogs.affectedEntities })
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, accessId));
    
    let affectedEntities = currentLog?.affectedEntities || "";
    
    // Füge neue Entitäten zum Log hinzu
    const newEntities = entityIds.map(id => `${entityType}:${id}`).join(",");
    
    if (affectedEntities) {
      affectedEntities += "," + newEntities;
    } else {
      affectedEntities = newEntities;
    }
    
    // Aktualisiere den Log
    await db
      .update(supportAccessLogs)
      .set({ affectedEntities })
      .where(eq(supportAccessLogs.id, accessId));
  } catch (error) {
    console.error("Fehler beim Protokollieren der betroffenen Entitäten:", error);
  }
}

/**
 * Gibt alle Support-Zugriffe für einen Superadmin zurück
 */
export async function getSupportAccessHistory(superadminId: number) {
  try {
    return await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.superadminId, superadminId))
      .orderBy(sql`${supportAccessLogs.startedAt} DESC`);
  } catch (error) {
    console.error("Fehler beim Abrufen der Support-Zugriffs-Historie:", error);
    return [];
  }
}