/**
 * Superadmin-Routen für die globale Systemverwaltung durch den Superadmin-Benutzer
 */

import { Express, Request, Response } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { storage } from "./storage";
import { count, eq, and, or, sql } from "drizzle-orm";
import { 
  users, packages, packageFeatures, shops, 
  customers, repairs, userDeviceTypes, userBrands, userModels, 
  deviceIssues, insertDeviceIssueSchema, hiddenStandardDeviceTypes
} from "@shared/schema";
import { ZodError } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Passwort-Hash-Funktion (gleich wie in auth.ts)
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Fügt alle Superadmin-Routen zur Express-App hinzu
 * Diese Routen sind nur für Superadmin-Benutzer zugänglich
 */
export function registerSuperadminRoutes(app: Express) {
  // Superadmin Dashboard Statistiken
  app.get("/api/superadmin/stats", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Benutzerstatistiken - wir zählen alle Benutzer und berechnen aktive/inaktive manuell
      const [totalUserCount] = await db.select({
        totalUsers: count().as("total_users"), 
      }).from(users);
      
      const [activeUserCount] = await db.select({
        activeUsers: count().as("active_users"),
      }).from(users).where(eq(users.isActive, true));
      
      const [inactiveUserCount] = await db.select({
        inactiveUsers: count().as("inactive_users"),
      }).from(users).where(eq(users.isActive, false));
      
      const userStats = {
        totalUsers: totalUserCount.totalUsers,
        activeUsers: activeUserCount.activeUsers,
        inactiveUsers: inactiveUserCount.inactiveUsers
      };

      // Paketstatistiken
      const [packageStats] = await db.select({
        totalPackages: count().as("total_packages"),
      }).from(packages);

      // Shop-Statistiken
      const [shopStats] = await db.select({
        totalShops: sql<string>`COUNT(DISTINCT ${users.shopId})`.as("total_shops"),
      }).from(users);

      // Reparaturstatistiken
      const [repairStats] = await db.select({
        totalRepairs: count().as("total_repairs"),
      }).from(repairs);

      // Bestellungen (hier als Platzhalter, später kann das mit echten Bestellungsdaten gefüllt werden)
      const orderStats = {
        totalOrders: "0",
      };

      // Umsatz (hier als Platzhalter, später kann das mit echten Umsatzdaten gefüllt werden)
      const revenueStats = {
        totalRevenue: "0 €",
      };

      // Die gesammelten Statistiken zurückgeben
      res.json({
        users: {
          totalUsers: userStats.totalUsers.toString(),
          activeUsers: userStats.activeUsers.toString(),
          inactiveUsers: userStats.inactiveUsers.toString(),
        },
        packages: {
          totalPackages: packageStats.totalPackages.toString(),
        },
        shops: {
          totalShops: shopStats.totalShops || "0",
        },
        repairs: {
          totalRepairs: repairStats.totalRepairs.toString(),
        },
        orders: orderStats,
        revenue: revenueStats,
      });
    } catch (error) {
      console.error("Fehler beim Abrufen der Superadmin-Statistiken:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Statistiken" });
    }
  });

  // Benutzerverwaltung
  app.get("/api/superadmin/users", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        isAdmin: users.isAdmin,
        isSuperadmin: users.isSuperadmin,
        shopId: users.shopId,
        packageId: users.packageId,
        createdAt: users.createdAt,
      }).from(users);

      res.json(allUsers);
    } catch (error) {
      console.error("Fehler beim Abrufen der Benutzer:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Benutzer" });
    }
  });

  // Detailinformationen zu einem Benutzer
  app.get("/api/superadmin/users/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Wir entfernen das Passwort aus dem Ergebnis
      const { password, ...userWithoutPassword } = user;

      // Statistiken für den Benutzer abrufen
      const [userStats] = await db.select({
        customerCount: count().as("customer_count"),
      }).from(customers).where(eq(customers.shopId, user.shopId || 0));

      const [repairStats] = await db.select({
        repairCount: count().as("repair_count"),
      }).from(repairs).where(eq(repairs.shopId, user.shopId || 0));

      res.json({
        ...userWithoutPassword,
        stats: {
          customerCount: userStats.customerCount,
          repairCount: repairStats.repairCount,
        },
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Benutzers:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Benutzers" });
    }
  });

  // Benutzer aktualisieren
  app.patch("/api/superadmin/users/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      // Prüfen, ob der Benutzer existiert
      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Daten für das Update vorbereiten
      const updateData: any = {};
      
      // Zulässige Felder zum Aktualisieren
      const allowedFields = ['email', 'isAdmin', 'packageId', 'shopId', 'companyName', 
                            'companyAddress', 'companyVatNumber', 'companyPhone', 'companyEmail'];
      
      // Nur vorhandene Felder aktualisieren
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Passwort separat behandeln, da es gehasht werden muss
      if (req.body.password) {
        const hashedPassword = await hashPassword(req.body.password);
        updateData.password = hashedPassword;
      }

      // Benutzer aktualisieren
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Passwort aus der Antwort entfernen
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Benutzers:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Benutzers" });
    }
  });

  // Benutzer aktivieren/deaktivieren
  app.patch("/api/superadmin/users/:id/activate", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      // Aktuellen Status des Benutzers abrufen
      const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Status umkehren
      const [updatedUser] = await db
        .update(users)
        .set({ isActive: !user.isActive })
        .where(eq(users.id, userId))
        .returning({ id: users.id, isActive: users.isActive });

      res.json(updatedUser);
    } catch (error) {
      console.error("Fehler beim Ändern des Aktivierungsstatus:", error);
      res.status(500).json({ message: "Fehler beim Ändern des Aktivierungsstatus" });
    }
  });

  // Benutzer löschen
  app.delete("/api/superadmin/users/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      // Prüfen, ob der Benutzer existiert
      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Benutzer löschen
      await db.delete(users).where(eq(users.id, userId));

      res.json({ message: "Benutzer erfolgreich gelöscht" });
    } catch (error) {
      console.error("Fehler beim Löschen des Benutzers:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Benutzers" });
    }
  });

  // Paket-Verwaltung
  app.get("/api/superadmin/packages", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allPackages = await db.select().from(packages);
      res.json(allPackages);
    } catch (error) {
      console.error("Fehler beim Abrufen der Pakete:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Pakete" });
    }
  });

  // Details zu einem Paket
  app.get("/api/superadmin/packages/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) {
        return res.status(400).json({ message: "Ungültige Paket-ID" });
      }

      const [packageData] = await db.select().from(packages).where(eq(packages.id, packageId));

      if (!packageData) {
        return res.status(404).json({ message: "Paket nicht gefunden" });
      }

      // Features des Pakets abrufen
      const packageFeaturesList = await db.select().from(packageFeatures)
        .where(eq(packageFeatures.packageId, packageId));

      // Benutzer mit diesem Paket zählen
      const [userCount] = await db.select({
        count: count().as("user_count"),
      }).from(users).where(eq(users.packageId, packageId));

      res.json({
        ...packageData,
        features: packageFeaturesList,
        userCount: userCount.count,
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Pakets:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Pakets" });
    }
  });

  // Shop-Verwaltung
  app.get("/api/superadmin/shops", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Distinct Shop-IDs abrufen und Informationen aggregieren
      const shopData = await db.execute(sql`
        SELECT 
          s.id, 
          s.name, 
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT c.id) as customer_count,
          COUNT(DISTINCT r.id) as repair_count,
          MIN(s.created_at) as created_at
        FROM 
          (SELECT DISTINCT shop_id as id, shop_id as name, created_at FROM users WHERE shop_id IS NOT NULL) s
        LEFT JOIN users u ON s.id = u.shop_id
        LEFT JOIN customers c ON s.id = c.shop_id
        LEFT JOIN repairs r ON s.id = r.shop_id
        GROUP BY s.id, s.name
        ORDER BY s.id
      `);

      // Die Ergebnisse in ein sauberes Format bringen
      const formattedShops = shopData.rows.map((row: any) => ({
        id: Number(row.id),
        name: `Shop ${row.id}`, // Da wir aktuell keine echten Shop-Namen haben, verwenden wir Shop ID
        userCount: Number(row.user_count),
        customerCount: Number(row.customer_count),
        repairCount: Number(row.repair_count),
        createdAt: row.created_at,
      }));

      res.json(formattedShops);
    } catch (error) {
      console.error("Fehler beim Abrufen der Shops:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Shops" });
    }
  });

  // Details zu einem Shop
  app.get("/api/superadmin/shops/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const shopId = parseInt(req.params.id);
      if (isNaN(shopId)) {
        return res.status(400).json({ message: "Ungültige Shop-ID" });
      }

      // Benutzer dieses Shops abrufen
      const shopUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.shopId, shopId));

      // Anzahl der Kunden und Reparaturen für diesen Shop
      const [customerCount] = await db.select({
        count: count().as("customer_count"),
      }).from(customers).where(eq(customers.shopId, shopId));

      const [repairCount] = await db.select({
        count: count().as("repair_count"),
      }).from(repairs).where(eq(repairs.shopId, shopId));

      // Shop-Informationen zurückgeben
      res.json({
        id: shopId,
        name: `Shop ${shopId}`,
        users: shopUsers,
        customerCount: customerCount.count,
        repairCount: repairCount.count,
        // Weitere Shop-Informationen können hier hinzugefügt werden
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Shops:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Shops" });
    }
  });

  // Globale Geräteverwaltung
  app.get("/api/superadmin/device-types", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Standardgerätetypen (unabhängig von Benutzern)
      const standardDeviceTypes = ["smartphone", "tablet", "laptop", "watch"];
      
      // Alle ausgeblendeten Standard-Gerätetypen abrufen
      const hiddenTypes = await db.select({
        name: hiddenStandardDeviceTypes.name
      }).from(hiddenStandardDeviceTypes);
      
      const hiddenTypeNames = hiddenTypes.map(ht => ht.name);
      
      // Filtere die ausgeblendeten Typen aus den Standardtypen heraus
      const visibleStandardTypes = standardDeviceTypes.filter(type => !hiddenTypeNames.includes(type));
      
      // Alle benutzerdefinierten Gerätetypen abrufen
      const customDeviceTypes = await db.select({
        name: userDeviceTypes.name
      }).from(userDeviceTypes);
      
      // Kombiniere sichtbare Standard- und benutzerdefinierte Gerätetypen ohne Duplikate
      const allTypes = [...visibleStandardTypes, ...customDeviceTypes.map(dt => dt.name)];
      const uniqueTypes = Array.from(new Set(allTypes));
      
      res.json(uniqueTypes);
    } catch (error) {
      console.error("Fehler beim Abrufen der Gerätetypen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätetypen" });
    }
  });
  
  // Neuen Gerätetyp hinzufügen
  app.post("/api/superadmin/device-types", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Der Name des Gerätetyps ist erforderlich" });
      }
      
      // Standardgerätetypen abrufen
      const standardDeviceTypes = ["smartphone", "tablet", "laptop", "watch"];
      
      // Prüfen, ob der Gerätetyp bereits existiert (inklusive Standardtypen)
      if (standardDeviceTypes.includes(name.toLowerCase())) {
        return res.status(400).json({ message: "Dieser Gerätetyp existiert bereits als Standardtyp" });
      }
      
      const existingType = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, name));
      
      if (existingType.length > 0) {
        return res.status(400).json({ message: "Dieser Gerätetyp existiert bereits" });
      }
      
      // Neuen Gerätetyp in die Datenbank einfügen
      const userId = (req.user as any).id;
      const [newDeviceType] = await db.insert(userDeviceTypes).values({
        name,
        userId,
        shopId: null, // Globaler Gerätetyp (für alle Shops verfügbar)
      }).returning();
      
      res.status(201).json(newDeviceType);
    } catch (error) {
      console.error("Fehler beim Erstellen des Gerätetyps:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Gerätetyps" });
    }
  });
  
  // Gerätetyp aktualisieren
  app.patch("/api/superadmin/device-types/:name", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const oldName = decodeURIComponent(req.params.name);
      const { name: newName } = req.body;
      
      if (!newName) {
        return res.status(400).json({ message: "Der neue Name des Gerätetyps ist erforderlich" });
      }
      
      // Standardgerätetypen abrufen
      const standardDeviceTypes = ["smartphone", "tablet", "laptop", "watch"];
      const capitalizedStandardTypes = standardDeviceTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1));
      
      // Prüfen, ob der zu aktualisierende Gerätetyp ein zu schützender Standardtyp ist (mit Großbuchstaben)
      if (capitalizedStandardTypes.includes(oldName)) {
        return res.status(400).json({ message: "Standardgerätetypen können nicht bearbeitet werden" });
      }
      
      // Spezialfall: Wenn der Name ein lowercase-Standardtyp ist (z.B. "smartphone"),
      // müssen wir nicht nach ihm in der Datenbank suchen, weil er nicht wirklich existiert
      if (standardDeviceTypes.includes(oldName)) {
        return res.status(400).json({ message: "Virtuelle Standardgerätetypen können nicht bearbeitet werden" });
      }
      
      // Prüfen, ob der neue Name bereits verwendet wird
      if (oldName !== newName) {
        const existingType = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, newName));
        
        if (existingType.length > 0) {
          return res.status(400).json({ message: "Dieser Gerätetyp existiert bereits" });
        }
      }
      
      // Gerätetyp aktualisieren
      const [updatedDeviceType] = await db.update(userDeviceTypes)
        .set({ name: newName })
        .where(eq(userDeviceTypes.name, oldName))
        .returning();
      
      if (!updatedDeviceType) {
        return res.status(404).json({ message: "Gerätetyp nicht gefunden" });
      }
      
      res.json(updatedDeviceType);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Gerätetyps:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Gerätetyps" });
    }
  });
  
  // Gerätetyp löschen
  app.delete("/api/superadmin/device-types/:name", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const name = decodeURIComponent(req.params.name);
      
      // Standardgerätetypen abrufen
      const standardDeviceTypes = ["smartphone", "tablet", "laptop", "watch"];
      const capitalizedStandardTypes = standardDeviceTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1));
      
      // Prüfen, ob der zu löschende Gerätetyp ein zu schützender Standardtyp ist (mit Großbuchstaben)
      if (capitalizedStandardTypes.includes(name)) {
        return res.status(400).json({ message: "Standardgerätetypen können nicht gelöscht werden" });
      }
      
      // Spezialfall: Wenn der Name ein lowercase-Standardtyp ist (z.B. "smartphone"),
      // müssen wir nicht nach ihm in der Datenbank suchen, weil er nicht wirklich existiert,
      // sondern nur virtuell in der Anwendung
      if (standardDeviceTypes.includes(name)) {
        try {
          // Prüfen, ob der Standardtyp bereits ausgeblendet ist
          const hiddenType = await db.select().from(hiddenStandardDeviceTypes)
            .where(eq(hiddenStandardDeviceTypes.name, name));
            
          if (hiddenType.length === 0) {
            // Füge den Standardtyp zur Liste der ausgeblendeten Standardtypen hinzu
            await db.insert(hiddenStandardDeviceTypes).values({
              name
            });
            console.log(`Standardgerätetyp "${name}" wurde zur Liste der ausgeblendeten Typen hinzugefügt.`);
          } else {
            console.log(`Standardgerätetyp "${name}" ist bereits in der Liste der ausgeblendeten Typen.`);
          }
          
          return res.status(204).send();
        } catch (innerError) {
          console.error(`Fehler beim Ausblenden des Standardgerätetyps ${name}:`, innerError);
          return res.status(500).json({ message: "Fehler beim Ausblenden des Standardgerätetyps" });
        }
      }
      
      // Prüfen, ob der Gerätetyp existiert (für nicht-Standard-Typen)
      const existingType = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, name));
      
      if (existingType.length === 0) {
        return res.status(404).json({ message: "Gerätetyp nicht gefunden" });
      }
      
      // Gerätetyp löschen
      await db.delete(userDeviceTypes).where(eq(userDeviceTypes.name, name));
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen des Gerätetyps:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Gerätetyps" });
    }
  });

  app.get("/api/superadmin/brands", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allBrands = await db.select().from(userBrands);
      res.json(allBrands);
    } catch (error) {
      console.error("Fehler beim Abrufen der Marken:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Marken" });
    }
  });
  
  // Bulk-Import für Hersteller (Marken)
  app.post("/api/superadmin/device-brands/bulk", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { deviceType, brands } = req.body;
      
      if (!deviceType || !brands || !Array.isArray(brands) || brands.length === 0) {
        return res.status(400).json({ message: "Ungültige Daten für den Massenimport" });
      }
      
      // Prüfen, ob der Gerätetyp existiert
      // Erst in der Datenbank suchen für benutzerdefinierte Typen
      const userDeviceType = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, deviceType));
      const deviceTypeExists = userDeviceType.length > 0 || 
                             ["Smartphone", "Tablet", "Laptop", "Watch",
                              "smartphone", "tablet", "laptop", "watch"].includes(deviceType);
      
      if (!deviceTypeExists) {
        return res.status(400).json({ message: `Gerätetyp '${deviceType}' existiert nicht` });
      }
      
      // Zunächst den Gerätetyp in der Tabelle nachschlagen
      let deviceTypeId;
      if (userDeviceType.length > 0) {
        deviceTypeId = userDeviceType[0].id;
      } else {
        // Für Standard-Gerätetypen müssen wir deren ID abrufen oder erstellen
        const deviceTypeUpperCase = deviceType.charAt(0).toUpperCase() + deviceType.slice(1).toLowerCase();
        const standardDeviceType = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, deviceTypeUpperCase));
        
        if (standardDeviceType.length > 0) {
          deviceTypeId = standardDeviceType[0].id;
        } else {
          // Den Standardtyp falls nötig in die Datenbank einfügen
          const [newDeviceType] = await db.insert(userDeviceTypes)
            .values({
              name: deviceTypeUpperCase,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          deviceTypeId = newDeviceType.id;
        }
      }
      
      // Liste für erfolgreich eingefügte Marken
      const importedBrands = [];
      
      // Marken einfügen
      for (const brandName of brands) {
        try {
          // Prüfen, ob die Marke bereits existiert
          const existingBrand = await db.select().from(userBrands)
            .where(and(
              eq(userBrands.name, brandName),
              eq(userBrands.deviceTypeId, deviceTypeId)
            ));
          
          if (existingBrand.length === 0) {
            // Nur einfügen, wenn noch nicht vorhanden
            const [newBrand] = await db.insert(userBrands)
              .values({
                name: brandName,
                deviceTypeId: deviceTypeId,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
              
            importedBrands.push(newBrand);
          }
        } catch (innerError) {
          console.error(`Fehler beim Import der Marke '${brandName}':`, innerError);
          // Wir machen weiter mit der nächsten Marke
        }
      }
      
      res.status(201).json({ 
        importedCount: importedBrands.length,
        importedBrands: importedBrands 
      });
    } catch (error) {
      console.error("Fehler beim Massenimport von Herstellern:", error);
      res.status(500).json({ message: "Fehler beim Massenimport von Herstellern" });
    }
  });

  app.get("/api/superadmin/models", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allModels = await db.select().from(userModels);
      res.json(allModels);
    } catch (error) {
      console.error("Fehler beim Abrufen der Modelle:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Modelle" });
    }
  });

  //==========================================================================
  // FEHLERKATALOG ROUTEN - Für Superadmins
  //==========================================================================
  // Alle Fehlerbeschreibungen abrufen (als flache Liste für die Tabelle)
  app.get("/api/superadmin/device-issues", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Alle Fehlerbeschreibungen aus der Datenbank abrufen
      const allIssues = await db.select().from(deviceIssues);
      
      // Nach Gerätetyp und Titel sortieren
      allIssues.sort((a, b) => {
        if (a.deviceType !== b.deviceType) {
          return a.deviceType.localeCompare(b.deviceType);
        }
        return a.title.localeCompare(b.title);
      });
      
      res.json(allIssues);
    } catch (error) {
      console.error("Fehler beim Abrufen der Fehlerbeschreibungen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  // Fehlerbeschreibungen für einen bestimmten Gerätetyp abrufen
  app.get("/api/superadmin/device-issues/:deviceType", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const deviceType = req.params.deviceType;
      
      // Alle Fehlerbeschreibungen für diesen Gerätetyp abrufen
      const issues = await db.select().from(deviceIssues)
        .where(eq(deviceIssues.deviceType, deviceType));
      
      // Sortieren nach Titel
      issues.sort((a, b) => a.title.localeCompare(b.title));
      
      res.json(issues);
    } catch (error) {
      console.error("Fehler beim Abrufen der Fehlerbeschreibungen für Gerätetyp:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlerbeschreibungen" });
    }
  });
  
  // Fehlerbeschreibung erstellen
  app.post("/api/superadmin/device-issues", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const issueData = insertDeviceIssueSchema.parse(req.body);
      
      // Prüfen, ob die Fehlerbeschreibung bereits existiert
      const existingIssue = await db.select().from(deviceIssues)
        .where(and(
          eq(deviceIssues.title, issueData.title),
          eq(deviceIssues.deviceType, issueData.deviceType)
        ));
      
      if (existingIssue.length > 0) {
        return res.status(400).json({ message: "Diese Fehlerbeschreibung existiert bereits für diesen Gerätetyp" });
      }
      
      // Fehlerbeschreibung in der Datenbank speichern
      const [newIssue] = await db.insert(deviceIssues).values(issueData).returning();
      
      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Fehler beim Erstellen der Fehlerbeschreibung:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Fehlerbeschreibungsdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Erstellen der Fehlerbeschreibung" });
    }
  });
  
  // Fehlerbeschreibung aktualisieren
  app.patch("/api/superadmin/device-issues/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
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
      console.error("Fehler beim Aktualisieren der Fehlerbeschreibung:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Fehlerbeschreibungsdaten", errors: error.errors });
      }
      
      res.status(500).json({ message: "Fehler beim Aktualisieren der Fehlerbeschreibung" });
    }
  });
  
  // Fehlerbeschreibung löschen
  app.delete("/api/superadmin/device-issues/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
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
      console.error("Fehler beim Löschen der Fehlerbeschreibung:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Fehlerbeschreibung" });
    }
  });
}