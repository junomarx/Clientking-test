import type { Express, Request, Response } from "express";
import { db } from "./db";
import { userDeviceTypes, userBrands, userModels } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

// Konstanten
const SUPERADMIN_USER_ID = 10; // ID des Superadmins (macnphone)

export function registerGlobalDeviceRoutes(app: Express) {
  //==========================================================================
  // ÖFFENTLICHE API FÜR GLOBALE GERÄTEDATEN
  //==========================================================================
  
  /**
   * Alle globalen Gerätetypen abrufen
   * Diese werden vom Superadmin verwaltet und sind für alle Benutzer verfügbar
   */
  app.get("/api/public/global/device-types", async (req: Request, res: Response) => {
    try {
      const deviceTypes = await db.select()
        .from(userDeviceTypes)
        .where(eq(userDeviceTypes.userId, SUPERADMIN_USER_ID));

      console.log(`Globale Gerätetypen abgerufen: ${deviceTypes.length} Einträge gefunden`);
      res.json(deviceTypes);
    } catch (error) {
      console.error("Fehler beim Abrufen der globalen Gerätetypen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der globalen Gerätetypen" });
    }
  });

  /**
   * Alle globalen Marken für einen bestimmten Gerätetyp abrufen
   */
  app.get("/api/public/global/device-types/:typeId/brands", async (req: Request, res: Response) => {
    try {
      const deviceTypeId = parseInt(req.params.typeId);
      
      if (isNaN(deviceTypeId)) {
        return res.status(400).json({ message: "Ungültige Gerätetyp-ID" });
      }

      const brands = await db.select()
        .from(userBrands)
        .where(and(
          eq(userBrands.deviceTypeId, deviceTypeId),
          eq(userBrands.userId, SUPERADMIN_USER_ID)
        ));

      console.log(`Globale Marken für Gerätetyp ${deviceTypeId} abgerufen: ${brands.length} Einträge gefunden`);
      res.json(brands);
    } catch (error) {
      console.error("Fehler beim Abrufen der globalen Marken:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der globalen Marken" });
    }
  });

  /**
   * Alle globalen Modelle für einen bestimmten Hersteller abrufen
   */
  app.get("/api/public/global/device-types/:typeId/brands/:brandId/models", async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.brandId);
      
      if (isNaN(brandId)) {
        return res.status(400).json({ message: "Ungültige Marken-ID" });
      }

      const models = await db.select()
        .from(userModels)
        .where(and(
          eq(userModels.brandId, brandId),
          eq(userModels.userId, SUPERADMIN_USER_ID)
        ));

      console.log(`Globale Modelle für Marke ${brandId} abgerufen: ${models.length} Einträge gefunden`);
      res.json(models);
    } catch (error) {
      console.error("Fehler beim Abrufen der globalen Modelle:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der globalen Modelle" });
    }
  });
}