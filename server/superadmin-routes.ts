/**
 * API-Routen für den Superadmin-Bereich
 * Diese Routen sind nur für Superadmin-Benutzer zugänglich
 */

import { Request, Response, NextFunction, Express } from 'express';
import { db } from './db';
import { isSuperadmin } from './superadmin-middleware';
import { sql, eq, and, isNull, or } from 'drizzle-orm';
import {
  users,
  packageFeatures,
  packages,
  deviceTypes,
  deviceBrands,
  deviceModels,
  deviceIssues
} from '@shared/schema';

export function registerSuperadminRoutes(app: Express) {
  // Gerätetypen-Routen
  app.get("/api/superadmin/device-types", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allTypes = await db.select().from(deviceTypes);
      res.json(allTypes);
    } catch (error) {
      console.error("Fehler beim Abrufen der Gerätetypen:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.post("/api/superadmin/device-types", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name, isGlobal } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name ist erforderlich" });
      }
      
      const [newType] = await db.insert(deviceTypes).values({
        name,
        isGlobal: isGlobal === false ? false : true,
        createdAt: new Date().toISOString(),
      }).returning();
      
      res.status(201).json(newType);
    } catch (error) {
      console.error("Fehler beim Erstellen des Gerätetyps:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.patch("/api/superadmin/device-types/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, isGlobal } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name ist erforderlich" });
      }
      
      const [updatedType] = await db.update(deviceTypes)
        .set({
          name,
          isGlobal: isGlobal === false ? false : true,
        })
        .where(eq(deviceTypes.id, parseInt(id)))
        .returning();
      
      if (!updatedType) {
        return res.status(404).json({ error: "Gerätetyp nicht gefunden" });
      }
      
      res.json(updatedType);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Gerätetyps:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.delete("/api/superadmin/device-types/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [deletedType] = await db.delete(deviceTypes)
        .where(eq(deviceTypes.id, parseInt(id)))
        .returning();
      
      if (!deletedType) {
        return res.status(404).json({ error: "Gerätetyp nicht gefunden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen des Gerätetyps:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  // Marken-Routen
  app.get("/api/superadmin/device-brands", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allBrands = await db.select().from(deviceBrands);
      res.json(allBrands);
    } catch (error) {
      console.error("Fehler beim Abrufen der Marken:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.post("/api/superadmin/device-brands", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name, deviceType, isGlobal } = req.body;
      
      if (!name || !deviceType) {
        return res.status(400).json({ error: "Name und Gerätetyp sind erforderlich" });
      }
      
      const [newBrand] = await db.insert(deviceBrands).values({
        name,
        deviceType,
        isGlobal: isGlobal === false ? false : true,
        createdAt: new Date().toISOString(),
      }).returning();
      
      res.status(201).json(newBrand);
    } catch (error) {
      console.error("Fehler beim Erstellen der Marke:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.patch("/api/superadmin/device-brands/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, deviceType, isGlobal } = req.body;
      
      if (!name || !deviceType) {
        return res.status(400).json({ error: "Name und Gerätetyp sind erforderlich" });
      }
      
      const [updatedBrand] = await db.update(deviceBrands)
        .set({
          name,
          deviceType,
          isGlobal: isGlobal === false ? false : true,
        })
        .where(eq(deviceBrands.id, parseInt(id)))
        .returning();
      
      if (!updatedBrand) {
        return res.status(404).json({ error: "Marke nicht gefunden" });
      }
      
      res.json(updatedBrand);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Marke:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.delete("/api/superadmin/device-brands/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [deletedBrand] = await db.delete(deviceBrands)
        .where(eq(deviceBrands.id, parseInt(id)))
        .returning();
      
      if (!deletedBrand) {
        return res.status(404).json({ error: "Marke nicht gefunden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen der Marke:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  // Modell-Routen
  app.get("/api/superadmin/device-models", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allModels = await db.select().from(deviceModels);
      res.json(allModels);
    } catch (error) {
      console.error("Fehler beim Abrufen der Modelle:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.post("/api/superadmin/device-models", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name, brand, deviceType, isGlobal } = req.body;
      
      if (!name || !brand || !deviceType) {
        return res.status(400).json({ error: "Name, Marke und Gerätetyp sind erforderlich" });
      }
      
      const [newModel] = await db.insert(deviceModels).values({
        name,
        brand,
        deviceType,
        isGlobal: isGlobal === false ? false : true,
        createdAt: new Date().toISOString(),
      }).returning();
      
      res.status(201).json(newModel);
    } catch (error) {
      console.error("Fehler beim Erstellen des Modells:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.patch("/api/superadmin/device-models/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, brand, deviceType, isGlobal } = req.body;
      
      if (!name || !brand || !deviceType) {
        return res.status(400).json({ error: "Name, Marke und Gerätetyp sind erforderlich" });
      }
      
      const [updatedModel] = await db.update(deviceModels)
        .set({
          name,
          brand,
          deviceType,
          isGlobal: isGlobal === false ? false : true,
        })
        .where(eq(deviceModels.id, parseInt(id)))
        .returning();
      
      if (!updatedModel) {
        return res.status(404).json({ error: "Modell nicht gefunden" });
      }
      
      res.json(updatedModel);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Modells:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.delete("/api/superadmin/device-models/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [deletedModel] = await db.delete(deviceModels)
        .where(eq(deviceModels.id, parseInt(id)))
        .returning();
      
      if (!deletedModel) {
        return res.status(404).json({ error: "Modell nicht gefunden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen des Modells:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  // Fehler/Problem-Routen
  app.get("/api/superadmin/device-issues", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allIssues = await db.select().from(deviceIssues);
      res.json(allIssues);
    } catch (error) {
      console.error("Fehler beim Abrufen der Probleme:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.post("/api/superadmin/device-issues", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { description, deviceType, isGlobal } = req.body;
      
      if (!description || !deviceType) {
        return res.status(400).json({ error: "Beschreibung und Gerätetyp sind erforderlich" });
      }
      
      const [newIssue] = await db.insert(deviceIssues).values({
        description,
        deviceType,
        isGlobal: isGlobal === false ? false : true,
        createdAt: new Date().toISOString(),
      }).returning();
      
      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Fehler beim Erstellen des Problems:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.patch("/api/superadmin/device-issues/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { description, deviceType, isGlobal } = req.body;
      
      if (!description || !deviceType) {
        return res.status(400).json({ error: "Beschreibung und Gerätetyp sind erforderlich" });
      }
      
      const [updatedIssue] = await db.update(deviceIssues)
        .set({
          description,
          deviceType,
          isGlobal: isGlobal === false ? false : true,
        })
        .where(eq(deviceIssues.id, parseInt(id)))
        .returning();
      
      if (!updatedIssue) {
        return res.status(404).json({ error: "Problem nicht gefunden" });
      }
      
      res.json(updatedIssue);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Problems:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });

  app.delete("/api/superadmin/device-issues/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [deletedIssue] = await db.delete(deviceIssues)
        .where(eq(deviceIssues.id, parseInt(id)))
        .returning();
      
      if (!deletedIssue) {
        return res.status(404).json({ error: "Problem nicht gefunden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen des Problems:", error);
      res.status(500).json({ error: "Ein Datenbankfehler ist aufgetreten" });
    }
  });
}
