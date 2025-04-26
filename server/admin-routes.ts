import { Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage";
import { ZodError } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { insertDeviceTypeSchema, insertBrandSchema } from "@shared/schema";

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
  // GERÄTEVERWALTUNG ROUTES
  //==========================================================================
  
  // Alle Gerätearten abrufen
  app.get("/api/admin/device-types", isAdmin, async (req: Request, res: Response) => {
    try {
      const deviceTypes = await storage.getAllDeviceTypes();
      res.json(deviceTypes);
    } catch (error) {
      console.error("Error retrieving device types:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätearten" });
    }
  });
  
  // Einzelne Geräteart abrufen
  app.get("/api/admin/device-types/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deviceType = await storage.getDeviceType(id);
      
      if (!deviceType) {
        return res.status(404).json({ message: "Geräteart nicht gefunden" });
      }
      
      res.json(deviceType);
    } catch (error) {
      console.error("Error retrieving device type:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Geräteart" });
    }
  });
  
  // Neue Geräteart erstellen
  app.post("/api/admin/device-types", isAdmin, async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Name muss angegeben werden" });
      }
      
      const newDeviceType = await storage.createDeviceType({ name });
      res.status(201).json(newDeviceType);
    } catch (error) {
      console.error("Error creating device type:", error);
      
      // Prüfe auf Unique-Constraint-Verletzung
      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(400).json({ message: "Eine Geräteart mit diesem Namen existiert bereits" });
      }
      
      res.status(500).json({ message: "Fehler beim Erstellen der Geräteart" });
    }
  });
  
  // Geräteart aktualisieren
  app.patch("/api/admin/device-types/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Name muss angegeben werden" });
      }
      
      const deviceType = await storage.getDeviceType(id);
      
      if (!deviceType) {
        return res.status(404).json({ message: "Geräteart nicht gefunden" });
      }
      
      const updatedDeviceType = await storage.updateDeviceType(id, { name });
      
      if (!updatedDeviceType) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren der Geräteart" });
      }
      
      res.json(updatedDeviceType);
    } catch (error) {
      console.error("Error updating device type:", error);
      
      // Prüfe auf Unique-Constraint-Verletzung
      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(400).json({ message: "Eine Geräteart mit diesem Namen existiert bereits" });
      }
      
      res.status(500).json({ message: "Fehler beim Aktualisieren der Geräteart" });
    }
  });
  
  // Geräteart löschen
  app.delete("/api/admin/device-types/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const deviceType = await storage.getDeviceType(id);
      
      if (!deviceType) {
        return res.status(404).json({ message: "Geräteart nicht gefunden" });
      }
      
      const deleted = await storage.deleteDeviceType(id);
      
      if (!deleted) {
        return res.status(400).json({ 
          message: "Die Geräteart kann nicht gelöscht werden, da sie noch von Marken verwendet wird" 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting device type:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Geräteart" });
    }
  });
  
  // Alle Marken abrufen
  app.get("/api/admin/brands", isAdmin, async (req: Request, res: Response) => {
    try {
      const deviceTypeId = req.query.deviceTypeId ? parseInt(req.query.deviceTypeId as string) : undefined;
      const brands = await storage.getAllBrands(deviceTypeId);
      res.json(brands);
    } catch (error) {
      console.error("Error retrieving brands:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Marken" });
    }
  });
  
  // Einzelne Marke abrufen
  app.get("/api/admin/brands/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const brand = await storage.getBrand(id);
      
      if (!brand) {
        return res.status(404).json({ message: "Marke nicht gefunden" });
      }
      
      res.json(brand);
    } catch (error) {
      console.error("Error retrieving brand:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Marke" });
    }
  });
  
  // Neue Marke erstellen
  app.post("/api/admin/brands", isAdmin, async (req: Request, res: Response) => {
    try {
      const { name, deviceTypeId } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Name muss angegeben werden" });
      }
      
      if (!deviceTypeId || typeof deviceTypeId !== 'number') {
        return res.status(400).json({ message: "Geräteart-ID muss angegeben werden" });
      }
      
      // Prüfe, ob die angegebene Geräteart existiert
      const deviceType = await storage.getDeviceType(deviceTypeId);
      
      if (!deviceType) {
        return res.status(400).json({ message: "Die angegebene Geräteart existiert nicht" });
      }
      
      const newBrand = await storage.createBrand({ name, deviceTypeId });
      res.status(201).json(newBrand);
    } catch (error) {
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Marke" });
    }
  });
  
  // Marke aktualisieren
  app.patch("/api/admin/brands/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, deviceTypeId } = req.body;
      
      if ((name && (typeof name !== 'string' || name.trim() === '')) ||
          (deviceTypeId && typeof deviceTypeId !== 'number')) {
        return res.status(400).json({ message: "Ungültige Daten für die Aktualisierung" });
      }
      
      const brand = await storage.getBrand(id);
      
      if (!brand) {
        return res.status(404).json({ message: "Marke nicht gefunden" });
      }
      
      // Prüfe, ob die angegebene Geräteart existiert, falls eine neue angegeben wurde
      if (deviceTypeId) {
        const deviceType = await storage.getDeviceType(deviceTypeId);
        
        if (!deviceType) {
          return res.status(400).json({ message: "Die angegebene Geräteart existiert nicht" });
        }
      }
      
      const updatedBrand = await storage.updateBrand(id, { 
        ...(name && { name }), 
        ...(deviceTypeId && { deviceTypeId }) 
      });
      
      if (!updatedBrand) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren der Marke" });
      }
      
      res.json(updatedBrand);
    } catch (error) {
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren der Marke" });
    }
  });
  
  // Marke löschen
  app.delete("/api/admin/brands/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      const brand = await storage.getBrand(id);
      
      if (!brand) {
        return res.status(404).json({ message: "Marke nicht gefunden" });
      }
      
      const deleted = await storage.deleteBrand(id);
      
      if (!deleted) {
        return res.status(400).json({ 
          message: "Die Marke kann nicht gelöscht werden" 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Marke" });
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