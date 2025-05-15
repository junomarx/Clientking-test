/**
 * API-Routen für den DSGVO-konformen Support-Modus
 * 
 * Diese Routen ermöglichen es Superadmins, temporären Zugriff auf die Daten eines Shops
 * zu beantragen, zu beenden und zu protokollieren.
 */

import { Express, Request, Response, NextFunction } from "express";
import {
  hasActiveSupportAccess,
  createSupportAccess,
  deactivateAllSupportAccess,
  getSupportAccessHistory,
  getPendingSupportRequests,
  approveSupportRequest,
  rejectSupportRequest,
  SupportAccessStatus
} from "./support-access";
import { isSuperadmin } from "./auth";

export function setupSupportAccessRoutes(app: Express) {
  // Prüft, ob der aktuelle Benutzer Superadmin-Rechte hat
  const requireSuperadmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }
    
    if (!req.user || !isSuperadmin(req.user)) {
      return res.status(403).json({ message: "Keine Superadmin-Berechtigung" });
    }
    
    // TypeScript weiß jetzt, dass req.user definiert ist
    next();
  };

  // Support-Zugriff beantragen
  app.post("/api/support/access", requireSuperadmin, async (req, res) => {
    const { shopId, reason, accessType } = req.body;
    
    if (!shopId || !reason || !accessType) {
      return res.status(400).json({ 
        message: "Fehlende Angaben: Shop-ID, Grund und Zugriffstyp sind erforderlich" 
      });
    }
    
    // Sicherstellung, dass req.user definiert ist (durch requireSuperadmin-Middleware garantiert)
    if (!req.user) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }
    
    const accessId = await createSupportAccess(
      req.user.id, 
      shopId, 
      reason, 
      accessType
    );
    
    if (accessId) {
      return res.status(201).json({ 
        id: accessId,
        message: "Support-Zugriff gestartet"
      });
    } else {
      return res.status(500).json({ 
        message: "Fehler beim Starten des Support-Zugriffs" 
      });
    }
  });
  
  // Support-Zugriff prüfen
  app.get("/api/support/access/:shopId", requireSuperadmin, async (req, res) => {
    const shopId = parseInt(req.params.shopId, 10);
    
    if (isNaN(shopId)) {
      return res.status(400).json({ message: "Ungültige Shop-ID" });
    }
    
    // Sicherstellung, dass req.user definiert ist (durch requireSuperadmin-Middleware garantiert)
    if (!req.user) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }
    
    const hasAccess = await hasActiveSupportAccess(req.user.id, shopId);
    
    return res.json({ hasAccess });
  });
  
  // Support-Zugriff beenden
  app.delete("/api/support/access/:shopId", requireSuperadmin, async (req, res) => {
    const shopId = parseInt(req.params.shopId, 10);
    
    if (isNaN(shopId)) {
      return res.status(400).json({ message: "Ungültige Shop-ID" });
    }
    
    // Sicherstellung, dass req.user definiert ist (durch requireSuperadmin-Middleware garantiert)
    if (!req.user) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }
    
    await deactivateAllSupportAccess(req.user.id, shopId);
    
    return res.json({ 
      message: "Support-Zugriff beendet" 
    });
  });
  
  // Support-Zugriffs-Historie abrufen
  app.get("/api/support/history", requireSuperadmin, async (req, res) => {
    // Sicherstellung, dass req.user definiert ist (durch requireSuperadmin-Middleware garantiert)
    if (!req.user) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }
    
    const history = await getSupportAccessHistory(req.user.id);
    
    return res.json(history);
  });
}