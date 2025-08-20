import { Request } from "express";
import { storage } from "./storage";
import { InsertAuditLog } from "@shared/schema";

export class AuditService {
  
  /**
   * Audit-Log erstellen mit automatischer IP/UserAgent-Erfassung
   */
  static async log(
    userId: number,
    action: string,
    status: "success" | "failed" | "denied",
    options: {
      shopId?: number;
      targetUserId?: number;
      targetShopId?: number;
      reason?: string;
      req?: Request;
    } = {}
  ): Promise<void> {
    try {
      const auditData: InsertAuditLog = {
        userId,
        shopId: options.shopId || null,
        action,
        targetUserId: options.targetUserId || null,
        targetShopId: options.targetShopId || null,
        status,
        reason: options.reason || null,
        ipAddress: options.req ? AuditService.getClientIP(options.req) : null,
        userAgent: options.req?.headers['user-agent'] || null,
        sessionId: options.req ? AuditService.getSessionId(options.req) : null,
      };

      await storage.createAuditLog(auditData);
      
      console.log(`📋 AUDIT: ${action} by user ${userId} - ${status}${options.reason ? ` (${options.reason})` : ''}`);
    } catch (error) {
      console.error("❌ AUDIT LOGGING FEHLER:", error);
      // Audit-Logs sollten niemals die Hauptfunktion blockieren
    }
  }

  /**
   * Shop-Switch Audit speziell für Multi-Shop Admins
   */
  static async logShopSwitch(
    userId: number,
    fromShopId: number | null,
    toShopId: number,
    req?: Request
  ): Promise<void> {
    await AuditService.log(
      userId,
      "shop_switch",
      "success",
      {
        shopId: fromShopId || undefined,
        targetShopId: toShopId,
        reason: `Switched from shop ${fromShopId || 'dashboard'} to shop ${toShopId}`,
        req
      }
    );
  }

  /**
   * Permission-Request Audit
   */
  static async logPermissionRequest(
    multiShopAdminId: number,
    shopId: number,
    shopOwnerId: number,
    req?: Request
  ): Promise<void> {
    await AuditService.log(
      multiShopAdminId,
      "permission_request",
      "success",
      {
        targetUserId: shopOwnerId,
        targetShopId: shopId,
        reason: `Requested access to shop ${shopId}`,
        req
      }
    );
  }

  /**
   * Permission-Grant/Deny Audit
   */
  static async logPermissionDecision(
    shopOwnerId: number,
    multiShopAdminId: number,
    shopId: number,
    granted: boolean,
    reason?: string,
    req?: Request
  ): Promise<void> {
    await AuditService.log(
      shopOwnerId,
      granted ? "permission_grant" : "permission_deny",
      "success",
      {
        targetUserId: multiShopAdminId,
        targetShopId: shopId,
        reason: reason || (granted ? `Granted access to shop ${shopId}` : `Denied access to shop ${shopId}`),
        req
      }
    );
  }

  /**
   * Fehlgeschlagene Zugriffs-Versuche
   */
  static async logAccessDenied(
    userId: number,
    shopId: number,
    reason: string,
    req?: Request
  ): Promise<void> {
    await AuditService.log(
      userId,
      "access_attempt",
      "denied",
      {
        targetShopId: shopId,
        reason,
        req
      }
    );
  }

  /**
   * Client-IP ermitteln (auch hinter Reverse-Proxies)
   */
  private static getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.headers['x-real-ip']?.toString() ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Session-ID extrahieren
   */
  private static getSessionId(req: Request): string | null {
    return req.sessionID || req.headers['x-session-id']?.toString() || null;
  }

  /**
   * Audit-Logs für einen Shop abrufen (für Transparenz gegenüber Shop Owner)
   */
  static async getShopAuditLogs(shopId: number, limit: number = 100) {
    return await storage.getAuditLogsForShop(shopId, limit);
  }

  /**
   * Audit-Logs für einen User abrufen
   */
  static async getUserAuditLogs(userId: number, limit: number = 100) {
    return await storage.getAuditLogsForUser(userId, limit);
  }
}