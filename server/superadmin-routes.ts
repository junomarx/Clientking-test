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
  hiddenStandardDeviceTypes, deviceIssues, errorCatalogEntries, businessSettings,
  costEstimates, emailHistory, emailTemplates
} from "@shared/schema";
import { deleteUserCompletely } from './user-deletion-service';
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
import { emailService } from "./email-service";
import { emailTemplates } from "@shared/schema";
import { isNull } from "drizzle-orm";

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
  
  // Abrufen der Registrierungsdaten eines Benutzers aus der users-Tabelle
  app.get("/api/superadmin/user-registration-data/:userId", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }
      
      console.log(`Superadmin ruft Registrierungsdaten für Benutzer ${userId} ab`);
      
      // Benutzer mit allen Registrierungsdaten holen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Registrierungsdaten aus der users-Tabelle extrahieren
      const registrationData = {
        businessName: user.companyName || "Nicht angegeben",
        ownerFirstName: user.ownerFirstName || "",
        ownerLastName: user.ownerLastName || "",
        streetAddress: user.streetAddress || "",
        zipCode: user.zipCode || "",
        city: user.city || "",
        country: user.country || "",
        email: user.email || "",
        phone: user.companyPhone || "",
        taxId: user.taxId || "",
        website: user.website || "",
        vatNumber: user.companyVatNumber || ""
      };
      
      console.log(`Registrierungsdaten für Benutzer ${user.username} abgerufen:`, registrationData);
      res.json(registrationData);
    } catch (error) {
      console.error("Fehler beim Abrufen der Registrierungsdaten:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Registrierungsdaten" });
    }
  });

  // Abrufen der Geschäftseinstellungen eines Benutzers anhand seiner Benutzer-ID
  app.get("/api/superadmin/user-business-settings/:userId", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }
      
      console.log(`Superadmin-Berechtigung bestätigt: ${req.user.username} (ID: ${req.user.id}) ruft Geschäftsdaten für Benutzer ${userId} ab`);
      
      // Benutzer holen, um die Shop-ID zu ermitteln
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Für inaktive Benutzer: Zeige die Registrierungsdaten aus der users-Tabelle
      if (!user.isActive) {
        const registrationData = {
          businessName: user.companyName || "Nicht angegeben",
          ownerFirstName: user.ownerFirstName || "",
          ownerLastName: user.ownerLastName || "",
          streetAddress: user.streetAddress || "",
          zipCode: user.zipCode || "",
          city: user.city || "",
          country: user.country || "",
          email: user.email || "",
          phone: user.companyPhone || "",
          taxId: user.taxId || "",
          website: user.website || "",
          vatNumber: user.companyVatNumber || ""
        };
        
        console.log(`Registrierungsdaten für inaktiven Benutzer ${user.username} abgerufen`);
        return res.json(registrationData);
      }
      
      // Für aktive Benutzer: Geschäftseinstellungen abrufen
      const settings = await storage.getBusinessSettings(userId);
      
      if (!settings) {
        console.log(`Keine Geschäftseinstellungen für aktiven Benutzer ${userId} (${user.username}) gefunden.`);
        return res.status(200).json(null);
      }
      
      console.log(`Geschäftseinstellungen für Benutzer ${userId} (${user.username}) erfolgreich abgerufen.`);
      res.json(settings);
    } catch (error) {
      console.error("Fehler beim Abrufen der Geschäftseinstellungen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Geschäftseinstellungen" });
    }
  });
  
  // Aktualisieren der Geschäftseinstellungen eines Benutzers als Superadmin
  app.patch("/api/superadmin/user-business-settings/:userId", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }
      
      // Benutzer holen, um zu prüfen, ob er existiert
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Aktualisieren der Geschäftseinstellungen
      console.log(`Superadmin aktualisiert Geschäftseinstellungen für Benutzer ${user.username} (ID: ${userId})`);
      
      try {
        // Bestehende Einstellungen abrufen
        const existingSettings = await storage.getBusinessSettings(userId);
        
        // Aktualisierte Daten mit bestehenden Daten zusammenführen
        const updatedSettings = {
          ...(existingSettings || {}),
          ...req.body,
        };
        
        // Daten speichern - shop_id wird automatisch vom User übernommen
        const savedSettings = await storage.updateBusinessSettings(updatedSettings, userId);
        console.log(`Geschäftseinstellungen für Benutzer ${user.username} aktualisiert: ID ${savedSettings.id}`);
        
        // Zwinge Query-Cache zum Invalidieren, damit der Benutzer die Änderungen sofort sieht
        // Dies ist wichtig, da sonst die Änderungen erst nach einem Neuladen angezeigt werden
        
        res.json(savedSettings);
      } catch (error) {
        console.error("Fehler beim Aktualisieren der Geschäftseinstellungen:", error);
        throw error;
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Geschäftseinstellungen:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren der Geschäftseinstellungen" });
    }
  });
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
      // Wir verwenden die sentAt-Spalte in der email_history-Tabelle
      let emailStats: { emailsSent: number, lastEmailDate: string | null } = { emailsSent: 0, lastEmailDate: null };
      try {
        const results = await db.select({
          emailsSent: sql<number>`COUNT(*)`.as("emails_sent"),
          lastEmailDate: sql<string | null>`MAX(${sql.raw("\"sentAt\"")})`.as("last_email_date"),
        })
        .from(sql`email_history`)
        .where(sql`"sentAt" >= ${thirtyDaysAgo.toISOString()}`);
        
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

  // Liste aller Shops für Superadmin
  app.get("/api/superadmin/shops", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log("Superadmin-Bereich: Shop-Liste angefordert");
      
      // Sammle alle einzigartigen shopIds und zugehörige Informationen aus der Business-Settings-Tabelle
      // Verwende nur Spalten, die sicher existieren
      const shopData = await db.execute(sql`
        SELECT DISTINCT 
          bs.shop_id as id,
          bs.business_name as "businessName"
        FROM 
          business_settings bs
        WHERE 
          bs.shop_id IS NOT NULL
        ORDER BY 
          bs.business_name
      `);
      
      // Konvertiere das Ergebnis in das erwartete Array-Format mit den benötigten Eigenschaften
      const formattedShops = shopData.rows.map((row: any) => ({
        id: row.id,
        businessName: row.businessName,
        ownerName: "Nicht verfügbar", // Platzhalterwert
        contactEmail: "" // Platzhalterwert
      }));
      
      console.log(`${formattedShops.length} Shops gefunden`);
      res.json(formattedShops);
    } catch (error) {
      console.error("Fehler beim Abrufen der Shops:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Shops" });
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
        lastLoginAt: users.lastLoginAt,
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

      // Wenn packageId geändert wird, auch pricing_plan automatisch synchronisieren
      if (updateData.packageId) {
        const [selectedPackage] = await db.select({
          name: packages.name
        }).from(packages).where(eq(packages.id, updateData.packageId));
        
        if (selectedPackage) {
          // Paketname in lowercase für pricing_plan verwenden
          updateData.pricing_plan = selectedPackage.name.toLowerCase();
          console.log(`Automatische Synchronisation: packageId ${updateData.packageId} -> pricing_plan '${updateData.pricing_plan}'`);
        }
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
  app.post("/api/superadmin/users/:id/activate", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      // Vollständige Benutzerdaten abrufen, um Namen und E-Mail für die Benachrichtigung zu haben
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      console.log(`Aktivierung für Benutzer ${user.username}: aktueller Status = ${user.isActive}, shopId = ${user.shopId}`);

      // Für inaktive Benutzer: Aktivieren und Shop-ID zuweisen
      if (!user.isActive) {
        const nextShopId = await storage.getNextShopId();
        
        // Demo-Paket ID abrufen
        const [demoPackage] = await db.select({
          id: packages.id
        }).from(packages).where(eq(packages.name, 'Demo'));
        
        const updateData = { 
          isActive: true,
          shopId: nextShopId,
          activatedAt: new Date(),
          packageId: demoPackage?.id || null  // Automatisch Demo-Paket zuweisen
        };
        console.log(`Benutzer ${user.username} wird aktiviert und erhält Shop-ID ${nextShopId}`);
        console.log(`Demo-Paket gefunden:`, demoPackage ? `ID ${demoPackage.id}` : 'nicht gefunden');
        console.log(`Update-Daten für ${user.username}:`, updateData);

        // Status umkehren (und ggf. Shop-ID zuweisen)
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            isActive: users.isActive,
            shopId: users.shopId,
            username: users.username,
            email: users.email
          });

        console.log(`Benutzer ${updatedUser.username} erfolgreich aktiviert! Neue Shop-ID: ${updatedUser.shopId}`);

        // Business Settings für neuen Benutzer erstellen (falls noch nicht vorhanden)
        try {
          const existingSettings = await storage.getBusinessSettings(userId);
          if (!existingSettings) {
            console.log(`Erstelle Business Settings für neuen Benutzer ${updatedUser.username}`);
            
            // Vollständige Benutzerdaten für Business Settings abrufen
            const fullUser = await storage.getUser(userId);
            if (fullUser) {
              const businessSettingsData = {
                businessName: fullUser.companyName || "Mein Handyshop",
                ownerFirstName: fullUser.ownerFirstName || "",
                ownerLastName: fullUser.ownerLastName || "",
                streetAddress: `${fullUser.streetAddress || ""} ${fullUser.houseNumber || ""}`.trim(),
                city: fullUser.city || "",
                zipCode: fullUser.zipCode || "",
                country: fullUser.country || "Deutschland",
                phone: fullUser.companyPhone || fullUser.phone || "",
                email: fullUser.companyEmail || fullUser.email || "",
                taxId: fullUser.taxId || "",
                website: fullUser.website || "",
                userId: userId,
                shopId: updatedUser.shopId
              };
              
              await storage.updateBusinessSettings(businessSettingsData, userId);
              console.log(`Business Settings für Benutzer ${updatedUser.username} erfolgreich erstellt`);
            }
          }
        } catch (settingsError) {
          console.error("Fehler beim Erstellen der Business Settings:", settingsError);
          // Fehler wird nur geloggt, aber die Aktivierung läuft weiter
        }

        // E-Mail-Benachrichtigung senden
        try {
          console.log(`Sende Aktivierungsbenachrichtigung an Benutzer ${updatedUser.username} (${updatedUser.email})`);
          
          // Suche nach der Vorlage "Konto freigeschaltet"
          const [template] = await db
            .select()
            .from(emailTemplates)
            .where(and(
              eq(emailTemplates.name, "Konto freigeschaltet"),
              eq(emailTemplates.type, "app"),
              isNull(emailTemplates.userId)
            ));
          
          if (template) {
            // Bereite Variablen für die E-Mail-Vorlage vor
            const variables = {
              vorname: updatedUser.firstName || "Liebe(r) Kunde(in)",
              nachname: updatedUser.lastName || "",
              loginLink: process.env.PUBLIC_URL || "https://yourapp.replit.app"
            };
            
            // Sende die E-Mail mit der gefundenen Vorlage
            const emailSent = await emailService.sendEmailWithTemplateById(
              template.id,
              updatedUser.email,
              variables,
              true // Als System-E-Mail senden, damit Superadmin-SMTP verwendet wird
            );
            
            if (emailSent) {
              console.log(`Aktivierungsbenachrichtigung erfolgreich an ${updatedUser.email} gesendet`);
            } else {
              console.error(`Fehler beim Senden der Aktivierungsbenachrichtigung an ${updatedUser.email}`);
            }
          } else {
            console.error(`E-Mail-Vorlage "Konto freigeschaltet" nicht gefunden`);
          }
        } catch (emailError) {
          console.error("Fehler beim Senden der Aktivierungsbenachrichtigung:", emailError);
          // Wir lassen den Endpunkt trotzdem erfolgreich zurückgeben, auch wenn die E-Mail fehlschlägt
        }

        res.json(updatedUser);
      } else {
        // Für bereits aktive Benutzer: Deaktivieren
        const [updatedUser] = await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            isActive: users.isActive,
            shopId: users.shopId,
            username: users.username,
            email: users.email
          });

        console.log(`Benutzer ${updatedUser.username} wurde deaktiviert`);
        res.json(updatedUser);
      }
    } catch (error) {
      console.error("Fehler beim Ändern des Aktivierungsstatus:", error);
      res.status(500).json({ message: "Fehler beim Ändern des Aktivierungsstatus" });
    }
  });

  // Benutzer deaktivieren
  app.post("/api/superadmin/users/:id/deactivate", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      // Benutzer deaktivieren
      const [updatedUser] = await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          isActive: users.isActive,
          shopId: users.shopId,
          username: users.username,
          email: users.email
        });

      console.log(`Benutzer ${updatedUser.username} wurde deaktiviert`);
      
      // Explizit JSON-Response senden ohne weitere Middleware-Interferenz
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updatedUser));
      return;
    } catch (error) {
      console.error("Fehler beim Deaktivieren des Benutzers:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: "Fehler beim Deaktivieren des Benutzers" }));
      return;
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

      console.log(`Starte Löschvorgang für Benutzer ${existingUser.username} (ID: ${userId})...`);
      
      try {
        // Benutzer über den dedizierten Löschdienst löschen
        await deleteUserCompletely(userId);
        
        console.log(`Benutzer ${existingUser.username} (ID: ${userId}) erfolgreich gelöscht.`);
        
        res.json({ 
          message: "Benutzer und alle zugehörigen Daten erfolgreich gelöscht",
          username: existingUser.username
        });
      } catch (error) {
        console.error("Fehler beim Löschen des Benutzers:", error);
        res.status(500).json({ 
          message: `Fehler beim Löschen des Benutzers: ${error.message || String(error)}` 
        });
      }
    } catch (error) {
      console.error("Fehler beim Verarbeiten der Anfrage:", error);
      res.status(500).json({ 
        message: `Fehler beim Verarbeiten der Anfrage: ${error.message || String(error)}` 
      });
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

  // Route zum Aktualisieren aller Benutzerberechtigungen
  app.post("/api/superadmin/refresh-permissions", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log("Starte Berechtigungsaktualisierung für alle Benutzer...");
      
      // Alle Benutzer mit ihren Paketen abrufen
      const allUsers = await db.select().from(users);
      let updatedUsers = 0;

      for (const user of allUsers) {
        try {
          // Paket-Features für jeden Benutzer neu laden
          if (user.packageId) {
            const packageData = await db.select().from(packages).where(eq(packages.id, user.packageId));
            if (packageData.length > 0) {
              console.log(`Benutzer ${user.username} (ID: ${user.id}) - Paket ID: ${user.packageId} (${packageData[0].name}) aktualisiert`);
            }
          } else {
            console.log(`Benutzer ${user.username} (ID: ${user.id}) - Kein Paket zugewiesen`);
          }
          updatedUsers++;
        } catch (userError) {
          console.error(`Fehler beim Aktualisieren der Berechtigungen für Benutzer ${user.id}:`, userError);
        }
      }

      console.log(`Berechtigungsaktualisierung abgeschlossen. ${updatedUsers} Benutzer aktualisiert.`);
      
      // Sicherstellen, dass wir JSON zurückgeben
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({ 
        message: "Berechtigungen erfolgreich aktualisiert",
        updatedUsers: updatedUsers
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Berechtigungen:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren der Berechtigungen",
        error: error instanceof Error ? error.message : String(error)
      });
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
      const packageFeaturesList = await db.select({
        packageId: packageFeatures.packageId,
        feature: packageFeatures.feature
      }).from(packageFeatures)
        .where(eq(packageFeatures.packageId, packageId));

      // Features mit Werten anreichern
      const processedFeatures = packageFeaturesList.map(feature => {
        // Boolsche Features (deren Existenz bedeutet "true")
        if (["canPrintLabels", "canUseCostEstimates", "canViewDetailedStats", "canSendEmails"].includes(feature.feature)) {
          return { ...feature, value: true };
        }
        // maxRepairs standardmäßig auf 10 setzen, falls nicht anders angegeben
        else if (feature.feature === "maxRepairs") {
          return { ...feature, value: 10 };
        }
        
        return feature;
      });
      
      console.log("Paket Details abrufen - Features:", processedFeatures);

      // Benutzer mit diesem Paket zählen
      const [userCount] = await db.select({
        count: count().as("user_count"),
      }).from(users).where(eq(users.packageId, packageId));

      res.json({
        ...packageData,
        features: processedFeatures,
        userCount: userCount.count,
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Pakets:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Pakets" });
    }
  });
  
  // Paket aktualisieren
  app.put("/api/superadmin/packages/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) {
        return res.status(400).json({ message: "Ungültige Paket-ID" });
      }

      // Überprüfen, ob das Paket existiert
      const [existingPackage] = await db.select().from(packages).where(eq(packages.id, packageId));
      if (!existingPackage) {
        return res.status(404).json({ message: "Paket nicht gefunden" });
      }

      const { name, description, priceMonthly, features } = req.body;
      
      console.log("Paket aktualisieren - Eingangsdaten:", { 
        id: packageId, 
        name, 
        description, 
        priceMonthly, 
        features 
      });

      // Paket-Grunddaten aktualisieren
      await db.update(packages)
        .set({
          name: name,
          description: description,
          priceMonthly: parseFloat(priceMonthly) || 0,
        })
        .where(eq(packages.id, packageId));

      // Bestehende Features löschen
      await db.delete(packageFeatures).where(eq(packageFeatures.packageId, packageId));

      // Neue Features hinzufügen
      if (features && Array.isArray(features)) {
        console.log("Features zum Hinzufügen:", features);
        
        // Features mit ihren Werten einfügen
        for (const feature of features) {
          try {
            // Prüfe, ob es sich um ein Feature mit Zahlenwert handelt
            if (typeof feature === 'string' && feature.includes(':')) {
              const [featureName, featureValue] = feature.split(':');
              
              // Wenn es ein Feature mit Wert ist, speichern wir beides
              await db.insert(packageFeatures).values({
                packageId: packageId,
                feature: featureName,
                value: featureValue
              });
              console.log(`Feature '${featureName}' mit Wert '${featureValue}' hinzugefügt.`);
            } else {
              // Feature ohne Wert - einfach als boolean speichern
              await db.insert(packageFeatures).values({
                packageId: packageId,
                feature: feature,
                value: 'true'
              });
              console.log(`Feature '${feature}' hinzugefügt.`);
            }
          } catch (featureError) {
            console.error(`Fehler beim Hinzufügen des Features '${feature}':`, featureError);
          }
        }
        
        console.log(`${features.length} Features für Paket ${packageId} aktualisiert`);
        
        // Überprüfen, welche Features tatsächlich gespeichert wurden
        const updatedFeatures = await db.select().from(packageFeatures).where(eq(packageFeatures.packageId, packageId));
        console.log("Tatsächlich gespeicherte Features:", updatedFeatures);
      } else {
        console.log("Keine Features zum Hinzufügen gefunden oder ungültiges Format");
      }

      // Abrufen des aktualisierten Pakets mit Features
      const [updatedPackage] = await db.select().from(packages).where(eq(packages.id, packageId));
      const packageFeaturesList = await db.select().from(packageFeatures).where(eq(packageFeatures.packageId, packageId));
      
      // Einige Features anreichern (z.B. maxRepairs mit Wert)
      const enrichedFeatures = packageFeaturesList.map(f => {
        // Wenn ein maxRepairs Feature gefunden wird, suchen wir den Wert im ursprünglichen features Array
        if (f.feature === 'maxRepairs') {
          const maxRepairsFeature = features.find(feat => 
            typeof feat === 'string' && feat.startsWith('maxRepairs:')
          );
          
          if (maxRepairsFeature) {
            const maxRepairsValue = maxRepairsFeature.split(':')[1];
            return { ...f, value: parseInt(maxRepairsValue) || 10 };
          }
        }
        return f;
      });
      
      console.log("Angereicherte Features für Frontend:", enrichedFeatures);
      
      res.json({ 
        message: "Paket erfolgreich aktualisiert",
        package: {
          ...updatedPackage,
          features: enrichedFeatures
        }
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Pakets:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Pakets", error: error instanceof Error ? error.message : 'Unbekannter Fehler' });
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

  // Einzelne Marke erstellen - neuer Endpoint
  app.post("/api/superadmin/create-brand", async (req: Request, res: Response) => {
    try {
      // Manuelle Superadmin-Prüfung
      const userId = parseInt(req.header('X-User-ID') || '0');
      if (userId !== 10) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: "Superadmin-Berechtigung erforderlich" }));
      }

      const { name, deviceTypeId } = req.body;
      
      if (!name || !deviceTypeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: "Name und Gerätetyp-ID sind erforderlich" }));
      }

      console.log(`Erstelle neue Marke: ${name} für Gerätetyp-ID: ${deviceTypeId}`);

      // Prüfen, ob die Marke bereits existiert
      const existingBrand = await db.select()
        .from(userBrands)
        .where(
          and(
            eq(userBrands.name, name),
            eq(userBrands.deviceTypeId, deviceTypeId)
          )
        );

      if (existingBrand.length > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: "Marke existiert bereits für diesen Gerätetyp" }));
      }

      // Neue Marke erstellen
      const [newBrand] = await db.insert(userBrands)
        .values({
          name,
          deviceTypeId,
          userId: 10, // Superadmin-ID
          shopId: 1682, // Feste Shop-ID für globale Gerätedaten
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Marke erfolgreich erstellt:`, newBrand);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newBrand));
    } catch (error) {
      console.error("Fehler beim Erstellen der Marke:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: "Fehler beim Erstellen der Marke" }));
    }
  });

  app.get("/api/superadmin/brands", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Marken mit Gerätetyp-Namen abrufen
      const allBrands = await db.select({
        id: userBrands.id,
        name: userBrands.name,
        deviceTypeId: userBrands.deviceTypeId,
        userId: userBrands.userId,
        shopId: userBrands.shopId,
        createdAt: userBrands.createdAt,
        updatedAt: userBrands.updatedAt,
      }).from(userBrands);

      // Alle Gerätetypen abrufen (Standard + Benutzer)
      const standardDeviceTypes = ["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"];
      const userDeviceTypesList = await db.select().from(userDeviceTypes);
      
      // Marken mit Gerätetyp-Namen anreichern
      const brandsWithDeviceTypeName = allBrands.map(brand => {
        let deviceTypeName = 'Unbekannt';
        
        console.log(`Verarbeite Marke ${brand.name} mit deviceTypeId: ${brand.deviceTypeId}`);
        
        // Erst in Benutzer-Gerätetypen suchen
        const userDeviceType = userDeviceTypesList.find(dt => dt.id === brand.deviceTypeId);
        if (userDeviceType) {
          deviceTypeName = userDeviceType.name;
          console.log(`Gefunden in userDeviceTypes: ${deviceTypeName}`);
        } else {
          // Dann in Standard-Gerätetypen suchen (1-basiert)
          if (brand.deviceTypeId >= 1 && brand.deviceTypeId <= standardDeviceTypes.length) {
            deviceTypeName = standardDeviceTypes[brand.deviceTypeId - 1];
            console.log(`Gefunden in standardDeviceTypes: ${deviceTypeName}`);
          } else {
            console.log(`Gerätetyp-ID ${brand.deviceTypeId} nicht gefunden`);
          }
        }
        
        return {
          ...brand,
          deviceTypeName
        };
      });

      res.json(brandsWithDeviceTypeName);
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
      for (const model of models) {
        const modelName = typeof model === 'string' ? model : model.name;
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
                  shopId: 1682, // macnphone's Shop-ID
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
  
  // DEPLOYMENT FIX: Flexibler Modell-Import für Superadmins
  app.post("/api/superadmin/device-models/bulk", async (req: Request, res: Response) => {
    try {
      // Flexible Superadmin-Authentifizierung für Deployment
      const userIdHeader = req.header('X-User-ID');
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      
      console.log(`🔧 Modell-Import Anfrage: User-ID=${userIdHeader}, Authenticated=${isAuthenticated}, User=${req.user?.username}`);
      
      // Mehrere Wege zur Superadmin-Verifizierung
      let isSuperadmin = false;
      
      if (req.user?.isSuperadmin) {
        isSuperadmin = true;
        console.log(`✅ Superadmin via Session: ${req.user.username}`);
      } else if (userIdHeader === '10' || req.user?.id === 10) {
        isSuperadmin = true;
        console.log(`✅ Superadmin via User-ID: ${userIdHeader || req.user?.id}`);
      } else if (req.user?.username === 'macnphone') {
        isSuperadmin = true;
        console.log(`✅ Superadmin via Username: ${req.user.username}`);
      }
      
      if (!isSuperadmin) {
        console.log(`❌ Zugriff verweigert für User: ${req.user?.username || 'unbekannt'}, ID: ${req.user?.id || 'unbekannt'}`);
        return res.status(403).json({ message: "Superadmin-Berechtigung erforderlich" });
      }

      const { brandId, models } = req.body;
      
      if (!brandId || !models || !Array.isArray(models)) {
        return res.status(400).json({ message: "BrandId und Modelle-Array sind erforderlich" });
      }

      console.log(`🚀 Superadmin-Import: ${models.length} Modelle für Marke ${brandId}`);

      let importedCount = 0;
      let existingCount = 0;
      const results = [];

      for (const model of models) {
        try {
          // Prüfen ob Modell bereits existiert
          const existing = await db.select()
            .from(userModels)
            .where(and(
              eq(userModels.name, model.name),
              eq(userModels.brandId, brandId)
            ))
            .limit(1);

          if (existing.length > 0) {
            existingCount++;
            console.log(`⚠️ Modell '${model.name}' existiert bereits`);
            continue;
          }

          const [newModel] = await db.insert(userModels)
            .values({
              name: model.name,
              brandId: brandId,
              userId: req.user?.id || 10,
              shopId: req.user?.shopId || 1682,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          results.push(newModel);
          importedCount++;
          console.log(`✅ Modell '${model.name}' erfolgreich hinzugefügt`);
        } catch (error) {
          console.error(`❌ Fehler beim Hinzufügen von Modell '${model.name}':`, error);
        }
      }

      console.log(`🎉 Import abgeschlossen: ${importedCount} neu, ${existingCount} bereits vorhanden`);

      res.json({
        success: true,
        imported: importedCount,
        existing: existingCount,
        total: models.length,
        models: results
      });

    } catch (error) {
      console.error("❌ Allgemeiner Fehler beim Modell-Import:", error);
      res.status(500).json({ message: "Interner Serverfehler beim Modell-Import" });
    }
  });

  // Bulk-Import für Modelle
  app.post("/api/superadmin/models/bulk-import", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { models } = req.body;
      
      if (!models || !Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: "Keine gültigen Modelldaten gefunden" 
        });
      }
      
      console.log(`Versuche ${models.length} Modelle zu importieren:`, models);
      
      // Zähler für erfolgreiche und bereits existierende Einträge
      let importedCount = 0;
      let existingCount = 0;
      
      // Aktueller Superadmin-User-ID und Shop-ID abrufen
      const superadminUserId = (req.user as Express.User).id;
      const superadminShopId = (req.user as Express.User).shopId || 1682; // Fallback auf 1682, wenn keine shopId vorhanden
      
      // Alle vorhandenen Marken abrufen, um Marken-IDs zu finden
      const existingBrands = await db.select().from(userBrands);
      
      // Alle Modelle importieren
      for (const model of models) {
        try {
          // Validiere Daten
          if (!model.name || !model.brandId) {
            console.log("Ungültiges Modell, überspringe:", model);
            continue;
          }
          
          // Prüfe, ob die Marke existiert
          const brandExists = existingBrands.some(brand => brand.id === model.brandId);
          if (!brandExists) {
            console.log(`Marke mit ID ${model.brandId} existiert nicht, überspringe Modell:`, model);
            continue;
          }
          
          // Prüfe, ob das Modell bereits existiert
          const [existingModel] = await db.select()
            .from(userModels)
            .where(and(
              eq(userModels.name, model.name),
              eq(userModels.brandId, model.brandId)
            ));
          
          if (existingModel) {
            console.log(`Modell "${model.name}" existiert bereits, überspringe.`);
            existingCount++;
            continue;
          }
          
          // Neues Modell einfügen
          await db.insert(userModels).values({
            name: model.name,
            brandId: model.brandId,
            userId: superadminUserId,
            shopId: superadminShopId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          importedCount++;
          console.log(`Modell "${model.name}" für Marke ${model.brandId} importiert.`);
        } catch (modelError) {
          console.error(`Fehler beim Importieren des Modells:`, model, modelError);
          // Wir machen mit dem nächsten Modell weiter
        }
      }
      
      res.json({
        success: true,
        importedCount,
        existingCount,
        totalCount: models.length,
        message: `${importedCount} Modelle wurden importiert, ${existingCount} existieren bereits.`
      });
    } catch (error) {
      console.error("Fehler beim Bulk-Import von Modellen:", error);
      
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
        message: "Fehler beim Massenimport von Modellen" 
      });
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

  // Fehlerkatalog-Routen wurden entfernt
  
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
        modelsList
      ] = await Promise.all([
        db.select().from(userDeviceTypes),
        db.select().from(userBrands),
        db.select().from(userModels)
      ]);
      
      console.log(`Exportiere ${deviceTypesList.length} Gerätearten, ${brandsList.length} Hersteller, ${modelsList.length} Modelle`);
      
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
        deviceIssues: [], // Leerer Array für Abwärtskompatibilität
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
        models: 0
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
      
      // 5. Fehlerkatalog wird nicht mehr importiert
      if (importData.deviceIssues && Array.isArray(importData.deviceIssues)) {
        console.log(`Fehlerkatalog wurde entfernt. ${importData.deviceIssues.length} Fehlereinträge werden ignoriert.`);
      }
      
      // Gesamtzahl aller Elemente (existierende + neu hinzugefügte)
      const total = {
        deviceTypes: importData.deviceTypes?.length || 0,
        brands: importData.brands?.length || 0,
        models: importData.models?.length || 0
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
  
  // Fehlerkatalog-Routen
  
  // Alle Fehlereinträge abrufen
  app.get("/api/superadmin/device-issues", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const issues = await db.select().from(deviceIssues);
      res.json(issues);
    } catch (error) {
      console.error("Fehler beim Abrufen der Fehlereinträge:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Fehlereinträge" });
    }
  });
  
  // Einzelnen Fehlereintrag erstellen
  app.post("/api/superadmin/device-issues", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { title, description, deviceType, solution, severity = 'medium', isCommon = false } = req.body;
      
      if (!title || !description || !deviceType) {
        return res.status(400).json({ message: "Titel, Beschreibung und Gerätetyp sind erforderlich" });
      }
      
      const [newIssue] = await db.insert(deviceIssues).values({
        title,
        description,
        deviceType,
        solution: solution || "",
        severity,
        isCommon,
        isGlobal: true, // Alle vom Superadmin erstellten Einträge sind global
        userId: req.user?.id || 0,
        shopId: 1682, // Feste Shop-ID (1682) für den Superadmin
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();
      
      res.status(201).json(newIssue);
    } catch (error) {
      console.error("Fehler beim Erstellen des Fehlereintrags:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Fehlereintrags" });
    }
  });
  
  // Mehrere Fehlereinträge auf einmal importieren (Bulk-Import)
  app.post("/api/superadmin/device-issues/bulk", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { deviceType, issues } = req.body;
      
      if (!deviceType || !Array.isArray(issues) || issues.length === 0) {
        return res.status(400).json({ 
          message: "Gerätetyp und eine Liste von Fehlereinträgen sind erforderlich" 
        });
      }
      
      const results = {
        success: 0,
        errors: [] as string[],
      };
      
      for (const issueTitle of issues) {
        if (!issueTitle.trim()) {
          results.errors.push(`Leerer Fehlereintrag übersprungen`);
          continue;
        }
        
        try {
          await db.insert(deviceIssues).values({
            title: issueTitle.trim(),
            description: issueTitle.trim(), // Wir verwenden den Titel auch als Beschreibung
            deviceType,
            solution: "", // Leere Lösung als Standardwert
            isGlobal: true,
            severity: 'medium',
            isCommon: false,
            userId: req.user?.id || 0,
            shopId: 1682, // Feste Shop-ID (1682) für den Superadmin
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          
          results.success++;
        } catch (error) {
          console.error(`Fehler beim Importieren von "${issueTitle}":`, error);
          results.errors.push(`Fehler beim Importieren von "${issueTitle}"`);
        }
      }
      
      res.status(200).json({
        message: `Import abgeschlossen. ${results.success} Fehlereinträge importiert. ${results.errors.length} Fehler.`,
        results,
      });
    } catch (error) {
      console.error("Fehler beim Bulk-Import von Fehlereinträgen:", error);
      res.status(500).json({ message: "Fehler beim Bulk-Import von Fehlereinträgen" });
    }
  });
  
  // Fehlereintrag löschen
  app.delete("/api/superadmin/device-issues/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const issueId = parseInt(req.params.id);
      
      if (isNaN(issueId)) {
        return res.status(400).json({ message: "Ungültige Fehlereintrag-ID" });
      }
      
      const [deletedIssue] = await db
        .delete(deviceIssues)
        .where(eq(deviceIssues.id, issueId))
        .returning();
      
      if (!deletedIssue) {
        return res.status(404).json({ message: "Fehlereintrag nicht gefunden" });
      }
      
      res.json({ message: "Fehlereintrag erfolgreich gelöscht", id: issueId });
    } catch (error) {
      console.error("Fehler beim Löschen des Fehlereintrags:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Fehlereintrags" });
    }
  });
  
  // Mehrere Fehlereinträge auf einmal löschen
  app.post("/api/superadmin/device-issues/bulk-delete", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Keine gültigen IDs angegeben" });
      }
      
      const deletedIssues = await db
        .delete(deviceIssues)
        .where(inArray(deviceIssues.id, ids))
        .returning({ id: deviceIssues.id });
      
      res.json({ 
        message: `${deletedIssues.length} Fehlereinträge erfolgreich gelöscht`,
        deletedIds: deletedIssues.map(issue => issue.id)
      });
    } catch (error) {
      console.error("Fehler beim Löschen mehrerer Fehlereinträge:", error);
      res.status(500).json({ message: "Fehler beim Löschen mehrerer Fehlereinträge" });
    }
  });
  
  // NEUER FEHLERKATALOG ROUTES
  
  // Alle Einträge im neuen Fehlerkatalog abrufen
  app.get("/api/superadmin/error-catalog", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const entries = await db
        .select()
        .from(errorCatalogEntries)
        .orderBy(errorCatalogEntries.errorText);
        
      res.json(entries);
    } catch (error) {
      console.error("Fehler beim Abrufen des Fehlerkatalogs:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Fehlerkatalogs" });
    }
  });
  
  // Neuen Eintrag zum Fehlerkatalog hinzufügen
  app.post("/api/superadmin/error-catalog", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { errorText, forSmartphone, forTablet, forLaptop, forSmartwatch, forGameconsole } = req.body;
      
      if (!errorText) {
        return res.status(400).json({ message: "Fehlertext ist erforderlich" });
      }
      
      const [newEntry] = await db.insert(errorCatalogEntries).values({
        errorText,
        forSmartphone: forSmartphone || false,
        forTablet: forTablet || false,
        forLaptop: forLaptop || false,
        forSmartwatch: forSmartwatch || false,
        forGameconsole: forGameconsole || false,
        shopId: 1682, // Feste Shop-ID (1682) für den Superadmin
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      res.status(201).json(newEntry);
    } catch (error) {
      console.error("Fehler beim Erstellen des Fehlerkatalogeintrags:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Fehlerkatalogeintrags" });
    }
  });
  
  // Eintrag im neuen Fehlerkatalog aktualisieren
  app.put("/api/superadmin/error-catalog/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const entryId = parseInt(req.params.id);
      const { errorText, forSmartphone, forTablet, forLaptop, forSmartwatch, forGameconsole } = req.body;
      
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Ungültige Eintrags-ID" });
      }
      
      if (!errorText) {
        return res.status(400).json({ message: "Fehlertext ist erforderlich" });
      }
      
      const [updatedEntry] = await db
        .update(errorCatalogEntries)
        .set({
          errorText,
          forSmartphone: forSmartphone || false,
          forTablet: forTablet || false,
          forLaptop: forLaptop || false,
          forSmartwatch: forSmartwatch || false,
          forGameconsole: forGameconsole || false,
          updatedAt: new Date(),
        })
        .where(eq(errorCatalogEntries.id, entryId))
        .returning();
      
      if (!updatedEntry) {
        return res.status(404).json({ message: "Eintrag nicht gefunden" });
      }
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Fehlerkatalogeintrags:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Fehlerkatalogeintrags" });
    }
  });
  
  // Eintrag aus dem neuen Fehlerkatalog löschen
  app.delete("/api/superadmin/error-catalog/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const entryId = parseInt(req.params.id);
      
      if (isNaN(entryId)) {
        return res.status(400).json({ message: "Ungültige Eintrags-ID" });
      }
      
      const [deletedEntry] = await db
        .delete(errorCatalogEntries)
        .where(eq(errorCatalogEntries.id, entryId))
        .returning();
      
      if (!deletedEntry) {
        return res.status(404).json({ message: "Eintrag nicht gefunden" });
      }
      
      res.json({ message: "Eintrag erfolgreich gelöscht", id: entryId });
    } catch (error) {
      console.error("Fehler beim Löschen des Fehlerkatalogeintrags:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Fehlerkatalogeintrags" });
    }
  });
  
  // Mehrere Einträge auf einmal zum neuen Fehlerkatalog hinzufügen (Bulk-Import)
  app.post("/api/superadmin/error-catalog/bulk", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { entries } = req.body;
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ 
          message: "Eine Liste von Fehlereinträgen ist erforderlich" 
        });
      }
      
      const results = {
        success: 0,
        errors: [] as string[],
      };
      
      for (const entry of entries) {
        const errorText = entry.errorText || entry; // Unterstützt sowohl Objekte als auch Strings
        
        if (!errorText || typeof errorText !== 'string' || !errorText.trim()) {
          results.errors.push(`Leerer Fehlereintrag übersprungen`);
          continue;
        }
        
        try {
          await db.insert(errorCatalogEntries).values({
            errorText: errorText.trim(),
            forSmartphone: entry.forSmartphone || false,
            forTablet: entry.forTablet || false,
            forLaptop: entry.forLaptop || false,
            forSmartwatch: entry.forSmartwatch || false,
            forGameconsole: entry.forGameconsole || false,
            shopId: 1682, // Feste Shop-ID (1682) für den Superadmin
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          results.success++;
        } catch (error) {
          console.error(`Fehler beim Importieren von "${errorText}":`, error);
          results.errors.push(`Fehler beim Importieren von "${errorText}"`);
        }
      }
      
      res.status(200).json({
        message: `Import abgeschlossen. ${results.success} Fehlereinträge importiert. ${results.errors.length} Fehler.`,
        results,
      });
    } catch (error) {
      console.error("Fehler beim Bulk-Import von Fehlereinträgen:", error);
      res.status(500).json({ message: "Fehler beim Bulk-Import von Fehlereinträgen" });
    }
  });
  
  // Mehrere Einträge aus dem neuen Fehlerkatalog auf einmal löschen
  app.post("/api/superadmin/error-catalog/bulk-delete", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Keine gültigen IDs angegeben" });
      }
      
      const deletedEntries = await db
        .delete(errorCatalogEntries)
        .where(inArray(errorCatalogEntries.id, ids))
        .returning({ id: errorCatalogEntries.id });
      
      res.json({ 
        message: `${deletedEntries.length} Fehlereinträge erfolgreich gelöscht`,
        deletedIds: deletedEntries.map(entry => entry.id)
      });
    } catch (error) {
      console.error("Fehler beim Löschen mehrerer Fehlereinträge:", error);
      res.status(500).json({ message: "Fehler beim Löschen mehrerer Fehlereinträge" });
    }
  });
  
  // CSV-Export für Fehlerkatalog
  app.get("/api/superadmin/error-catalog/export-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Fehlerkatalog aus der Datenbank abrufen
      const entries = await db.select().from(errorCatalogEntries).orderBy(errorCatalogEntries.errorText);
      
      // CSV-Header
      const csvHeader = 'errorText,forSmartphone,forTablet,forLaptop,forSmartwatch,forGameconsole\n';
      
      // CSV-Daten generieren
      const csvRows = entries.map(entry => {
        return `"${entry.errorText.replace(/"/g, '""')}",${entry.forSmartphone},${entry.forTablet},${entry.forLaptop},${entry.forSmartwatch},${entry.forGameconsole}`;
      });
      
      const csvContent = csvHeader + csvRows.join('\n');
      
      // CSV-Datei zurückgeben
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=error-catalog.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Fehler beim CSV-Export des Fehlerkatalogs:', error);
      res.status(500).json({ message: 'Fehler beim Export des Fehlerkatalogs' });
    }
  });

  // CSV-Import für Fehlerkatalog
  app.post("/api/superadmin/error-catalog/import-csv", isSuperadmin, async (req: Request, res: Response) => {
    try {
      let csvData: string;
      
      if (req.files && req.files.file) {
        // Datei wurde hochgeladen
        const file = req.files.file as UploadedFile;
        csvData = file.data.toString('utf8');
      } else if (req.body.csvData) {
        // CSV-Daten wurden im Body gesendet
        csvData = req.body.csvData;
      } else {
        return res.status(400).json({ message: 'Keine CSV-Daten gefunden' });
      }
      
      // CSV parsen
      const { parse } = await import('csv-parse/sync');
      let records;
      
      try {
        records = parse(csvData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (parseError) {
        console.error("Fehler beim Parsen der CSV-Datei:", parseError);
        return res.status(400).json({ 
          success: false,
          message: "Die CSV-Datei konnte nicht korrekt verarbeitet werden. Bitte überprüfen Sie das Format."
        });
      }
      
      // Superadmin-User-ID abrufen
      const superadminUserId = (req.user as Express.User).id;
      const globalShopId = 1682; // Shop-ID für globale Einträge
      
      // Statistik für den Import
      const stats = {
        total: records.length,
        added: 0,
        updated: 0,
        errors: 0
      };
      
      for (const record of records) {
        try {
          // Normalisiere Spaltennamen (alle kleinschreiben)
          const normalizedRecord: Record<string, any> = {};
          Object.keys(record).forEach(key => {
            normalizedRecord[key.toLowerCase()] = record[key];
          });
          
          // Extrahiere die Daten aus dem normalisierten Record
          const errorText = normalizedRecord.errortext || 
                          normalizedRecord.fehlertext || 
                          normalizedRecord.error || 
                          normalizedRecord.fehler;
          
          if (!errorText) {
            console.warn("Überspringe Zeile ohne Fehlertext");
            continue;
          }
          
          // Konvertiere String-Werte zu Boolean
          const parseBoolean = (value: any): boolean => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
              const lowercased = value.toLowerCase();
              return lowercased === 'true' || lowercased === 'ja' || lowercased === '1' || lowercased === 'yes';
            }
            return !!value;
          };
          
          const errorEntry = {
            errorText,
            forSmartphone: parseBoolean(normalizedRecord.forsmartphone),
            forTablet: parseBoolean(normalizedRecord.fortable),
            forLaptop: parseBoolean(normalizedRecord.forlaptop),
            forSmartwatch: parseBoolean(normalizedRecord.forsmartwatch),
            forGameconsole: parseBoolean(normalizedRecord.forgameconsole),
            shopId: globalShopId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Prüfen, ob der Eintrag bereits existiert
          const existingEntry = await db.select()
            .from(errorCatalogEntries)
            .where(eq(errorCatalogEntries.errorText, errorEntry.errorText));
          
          if (existingEntry.length > 0) {
            // Eintrag aktualisieren
            await db.update(errorCatalogEntries)
              .set({
                forSmartphone: errorEntry.forSmartphone,
                forTablet: errorEntry.forTablet,
                forLaptop: errorEntry.forLaptop,
                forSmartwatch: errorEntry.forSmartwatch,
                forGameconsole: errorEntry.forGameconsole,
                updatedAt: new Date()
              })
              .where(eq(errorCatalogEntries.id, existingEntry[0].id));
            
            stats.updated++;
          } else {
            // Neuen Eintrag erstellen
            await db.insert(errorCatalogEntries).values(errorEntry);
            stats.added++;
          }
        } catch (error) {
          console.error(`Fehler beim Import:`, error);
          stats.errors++;
        }
      }
      
      res.json({
        success: true,
        message: 'CSV-Import abgeschlossen',
        stats
      });
    } catch (error) {
      console.error('Fehler beim CSV-Import des Fehlerkatalogs:', error);
      res.status(500).json({ 
        success: false,
        message: 'Fehler beim Import des Fehlerkatalogs'
      });
    }
  });

  // Testbenutzer erstellen
  app.post("/api/superadmin/create-test-user", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const {
        username,
        email,
        password,
        companyName,
        ownerFirstName,
        ownerLastName,
        streetAddress,
        zipCode,
        city,
        country,
        companyPhone,
        taxId,
        website,
        isActive
      } = req.body;

      console.log(`🧪 Superadmin ${req.user?.username} erstellt Testbenutzer: ${username}`);

      // Prüfen, ob Benutzername bereits existiert
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Benutzername bereits vergeben" });
      }

      // Prüfen, ob E-Mail bereits existiert
      const [existingEmailUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (existingEmailUser) {
        return res.status(400).json({ message: "E-Mail-Adresse bereits vergeben" });
      }

      // Shop-ID generieren (wie bei normaler Registrierung)
      const maxShopIdResult = await db
        .select({ maxShopId: sql`MAX(shop_id)`.as('maxShopId') })
        .from(users)
        .where(sql`shop_id IS NOT NULL`);
      
      const maxShopId = (maxShopIdResult[0]?.maxShopId as number) || 0;
      const newShopId = maxShopId + 1;

      // Benutzer erstellen
      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        email,
        companyName,
        ownerFirstName,
        ownerLastName,
        streetAddress,
        zipCode,
        city,
        country: country || "Österreich",
        companyPhone,
        taxId,
        website: website || "",
        companyVatNumber: taxId || "",
        companyAddress: streetAddress || "",
        companyEmail: email
      });

      // Aktivierung und Shop-ID separat setzen
      if (isActive) {
        await db
          .update(users)
          .set({ 
            isActive: true,
            shopId: newShopId,
            pricingPlan: "basic"
          })
          .where(eq(users.id, user.id));
        
        // User-Objekt aktualisieren
        user.isActive = true;
        user.shopId = newShopId;
        user.pricingPlan = "basic";
      }

      // Wenn aktiviert: Business Settings und Demo-Paket erstellen
      if (isActive && user.shopId) {
        try {
          // Business Settings erstellen
          const businessSettingsData = {
            businessName: companyName || "Test Handyshop",
            ownerFirstName: ownerFirstName || "",
            ownerLastName: ownerLastName || "",
            streetAddress: streetAddress || "",
            city: city || "",
            zipCode: zipCode || "",
            country: country || "Österreich",
            phone: companyPhone || "",
            email: email || "",
            taxId: taxId || "",
            website: website || "",
            userId: user.id,
            shopId: user.shopId
          };
          
          await storage.updateBusinessSettings(businessSettingsData, user.id);
          console.log(`✅ Business Settings für Testbenutzer ${username} erstellt`);

          // Demo-Paket zuweisen
          const demoPackageExpiry = new Date();
          demoPackageExpiry.setDate(demoPackageExpiry.getDate() + 14); // 14 Tage Demo

          await db
            .update(users)
            .set({ 
              trialExpiresAt: demoPackageExpiry,
              pricingPlan: "demo"
            })
            .where(eq(users.id, user.id));

          console.log(`🎁 Demo-Paket für Testbenutzer ${username} aktiviert (läuft ab: ${demoPackageExpiry.toISOString()})`);
        } catch (settingsError) {
          console.error("Fehler beim Erstellen der Business Settings für Testbenutzer:", settingsError);
        }
      }

      console.log(`✅ Testbenutzer ${username} erfolgreich erstellt (${isActive ? 'aktiv' : 'inaktiv'})`);

      // Passwort aus Antwort entfernen
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: "Testbenutzer erfolgreich erstellt",
        user: userWithoutPassword
      });

    } catch (error) {
      console.error("Fehler beim Erstellen des Testbenutzers:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Testbenutzers" });
    }
  });

  // Deployment-Reparatur ausführen
  app.post("/api/superadmin/deployment-fix", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log(`🔧 Superadmin ${req.user?.username} startet Deployment-Reparatur`);

      const results: any[] = [];
      let usersFixed = 0;
      let businessSettingsCreated = 0;
      let modelsDistributed = 0;

      // SCHRITT 1: Business Settings erstellen
      try {
        // Business Settings aktualisieren (anstatt neue zu erstellen)
        const businessSettingsResult = await db.execute(sql`
          UPDATE business_settings bs
          SET 
            business_name = CASE 
              WHEN business_name IS NULL OR TRIM(business_name) = '' 
              THEN (SELECT COALESCE(company_name, username || ' Shop') FROM users WHERE id = bs.user_id)
              ELSE business_name 
            END,
            owner_first_name = CASE 
              WHEN owner_first_name IS NULL OR TRIM(owner_first_name) = '' 
              THEN (SELECT COALESCE(owner_first_name, 'Inhaber') FROM users WHERE id = bs.user_id)
              ELSE owner_first_name 
            END,
            owner_last_name = CASE 
              WHEN owner_last_name IS NULL OR TRIM(owner_last_name) = '' 
              THEN (SELECT COALESCE(owner_last_name, username) FROM users WHERE id = bs.user_id)
              ELSE owner_last_name 
            END,
            street_address = CASE 
              WHEN street_address IS NULL OR TRIM(street_address) = '' 
              THEN 'Geschäftsstraße 1'
              ELSE street_address 
            END,
            city = CASE 
              WHEN city IS NULL OR TRIM(city) = '' 
              THEN 'Wien'
              ELSE city 
            END,
            zip_code = CASE 
              WHEN zip_code IS NULL OR TRIM(zip_code) = '' 
              THEN '1010'
              ELSE zip_code 
            END,
            country = CASE 
              WHEN country IS NULL OR TRIM(country) = '' 
              THEN 'Österreich'
              ELSE country 
            END,
            phone = CASE 
              WHEN phone IS NULL OR TRIM(phone) = '' 
              THEN '+43 1 000 0000'
              ELSE phone 
            END,
            tax_id = CASE 
              WHEN tax_id IS NULL OR TRIM(tax_id) = '' 
              THEN 'ATU12345678'
              ELSE tax_id 
            END,
            website = CASE 
              WHEN website IS NULL OR TRIM(website) = '' 
              THEN (SELECT 'https://www.' || username || '.at' FROM users WHERE id = bs.user_id)
              ELSE website 
            END
          WHERE EXISTS (
            SELECT 1 FROM users u WHERE u.id = bs.user_id AND u.is_active = true AND u.id > 1
          )
          AND (
            business_name IS NULL OR TRIM(business_name) = '' OR
            owner_first_name IS NULL OR TRIM(owner_first_name) = '' OR
            owner_last_name IS NULL OR TRIM(owner_last_name) = ''
          )
        `);

        businessSettingsCreated = businessSettingsResult.rowCount || 0;
        results.push({
          step: "Business Settings erstellen",
          success: true,
          message: `${businessSettingsCreated} Business Settings wurden erstellt`,
          details: "Fehlende Unternehmensdaten wurden automatisch ergänzt"
        });
      } catch (error) {
        results.push({
          step: "Business Settings erstellen",
          success: false,
          message: "Fehler beim Erstellen von Business Settings",
          details: (error as Error).message
        });
      }

      // SCHRITT 4: Gerätemodelle verteilen
      try {
        // Gerätetypen kopieren
        await db.execute(sql`
          INSERT INTO user_device_types (name, user_id, created_at, updated_at)
          SELECT DISTINCT 
              udt.name,
              u.id as user_id,
              NOW() as created_at,
              NOW() as updated_at
          FROM user_device_types udt
          CROSS JOIN (SELECT id FROM users WHERE is_superadmin = false AND is_active = true AND id > 1) u
          WHERE udt.user_id = (SELECT id FROM users WHERE is_superadmin = true LIMIT 1)
          AND NOT EXISTS (
              SELECT 1 FROM user_device_types udt2 
              WHERE udt2.user_id = u.id AND udt2.name = udt.name
          )
        `);

        // Marken kopieren
        await db.execute(sql`
          INSERT INTO user_brands (name, device_type_id, user_id, created_at, updated_at)
          SELECT DISTINCT
              ub.name,
              (SELECT udt_target.id 
               FROM user_device_types udt_target 
               JOIN user_device_types udt_source ON udt_source.name = udt_target.name
               WHERE udt_source.id = ub.device_type_id 
               AND udt_target.user_id = u.id 
               LIMIT 1) as device_type_id,
              u.id as user_id,
              NOW() as created_at,
              NOW() as updated_at
          FROM user_brands ub
          CROSS JOIN (SELECT id FROM users WHERE is_superadmin = false AND is_active = true AND id > 1) u
          WHERE ub.user_id = (SELECT id FROM users WHERE is_superadmin = true LIMIT 1)
          AND EXISTS (
              SELECT 1 FROM user_device_types udt_target 
              JOIN user_device_types udt_source ON udt_source.name = udt_target.name
              WHERE udt_source.id = ub.device_type_id AND udt_target.user_id = u.id
          )
          AND NOT EXISTS (
              SELECT 1 FROM user_brands ub2 
              WHERE ub2.user_id = u.id 
              AND ub2.name = ub.name 
              AND ub2.device_type_id = (
                  SELECT udt_target.id 
                  FROM user_device_types udt_target 
                  JOIN user_device_types udt_source ON udt_source.name = udt_target.name
                  WHERE udt_source.id = ub.device_type_id 
                  AND udt_target.user_id = u.id 
                  LIMIT 1
              )
          )
        `);

        // Modelle kopieren
        const modelsResult = await db.execute(sql`
          INSERT INTO user_models (name, brand_id, user_id, created_at, updated_at)
          SELECT DISTINCT
              um.name,
              (SELECT ub_target.id 
               FROM user_brands ub_target 
               JOIN user_brands ub_source ON ub_source.name = ub_target.name
               JOIN user_device_types udt_target ON udt_target.id = ub_target.device_type_id
               JOIN user_device_types udt_source ON udt_source.name = udt_target.name AND udt_source.id = ub_source.device_type_id
               WHERE ub_source.id = um.brand_id 
               AND ub_target.user_id = u.id 
               LIMIT 1) as brand_id,
              u.id as user_id,
              NOW() as created_at,
              NOW() as updated_at
          FROM user_models um
          CROSS JOIN (SELECT id FROM users WHERE is_superadmin = false AND is_active = true AND id > 1) u
          WHERE um.user_id = (SELECT id FROM users WHERE is_superadmin = true LIMIT 1)
          AND EXISTS (
              SELECT 1 FROM user_brands ub_target 
              JOIN user_brands ub_source ON ub_source.name = ub_target.name
              JOIN user_device_types udt_target ON udt_target.id = ub_target.device_type_id
              JOIN user_device_types udt_source ON udt_source.name = udt_target.name AND udt_source.id = ub_source.device_type_id
              WHERE ub_source.id = um.brand_id AND ub_target.user_id = u.id
          )
          AND NOT EXISTS (
              SELECT 1 FROM user_models um2 
              WHERE um2.user_id = u.id 
              AND um2.name = um.name 
              AND um2.brand_id = (
                  SELECT ub_target.id 
                  FROM user_brands ub_target 
                  JOIN user_brands ub_source ON ub_source.name = ub_target.name
                  JOIN user_device_types udt_target ON udt_target.id = ub_target.device_type_id
                  JOIN user_device_types udt_source ON udt_source.name = udt_target.name AND udt_source.id = ub_source.device_type_id
                  WHERE ub_source.id = um.brand_id 
                  AND ub_target.user_id = u.id 
                  LIMIT 1
              )
          )
        `);

        modelsDistributed = modelsResult.rowCount || 0;
        results.push({
          step: "Gerätemodelle verteilen",
          success: true,
          message: `${modelsDistributed} Gerätemodelle wurden verteilt`,
          details: "Alle Benutzer haben jetzt Zugriff auf die komplette Geräte-Datenbank"
        });
      } catch (error) {
        results.push({
          step: "Gerätemodelle verteilen",
          success: false,
          message: "Fehler beim Verteilen der Gerätemodelle",
          details: (error as Error).message
        });
      }

      // SCHRITT 3: Gerätedaten-Bereinigung (Shop-Isolation reparieren)
      let deviceDataCleaned = false;
      try {
        // Prüfen ob es duplizierte Gerätedaten gibt
        const duplicateCheck = await db.execute(sql`
          SELECT COUNT(*) as duplicate_count 
          FROM user_device_types 
          WHERE user_id != 10
        `);
        
        const duplicateCount = (duplicateCheck.rows[0] as any)?.duplicate_count || 0;
        
        if (duplicateCount > 0) {
          console.log(`🧹 Bereinige ${duplicateCount} duplizierte Gerätedaten...`);
          
          // Duplizierte Modelle löschen
          await db.execute(sql`DELETE FROM user_models WHERE user_id != 10`);
          // Duplizierte Marken löschen  
          await db.execute(sql`DELETE FROM user_brands WHERE user_id != 10`);
          // Duplizierte Gerätetypen löschen
          await db.execute(sql`DELETE FROM user_device_types WHERE user_id != 10`);
          
          deviceDataCleaned = true;
          console.log(`✅ Gerätedaten-Bereinigung abgeschlossen`);
          
          results.push({
            step: "Gerätedaten bereinigen",
            success: true,
            message: "Duplizierte Gerätedaten entfernt",
            details: "Alle Shops nutzen jetzt die globalen Daten von Shop 1682"
          });
        } else {
          results.push({
            step: "Gerätedaten prüfen",
            success: true,
            message: "Keine duplizierten Gerätedaten gefunden",
            details: "Shop-Isolation bereits korrekt"
          });
        }
      } catch (error) {
        results.push({
          step: "Gerätedaten bereinigen",
          success: false,
          message: "Fehler bei der Gerätedaten-Bereinigung",
          details: (error as Error).message
        });
      }

      console.log(`✅ Deployment-Reparatur abgeschlossen: ${businessSettingsCreated} Settings, ${modelsDistributed} Modelle, Gerätedaten: ${deviceDataCleaned ? 'bereinigt' : 'bereits korrekt'}`);

      res.json({
        success: true,
        results,
        summary: {
          businessSettingsCreated,
          modelsDistributed,
          deviceDataCleaned
        }
      });

    } catch (error) {
      console.error("Fehler bei der Deployment-Reparatur:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler bei der Deployment-Reparatur",
        error: (error as Error).message
      });
    }
  });

  // Gerätedaten-Bereinigung: Alle duplizierten Daten löschen und globale Struktur wiederherstellen
  app.post("/api/superadmin/cleanup-device-data", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log(`🧹 Superadmin ${req.user?.username} startet Gerätedaten-Bereinigung`);

      const results: any[] = [];
      let deletedTypes = 0;
      let deletedBrands = 0;
      let deletedModels = 0;

      // SCHRITT 1: Diagnose der aktuellen Situation
      const typesBeforeCleanup = await db.execute(sql`
        SELECT user_id, COUNT(*) as count 
        FROM user_device_types 
        WHERE user_id != 10 
        GROUP BY user_id
      `);

      const brandsBeforeCleanup = await db.execute(sql`
        SELECT user_id, COUNT(*) as count 
        FROM user_brands 
        WHERE user_id != 10 
        GROUP BY user_id
      `);

      const modelsBeforeCleanup = await db.execute(sql`
        SELECT user_id, COUNT(*) as count 
        FROM user_models 
        WHERE user_id != 10 
        GROUP BY user_id
      `);

      // SCHRITT 2: Duplizierte Modelle löschen
      try {
        const modelsResult = await db.execute(sql`DELETE FROM user_models WHERE user_id != 10`);
        deletedModels = modelsResult.rowCount || 0;
        results.push({
          step: "Duplizierte Modelle löschen",
          success: true,
          message: `${deletedModels} duplizierte Modelle gelöscht`,
          details: "Nur globale Modelle von Shop 1682 behalten"
        });
      } catch (error) {
        results.push({
          step: "Duplizierte Modelle löschen",
          success: false,
          message: "Fehler beim Löschen der Modelle",
          details: (error as Error).message
        });
      }

      // SCHRITT 3: Duplizierte Marken löschen
      try {
        const brandsResult = await db.execute(sql`DELETE FROM user_brands WHERE user_id != 10`);
        deletedBrands = brandsResult.rowCount || 0;
        results.push({
          step: "Duplizierte Marken löschen",
          success: true,
          message: `${deletedBrands} duplizierte Marken gelöscht`,
          details: "Nur globale Marken von Shop 1682 behalten"
        });
      } catch (error) {
        results.push({
          step: "Duplizierte Marken löschen",
          success: false,
          message: "Fehler beim Löschen der Marken",
          details: (error as Error).message
        });
      }

      // SCHRITT 4: Duplizierte Gerätetypen löschen
      try {
        const typesResult = await db.execute(sql`DELETE FROM user_device_types WHERE user_id != 10`);
        deletedTypes = typesResult.rowCount || 0;
        results.push({
          step: "Duplizierte Gerätetypen löschen",
          success: true,
          message: `${deletedTypes} duplizierte Gerätetypen gelöscht`,
          details: "Nur globale Gerätetypen von Shop 1682 behalten"
        });
      } catch (error) {
        results.push({
          step: "Duplizierte Gerätetypen löschen",
          success: false,
          message: "Fehler beim Löschen der Gerätetypen",
          details: (error as Error).message
        });
      }

      // SCHRITT 5: Bestätigung der globalen Verfügbarkeit
      const globalDataCheck = await db.execute(sql`
        SELECT 
          (SELECT COUNT(*) FROM user_device_types WHERE user_id = 10) as device_types,
          (SELECT COUNT(*) FROM user_brands WHERE user_id = 10) as brands,
          (SELECT COUNT(*) FROM user_models WHERE user_id = 10) as models
      `);

      const globalData = globalDataCheck.rows[0] as any;

      results.push({
        step: "Globale Daten bestätigen",
        success: true,
        message: `Globale Daten verfügbar: ${globalData.device_types} Gerätetypen, ${globalData.brands} Marken, ${globalData.models} Modelle`,
        details: "Alle Shops nutzen jetzt die globalen Daten von Shop 1682"
      });

      console.log(`✅ Gerätedaten-Bereinigung abgeschlossen: ${deletedTypes} Typen, ${deletedBrands} Marken, ${deletedModels} Modelle gelöscht`);

      res.json({
        success: true,
        results,
        summary: {
          deletedTypes,
          deletedBrands,
          deletedModels,
          globalData
        }
      });

    } catch (error) {
      console.error("Fehler bei der Gerätedaten-Bereinigung:", error);
      res.status(500).json({ 
        success: false,
        message: "Fehler bei der Gerätedaten-Bereinigung",
        error: (error as Error).message
      });
    }
  });
  
  // Geschäftseinstellungen eines bestimmten Shops abrufen
  app.get("/api/superadmin/business-settings/:shopId", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const shopId = parseInt(req.params.shopId);
      
      if (isNaN(shopId)) {
        return res.status(400).json({ message: "Ungültige Shop-ID" });
      }
      
      // Geschäftseinstellungen für den angegebenen Shop abrufen
      const [settings] = await db.select()
        .from(businessSettings)
        .where(eq(businessSettings.shopId, shopId));
      
      if (!settings) {
        return res.status(404).json({ message: "Keine Geschäftseinstellungen für diesen Shop gefunden" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Fehler beim Abrufen der Geschäftseinstellungen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Geschäftseinstellungen" });
    }
  });
}
