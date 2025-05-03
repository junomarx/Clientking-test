/**
 * Logo-Upload-Funktionalität für die Handyshop-Verwaltung
 */
import { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BusinessSettings, businessSettings } from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';

// Speicher-Konfiguration für Multer
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    // Stelle sicher, dass das Verzeichnis existiert
    if (!fs.existsSync('./static/uploads')) {
      fs.mkdirSync('./static/uploads', { recursive: true });
    }
    cb(null, './static/uploads');
  },
  filename: function (req, _file, cb) {
    // Verwende die Benutzer-ID als Teil des Dateinamens für Isolierung
    const userId = req.user?.id || 'unknown';
    cb(null, `firmenlogo_${userId}.png`);
  }
});

// Filter-Funktion, um nur Bilder zu akzeptieren
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilder (JPEG, PNG, GIF, WEBP) sind erlaubt!'));
  }
};

// Multer-Upload-Konfiguration
const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximale Dateigröße
  }
});

// Pfad für statische Dateien
const logoUrlBase = '/uploads';

export function registerLogoRoutes(app: Express) {
  // Stelle sicher, dass statische Dateien serviert werden
  app.use('/uploads', (req, res, next) => {
    // Entferne 'uploads/' vom Anfang des Pfades, um zum lokalen Pfad zu gelangen
    const filePath = path.join('./static/uploads', req.url);
    // Überprüfe, ob die Datei existiert
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      next(); // Weiter zur nächsten Middleware, wenn die Datei nicht existiert
    }
  });

  // Route zum Hochladen des Logos
  app.post('/api/business-settings/logo', upload.single('logo'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen' });
    }

    try {
      // Generiere die URL für das Logo
      const logoUrl = `${logoUrlBase}/firmenlogo_${req.user.id}.png`;

      // Aktualisiere die Business-Settings mit der Logo-URL
      // In future, we could reintroduce the logoUrl field to the businessSettings table
      // For now, just return the URL

      return res.status(200).json({ 
        success: true, 
        message: 'Logo erfolgreich hochgeladen', 
        logoUrl: logoUrl 
      });
    } catch (error) {
      console.error('Fehler beim Speichern der Logo-URL:', error);
      return res.status(500).json({ success: false, message: 'Interner Serverfehler' });
    }
  });

  // Route zum Abrufen des Logos
  app.get('/api/business-settings/logo', (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }

    const logoPath = path.join('./static/uploads', `firmenlogo_${req.user.id}.png`);
    
    if (fs.existsSync(logoPath)) {
      const logoUrl = `${logoUrlBase}/firmenlogo_${req.user.id}.png`;
      return res.status(200).json({ 
        success: true, 
        logoUrl: logoUrl 
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        message: 'Kein Logo gefunden' 
      });
    }
  });

  // Route zum Löschen des Logos
  app.delete('/api/business-settings/logo', (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }

    const logoPath = path.join('./static/uploads', `firmenlogo_${req.user.id}.png`);
    
    if (fs.existsSync(logoPath)) {
      try {
        fs.unlinkSync(logoPath);
        return res.status(200).json({ success: true, message: 'Logo erfolgreich gelöscht' });
      } catch (error) {
        console.error('Fehler beim Löschen des Logos:', error);
        return res.status(500).json({ success: false, message: 'Interner Serverfehler' });
      }
    } else {
      return res.status(404).json({ success: false, message: 'Kein Logo gefunden' });
    }
  });
}
