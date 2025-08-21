import type { Express, Request, Response } from "express";
import { db } from "./db";
import { multiShopPermissions, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function registerMultiShopRoutes(app: Express) {
  
  // Multi-Shop-Admin per E-Mail-Adresse Zugriff gewähren (DSGVO-konform)
  app.post("/api/multi-shop/grant-access-by-email", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentifizierung erforderlich" });
      }

      const user = req.user;
      const { email } = req.body;

      console.log(`[MULTI-SHOP] Shop-Owner ${user.username} möchte Admin mit E-Mail ${email} Zugriff gewähren`);

      // Nur Shop-Owner mit Multi-Shop-Admin-Berechtigung
      if (!user.canAssignMultiShopAdmins) {
        return res.status(403).json({ 
          message: "Keine Berechtigung für Multi-Shop-Admin-Verwaltung" 
        });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Gültige E-Mail-Adresse ist erforderlich" });
      }

      // Prüfen ob ein Multi-Shop-Admin mit dieser E-Mail existiert
      const admin = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        isActive: users.isActive
      }).from(users)
        .where(
          and(
            eq(users.email, email.toLowerCase()),
            eq(users.isMultiShopAdmin, true),
            eq(users.isActive, true)
          )
        ).limit(1);

      if (admin.length === 0) {
        return res.status(404).json({ 
          message: "Kein aktiver Multi-Shop-Admin mit dieser E-Mail-Adresse gefunden" 
        });
      }

      const foundAdmin = admin[0];

      // Prüfen ob bereits Zugriff besteht
      const existingPermission = await db.select()
        .from(multiShopPermissions)
        .where(
          and(
            eq(multiShopPermissions.multiShopAdminId, foundAdmin.id),
            eq(multiShopPermissions.shopId, user.shopId)
          )
        ).limit(1);

      if (existingPermission.length > 0) {
        return res.status(409).json({ 
          message: "Dieser Multi-Shop-Admin hat bereits Zugriff auf Ihren Shop" 
        });
      }

      // Zugriff gewähren
      await db.insert(multiShopPermissions).values({
        multiShopAdminId: foundAdmin.id,
        shopId: user.shopId,
        shopOwnerId: user.id,
        granted: true,
        grantedAt: new Date(),
      });

      console.log(`[MULTI-SHOP] ✅ Shop-Owner ${user.username} gewährte Admin ${foundAdmin.username} Zugriff auf Shop ${user.shopId}`);
      
      res.json({ 
        message: `Zugriff erfolgreich gewährt für ${foundAdmin.username}`,
        admin: {
          username: foundAdmin.username,
          email: foundAdmin.email
        }
      });
    } catch (error: any) {
      console.error('Fehler beim Gewähren des Zugriffs:', error);
      res.status(500).json({ 
        message: 'Interner Serverfehler',
        error: error.message 
      });
    }
  });

  // Gewährte Multi-Shop-Admin-Zugriffe abrufen (DSGVO-konform)
  app.get("/api/multi-shop/granted-access", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentifizierung erforderlich" });
      }

      const user = req.user;

      // Nur Shop-Owner mit Multi-Shop-Admin-Berechtigung
      if (!user.canAssignMultiShopAdmins) {
        return res.status(403).json({ 
          message: "Keine Berechtigung für Multi-Shop-Admin-Verwaltung" 
        });
      }

      // Gewährte Zugriffe für diesen Shop abrufen
      const grantedAccess = await db.select({
        id: multiShopPermissions.id,
        adminUsername: users.username,
        adminEmail: users.email,
        grantedAt: multiShopPermissions.grantedAt,
        granted: multiShopPermissions.granted
      })
      .from(multiShopPermissions)
      .innerJoin(users, eq(multiShopPermissions.multiShopAdminId, users.id))
      .where(
        and(
          eq(multiShopPermissions.shopId, user.shopId),
          eq(multiShopPermissions.granted, true)
        )
      );

      console.log(`[MULTI-SHOP] Shop ${user.shopId} hat ${grantedAccess.length} gewährte Zugriffe`);

      res.json(grantedAccess.map(access => ({
        id: access.id,
        adminUsername: access.adminUsername,
        // E-Mail wird aus DSGVO-Gründen nicht vollständig angezeigt
        adminEmailHint: access.adminEmail ? `${access.adminEmail.substring(0, 3)}***@${access.adminEmail.split('@')[1]}` : null,
        grantedAt: access.grantedAt,
        granted: access.granted
      })));
    } catch (error: any) {
      console.error('Fehler beim Abrufen der gewährten Zugriffe:', error);
      res.status(500).json({ 
        message: 'Interner Serverfehler',
        error: error.message 
      });
    }
  });

}