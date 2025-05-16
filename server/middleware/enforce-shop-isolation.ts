/**
 * DSGVO-Konforme Shop-Isolation
 * 
 * Diese Middleware stellt sicher, dass jeder Benutzer nur auf Daten seines eigenen Shops
 * zugreifen kann. Sie prüft die Shop-ID des anfragenden Benutzers und fügt sie als Filter
 * zu allen Datenbank-Operationen hinzu.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';

/**
 * Strenge Durchsetzung der Shop-Isolation für alle Endpunkte
 * Diese Middleware sollte nach der Authentifizierung und vor allen Route-Handlern platziert werden
 */
export async function enforceShopIsolation(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const userId = (req.user as any).id;
    if (!userId) {
      return res.status(401).json({ error: 'Benutzer-ID fehlt' });
    }

    // Benutzer aus Datenbank laden, um aktuelle Shop-ID zu bekommen
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    // Wenn keine Shop-ID vorhanden, Zugriff verweigern (DSGVO-konform)
    if (!user.shopId) {
      // Ausnahme für Superadmin - er benötigt für bestimmte Verwaltungsfunktionen Zugriff
      if (user.isSuperadmin) {
        // Für Superadmin erlaubt, aber mit Warnung in Logs
        console.log(`⚠️ Superadmin ${user.username} (ID ${userId}) ohne Shop-ID greift auf Daten zu`);
        return next();
      }
      
      console.warn(`❌ DSGVO-Schutz: Zugriff verweigert für Benutzer ${user.username} (ID ${userId}) - Keine Shop-ID`);
      return res.status(403).json({ error: 'DSGVO-Schutz: Zugriff verweigert - Keine Shop-ID' });
    }

    // Shop-ID des Benutzers an Request-Objekt anhängen für spätere Verwendung
    (req as any).userShopId = user.shopId;
    (req as any).isAdmin = user.isAdmin || user.isSuperadmin;
    
    console.log(`✅ DSGVO-Schutz: Benutzer ${user.username} (ID ${userId}) arbeitet mit Shop ${user.shopId}`);
    
    next();
  } catch (error) {
    console.error('Fehler bei der Shop-Isolation:', error);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Diese Funktion prüft strikt, ob der angegebene Customer zur Shop-ID des anfragenden Benutzers gehört
 */
export function validateCustomerBelongsToShop(customerId: number, req: Request): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const shopId = (req as any).userShopId;
      if (!shopId) {
        console.warn('Shop-ID fehlt bei der Kundenvalidierung');
        return resolve(false);
      }

      // Prüfe direkt in der Datenbank, ob der Kunde zum Shop gehört
      const result = await db.execute(
        `SELECT COUNT(*) as count FROM customers WHERE id = $1 AND shop_id = $2`,
        [customerId, shopId]
      );

      const count = result.rows[0]?.count || 0;
      return resolve(parseInt(count) > 0);
    } catch (error) {
      console.error('Fehler bei der Kundenvalidierung:', error);
      return resolve(false);
    }
  });
}