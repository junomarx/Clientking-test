import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { isSuperadmin } from "./superadmin-middleware";
import { z } from "zod";

// Schema für Multi-Shop Access
const createUserShopAccessSchema = z.object({
  userId: z.number(),
  shopId: z.number(),
  accessLevel: z.string().default('admin'),
  grantedBy: z.number()
});

export function registerMultiShopRoutes(app: Express) {
  
  // Middleware for authentication
  async function isAuthenticated(req: Request, res: Response, next: any) {
    console.log('DEBUG: isAuthenticated check - Session:', !!req.session, 'User:', req.user?.username);
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log('DEBUG: Authentication failed');
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
    console.log('DEBUG: Authentication successful for user:', req.user?.username);
    next();
  }

  // Abrufen der zugänglichen Shops für einen Benutzer
  app.get("/api/multi-shop/accessible-shops", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht angemeldet" });
      }

      const accessibleShops = await storage.getUserAccessibleShops(req.user.id);
      res.json(accessibleShops);
    } catch (error) {
      console.error('Error getting accessible shops:', error);
      res.status(500).json({ message: "Fehler beim Abrufen der zugänglichen Shops" });
    }
  });

  // Einem Benutzer Zugang zu einem Shop gewähren (nur für Superadmins)
  app.post("/api/multi-shop/grant-access", isAuthenticated, isSuperadmin, async (req: Request, res: Response) => {
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
  app.delete("/api/multi-shop/revoke-access/:userId/:shopId", isAuthenticated, isSuperadmin, async (req: Request, res: Response) => {
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
  app.get("/api/multi-shop/admins", isAuthenticated, isSuperadmin, async (req: Request, res: Response) => {
    try {
      console.log('DEBUG: Multi-Shop Admins Request - User:', req.user?.username, 'ID:', req.user?.id);
      const multiShopAdmins = await storage.getMultiShopAdmins();
      console.log('DEBUG: Multi-Shop Admins Result:', multiShopAdmins.length, 'admins found');
      res.json(multiShopAdmins);
    } catch (error) {
      console.error('Error getting multi-shop admins:', error);
      res.status(500).json({ message: "Fehler beim Abrufen der Multi-Shop Admins" });
    }
  });

  // Shop-Zugang für einen Benutzer abrufen
  app.get("/api/multi-shop/user-access", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/multi-shop/admin/:id", isAuthenticated, isSuperadmin, async (req: Request, res: Response) => {
    try {
      const adminId = parseInt(req.params.id);
      if (isNaN(adminId)) {
        return res.status(400).json({ message: "Ungültige Admin-ID" });
      }

      const admin = await storage.getMultiShopAdminDetails(adminId);
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
  app.put("/api/multi-shop/admin/:id", isAuthenticated, isSuperadmin, async (req: Request, res: Response) => {
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
  app.post("/api/multi-shop/create-admin", isAuthenticated, isSuperadmin, async (req: Request, res: Response) => {
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

      // Neuen Benutzer erstellen (ohne shopId, da Multi-Shop Admin)
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword, // Bereits gehashtes Passwort verwenden
        shopId: null, // Multi-Shop Admins haben keine spezifische shopId
        isAdmin: true, // Multi-Shop Admins sind Admins
        maxEmployees: 0, // Multi-Shop Admins brauchen keine Mitarbeiter-Limits
        trialEndsAt: null, // Multi-Shop Admins haben keine Trial-Limits
      });

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
}