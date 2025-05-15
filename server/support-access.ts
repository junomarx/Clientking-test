/**
 * Support-Zugriffssystem für DSGVO-konforme Shop-Isolation
 * 
 * Dieses Modul implementiert einen sicheren Mechanismus, mit dem Superadmins
 * zeitlich begrenzten Zugriff auf Daten anderer Shops erhalten können.
 * Jeder Zugriff wird protokolliert und muss explizit genehmigt werden.
 */

import { db } from "./db";
import { supportAccessLogs, type SupportAccessLog } from "@shared/schema";
import { eq, and, lt, gte } from "drizzle-orm";
import { storage } from "./storage";

/**
 * Prüft, ob ein Superadmin aktiven Support-Zugriff auf einen bestimmten Shop hat
 * @param superadminId ID des Superadmins
 * @param shopId ID des Shops, auf den zugegriffen werden soll
 * @returns true, wenn Zugriff gewährt ist, sonst false
 */
export async function hasActiveSupportAccess(superadminId: number, shopId: number): Promise<boolean> {
  try {
    // Sicherstellen, dass der User ein Superadmin ist
    const user = await storage.getUser(superadminId);
    if (!user || !user.isSuperadmin) {
      console.warn(`Kein Support-Zugriff für Benutzer ${superadminId}, da kein Superadmin`);
      return false;
    }

    // Aktuelles Datum für Vergleich mit Ablaufdatum
    const now = new Date();

    // Aktiven Support-Zugriff aus der Datenbank abrufen
    const [accessLog] = await db
      .select()
      .from(supportAccessLogs)
      .where(
        and(
          eq(supportAccessLogs.superadminId, superadminId),
          eq(supportAccessLogs.shopId, shopId),
          eq(supportAccessLogs.status, "approved"),
          lt(now, supportAccessLogs.expiresAt)
        )
      );

    return !!accessLog;
  } catch (error) {
    console.error("Fehler bei der Prüfung des Support-Zugriffs:", error);
    return false;
  }
}

/**
 * Erstellt eine neue Support-Zugriffsanfrage
 * @param superadminId ID des Superadmins, der Zugriff anfordert
 * @param shopId ID des Shops, auf den zugegriffen werden soll
 * @param reason Grund für den Zugriff (für Protokollierung)
 * @returns Die erstellte Zugriffsanfrage oder null bei Fehler
 */
export async function createSupportAccessRequest(
  superadminId: number,
  shopId: number,
  reason: string
): Promise<SupportAccessLog | null> {
  try {
    // Sicherstellen, dass der User ein Superadmin ist
    const user = await storage.getUser(superadminId);
    if (!user || !user.isSuperadmin) {
      console.warn(`Keine Support-Zugriffsanfrage möglich für Benutzer ${superadminId}, da kein Superadmin`);
      return null;
    }

    // Shop existiert?
    const shop = await storage.getShopById(shopId);
    if (!shop) {
      console.warn(`Keine Support-Zugriffsanfrage möglich für Shop ${shopId}, da nicht existent`);
      return null;
    }

    // Standard-Ablaufdatum: 24 Stunden nach Genehmigung
    const defaultDuration = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

    // Neue Anfrage erstellen
    const [accessRequest] = await db
      .insert(supportAccessLogs)
      .values({
        superadminId,
        shopId,
        reason,
        status: "pending",
        requestedAt: new Date(),
        // Ablaufdatum wird erst bei Genehmigung gesetzt
        expiresAt: new Date(Date.now() + defaultDuration),
      })
      .returning();

    return accessRequest;
  } catch (error) {
    console.error("Fehler beim Erstellen der Support-Zugriffsanfrage:", error);
    return null;
  }
}

/**
 * Genehmigt eine Support-Zugriffsanfrage
 * @param requestId ID der Zugriffsanfrage
 * @param respondingUserId ID des Benutzers, der die Anfrage genehmigt (Shop-Admin)
 * @param duration Zugriffsdauer in Stunden (optional, Standard: 24h)
 * @returns Die aktualisierte Zugriffsanfrage oder null bei Fehler
 */
export async function approveSupportAccessRequest(
  requestId: number,
  respondingUserId: number,
  duration: number = 24
): Promise<SupportAccessLog | null> {
  try {
    // Zugriffsanfrage abrufen
    const [request] = await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, requestId));

    if (!request) {
      console.warn(`Support-Zugriffsanfrage mit ID ${requestId} nicht gefunden`);
      return null;
    }

    // Prüfen, ob der genehmigende Benutzer Admin des betreffenden Shops ist
    const user = await storage.getUser(respondingUserId);
    if (!user || !user.isAdmin || user.shopId !== request.shopId) {
      console.warn(`Benutzer ${respondingUserId} ist nicht berechtigt, Support-Zugriff für Shop ${request.shopId} zu genehmigen`);
      return null;
    }

    // Ablaufdatum basierend auf der angegebenen Dauer berechnen
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    // Anfrage aktualisieren
    const [updatedRequest] = await db
      .update(supportAccessLogs)
      .set({
        status: "approved",
        respondingUserId,
        respondedAt: new Date(),
        expiresAt,
      })
      .where(eq(supportAccessLogs.id, requestId))
      .returning();

    return updatedRequest;
  } catch (error) {
    console.error("Fehler beim Genehmigen der Support-Zugriffsanfrage:", error);
    return null;
  }
}

/**
 * Lehnt eine Support-Zugriffsanfrage ab
 * @param requestId ID der Zugriffsanfrage
 * @param respondingUserId ID des Benutzers, der die Anfrage ablehnt
 * @returns Die aktualisierte Zugriffsanfrage oder null bei Fehler
 */
export async function denySupportAccessRequest(
  requestId: number,
  respondingUserId: number
): Promise<SupportAccessLog | null> {
  try {
    // Zugriffsanfrage abrufen
    const [request] = await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, requestId));

    if (!request) {
      console.warn(`Support-Zugriffsanfrage mit ID ${requestId} nicht gefunden`);
      return null;
    }

    // Prüfen, ob der ablehnende Benutzer Admin des betreffenden Shops ist
    const user = await storage.getUser(respondingUserId);
    if (!user || !user.isAdmin || user.shopId !== request.shopId) {
      console.warn(`Benutzer ${respondingUserId} ist nicht berechtigt, Support-Zugriff für Shop ${request.shopId} abzulehnen`);
      return null;
    }

    // Anfrage aktualisieren
    const [updatedRequest] = await db
      .update(supportAccessLogs)
      .set({
        status: "denied",
        respondingUserId,
        respondedAt: new Date(),
      })
      .where(eq(supportAccessLogs.id, requestId))
      .returning();

    return updatedRequest;
  } catch (error) {
    console.error("Fehler beim Ablehnen der Support-Zugriffsanfrage:", error);
    return null;
  }
}

/**
 * Widerruft einen aktiven Support-Zugriff vorzeitig
 * @param requestId ID der Zugriffsanfrage
 * @param revokingUserId ID des Benutzers, der den Zugriff widerruft (kann Shop-Admin oder der Superadmin selbst sein)
 * @returns Die aktualisierte Zugriffsanfrage oder null bei Fehler
 */
export async function revokeSupportAccess(
  requestId: number,
  revokingUserId: number
): Promise<SupportAccessLog | null> {
  try {
    // Zugriffsanfrage abrufen
    const [request] = await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, requestId));

    if (!request) {
      console.warn(`Support-Zugriffsanfrage mit ID ${requestId} nicht gefunden`);
      return null;
    }

    // Prüfen, ob der widerrufende Benutzer berechtigt ist (Shop-Admin oder der Superadmin selbst)
    const user = await storage.getUser(revokingUserId);
    if (!user) {
      return null;
    }

    const isSuperadminSelf = user.id === request.superadminId && user.isSuperadmin;
    const isShopAdmin = user.isAdmin && user.shopId === request.shopId;

    if (!isSuperadminSelf && !isShopAdmin) {
      console.warn(`Benutzer ${revokingUserId} ist nicht berechtigt, Support-Zugriff für Shop ${request.shopId} zu widerrufen`);
      return null;
    }

    // Anfrage aktualisieren
    const [updatedRequest] = await db
      .update(supportAccessLogs)
      .set({
        status: "revoked",
        expiresAt: new Date(), // Sofort ablaufen lassen
      })
      .where(eq(supportAccessLogs.id, requestId))
      .returning();

    return updatedRequest;
  } catch (error) {
    console.error("Fehler beim Widerrufen des Support-Zugriffs:", error);
    return null;
  }
}

/**
 * Ruft alle Support-Zugriffsanfragen für einen bestimmten Shop ab
 * @param shopId ID des Shops
 * @returns Liste der Zugriffsanfragen
 */
export async function getSupportAccessRequestsForShop(shopId: number): Promise<SupportAccessLog[]> {
  try {
    return await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.shopId, shopId))
      .orderBy(supportAccessLogs.requestedAt);
  } catch (error) {
    console.error(`Fehler beim Abrufen der Support-Zugriffsanfragen für Shop ${shopId}:`, error);
    return [];
  }
}

/**
 * Ruft alle aktiven Support-Zugriffsberechtigungen für einen Superadmin ab
 * @param superadminId ID des Superadmins
 * @returns Liste der aktiven Zugriffsberechtigungen
 */
export async function getActiveSupportAccessForSuperadmin(superadminId: number): Promise<SupportAccessLog[]> {
  try {
    const now = new Date();

    return await db
      .select()
      .from(supportAccessLogs)
      .where(
        and(
          eq(supportAccessLogs.superadminId, superadminId),
          eq(supportAccessLogs.status, "approved"),
          gte(supportAccessLogs.expiresAt, now)
        )
      )
      .orderBy(supportAccessLogs.expiresAt);
  } catch (error) {
    console.error(`Fehler beim Abrufen der aktiven Support-Zugriffsberechtigungen für Superadmin ${superadminId}:`, error);
    return [];
  }
}