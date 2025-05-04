/**
 * Middleware zur Überprüfung von Superadmin-Rechten
 */

import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Middleware zur Überprüfung, ob der Benutzer Superadmin ist
export function isSuperadmin(req: Request, res: Response, next: NextFunction) {
  // Header X-User-ID prüfen (wird vom Client gesendet)
  const userIdHeader = req.headers['x-user-id'];
  console.log('Superadmin-Bereich: X-User-ID Header gefunden:', userIdHeader);
  
  if (!userIdHeader) {
    return res.status(401).json({ error: 'Keine Benutzer-ID im Header gefunden' });
  }
  
  const userId = parseInt(userIdHeader as string);
  
  // Benutzer in der Datenbank suchen
  db.select()
    .from(users)
    .where(eq(users.id, userId))
    .then(([user]) => {
      if (!user) {
        return res.status(401).json({ error: 'Benutzer nicht gefunden' });
      }
      
      if (!user.isSuperadmin) {
        return res.status(403).json({ error: 'Keine Superadmin-Berechtigung' });
      }
      
      console.log(`Superadmin-Bereich: Superadmin-Benutzer mit ID ${userId} gefunden: ${user.username}`);
      next();
    })
    .catch((error) => {
      console.error('Fehler bei der Superadmin-Überprüfung:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    });
}
