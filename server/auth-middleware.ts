import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Middleware zum Prüfen der Authentifizierung
export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log(`🚨🚨🚨 [AUTH-MIDDLEWARE] isAuthenticated CALLED: ${req.method} ${req.path} 🚨🚨🚨`);
  
  // 🎯 KRITISCHES ORDERS-DEBUGGING
  if (req.path.includes('/orders') || req.path.includes('/api/orders')) {
    console.log(`🎯 === ORDERS ENDPOINT DEBUG ===`);
    console.log(`🎯 Session ID: ${req.sessionID}`);
    console.log(`🎯 isAuthenticated(): ${req.isAuthenticated ? req.isAuthenticated() : 'N/A'}`);
    console.log(`🎯 req.user: ${req.user ? `${req.user.username} (ID: ${req.user.id})` : 'null'}`);
    console.log(`🎯 Cookie headers: ${req.headers.cookie || 'NONE'}`);
    console.log(`🎯 === END ORDERS DEBUG ===`);
  }
  
  try {
  // Prüfe auf benutzerdefinierte User-ID im Header (nur in Development!)
  if (process.env.NODE_ENV !== 'production') {
    const customUserId = req.headers['x-user-id'];
    if (customUserId) {
      console.log(`X-User-ID Header gefunden: ${customUserId}`);
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
          // Fix: User object must include userId property
          req.user = { ...user, userId: user.id };
          return next();
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten der X-User-ID:', error);
      }
    }
  }

  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log(`🚨 [AUTH-MIDDLEWARE] Passport authentication failed`);
    return res.status(401).json({ message: "Nicht angemeldet" });
  }

  console.log(`✅ [AUTH-MIDDLEWARE] Authentication successful`);
  next();
  
  } catch (error) {
    console.error(`🚨🚨🚨 [AUTH-MIDDLEWARE] EXCEPTION: ${error} 🚨🚨🚨`);
    console.error(`🚨🚨🚨 [AUTH-MIDDLEWARE] STACK:`, error.stack);
    return res.status(500).json({ message: "Authentication error" });
  }
}

// Middleware für Superadmin-Berechtigung
export async function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isSuperadmin) {
    return res.status(403).json({ message: "Superadmin-Berechtigung erforderlich" });
  }
  next();
}

// Middleware für Admin-Berechtigung (Admin oder Superadmin)
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (!req.user.isAdmin && !req.user.isSuperadmin)) {
    return res.status(403).json({ message: "Admin-Berechtigung erforderlich" });
  }
  next();
}