/**
 * Middleware zur Überprüfung der Testversion
 * 
 * Diese Middleware prüft, ob die Testversion eines Benutzers abgelaufen ist,
 * und schränkt den Zugriff entsprechend ein.
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware, die prüft, ob die Testversion eines Benutzers abgelaufen ist
 * @param req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export async function checkTrialExpiry(req: Request, res: Response, next: NextFunction) {
  // Alle Benutzer haben Vollzugriff - keine Trial-Beschränkungen
  // Nur Authentifizierung prüfen
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: "Nicht authentifiziert",
      code: "UNAUTHENTICATED"
    });
  }

  // Anfrage normal weiterleiten - keine Trial-Prüfung mehr
  next();
}