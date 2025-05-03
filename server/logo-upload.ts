/**
 * Logo-Upload-Funktionalität für die Handyshop-Verwaltung
 */
import { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from './db';

// Konfiguration des Speicherorts für hochgeladene Logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Erstelle den Upload-Ordner, falls er nicht existiert
    const uploadDir = path.join(__dirname, '../static/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Verwendung eines festen Dateinamens für jedes Benutzer-Logo
    // Das überschreibt vorherige Logos des Benutzers automatisch
    cb(null, 'firmenlogo.png');
  }
});

// Filter für Dateitypen
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Akzeptiere nur Bildformate
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilddateien sind erlaubt'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  }
});

export function registerLogoRoutes(app: Express) {
  // Hochladen eines Logos
  app.post('/api/business-settings/logo', upload.single('logo'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen' });
      }

      // Erfolgreiche Antwort mit Logo-URL
      const logoUrl = `/static/uploads/firmenlogo.png`;
      return res.status(200).json({
        success: true,
        message: 'Logo erfolgreich hochgeladen',
        logoUrl
      });
    } catch (error) {
      console.error('Fehler beim Hochladen des Logos:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Hochladen'
      });
    }
  });

  // Abrufen des aktuellen Logos
  app.get('/api/business-settings/logo', (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
      }

      const logoPath = path.join(__dirname, '../static/uploads/firmenlogo.png');
      
      // Prüfen, ob das Logo existiert
      if (fs.existsSync(logoPath)) {
        const logoUrl = `/static/uploads/firmenlogo.png`;
        return res.status(200).json({
          success: true,
          message: 'Logo gefunden',
          logoUrl
        });
      } else {
        // Kein Logo gefunden
        return res.status(200).json({
          success: false,
          message: 'Kein Logo vorhanden'
        });
      }
    } catch (error) {
      console.error('Fehler beim Abrufen des Logos:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Abrufen des Logos'
      });
    }
  });

  // Löschen des Logos
  app.delete('/api/business-settings/logo', (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
      }

      const logoPath = path.join(__dirname, '../static/uploads/firmenlogo.png');
      
      // Prüfen, ob das Logo existiert und löschen
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
        return res.status(200).json({
          success: true,
          message: 'Logo erfolgreich gelöscht'
        });
      } else {
        // Kein Logo zum Löschen gefunden
        return res.status(404).json({
          success: false,
          message: 'Kein Logo zum Löschen gefunden'
        });
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Logos:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen des Logos'
      });
    }
  });
}
