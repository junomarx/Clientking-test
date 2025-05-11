import express from 'express';
import { storage } from './storage';
import { db } from './db';
import { errorCatalogEntries } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Registrierung der globalen Gerätedata-Routen, die öffentlich zugänglich sind
export function registerGlobalDeviceRoutes(app: express.Express) {
  // Endpoint: Alle Gerätetypen abrufen
  app.get('/api/global/device-types', async (req, res) => {
    try {
      const deviceTypes = await storage.getGlobalDeviceTypes();
      res.json(deviceTypes);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Gerätetypen:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der globalen Gerätetypen' });
    }
  });

  // Endpoint: Alle Marken abrufen, mit optionalem Filter nach deviceTypeId
  app.get('/api/global/brands', async (req, res) => {
    try {
      const deviceTypeId = req.query.deviceTypeId ? parseInt(req.query.deviceTypeId as string) : null;
      
      if (deviceTypeId) {
        console.log(`Marken für Gerätetyp ${deviceTypeId} über Query-Parameter angefordert`);
        const brands = await storage.getGlobalBrandsByDeviceType(deviceTypeId);
        console.log(`${brands.length} Marken für Gerätetyp ${deviceTypeId} gefunden`);
        return res.json(brands);
      } else {
        const brands = await storage.getGlobalBrands();
        console.log(`Alle ${brands.length} globalen Marken abgerufen`);
        return res.json(brands);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Marken:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der globalen Marken' });
    }
  });

  // Endpoint: Alle Marken für einen bestimmten Gerätetyp abrufen
  app.get('/api/global/brands/by-device-type/:deviceTypeId', async (req, res) => {
    try {
      const deviceTypeId = parseInt(req.params.deviceTypeId);
      if (isNaN(deviceTypeId)) {
        return res.status(400).json({ message: 'Ungültige Gerätetyp-ID' });
      }
      
      const brands = await storage.getGlobalBrandsByDeviceType(deviceTypeId);
      console.log(`Marken für Gerätetyp ${deviceTypeId} abgerufen:`, brands.length);
      res.json(brands);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Marken nach Gerätetyp:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der globalen Marken nach Gerätetyp' });
    }
  });
  
  // Der obere Endpunkt '/api/global/brands' übernimmt bereits die Funktionalität mit Query-Parametern

  // Endpoint: Alle Modelle abrufen
  app.get('/api/global/models', async (req, res) => {
    try {
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string) : null;
      const deviceTypeId = req.query.deviceTypeId ? parseInt(req.query.deviceTypeId as string) : null;
      
      if (brandId && deviceTypeId) {
        console.log(`Modelle für Marke ${brandId} und Gerätetyp ${deviceTypeId} über Query-Parameter angefordert`);
        const models = await storage.getGlobalModelsByBrandAndDeviceType(brandId, deviceTypeId);
        console.log(`${models.length} Modelle für Marke ${brandId} und Gerätetyp ${deviceTypeId} gefunden`);
        return res.json(models);
      } else if (brandId) {
        console.log(`Modelle für Marke ${brandId} über Query-Parameter angefordert`);
        const models = await storage.getGlobalModelsByBrand(brandId);
        console.log(`${models.length} Modelle für Marke ${brandId} gefunden`);
        return res.json(models);
      } else {
        const models = await storage.getGlobalModels();
        console.log(`Alle ${models.length} globalen Modelle abgerufen`);
        return res.json(models);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Modelle:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der globalen Modelle' });
    }
  });

  // Endpoint: Alle Modelle für eine bestimmte Marke abrufen
  app.get('/api/global/models/by-brand/:brandId', async (req, res) => {
    try {
      const brandId = parseInt(req.params.brandId);
      if (isNaN(brandId)) {
        return res.status(400).json({ message: 'Ungültige Marken-ID' });
      }
      
      const models = await storage.getGlobalModelsByBrand(brandId);
      res.json(models);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Modelle nach Marke:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der globalen Modelle nach Marke' });
    }
  });

  // Endpoint: Alle Einträge im Fehlerkatalog abrufen
  app.get('/api/global/error-catalog', async (req, res) => {
    try {
      console.log('Abrufen des globalen Fehlerkatalogs');
      
      // Alle Fehlereinträge vom Superadmin (shopId = 1682) abrufen
      const entries = await db
        .select()
        .from(errorCatalogEntries)
        .orderBy(errorCatalogEntries.errorText);
      
      console.log(`${entries.length} Einträge im globalen Fehlerkatalog gefunden`);
      res.json(entries);
    } catch (error) {
      console.error('Fehler beim Abrufen des globalen Fehlerkatalogs:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen des globalen Fehlerkatalogs' });
    }
  });
  
  // Endpoint: Fehlereinträge für einen bestimmten Gerätetyp abrufen
  app.get('/api/global/error-catalog/:deviceType', async (req, res) => {
    try {
      const deviceType = req.params.deviceType;
      
      if (!deviceType) {
        return res.status(400).json({ message: 'Ungültiger Gerätetyp' });
      }
      
      // Bestimmung der Spalte basierend auf dem Gerätetyp
      const deviceTypeColumnMap: { [key: string]: string } = {
        'smartphone': 'forSmartphone',
        'tablet': 'forTablet',
        'laptop': 'forLaptop',
        'watch': 'forSmartwatch',
        'smartwatch': 'forSmartwatch',
        'spielekonsole': 'forGameconsole',
        'gameconsole': 'forGameconsole'
      };
      
      const columnName = deviceTypeColumnMap[deviceType.toLowerCase()];
      
      if (!columnName) {
        return res.status(400).json({ message: 'Unbekannter Gerätetyp' });
      }
      
      // Dynamisches Filtern basierend auf dem Gerätetyp
      const entries = await db.query.errorCatalogEntries.findMany({
        where: (entries, { eq }) => {
          if (columnName === 'forSmartphone') {
            return eq(entries.forSmartphone, true);
          } else if (columnName === 'forTablet') {
            return eq(entries.forTablet, true);
          } else if (columnName === 'forLaptop') {
            return eq(entries.forLaptop, true);
          } else if (columnName === 'forSmartwatch') {
            return eq(entries.forSmartwatch, true);
          } else if (columnName === 'forGameconsole') {
            return eq(entries.forGameconsole, true);
          }
          // Fallback auf Smartphone
          return eq(entries.forSmartphone, true);
        },
        orderBy: (entries, { asc }) => [asc(entries.errorText)]
      });
      
      console.log(`${entries.length} Fehlereinträge für Gerätetyp ${deviceType} gefunden`);
      res.json(entries);
    } catch (error) {
      console.error(`Fehler beim Abrufen der Fehlereinträge für Gerätetyp:`, error);
      res.status(500).json({ message: 'Fehler beim Abrufen der Fehlereinträge für Gerätetyp' });
    }
  });
}