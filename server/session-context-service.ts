import { Request, Response } from "express";
import { storage } from "./storage";
import { AuditService } from "./audit-service";
import { PermissionValidationService } from "./permission-validation-service";

declare module "express-session" {
  interface SessionData {
    currentShopId?: number;
    previousShopId?: number;
    shopSwitchTimestamp?: Date;
  }
}

/**
 * Session-Context Service für Multi-Shop Admin Shop-Switching
 * Implementiert temporäre Shop-Kontexte ohne DB-Änderungen
 */
export class SessionContextService {

  /**
   * POST /api/multi-shop/switch-shop/:shopId
   * Temporärer Shop-Kontext für Multi-Shop Admin
   */
  static async switchShopContext(req: Request, res: Response) {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const userId = req.user!.id;
      const targetShopId = parseInt(req.params.shopId);

      if (isNaN(targetShopId)) {
        return res.status(400).json({ error: "Ungültige Shop-ID" });
      }

      // Prüfen ob User Multi-Shop Admin ist
      if (!req.user!.isMultiShopAdmin) {
        await AuditService.logAccessDenied(
          userId,
          targetShopId,
          "User is not a multi-shop admin",
          req
        );
        return res.status(403).json({ error: "Keine Multi-Shop Admin Berechtigung" });
      }

      // DOPPELTE PERMISSION-VALIDATION
      const validation = await PermissionValidationService.validateShopAccess(
        userId,
        targetShopId,
        req
      );

      if (!validation.hasAccess) {
        return res.status(403).json({ 
          error: "Keine Berechtigung für diesen Shop",
          reason: validation.reason 
        });
      }

      // Rate-Limiting für Shop-Switches
      const rateLimitCheck = await PermissionValidationService.checkRateLimit(
        userId,
        "shop_switch",
        5, // 5 Minuten Window
        15 // Max 15 Switches pro 5 Minuten
      );

      if (!rateLimitCheck.allowed) {
        await AuditService.log(
          userId,
          "shop_switch_rate_limited",
          "denied",
          { targetShopId, reason: "Rate limit exceeded", req }
        );
        return res.status(429).json({ 
          error: "Zu viele Shop-Switches. Bitte warten Sie einen Moment." 
        });
      }

      // Session-Context setzen (temporär, keine DB-Änderung)
      const previousShopId = req.session.currentShopId || null;
      req.session.currentShopId = targetShopId;
      req.session.previousShopId = previousShopId;
      req.session.shopSwitchTimestamp = new Date();

      // Shop-Switch auditieren
      await AuditService.logShopSwitch(userId, previousShopId, targetShopId, req);

      // Shop-Details für Response laden
      const shopDetails = await storage.getShopDetails(targetShopId);

      res.json({
        success: true,
        currentShopId: targetShopId,
        previousShopId,
        shopName: shopDetails?.name || 'Unbekannt',
        switchedAt: req.session.shopSwitchTimestamp,
        message: `Erfolgreich zu Shop "${shopDetails?.name}" gewechselt`
      });

    } catch (error) {
      console.error("Fehler beim Shop-Switch:", error);
      res.status(500).json({ error: "Server-Fehler beim Shop-Wechsel" });
    }
  }

  /**
   * GET /api/multi-shop/current-context
   * Aktueller Shop-Kontext abrufen
   */
  static async getCurrentContext(req: Request, res: Response) {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const userId = req.user!.id;
      const currentShopId = req.session.currentShopId || null;
      const previousShopId = req.session.previousShopId || null;
      const switchedAt = req.session.shopSwitchTimestamp || null;

      let shopDetails = null;
      if (currentShopId) {
        // Session-Context validieren
        const contextValidation = await PermissionValidationService.validateShopAccess(
          userId,
          currentShopId,
          req
        );

        if (!contextValidation.hasAccess) {
          // Ungültiger Kontext - Session zurücksetzen
          req.session.currentShopId = undefined;
          req.session.previousShopId = undefined;
          req.session.shopSwitchTimestamp = undefined;

          await AuditService.log(
            userId,
            "invalid_shop_context_reset",
            "success",
            { 
              shopId: currentShopId,
              reason: contextValidation.reason || "Invalid shop context",
              req 
            }
          );

          return res.json({
            currentShopId: null,
            previousShopId: null,
            switchedAt: null,
            shopDetails: null,
            mode: 'dashboard',
            message: 'Shop-Kontext war ungültig und wurde zurückgesetzt'
          });
        }

        shopDetails = await storage.getShopDetails(currentShopId);
      }

      res.json({
        currentShopId,
        previousShopId,
        switchedAt,
        shopDetails: shopDetails ? {
          id: shopDetails.id,
          name: shopDetails.name,
          businessName: shopDetails.businessName || shopDetails.name
        } : null,
        mode: currentShopId ? 'shop_context' : 'dashboard',
        isMultiShopAdmin: req.user!.isMultiShopAdmin
      });

    } catch (error) {
      console.error("Fehler beim Laden des Shop-Kontexts:", error);
      res.status(500).json({ error: "Server-Fehler beim Laden des Kontexts" });
    }
  }

  /**
   * POST /api/multi-shop/reset-context
   * Shop-Kontext zurücksetzen (zurück zum Dashboard)
   */
  static async resetShopContext(req: Request, res: Response) {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const userId = req.user!.id;
      const currentShopId = req.session.currentShopId;

      // Session-Context zurücksetzen
      req.session.currentShopId = undefined;
      req.session.previousShopId = undefined;
      req.session.shopSwitchTimestamp = undefined;

      // Reset auditieren
      await AuditService.log(
        userId,
        "shop_context_reset",
        "success",
        { 
          shopId: currentShopId || undefined,
          reason: "User reset shop context to dashboard mode",
          req 
        }
      );

      res.json({
        success: true,
        message: "Shop-Kontext zurückgesetzt",
        mode: 'dashboard'
      });

    } catch (error) {
      console.error("Fehler beim Zurücksetzen des Shop-Kontexts:", error);
      res.status(500).json({ error: "Server-Fehler beim Zurücksetzen" });
    }
  }

  /**
   * GET /api/multi-shop/context-history
   * Historie der Shop-Switches für Transparency
   */
  static async getContextHistory(req: Request, res: Response) {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;

      // Audit-Logs für Shop-Switches des Users laden
      const auditLogs = await AuditService.getUserAuditLogs(userId, limit);
      
      // Nur Shop-Switch relevante Logs filtern
      const switchHistory = auditLogs
        .filter(log => 
          log.action === 'shop_switch' || 
          log.action === 'shop_context_reset' ||
          log.action === 'invalid_shop_context_reset'
        )
        .map(log => ({
          id: log.id,
          action: log.action,
          fromShopId: log.shopId,
          toShopId: log.targetShopId,
          timestamp: log.createdAt,
          reason: log.reason,
          ipAddress: log.ipAddress
        }));

      res.json({
        totalSwitches: switchHistory.length,
        history: switchHistory
      });

    } catch (error) {
      console.error("Fehler beim Laden der Context-Historie:", error);
      res.status(500).json({ error: "Server-Fehler beim Laden der Historie" });
    }
  }
}