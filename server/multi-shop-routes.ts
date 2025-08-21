import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { multiShopPermissions, users, userShopAccess } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Schema für Multi-Shop Access
const createUserShopAccessSchema = z.object({
  userId: z.number(),
  shopId: z.number(),
  accessLevel: z.string().default('admin'),
  grantedBy: z.number()
});

export function registerMultiShopRoutes(app: Express) {
  

  
  // ENTFERNE die lokale Authentication-Middleware - verwende die globale Middleware aus routes.ts

  // Abrufen der zugänglichen Shops für einen Benutzer
  app.get("/api/multi-shop/accessible-shops", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const accessibleShops = await storage.getUserAccessibleShops(req.user.id);
      
      // Für jeden Shop zusätzliche Metriken laden
      const shopsWithMetrics = await Promise.all(accessibleShops.map(async (shop) => {
        try {
          const metrics = await storage.getShopMetrics(shop.shopId);
          return {
            ...shop,
            metrics: metrics || {
              totalRepairs: 0,
              activeRepairs: 0,
              completedRepairs: 0,
              totalRevenue: 0,
              monthlyRevenue: 0,
              totalEmployees: 0,
              pendingOrders: 0
            }
          };
        } catch (error) {
          console.error(`Fehler beim Laden der Metriken für Shop ${shop.shopId}:`, error);
          return {
            ...shop,
            metrics: {
              totalRepairs: 0,
              activeRepairs: 0,
              completedRepairs: 0,
              totalRevenue: 0,
              monthlyRevenue: 0,
              totalEmployees: 0,
              pendingOrders: 0
            }
          };
        }
      }));
      
      res.json(shopsWithMetrics);
    } catch (error) {
      console.error('Error getting accessible shops:', error);
      res.status(500).json({ message: "Fehler beim Abrufen der zugänglichen Shops" });
    }
  });

  // Einem Benutzer Zugang zu einem Shop gewähren (nur für Superadmins)
  app.post("/api/multi-shop/grant-access", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const validatedData = createUserShopAccessSchema.parse({
        ...req.body,
        grantedBy: req.user!.id
      });

      const access = await storage.createUserShopAccess(validatedData);
      res.status(201).json(access);
    } catch (error) {
      console.error('Error granting shop access:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Ungültige Daten", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Fehler beim Gewähren des Shop-Zugangs" });
    }
  });

  // Shop-Zugang entziehen (nur für Superadmins)
  app.delete("/api/multi-shop/revoke-access/:userId/:shopId", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const shopId = parseInt(req.params.shopId);

      if (isNaN(userId) || isNaN(shopId)) {
        return res.status(400).json({ message: "Ungültige Benutzer- oder Shop-ID" });
      }

      const success = await storage.revokeUserShopAccess(userId, shopId);
      
      if (success) {
        res.json({ message: "Shop-Zugang erfolgreich entzogen" });
      } else {
        res.status(500).json({ message: "Fehler beim Entziehen des Shop-Zugangs" });
      }
    } catch (error) {
      console.error('Error revoking shop access:', error);
      res.status(500).json({ message: "Fehler beim Entziehen des Shop-Zugangs" });
    }
  });



  // Shop-Zugang für einen Benutzer abrufen
  app.get("/api/multi-shop/user-access", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const userAccess = await storage.getUserShopAccess(req.user.id);
      res.json(userAccess);
    } catch (error) {
      console.error('Error getting user shop access:', error);
      res.status(500).json({ message: "Fehler beim Abrufen der Benutzer-Shop-Zugriffe" });
    }
  });

  // Multi-Shop Admin Details abrufen
  app.get("/api/multi-shop/admin/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const adminId = parseInt(req.params.id);
      console.log('DEBUG: Multi-Shop Admin Details Request for ID:', adminId);
      if (isNaN(adminId)) {
        return res.status(400).json({ message: "Ungültige Admin-ID" });
      }

      const admin = await storage.getMultiShopAdminDetails(adminId);
      console.log('DEBUG: Admin found:', admin ? `${admin.username} with ${admin.accessibleShops.length} shops` : 'not found');
      
      if (!admin) {
        return res.status(404).json({ message: "Multi-Shop Admin nicht gefunden" });
      }

      res.json(admin);
    } catch (error) {
      console.error('Error getting multi-shop admin details:', error);
      res.status(500).json({ message: "Fehler beim Abrufen der Admin-Details" });
    }
  });

  // Multi-Shop Admin aktualisieren
  app.put("/api/multi-shop/admin/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const adminId = parseInt(req.params.id);
      if (isNaN(adminId)) {
        return res.status(400).json({ message: "Ungültige Admin-ID" });
      }

      const updates = req.body;
      
      // Passwort hashen, falls vorhanden
      if (updates.password) {
        const { hashPassword } = await import('./auth');
        updates.password = await hashPassword(updates.password);
      }

      const updatedAdmin = await storage.updateMultiShopAdmin(adminId, updates);
      res.json(updatedAdmin);
    } catch (error) {
      console.error('Error updating multi-shop admin:', error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Admins" });
    }
  });

  // Neuen Multi-Shop Admin erstellen
  app.post("/api/multi-shop/create-admin", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password || !email) {
        return res.status(400).json({ 
          message: 'Benutzername, Passwort und E-Mail sind erforderlich' 
        });
      }

      // Prüfen ob Benutzername bereits existiert
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Benutzername bereits vergeben' 
        });
      }

      // Prüfen ob E-Mail bereits verwendet wird
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        return res.status(400).json({ 
          message: 'E-Mail-Adresse bereits vergeben' 
        });
      }

      console.log(`[MULTI-SHOP] Erstelle neuen Multi-Shop Admin: ${username}`);

      // Passwort hashen vor der Speicherung
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      // Neuen Benutzer direkt über DB erstellen (ohne shopId, da Multi-Shop Admin)
      const [newUser] = await db.insert(users).values({
        username,
        email,
        password: hashedPassword,
        shopId: null, // Multi-Shop Admins haben keine spezifische shopId
        isMultiShopAdmin: true, // Multi-Shop Admin Flag
        isActive: true, // Sofort aktiv
      }).returning();

      console.log(`[MULTI-SHOP] Multi-Shop Admin erstellt: ID=${newUser.id}, username=${newUser.username}`);
      
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        message: 'Multi-Shop Admin erfolgreich erstellt'
      });
    } catch (error: any) {
      console.error('Fehler beim Erstellen des Multi-Shop Admins:', error);
      res.status(500).json({ 
        message: 'Interner Serverfehler beim Erstellen des Multi-Shop Admins',
        error: error.message 
      });
    }
  });

  // Multi-Shop-Admins für einen bestimmten Shop abrufen
  app.get("/api/multi-shop/admins", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentifizierung erforderlich" });
      }

      const user = req.user;
      console.log(`[MULTI-SHOP] Benutzer ${user.username} (${user.id}) fragt Multi-Shop-Admins ab`);

      // Nur Shop-Owner mit Multi-Shop-Admin-Berechtigung können Multi-Shop-Admins abrufen
      if (!user.canAssignMultiShopAdmins) {
        return res.status(403).json({ 
          message: "Keine Berechtigung für Multi-Shop-Admin-Verwaltung" 
        });
      }

      // Multi-Shop-Admins mit Zugriff auf diesen Shop abrufen
      const multiShopAdmins = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users)
        .innerJoin(multiShopPermissions, eq(multiShopPermissions.userId, users.id))
        .where(
          and(
            eq(users.isMultiShopAdmin, true),
            eq(multiShopPermissions.shopId, user.shopId),
            eq(multiShopPermissions.status, 'granted')
          )
        );

      console.log(`[MULTI-SHOP] ${multiShopAdmins.length} Multi-Shop-Admins für Shop ${user.shopId} gefunden`);
      
      res.json(multiShopAdmins);
    } catch (error: any) {
      console.error('Fehler beim Abrufen der Multi-Shop-Admins:', error);
      res.status(500).json({ 
        message: 'Interner Serverfehler beim Abrufen der Multi-Shop-Admins',
        error: error.message 
      });
    }
  });

  // Multi-Shop Admin löschen
  app.delete("/api/multi-shop/admin/:adminId", async (req: Request, res: Response) => {
    try {
      const adminId = parseInt(req.params.adminId);

      if (isNaN(adminId)) {
        return res.status(400).json({ message: "Ungültige Admin-ID" });
      }

      // Prüfen ob der Admin existiert
      const admin = await storage.getUser(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Multi-Shop Admin nicht gefunden" });
      }

      // Alle Permissions für diesen Admin widerrufen
      await db.delete(multiShopPermissions).where(eq(multiShopPermissions.multiShopAdminId, adminId));
      
      // Alle user_shop_access Einträge für diesen Admin löschen
      await db.delete(userShopAccess).where(eq(userShopAccess.userId, adminId));
      
      // Admin-Benutzer löschen
      await db.delete(users).where(eq(users.id, adminId));
      
      res.json({ 
        message: "Multi-Shop Admin erfolgreich gelöscht",
        adminId: adminId
      });
    } catch (error) {
      console.error("Fehler beim Löschen des Multi-Shop Admins:", error);
      res.status(500).json({ message: "Interner Serverfehler" });
    }
  });

  // ========== NEUE MULTI-SHOP-BERECHTIGUNG APIs ==========

  // Superadmin: Multi-Shop-Berechtigung für einen Shop ein-/ausschalten
  app.patch("/api/superadmin/users/:userId/multishop-permission", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { canAssignMultiShopAdmins } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
      }

      if (typeof canAssignMultiShopAdmins !== 'boolean') {
        return res.status(400).json({ message: "canAssignMultiShopAdmins muss ein boolean sein" });
      }

      // Prüfen ob User existiert
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Berechtigung aktualisieren
      await db.update(users)
        .set({ canAssignMultiShopAdmins })
        .where(eq(users.id, userId));

      console.log(`[SUPERADMIN] Multi-Shop-Berechtigung für User ${userId} auf ${canAssignMultiShopAdmins} gesetzt`);
      
      res.json({ 
        message: `Multi-Shop-Berechtigung ${canAssignMultiShopAdmins ? 'aktiviert' : 'deaktiviert'}`,
        userId,
        canAssignMultiShopAdmins
      });
    } catch (error: any) {
      console.error('Fehler beim Setzen der Multi-Shop-Berechtigung:', error);
      res.status(500).json({ 
        message: 'Interner Serverfehler beim Setzen der Multi-Shop-Berechtigung',
        error: error.message 
      });
    }
  });

  // Shop-Owner: Multi-Shop-Admin zuweisen
  app.post("/api/assign-multishop-admin", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }

      if (!username) {
        return res.status(400).json({ message: "Benutzername ist erforderlich" });
      }

      // Prüfen ob aktueller User Multi-Shop-Berechtigung hat
      if (!currentUser.canAssignMultiShopAdmins) {
        return res.status(403).json({ 
          message: "Sie haben keine Berechtigung, Multi-Shop-Admins zuzuweisen. Kontaktieren Sie den Support." 
        });
      }

      // Multi-Shop-Admin finden
      const multiShopAdmin = await storage.getUserByUsername(username);
      if (!multiShopAdmin) {
        return res.status(404).json({ message: "Multi-Shop-Admin nicht gefunden" });
      }

      // Prüfen ob es wirklich ein Multi-Shop-Admin ist
      if (!multiShopAdmin.isMultiShopAdmin || multiShopAdmin.shopId !== null) {
        return res.status(400).json({ 
          message: "Der angegebene Benutzer ist kein Multi-Shop-Admin" 
        });
      }

      // Prüfen ob bereits Zugriff besteht
      const existingAccess = await db.select()
        .from(userShopAccess)
        .where(
          and(
            eq(userShopAccess.userId, multiShopAdmin.id),
            eq(userShopAccess.shopId, currentUser.shopId!),
            eq(userShopAccess.isActive, true)
          )
        )
        .limit(1);

      if (existingAccess.length > 0) {
        return res.status(400).json({ 
          message: "Dieser Multi-Shop-Admin hat bereits Zugriff auf Ihren Shop" 
        });
      }

      // Zugriff gewähren
      await db.insert(userShopAccess).values({
        userId: multiShopAdmin.id,
        shopId: currentUser.shopId!,
        accessLevel: 'admin',
        grantedBy: currentUser.id
      });

      console.log(`[SHOP-OWNER] Multi-Shop-Admin ${username} Zugriff auf Shop ${currentUser.shopId} gewährt`);
      
      res.status(201).json({
        message: `Multi-Shop-Admin "${username}" erfolgreich zugewiesen`,
        multiShopAdminId: multiShopAdmin.id,
        shopId: currentUser.shopId
      });
    } catch (error: any) {
      console.error('Fehler beim Zuweisen des Multi-Shop-Admins:', error);
      res.status(500).json({ 
        message: 'Interner Serverfehler beim Zuweisen des Multi-Shop-Admins',
        error: error.message 
      });
    }
  });
}