import { Express } from "express";
import { db } from "./db";
import { supportAccessLogs } from "./add-support-access-table";
import { and, eq } from "drizzle-orm";
import { storage } from "./storage";

/**
 * Implementiert die API-Routen für den Support-Modus
 * 
 * Diese Routen ermöglichen:
 * 1. Superadmins, Support-Anfragen zu erstellen
 * 2. Shop-Admins, ausstehende Anfragen zu sehen
 * 3. Shop-Admins, Anfragen zu genehmigen oder abzulehnen
 * 4. Das Protokollieren aller Support-Zugriffe für DSGVO-Konformität
 */
export function setupSupportAccessRoutes(app: Express) {
  // Anfragen abrufen (für Shop-Admins)
  app.get("/api/support/requests/pending", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = req.user;
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }

    try {
      // Ausstehende Anfragen für den Shop des Benutzers abrufen
      const pendingRequests = await db
        .select({
          id: supportAccessLogs.id,
          superadminId: supportAccessLogs.superadminId,
          superadminUsername: supportAccessLogs.superadminUsername,
          reason: supportAccessLogs.reason,
          accessType: supportAccessLogs.accessType,
          startedAt: supportAccessLogs.startedAt,
          status: supportAccessLogs.status,
          isActive: supportAccessLogs.isActive
        })
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.shopId, user.shopId || 0),
            eq(supportAccessLogs.status, "PENDING")
          )
        );

      // Nach Erstellungsdatum sortieren, neueste zuerst
      pendingRequests.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      res.json(pendingRequests);
    } catch (error) {
      console.error("Fehler beim Abrufen ausstehender Support-Anfragen:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Anfrage genehmigen
  app.post("/api/support/requests/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = req.user;
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }

    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Ungültige Anfrage-ID" });
    }

    try {
      // Prüfen, ob die Anfrage existiert und für den Shop des Benutzers ist
      const [request] = await db
        .select()
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.id, requestId),
            eq(supportAccessLogs.shopId, user.shopId || 0)
          )
        );

      if (!request) {
        return res.status(404).json({ error: "Anfrage nicht gefunden" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ error: "Nur ausstehende Anfragen können genehmigt werden" });
      }

      // Anfrage genehmigen
      await db
        .update(supportAccessLogs)
        .set({
          status: "APPROVED",
          approvedById: user.id,
          approvedByUsername: user.username,
          approvedAt: new Date()
        })
        .where(eq(supportAccessLogs.id, requestId));

      res.json({ success: true, message: "Anfrage erfolgreich genehmigt" });
    } catch (error) {
      console.error("Fehler beim Genehmigen der Support-Anfrage:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Anfrage ablehnen
  app.post("/api/support/requests/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = req.user;
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Keine Berechtigung" });
    }

    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Ungültige Anfrage-ID" });
    }

    try {
      // Prüfen, ob die Anfrage existiert und für den Shop des Benutzers ist
      const [request] = await db
        .select()
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.id, requestId),
            eq(supportAccessLogs.shopId, user.shopId || 0)
          )
        );

      if (!request) {
        return res.status(404).json({ error: "Anfrage nicht gefunden" });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({ error: "Nur ausstehende Anfragen können abgelehnt werden" });
      }

      // Anfrage ablehnen
      await db
        .update(supportAccessLogs)
        .set({
          status: "REJECTED",
          approvedById: user.id,
          approvedByUsername: user.username,
          approvedAt: new Date(),
          isActive: false
        })
        .where(eq(supportAccessLogs.id, requestId));

      res.json({ success: true, message: "Anfrage erfolgreich abgelehnt" });
    } catch (error) {
      console.error("Fehler beim Ablehnen der Support-Anfrage:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Superadmin-Zugang: Unterstützungsanfrage erstellen
  app.post("/api/superadmin/support-access", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = req.user;
    if (!user || !user.isSuperadmin) {
      return res.status(403).json({ error: "Nur für Superadministratoren" });
    }

    const { shopId, reason, accessType } = req.body;

    if (!shopId || !reason || !accessType) {
      return res.status(400).json({ error: "Fehlende Parameter" });
    }

    try {
      // Shop-Existenz prüfen
      const shopUser = await storage.getUserByShopId(shopId);
      if (!shopUser) {
        return res.status(404).json({ error: "Shop nicht gefunden" });
      }

      // Prüfen, ob bereits eine aktive Anfrage besteht
      const existingRequests = await db
        .select()
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.superadminId, user.id),
            eq(supportAccessLogs.shopId, shopId),
            eq(supportAccessLogs.isActive, true)
          )
        );

      if (existingRequests.length > 0) {
        // Status zurückgeben, aber keine neue Anfrage erstellen
        return res.json({
          success: true,
          message: "Es besteht bereits eine aktive Anfrage für diesen Shop",
          requestStatus: existingRequests[0].status,
          requestId: existingRequests[0].id
        });
      }

      // Neue Support-Anfrage erstellen
      const [newRequest] = await db
        .insert(supportAccessLogs)
        .values({
          superadminId: user.id,
          superadminUsername: user.username,
          shopId: shopId,
          reason: reason,
          accessType: accessType,
          startedAt: new Date(),
          status: "PENDING",
          isActive: true
        })
        .returning();

      res.json({
        success: true,
        message: "Support-Anfrage erfolgreich erstellt",
        requestId: newRequest.id
      });
    } catch (error) {
      console.error("Fehler beim Erstellen der Support-Anfrage:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Support-Zugriff für Superadmin beenden
  app.post("/api/superadmin/support-access/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = req.user;
    if (!user || !user.isSuperadmin) {
      return res.status(403).json({ error: "Nur für Superadministratoren" });
    }

    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Ungültige Anfrage-ID" });
    }

    try {
      // Prüfen, ob die Anfrage existiert und vom aktuellen Superadmin ist
      const [request] = await db
        .select()
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.id, requestId),
            eq(supportAccessLogs.superadminId, user.id)
          )
        );

      if (!request) {
        return res.status(404).json({ error: "Anfrage nicht gefunden" });
      }

      // Anfrage beenden
      await db
        .update(supportAccessLogs)
        .set({
          endedAt: new Date(),
          isActive: false
        })
        .where(eq(supportAccessLogs.id, requestId));

      res.json({ success: true, message: "Support-Zugriff erfolgreich beendet" });
    } catch (error) {
      console.error("Fehler beim Beenden des Support-Zugriffs:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Aktive Support-Anfragen für den aktuellen Superadmin abrufen
  app.get("/api/superadmin/support-access/active", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht authentifiziert" });
    }

    const user = req.user;
    if (!user || !user.isSuperadmin) {
      return res.status(403).json({ error: "Nur für Superadministratoren" });
    }

    try {
      const activeRequests = await db
        .select()
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.superadminId, user.id),
            eq(supportAccessLogs.isActive, true)
          )
        );

      res.json(activeRequests);
    } catch (error) {
      console.error("Fehler beim Abrufen aktiver Support-Anfragen:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });
}