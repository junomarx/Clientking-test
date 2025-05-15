/**
 * Shop-Isolation Middleware
 * 
 * Diese Middleware stellt sicher, dass kein Benutzer auf Daten anderer Shops zugreifen kann.
 * Sie prüft, ob die Shop-ID aus der Anfrage mit der Shop-ID des angemeldeten Benutzers übereinstimmt.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware, die prüft, ob ein Benutzer auf einen bestimmten Shop zugreifen darf
 * @param req Express Request
 * @param res Express Response 
 * @param next Express NextFunction
 */
export async function requireShopIsolation(req: Request, res: Response, next: NextFunction) {
  // Sicherstellen, dass der Benutzer authentifiziert ist
  if (!req.isAuthenticated() && !req.user) {
    return res.status(401).json({ 
      error: "Nicht authentifiziert",
      code: "UNAUTHENTICATED"
    });
  }

  // Shop-ID aus den Request-Parametern oder Query-Parametern extrahieren
  const requestedShopId = req.params.shopId || req.query.shopId || req.body.shopId;
  
  // Wenn keine Shop-ID in der Anfrage ist, direkt weitermachen
  // (in diesem Fall muss die Ressource selbst die Shop-Isolation durchsetzen)
  if (!requestedShopId) {
    return next();
  }

  // Benutzer-ID aus der Session/Authentifizierung holen
  const userId = (req.user as any).id;
  
  // Benutzer aus der Datenbank abrufen, um die Shop-ID zu erhalten
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ 
      error: "Benutzer nicht gefunden",
      code: "USER_NOT_FOUND"
    });
  }

  // Ist es ein Superadmin? Dann ggf. Support-Zugriff prüfen
  if (user.isSuperadmin) {
    // Dynamischen Import verwenden, um zirkuläre Abhängigkeiten zu vermeiden
    const { hasActiveSupportAccess } = await import('../support-access');
    
    // Hat der Superadmin aktiven Support-Zugriff auf diesen Shop?
    const hasAccess = await hasActiveSupportAccess(userId, Number(requestedShopId));
    
    if (hasAccess) {
      // Mit Support-Zugriff darf der Superadmin auf die Daten zugreifen
      console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat Support-Zugriff auf Shop ${requestedShopId}`);
      return next();
    } else {
      console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN Support-Zugriff auf Shop ${requestedShopId}`);
    }
  }

  // Die Shop-ID des Benutzers mit der angeforderten Shop-ID vergleichen
  if (user.shopId !== Number(requestedShopId)) {
    console.warn(`❌ Shop-Isolation verletzt: Benutzer ${user.username} (Shop ${user.shopId}) versucht, auf Shop ${requestedShopId} zuzugreifen`);
    
    return res.status(403).json({ 
      error: "Zugriff verweigert: Shop-Isolation verletzt",
      code: "SHOP_ISOLATION_VIOLATED"
    });
  }

  // Shop-Isolation ist erfüllt, Weiterleitung an nächste Middleware/Route
  next();
}

/**
 * Middleware zum automatischen Hinzufügen der Shop-ID zu Anfragen
 * Verwendet die Shop-ID des authentifizierten Benutzers
 */
export async function attachShopId(req: Request, res: Response, next: NextFunction) {
  // Nur für authentifizierte Benutzer
  if (!req.isAuthenticated() && !req.user) {
    return next();
  }

  // Benutzer-ID aus der Session/Authentifizierung holen
  const userId = (req.user as any).id;
  
  // Benutzer aus der Datenbank abrufen, um die Shop-ID zu erhalten
  const user = await storage.getUser(userId);
  if (!user || !user.shopId) {
    return next();
  }

  // Shop-ID an die Anfrage anhängen
  // sowohl an req.body (für POST/PUT/PATCH) als auch an req.query (für GET)
  if (req.body && typeof req.body === 'object') {
    req.body.shopId = user.shopId;
  }
  
  if (req.query) {
    req.query.shopId = user.shopId.toString();
  }

  // Eigene Eigenschaft für einfachen Zugriff
  (req as any).shopId = user.shopId;

  next();
}