import { NextFunction, Request, Response, Router, Express } from 'express';
import { storage } from './storage';
import { db } from './db';
import { userDeviceTypes, userBrands, userModels } from '@shared/schema';
import { desc, eq, or, and, isNull } from 'drizzle-orm';

// Der Superadmin hat die user_id = 10
const SUPERADMIN_USER_ID = 10;

export function registerGlobalDeviceRoutes(app: Express): void {
  const router = Router();

  // Hilfsfunktion zur Authentifizierung - Benutzer muss eingeloggt sein
  function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).json({ error: 'Nicht authentifiziert' });
    }
  }

  // Abrufen aller globalen Gerätetypen (sowohl vom Superadmin als auch vom aktuellen Benutzer)
  router.get('/device-types', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      // Abrufen der Gerätetypen, die vom Superadmin erstellt wurden
      // ODER vom aktuellen Benutzer erstellt wurden
      const deviceTypes = await db
        .select()
        .from(userDeviceTypes)
        .where(
          or(
            eq(userDeviceTypes.userId, SUPERADMIN_USER_ID),
            eq(userDeviceTypes.userId, userId ?? 0)
          )
        )
        .orderBy(desc(userDeviceTypes.id));
      
      res.json(deviceTypes);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Gerätetypen:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  });

  // Abrufen aller globalen Marken für einen bestimmten Gerätetyp
  router.get('/brands', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const deviceTypeId = req.query.deviceTypeId ? parseInt(req.query.deviceTypeId as string) : null;
      
      if (!deviceTypeId) {
        return res.status(400).json({ error: 'deviceTypeId ist erforderlich' });
      }
      
      // Abrufen der Marken für den gegebenen Gerätetyp
      // Berücksichtige Marken vom Superadmin UND vom aktuellen Benutzer
      const brands = await db
        .select()
        .from(userBrands)
        .where(
          and(
            eq(userBrands.deviceTypeId, deviceTypeId),
            or(
              eq(userBrands.userId, SUPERADMIN_USER_ID),
              eq(userBrands.userId, userId ?? 0)
            )
          )
        )
        .orderBy(userBrands.name);
      
      res.json(brands);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Marken:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  });

  // Abrufen aller globalen Modelle für eine bestimmte Marke
  router.get('/models', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string) : null;
      
      if (!brandId) {
        return res.status(400).json({ error: 'brandId ist erforderlich' });
      }
      
      // Abrufen der Modelle für die gegebene Marke
      // Berücksichtige Modelle vom Superadmin UND vom aktuellen Benutzer
      const models = await db
        .select()
        .from(userModels)
        .where(
          and(
            eq(userModels.brandId, brandId),
            or(
              eq(userModels.userId, SUPERADMIN_USER_ID),
              eq(userModels.userId, userId ?? 0)
            )
          )
        )
        .orderBy(userModels.name);
      
      res.json(models);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Modelle:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  });

  // Registriere die Router unter dem Pfad '/api/global'
  app.use('/api/global', router);
}