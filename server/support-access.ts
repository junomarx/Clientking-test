/**
 * Dieses Modul implementiert den DSGVO-konformen Support-Modus für Superadmins.
 * 
 * Der Support-Modus erlaubt Superadmins temporären Zugriff auf die Daten eines bestimmten Shops.
 * Alle Zugriffe werden protokolliert und haben eine begrenzte Gültigkeitsdauer.
 * Dies stellt sicher, dass datenschutzrechtliche Anforderungen erfüllt werden und
 * gleichzeitig technischer Support möglich bleibt.
 * 
 * Ab jetzt muss jede Support-Anfrage explizit vom Shop-Besitzer genehmigt werden,
 * um die DSGVO-Konformität zu gewährleisten und die Datensouveränität zu stärken.
 */

import { db } from "./db";
import { supportAccessLogs } from "./add-support-access-table"; // Verwende die aktualisierte Schema-Definition
import { eq, and, sql, not, or, isNull } from "drizzle-orm";

// Standardzeitraum für Support-Zugriffe in Minuten
const DEFAULT_SUPPORT_ACCESS_DURATION = 30;

// Status-Typen für Support-Zugriffe
export enum SupportAccessStatus {
  PENDING = 'pending',     // Anfrage gestellt, noch nicht beantwortet
  APPROVED = 'approved',   // Anfrage genehmigt, Zugriff erlaubt
  REJECTED = 'rejected',   // Anfrage abgelehnt, kein Zugriff
  EXPIRED = 'expired',     // Anfrage abgelaufen (keine Antwort innerhalb der Frist)
  COMPLETED = 'completed'  // Zugriffsanfrage abgeschlossen (manuell beendet)
}

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
          eq(supportAccessLogs.status, SupportAccessStatus.APPROVED), // Nur genehmigte Anfragen erlauben Zugriff
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
 * Erstellt eine neue Support-Zugriffsanfrage
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
    
    // Erstelle eine neue Support-Zugriffsanfrage mit Status "pending"
    const [result] = await db
      .insert(supportAccessLogs)
      .values({
        superadminId,
        shopId,
        reason,
        accessType,
        isActive: true,
        status: SupportAccessStatus.PENDING, // Neuer Status: Anfrage wartet auf Genehmigung
      })
      .returning({ id: supportAccessLogs.id });
    
    return result?.id || null;
  } catch (error) {
    console.error("Fehler beim Erstellen der Support-Zugriffsanfrage:", error);
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
        status: SupportAccessStatus.COMPLETED // Setze Status auf abgeschlossen
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

/**
 * Gibt alle offenen Support-Anfragen für einen Shop zurück
 */
export async function getPendingSupportRequests(shopId: number) {
  try {
    return await db
      .select()
      .from(supportAccessLogs)
      .where(
        and(
          eq(supportAccessLogs.shopId, shopId),
          eq(supportAccessLogs.status, SupportAccessStatus.PENDING)
        )
      )
      .orderBy(sql`${supportAccessLogs.startedAt} DESC`);
  } catch (error) {
    console.error("Fehler beim Abrufen der offenen Support-Anfragen:", error);
    return [];
  }
}

/**
 * Genehmigt eine Support-Anfrage
 */
export async function approveSupportRequest(requestId: number, userId: number): Promise<boolean> {
  try {
    await db
      .update(supportAccessLogs)
      .set({
        status: SupportAccessStatus.APPROVED,
        responded_at: sql`NOW()`,
        responding_user_id: userId
      })
      .where(eq(supportAccessLogs.id, requestId));
    
    return true;
  } catch (error) {
    console.error("Fehler beim Genehmigen der Support-Anfrage:", error);
    return false;
  }
}

/**
 * Lehnt eine Support-Anfrage ab
 */
export async function rejectSupportRequest(requestId: number, userId: number): Promise<boolean> {
  try {
    await db
      .update(supportAccessLogs)
      .set({
        status: SupportAccessStatus.REJECTED,
        isActive: false,
        responded_at: sql`NOW()`,
        responding_user_id: userId,
        endedAt: sql`NOW()`
      })
      .where(eq(supportAccessLogs.id, requestId));
    
    return true;
  } catch (error) {
    console.error("Fehler beim Ablehnen der Support-Anfrage:", error);
    return false;
  }
}