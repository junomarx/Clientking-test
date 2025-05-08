import express from 'express';
import { storage } from './storage';

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

  // Endpoint: Alle Marken abrufen
  app.get('/api/global/brands', async (req, res) => {
    try {
      const brands = await storage.getGlobalBrands();
      res.json(brands);
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
      res.json(brands);
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Marken nach Gerätetyp:', error);
      res.status(500).json({ message: 'Fehler beim Abrufen der globalen Marken nach Gerätetyp' });
    }
  });

  // Endpoint: Alle Modelle abrufen
  app.get('/api/global/models', async (req, res) => {
    try {
      const models = await storage.getGlobalModels();
      res.json(models);
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
}