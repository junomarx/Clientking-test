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
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Nicht angemeldet" });
    }
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
      const multiShopAdmins = await storage.getMultiShopAdmins();
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
}