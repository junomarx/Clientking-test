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
  // Sicherstellen, dass der Benutzer authentifiziert ist
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: "Nicht authentifiziert",
      code: "UNAUTHENTICATED"
    });
  }

  // Benutzer-ID aus der Session holen
  const userId = (req.user as any).id;
  
  // Prüfen, ob die Testversion abgelaufen ist
  const isExpired = await storage.isTrialExpired(userId);
  
  if (isExpired) {
    console.warn(`❌ Benutzer ${(req.user as any).username} (ID: ${userId}) hat eine abgelaufene Testversion – Zugriff verweigert`);
    
    return res.status(403).json({
      error: "Ihre Testversion ist abgelaufen. Bitte aktualisieren Sie Ihr Paket, um weiterhin Zugriff zu haben.",
      code: "TRIAL_EXPIRED"
    });
  }

  // Wenn die Testversion nicht abgelaufen ist, Anfrage normal weiterleiten
  next();
}