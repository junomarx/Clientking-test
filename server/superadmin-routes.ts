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
  customers, repairs, userDeviceTypes, userBrands, userModels, userModelSeries,
  deviceIssues, insertDeviceIssueSchema, hiddenStandardDeviceTypes
} from "@shared/schema";
import { UploadedFile } from "express-fileupload";
import { inArray } from "drizzle-orm";

// User-Interface erweitert um userId für TypeScript
declare global {
  namespace Express {
    interface User {
      id: number;
      userId: number;
    }
  }
}
import { ZodError, z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { registerSuperadminEmailRoutes } from "./superadmin-email-routes";
import { registerSuperadminPrintTemplatesRoutes } from "./superadmin-print-templates-routes";

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
  // E-Mail-Routen registrieren
  registerSuperadminEmailRoutes(app);
  
  // Druckvorlagen-Routen registrieren
  registerSuperadminPrintTemplatesRoutes(app);
  
  // DSGVO-konforme Statistiken
  app.get("/api/superadmin/stats-dsgvo", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Gesamtanzahl der Shops (basierend auf einzigartigen Shop-IDs)
      const [shopsResult] = await db.select({
        totalShops: sql<number>`COUNT(DISTINCT ${users.shopId})`.as("total_shops"),
      }).from(users);
      
      const totalShops = shopsResult.totalShops;
      
      // Aktive Shops in den letzten 30 Tagen
      // Ein Shop gilt als aktiv, wenn ein Benutzer dieses Shops sich in den letzten 30 Tagen angemeldet hat
      // oder eine Reparatur erstellt wurde
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Aktive Shops basierend auf Reparaturen der letzten 30 Tage
      const [activeShopsResult] = await db.select({
        activeShops: sql<number>`COUNT(DISTINCT ${repairs.shopId})`.as("active_shops"),
      })
      .from(repairs)
      .where(sql`${repairs.createdAt} >= ${thirtyDaysAgo.toISOString()}`);
      
      const activeShops = activeShopsResult.activeShops;
      
      // Reparaturen der letzten 30 Tage gruppiert nach Datum
      const repairsLast30Days = await db.select({
        date: sql<string>`DATE(${repairs.createdAt})`.as("date"),
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(repairs)
      .where(sql`${repairs.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(sql`DATE(${repairs.createdAt})`)
      .orderBy(sql`DATE(${repairs.createdAt})`);
      
      // Anzahl der Benutzer pro Shop (DSGVO-konform: nur Anzahl, keine Namen)
      const usersPerShop = await db.select({
        shopId: users.shopId,
        userCount: sql<number>`COUNT(*)`.as("user_count"),
      })
      .from(users)
      .groupBy(users.shopId);
      
      // E-Mail-Statistiken
      // Da die email_history-Tabelle möglicherweise nicht die Spalte created_at enthält,
      // verwenden wir createdAt und stellen sicher, dass die Tabelle existiert
      let emailStats: { emailsSent: number, lastEmailDate: string | null } = { emailsSent: 0, lastEmailDate: null };
      try {
        const results = await db.select({
          emailsSent: sql<number>`COUNT(*)`.as("emails_sent"),
          lastEmailDate: sql<string | null>`MAX(${sql.raw("\"createdAt\"")})`.as("last_email_date"),
        })
        .from(sql`email_history`)
        .where(sql`"createdAt" >= ${thirtyDaysAgo.toISOString()}`);
        
        if (results.length > 0) {
          emailStats = results[0];
        }
      } catch (error) {
        console.warn("Fehler beim Abrufen der E-Mail-Statistiken:", error);
        // Wenn ein Fehler auftritt, behalten wir die Standardwerte bei
      }
      
      // Paketnutzung
      const packageUsage = await db.select({
        packageName: packages.name,
        userCount: sql<number>`COUNT(${users.id})`.as("user_count"),
      })
      .from(users)
      .leftJoin(packages, eq(users.packageId, packages.id))
      .groupBy(packages.name);
      
      // DSGVO-Vorgänge (Platzhalter, da wir keine spezifische Tabelle dafür haben)
      // In einer realen Implementierung würden wir diese Daten aus einer separaten Tabelle abrufen
      const dsgvoStats = {
        dsgvoExports: 0,
        dsgvoDeletes: 0,
        lastExport: null,
      };
      
      // Antwort zusammenstellen
      const response = {
        totalShops,
        activeShops,
        repairsLast30Days,
        usersPerShop,
        emailsSent: emailStats.emailsSent || 0,
        lastEmailDate: emailStats.lastEmailDate,
        packageUsage,
        dsgvoExports: dsgvoStats.dsgvoExports,
        dsgvoDeletes: dsgvoStats.dsgvoDeletes,
        lastExport: dsgvoStats.lastExport,
      };
      
      res.json(response);
    } catch (error) {
      console.error("Fehler beim Abrufen der DSGVO-Statistiken:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der DSGVO-Statistiken" });
    }
  });
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

  // Endpunkt für Gerätestatistiken
  app.get("/api/superadmin/device-statistics", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log("Superadmin-Bereich: Abrufen von Gerätestatistiken");

      // 1. Alle Gerätetypen abrufen
      const deviceTypesResult = await db.select({
        id: userDeviceTypes.id,
        name: userDeviceTypes.name
      })
      .from(userDeviceTypes)
      .where(
        or(
          eq(userDeviceTypes.userId, req.user?.id || 0),
          eq(userDeviceTypes.userId, 0),
          sql`${userDeviceTypes.shopId} IS NULL`
        )
      );
      
      // Entferne Duplikate (basierend auf dem Namen)
      const deviceTypesMap = new Map();
      deviceTypesResult.forEach(type => {
        deviceTypesMap.set(type.name.toLowerCase(), type);
      });
      const deviceTypes = Array.from(deviceTypesMap.values());

      // 2. Alle Marken abrufen
      const brands = await db.select({
        id: userBrands.id,
        name: userBrands.name,
        deviceTypeId: userBrands.deviceTypeId
      })
      .from(userBrands);

      // 3. Alle Modelle abrufen
      const models = await db.select({
        id: userModels.id,
        name: userModels.name,
        brandId: userModels.brandId
      })
      .from(userModels);

      // Statistiken zusammenstellen
      const statistics = {
        totalDeviceTypes: deviceTypes.length,
        totalBrands: brands.length,
        totalModels: models.length,
        deviceTypeStats: [] as Array<{
          name: string;
          brandCount: number;
          modelCount: number;
          brands: Array<{
            name: string;
            modelCount: number;
          }>;
        }>
      };

      // Statistiken für jeden Gerätetyp erstellen
      for (const deviceType of deviceTypes) {
        const deviceTypeBrands = brands.filter(brand => 
          brand.deviceTypeId === deviceType.id
        );
        
        const deviceTypeBrandIds = deviceTypeBrands.map(brand => brand.id);
        const deviceTypeModels = models.filter(model => 
          deviceTypeBrandIds.includes(model.brandId)
        );

        const brandStats = deviceTypeBrands.map(brand => {
          const brandModels = models.filter(model => model.brandId === brand.id);
          return {
            name: brand.name,
            modelCount: brandModels.length
          };
        });

        statistics.deviceTypeStats.push({
          name: deviceType.name,
          brandCount: deviceTypeBrands.length,
          modelCount: deviceTypeModels.length,
          brands: brandStats
        });
      }

      res.json(statistics);
    } catch (error) {
      console.error("Fehler beim Abrufen der Gerätestatistiken:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätestatistiken" });
    }
  });

  // Abrufen aller verfügbaren Gerätetypen (vollständige Objekte mit IDs)
  app.get("/api/superadmin/device-types/all", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Gerätetypen auch wenn shopId=null ist erfassen
      const deviceTypes = await db.select().from(userDeviceTypes);
      
      // Prüfen ob Gerätetypen mit shopId=null vorhanden sind und loggen
      const nullShopIdTypes = deviceTypes.filter(dt => dt.shopId === null);
      if (nullShopIdTypes.length > 0) {
        console.log("Gerätetypen mit shopId=null gefunden:", nullShopIdTypes);
      }
      
      res.json(deviceTypes);
    } catch (error) {
      console.error("Fehler beim Abrufen der vollständigen Gerätetypen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätetypen" });
    }
  });

  // Globale Geräteverwaltung - nur Namen der Gerätetypen
  app.get("/api/superadmin/device-types", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Standardgerätetypen (unabhängig von Benutzern) - immer mit großem Anfangsbuchstaben
      const standardDeviceTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      const standardDeviceTypesLower = standardDeviceTypes.map(type => type.toLowerCase());
      
      // Alle ausgeblendeten Standard-Gerätetypen abrufen
      const hiddenTypes = await db.select({
        name: hiddenStandardDeviceTypes.name
      }).from(hiddenStandardDeviceTypes);
      
      const hiddenTypeNames = hiddenTypes.map(ht => ht.name);
      
      // Filtere die ausgeblendeten Typen aus den Standardtypen heraus
      const visibleStandardTypes = standardDeviceTypes.filter(type => 
        !hiddenTypeNames.includes(type) && !hiddenTypeNames.includes(type.toLowerCase())
      );
      
      // Alle benutzerdefinierten Gerätetypen abrufen
      const customDeviceTypes = await db.select({
        name: userDeviceTypes.name
      }).from(userDeviceTypes);
      
      // Entferne benutzerdefinierte Typen, die bereits als Standard existieren (um Duplikate zu vermeiden)
      // Entferne auch leere Gerätetypen
      const filteredCustomTypes = customDeviceTypes
        .map(dt => dt.name)
        .filter(name => 
          name && name.trim() !== "" &&
          !standardDeviceTypesLower.includes(name.toLowerCase()) &&
          !standardDeviceTypes.includes(name)
        );
      
      // Kombiniere sichtbare Standard- und benutzerdefinierte Gerätetypen
      const allTypes = [...visibleStandardTypes, ...filteredCustomTypes];
      
      // Entferne Duplikate (unabhängig von Groß-/Kleinschreibung)
      const uniqueMap = new Map();
      allTypes.forEach(type => {
        const lowerType = type.toLowerCase();
        // Wenn diese Variante bereits existiert, bevorzuge die mit großem Anfangsbuchstaben
        if (!uniqueMap.has(lowerType) || type[0] === type[0].toUpperCase()) {
          uniqueMap.set(lowerType, type);
        }
      });
      
      const uniqueTypes = Array.from(uniqueMap.values());
      console.log("Alle Gerätetypen (nach Duplikatentfernung):", uniqueTypes);
      
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
      
      // Standardgerätetypen abrufen - mit konsistenter Schreibweise
      const standardDeviceTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      const standardDeviceTypesLower = standardDeviceTypes.map(t => t.toLowerCase());
      
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
      const standardDeviceTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      const standardDeviceTypesLower = standardDeviceTypes.map(t => t.toLowerCase());
      
      // Prüfen, ob der zu aktualisierende Gerätetyp ein zu schützender Standardtyp ist (mit Großbuchstaben)
      if (standardDeviceTypes.includes(oldName)) {
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
      const standardDeviceTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      const standardDeviceTypesLower = standardDeviceTypes.map(t => t.toLowerCase());
      
      // Prüfen, ob der zu löschende Gerätetyp ein zu schützender Standardtyp ist (mit Großbuchstaben)
      const standardTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      if (standardTypes.includes(name)) {
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
  
  // API-Endpunkte für Modellverwaltung
  app.get("/api/superadmin/models", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const allModels = await db.select().from(userModels);
      res.json(allModels);
    } catch (error) {
      console.error("Fehler beim Abrufen der Modelle:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Modelle" });
    }
  });
  
  app.post("/api/superadmin/device-models/bulk", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { brandId, models } = req.body;
      
      console.log('Server empfängt Modell-Bulk-Import-Anfrage:', { brandId, models });
      
      if (!brandId || !models || !Array.isArray(models) || models.length === 0) {
        console.log('Validierungsfehler bei Modell-Bulk-Import:', { brandId, models });
        return res.status(400).json({ message: "Ungültige Daten für den Massenimport" });
      }
      
      // Überprüfe, ob die Marke existiert
      const brand = await db.select().from(userBrands).where(eq(userBrands.id, brandId));
      if (brand.length === 0) {
        return res.status(404).json({ message: "Die angegebene Marke wurde nicht gefunden" });
      }
      
      let importedCount = 0;
      let existingCount = 0;
      
      // Modelle einfügen
      for (const modelName of models) {
        try {
          // Prüfen, ob das Modell bereits existiert
          const existingModel = await db.select().from(userModels)
            .where(and(
              eq(userModels.name, modelName),
              eq(userModels.brandId, brandId)
            ));
          
          if (existingModel.length === 0) {
            console.log(`Füge neues Modell '${modelName}' für Marke ID ${brandId} hinzu...`);
            // Nur einfügen, wenn noch nicht vorhanden
            const superadminUserId = (req.user as any).id;
            try {
              await db.insert(userModels)
                .values({
                  name: modelName,
                  brandId: brandId,
                  userId: superadminUserId,
                  shopId: 0, // Globale Modelle gehören zu keinem Shop (0 = global)
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  modelSeriesId: null // Explizit null setzen, um das Problem mit der NOT NULL Constraint zu vermeiden
                });
              console.log(`Modell '${modelName}' erfolgreich hinzugefügt`);
            } catch (insertError) {
              console.error(`Fehler beim Einfügen des Modells '${modelName}':`, insertError);
              throw insertError;
            }
            importedCount++;
          } else {
            existingCount++;
          }
        } catch (error) {
          console.error(`Fehler beim Importieren des Modells '${modelName}':`, error);
        }
      }
      
      res.json({
        success: true,
        importedCount,
        existingCount,
        totalCount: models.length
      });
    } catch (error) {
      console.error("Fehler beim Massenimport von Modellen:", error);
      res.status(500).json({ message: "Fehler beim Massenimport von Modellen" });
    }
  });
  
  app.delete("/api/superadmin/models/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const modelId = parseInt(req.params.id);
      
      if (isNaN(modelId)) {
        return res.status(400).json({ message: "Ungültige Modell-ID" });
      }
      
      // Prüfen, ob das Modell existiert
      const model = await db.select().from(userModels).where(eq(userModels.id, modelId));
      if (model.length === 0) {
        return res.status(404).json({ message: "Modell nicht gefunden" });
      }
      
      // Modell löschen
      await db.delete(userModels).where(eq(userModels.id, modelId));
      
      res.json({ success: true, message: "Modell erfolgreich gelöscht" });
    } catch (error) {
      console.error("Fehler beim Löschen des Modells:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Modells" });
    }
  });
  
  // Mehrere Modelle auf einmal löschen
  app.post("/api/superadmin/models/bulk-delete", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Debugging: Request-Body ausgeben
      console.log("Request-Body für Massenlöschen:", req.body);
      
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log("Ungültiges Format für IDs:", ids);
        return res.status(400).json({ message: "Ungültige Daten für das Massenlöschen" });
      }
      
      console.log(`Lösche ${ids.length} Modelle mit IDs:`, ids);
      
      // Zählen wie viele Einträge gelöscht wurden
      let successCount = 0;
      
      // Alle ausgewählten Modelle löschen
      // Wir verarbeiten jede ID separat
      for (const modelId of ids) {
        try {
          const id = Number(modelId);
          if (isNaN(id)) {
            console.log(`Ungültige Modell-ID: ${modelId}`);
            continue;
          }
          
          // Löschvorgang für diese ID
          const result = await db.delete(userModels).where(eq(userModels.id, id));
          console.log(`Modell mit ID ${id} gelöscht`);
          successCount++;
        } catch (deleteError) {
          console.error(`Fehler beim Löschen des Modells mit ID ${modelId}:`, deleteError);
          // Wir machen mit den anderen IDs weiter
        }
      }
      
      res.json({ 
        success: true, 
        message: `${successCount} Modelle erfolgreich gelöscht`,
        deletedCount: successCount
      });
    } catch (error) {
      console.error("Fehler beim Massenlöschen von Modellen:", error);
      res.status(500).json({ message: "Fehler beim Massenlöschen von Modellen" });
    }
  });
  
  app.get("/api/superadmin/user-device-types", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const deviceTypes = await db.select().from(userDeviceTypes);
      res.json(deviceTypes);
    } catch (error) {
      console.error("Fehler beim Abrufen der benutzerdefinierten Gerätetypen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätetypen" });
    }
  });
  
  // Bulk-Import für Hersteller (Marken)
  app.post("/api/superadmin/device-brands/bulk", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { deviceType, brands } = req.body;
      
      console.log('Server empfängt Bulk-Import-Anfrage:', { deviceType, brands });
      
      if (!deviceType || !brands || !Array.isArray(brands) || brands.length === 0) {
        console.log('Validierungsfehler bei Bulk-Import:', { deviceType, brands });
        return res.status(400).json({ message: "Ungültige Daten für den Massenimport" });
      }
      
      // Prüfen, ob der Gerätetyp existiert
      // Erst in der Datenbank suchen für benutzerdefinierte Typen
      // Wir prüfen case-insensitive, ob der Gerätetyp existiert
      const userDeviceType = await db.select()
        .from(userDeviceTypes)
        .where(
          or(
            eq(userDeviceTypes.name, deviceType),
            eq(userDeviceTypes.name, deviceType.toLowerCase()),
            eq(userDeviceTypes.name, deviceType.charAt(0).toUpperCase() + deviceType.slice(1).toLowerCase())
          )
        );
      
      // Standard-Gerätetypen
      const standardDeviceTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      const standardDeviceTypesLower = standardDeviceTypes.map(t => t.toLowerCase());
      
      // Prüfen, ob der Gerätetyp existiert (entweder als benutzerdefiniert oder Standard)
      const deviceTypeExists = userDeviceType.length > 0 || 
                             standardDeviceTypes.includes(deviceType) ||
                             standardDeviceTypesLower.includes(deviceType.toLowerCase());
      
      if (!deviceTypeExists) {
        return res.status(400).json({ message: `Gerätetyp '${deviceType}' existiert nicht` });
      }
      
      // Zunächst den Gerätetyp in der Tabelle nachschlagen
      let deviceTypeId;
      if (userDeviceType.length > 0) {
        deviceTypeId = userDeviceType[0].id;
        console.log(`Gefundener Gerätetyp: ${userDeviceType[0].name} mit ID ${deviceTypeId}`);
      } else {
        // Für Standard-Gerätetypen müssen wir deren ID abrufen oder erstellen
        const deviceTypeUpperCase = deviceType.charAt(0).toUpperCase() + deviceType.slice(1).toLowerCase();
        console.log(`Suche nach standardisiertem Gerätetyp: ${deviceTypeUpperCase}`);
        const standardDeviceType = await db.select().from(userDeviceTypes).where(eq(userDeviceTypes.name, deviceTypeUpperCase));
        
        if (standardDeviceType.length > 0) {
          deviceTypeId = standardDeviceType[0].id;
        } else {
          // Den Standardtyp falls nötig in die Datenbank einfügen
          // Verwende den ID des aktuellen Superadmin-Benutzers statt einer nicht existierenden ID 0
          const superadminUserId = (req.user as any).id;
          const [newDeviceType] = await db.insert(userDeviceTypes)
            .values({
              name: deviceTypeUpperCase,
              userId: superadminUserId, // Der aktuelle Superadmin als Eigentümer für globale Typen
              shopId: 0, // Globale Typen gehören zu keinem Shop (0 = global)
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
            console.log(`Füge neue Marke '${brandName}' für Gerätetyp ID ${deviceTypeId} hinzu...`);
            // Nur einfügen, wenn noch nicht vorhanden
            // Verwende den ID des aktuellen Superadmin-Benutzers statt einer nicht existierenden ID 0
            const superadminUserId = (req.user as any).id;
            const [newBrand] = await db.insert(userBrands)
              .values({
                name: brandName,
                userId: superadminUserId, // Der aktuelle Superadmin als Eigentümer für globale Marken
                deviceTypeId: deviceTypeId,
                shopId: 0, // Globale Marken gehören zu keinem Shop (0 = global)
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
              
            importedBrands.push(newBrand);
          } else {
            console.log(`Marke '${brandName}' für Gerätetyp ID ${deviceTypeId} existiert bereits.`);
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
  
  // Schema für Bulk-Import von Fehlereinträgen
  const bulkImportSchema = z.object({
    deviceType: z.string().min(1, "Der Gerätetyp darf nicht leer sein"),
    errors: z.array(z.string().min(1, "Fehlereinträge dürfen nicht leer sein")).min(1, "Mindestens ein Fehlereintrag ist erforderlich")
  });
  
  // Massenimport von Fehlereinträgen für einen bestimmten Gerätetyp
  app.post("/api/superadmin/device-issues/bulk", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log("Empfange Fehlerkatalog-Bulk-Import-Anfrage:", req.body);
      
      // Validieren der Anfrage mit Zod-Schema
      const validatedData = bulkImportSchema.parse(req.body);
      const { deviceType, errors } = validatedData;
      
      if (errors.length === 0) {
        console.log("Fehler: Keine Fehlereinträge");
        return res.status(400).json({ message: "Mindestens ein Fehlereintrag ist erforderlich" });
      }
      
      console.log(`Gültige Anfrage: Gerätetyp ${deviceType}, ${errors.length} Fehlereinträge`);
      
      // Zähler für importierte und existierende Einträge
      let importedCount = 0;
      let existingCount = 0;
      
      // Array für Werte zum Einfügen
      const valuesToInsert = [];
      
      // Vorhandene Fehlereinträge für diesen Gerätetyp abrufen
      const existingIssues = await db.select({
        title: deviceIssues.title
      })
      .from(deviceIssues)
      .where(eq(deviceIssues.deviceType, deviceType));
      
      const existingTitles = existingIssues.map(issue => issue.title.toLowerCase());
      
      // Jeden Fehlereintrag verarbeiten
      for (const errorTitle of errors) {
        // Prüfen, ob der Eintrag bereits existiert (Fall-insensitiv)
        if (existingTitles.includes(errorTitle.toLowerCase())) {
          existingCount++;
          continue;
        }
        
        // Neuen Eintrag erstellen
        valuesToInsert.push({
          deviceType,
          title: errorTitle,
          description: "Automatisch importiert", 
          solution: "",
          severity: "medium",
          isCommon: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        importedCount++;
      }
      
      // Nur importieren, wenn es neue Einträge gibt
      if (valuesToInsert.length > 0) {
        await db.insert(deviceIssues).values(valuesToInsert);
      }
      
      res.status(200).json({
        success: true,
        importedCount,
        existingCount,
        message: `${importedCount} Fehlereinträge wurden importiert, ${existingCount} existieren bereits.`
      });
    } catch (error) {
      console.error("Fehler beim Massenimport von Fehlereinträgen:", error);
      
      if (error instanceof ZodError) {
        console.log("Zod-Validierungsfehler:", error.errors);
        return res.status(400).json({
          success: false,
          message: "Ungültige Daten für den Massenimport",
          errors: error.errors
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Fehler beim Massenimport von Fehlereinträgen" 
      });
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
  
  // Mehrere Fehlerbeschreibungen auf einmal löschen
  app.post("/api/superadmin/device-issues/bulk-delete", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log("Request-Body für Massenlöschen von Fehlereinträgen:", req.body);
      
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log("Ungültiges Format für Fehlereinträge-IDs:", ids);
        return res.status(400).json({ message: "Ungültige Daten für das Massenlöschen" });
      }
      
      console.log(`Lösche ${ids.length} Fehlereinträge mit IDs:`, ids);
      
      // Zählen wie viele Einträge gelöscht wurden
      let successCount = 0;
      
      // Alle ausgewählten Fehlereinträge löschen
      // Wir verarbeiten jede ID separat
      for (const issueId of ids) {
        try {
          const id = Number(issueId);
          if (isNaN(id)) {
            console.log(`Ungültige Fehlereintrag-ID: ${issueId}`);
            continue;
          }
          
          // Prüfen, ob der Fehlereintrag existiert
          const [existingIssue] = await db.select().from(deviceIssues).where(eq(deviceIssues.id, id));
          
          if (!existingIssue) {
            console.log(`Fehlereintrag mit ID ${id} nicht gefunden`);
            continue;
          }
          
          // Fehlereintrag löschen
          await db.delete(deviceIssues).where(eq(deviceIssues.id, id));
          
          console.log(`Fehlereintrag mit ID ${id} gelöscht`);
          successCount++;
        } catch (deleteError) {
          console.error(`Fehler beim Löschen des Fehlereintrags mit ID ${issueId}:`, deleteError);
          // Wir machen mit den anderen IDs weiter
        }
      }
      
      res.json({ 
        success: true,
        deletedCount: successCount,
        message: `${successCount} Fehlereinträge wurden erfolgreich gelöscht.`
      });
    } catch (error) {
      console.error("Fehler beim Massenlöschen von Fehlereinträgen:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim Massenlöschen von Fehlereinträgen" 
      });
    }
  });
  
  // Marke löschen
  app.delete("/api/superadmin/brands/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Prüfen, ob die Marke existiert
      const [existingBrand] = await db.select().from(userBrands).where(eq(userBrands.id, id));
      
      if (!existingBrand) {
        return res.status(404).json({ message: "Marke nicht gefunden" });
      }
      
      // Alle Modelle dieser Marke löschen
      await db.delete(userModels).where(eq(userModels.brandId, id));
      
      // Marke löschen
      await db.delete(userBrands).where(eq(userBrands.id, id));
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen der Marke:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Marke" });
    }
  });
  
  // Mehrere Marken auf einmal löschen
  app.post("/api/superadmin/brands/bulk-delete", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Debugging: Request-Body ausgeben
      console.log("Request-Body für Massenlöschen von Marken:", req.body);
      
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log("Ungültiges Format für Marken-IDs:", ids);
        return res.status(400).json({ message: "Ungültige Daten für das Massenlöschen" });
      }
      
      console.log(`Lösche ${ids.length} Marken mit IDs:`, ids);
      
      // Zählen wie viele Einträge gelöscht wurden
      let successCount = 0;
      
      // Alle ausgewählten Marken löschen
      // Wir verarbeiten jede ID separat
      for (const brandId of ids) {
        try {
          const id = Number(brandId);
          if (isNaN(id)) {
            console.log(`Ungültige Marken-ID: ${brandId}`);
            continue;
          }
          
          // Prüfen, ob die Marke existiert
          const [existingBrand] = await db.select().from(userBrands).where(eq(userBrands.id, id));
          
          if (!existingBrand) {
            console.log(`Marke mit ID ${id} nicht gefunden`);
            continue;
          }
          
          // Alle Modelle dieser Marke löschen
          await db.delete(userModels).where(eq(userModels.brandId, id));
          
          // Marke löschen
          await db.delete(userBrands).where(eq(userBrands.id, id));
          
          console.log(`Marke mit ID ${id} und alle zugehörigen Modelle gelöscht`);
          successCount++;
        } catch (deleteError) {
          console.error(`Fehler beim Löschen der Marke mit ID ${brandId}:`, deleteError);
          // Wir machen mit den anderen IDs weiter
        }
      }
      
      res.json({ 
        success: true,
        deletedCount: successCount,
        message: `${successCount} Marken wurden erfolgreich gelöscht.`
      });
    } catch (error) {
      console.error("Fehler beim Massenlöschen von Marken:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim Massenlöschen von Marken" 
      });
    }
  });

  // CSV-Import für Gerätemodelle
  app.post("/api/superadmin/device-management/import-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { deviceType, brandName, csvData } = req.body;
      
      if (!deviceType || !brandName || !csvData) {
        return res.status(400).json({ 
          success: false,
          message: "Gerätetyp, Markenname und CSV-Daten sind erforderlich" 
        });
      }
      
      console.log(`CSV-Import für Marke ${brandName} und Gerätetyp ${deviceType} gestartet`);
      
      // Superadmin-ID holen
      const superadminUserId = (req.user as any).id;
      console.log(`Import verwendet Superadmin-ID: ${superadminUserId}`);
      
      // Prüfen ob der Gerätetyp existiert, sonst erstellen
      let deviceTypeId: number;
      const [existingDeviceType] = await db.select().from(userDeviceTypes)
        .where(sql`LOWER(${userDeviceTypes.name}) = ${deviceType.toLowerCase()}`);
      
      if (existingDeviceType) {
        deviceTypeId = existingDeviceType.id;
        console.log(`Verwende existierenden Gerätetyp ${deviceType} mit ID ${deviceTypeId}`);
      } else {
        // Neuen Gerätetyp anlegen
        const [newDeviceType] = await db.insert(userDeviceTypes)
          .values({
            name: deviceType,
            userId: superadminUserId,
            shopId: null, // Globaler Gerätetyp
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        deviceTypeId = newDeviceType.id;
        console.log(`Neuer Gerätetyp ${deviceType} angelegt mit ID ${deviceTypeId}`);
      }
      
      // Prüfen ob die Marke existiert, sonst erstellen
      let brandId: number;
      const [existingBrand] = await db.select().from(userBrands)
        .where(sql`LOWER(${userBrands.name}) = ${brandName.toLowerCase()} AND ${userBrands.deviceTypeId} = ${deviceTypeId}`);
      
      if (existingBrand) {
        brandId = existingBrand.id;
        console.log(`Verwende existierende Marke ${brandName} mit ID ${brandId}`);
      } else {
        // Neue Marke anlegen
        const [newBrand] = await db.insert(userBrands)
          .values({
            name: brandName,
            deviceTypeId: deviceTypeId,
            userId: superadminUserId,
            shopId: null, // Globale Marke
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        brandId = newBrand.id;
        console.log(`Neue Marke ${brandName} angelegt mit ID ${brandId}`);
      }
      
      // CSV-Daten parsen
      const { parse } = await import('csv-parse/sync');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      console.log(`${records.length} Modelle in CSV-Datei gefunden`);
      
      // Vorhandene Modelle für diese Marke abrufen
      const existingModels = await db.select().from(userModels).where(eq(userModels.brandId, brandId));
      const existingModelsByName = new Map(
        existingModels.map(model => [model.name.toLowerCase(), model])
      );
      
      // Statistik für den Import
      const stats = {
        total: records.length,
        added: 0,
        skipped: 0,
        errors: 0
      };
      
      // Modelle importieren
      for (const record of records) {
        try {
          const modelName = record.model || record.name || record.Model || record.Name;
          
          if (!modelName) {
            console.warn("Überspringe Zeile ohne Modellnamen");
            stats.skipped++;
            continue;
          }
          
          // Prüfen, ob das Modell bereits existiert
          const existingModel = existingModelsByName.get(modelName.toLowerCase());
          
          if (existingModel) {
            console.log(`Modell ${modelName} existiert bereits mit ID ${existingModel.id}`);
            stats.skipped++;
          } else {
            // Neues Modell anlegen
            const [newModel] = await db.insert(userModels)
              .values({
                name: modelName,
                modelSeriesId: null, // Keine Modellreihe verwenden
                brandId: brandId,
                userId: superadminUserId,
                shopId: null, // Globales Modell
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log(`Neues Modell ${modelName} angelegt mit ID ${newModel.id}`);
            stats.added++;
          }
        } catch (error) {
          console.error(`Fehler beim Import des Modells:`, error);
          stats.errors++;
        }
      }
      
      res.json({
        success: true,
        message: "CSV-Import abgeschlossen",
        stats
      });
    } catch (error) {
      console.error("Fehler beim CSV-Import:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim CSV-Import" 
      });
    }
  });
  
  // CSV-Export für Marken und Modelle
  app.get("/api/superadmin/device-management/export-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { type, deviceType } = req.query;
      
      if (!type || (type !== 'brands' && type !== 'models')) {
        return res.status(400).json({ 
          success: false,
          message: "Typ muss entweder 'brands' oder 'models' sein" 
        });
      }

      console.log(`CSV-Export für ${type} und Gerätetyp ${deviceType || 'alle'}`);
      
      if (type === 'brands') {
        // Marken exportieren
        // Wenn ein Gerätetyp angegeben wurde, filtern wir danach
        let deviceTypeId: number | undefined;
        if (deviceType) {
          const deviceTypeObj = await db.select()
            .from(userDeviceTypes)
            .where(
              or(
                eq(userDeviceTypes.name, deviceType as string),
                eq(sql`LOWER(${userDeviceTypes.name})`, (deviceType as string).toLowerCase())
              )
            )
            .limit(1);
            
          if (deviceTypeObj.length > 0) {
            deviceTypeId = deviceTypeObj[0].id;
          }
        }
        
        let brandsQuery = db.select({
          id: userBrands.id,
          name: userBrands.name,
          deviceTypeId: userBrands.deviceTypeId,
          deviceTypeName: userDeviceTypes.name
        })
        .from(userBrands)
        .leftJoin(userDeviceTypes, eq(userBrands.deviceTypeId, userDeviceTypes.id));
        
        if (deviceTypeId) {
          brandsQuery = brandsQuery.where(eq(userBrands.deviceTypeId, deviceTypeId));
        }
        
        const brands = await brandsQuery;
        
        // CSV-Header und Daten erstellen
        let csvContent = "id,name,deviceTypeId,deviceTypeName\n";
        brands.forEach(brand => {
          csvContent += `${brand.id},"${brand.name}",${brand.deviceTypeId},"${brand.deviceTypeName || ''}"\n`;
        });
        
        // CSV als Datei senden
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=brands-export-${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csvContent);
      } else {
        // Modelle exportieren
        let modelsQuery = db.select({
          id: userModels.id,
          name: userModels.name,
          brandId: userModels.brandId,
          brandName: userBrands.name,
          deviceTypeName: userDeviceTypes.name
        })
        .from(userModels)
        .leftJoin(userBrands, eq(userModels.brandId, userBrands.id))
        .leftJoin(userDeviceTypes, eq(userBrands.deviceTypeId, userDeviceTypes.id));
        
        // Wenn ein Gerätetyp angegeben wurde, filtern wir danach
        let deviceTypeId: number | undefined;
        if (deviceType) {
          const deviceTypeObj = await db.select()
            .from(userDeviceTypes)
            .where(
              or(
                eq(userDeviceTypes.name, deviceType as string),
                eq(sql`LOWER(${userDeviceTypes.name})`, (deviceType as string).toLowerCase())
              )
            )
            .limit(1);
            
          if (deviceTypeObj.length > 0) {
            deviceTypeId = deviceTypeObj[0].id;
          }
        }
        
        if (deviceTypeId) {
          modelsQuery = modelsQuery.where(eq(userBrands.deviceTypeId, deviceTypeId));
        }
        
        const models = await modelsQuery;
        
        // CSV-Header und Daten erstellen
        let csvContent = "id,name,brandId,brandName,deviceTypeName\n";
        models.forEach(model => {
          csvContent += `${model.id},"${model.name}",${model.brandId},"${model.brandName || ''}","${model.deviceTypeName || ''}"\n`;
        });
        
        // CSV als Datei senden
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=models-export-${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csvContent);
      }
    } catch (error) {
      console.error("Fehler beim CSV-Export:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim CSV-Export" 
      });
    }
  });

  // CSV-Import für Marken
  app.post("/api/superadmin/device-brands/import-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { deviceType, csvData } = req.body;
      
      if (!deviceType || !csvData) {
        return res.status(400).json({ 
          success: false,
          message: "Gerätetyp und CSV-Daten sind erforderlich" 
        });
      }
      
      console.log(`CSV-Import für Marken des Gerätetyps ${deviceType} gestartet`);
      
      // Superadmin-ID holen
      const superadminUserId = (req.user as any).id;
      console.log(`Import verwendet Superadmin-ID: ${superadminUserId}`);
      
      // Prüfen ob der Gerätetyp existiert, sonst erstellen
      let deviceTypeId: number;
      const [existingDeviceType] = await db.select().from(userDeviceTypes)
        .where(sql`LOWER(${userDeviceTypes.name}) = ${deviceType.toLowerCase()}`);
      
      if (existingDeviceType) {
        deviceTypeId = existingDeviceType.id;
        console.log(`Verwende existierenden Gerätetyp ${deviceType} mit ID ${deviceTypeId}`);
      } else {
        // Neuen Gerätetyp anlegen
        const [newDeviceType] = await db.insert(userDeviceTypes)
          .values({
            name: deviceType,
            userId: superadminUserId,
            shopId: null, // Globaler Gerätetyp
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        deviceTypeId = newDeviceType.id;
        console.log(`Neuer Gerätetyp ${deviceType} angelegt mit ID ${deviceTypeId}`);
      }
      
      // CSV-Daten parsen
      const { parse } = await import('csv-parse/sync');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      console.log(`${records.length} Marken in CSV-Datei gefunden`);
      
      // Existierende Marken für diesen Gerätetyp abrufen
      const existingBrands = await db.select().from(userBrands).where(eq(userBrands.deviceTypeId, deviceTypeId));
      const existingBrandsByName = new Map(
        existingBrands.map(brand => [brand.name.toLowerCase(), brand])
      );
      
      // Statistik für den Import
      const stats = {
        total: records.length,
        added: 0,
        skipped: 0,
        errors: 0
      };
      
      // Marken importieren
      for (const record of records) {
        try {
          const brandName = record.brand || record.name || record.Brand || record.Name;
          
          if (!brandName) {
            console.warn("Überspringe Zeile ohne Markennamen");
            stats.skipped++;
            continue;
          }
          
          // Prüfen, ob die Marke bereits existiert
          const existingBrand = existingBrandsByName.get(brandName.toLowerCase());
          
          if (existingBrand) {
            console.log(`Marke ${brandName} existiert bereits mit ID ${existingBrand.id}`);
            stats.skipped++;
          } else {
            // Neue Marke anlegen
            const [newBrand] = await db.insert(userBrands)
              .values({
                name: brandName,
                deviceTypeId: deviceTypeId,
                userId: superadminUserId,
                shopId: null, // Globale Marke
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log(`Neue Marke ${brandName} angelegt mit ID ${newBrand.id}`);
            stats.added++;
          }
        } catch (error) {
          console.error(`Fehler beim Import der Marke:`, error);
          stats.errors++;
        }
      }
      
      res.json({
        success: true,
        message: "CSV-Import für Marken abgeschlossen",
        stats
      });
    } catch (error) {
      console.error("Fehler beim CSV-Import für Marken:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim CSV-Import für Marken" 
      });
    }
  });

  // CSV-Import für Gerätemodelle
  app.post("/api/superadmin/device-management/import-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { deviceType, brandName, csvData } = req.body;
      
      if (!deviceType || !brandName || !csvData) {
        return res.status(400).json({ 
          success: false,
          message: "Gerätetyp, Markenname und CSV-Daten sind erforderlich" 
        });
      }
      
      console.log(`CSV-Import für Marke ${brandName} und Gerätetyp ${deviceType} gestartet`);
      
      // Superadmin-ID holen
      const superadminUserId = (req.user as any).id;
      console.log(`Import verwendet Superadmin-ID: ${superadminUserId}`);
      
      // Prüfen ob der Gerätetyp existiert, sonst erstellen
      let deviceTypeId: number;
      const [existingDeviceType] = await db.select().from(userDeviceTypes)
        .where(sql`LOWER(${userDeviceTypes.name}) = ${deviceType.toLowerCase()}`);
      
      if (existingDeviceType) {
        deviceTypeId = existingDeviceType.id;
        console.log(`Verwende existierenden Gerätetyp ${deviceType} mit ID ${deviceTypeId}`);
      } else {
        // Neuen Gerätetyp anlegen
        const [newDeviceType] = await db.insert(userDeviceTypes)
          .values({
            name: deviceType,
            userId: superadminUserId,
            shopId: null, // Globaler Gerätetyp
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        deviceTypeId = newDeviceType.id;
        console.log(`Neuer Gerätetyp ${deviceType} angelegt mit ID ${deviceTypeId}`);
      }
      
      // Prüfen ob die Marke existiert, sonst erstellen
      let brandId: number;
      const [existingBrand] = await db.select().from(userBrands)
        .where(sql`LOWER(${userBrands.name}) = ${brandName.toLowerCase()} AND ${userBrands.deviceTypeId} = ${deviceTypeId}`);
      
      if (existingBrand) {
        brandId = existingBrand.id;
        console.log(`Verwende existierende Marke ${brandName} mit ID ${brandId}`);
      } else {
        // Neue Marke anlegen
        const [newBrand] = await db.insert(userBrands)
          .values({
            name: brandName,
            deviceTypeId: deviceTypeId,
            userId: superadminUserId,
            shopId: null, // Globale Marke
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        brandId = newBrand.id;
        console.log(`Neue Marke ${brandName} angelegt mit ID ${brandId}`);
      }
      
      // CSV-Daten parsen
      const { parse } = await import('csv-parse/sync');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      console.log(`${records.length} Modelle in CSV-Datei gefunden`);
      
      // Vorhandene Modelle für diese Marke abrufen
      const existingModels = await db.select().from(userModels).where(eq(userModels.brandId, brandId));
      const existingModelsByName = new Map(
        existingModels.map(model => [model.name.toLowerCase(), model])
      );
      
      // Statistik für den Import
      const stats = {
        total: records.length,
        added: 0,
        skipped: 0,
        errors: 0
      };
      
      // Modelle importieren
      for (const record of records) {
        try {
          const modelName = record.model || record.name || record.Model || record.Name;
          
          if (!modelName) {
            console.warn("Überspringe Zeile ohne Modellnamen");
            stats.skipped++;
            continue;
          }
          
          // Prüfen, ob das Modell bereits existiert
          const existingModel = existingModelsByName.get(modelName.toLowerCase());
          
          if (existingModel) {
            console.log(`Modell ${modelName} existiert bereits mit ID ${existingModel.id}`);
            stats.skipped++;
          } else {
            // Neues Modell anlegen
            const [newModel] = await db.insert(userModels)
              .values({
                name: modelName,
                modelSeriesId: null, // Keine Modellreihe verwenden
                brandId: brandId,
                userId: superadminUserId,
                shopId: null, // Globales Modell
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            
            console.log(`Neues Modell ${modelName} angelegt mit ID ${newModel.id}`);
            stats.added++;
          }
        } catch (error) {
          console.error(`Fehler beim Import des Modells:`, error);
          stats.errors++;
        }
      }
      
      res.json({
        success: true,
        message: "CSV-Import abgeschlossen",
        stats
      });
    } catch (error) {
      console.error("Fehler beim CSV-Import:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim CSV-Import" 
      });
    }
  });
  
  // Kompletten Export aller Gerätedaten (Gerätearten, Hersteller, Modelle, Fehlerkatalog)
  app.get("/api/superadmin/device-management/export", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log("Export aller Gerätedaten gestartet...");
      
      // Alle Daten gleichzeitig laden
      const [
        deviceTypesList, 
        brandsList, 
        modelsList,
        deviceIssuesList
      ] = await Promise.all([
        db.select().from(userDeviceTypes),
        db.select().from(userBrands),
        db.select().from(userModels),
        db.select().from(deviceIssues)
      ]);
      
      console.log(`Exportiere ${deviceTypesList.length} Gerätearten, ${brandsList.length} Hersteller, ${modelsList.length} Modelle und ${deviceIssuesList.length} Fehlereinträge`);
      
      // Bereite die Daten für den Export vor, entferne dabei userId und shopId, 
      // da diese beim Import automatisch gesetzt werden sollen
      
      // Entferne userId und shopId aus den Gerätetypen
      const cleanedDeviceTypes = deviceTypesList.map(({ id, name, createdAt, updatedAt }) => ({
        id,
        name,
        createdAt,
        updatedAt
      }));
      
      // Entferne userId und shopId aus den Marken
      const cleanedBrands = brandsList.map(({ id, name, deviceTypeId, createdAt, updatedAt }) => ({
        id,
        name,
        deviceTypeId,
        createdAt,
        updatedAt
      }));
      
      // Entferne userId und shopId aus den Modellen
      const cleanedModels = modelsList.map(({ id, name, brandId, modelSeriesId, createdAt, updatedAt }) => ({
        id,
        name,
        brandId,
        modelSeriesId,
        createdAt,
        updatedAt
      }));
      
      // Daten für Export zusammenstellen
      const exportData = {
        deviceTypes: cleanedDeviceTypes,
        brands: cleanedBrands,
        // Leerer modelSeries Array für Abwärtskompatibilität hinzufügen
        modelSeries: [],
        models: cleanedModels,
        deviceIssues: deviceIssuesList,
        exportedAt: new Date().toISOString(),
        version: "1.0"
      };
      
      res.json(exportData);
    } catch (error) {
      console.error("Fehler beim Exportieren der Gerätedaten:", error);
      res.status(500).json({ message: "Fehler beim Exportieren der Gerätedaten" });
    }
  });

  // Import aller Gerätedaten (Gerätearten, Hersteller, Modelle, Fehlerkatalog)
  app.post("/api/superadmin/device-management/import", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const importData = req.body;
      
      if (!importData || typeof importData !== 'object') {
        return res.status(400).json({ message: "Ungültige Import-Daten" });
      }
      
      console.log("Import von Gerätedaten gestartet...");
      console.log("Verfügbare Datentypen:", Object.keys(importData));
      
      // Statistik für den Import
      const stats = {
        deviceTypes: 0,
        brands: 0,
        models: 0,
        deviceIssues: 0
      };
      
      // Mappings für IDs (alte ID -> neue ID)
      const idMappings = {
        deviceTypes: new Map<number, number>(),
        brands: new Map<number, number>()
      };
      
      // 1. Gerätearten importieren
      if (importData.deviceTypes && Array.isArray(importData.deviceTypes)) {
        console.log(`Import von ${importData.deviceTypes.length} Gerätearten...`);
        
        // Vorhandene Gerätearten abrufen
        const existingDeviceTypes = await db.select().from(userDeviceTypes);
        const existingDeviceTypesByName = new Map(
          existingDeviceTypes.map(dt => [dt.name.toLowerCase(), dt])
        );
        
        // ID des aktuellen Superadmin-Benutzers für alle Einfügungen verwenden
        const superadminUserId = (req.user as any).id;
        console.log(`Import verwendet Superadmin-ID: ${superadminUserId}`);
        
        for (const deviceType of importData.deviceTypes) {
          try {
            const oldId = deviceType.id;
            const name = deviceType.name;
            
            // Überprüfe, ob userId oder shopId im Importdatensatz vorhanden sind
            if ('userId' in deviceType || 'shopId' in deviceType) {
              console.log(`Ignoriere userId/shopId Werte aus dem JSON für Gerätetyp ${name}`);
            }
            
            // Prüfen, ob bereits ein Gerätetyp mit diesem Namen existiert
            const existingType = existingDeviceTypesByName.get(name.toLowerCase());
            
            if (existingType) {
              // Vorhandenen Gerätetyp verwenden
              idMappings.deviceTypes.set(oldId, existingType.id);
              console.log(`Gerätetyp ${name} existiert bereits mit ID ${existingType.id}`);
            } else {
              // Neuen Gerätetyp anlegen, nur mit explizit definierten Feldern
              // IGNORIERE alle userId und shopId Werte aus der JSON-Datei
              const [newDeviceType] = await db.insert(userDeviceTypes)
                .values({
                  name: name,
                  userId: superadminUserId, // Verwende ausschließlich die ID des aktuellen Superadmins
                  shopId: null, // Immer NULL für globale Einträge
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
              
              idMappings.deviceTypes.set(oldId, newDeviceType.id);
              console.log(`Neuer Gerätetyp ${name} angelegt mit ID ${newDeviceType.id}`);
              stats.deviceTypes++;
            }
          } catch (error) {
            console.error(`Fehler beim Import des Gerätetyps ${deviceType.name}:`, error);
            // Wir machen weiter mit dem nächsten Gerätetyp
          }
        }
      }
      
      // 2. Hersteller importieren
      if (importData.brands && Array.isArray(importData.brands)) {
        console.log(`Import von ${importData.brands.length} Herstellern...`);
        
        // Vorhandene Hersteller abrufen
        const existingBrands = await db.select().from(userBrands);
        const existingBrandsByKey = new Map();
        
        existingBrands.forEach(brand => {
          const key = `${brand.name.toLowerCase()}-${brand.deviceTypeId}`;
          existingBrandsByKey.set(key, brand);
        });
        
        for (const brand of importData.brands) {
          try {
            const oldId = brand.id;
            const name = brand.name;
            const oldDeviceTypeId = brand.deviceTypeId;
            
            // Neue deviceTypeId aus dem Mapping holen
            const newDeviceTypeId = idMappings.deviceTypes.get(oldDeviceTypeId);
            
            if (!newDeviceTypeId) {
              console.warn(`Keine neue ID für Gerätetyp mit ID ${oldDeviceTypeId} gefunden. Überspringe diesen Hersteller.`);
              continue;
            }
            
            // Überprüfe, ob userId oder shopId im Importdatensatz vorhanden sind
            if ('userId' in brand || 'shopId' in brand) {
              console.log(`Ignoriere userId/shopId Werte aus dem JSON für Marke ${name}`);
            }
          
            // Prüfen, ob bereits ein Hersteller mit diesem Namen für diesen Gerätetyp existiert
            const key = `${name.toLowerCase()}-${newDeviceTypeId}`;
            const existingBrand = existingBrandsByKey.get(key);
            
            if (existingBrand) {
              // Vorhandenen Hersteller verwenden
              idMappings.brands.set(oldId, existingBrand.id);
              console.log(`Hersteller ${name} für Gerätetyp ID ${newDeviceTypeId} existiert bereits mit ID ${existingBrand.id}`);
            } else {
              // Neuen Hersteller anlegen, nur mit explizit definierten Feldern
              // IGNORIERE alle userId und shopId Werte aus der JSON-Datei
              const superadminUserId = (req.user as any).id;
              const [newBrand] = await db.insert(userBrands)
                .values({
                  name: name,
                  deviceTypeId: newDeviceTypeId,
                  userId: superadminUserId, // Verwende ausschließlich die ID des aktuellen Superadmins
                  shopId: null, // Immer NULL für globale Einträge
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
              
              idMappings.brands.set(oldId, newBrand.id);
              console.log(`Neuer Hersteller ${name} für Gerätetyp ID ${newDeviceTypeId} angelegt mit ID ${newBrand.id}`);
              stats.brands++;
            }
          } catch (error) {
            console.error(`Fehler beim Import des Herstellers ${brand.name}:`, error);
            // Wir machen weiter mit dem nächsten Hersteller
          }
        }
      }
      
      // 3. Modellreihen werden nicht mehr verwendet
      if (importData.modelSeries && Array.isArray(importData.modelSeries)) {
        console.log(`Modellreihen werden nicht mehr verwendet. ${importData.modelSeries.length} Modellreihen werden ignoriert.`);
      }
      
      // 4. Modelle importieren
      if (importData.models && Array.isArray(importData.models)) {
        console.log(`Import von ${importData.models.length} Modellen...`);
        
        // Vorhandene Modelle abrufen
        const existingModels = await db.select().from(userModels);
        const existingModelsByKey = new Map();
        
        existingModels.forEach(model => {
          // Modelle sind eindeutig durch Name + Hersteller-ID
          const key = `${model.name.toLowerCase()}-${model.brandId}`;
          existingModelsByKey.set(key, model);
        });
        
        for (const model of importData.models) {
          try {
            const name = model.name;
            const oldBrandId = model.brandId;
            const deviceType = model.deviceType;  // Einige Modelle haben ein deviceType-Feld
            
            // Neue brandId aus dem Mapping holen (erforderlich)
            const newBrandId = idMappings.brands.get(oldBrandId);
            
            if (!newBrandId) {
              console.warn(`Keine neue ID für Hersteller ${oldBrandId} gefunden. Überspringe dieses Modell.`);
              continue;
            }
            
            // Überprüfe, ob userId oder shopId im Importdatensatz vorhanden sind
            if ('userId' in model || 'shopId' in model) {
              console.log(`Ignoriere userId/shopId Werte aus dem JSON für Modell ${name}`);
            }
            
            // Schlüssel für die Eindeutigkeit basierend auf Name und Hersteller ID
            const key = `${name.toLowerCase()}-${newBrandId}`;
            const existingModel = existingModelsByKey.get(key);
            
            if (existingModel) {
              console.log(`Modell ${name} für Hersteller ID ${newBrandId} existiert bereits mit ID ${existingModel.id}`);
            } else {
              // Neues Modell anlegen, nur mit explizit definierten Feldern
              // IGNORIERE alle userId und shopId Werte aus der JSON-Datei
              const superadminUserId = (req.user as any).id;
              const [newModel] = await db.insert(userModels)
                .values({
                  name: name,
                  modelSeriesId: null,  // Keine Modellreihe verwenden
                  brandId: newBrandId,
                  userId: superadminUserId, // Verwende ausschließlich die ID des aktuellen Superadmins
                  shopId: null, // Immer NULL für globale Einträge
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
              
              console.log(`Neues Modell ${name} für Hersteller ID ${newBrandId} angelegt mit ID ${newModel.id}`);
              stats.models++;
            }
          } catch (error) {
            console.error(`Fehler beim Import des Modells ${model.name}:`, error);
            // Wir machen weiter mit dem nächsten Modell
          }
        }
      }
      
      // 5. Fehlerkatalog importieren
      if (importData.deviceIssues && Array.isArray(importData.deviceIssues)) {
        console.log(`Import von ${importData.deviceIssues.length} Fehlereinträgen...`);
        
        // Vorhandene Fehlereinträge abrufen
        const existingIssues = await db.select().from(deviceIssues);
        const existingIssuesByKey = new Map();
        
        existingIssues.forEach(issue => {
          // Fehlereinträge sind eindeutig durch Title + deviceType + Description
          const key = `${issue.title.toLowerCase()}-${issue.deviceType}-${issue.description?.toLowerCase() || ''}`;
          existingIssuesByKey.set(key, issue);
        });
        
        for (const issue of importData.deviceIssues) {
          try {
            const title = issue.title || issue.name; // Fallback auf name als Kompatibilität
            const deviceType = issue.deviceType;
            const description = issue.description || '';
            
            // Prüfen, ob bereits ein Fehlereintrag mit diesen Attributen existiert
            const key = `${title.toLowerCase()}-${deviceType}-${description.toLowerCase()}`;
            const existingIssue = existingIssuesByKey.get(key);
            
            if (existingIssue) {
              console.log(`Fehlereintrag "${title}" für Gerätetyp "${deviceType}" existiert bereits mit ID ${existingIssue.id}`);
            } else {
              // Neuen Fehlereintrag anlegen
              const [newIssue] = await db.insert(deviceIssues)
                .values({
                  title: title,
                  deviceType: deviceType,
                  description: description,
                  solution: issue.solution || '',
                  severity: issue.severity || 'medium',
                  isCommon: issue.isCommon || false,
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning();
              
              console.log(`Neuer Fehlereintrag "${title}" für Gerätetyp "${deviceType}" angelegt mit ID ${newIssue.id}`);
              stats.deviceIssues++;
            }
          } catch (error) {
            console.error(`Fehler beim Import des Fehlereintrags ${issue.title || issue.name || 'Unbekannt'}:`, error);
            // Wir machen weiter mit dem nächsten Fehlereintrag
          }
        }
      }
      
      // Gesamtzahl aller Elemente (existierende + neu hinzugefügte)
      const total = {
        deviceTypes: importData.deviceTypes?.length || 0,
        brands: importData.brands?.length || 0,
        models: importData.models?.length || 0,
        deviceIssues: importData.deviceIssues?.length || 0
      };
      
      // Import-Statistik zurückgeben
      res.json({
        success: true,
        message: "Import abgeschlossen",
        stats,     // Nur die neu hinzugefügten Elemente
        total      // Alle importierten Elemente (neu + bereits existierende)
      });
    } catch (error) {
      console.error("Fehler beim Importieren der Gerätedaten:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler beim Importieren der Gerätedaten" 
      });
    }
  });

  // CSV-Export für Marken
  app.get("/api/superadmin/brands/export-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const deviceType = req.query.deviceType as string | undefined;
      let brands;
      
      // Falls ein Gerätetyp angegeben wurde, filtere die Marken nach diesem Typ
      if (deviceType) {
        // Finde zuerst die IDs der Gerätetypen, die dem Namen entsprechen
        const deviceTypeResult = await db.select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.name, deviceType));
        
        if (deviceTypeResult.length === 0) {
          return res.status(404).send(`Gerätetyp "${deviceType}" nicht gefunden.`);
        }
        
        const deviceTypeId = deviceTypeResult[0].id;
        
        // Hole alle Marken mit diesem Gerätetyp
        brands = await db.select()
          .from(userBrands)
          .where(eq(userBrands.deviceTypeId, deviceTypeId));
      } else {
        // Hole alle Marken
        brands = await db.select().from(userBrands);
      }
      
      // Wenn keine Marken gefunden wurden, gib eine leere CSV zurück
      if (brands.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="marken${deviceType ? `-${deviceType.toLowerCase()}` : ''}.csv"`);
        return res.send('name,deviceType\n');
      }
      
      // Mappe die Marken zu einem Array von Objekten mit den relevanten Informationen
      const mappedBrands = await Promise.all(brands.map(async (brand) => {
        // Gerätetyp-Name anhand der deviceTypeId ermitteln
        const deviceTypeResult = await db.select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.id, brand.deviceTypeId));
        
        const deviceTypeName = deviceTypeResult.length > 0 ? deviceTypeResult[0].name : 'Unbekannt';
        
        return {
          name: brand.name,
          deviceType: deviceTypeName
        };
      }));
      
      // CSV-Header
      let csvContent = 'name,deviceType\n';
      
      // CSV-Inhalt generieren
      mappedBrands.forEach(brand => {
        csvContent += `${brand.name},${brand.deviceType}\n`;
      });
      
      // CSV-Datei zurückgeben
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="marken${deviceType ? `-${deviceType.toLowerCase()}` : ''}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Fehler beim CSV-Export der Marken:", error);
      res.status(500).send(`Fehler beim CSV-Export der Marken: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  });
  
  // CSV-Export für Modelle
  app.get("/api/superadmin/models/export-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const deviceType = req.query.deviceType as string | undefined;
      let models;
      
      if (deviceType) {
        // Finde zuerst die IDs der Gerätetypen, die dem Namen entsprechen
        const deviceTypeResult = await db.select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.name, deviceType));
        
        if (deviceTypeResult.length === 0) {
          return res.status(404).send(`Gerätetyp "${deviceType}" nicht gefunden.`);
        }
        
        const deviceTypeId = deviceTypeResult[0].id;
        
        // Finde alle Marken mit diesem Gerätetyp
        const brands = await db.select()
          .from(userBrands)
          .where(eq(userBrands.deviceTypeId, deviceTypeId));
        
        if (brands.length === 0) {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="modelle${deviceType ? `-${deviceType.toLowerCase()}` : ''}.csv"`);
          return res.send('name,brandName,deviceType\n');
        }
        
        // Extrahiere die brandIds für die Abfrage
        const brandIds = brands.map(brand => brand.id);
        
        // Hole alle Modelle dieser Marken
        models = await db.select()
          .from(userModels)
          .where(inArray(userModels.brandId, brandIds));
      } else {
        // Hole alle Modelle
        models = await db.select().from(userModels);
      }
      
      // Wenn keine Modelle gefunden wurden, gib eine leere CSV zurück
      if (models.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="modelle${deviceType ? `-${deviceType.toLowerCase()}` : ''}.csv"`);
        return res.send('name,brandName,deviceType\n');
      }
      
      // Mappe die Modelle zu einem Array von Objekten mit den relevanten Informationen
      const mappedModels = await Promise.all(models.map(async (model) => {
        // Markenname anhand der brandId ermitteln
        const brandResult = await db.select()
          .from(userBrands)
          .where(eq(userBrands.id, model.brandId));
        
        if (brandResult.length === 0) {
          return null; // Überspringe Modelle ohne gültige Marke
        }
        
        const brand = brandResult[0];
        
        // Gerätetyp-Name anhand der deviceTypeId der Marke ermitteln
        const deviceTypeResult = await db.select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.id, brand.deviceTypeId));
        
        const deviceTypeName = deviceTypeResult.length > 0 ? deviceTypeResult[0].name : 'Unbekannt';
        
        return {
          name: model.name,
          brandName: brand.name,
          deviceType: deviceTypeName
        };
      })).then(models => models.filter(model => model !== null)); // Filtere Modelle ohne gültige Marke heraus
      
      // CSV-Header
      let csvContent = 'name,brandName,deviceType\n';
      
      // CSV-Inhalt generieren
      mappedModels.forEach(model => {
        if (model) {
          csvContent += `${model.name},${model.brandName},${model.deviceType}\n`;
        }
      });
      
      // CSV-Datei zurückgeben
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="modelle${deviceType ? `-${deviceType.toLowerCase()}` : ''}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Fehler beim CSV-Export der Modelle:", error);
      res.status(500).send(`Fehler beim CSV-Export der Modelle: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  });
  
  // CSV-Import für Marken
  app.post("/api/superadmin/brands/import-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).send("Keine Datei hochgeladen");
      }
      
      const csvFile = req.files.file as UploadedFile;
      
      if (csvFile.mimetype !== 'text/csv' && !csvFile.name.endsWith('.csv')) {
        return res.status(400).send("Die hochgeladene Datei ist keine CSV-Datei");
      }
      
      const csvContent = csvFile.data.toString('utf8');
      const lines = csvContent.split('\n');
      
      // Überprüfe, ob die Datei einen Header hat
      if (lines.length === 0) {
        return res.status(400).send("Die CSV-Datei ist leer");
      }
      
      // Überprüfe die Header-Zeile
      const header = lines[0].trim().split(',');
      if (!header.includes('name') || !header.includes('deviceType')) {
        return res.status(400).send("Die CSV-Datei muss die Spalten 'name' und 'deviceType' enthalten");
      }
      
      const nameIndex = header.indexOf('name');
      const deviceTypeIndex = header.indexOf('deviceType');
      
      // Sammle alle Marken aus der CSV-Datei
      const brands = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const values = line.split(',');
          if (values.length >= Math.max(nameIndex, deviceTypeIndex) + 1) {
            brands.push({
              name: values[nameIndex],
              deviceType: values[deviceTypeIndex]
            });
          }
        }
      }
      
      // Sicherstellen, dass wir eine gültige userId haben
      const userId = (req.user as Express.User)?.id || (req.user as Express.User)?.userId;
      
      if (!userId) {
        return res.status(400).send("Ungültige Benutzer-ID");
      }
      
      // Importiere die Marken in die Datenbank
      let importedCount = 0;
      
      for (const brand of brands) {
        // Überprüfe, ob der Gerätetyp existiert
        const deviceTypeResult = await db.select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.name, brand.deviceType));
        
        let deviceTypeId;
        
        if (deviceTypeResult.length === 0) {
          // Erstelle den Gerätetyp, falls er noch nicht existiert
          const [newDeviceType] = await db.insert(userDeviceTypes)
            .values({
              name: brand.deviceType,
              userId,
              shopId: null, // Global verfügbar machen
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          deviceTypeId = newDeviceType.id;
        } else {
          deviceTypeId = deviceTypeResult[0].id;
        }
        
        // Überprüfe, ob die Marke bereits existiert
        const existingBrand = await db.select()
          .from(userBrands)
          .where(and(
            eq(userBrands.name, brand.name),
            eq(userBrands.deviceTypeId, deviceTypeId)
          ));
        
        if (existingBrand.length === 0) {
          // Erstelle die Marke, falls sie noch nicht existiert
          await db.insert(userBrands)
            .values({
              name: brand.name,
              deviceTypeId,
              userId,
              shopId: null, // Global verfügbar machen
              createdAt: new Date(),
              updatedAt: new Date()
            });
          
          importedCount++;
        }
      }
      
      res.json({ importedCount });
    } catch (error) {
      console.error("Fehler beim CSV-Import der Marken:", error);
      res.status(500).send(`Fehler beim CSV-Import der Marken: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  });
  
  // CSV-Import für Modelle
  app.post("/api/superadmin/models/import-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).send("Keine Datei hochgeladen");
      }
      
      const csvFile = req.files.file as UploadedFile;
      
      if (csvFile.mimetype !== 'text/csv' && !csvFile.name.endsWith('.csv')) {
        return res.status(400).send("Die hochgeladene Datei ist keine CSV-Datei");
      }
      
      const csvContent = csvFile.data.toString('utf8');
      const lines = csvContent.split('\n');
      
      // Überprüfe, ob die Datei einen Header hat
      if (lines.length === 0) {
        return res.status(400).send("Die CSV-Datei ist leer");
      }
      
      // Überprüfe die Header-Zeile
      const header = lines[0].trim().split(',');
      if (!header.includes('name') || !header.includes('brandName') || !header.includes('deviceType')) {
        return res.status(400).send("Die CSV-Datei muss die Spalten 'name', 'brandName' und 'deviceType' enthalten");
      }
      
      const nameIndex = header.indexOf('name');
      const brandNameIndex = header.indexOf('brandName');
      const deviceTypeIndex = header.indexOf('deviceType');
      
      // Sammle alle Modelle aus der CSV-Datei
      const models = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const values = line.split(',');
          if (values.length >= Math.max(nameIndex, brandNameIndex, deviceTypeIndex) + 1) {
            models.push({
              name: values[nameIndex],
              brandName: values[brandNameIndex],
              deviceType: values[deviceTypeIndex]
            });
          }
        }
      }
      
      // Sicherstellen, dass wir eine gültige userId haben
      const userId = (req.user as Express.User)?.id || (req.user as Express.User)?.userId;
      
      if (!userId) {
        return res.status(400).send("Ungültige Benutzer-ID");
      }
      
      // Importiere die Modelle in die Datenbank
      let importedCount = 0;
      
      for (const model of models) {
        // Überprüfe, ob der Gerätetyp existiert
        const deviceTypeResult = await db.select()
          .from(userDeviceTypes)
          .where(eq(userDeviceTypes.name, model.deviceType));
        
        let deviceTypeId;
        
        if (deviceTypeResult.length === 0) {
          // Erstelle den Gerätetyp, falls er noch nicht existiert
          const [newDeviceType] = await db.insert(userDeviceTypes)
            .values({
              name: model.deviceType,
              userId,
              shopId: null, // Global verfügbar machen
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          deviceTypeId = newDeviceType.id;
        } else {
          deviceTypeId = deviceTypeResult[0].id;
        }
        
        // Überprüfe, ob die Marke existiert
        let brandResult = await db.select()
          .from(userBrands)
          .where(and(
            eq(userBrands.name, model.brandName),
            eq(userBrands.deviceTypeId, deviceTypeId)
          ));
        
        let brandId;
        
        if (brandResult.length === 0) {
          // Erstelle die Marke, falls sie noch nicht existiert
          const [newBrand] = await db.insert(userBrands)
            .values({
              name: model.brandName,
              deviceTypeId,
              userId,
              shopId: null, // Global verfügbar machen
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          brandId = newBrand.id;
        } else {
          brandId = brandResult[0].id;
        }
        
        // Überprüfe, ob das Modell bereits existiert
        const existingModel = await db.select()
          .from(userModels)
          .where(and(
            eq(userModels.name, model.name),
            eq(userModels.brandId, brandId)
          ));
        
        if (existingModel.length === 0) {
          // Erstelle das Modell, falls es noch nicht existiert
          await db.insert(userModels)
            .values({
              name: model.name,
              brandId,
              modelSeriesId: null, // Keine Modellserie verwenden
              userId,
              shopId: null, // Global verfügbar machen
              createdAt: new Date(),
              updatedAt: new Date()
            });
          
          importedCount++;
        }
      }
      
      res.json({ importedCount });
    } catch (error) {
      console.error("Fehler beim CSV-Import der Modelle:", error);
      res.status(500).send(`Fehler beim CSV-Import der Modelle: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  });
}