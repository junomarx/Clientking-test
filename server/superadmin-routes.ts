/**
 * Superadmin-Routen für das Superadmin-Dashboard
 * Zugänglich nur für Benutzer mit Superadmin-Rolle (isSuperadmin = true)
 */

import { Express, Request, Response } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { storage } from "./storage";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users, packages, packageFeatures } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Funktion zum Hashen von Passwörtern für Neuanlage/Änderung von Benutzern
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Registriert alle Superadmin-Routen
 */
export function registerSuperadminRoutes(app: Express) {
  // Superadmin-Dashboard Statistiken
  app.get("/api/superadmin/stats", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Statistiken für das Superadmin-Dashboard
      const [userStats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_users,
          SUM(CASE WHEN is_admin = true THEN 1 ELSE 0 END) as admins,
          COUNT(DISTINCT shop_id) as total_shops
        FROM users
        WHERE is_superadmin = false
      `);
      
      // Statistiken für Reparaturen global
      const [repairStats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total_repairs,
          SUM(CASE WHEN status = 'eingegangen' THEN 1 ELSE 0 END) as received,
          SUM(CASE WHEN status = 'in_reparatur' THEN 1 ELSE 0 END) as in_repair,
          SUM(CASE WHEN status = 'fertig' THEN 1 ELSE 0 END) as ready_for_pickup,
          SUM(CASE WHEN status = 'abgeholt' THEN 1 ELSE 0 END) as completed
        FROM repairs
      `);
      
      // Statistiken für Pakete
      const [packageStats] = await db.execute(sql`
        SELECT
          p.name as package_name,
          COUNT(u.id) as user_count
        FROM packages p
        LEFT JOIN users u ON p.id = u.package_id
        GROUP BY p.name
        ORDER BY user_count DESC
      `);
      
      res.json({
        users: userStats.rows[0],
        repairs: repairStats.rows[0],
        packages: packageStats.rows
      });
    } catch (error) {
      console.error("Error fetching superadmin stats:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Superadmin-Statistiken" });
    }
  });
  
  // Alle Benutzer abrufen (ohne Superadmins)
  app.get("/api/superadmin/users", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Alle Benutzer außer Superadmins abrufen
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.isSuperadmin, false));
      
      // Passwort-Felder entfernen
      const sanitizedUsers = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error retrieving users for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Benutzer" });
    }
  });
  
  // Einen Benutzer abrufen
  app.get("/api/superadmin/users/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Prüfen, ob der Benutzer ein Superadmin ist (diese dürfen nicht bearbeitet werden)
      if (user.isSuperadmin) {
        return res.status(403).json({ message: "Superadmin-Benutzer können nicht bearbeitet werden" });
      }
      
      // Passwort aus der Antwort entfernen
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error retrieving specific user for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Benutzers" });
    }
  });
  
  // Einen Benutzer aktualisieren
  app.patch("/api/superadmin/users/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Benutzer aus der Datenbank abrufen
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Prüfen, ob der Benutzer ein Superadmin ist (diese dürfen nicht bearbeitet werden)
      if (existingUser.isSuperadmin) {
        return res.status(403).json({ message: "Superadmin-Benutzer können nicht bearbeitet werden" });
      }
      
      // Wenn ein Passwort gesetzt werden soll, dieses hashen
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      // Benutzer aktualisieren
      const updatedUser = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, userId))
        .returning();
      
      // Passwort aus der Antwort entfernen
      const { password, ...userWithoutPassword } = updatedUser[0];
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
    }
  });
  
  // Einen Benutzer als aktiv markieren
  app.patch("/api/superadmin/users/:id/activate", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Benutzer aus der Datenbank abrufen
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Prüfen, ob der Benutzer ein Superadmin ist (diese dürfen nicht bearbeitet werden)
      if (existingUser.isSuperadmin) {
        return res.status(403).json({ message: "Superadmin-Benutzer können nicht bearbeitet werden" });
      }
      
      // Benutzer aktivieren
      const updatedUser = await db
        .update(users)
        .set({ isActive: true })
        .where(eq(users.id, userId))
        .returning();
      
      // Passwort aus der Antwort entfernen
      const { password, ...userWithoutPassword } = updatedUser[0];
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error activating user for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Aktivieren des Benutzers" });
    }
  });
  
  // Einen Benutzer löschen
  app.delete("/api/superadmin/users/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Benutzer aus der Datenbank abrufen
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Prüfen, ob der Benutzer ein Superadmin ist (diese dürfen nicht gelöscht werden)
      if (existingUser.isSuperadmin) {
        return res.status(403).json({ message: "Superadmin-Benutzer können nicht gelöscht werden" });
      }
      
      // Benutzer löschen
      await db
        .delete(users)
        .where(eq(users.id, userId));
      
      res.json({ message: "Benutzer erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting user for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
    }
  });
  
  // Pakete abrufen
  app.get("/api/superadmin/packages", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allPackages = await db
        .select()
        .from(packages);
      
      res.json(allPackages);
    } catch (error) {
      console.error("Error retrieving packages for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Pakete" });
    }
  });
  
  // Ein Paket abrufen
  app.get("/api/superadmin/packages/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      
      const [packageData] = await db
        .select()
        .from(packages)
        .where(eq(packages.id, packageId));
      
      if (!packageData) {
        return res.status(404).json({ message: "Paket nicht gefunden" });
      }
      
      // Features für das Paket abrufen
      const packageFeaturesList = await db
        .select()
        .from(packageFeatures)
        .where(eq(packageFeatures.packageId, packageId));
      
      res.json({
        ...packageData,
        features: packageFeaturesList
      });
    } catch (error) {
      console.error("Error retrieving specific package for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Pakets" });
    }
  });
  
  // Ein Paket aktualisieren
  app.patch("/api/superadmin/packages/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      const packageData = req.body;
      const featuresToUpdate = packageData.features;
      
      // Wir entfernen das features-Feld, da es nicht direkt in die Tabelle gehört
      delete packageData.features;
      
      // Paket aktualisieren
      const updatedPackage = await db
        .update(packages)
        .set(packageData)
        .where(eq(packages.id, packageId))
        .returning();
      
      // Wenn Features angegeben wurden, diese aktualisieren
      if (featuresToUpdate && Array.isArray(featuresToUpdate)) {
        // Bestehende Features löschen
        await db
          .delete(packageFeatures)
          .where(eq(packageFeatures.packageId, packageId));
        
        // Neue Features hinzufügen
        const newFeatures = [];
        for (const feature of featuresToUpdate) {
          const [newFeature] = await db
            .insert(packageFeatures)
            .values({
              packageId: packageId,
              feature: feature.feature,
              value: feature.value
            })
            .returning();
          
          newFeatures.push(newFeature);
        }
        
        res.json({
          ...updatedPackage[0],
          features: newFeatures
        });
      } else {
        // Features für das Paket abrufen
        const packageFeaturesList = await db
          .select()
          .from(packageFeatures)
          .where(eq(packageFeatures.packageId, packageId));
        
        res.json({
          ...updatedPackage[0],
          features: packageFeaturesList
        });
      }
    } catch (error) {
      console.error("Error updating package for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Pakets" });
    }
  });
  
  // Ein neues Paket erstellen
  app.post("/api/superadmin/packages", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const packageData = req.body;
      const featuresToAdd = packageData.features;
      
      // Wir entfernen das features-Feld, da es nicht direkt in die Tabelle gehört
      delete packageData.features;
      
      // Paket erstellen
      const [newPackage] = await db
        .insert(packages)
        .values(packageData)
        .returning();
      
      // Wenn Features angegeben wurden, diese hinzufügen
      if (featuresToAdd && Array.isArray(featuresToAdd) && featuresToAdd.length > 0) {
        const newFeatures = [];
        for (const feature of featuresToAdd) {
          const [newFeature] = await db
            .insert(packageFeatures)
            .values({
              packageId: newPackage.id,
              feature: feature.feature,
              value: feature.value
            })
            .returning();
          
          newFeatures.push(newFeature);
        }
        
        res.status(201).json({
          ...newPackage,
          features: newFeatures
        });
      } else {
        res.status(201).json({
          ...newPackage,
          features: []
        });
      }
    } catch (error) {
      console.error("Error creating package for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Pakets" });
    }
  });
  
  // Ein Paket löschen
  app.delete("/api/superadmin/packages/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      
      // Prüfen, ob es Benutzer gibt, die diesem Paket zugeordnet sind
      const assignedUsers = await db
        .select()
        .from(users)
        .where(eq(users.packageId, packageId));
      
      if (assignedUsers.length > 0) {
        return res.status(400).json({ message: `Dieses Paket kann nicht gelöscht werden, da es ${assignedUsers.length} Benutzern zugeordnet ist.` });
      }
      
      // Zuerst alle Features dieses Pakets löschen
      await db
        .delete(packageFeatures)
        .where(eq(packageFeatures.packageId, packageId));
      
      // Dann das Paket selbst löschen
      await db
        .delete(packages)
        .where(eq(packages.id, packageId));
      
      res.json({ message: "Paket erfolgreich gelöscht" });
    } catch (error) {
      console.error("Error deleting package for superadmin:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Pakets" });
    }
  });
}