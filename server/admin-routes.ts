import { Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage";
import { ZodError } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { deviceIssues, insertDeviceIssueSchema, userDeviceTypes, userBrands, userModelSeries, userModels } from "@shared/schema";
import { eq, and } from "drizzle-orm";
// CSV-Bibliotheken werden nicht mehr benötigt, da wir JSON verwenden

// Helper-Funktion für das Passwort-Hashing
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Middleware zum Prüfen, ob der Benutzer ein Administrator ist
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Nicht angemeldet" });
  }
  
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Keine Administratorrechte" });
  }
  
  next();
}

export function registerAdminRoutes(app: Express) {
  //==========================================================================
  // FEHLERBESCHREIBUNGEN (DEVICE ISSUES) ROUTES - Nur für Admin (Bugi)
  //==========================================================================
  // Alle Fehlerbeschreibungen abrufen (gruppiert nach Geräteart)
  app.get("/api/admin/device-issues", isAdmin, async (req: Request, res: Response) => {
    try {
      // Alle Fehlerbeschreibungen aus der Datenbank abrufen
      const allIssues = await db.select().from(deviceIssues);
      // Nach Gerätetyp und Beschreibung sortieren
      allIssues.sort((a, b) => {
        if (a.deviceType !== b.deviceType) {
          return a.deviceType.localeCompare(b.deviceType);
        }
        return a.description.localeCompare(b.description);
      });
      
      // Nach Gerätetyp gruppieren für bessere Frontend-Darstellung
      const issuesByDeviceType: {[key: string]: any[]} = {};
      
      allIssues.forEach(issue => {
        if (!issuesByDeviceType[issue.deviceType]) {
          issuesByDeviceType[issue.deviceType] = [];
        }
        issuesByDeviceType[issue.deviceType].push(issue);
      });
      
      res.json(issuesByDeviceType);
    } catch (error) {
      console.error("Error retrieving device issues:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  // Fehlerbeschreibungen für einen bestimmten Gerätetyp abrufen
  app.get("/api/admin/device-issues/:deviceType", isAdmin, async (req: Request, res: Response) => {
    try {
      const deviceType = req.params.deviceType;
      
      // Alle Fehlerbeschreibungen für diesen Gerätetyp abrufen
      const issues = await db.select().from(deviceIssues)
        .where(eq(deviceIssues.deviceType, deviceType));
      
      // Sortieren nach Beschreibung
      issues.sort((a, b) => a.description.localeCompare(b.description));
      
      res.json(issues);
    } catch (error) {
      console.error("Error retrieving device issues for type:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  // Fehlerbeschreibung erstellen
  app.post("/api/admin/device-issues", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf Fehlerbeschreibungen erstellen (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Fehlerbeschreibungen erstellen" });
      }
      
      const issueData = insertDeviceIssueSchema.parse(req.body);
      
      // Prüfen, ob die Fehlerbeschreibung bereits existiert
      const existingIssue = await db.select().from(deviceIssues)
        .where(and(
          eq(deviceIssues.description, issueData.description),
          eq(deviceIssues.deviceType, issueData.deviceType)
        ));
      
      if (existingIssue.length > 0) {
        return res.status(400).json({ message: "Diese Fehlerbeschreibung existiert bereits für diesen Gerätetyp" });
      }
      
      // Fehlerbeschreibung in der Datenbank speichern
      const [newIssue] = await db.insert(deviceIssues).values(issueData).returning();
      
      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Error creating device issue:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Fehlerbeschreibungsdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Erstellen der Fehlerbeschreibung" });
    }
  });
  
  // Fehlerbeschreibung aktualisieren
  app.patch("/api/admin/device-issues/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf Fehlerbeschreibungen aktualisieren (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Fehlerbeschreibungen aktualisieren" });
      }
      
      const id = parseInt(req.params.id);
      const issueData = insertDeviceIssueSchema.partial().parse(req.body);
      
      // Prüfen, ob die Fehlerbeschreibung existiert
      const [existingIssue] = await db.select().from(deviceIssues).where(eq(deviceIssues.id, id));
      
      if (!existingIssue) {
        return res.status(404).json({ message: "Fehlerbeschreibung nicht gefunden" });
      }
      
      // Fehlerbeschreibung aktualisieren
      const [updatedIssue] = await db.update(deviceIssues)
        .set({
          ...issueData,
          updatedAt: new Date()
        })
        .where(eq(deviceIssues.id, id))
        .returning();
      
      res.json(updatedIssue);
    } catch (error) {
      console.error("Error updating device issue:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Fehlerbeschreibungsdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Aktualisieren der Fehlerbeschreibung" });
    }
  });
  
  // Fehlerbeschreibung löschen
  app.delete("/api/admin/device-issues/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf Fehlerbeschreibungen löschen (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Fehlerbeschreibungen löschen" });
      }
      
      const id = parseInt(req.params.id);
      
      // Prüfen, ob die Fehlerbeschreibung existiert
      const [existingIssue] = await db.select().from(deviceIssues).where(eq(deviceIssues.id, id));
      
      if (!existingIssue) {
        return res.status(404).json({ message: "Fehlerbeschreibung nicht gefunden" });
      }
      
      // Fehlerbeschreibung löschen
      await db.delete(deviceIssues).where(eq(deviceIssues.id, id));
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting device issue:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Fehlerbeschreibung" });
    }
  });
  
  // Öffentlicher Endpunkt für alle Benutzer, um Fehlerbeschreibungen für einen bestimmten Gerätetyp abzurufen
  app.get("/api/device-issues/:deviceType", async (req: Request, res: Response) => {
    try {
      const deviceType = req.params.deviceType;
      
      // Alle Fehlerbeschreibungen für diesen Gerätetyp abrufen
      const issues = await db.select().from(deviceIssues)
        .where(eq(deviceIssues.deviceType, deviceType));
      
      // Sortieren nach Beschreibung
      issues.sort((a, b) => a.description.localeCompare(b.description));
      
      // Nur die description zurückgeben für einfache Verwendung
      const issueDescriptions = issues.map(issue => issue.description);
      
      res.json(issueDescriptions);
    } catch (error) {
      console.error("Error retrieving device issues for type:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  //==========================================================================
  // EXPORT/IMPORT ROUTEN
  //==========================================================================
  // Alle Gerätetypen, Marken, Modellreihen und Modelle als CSV exportieren
  app.get("/api/admin/device-management/export", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf exportieren (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Gerätedaten exportieren" });
      }
      
      // Alle Gerätetypen abrufen
      const allDeviceTypes = await db.select().from(userDeviceTypes);
      // Alle Marken abrufen
      const allBrands = await db.select().from(userBrands);
      // Alle Modellreihen abrufen
      const allModelSeries = await db.select().from(userModelSeries);
      // Alle Modelle abrufen
      const allModels = await db.select().from(userModels);
      
      // Daten als JSON-Datei vorbereiten (kein CSV, da die Struktur zu komplex ist)
      const jsonData = {
        deviceTypes: allDeviceTypes,
        brands: allBrands,
        modelSeries: allModelSeries,
        models: allModels
      };
      
      // JSON-String erzeugen
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      // Datei zum Download bereitstellen
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=device-management-data.json');
      res.send(jsonString);
    } catch (error) {
      console.error("Error exporting device data:", error);
      res.status(500).json({ message: "Fehler beim Exportieren der Gerätedaten" });
    }
  });
  
  // Gerätetypen, Marken, Modellreihen und Modelle aus CSV importieren
  app.post("/api/admin/device-management/import", isAdmin, async (req: Request, res: Response) => {
    try {
      // Nur Bugi darf importieren (zusätzliche Prüfung)
      if (!req.user || req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Gerätedaten importieren" });
      }
      
      // JSON-Daten aus der Anfrage auslesen
      const jsonString = req.body.jsonData;
      
      if (!jsonString) {
        return res.status(400).json({ message: "Keine JSON-Daten gefunden" });
      }
      
      let jsonData;
      try {
        // JSON-String parsen
        jsonData = JSON.parse(jsonString);
      } catch (e) {
        return res.status(400).json({ message: "Ungültiges JSON-Format" });
      }
      
      if (!jsonData) {
        return res.status(400).json({ message: "Keine gültigen Daten in der JSON-Datei gefunden" });
      }
      
      // Daten aus dem JSON extrahieren
      const { deviceTypes: importDeviceTypes, brands: importBrands, modelSeries: importModelSeries, models: importModels } = jsonData;
      
      // Statistiken für die Rückmeldung
      const stats = {
        deviceTypes: 0,
        brands: 0,
        modelSeries: 0,
        models: 0
      };
      
      // Gerätetypen importieren
      if (importDeviceTypes && importDeviceTypes.length > 0) {
        for (const dt of importDeviceTypes) {
          const { id, ...deviceTypeData } = dt;
          // Prüfen, ob Gerätetyp bereits existiert
          const existingDT = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, deviceTypeData.name));
          
          if (existingDT.length === 0) {
            // Neuen Gerätetyp erstellen
            await db.insert(userDeviceTypes).values(deviceTypeData);
            stats.deviceTypes++;
          }
        }
      }
      
      // Marken importieren
      if (importBrands && importBrands.length > 0) {
        for (const b of importBrands) {
          const { id, ...brandData } = b;
          // Prüfen, ob Marke bereits existiert
          const existingBrand = await db.select().from(userBrands)
            .where(and(
              eq(userBrands.name, brandData.name),
              eq(userBrands.deviceTypeId, brandData.deviceTypeId)
            ));
          
          if (existingBrand.length === 0) {
            // Neue Marke erstellen
            await db.insert(userBrands).values(brandData);
            stats.brands++;
          }
        }
      }
      
      // Modellreihen importieren
      if (importModelSeries && importModelSeries.length > 0) {
        for (const ms of importModelSeries) {
          const { id, ...msData } = ms;
          // Prüfen, ob Modellreihe bereits existiert
          const existingMS = await db.select().from(userModelSeries)
            .where(and(
              eq(userModelSeries.name, msData.name),
              eq(userModelSeries.brandId, msData.brandId)
            ));
          
          if (existingMS.length === 0) {
            // Neue Modellreihe erstellen
            await db.insert(userModelSeries).values(msData);
            stats.modelSeries++;
          }
        }
      }
      
      // Modelle importieren
      if (importModels && importModels.length > 0) {
        for (const m of importModels) {
          const { id, ...modelData } = m;
          // Prüfen, ob Modell bereits existiert
          const existingModel = await db.select().from(userModels)
            .where(and(
              eq(userModels.name, modelData.name),
              eq(userModels.modelSeriesId, modelData.modelSeriesId)
            ));
          
          if (existingModel.length === 0) {
            // Neues Modell erstellen
            await db.insert(userModels).values(modelData);
            stats.models++;
          }
        }
      }
      
      res.json({
        message: "Import erfolgreich abgeschlossen",
        stats: stats
      });
    } catch (error) {
      console.error("Error importing device data:", error);
      res.status(500).json({ message: "Fehler beim Importieren der Gerätedaten" });
    }
  });
  
  //==========================================================================
  // BENUTZERVERWALTUNG ROUTES
  //==========================================================================
  // Admin-Dashboard
  app.get("/api/admin/dashboard", isAdmin, async (req: Request, res: Response) => {
    try {
      // Statistiken über nicht aktivierte Benutzer und andere relevante Daten
      const allUsers = await storage.getAllUsers();
      const pendingUsers = allUsers.filter(user => !user.isActive && !user.isAdmin).length;
      const activeUsers = allUsers.filter(user => user.isActive && !user.isAdmin).length;
      const adminUsers = allUsers.filter(user => user.isAdmin).length;
      
      // Statistiken über Reparaturen
      const stats = await storage.getStats();
      
      res.json({
        users: {
          total: allUsers.length,
          pending: pendingUsers,
          active: activeUsers,
          admin: adminUsers
        },
        repairs: stats
      });
    } catch (error) {
      console.error("Error retrieving admin dashboard stats:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Administrationsdaten" });
    }
  });
  
  // Alle Benutzer abrufen
  app.get("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Entferne Passwörter aus der Antwort
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Benutzer" });
    }
  });
  
  // Einzelnen Benutzer abrufen
  app.get("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Entferne Passwort aus der Antwort
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error retrieving user:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Benutzers" });
    }
  });
  
  // Benutzer aktivieren/deaktivieren
  app.patch("/api/admin/users/:id/activate", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "Der Parameter 'isActive' muss ein boolescher Wert sein" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Verhindere, dass Administratoren deaktiviert werden können
      if (user.isAdmin && !isActive) {
        return res.status(400).json({ message: "Administratoren können nicht deaktiviert werden" });
      }
      
      const updatedUser = await storage.updateUser(id, { isActive });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
      }
      
      // Entferne Passwort aus der Antwort
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error activating/deactivating user:", error);
      res.status(500).json({ message: "Fehler beim Aktivieren/Deaktivieren des Benutzers" });
    }
  });
  
  // Benutzerdetails aktualisieren
  app.patch("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { password, isAdmin, ...updateData } = req.body;
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Nur der Superadmin (bugi) darf Administratorrechte ändern
      if (isAdmin !== undefined && req.user && req.user.username !== 'bugi') {
        return res.status(403).json({ message: "Nur der Hauptadministrator darf Administratorrechte ändern" });
      }
      
      // Aktualisiere Benutzer
      const updatedUser = await storage.updateUser(id, {
        ...updateData,
        ...(isAdmin !== undefined && { isAdmin }),
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
      }
      
      // Wenn ein neues Passwort angegeben wurde, aktualisiere es separat
      if (password && password.trim()) {
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(id, hashedPassword);
      }
      
      // Hole den aktualisierten Benutzer
      const freshUser = await storage.getUser(id);
      if (!freshUser) {
        return res.status(500).json({ message: "Fehler beim Abrufen der aktualisierten Benutzerdaten" });
      }
      
      // Entferne Passwort aus der Antwort
      const { password: _, ...userWithoutPassword } = freshUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Benutzerdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
    }
  });
  
  // Benutzer löschen
  app.delete("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Verhindere, dass Administratoren gelöscht werden
      if (user.isAdmin) {
        return res.status(400).json({ message: "Administratoren können nicht gelöscht werden" });
      }
      
      // Verhindere, dass der eingeloggte Benutzer sich selbst löscht
      if (req.user && user.id === req.user.id) {
        return res.status(400).json({ message: "Sie können Ihren eigenen Benutzer nicht löschen" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
    }
  });
}