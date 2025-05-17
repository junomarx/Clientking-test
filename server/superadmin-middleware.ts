/**
 * Superadmin-Middleware zur Prüfung von Superadmin-Berechtigungen
 * und zum Schutz von Superadmin-Routen
 */

import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/**
 * Middleware zum Prüfen, ob ein Benutzer Superadmin-Berechtigungen hat
 * Prüft zunächst HTTP-Header für Debugging, dann Session-Auth, dann Token-Auth
 */
export function isSuperadmin(req: Request, res: Response, next: NextFunction) {
  // Prüfe auf benutzerdefinierte User-ID im Header (für direktes Debugging)
  const customUserId = req.headers['x-user-id'];
  if (customUserId) {
    console.log(`Superadmin-Bereich: X-User-ID Header gefunden: ${customUserId}`);
    // Wenn wir eine Benutzer-ID im Header haben, versuchen wir, den Benutzer zu laden
    try {
      const userId = parseInt(customUserId.toString());
      storage.getUser(userId).then(user => {
        if (user) {
          console.log(`Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
          if (user.isSuperadmin) {
            console.log(`Superadmin-Bereich: Superadmin-Benutzer mit ID ${userId} gefunden: ${user.username}`);
            // Wichtig: Stelle sicher, dass der Benutzer das isSuperadmin-Flag hat
            req.user = {
              ...user,
              isSuperadmin: true,
              userId: user.id // Sicherstellen, dass die userId gesetzt ist
            };
            return next();
          } else {
            console.log(`Superadmin-Bereich: Benutzer ist kein Superadmin`);
            return res.status(403).json({ message: "Keine Superadmin-Rechte" });
          }
        } else {
          console.log(`Benutzer mit ID ${userId} nicht gefunden`);
          return res.status(404).json({ message: "Benutzer nicht gefunden" });
        }
      }).catch(err => {
        console.error('Superadmin-Bereich: Fehler beim Verarbeiten der X-User-ID:', err);
        return res.status(401).json({ message: "Nicht angemeldet" });
      });
      return; // Wichtig: Früher Return, da wir asynchron arbeiten
    } catch (error) {
      console.error('Superadmin-Bereich: Fehler beim Verarbeiten der X-User-ID:', error);
    }
  }
  
  // Standardmäßig die Session-Authentifizierung prüfen
  if (!req.isAuthenticated()) {
    // Als Fallback, versuche die Token-Authentifizierung
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = Buffer.from(token, 'base64').toString();
        const tokenParts = decoded.split(':');
        
        if (tokenParts.length < 2) {
          return res.status(401).json({ message: "Ungültiges Token-Format" });
        }
        
        const userId = parseInt(tokenParts[0]);
        
        // Benutzer aus der Datenbank abrufen
        storage.getUser(userId).then(user => {
          if (!user) {
            return res.status(401).json({ message: "Benutzer nicht gefunden" });
          }
          
          if (!user.isSuperadmin) {
            return res.status(403).json({ message: "Keine Superadmin-Rechte" });
          }
          
          // Benutzer in Request setzen mit userId
          req.user = {
            ...user,
            userId: user.id
          };
          return next();
        }).catch(err => {
          console.error('Superadmin-Bereich: Token-Auth Fehler:', err);
          return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
        });
        return; // Wichtig: Früher Return, da wir asynchron arbeiten
      } catch (error) {
        console.error('Superadmin-Bereich: Token-Auth Fehler:', error);
        return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
      }
    } else {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
  } else if (!req.user) {
    return res.status(401).json({ message: "Nicht angemeldet" });
  } else if (!(req.user as any).isSuperadmin) {
    console.log("Benutzer ist eingeloggt, aber kein Superadmin:", req.user);
    return res.status(403).json({ message: "Keine Superadmin-Rechte" });
  } else {
    // Stelle sicher, dass der Benutzer mit allen Eigenschaften verknüpft ist
    console.log("Superadmin authentifiziert:", req.user.username || (req.user as any).username);
    next();
  }
}
