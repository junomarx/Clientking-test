import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { activityLogs } from '../../shared/schema.js';

/**
 * Shop ID Sanitization Middleware
 * 
 * Prevents unauthorized shop_id manipulation by:
 * 1. Stripping shop_id from request bodies
 * 2. Logging suspicious manipulation attempts
 * 3. Ensuring shop_id is derived from authenticated user context only
 */

interface SanitizationOptions {
  /** Whether to log sanitization events */
  logAttempts?: boolean;
  /** Whether to allow shop_id in specific routes */
  allowedRoutes?: string[];
  /** Whether to allow superadmin to set shop_id */
  allowSuperadmin?: boolean;
}

/**
 * Create middleware that sanitizes shop_id from request bodies
 */
export function createShopIdSanitizationMiddleware(options: SanitizationOptions = {}) {
  const {
    logAttempts = true,
    allowedRoutes = [],
    allowSuperadmin = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if no body
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      // Check if this route is in the allowlist
      // Use baseUrl + path to get full route (req.path alone doesn't include /api prefix)
      const fullPath = req.baseUrl + req.path;
      const isAllowedRoute = allowedRoutes.some(route => fullPath.includes(route));
      if (isAllowedRoute) {
        return next();
      }

      // Check if user is superadmin (they can set shop_id for administrative operations)
      const user = req.user as any;
      const isSuperadmin = user && user.role === 'superadmin';
      
      if (allowSuperadmin && isSuperadmin) {
        return next();
      }

      // Check if shop_id is present in request body
      const hasShopId = 'shopId' in req.body || 'shop_id' in req.body;
      
      if (hasShopId) {
        const attemptedShopId = req.body.shopId || req.body.shop_id;
        const userShopId = user?.shopId;

        // Log the sanitization attempt
        if (logAttempts) {
          await logSanitizationAttempt(req, attemptedShopId, userShopId);
        }

        // Remove shop_id from request body
        delete req.body.shopId;
        delete req.body.shop_id;

        console.warn(`🔒 Sanitized shop_id from request: ${req.method} ${req.path}`, {
          attemptedShopId,
          userShopId,
          userId: user?.id,
          ipAddress: req.ip
        });
      }

      next();
    } catch (error) {
      console.error('Error in shop_id sanitization middleware:', error);
      // Don't fail the request due to middleware error
      next();
    }
  };
}

/**
 * Log shop_id manipulation attempts to activity_logs
 */
async function logSanitizationAttempt(
  req: Request,
  attemptedShopId: any,
  userShopId: number | null | undefined
): Promise<void> {
  try {
    const user = req.user as any;

    // Only log if there's an actual mismatch or unauthorized attempt
    if (attemptedShopId && attemptedShopId != userShopId) {
      await db.insert(activityLogs).values({
        eventType: 'security',
        action: 'shop_id_sanitized',
        entityType: 'request',
        description: `Blocked shop_id manipulation attempt on ${req.method} ${req.path}`,
        details: {
          attemptedShopId,
          userShopId,
          method: req.method,
          path: req.path,
          body: sanitizeBodyForLogging(req.body),
          timestamp: new Date().toISOString()
        },
        performedBy: user?.id || null,
        performedByUsername: user?.username || user?.email || 'anonymous',
        performedByRole: user?.role || 'unknown',
        shopId: userShopId || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
        severity: 'warning'
      });
    }
  } catch (error) {
    console.error('Failed to log sanitization attempt:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBodyForLogging(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Middleware specifically for routes that create or update entities
 * Ensures shop_id is always set from authenticated user context
 */
export function enforceUserShopIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Set shop_id from user context if not already set
  if (req.body && typeof req.body === 'object') {
    // Remove any existing shop_id first
    delete req.body.shopId;
    delete req.body.shop_id;

    // Set shop_id from authenticated user (only if user has one)
    if (user.shopId) {
      req.body.shopId = user.shopId;
    }
  }

  next();
}

/**
 * Validate that shop_id in params/query matches authenticated user
 * Used for GET/DELETE operations with shop_id in URL
 */
export function validateShopIdAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Superadmins and multi-shop admins can access any shop
  if (user.role === 'superadmin' || user.role === 'multishop_admin') {
    return next();
  }

  // Extract shop_id from params or query
  const requestedShopId = parseInt(req.params.shopId || req.query.shopId as string);

  if (requestedShopId && requestedShopId !== user.shopId) {
    console.warn(`🚫 Unauthorized shop access attempt:`, {
      userId: user.id,
      userShopId: user.shopId,
      requestedShopId,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({ 
      error: 'Access denied: You do not have permission to access this shop\'s data' 
    });
  }

  next();
}

/**
 * Security audit helper - Check if user is attempting cross-shop access
 */
export function detectCrossShopAccess(
  userShopId: number | null | undefined,
  requestShopId: number | null | undefined
): boolean {
  if (!userShopId || !requestShopId) {
    return false;
  }
  return userShopId !== requestShopId;
}
