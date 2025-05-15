/**
 * API-Routen für das Support-Zugriffssystem
 * 
 * Implementiert die Endpunkte zur Verwaltung von Support-Zugriffsanfragen
 * und zur Prüfung von aktiven Support-Zugriffsberechtigungen.
 */

import { Router, Request, Response } from "express";
import {
  hasActiveSupportAccess,
  createSupportAccessRequest,
  approveSupportAccessRequest,
  denySupportAccessRequest,
  revokeSupportAccess,
  getSupportAccessRequestsForShop,
  getActiveSupportAccessForSuperadmin
} from "./support-access";
import { storage } from "./storage";
import { db } from "./db";
import { supportAccessLogs } from "@shared/schema";
import { eq } from "drizzle-orm";

// Middleware zur Prüfung, ob ein Benutzer ein Superadmin ist
function requireSuperadmin(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: "Nicht authentifiziert" });
  }

  if (!(req.user as any).isSuperadmin) {
    return res.status(403).json({ message: "Nicht autorisiert. Superadmin-Rechte erforderlich." });
  }

  next();
}

// Middleware zur Prüfung, ob ein Benutzer ein Shop-Admin ist
function requireShopAdmin(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: "Nicht authentifiziert" });
  }

  if (!(req.user as any).isAdmin) {
    return res.status(403).json({ message: "Nicht autorisiert. Admin-Rechte erforderlich." });
  }

  next();
}

// Support-Access-Router erstellen
export const supportAccessRouter = Router();

/**
 * Abrufen aller Support-Anfragen für den aktuellen Shop (für Shop-Admins)
 */
supportAccessRouter.get("/requests", requireShopAdmin, async (req: Request, res: Response) => {
  try {
    const shopId = (req.user as any).shopId;
    if (!shopId) {
      return res.status(400).json({ message: "Keine Shop-ID für den aktuellen Benutzer verfügbar" });
    }

    const requests = await getSupportAccessRequestsForShop(shopId);

    // Benutzernamen der Superadmins für bessere Frontend-Anzeige abrufen
    const requestsWithUsernames = await Promise.all(
      requests.map(async (request) => {
        const superadmin = await storage.getUser(request.superadminId);
        return {
          ...request,
          superadminUsername: superadmin?.username || "Unbekannter Benutzer"
        };
      })
    );

    res.status(200).json(requestsWithUsernames);
  } catch (error) {
    console.error("Fehler beim Abrufen der Support-Anfragen:", error);
    res.status(500).json({ message: "Fehler beim Abrufen der Support-Anfragen" });
  }
});

/**
 * Abrufen aller aktiven Support-Zugriffsberechtigungen für den aktuellen Superadmin
 */
supportAccessRouter.get("/active", requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const superadminId = (req.user as any).id;
    const activeAccessList = await getActiveSupportAccessForSuperadmin(superadminId);

    // Shop-Namen für bessere Frontend-Anzeige abrufen
    const accessListWithShopNames = await Promise.all(
      activeAccessList.map(async (access) => {
        const shop = await storage.getShopById(access.shopId);
        return {
          ...access,
          shopName: shop?.name || `Shop #${access.shopId}`
        };
      })
    );

    res.status(200).json(accessListWithShopNames);
  } catch (error) {
    console.error("Fehler beim Abrufen der aktiven Support-Zugriffsberechtigungen:", error);
    res.status(500).json({ message: "Fehler beim Abrufen der aktiven Support-Zugriffsberechtigungen" });
  }
});

/**
 * Support-Zugriff anfordern (für Superadmins)
 */
supportAccessRouter.post("/request", requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const { shopId, reason } = req.body;
    if (!shopId || !reason) {
      return res.status(400).json({ message: "Shop-ID und Begründung sind erforderlich" });
    }

    const superadminId = (req.user as any).id;
    const request = await createSupportAccessRequest(superadminId, shopId, reason);

    if (!request) {
      return res.status(400).json({ message: "Support-Zugriffsanfrage konnte nicht erstellt werden" });
    }

    res.status(201).json(request);
  } catch (error) {
    console.error("Fehler beim Erstellen der Support-Zugriffsanfrage:", error);
    res.status(500).json({ message: "Fehler beim Erstellen der Support-Zugriffsanfrage" });
  }
});

/**
 * Support-Zugriff genehmigen (für Shop-Admins)
 */
supportAccessRouter.post("/approve/:requestId", requireShopAdmin, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const { duration } = req.body; // Optional: Dauer in Stunden

    // Sicherstellen, dass die Anfrage zum Shop des genehmigenden Admins gehört
    const [request] = await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, requestId));

    if (!request) {
      return res.status(404).json({ message: "Anfrage nicht gefunden" });
    }

    if (request.shopId !== (req.user as any).shopId) {
      return res.status(403).json({ message: "Nicht autorisiert. Sie können nur Anfragen für Ihren eigenen Shop genehmigen." });
    }

    const approvedRequest = await approveSupportAccessRequest(
      requestId,
      (req.user as any).id,
      duration || 24
    );

    if (!approvedRequest) {
      return res.status(400).json({ message: "Anfrage konnte nicht genehmigt werden" });
    }

    res.status(200).json(approvedRequest);
  } catch (error) {
    console.error("Fehler beim Genehmigen der Support-Zugriffsanfrage:", error);
    res.status(500).json({ message: "Fehler beim Genehmigen der Support-Zugriffsanfrage" });
  }
});

/**
 * Support-Zugriff ablehnen (für Shop-Admins)
 */
supportAccessRouter.post("/deny/:requestId", requireShopAdmin, async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.requestId);

    // Sicherstellen, dass die Anfrage zum Shop des ablehnenden Admins gehört
    const [request] = await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, requestId));

    if (!request) {
      return res.status(404).json({ message: "Anfrage nicht gefunden" });
    }

    if (request.shopId !== (req.user as any).shopId) {
      return res.status(403).json({ message: "Nicht autorisiert. Sie können nur Anfragen für Ihren eigenen Shop ablehnen." });
    }

    const deniedRequest = await denySupportAccessRequest(requestId, (req.user as any).id);

    if (!deniedRequest) {
      return res.status(400).json({ message: "Anfrage konnte nicht abgelehnt werden" });
    }

    res.status(200).json(deniedRequest);
  } catch (error) {
    console.error("Fehler beim Ablehnen der Support-Zugriffsanfrage:", error);
    res.status(500).json({ message: "Fehler beim Ablehnen der Support-Zugriffsanfrage" });
  }
});

/**
 * Support-Zugriff widerrufen (für Shop-Admins und Superadmins)
 */
supportAccessRouter.post("/revoke/:requestId", async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const [request] = await db
      .select()
      .from(supportAccessLogs)
      .where(eq(supportAccessLogs.id, requestId));

    if (!request) {
      return res.status(404).json({ message: "Anfrage nicht gefunden" });
    }

    // Prüfen, ob der Benutzer berechtigt ist, die Anfrage zu widerrufen
    const user = req.user as any;
    const isSuperadminSelf = user.id === request.superadminId && user.isSuperadmin;
    const isShopAdmin = user.isAdmin && user.shopId === request.shopId;

    if (!isSuperadminSelf && !isShopAdmin) {
      return res.status(403).json({
        message: "Nicht autorisiert. Sie können nur Support-Zugriffe widerrufen, die Ihnen gehören oder für Ihren Shop gelten."
      });
    }

    const revokedRequest = await revokeSupportAccess(requestId, user.id);

    if (!revokedRequest) {
      return res.status(400).json({ message: "Anfrage konnte nicht widerrufen werden" });
    }

    res.status(200).json(revokedRequest);
  } catch (error) {
    console.error("Fehler beim Widerrufen des Support-Zugriffs:", error);
    res.status(500).json({ message: "Fehler beim Widerrufen des Support-Zugriffs" });
  }
});

/**
 * Prüfen, ob ein Superadmin Zugriff auf einen bestimmten Shop hat
 */
supportAccessRouter.get("/check/:shopId", requireSuperadmin, async (req: Request, res: Response) => {
  try {
    const shopId = parseInt(req.params.shopId);
    const superadminId = (req.user as any).id;

    const hasAccess = await hasActiveSupportAccess(superadminId, shopId);
    res.status(200).json({ hasAccess });
  } catch (error) {
    console.error("Fehler bei der Zugriffsüberprüfung:", error);
    res.status(500).json({ message: "Fehler bei der Zugriffsüberprüfung" });
  }
});