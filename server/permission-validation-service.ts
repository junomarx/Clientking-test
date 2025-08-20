import { storage } from "./storage";
import { AuditService } from "./audit-service";
import { Request } from "express";

/**
 * Permission-Validation Service für Multi-Shop Admin System
 * Implementiert Defense in Depth mit doppelter Prüfung
 */
export class PermissionValidationService {

  /**
   * DOPPELTE PERMISSION-PRÜFUNG für Multi-Shop Admin Zugriff
   * Prüft: granted && !revoked && aktiv
   */
  static async validateShopAccess(
    multiShopAdminId: number,
    targetShopId: number,
    req?: Request
  ): Promise<{ hasAccess: boolean; reason?: string }> {
    try {
      // 1. Grundlegende User-Validierung
      const user = await storage.getUser(multiShopAdminId);
      if (!user || !user.isActive || !user.isMultiShopAdmin) {
        await AuditService.logAccessDenied(
          multiShopAdminId,
          targetShopId,
          "User is not active multi-shop admin",
          req
        );
        return { 
          hasAccess: false, 
          reason: "User is not an active multi-shop admin" 
        };
      }

      // 2. Permission-Prüfung über Storage
      const hasPermission = await storage.hasShopPermission(multiShopAdminId, targetShopId);
      if (!hasPermission) {
        await AuditService.logAccessDenied(
          multiShopAdminId,
          targetShopId,
          "No valid permission found",
          req
        );
        return { 
          hasAccess: false, 
          reason: "No permission granted for this shop" 
        };
      }

      // 3. DOPPELTE SICHERHEITSPRÜFUNG: Permission Details validieren
      const permissions = await storage.getShopPermissions(multiShopAdminId);
      const specificPermission = permissions.find(p => 
        p.shopId === targetShopId && 
        p.multiShopAdminId === multiShopAdminId
      );

      if (!specificPermission) {
        await AuditService.logAccessDenied(
          multiShopAdminId,
          targetShopId,
          "Permission not found in detailed validation",
          req
        );
        return { 
          hasAccess: false, 
          reason: "Permission verification failed" 
        };
      }

      // 4. Status-Validierung: granted && !revoked
      if (!specificPermission.granted) {
        await AuditService.logAccessDenied(
          multiShopAdminId,
          targetShopId,
          "Permission not granted",
          req
        );
        return { 
          hasAccess: false, 
          reason: "Permission not granted by shop owner" 
        };
      }

      if (specificPermission.revokedAt) {
        await AuditService.logAccessDenied(
          multiShopAdminId,
          targetShopId,
          "Permission has been revoked",
          req
        );
        return { 
          hasAccess: false, 
          reason: "Permission has been revoked" 
        };
      }

      // 5. Zeitbasierte Validierung (optional - falls implementiert)
      if (specificPermission.grantedAt && specificPermission.grantedAt > new Date()) {
        await AuditService.logAccessDenied(
          multiShopAdminId,
          targetShopId,
          "Permission not yet active",
          req
        );
        return { 
          hasAccess: false, 
          reason: "Permission not yet active" 
        };
      }

      // ✅ Alle Prüfungen bestanden
      console.log(`✅ PERMISSION VALIDATION: User ${multiShopAdminId} has valid access to shop ${targetShopId}`);
      return { hasAccess: true };

    } catch (error) {
      console.error("❌ PERMISSION VALIDATION ERROR:", error);
      await AuditService.logAccessDenied(
        multiShopAdminId,
        targetShopId,
        `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        req
      );
      return { 
        hasAccess: false, 
        reason: "System error during permission validation" 
      };
    }
  }

  /**
   * Rate-Limiting für Permission Requests
   * Verhindert Spam-Anfragen
   */
  static async checkRateLimit(
    userId: number,
    action: string,
    windowMinutes: number = 10,
    maxAttempts: number = 5
  ): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    // Simple In-Memory Rate Limiting - könnte in Redis ausgelagert werden
    const key = `${userId}-${action}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    if (!this.rateLimitStorage) {
      this.rateLimitStorage = new Map();
    }

    const userAttempts = this.rateLimitStorage.get(key) || { count: 0, firstAttempt: now };

    // Window zurücksetzen wenn abgelaufen
    if (now - userAttempts.firstAttempt > windowMs) {
      userAttempts.count = 0;
      userAttempts.firstAttempt = now;
    }

    if (userAttempts.count >= maxAttempts) {
      return { allowed: false, remainingAttempts: 0 };
    }

    userAttempts.count++;
    this.rateLimitStorage.set(key, userAttempts);

    return { 
      allowed: true, 
      remainingAttempts: maxAttempts - userAttempts.count 
    };
  }

  /**
   * Session-basierte Shop-Context Validation
   * Stellt sicher, dass temporäre Shop-Switches valide sind
   */
  static async validateShopContext(
    userId: number,
    sessionShopId: number | null,
    req?: Request
  ): Promise<{ valid: boolean; reason?: string }> {
    // Wenn kein Shop-Context gesetzt ist, ist das OK (Dashboard-Modus)
    if (!sessionShopId) {
      return { valid: true };
    }

    // Prüfen ob User Zugriff auf den Shop hat
    const accessValidation = await this.validateShopAccess(userId, sessionShopId, req);
    
    if (!accessValidation.hasAccess) {
      return { 
        valid: false, 
        reason: accessValidation.reason || "Invalid shop context" 
      };
    }

    return { valid: true };
  }

  /**
   * Input-Sanitization für Permission-Requests
   */
  static sanitizePermissionRequest(data: any): {
    valid: boolean;
    sanitized?: { multiShopAdminId: number; shopId: number; shopOwnerId: number };
    errors?: string[];
  } {
    const errors: string[] = [];

    // Validate multiShopAdminId
    const multiShopAdminId = parseInt(data.multiShopAdminId);
    if (isNaN(multiShopAdminId) || multiShopAdminId <= 0) {
      errors.push("Invalid multiShopAdminId");
    }

    // Validate shopId
    const shopId = parseInt(data.shopId);
    if (isNaN(shopId) || shopId <= 0) {
      errors.push("Invalid shopId");
    }

    // Validate shopOwnerId
    const shopOwnerId = parseInt(data.shopOwnerId);
    if (isNaN(shopOwnerId) || shopOwnerId <= 0) {
      errors.push("Invalid shopOwnerId");
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      sanitized: { multiShopAdminId, shopId, shopOwnerId }
    };
  }

  // Private Rate-Limiting Storage (würde in Production durch Redis ersetzt)
  private static rateLimitStorage: Map<string, { count: number; firstAttempt: number }>;
}