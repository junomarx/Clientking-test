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
import { users, customers } from '../../shared/schema';

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
export async function validateCustomerBelongsToShop(customerId: number, userShopId: number): Promise<boolean> {
  try {
    if (!userShopId) {
      console.warn('Shop-ID fehlt bei der Kundenvalidierung');
      return false;
    }

    // Prüfen ob ein Kunde mit dieser ID für den Shop existiert
    const customerEntries = await db
      .select({ count: db.fn.count() })
      .from(customers)
      .where(eq(customers.id, customerId))
      .where(eq(customers.shopId, userShopId));

    return customerEntries.length > 0 && Number(customerEntries[0].count) > 0;
  } catch (error) {
    console.error('Fehler bei der Kundenvalidierung:', error);
    return false;
  }
}