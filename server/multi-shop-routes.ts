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
  
  // Multi-Shop Admins abrufen (für Superadmin)
  app.get("/api/multi-shop/admins", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }
      
      const user = await storage.getUser(req.user.id);
      console.log(`🔐 Multi-Shop Admins Abfrage von User ${req.user.id} (${user?.username})`);
      
      if (!user?.isSuperadmin) {
        console.log("❌ Keine Superadmin-Rechte");
        return res.status(403).json({ message: "Keine Superadmin-Rechte" });
      }
      
      console.log("✅ Superadmin-Berechtigung bestätigt - lade Multi-Shop Admins");
      const multiShopAdmins = await storage.getAllMultiShopAdmins();
      console.log(`📋 ${multiShopAdmins.length} Multi-Shop Admins gefunden`);
      
      res.json(multiShopAdmins);
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Multi-Shop Admins:", error);
      res.status(500).json({ message: "Fehler beim Laden der Multi-Shop Admins" });
    }
  });
  
  // ENTFERNE die lokale Authentication-Middleware - verwende die globale Middleware aus routes.ts

  // Abrufen der zugänglichen Shops für einen Benutzer
  app.get("/api/multi-shop/accessible-shops", async (req: Request, res: Response) => {
    try {
      // Header-basierte Authentifizierung für Multi-Shop Admins
      const customUserId = req.headers['x-user-id'];
      let userId: number;
      
      if (customUserId) {
        console.log(`X-User-ID Header gefunden: ${customUserId}`);
        userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ message: "Benutzer nicht gefunden" });
        }
        req.user = user as any;
      } else if (req.user) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const accessibleShops = await storage.getUserAccessibleShops(userId);
      
      // Zeitraum-Parameter aus Query extrahieren
      const period = req.query.period as string || 'month';
      const startDate = req.query.start as string;
      const endDate = req.query.end as string;
      
      let timeRange: any;
      if (startDate && endDate) {
        // Benutzerdefinierter Zeitraum
        timeRange = {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      } else {
        // Vordefinierter Zeitraum
        timeRange = { period: period as 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' };
      }
      
      // Für jeden Shop zusätzliche Metriken laden
      const shopsWithMetrics = await Promise.all(accessibleShops.map(async (shop) => {
        try {
          const metrics = await storage.getShopMetrics(shop.id, timeRange);
          return {
            ...shop,
            metrics: metrics || {
              totalRepairs: 0,
              activeRepairs: 0,
              completedRepairs: 0,
              totalRevenue: 0,
              periodRevenue: 0,
              periodCompletedRepairs: 0,
              totalEmployees: 0,
              pendingOrders: 0,
              timeRange: timeRange
            }
          };
        } catch (error) {
          console.error(`Fehler beim Laden der Metriken für Shop ${shop.id}:`, error);
          return {
            ...shop,
            metrics: {
              totalRepairs: 0,
              activeRepairs: 0,
              completedRepairs: 0,
              totalRevenue: 0,
              periodRevenue: 0,
              periodCompletedRepairs: 0,
              totalEmployees: 0,
              pendingOrders: 0,
              timeRange: timeRange
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

  // Alle Multi-Shop Admins abrufen (nur für Superadmins)
  app.get("/api/multi-shop/admins", isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log('DEBUG: Multi-Shop Admins Request - User:', req.user?.username, 'ID:', req.user?.id);
      const multiShopAdmins = await storage.getAllMultiShopAdmins();
      console.log('DEBUG: Multi-Shop Admins Result:', multiShopAdmins.length, 'admins found');
      res.json(multiShopAdmins);
    } catch (error) {
      console.error('Error getting multi-shop admins:', error);
      res.status(500).json({ message: "Fehler beim Abrufen der Multi-Shop Admins" });
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

  // Multi-Shop Admin löschen
  app.delete("/api/multi-shop/admin/:adminId", isSuperadmin, async (req: Request, res: Response) => {
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

  // Shop-Owner gewährt Multi-Shop-Admin Zugriff
  app.post("/api/multi-shop/grant-access", async (req: Request, res: Response) => {
    try {
      // Prüfe auf benutzerdefinierte User-ID im Header (für direktes Debugging)
      const customUserId = req.headers['x-user-id'];
      let currentUser = req.user;
      
      if (customUserId && !currentUser) {
        try {
          const userId = parseInt(customUserId.toString());
          currentUser = await storage.getUser(userId);
          if (currentUser) {
            console.log(`🔥 Header Auth: Benutzer ${currentUser.username} per X-User-ID authentifiziert`);
          }
        } catch (error) {
          console.error('Fehler beim Verarbeiten der X-User-ID:', error);
        }
      }
      
      if (!currentUser) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-Mail-Adresse ist erforderlich" });
      }

      // Prüfen ob User die Berechtigung hat
      if (!currentUser.canAssignMultiShopAdmins) {
        return res.status(403).json({ error: "Keine Berechtigung zum Zuweisen von Multi-Shop-Admins" });
      }

      // Multi-Shop-Admin per E-Mail finden
      const multiShopAdmin = await storage.getUserByEmail(email);
      if (!multiShopAdmin) {
        return res.status(404).json({ error: "Multi-Shop-Admin mit dieser E-Mail-Adresse nicht gefunden" });
      }

      if (!multiShopAdmin.isMultiShopAdmin) {
        return res.status(400).json({ error: "Benutzer ist kein Multi-Shop-Admin" });
      }

      // Prüfen ob Zugriff bereits gewährt wurde
      const existingAccess = await db.select()
        .from(userShopAccess)
        .where(and(
          eq(userShopAccess.userId, multiShopAdmin.id),
          eq(userShopAccess.shopId, currentUser.shopId!)
        ));

      if (existingAccess.length > 0) {
        return res.status(400).json({ error: "Zugriff wurde bereits gewährt" });
      }

      // Neuen Shop-Zugriff erstellen
      const [newAccess] = await db.insert(userShopAccess).values({
        userId: multiShopAdmin.id,
        shopId: currentUser.shopId!,
        accessLevel: 'admin',
        grantedBy: currentUser.id,
        grantedAt: new Date()
      }).returning();

      console.log(`✅ Shop-Owner ${currentUser.username} hat Multi-Shop-Admin ${multiShopAdmin.email} Zugriff auf Shop ${currentUser.shopId} gewährt`);

      res.status(201).json({
        id: newAccess.id,
        multiShopAdminEmail: multiShopAdmin.email,
        shopId: currentUser.shopId,
        grantedAt: newAccess.grantedAt,
        message: 'Zugriff erfolgreich gewährt'
      });
    } catch (error: any) {
      console.error('Fehler beim Gewähren des Zugriffs:', error);
      res.status(500).json({ error: 'Interner Serverfehler beim Gewähren des Zugriffs' });
    }
  });

  // Gewährte Zugänge für Shop-Owner abrufen
  app.get("/api/multi-shop/granted-accesses", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Nicht angemeldet" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.shopId) {
        return res.status(404).json({ error: "Benutzer oder Shop nicht gefunden" });
      }

      // Alle gewährten Zugänge für diesen Shop abrufen
      const grantedAccesses = await db.select({
        id: userShopAccess.id,
        userId: userShopAccess.userId,
        shopId: userShopAccess.shopId,
        accessLevel: userShopAccess.accessLevel,
        grantedAt: userShopAccess.grantedAt,
        multiShopAdminEmail: users.email,
        multiShopAdminUsername: users.username
      })
      .from(userShopAccess)
      .leftJoin(users, eq(userShopAccess.userId, users.id))
      .where(and(
        eq(userShopAccess.shopId, user.shopId),
        eq(userShopAccess.grantedBy, user.id)
      ));

      res.json(grantedAccesses);
    } catch (error: any) {
      console.error('Fehler beim Abrufen der gewährten Zugänge:', error);
      res.status(500).json({ error: 'Interner Serverfehler beim Abrufen der gewährten Zugänge' });
    }
  });
}