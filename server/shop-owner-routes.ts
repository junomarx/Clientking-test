import { Request, Response } from "express";
import { storage } from "./storage";
import { AuditService } from "./audit-service";
import { PermissionValidationService } from "./permission-validation-service";

/**
 * Shop Owner API Routes für Permission-Management
 */

/**
 * GET /api/shop-owner/pending-requests
 * Shop Owner sieht offene Permission-Anfragen
 */
export async function getPendingPermissionRequests(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const shopOwnerId = req.user!.id;
    const pendingRequests = await storage.getPendingPermissions(shopOwnerId);

    // Erweiterte Informationen zu den Anfragen laden
    const enrichedRequests = await Promise.all(
      pendingRequests.map(async (request) => {
        const multiShopAdmin = await storage.getUser(request.multiShopAdminId);
        const shop = await storage.getShopDetails(request.shopId);
        
        return {
          id: request.id,
          multiShopAdminId: request.multiShopAdminId,
          multiShopAdminName: multiShopAdmin?.username || 'Unbekannt',
          multiShopAdminEmail: multiShopAdmin?.email || null,
          shopId: request.shopId,
          shopName: shop?.name || 'Unbekannt',
          createdAt: request.createdAt,
          requestReason: `Multi-Shop Admin "${multiShopAdmin?.username}" möchte Zugriff auf Shop "${shop?.name}"`
        };
      })
    );

    await AuditService.log(
      shopOwnerId,
      "view_pending_requests", 
      "success",
      { reason: `Viewed ${enrichedRequests.length} pending requests`, req }
    );

    res.json(enrichedRequests);
  } catch (error) {
    console.error("Fehler beim Laden der Permission-Anfragen:", error);
    res.status(500).json({ error: "Server-Fehler beim Laden der Anfragen" });
  }
}

/**
 * POST /api/shop-owner/approve-request/:id
 * Shop Owner genehmigt Permission-Anfrage
 */
export async function approvePermissionRequest(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const shopOwnerId = req.user!.id;
    const permissionId = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(permissionId)) {
      return res.status(400).json({ error: "Ungültige Permission-ID" });
    }

    // Rate-Limiting für Approval-Aktionen
    const rateLimitCheck = await PermissionValidationService.checkRateLimit(
      shopOwnerId, 
      "approve_permission", 
      5, // 5 Minuten Window
      10 // Max 10 Approvals pro 5 Minuten
    );

    if (!rateLimitCheck.allowed) {
      await AuditService.log(
        shopOwnerId,
        "permission_approve_rate_limited",
        "denied",
        { reason: "Rate limit exceeded", req }
      );
      return res.status(429).json({ 
        error: "Zu viele Approval-Anfragen. Bitte warten Sie einen Moment." 
      });
    }

    // Permission-Anfrage laden und validieren
    const permissions = await storage.getShopPermissions(shopOwnerId);
    const targetPermission = permissions.find(p => p.id === permissionId);

    if (!targetPermission) {
      await AuditService.log(
        shopOwnerId,
        "permission_approve_failed",
        "failed",
        { reason: "Permission not found", req }
      );
      return res.status(404).json({ error: "Permission-Anfrage nicht gefunden" });
    }

    if (targetPermission.granted) {
      return res.status(400).json({ error: "Anfrage bereits genehmigt" });
    }

    // Permission genehmigen
    const success = await storage.grantShopAccess(permissionId);
    
    if (success) {
      // Audit-Log für die Genehmigung
      await AuditService.logPermissionDecision(
        shopOwnerId,
        targetPermission.multiShopAdminId,
        targetPermission.shopId,
        true,
        reason || "Permission approved by shop owner",
        req
      );

      res.json({ 
        success: true, 
        message: "Permission erfolgreich genehmigt",
        permissionId 
      });
    } else {
      await AuditService.log(
        shopOwnerId,
        "permission_approve_failed",
        "failed",
        { reason: "Database update failed", req }
      );
      res.status(500).json({ error: "Fehler beim Genehmigen der Permission" });
    }
  } catch (error) {
    console.error("Fehler beim Genehmigen der Permission:", error);
    res.status(500).json({ error: "Server-Fehler beim Genehmigen" });
  }
}

/**
 * POST /api/shop-owner/deny-request/:id
 * Shop Owner lehnt Permission-Anfrage ab
 */
export async function denyPermissionRequest(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const shopOwnerId = req.user!.id;
    const permissionId = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(permissionId)) {
      return res.status(400).json({ error: "Ungültige Permission-ID" });
    }

    // Rate-Limiting für Deny-Aktionen
    const rateLimitCheck = await PermissionValidationService.checkRateLimit(
      shopOwnerId, 
      "deny_permission", 
      5, // 5 Minuten Window
      10 // Max 10 Denies pro 5 Minuten
    );

    if (!rateLimitCheck.allowed) {
      await AuditService.log(
        shopOwnerId,
        "permission_deny_rate_limited",
        "denied",
        { reason: "Rate limit exceeded", req }
      );
      return res.status(429).json({ 
        error: "Zu viele Deny-Anfragen. Bitte warten Sie einen Moment." 
      });
    }

    // Permission-Anfrage laden und validieren
    const permissions = await storage.getShopPermissions(shopOwnerId);
    const targetPermission = permissions.find(p => p.id === permissionId);

    if (!targetPermission) {
      await AuditService.log(
        shopOwnerId,
        "permission_deny_failed",
        "failed",
        { reason: "Permission not found", req }
      );
      return res.status(404).json({ error: "Permission-Anfrage nicht gefunden" });
    }

    // Permission ablehnen (durch Revoke)
    const success = await storage.revokeShopAccess(permissionId);
    
    if (success) {
      // Audit-Log für die Ablehnung
      await AuditService.logPermissionDecision(
        shopOwnerId,
        targetPermission.multiShopAdminId,
        targetPermission.shopId,
        false,
        reason || "Permission denied by shop owner",
        req
      );

      res.json({ 
        success: true, 
        message: "Permission erfolgreich abgelehnt",
        permissionId 
      });
    } else {
      await AuditService.log(
        shopOwnerId,
        "permission_deny_failed",
        "failed",
        { reason: "Database update failed", req }
      );
      res.status(500).json({ error: "Fehler beim Ablehnen der Permission" });
    }
  } catch (error) {
    console.error("Fehler beim Ablehnen der Permission:", error);
    res.status(500).json({ error: "Server-Fehler beim Ablehnen" });
  }
}

/**
 * GET /api/shop-owner/audit-logs/:shopId
 * Shop Owner kann Audit-Logs für Transparenz einsehen
 */
export async function getShopAuditLogs(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const shopOwnerId = req.user!.id;
    const shopId = parseInt(req.params.shopId);
    const limit = parseInt(req.query.limit as string) || 50;

    if (isNaN(shopId)) {
      return res.status(400).json({ error: "Ungültige Shop-ID" });
    }

    // Prüfen ob User Berechtigung für diesen Shop hat
    const userShop = await storage.getUserByShopId(shopId);
    if (!userShop || userShop.id !== shopOwnerId) {
      await AuditService.logAccessDenied(
        shopOwnerId,
        shopId,
        "Unauthorized access to shop audit logs",
        req
      );
      return res.status(403).json({ error: "Keine Berechtigung für diesen Shop" });
    }

    const auditLogs = await AuditService.getShopAuditLogs(shopId, Math.min(limit, 100));

    res.json(auditLogs);
  } catch (error) {
    console.error("Fehler beim Laden der Audit-Logs:", error);
    res.status(500).json({ error: "Server-Fehler beim Laden der Audit-Logs" });
  }
}

/**
 * Registriert alle Shop Owner Routes
 */
export function registerShopOwnerRoutes(app: any) {
  app.get('/api/shop-owner/pending-requests', getPendingPermissionRequests);
  app.post('/api/shop-owner/approve-request/:id', approvePermissionRequest);
  app.post('/api/shop-owner/deny-request/:id', denyPermissionRequest);
  app.get('/api/shop-owner/audit-logs/:shopId', getShopAuditLogs);
  console.log('✅ Shop Owner routes registered');
}