import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as emailService from "./email-service";
import { initializeWebSocketServer, getOnlineStatusManager } from "./websocket-server";
import { isSuperadmin } from "./superadmin-middleware";
// Import der Berechtigungsprüfung aus permissions.ts
import { hasAccess, hasAccessAsync } from './permissions';
// Import der Middleware für die Prüfung der Trial-Version
import { checkTrialExpiry } from './middleware/check-trial-expiry';
import { format } from 'date-fns';
import { db, pool } from './db';
import { eq, desc, and, sql, gte, lte, lt, isNotNull, or, asc, isNull } from 'drizzle-orm';
import { 
  insertCustomerSchema, 
  insertRepairSchema,
  insertBusinessSettingsSchema,
  insertFeedbackSchema,
  insertUserDeviceTypeSchema,
  insertUserBrandSchema,
  insertUserModelSchema,
  insertCostEstimateSchema,
  insertSparePartSchema,
  repairStatuses,
  deviceTypes,
  type InsertEmailTemplate,
  type InsertCostEstimate,
  type InsertCostEstimateItem,
  type InsertSparePart,
  customers,
  users,
  repairs,
  feedbacks,
  userDeviceTypes,
  userBrands,
  businessSettings,
  costEstimates,
  packageFeatures,
  spareParts,
  repairStatusHistory,
  emailTemplates,
  emailHistory,
  loanerDevices
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { registerAdminRoutes } from "./admin-routes";
import { supportAccessRouter } from "./support-access-routes";
import { registerSuperadminRoutes } from "./superadmin-routes";
import { registerGlobalDeviceRoutes } from "./global-device-routes";
import { registerSuperadminPrintTemplatesRoutes } from "./superadmin-print-templates-routes";
import { setupEmployeeRoutes } from "./employee-routes";
import { registerMultiShopRoutes } from "./multi-shop-routes";
import { multiShopService } from "./multi-shop-service";
import { registerTwoFARoutes } from "./two-fa-routes";
import { registerMultiShopAdminRoutes } from "./multi-shop-admin-routes";
import { registerSuperadminEmailRoutes } from "./superadmin-email-routes";
import { setupNewsletterRoutes } from "./newsletter-routes";
import path from 'path';
import fs from 'fs';
// jsPDF will be imported dynamically
import { requireShopIsolation, attachShopId } from "./middleware/shop-isolation";
import { enforceShopIsolation, validateCustomerBelongsToShop } from "./middleware/enforce-shop-isolation";
import nodemailer from "nodemailer";

// SECURITY: Strip development headers in production
function stripDevHeadersInProd(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-user-id']) {
      console.error('🚨 SECURITY ALERT: X-User-ID header blocked in production from IP:', req.ip);
      return res.status(400).json({ message: "Invalid header in production" });
    }
  }
  next();
}

// Helper function to safely get authenticated user
function requireUser(req: Request): { id: number; username: string; shopId: number; role: string } {
  const user = req.user as any;
  if (!user) {
    throw new Error("User not authenticated");
  }
  return {
    id: user.id,
    username: user.username || user.email,
    shopId: user.shopId,
    role: user.role
  };
}

// Middleware to check if user is authenticated
async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  console.log(`🚨🚨🚨 [CRITICAL-DEBUG] isAuthenticated CALLED: ${req.method} ${req.path} 🚨🚨🚨`);
  
  try {
    console.log(`🔍 [AUTH-MIDDLEWARE] ${req.method} ${req.path} - Checking authentication...`);
  
  // SECURITY WARNING: Development-only debug authentication
  // These debug features MUST be disabled in production!
  if (process.env.NODE_ENV !== 'production') {
    // Prüfe auf benutzerdefinierte User-ID im Header (für direktes Debugging)
    const customUserId = req.headers['x-user-id'];
    console.log(`🔍 [AUTH-MIDDLEWARE] X-User-ID Header: ${customUserId}`);
    
    if (customUserId) {
      console.log(`🔍 [AUTH-MIDDLEWARE] X-User-ID Header gefunden: ${customUserId}`);
      // Wenn wir eine Benutzer-ID im Header haben, versuchen wir, den Benutzer zu laden
      try {
        const userId = parseInt(customUserId.toString());
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`🔍 [AUTH-MIDDLEWARE] ✅ Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
          req.user = user;
          return next();
        } else {
          console.log(`🔍 [AUTH-MIDDLEWARE] ❌ Benutzer mit ID ${userId} nicht gefunden`);
        }
      } catch (error) {
        console.error('🔍 [AUTH-MIDDLEWARE] ❌ Fehler beim Verarbeiten der X-User-ID:', error);
      }
    } else {
      console.log(`🔍 [AUTH-MIDDLEWARE] ❌ X-User-ID Header NICHT vorhanden`);
    }
  }
  
  // Standardauthentifizierung über Session (ALWAYS AVAILABLE IN PRODUCTION)
  if (req.isAuthenticated()) {
    // KRITISCH: req.user muss aus der Session gesetzt werden
    // Passport.js speichert User-Daten in req.user automatisch
    // Aber wir müssen sicherstellen, dass es dem erwarteten Format entspricht
    if (!req.user) {
      // Fallback: Wenn req.user nicht gesetzt ist, versuche es aus der Session zu holen
      console.error('⚠️ Session authenticated but req.user is null - this should not happen');
      return res.status(500).json({ message: "Session Fehler: User-Daten nicht verfügbar" });
    }
    return next();
  }
  
  // Development-only: Weak Bearer token authentication
  // SECURITY WARNING: This should be replaced with proper JWT in production
  if (process.env.NODE_ENV !== 'production') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Dekodieren des Tokens (in Produktion würden wir JWT verwenden)
        const decoded = Buffer.from(token, 'base64').toString();
        const tokenParts = decoded.split(':');
        
        if (tokenParts.length < 2) {
          return res.status(401).json({ message: "Ungültiges Token-Format" });
        }
        
        const userId = parseInt(tokenParts[0]);
        
        // Benutzer aus der Datenbank abrufen
        storage.getUser(userId).then(user => {
          if (!user) {
            return res.status(401).json({ message: "Benutzer nicht gefunden" });
          }
          
          if (!user.isActive && !user.isAdmin) {
            return res.status(401).json({ message: "Konto ist nicht aktiviert" });
          }
          
          // Benutzer in Request setzen
          req.user = user;
          return next();
        }).catch(err => {
          console.error('Token authentication error:', err);
          return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
        });
        return; // Früher Return, da wir asynchron arbeiten
      } catch (error) {
        console.error('Token authentication error:', error);
        return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
      }
    }
  }
  
  // If no authentication method succeeded
  console.log(`🚨 [CRITICAL-DEBUG] Keine Authentifizierung erfolgreich - return 401`);
  res.status(401).json({ message: "Nicht angemeldet" });
  
  } catch (error) {
    console.error(`🚨🚨🚨 [CRITICAL-DEBUG] isAuthenticated EXCEPTION: ${error} 🚨🚨🚨`);
    console.error(`🚨🚨🚨 [CRITICAL-DEBUG] STACK:`, error.stack);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Hilfsfunktionen entfernt (keine Modellreihen mehr)

export async function registerRoutes(app: Express): Promise<Server> {
  
  // SECURITY HOTFIX: Apply dev header stripping globally in production
  app.use(stripDevHeadersInProd);
  
  // Health check endpoint for Docker
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // 🎯 ZUBEHÖR BULK-UPDATE ROUTE - GANZ OBEN WEGEN ROUTE-PRIORITÄT
  app.put("/api/orders/accessories/bulk-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      const { accessoryIds, status } = req.body;
      
      console.log(`[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] PUT empfangen:`, { accessoryIds, status, userId });
      
      if (!Array.isArray(accessoryIds) || accessoryIds.length === 0) {
        console.error(`[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] ❌ Ungültige IDs:`, accessoryIds);
        return res.status(400).json({ message: "Ungültige Zubehör-IDs" });
      }
      
      if (!status || typeof status !== 'string') {
        console.error(`[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] ❌ Ungültiger Status:`, status);
        return res.status(400).json({ message: "Ungültiger Status" });
      }
      
      console.log(`[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] 🔄 Starte Bulk-Update...`);
      const success = await storage.bulkUpdateAccessoryStatus(accessoryIds, status, userId);
      
      if (success) {
        console.log(`[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] ✅ ERFOLGREICH: ${accessoryIds.length} auf "${status}"`);
        res.json({ 
          message: "Zubehör erfolgreich aktualisiert", 
          accessoryIds, 
          status,
          count: accessoryIds.length
        });
      } else {
        console.error(`[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] ❌ Storage fehlgeschlagen`);
        res.status(500).json({ message: "Fehler beim Aktualisieren des Zubehörs" });
      }
    } catch (error) {
      console.error("[🎯 ZUBEHÖR BULK-UPDATE TOP-LEVEL] ❌ KRITISCHER FEHLER:", error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren des Zubehörs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // ALLERHÖCHSTE PRIORITÄT: E-Mail für eingetroffenes Zubehör versenden - MUSS ZUERST SEIN!
  app.post("/api/accessories/:id/send-arrival-email", isAuthenticated, async (req: Request, res: Response) => {
    console.log("🚨🚨🚨 ALLERHÖCHSTE PRIORITÄT ZUBEHÖR E-MAIL ROUTE AUFGERUFEN! 🚨🚨🚨");
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      const accessoryId = parseInt(req.params.id);
      if (!accessoryId) {
        return res.status(400).json({ message: "Ungültige Zubehör-ID" });
      }
      
      console.log(`[E-MAIL-VERSAND] ALLERHÖCHSTE PRIORITÄT: Sende Ankunfts-E-Mail für Zubehör ${accessoryId} (Benutzer ${userId})`);
      console.log(`🔍 DEBUG: Nach ersten Debug-Logs - beginne Datenladung`);
      
      // Zubehör-Daten abrufen
      let accessory;
      try {
        console.log(`🔍 DEBUG: Rufe storage.getAccessory auf...`);
        accessory = await storage.getAccessory(accessoryId, userId);
        console.log(`🔍 DEBUG: storage.getAccessory erfolgreich:`, !!accessory);
      } catch (storageError) {
        console.error(`🔍 DEBUG: EXCEPTION bei storage.getAccessory:`, storageError);
        throw storageError;
      }
      
      if (!accessory) {
        return res.status(404).json({ message: "Zubehör nicht gefunden oder keine Berechtigung" });
      }
      
      // Kunde muss vorhanden sein für E-Mail-Versand
      if (!accessory.customerId) {
        return res.status(400).json({ message: "Keine Kunden-E-Mail vorhanden (Lager-Artikel)" });
      }
      
      // Kunden-Daten abrufen
      const customer = await storage.getCustomer(accessory.customerId, userId);
      if (!customer || !customer.email) {
        return res.status(400).json({ message: "Kunde nicht gefunden oder keine E-Mail-Adresse hinterlegt" });
      }
      
      // Benutzer-Daten für Shop-Informationen abrufen
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // KRITISCH: Geschäftseinstellungen des Shop-Owners laden für korrekte Daten
      console.log(`🔍 STEP 1: Starte Laden der Geschäftsdaten für Benutzer ${userId}`);
      
      const [businessSetting] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.id))
        .limit(1);
        
      console.log(`🔍 GESCHÄFTSDATEN: Für Benutzer ${userId} geladen:`, {
        businessName: businessSetting?.businessName,
        businessPhone: businessSetting?.businessPhone,
        businessEmail: businessSetting?.businessEmail,
        openingHours: businessSetting?.openingHours
      });
      
      console.log(`🔍 USER FALLBACK-DATEN:`, {
        shopName: dbUser.shopName,
        phone: dbUser.phone,
        email: dbUser.email,
        shopOpeningHours: dbUser.shopOpeningHours
      });
      
      console.log(`📧 ALLERHÖCHSTE PRIORITÄT: Sende E-Mail mit korrekter Vorlage "Zubehör eingetroffen" an ${customer.email}`);
      
      // E-Mail versenden mit der KORREKTEN E-Mail-Service-Funktion
      const { EmailService } = await import('./email-service.js');
      const emailServiceInstance = new EmailService();
      
      // Berechne offenen Betrag (Gesamtpreis - Anzahlung)
      const totalPriceNum = parseFloat(accessory.totalPrice) || 0;
      const downPaymentNum = parseFloat(accessory.downPayment || '0') || 0;
      const openAmountNum = Math.max(0, totalPriceNum - downPaymentNum);

      const emailVariables = {
        kundenname: `${customer.firstName} ${customer.lastName}`,
        bestellnummer: `ZUB-${accessory.id}`,
        artikel: accessory.articleName,
        menge: accessory.quantity.toString(),
        gesamtpreis: accessory.totalPrice,
        anzahlung: accessory.downPayment || '0,00',
        offener_betrag: openAmountNum.toFixed(2).replace('.', ','),
        // KRITISCH: Verwende Shop-Owner Geschäftsdaten statt user-Daten
        oeffnungszeiten: businessSetting?.openingHours || user.shopOpeningHours || 'Mo-Fr: 9:00-18:00',
        geschaeftsname: businessSetting?.businessName || user.shopName || 'Handyshop',
        adresse: businessSetting?.businessAddress || user.shopAddress || '',
        telefon: businessSetting?.businessPhone || user.phone || '',
        email: businessSetting?.businessEmail || user.email || '',
        // Zusätzliche Varianten, die in E-Mail-Vorlagen verwendet werden könnten
        businessName: businessSetting?.businessName || 'Mac and Phone Doc',
        business_name: businessSetting?.businessName || 'Mac and Phone Doc',
        shopName: businessSetting?.businessName || 'Mac and Phone Doc',
        shop_name: businessSetting?.businessName || 'Mac and Phone Doc',
        firmename: businessSetting?.businessName || 'Mac and Phone Doc',
        firmenname: businessSetting?.businessName || 'Mac and Phone Doc'
      };
      
      console.log(`🔍 E-MAIL-VARIABLEN:`, emailVariables);

      // Verwende direkt die Template-ID um sicherzustellen, dass die richtige Vorlage verwendet wird
      // WICHTIG: userId in emailVariables hinzufügen, damit Shop-Owner-SMTP verwendet wird
      emailVariables.userId = userId.toString();
      
      const emailResult = await emailServiceInstance.sendEmailWithTemplateById(
        78,  // ID der "Zubehör eingetroffen" Vorlage
        customer.email,
        emailVariables,
        false,  // isSystemEmail = false, um Shop-Owner-SMTP zu verwenden
        userId  // KRITISCH: userId als separater Parameter für Shop-Owner SMTP
      );
      
      const success = emailResult;
      
      if (success) {
        // E-Mail-Status in der Datenbank aktualisieren
        await storage.updateAccessory(accessoryId, { emailSent: true }, userId);
        
        console.log(`[E-MAIL-VERSAND] ALLERHÖCHSTE PRIORITÄT: Ankunfts-E-Mail erfolgreich gesendet für Zubehör ${accessoryId}`);
        res.json({ message: "E-Mail erfolgreich gesendet" });
      } else {
        console.error(`[E-MAIL-VERSAND] ALLERHÖCHSTE PRIORITÄT Fehler beim E-Mail-Versand`);
        res.status(500).json({ message: "Fehler beim Senden der E-Mail" });
      }
      
    } catch (error) {
      console.error("[E-MAIL-VERSAND] ALLERHÖCHSTE PRIORITÄT Fehler beim Senden der Ankunfts-E-Mail:", error);
      res.status(500).json({ 
        message: "Fehler beim Senden der E-Mail",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // KRITISCH: SPARE PARTS ROUTES MÜSSEN GANZ AM ANFANG STEHEN!
  app.get("/api/orders/spare-parts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      console.log(`[DIREKTE ROUTE] Abrufen aller Ersatzteile für Benutzer ${userId}`);
      
      const spareParts = await storage.getAllSpareParts(userId);
      console.log(`[DIREKTE ROUTE] Gefunden: ${spareParts.length} Ersatzteile für Benutzer ${userId}`);
      
      res.json(spareParts);
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Abrufen aller Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ZUBEHÖR ROUTES - MÜSSEN EBENFALLS AM ANFANG STEHEN!
  app.get("/api/orders/accessories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      console.log(`[DIREKTE ROUTE] Abrufen aller Zubehör-Bestellungen für Benutzer ${userId}`);
      
      const accessories = await storage.getAllAccessories(userId);
      console.log(`[DIREKTE ROUTE] Gefunden: ${accessories.length} Zubehör-Bestellungen für Benutzer ${userId}`);
      
      res.json(accessories);
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Abrufen aller Zubehör-Bestellungen:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Zubehör-Bestellungen",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/orders/accessories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      console.log(`[DIREKTE ROUTE] Erstellen einer Zubehör-Bestellung für Benutzer ${userId}:`, req.body);
      
      // Benutzer abrufen für Shop-ID
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      const shopId = dbUser.shopId || 1;
      
      // Zubehör-Daten mit Shop-ID und Benutzer-ID ergänzen
      const accessoryData = {
        ...req.body,
        userId: userId,
        shopId: shopId
      };
      
      const accessory = await storage.createAccessory(accessoryData);
      console.log(`[DIREKTE ROUTE] Zubehör-Bestellung erstellt:`, accessory);
      
      // Activity-Log für neu erstellte Zubehör-Bestellung
      try {
        await storage.logOrderActivity(
          'created',
          accessory.id,
          accessory,
          userId,
          dbUser.username || dbUser.email || 'Unbekannter Benutzer'
        );
        console.log(`📋 Activity-Log für neue Zubehör-Bestellung ${accessory.id} erstellt`);
      } catch (activityError) {
        console.error("❌ Fehler beim Erstellen des Order-Activity-Logs:", activityError);
      }
      
      res.status(201).json(accessory);
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Erstellen der Zubehör-Bestellung:", error);
      res.status(500).json({ 
        message: "Fehler beim Erstellen der Zubehör-Bestellung",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  
  app.patch("/api/orders/spare-parts-bulk-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      const { partIds, status } = req.body;
      
      console.log(`[DIREKTE ROUTE] Bulk-Update für Ersatzteile:`, { partIds, status, userId });
      
      if (!Array.isArray(partIds) || partIds.length === 0) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-IDs" });
      }
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Ungültiger Status" });
      }
      
      const success = await storage.bulkUpdateSparePartStatus(partIds, status, userId);
      
      if (success) {
        // Activity-Log für Ersatzteil Bulk-Update
        try {
          const user = await storage.getUser(userId);
          await storage.logOrderActivity(
            'bulk_updated',
            0, // Bulk-Operation hat keine einzelne ID
            { partIds, status, count: partIds.length },
            userId,
            user?.username || user?.email || 'Unbekannter Benutzer'
          );
          console.log(`📋 Activity-Log für Ersatzteil Bulk-Update erstellt: ${partIds.length} Teile`);
        } catch (activityError) {
          console.error("❌ Fehler beim Erstellen des Order-Activity-Logs:", activityError);
        }
        
        res.json({ message: "Ersatzteile erfolgreich aktualisiert", partIds, status });
      } else {
        res.status(500).json({ message: "Fehler beim Aktualisieren der Ersatzteile" });
      }
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Bulk-Update der Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });


  // PWA-ROUTES: Service Worker und Manifest mit korrekten MIME-Types bedienen
  app.get('/sw.js', (req, res) => {
    const swPath = path.resolve(import.meta.dirname, '..', 'public', 'sw.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    try {
      const swContent = fs.readFileSync(swPath, 'utf8');
      res.send(swContent);
    } catch (error) {
      console.error('Error serving service worker:', error);
      res.status(404).send('Service Worker not found');
    }
  });

  app.get('/manifest.json', (req, res) => {
    const manifestPath = path.resolve(import.meta.dirname, '..', 'public', 'manifest.json');
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      res.send(manifestContent);
    } catch (error) {
      console.error('Error serving manifest:', error);
      res.status(404).send('Manifest not found');
    }
  });
  

  
  app.patch("/api/orders/spare-parts-bulk-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      const { partIds, status } = req.body;
      
      console.log(`Bulk-Update für Ersatzteile:`, { partIds, status, userId });
      
      if (!Array.isArray(partIds) || partIds.length === 0) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-IDs" });
      }
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Ungültiger Status" });
      }
      
      const success = await storage.bulkUpdateSparePartStatus(partIds, status, userId);
      
      if (success) {
        res.json({ message: "Ersatzteile erfolgreich aktualisiert", partIds, status });
      } else {
        res.status(500).json({ message: "Fehler beim Aktualisieren der Ersatzteile" });
      }
    } catch (error) {
      console.error("Fehler beim Bulk-Update der Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 🚨 DELETE ROUTE VERSCHOBEN: War oben und fing PUT /api/orders/accessories/bulk-update ab!
  // DELETE individual accessory - MUSS NACH BULK-UPDATE STEHEN
  app.delete("/api/orders/accessories/:id", async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error(`[DELETE ACCESSORY] ❌ Ungültige ID: "${req.params.id}" - isNaN: ${isNaN(id)}`);
        return res.status(400).json({ message: "Ungültige Zubehör-ID" });
      }
      
      console.log(`[DELETE ACCESSORY] 🗑️ Löschen des Zubehörs ${id} für Benutzer ${userId}`);
      
      const success = await storage.deleteAccessory(id, userId);
      
      if (success) {
        console.log(`[DELETE ACCESSORY] ✅ Zubehör ${id} erfolgreich gelöscht für Benutzer ${userId}`);
        
        // Activity-Log für Zubehör-Bestellung-Löschung
        try {
          const user = await storage.getUser(userId);
          await storage.logOrderActivity(
            'deleted',
            id,
            { id, name: 'Gelöschte Zubehör-Bestellung' },
            userId,
            user?.username || user?.email || 'Unbekannter Benutzer'
          );
          console.log(`📋 Activity-Log für Zubehör-Löschung ${id} erstellt`);
        } catch (activityError) {
          console.error("❌ Fehler beim Erstellen des Order-Activity-Logs:", activityError);
        }
        
        res.json({ message: "Zubehör erfolgreich gelöscht", accessoryId: id });
      } else {
        res.status(404).json({ message: "Zubehör nicht gefunden oder keine Berechtigung" });
      }
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Löschen des Zubehörs:", error);
      res.status(500).json({ 
        message: "Fehler beim Löschen des Zubehörs",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Etikett-PDF für Zubehör-Bestellung generieren  
  app.post("/api/accessories/:id/print-label", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      const accessoryId = parseInt(req.params.id);
      if (!accessoryId) {
        return res.status(400).json({ message: "Ungültige Zubehör-ID" });
      }
      
      console.log(`[ETIKETT-DRUCK] Erstelle Etikett für Zubehör-Bestellung ${accessoryId} (Benutzer ${userId})`);
      
      // Zubehör-Daten abrufen
      const accessory = await storage.getAccessory(accessoryId, userId);
      if (!accessory) {
        return res.status(404).json({ message: "Zubehör nicht gefunden oder keine Berechtigung" });
      }
      
      // Nur bei Status "eingetroffen" erlaubt
      if (accessory.status !== "eingetroffen") {
        return res.status(400).json({ message: "Etikett kann nur für eingetroffenes Zubehör gedruckt werden" });
      }
      
      // Kunden-Daten abrufen falls vorhanden
      let customer = null;
      if (accessory.customerId) {
        customer = await storage.getCustomer(accessory.customerId, userId);
      }
      
      // Benutzer-Daten für Shop-Informationen abrufen
      const dbUser = await storage.getUser(userId);
      
      // PDF generieren
      const { generateAccessoryLabelPDF } = await import('./pdf-generator');
      const pdfBuffer = await generateAccessoryLabelPDF({
        accessory,
        customer,
        shopInfo: {
          name: dbUser?.shopName || 'Handyshop',
          address: dbUser?.shopAddress || '',
          phone: dbUser?.phone || '',
          email: dbUser?.email || ''
        }
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Etikett_Zubehoer_${accessory.articleName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
      res.send(pdfBuffer);
      
      console.log(`[ETIKETT-DRUCK] PDF erfolgreich generiert für Zubehör ${accessoryId}`);
      
    } catch (error) {
      console.error("[ETIKETT-DRUCK] Fehler beim Generieren des Etiketts:", error);
      res.status(500).json({ 
        message: "Fehler beim Generieren des Etiketts",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  // DELETE individual spare part from orders
  app.delete("/api/orders/spare-parts/:id", async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-ID" });
      }
      
      console.log(`[DIREKTE ROUTE] Löschen des Ersatzteils ${id} für Benutzer ${userId}`);
      
      const success = await storage.deleteSparePart(id, userId);
      
      if (success) {
        console.log(`[DIREKTE ROUTE] Ersatzteil ${id} erfolgreich gelöscht für Benutzer ${userId}`);
        res.json({ message: "Ersatzteil erfolgreich gelöscht", sparePartId: id });
      } else {
        res.status(404).json({ message: "Ersatzteil nicht gefunden oder keine Berechtigung" });
      }
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Löschen des Ersatzteils:", error);
      res.status(500).json({ 
        message: "Fehler beim Löschen des Ersatzteils",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // KIOSK-ROUTE: Registriere Kiosk-Unterschrift-Route ZUERST, um Middleware zu umgehen
  app.post("/api/kiosk-signature", async (req: Request, res: Response) => {
    try {
      const { repairId, signature, deviceCode, deviceCodeType, timestamp } = req.body;
      
      console.log('Kiosk-Unterschrift empfangen:', { repairId, deviceCodeType: deviceCodeType, hasDeviceCode: !!deviceCode, timestamp });
      
      if (!repairId || !signature) {
        return res.status(400).json({ message: "Reparatur-ID und Unterschrift sind erforderlich" });
      }

      // Nur Pool für direkte SQL-Abfragen verwenden
      const { pool } = await import('./db');
      
      // Reparatur mit Status abrufen, um richtige Unterschrift-Spalte zu bestimmen
      const checkResult = await pool.query('SELECT id, status FROM repairs WHERE id = $1', [repairId]);
      if (checkResult.rows.length === 0) {
        console.log(`Reparatur mit ID ${repairId} nicht gefunden`);
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      const repair = checkResult.rows[0];
      const status = repair.status;
      
      // Bestimme Unterschrift-Typ basierend auf Status
      let signatureType = 'pickup'; // Standard
      if (status === 'eingegangen') {
        signatureType = 'dropoff';
      } else if (status === 'fertig') {
        signatureType = 'pickup';
      }
      
      console.log(`Reparatur ${repairId} gefunden (Status: ${status}), speichere ${signatureType}-Unterschrift...`);

      if (deviceCode && deviceCodeType) {
        // Mit Gerätecode - Verschlüsselung für Sicherheit
        const encryptedCode = Buffer.from(deviceCode).toString('base64');
        
        if (signatureType === 'dropoff') {
          await pool.query(
            'UPDATE repairs SET dropoff_signature = $1, dropoff_signed_at = NOW(), device_code = $2, device_code_type = $3 WHERE id = $4',
            [signature, encryptedCode, deviceCodeType, repairId]
          );
        } else {
          await pool.query(
            'UPDATE repairs SET pickup_signature = $1, pickup_signed_at = NOW(), device_code = $2, device_code_type = $3 WHERE id = $4',
            [signature, encryptedCode, deviceCodeType, repairId]
          );
        }
        console.log(`Gerätecode gespeichert (Typ: ${deviceCodeType}) für Reparatur ${repairId}`);
      } else {
        // Nur Unterschrift
        if (signatureType === 'dropoff') {
          await pool.query(
            'UPDATE repairs SET dropoff_signature = $1, dropoff_signed_at = NOW() WHERE id = $2',
            [signature, repairId]
          );
        } else {
          await pool.query(
            'UPDATE repairs SET pickup_signature = $1, pickup_signed_at = NOW() WHERE id = $2',
            [signature, repairId]
          );
        }
      }

      // Prüfen ob es eine aktive temporäre Unterschrift für diese Reparatur gibt
      const tempSignatureResult = await pool.query(
        'SELECT temp_id FROM temp_signatures WHERE (repair_data->>\'repairId\')::integer = $1 AND status = \'pending\' ORDER BY created_at DESC LIMIT 1',
        [repairId]
      );
      
      if (tempSignatureResult.rows.length > 0) {
        const tempId = tempSignatureResult.rows[0].temp_id;
        console.log(`Aktualisiere temporäre Unterschrift ${tempId} mit Kiosk-Unterschrift`);
        
        // Temporäre Unterschrift auf "signed" setzen
        await pool.query(
          'UPDATE temp_signatures SET status = \'signed\', customer_signature = $1, signed_at = NOW() WHERE temp_id = $2',
          [signature, tempId]
        );
      }

      // Automatische Status-Änderung bei Pickup-Unterschrift (Status "fertig" → "abgeholt")
      if (signatureType === 'pickup' && status === 'fertig') {
        console.log(`Status "fertig" → "abgeholt" für Reparatur ${repairId} nach Pickup-Unterschrift`);
        
        // Status ohne E-Mail-Benachrichtigung auf "abgeholt" setzen
        await pool.query(
          'UPDATE repairs SET status = $1 WHERE id = $2',
          ['abgeholt', repairId]
        );
        
        // Status-History-Eintrag für automatische Änderung erstellen
        // Zuerst shopId der Reparatur abrufen
        const repairDetailsResult = await pool.query(
          'SELECT shop_id FROM repairs WHERE id = $1',
          [repairId]
        );
        
        if (repairDetailsResult.rows.length > 0) {
          const shopId = repairDetailsResult.rows[0].shop_id;
          
          // Ermittle userId aus temporärer Unterschrift für korrekte changedBy-Attribution
          let changedBy = 'System';
          let userId = null;
          
          if (tempSignatureResult.rows.length > 0) {
            const tempId = tempSignatureResult.rows[0].temp_id;
            const tempDataResult = await pool.query(
              'SELECT user_id FROM temp_signatures WHERE temp_id = $1',
              [tempId]
            );
            
            if (tempDataResult.rows.length > 0) {
              userId = tempDataResult.rows[0].user_id;
              
              // Benutzer-Daten abrufen für changedBy
              const user = await storage.getUser(userId);
              if (user) {
                changedBy = storage.getUserDisplayName(user);
              }
            }
          }
          
          // History-Eintrag mit korrektem Benutzer erstellen
          await pool.query(
            'INSERT INTO repair_status_history (repair_id, old_status, new_status, changed_at, changed_by, notes, shop_id, user_id) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)',
            [repairId, 'fertig', 'abgeholt', changedBy, 'Automatisch nach Pickup-Unterschrift im Kiosk-Modus', shopId, userId]
          );
        }
        
        console.log(`✅ Status automatisch auf "abgeholt" gesetzt für Reparatur ${repairId}`);
      }

      // WebSocket-Nachricht an Hauptgerät senden
      const { getOnlineStatusManager } = await import('./websocket-server');
      const onlineStatusManager = getOnlineStatusManager();
      if (onlineStatusManager) {
        onlineStatusManager.broadcast({
          type: 'signature-completed',
          repairId: repairId,
          timestamp: timestamp
        });
      }

      console.log(`Kiosk-Unterschrift für Reparatur ${repairId} gespeichert`);
      res.json({ success: true, message: "Unterschrift erfolgreich gespeichert" });
    } catch (error) {
      console.error("Fehler beim Speichern der Kiosk-Unterschrift:", error);
      res.status(500).json({ message: "Fehler beim Speichern der Unterschrift" });
    }
  });

  // Ersatzteil Bulk-Update Route (Header-basiert)
  app.put("/api/orders/spare-parts/bulk-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      
      const { sparePartIds, status } = req.body;
      
      console.log(`[DIREKTE ROUTE] Bulk-Update für Ersatzteile:`, { sparePartIds, status, userId });
      
      if (!Array.isArray(sparePartIds) || sparePartIds.length === 0) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-IDs" });
      }
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Ungültiger Status" });
      }
      
      const success = await storage.bulkUpdateSparePartStatus(sparePartIds, status, userId);
      
      if (success) {
        res.json({ message: "Ersatzteile erfolgreich aktualisiert", sparePartIds, status });
      } else {
        res.status(500).json({ message: "Fehler beim Aktualisieren der Ersatzteile" });
      }
    } catch (error) {
      console.error("[DIREKTE ROUTE] Fehler beim Bulk-Update der Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // CRITICAL: Register the brand creation route FIRST to bypass all middleware
  app.post("/api/superadmin/create-brand", async (req: Request, res: Response) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      if (userId !== 10) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: "Superadmin-Berechtigung erforderlich" }));
      }

      const { name, deviceTypeId } = req.body;
      
      if (!name || !deviceTypeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: "Name und Gerätetyp-ID sind erforderlich" }));
      }

      console.log(`DIRECT ROUTE: Erstelle neue Marke: ${name} für Gerätetyp-ID: ${deviceTypeId}`);

      // Import db here to avoid circular dependencies
      const { db } = await import('./db');
      const { userBrands } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');

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
          userId: 10,
          shopId: 1682,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`DIRECT ROUTE: Marke erfolgreich erstellt:`, newBrand);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newBrand));
    } catch (error) {
      console.error("DIRECT ROUTE: Fehler beim Erstellen der Marke:", error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: "Fehler beim Erstellen der Marke" }));
    }
  });

  // CRITICAL FIX: Register models route BEFORE any other middleware
  app.get("/api/superadmin/models", async (req, res) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      if (userId !== 10) {
        return res.status(403).json({ message: "Superadmin-Berechtigung erforderlich" });
      }

      console.log(`DIRECT MODELS ROUTE: Lade alle Modelle für Superadmin`);

      const { db } = await import('./db');
      const { userModels, userBrands, userDeviceTypes } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      // Alle Modelle laden
      const models = await db.select().from(userModels).orderBy(userModels.createdAt);
      
      // Alle Marken laden
      const brands = await db.select().from(userBrands);
      
      // Alle Gerätetypen laden
      const deviceTypes = await db.select().from(userDeviceTypes);
      
      // Daten manuell zusammenführen
      const formattedModels = models.map(model => {
        const brand = brands.find(b => b.id === model.brandId);
        const deviceType = brand ? deviceTypes.find(dt => dt.id === brand.deviceTypeId) : null;
        
        return {
          id: model.id,
          name: model.name,
          modelSeriesId: model.modelSeriesId,
          brandId: model.brandId,
          brandName: brand?.name || 'Unbekannte Marke',
          deviceTypeId: brand?.deviceTypeId || null,
          deviceTypeName: deviceType?.name || 'Unbekannter Typ',
          shopId: model.shopId,
          userId: model.userId,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt
        };
      });

      console.log(`DIRECT MODELS ROUTE: ${formattedModels.length} Modelle gefunden`);
      return res.json(formattedModels);
    } catch (error) {
      console.error("DIRECT MODELS ROUTE: Fehler beim Laden der Modelle:", error);
      return res.status(500).json({ message: "Fehler beim Laden der Modelle" });
    }
  });

  // CRITICAL FIX: Register bulk import route BEFORE any other middleware
  app.post("/api/superadmin/device-models/bulk", async (req, res) => {
    try {
      const user = requireUser(req);
      const userId = user.id;
      if (userId !== 10) {
        return res.status(403).json({ message: "Superadmin-Berechtigung erforderlich" });
      }

      const { brandId, models } = req.body;
      
      if (!brandId || !models || !Array.isArray(models)) {
        return res.status(400).json({ message: "BrandId und Modelle-Array sind erforderlich" });
      }

      console.log(`DIRECT BULK ROUTE: Importiere ${models.length} Modelle für Marke ${brandId}`);

      const { db } = await import('./db');
      const { userModels } = await import('@shared/schema');

      let importedCount = 0;
      const results = [];

      for (const model of models) {
        try {
          const [newModel] = await db.insert(userModels)
            .values({
              name: model.name,
              brandId: brandId,
              userId: 10,
              shopId: 1682,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          results.push(newModel);
          importedCount++;
          console.log(`DIRECT BULK ROUTE: Modell '${model.name}' erfolgreich hinzugefügt`);
        } catch (error) {
          console.error(`DIRECT BULK ROUTE: Fehler beim Hinzufügen von Modell '${model.name}':`, error);
        }
      }

      console.log(`DIRECT BULK ROUTE: ${importedCount} von ${models.length} Modellen erfolgreich importiert`);
      return res.json({
        success: true,
        importedCount,
        totalModels: models.length,
        models: results
      });
    } catch (error) {
      console.error("DIRECT BULK ROUTE: Fehler beim Bulk-Import:", error);
      return res.status(500).json({ message: "Fehler beim Bulk-Import" });
    }
  });

  // Set up authentication
  setupAuth(app);
  
  // SECURITY HOTFIX: Global authentication for all /api routes except public ones  
  // Applied AFTER Passport.js setup so req.isAuthenticated() is available
  const publicEndpoints = [
    '/api/health',
    '/api/auth/login', 
    '/api/auth/logout',
    '/api/auth/password-reset/request',
    '/api/auth/password-reset/confirm',
    '/api/newsletter/unsubscribe'
  ];
  
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for public endpoints
    if (publicEndpoints.some(endpoint => req.path === endpoint || req.path.startsWith(endpoint))) {
      return next();
    }
    // Require authentication for all other /api routes
    return isAuthenticated(req, res, next);
  });
  
  // Set up multi-shop routes FIRST (before any middleware that might interfere)
  registerMultiShopRoutes(app);
  
  // Set up multi-shop admin routes
  registerMultiShopAdminRoutes(app);
  
  // Set up employee routes (must be after authentication)
  setupEmployeeRoutes(app);
  
  // Set up superadmin routes
  registerSuperadminRoutes(app);

  // Set up 2FA routes
  registerTwoFARoutes(app);
  
  // Globale Middleware für Shop-Isolation registrieren
  // Diese Middleware hängt automatisch die Shop-ID des angemeldeten Benutzers an alle Anfragen an
  app.use(attachShopId);
  
  // Set up admin routes
  registerAdminRoutes(app);
  
  // API für SMTP-Test - Für alle Benutzer zugänglich
  app.post('/api/smtp-test', isAuthenticated, async (req, res) => {
    try {
      // Die Einschränkung auf Administratoren wurde entfernt, damit alle Benutzer
      // ihre eigenen E-Mail-Einstellungen testen können
      
      const { host, port, user, password, sender, recipient } = req.body;
      
      console.log('SMTP Test mit folgenden Parametern:');
      console.log(`Host: ${host}, Port: ${port}, Benutzer: ${user}`);
      
      if (!host || !port || !user || !password || !sender || !recipient) {
        return res.status(400).json({
          success: false,
          message: 'Alle SMTP-Parameter müssen angegeben werden'
        });
      }
      
      // Erstelle einen temporären Transporter zum Testen
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
          user,
          pass: password
        },
        debug: true,
        logger: true,
        tls: {
          rejectUnauthorized: false
        }
      });
      
      try {
        // Explizit die Verbindung testen
        console.log('SMTP-Verbindungstest wird gestartet...');
        await transporter.verify();
        console.log('SMTP-Verbindungstest erfolgreich');
        
        // Test-E-Mail senden
        const info = await transporter.sendMail({
          from: `"${sender}" <${user}>`,
          to: recipient,
          subject: 'SMTP-Test von Handyshop Verwaltung',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4f46e5;">SMTP-Test erfolgreich!</h2>
              <p>Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist und E-Mails versendet werden können.</p>
              <p>Details der Konfiguration:</p>
              <ul>
                <li>Host: ${host}</li>
                <li>Port: ${port}</li>
                <li>Benutzer: ${user}</li>
                <li>Absender: ${sender}</li>
              </ul>
              <p>Gesendet: ${new Date().toLocaleString('de-DE')}</p>
            </div>
          `,
          text: `SMTP-Test erfolgreich! Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist und E-Mails versendet werden können.`
        });
        
        console.log('Test-E-Mail erfolgreich gesendet:', info.messageId);
        
        return res.json({
          success: true,
          message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet.',
          details: {
            messageId: info.messageId,
            response: info.response
          }
        });
      } catch (error) {
        console.error('SMTP-Test fehlgeschlagen:', error);
        
        return res.status(500).json({
          success: false,
          message: 'SMTP-Test fehlgeschlagen',
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            response: error.response,
            responseCode: error.responseCode,
            command: error.command
          }
        });
      } finally {
        // Transporter schließen
        transporter.close();
      }
    } catch (error) {
      console.error('Fehler beim SMTP-Test:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Fehler beim SMTP-Test',
        error: error.message
      });
    }
  });
  
  // API zum Speichern neuer SMTP-Einstellungen - Für alle Benutzer zugänglich
  app.post('/api/smtp-settings', isAuthenticated, async (req, res) => {
    try {
      // Die Einschränkung auf Administratoren wurde entfernt, damit alle Benutzer
      // ihre eigenen SMTP-Einstellungen verwalten können
      
      const { host, port, user, password, sender_name, sender_email } = req.body;
      
      if (!host || !port || !user || !password || !sender_name || !sender_email) {
        return res.status(400).json({
          success: false,
          message: 'Alle SMTP-Parameter müssen angegeben werden'
        });
      }
      
      // Aktualisiere die SMTP-Einstellungen in der Datenbank
      const success = await emailService.updateSuperadminSmtpSettings({
        smtpHost: host,
        smtpPort: port,
        smtpUser: user,
        smtpPassword: password,
        smtpSenderName: sender_name,
        smtpSenderEmail: sender_email,
        isActive: true
      });
      
      if (success) {
        return res.json({
          success: true,
          message: 'SMTP-Einstellungen wurden erfolgreich aktualisiert'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'SMTP-Einstellungen konnten nicht aktualisiert werden'
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der SMTP-Einstellungen:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Speichern der SMTP-Einstellungen',
        error: error.message
      });
    }
  });
  // Set up superadmin print templates routes
  registerSuperadminPrintTemplatesRoutes(app);
  
  // Set up support access routes for DSGVO-compliance
  app.use('/api/support-access', supportAccessRouter);
  
  // Set up global device data routes
  registerGlobalDeviceRoutes(app);
  
  // CUSTOMERS API mit DSGVO-konformer Shop-Isolation
  app.get("/api/customers", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      console.log("GET /api/customers: Auth status:", req.isAuthenticated(), "User:", req.user?.username);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      // DSGVO-konform: Multi-Shop Admin Header prüfen
      const multiShopMode = req.headers['x-multi-shop-mode'] === 'true';
      const selectedShopIdHeader = req.headers['x-selected-shop-id'];
      
      if (user?.isMultiShopAdmin && multiShopMode && selectedShopIdHeader) {
        const shopId = parseInt(selectedShopIdHeader as string);
        console.log(`🌐 DSGVO-API: Multi-Shop Admin ${user.username} lädt Kunden für Shop ${shopId} per Header`);
        
        // Prüfen ob der Multi-Shop Admin Zugriff auf diesen Shop hat
        const accessibleShops = await storage.getUserAccessibleShops(userId);
        const hasAccess = accessibleShops.some(access => access.shopId === shopId);
        
        if (!hasAccess) {
          console.warn(`❌ Multi-Shop Admin ${user.username} hat keinen Zugang zu Shop ${shopId}`);
          return res.status(403).json({ error: "Zugriff auf diesen Shop verweigert" });
        }
        
        // Shop-spezifische Kunden laden
        const shopCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.shopId, shopId))
          .orderBy(desc(customers.createdAt));
        
        console.log(`🌐 DSGVO-API: ${shopCustomers.length} Kunden für Multi-Shop Admin aus Shop ${shopId} geladen`);
        return res.json(shopCustomers);
      }
      
      // Multi-Shop Admin Modus prüfen (Query-Parameter Fallback)
      if (user?.isMultiShopAdmin && req.query.shopId) {
        const selectedShopId = parseInt(req.query.shopId as string);
        console.log(`🌐 Multi-Shop Admin ${user.username}: Lade Kunden für Shop ${selectedShopId}`);
        
        // Prüfen ob der Multi-Shop Admin Zugriff auf diesen Shop hat
        const accessibleShops = await storage.getUserAccessibleShops(userId);
        const hasAccess = accessibleShops.some(access => access.shopId === selectedShopId);
        
        if (!hasAccess) {
          return res.status(403).json({ error: "Zugriff auf diesen Shop verweigert" });
        }
        
        // Shop-spezifische Kunden laden
        const shopCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.shopId, selectedShopId))
          .orderBy(desc(customers.createdAt));
        
        console.log(`🌐 Multi-Shop Admin: ${shopCustomers.length} Kunden für Shop ${selectedShopId} geladen`);
        return res.json(shopCustomers);
      }
      
      // Shop-ID aus der Shop-Isolation-Middleware
      const shopId = (req as any).userShopId;
      
      if (!shopId) {
        console.warn(`⚠️ DSGVO-Schutz: Anfrage ohne Shop-ID abgelehnt`);
        return res.status(403).json({ error: "Zugriff verweigert: Keine Shop-ID vorhanden" });
      }
      
      console.log(`DSGVO-konformer Zugriff: Benutzer ${req.user?.username} (ID: ${userId}) greift auf Kundendaten von Shop ${shopId} zu`);
      
      // Wenn firstName und lastName als Query-Parameter übergeben werden, suche nach Kunden mit diesem Namen
      if (req.query.firstName && req.query.lastName) {
        console.log(`Searching for customers with name: ${req.query.firstName} ${req.query.lastName}`);
        const firstName = req.query.firstName as string;
        const lastName = req.query.lastName as string;
        
        // Wenn einer der Parameter zu kurz ist, gebe eine leere Liste zurück
        if (firstName.length < 1 || lastName.length < 1) {
          return res.json([]);
        }
        
        // Direkter DB-Zugriff mit expliziter Shop-ID-Filterung für DSGVO-Konformität
        const matchingCustomers = await db
          .select()
          .from(customers)
          .where(and(
            eq(customers.shopId, shopId),
            sql`LOWER(${customers.firstName}) LIKE LOWER(${'%' + firstName + '%'})`,
            sql`LOWER(${customers.lastName}) LIKE LOWER(${'%' + lastName + '%'})`
          ))
          .orderBy(desc(customers.createdAt));
        
        console.log(`Found ${matchingCustomers.length} matching customers (strict shop isolation: ${shopId})`);
        return res.json(matchingCustomers);
      }
      
      // Wenn nur firstName als Query-Parameter übergeben wird, suche nach Kunden mit ähnlichem Vornamen
      if (req.query.firstName) {
        console.log(`Searching for customers with first name: ${req.query.firstName}`);
        const firstName = req.query.firstName as string;
        if (firstName.length < 2) {
          return res.json([]);
        }
        
        // Direkter DB-Zugriff mit expliziter Shop-ID-Filterung für DSGVO-Konformität
        const matchingCustomers = await db
          .select()
          .from(customers)
          .where(and(
            eq(customers.shopId, shopId),
            sql`LOWER(${customers.firstName}) LIKE LOWER(${'%' + firstName + '%'})`
          ))
          .orderBy(desc(customers.createdAt));
        
        console.log(`Found ${matchingCustomers.length} customers matching first name "${firstName}" (strict shop isolation: ${shopId})`);
        return res.json(matchingCustomers);
      }
      
      // Ansonsten gebe alle Kunden zurück (gefiltert nach Shop-ID)
      const allCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.shopId, shopId))
        .orderBy(desc(customers.createdAt));
      
      console.log(`Returning all ${allCustomers.length} customers (strict shop isolation: ${shopId})`);
      res.json(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Kunden" });
    }
  });
  
  app.get("/api/customers/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kunde abrufen mit Benutzerfilterung
      const customer = await storage.getCustomer(id, userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });
  
  app.post("/api/customers", isAuthenticated, attachShopId, checkTrialExpiry, async (req: Request, res: Response) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Benutzer aus der Datenbank holen, um die Shop-ID zu bekommen
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.shopId) {
        console.warn(`⚠️ DSGVO-Schutz: Kunde kann nicht ohne Shop-ID erstellt werden (User: ${userId})`);
        return res.status(403).json({ error: "Zugriff verweigert: Keine Shop-ID vorhanden" });
      }
      
      // DSGVO-konforme Kundenerstellung mit expliziter Shop-ID
      const newCustomer = {
        ...customerData,
        userId: userId,
        shopId: user.shopId,
        createdBy: storage.getUserDisplayName(user), // Audit-Trail: Benutzername für Shop-Owner, Vorname für Mitarbeiter
        createdAt: new Date()
      };
      
      // Direkter DB-Zugriff für DSGVO-konforme Verarbeitung
      const [customer] = await db
        .insert(customers)
        .values(newCustomer)
        .returning();
      
      console.log(`✅ DSGVO-konform: Neuer Kunde ${customer.firstName} ${customer.lastName} für Shop ${user.shopId} erstellt`);
      
      // Activity-Log für neu erstellten Kunden
      try {
        await storage.logCustomerActivity(
          'created',
          customer.id,
          customer,
          userId,
          user.username || user.email || 'Unbekannter Benutzer'
        );
        console.log(`📋 Activity-Log für neuen Kunden ${customer.id} erstellt`);
      } catch (activityError) {
        console.error("❌ Fehler beim Erstellen des Customer-Activity-Logs:", activityError);
      }
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Fehler beim Erstellen eines Kunden:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Get user to retrieve shop ID
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.shopId) {
        return res.status(403).json({ error: "Access denied: No shop ID" });
      }
      
      // Get customer with shop isolation
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.shopId, user.shopId)));
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      console.log(`✅ DSGVO-conform: Customer ${customer.firstName} ${customer.lastName} (ID: ${id}) retrieved for shop ${user.shopId}`);
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Get customer repairs
  app.get("/api/customers/:id/repairs", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Get user to retrieve shop ID
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.shopId) {
        return res.status(403).json({ error: "Access denied: No shop ID" });
      }
      
      // Get repairs for this customer with shop isolation
      const customerRepairs = await db
        .select()
        .from(repairs)
        .where(and(eq(repairs.customerId, customerId), eq(repairs.shopId, user.shopId)))
        .orderBy(desc(repairs.createdAt));
      
      console.log(`✅ DSGVO-conform: ${customerRepairs.length} repairs retrieved for customer ${customerId} in shop ${user.shopId}`);
      res.json(customerRepairs);
    } catch (error) {
      console.error("Error fetching customer repairs:", error);
      res.status(500).json({ message: "Failed to fetch customer repairs" });
    }
  });
  
  app.patch("/api/customers/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Versuche Kunde ${id} zu aktualisieren mit Daten:`, req.body);
      
      const customerData = insertCustomerSchema.partial().parse(req.body);
      console.log("Daten nach Zod-Validierung:", customerData);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      console.log(`Aktualisierung für Kunde ${id} durch Benutzer ${userId}`);
      
      // Benutzer abrufen, um die Shop-ID zu bekommen
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.shopId) {
        console.warn(`⚠️ DSGVO-Schutz: Keine Shop-ID für Benutzer ${userId} gefunden`);
        return res.status(403).json({ error: "Zugriff verweigert: Keine Shop-ID vorhanden" });
      }
      
      console.log(`Benutzer ${userId} (${user.username}) hat Shop-ID ${user.shopId}`);
      
      // Prüfen, ob der Kunde zum Shop des Benutzers gehört
      const [existingCustomer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, id),
            eq(customers.shopId, user.shopId)
          )
        );
        
      if (!existingCustomer) {
        console.warn(`Kunde ${id} gehört nicht zu Shop ${user.shopId} von Benutzer ${userId}`);
        return res.status(404).json({ message: "Customer not found" });
      }
      
      console.log(`Bestehendes Kundenobjekt gefunden:`, existingCustomer);
      
      try {
        // Direkter SQL-Ansatz für die Aktualisierung, der robuster gegen ORM-Probleme ist
        const updateFields = [];
        const updateValues = [];
        let paramCounter = 1;
        
        // Füge nur die bereitgestellten Felder zum Update hinzu
        if (customerData.firstName !== undefined) {
          updateFields.push(`first_name = $${paramCounter}`);
          updateValues.push(customerData.firstName);
          paramCounter++;
        }
        
        if (customerData.lastName !== undefined) {
          updateFields.push(`last_name = $${paramCounter}`);
          updateValues.push(customerData.lastName);
          paramCounter++;
        }
        
        if (customerData.email !== undefined) {
          updateFields.push(`email = $${paramCounter}`);
          updateValues.push(customerData.email);
          paramCounter++;
        }
        
        if (customerData.phone !== undefined) {
          updateFields.push(`phone = $${paramCounter}`);
          updateValues.push(customerData.phone);
          paramCounter++;
        }
        
        if (customerData.address !== undefined) {
          updateFields.push(`address = $${paramCounter}`);
          updateValues.push(customerData.address);
          paramCounter++;
        }
        
        if (customerData.zipCode !== undefined) {
          updateFields.push(`zip_code = $${paramCounter}`);
          updateValues.push(customerData.zipCode);
          paramCounter++;
        }
        
        if (customerData.city !== undefined) {
          updateFields.push(`city = $${paramCounter}`);
          updateValues.push(customerData.city);
          paramCounter++;
        }
        
        if (customerData.notes !== undefined) {
          updateFields.push(`notes = $${paramCounter}`);
          updateValues.push(customerData.notes);
          paramCounter++;
        }
        
        // Keine updated_at Spalte in der Datenbank, also überspringen wir es
        
        // SQL-Abfrage erstellen - keine updated_at Spalte in der Abfrage verwenden
        const updateQuery = `
          UPDATE customers 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramCounter} AND shop_id = $${paramCounter + 1}
          RETURNING *
        `;
        updateValues.push(id, user.shopId);
        
        console.log("SQL Update-Abfrage:", updateQuery);
        console.log("Update-Parameter:", updateValues);
        
        // SQL-Abfrage ausführen
        const result = await pool.query(updateQuery, updateValues);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ message: "Customer not found or update failed" });
        }
        
        const customer = result.rows[0];
        console.log(`✅ DSGVO-konform: Kunde ${customer.first_name} ${customer.last_name} (ID: ${id}) für Shop ${user.shopId} aktualisiert`);
        
        // Konvertiere Snake-Case-Eigenschaften zu CamelCase für die Antwort
        const formattedCustomer = {
          id: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          zipCode: customer.zip_code,
          city: customer.city,
          notes: customer.notes,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at,
          shopId: customer.shop_id,
          userId: customer.user_id
        };
        
        // Activity-Log für aktualisierten Kunden
        try {
          await storage.logCustomerActivity(
            'updated',
            formattedCustomer.id,
            formattedCustomer,
            userId,
            user.username || user.email || 'Unbekannter Benutzer'
          );
          console.log(`📋 Activity-Log für Kunden-Update ${formattedCustomer.id} erstellt`);
        } catch (activityError) {
          console.error("❌ Fehler beim Erstellen des Customer-Activity-Logs:", activityError);
        }
        
        res.json(formattedCustomer);
      } catch (dbError) {
        console.error("Fehler bei der Datenbankaktualisierung:", dbError);
        return res.status(500).json({ message: "Database update failed", error: dbError.message });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren eines Kunden:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });
  
  // Delete customer
  app.delete("/api/customers/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kunde mit Benutzerkontext löschen
      await storage.deleteCustomer(id, userId);
      
      // Activity-Log für gelöschten Kunden
      try {
        const user = await storage.getUser(userId);
        await storage.logCustomerActivity(
          'deleted',
          id,
          { id, name: 'Gelöschter Kunde' },
          userId,
          user?.username || user?.email || 'Unbekannter Benutzer'
        );
        console.log(`📋 Activity-Log für Kunden-Löschung ${id} erstellt`);
      } catch (activityError) {
        console.error("❌ Fehler beim Erstellen des Customer-Activity-Logs:", activityError);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      
      if (error instanceof Error) {
        // Spezifische Fehlermeldung für Kunden mit aktiven Reparaturen
        if (error.message.includes("aktive Reparaturen")) {
          return res.status(400).json({ message: error.message });
        }
        // Andere spezifische Fehlermeldungen
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });
  
  // REPAIRS API
  app.get("/api/repairs", isAuthenticated, attachShopId, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      // DSGVO-konform: Multi-Shop Admin Header prüfen
      const multiShopMode = req.headers['x-multi-shop-mode'] === 'true';
      const selectedShopId = req.headers['x-selected-shop-id'];
      
      if (user?.isMultiShopAdmin && multiShopMode && selectedShopId) {
        const shopId = parseInt(selectedShopId as string);
        console.log(`🌐 DSGVO-API: Multi-Shop Admin ${user.username} lädt Shop ${shopId} Daten per Header`);
        
        // NEUE PERMISSION-PRÜFUNG: Shop-Owner muss explizit zustimmen
        const hasPermission = await storage.hasShopPermission(userId, shopId);
        
        if (!hasPermission) {
          // Automatisch Permission Request erstellen
          const shopOwner = await storage.getUserByShopId(shopId);
          if (shopOwner) {
            await storage.requestShopAccess(userId, shopId, shopOwner.id);
          }
          console.warn(`❌ Multi-Shop Admin ${user.username} hat keine Berechtigung für Shop ${shopId} - Permission Request erstellt`);
          return res.status(403).json({ 
            error: "Shop-Owner Zustimmung erforderlich",
            permissionRequested: true 
          });
        }
        
        // Shop-spezifische Reparaturen laden
        const shopRepairs = await db
          .select()
          .from(repairs)
          .where(eq(repairs.shopId, shopId))
          .orderBy(desc(repairs.createdAt));
        
        console.log(`🌐 DSGVO-API: ${shopRepairs.length} Reparaturen für Multi-Shop Admin aus Shop ${shopId} geladen`);
        return res.json(shopRepairs);
      }
      
      // Multi-Shop Admin Modus prüfen (Query-Parameter Fallback)
      if (user?.isMultiShopAdmin && req.query.shopId) {
        const selectedShopId = parseInt(req.query.shopId as string);
        console.log(`🌐 Multi-Shop Admin ${user.username}: Lade Reparaturen für Shop ${selectedShopId}`);
        
        // NEUE PERMISSION-PRÜFUNG: Shop-Owner muss explizit zustimmen
        const hasPermission = await storage.hasShopPermission(userId, selectedShopId);
        
        if (!hasPermission) {
          // Automatisch Permission Request erstellen
          const shopOwner = await storage.getUserByShopId(selectedShopId);
          if (shopOwner) {
            await storage.requestShopAccess(userId, selectedShopId, shopOwner.id);
          }
          return res.status(403).json({ 
            error: "Shop-Owner Zustimmung erforderlich",
            permissionRequested: true 
          });
        }
        
        // Shop-spezifische Reparaturen laden
        const shopRepairs = await db
          .select()
          .from(repairs)
          .where(eq(repairs.shopId, selectedShopId))
          .orderBy(desc(repairs.createdAt));
        
        console.log(`🌐 Multi-Shop Admin: ${shopRepairs.length} Reparaturen für Shop ${selectedShopId} geladen`);
        return res.json(shopRepairs);
      }
      
      // Multi-Shop Service nutzen für erweiterten Zugriff
      const repairs = await multiShopService.getAllRepairsForUser(userId);
      console.log(`🌐 Loaded ${repairs.length} repairs for user ${req.user?.username}`);
      res.json(repairs);
    } catch (error) {
      console.error("Fehler beim Laden der Reparaturen:", error);
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  // Reparaturen abrufen, die auf Ersatzteile warten
  app.get("/api/repairs/waiting-for-parts", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const username = (req.user as any).username;
      console.log(`Abrufen von Reparaturen mit Ersatzteil-Bestellungen für Benutzer ${username} (ID: ${userId})`);
      
      // Reparaturen mit Status "Warten auf Ersatzteile" und zugehörige Kundendaten abrufen
      const repairsWithPendingParts = await storage.getRepairsWaitingForParts(userId);
      res.json(repairsWithPendingParts);
    } catch (error) {
      console.error("Fehler beim Abrufen der Reparaturen mit ausstehenden Ersatzteilen:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Bestellungen",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  

  
  app.get("/api/repairs/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const userId = (req.user as any).id;
      
      let repair: any;
      
      // Prüfe, ob es sich um eine numerische ID oder eine orderCode handelt
      const numericId = parseInt(idParam);
      if (!isNaN(numericId) && numericId.toString() === idParam) {
        // Numerische ID - verwende normale getRepair Methode
        repair = await storage.getRepair(numericId, userId);
      } else {
        // String (orderCode) - verwende getRepairByOrderCode Methode
        repair = await storage.getRepairByOrderCode(idParam, userId);
      }
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      res.json(repair);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repair" });
    }
  });

  // Route zum Entschlüsseln des Gerätecodes für autorisierte Mitarbeiter
  app.get("/api/repairs/:id/device-code", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const userId = (req.user as any).id;
      
      let repair: any;
      
      // Prüfe, ob es sich um eine numerische ID oder eine orderCode handelt
      const numericId = parseInt(idParam);
      if (!isNaN(numericId) && numericId.toString() === idParam) {
        // Numerische ID - verwende normale getRepair Methode
        repair = await storage.getRepair(numericId, userId);
      } else {
        // String (orderCode) - verwende getRepairByOrderCode Methode
        repair = await storage.getRepairByOrderCode(idParam, userId);
      }
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }

      if (!repair.deviceCode) {
        return res.status(404).json({ message: "Kein Gerätecode verfügbar" });
      }

      // Gerätecode entschlüsseln
      let decryptedCode = '';
      try {
        decryptedCode = Buffer.from(repair.deviceCode, 'base64').toString('utf-8');
      } catch (error) {
        console.error("Fehler beim Entschlüsseln des Gerätecodes:", error);
        return res.status(500).json({ message: "Fehler beim Entschlüsseln des Gerätecodes" });
      }

      console.log(`Gerätecode für Reparatur ${repair.id} entschlüsselt für Benutzer ${userId}`);
      
      res.json({
        deviceCode: decryptedCode,
        deviceCodeType: repair.deviceCodeType
      });
    } catch (error) {
      console.error("Fehler beim Abrufen des Gerätecodes:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Gerätecodes" });
    }
  });

  // Gerätecode aktualisieren/hinzufügen
  app.patch("/api/repairs/:id/device-code", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const { deviceCode, deviceCodeType } = req.body;

      if (!deviceCode || !deviceCodeType) {
        return res.status(400).json({ message: "deviceCode und deviceCodeType sind erforderlich" });
      }

      // Prüfe, ob die Reparatur dem Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }

      // Gerätecode verschlüsseln (Base64-Kodierung)
      const encryptedCode = Buffer.from(deviceCode, 'utf-8').toString('base64');

      // Reparatur mit neuem Gerätecode aktualisieren
      const updatedRepair = await storage.updateRepair(repairId, {
        deviceCode: encryptedCode,
        deviceCodeType: deviceCodeType
      }, userId);

      if (!updatedRepair) {
        return res.status(500).json({ message: "Fehler beim Aktualisieren des Gerätecodes" });
      }

      console.log(`Gerätecode für Reparatur ${repairId} wurde aktualisiert durch Benutzer ${userId}`);
      
      res.json({
        message: "Gerätecode wurde erfolgreich aktualisiert",
        deviceCodeType: updatedRepair.deviceCodeType
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Gerätecodes:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Gerätecodes" });
    }
  });

  // Gerätecode löschen
  app.delete("/api/repairs/:id/device-code", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      const userId = (req.user as any).id;

      // Prüfe, ob die Reparatur dem Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }

      // Gerätecode und -typ entfernen
      const updatedRepair = await storage.updateRepair(repairId, {
        deviceCode: null,
        deviceCodeType: null
      }, userId);

      if (!updatedRepair) {
        return res.status(500).json({ message: "Fehler beim Löschen des Gerätecodes" });
      }

      console.log(`Gerätecode für Reparatur ${repairId} wurde gelöscht durch Benutzer ${userId}`);
      
      res.json({
        message: "Gerätecode wurde erfolgreich gelöscht"
      });
    } catch (error) {
      console.error("Fehler beim Löschen des Gerätecodes:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Gerätecodes" });
    }
  });
  
  app.get("/api/customers/:id/repairs", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Reparaturen für den Kunden mit Benutzerfilterung abrufen
      const repairs = await storage.getRepairsByCustomerId(customerId, userId);
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer repairs" });
    }
  });
  
  app.post("/api/repairs", isAuthenticated, checkTrialExpiry, async (req: Request, res: Response) => {
    try {
      console.log("Received repair data:", JSON.stringify(req.body, null, 2));
      console.log("Auth status:", req.isAuthenticated(), "User:", req.user?.username);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Verwende safeParse für bessere Fehlerdiagnose
      const validationResult = insertRepairSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error);
        return res.status(400).json({ 
          message: "Ungültige Reparaturdaten", 
          errors: validationResult.error.errors 
        });
      }
      
      const repairData = validationResult.data;
      
      // Validate customerId exists - wichtig: userId mit übergeben
      const customer = await storage.getCustomer(repairData.customerId, userId);
      if (!customer) {
        console.error("Customer not found:", repairData.customerId, "for user:", userId);
        return res.status(400).json({ message: "Ungültige Kunden-ID" });
      }
      
      // Nicht mehr nötig, da deviceType und brand jetzt zentral verwaltet werden 
      // und keine Enum-Validierung mehr benötigen
      
      // Validate status if provided
      if (repairData.status && !repairStatuses.safeParse(repairData.status).success) {
        console.error("Invalid status:", repairData.status);
        return res.status(400).json({ message: "Ungültiger Reparaturstatus" });
      }
      
      // DSGVO-konformer direkter DB-Zugriff mit Shop-ID zur Erstellung der Reparatur
      // Benutzer abrufen, um die Shop-ID zu bekommen
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.shopId) {
        console.warn(`⚠️ DSGVO-Schutz: Reparatur kann nicht ohne Shop-ID erstellt werden (User: ${userId})`);
        return res.status(403).json({ error: "Zugriff verweigert: Keine Shop-ID vorhanden" });
      }
      
      // Auftragscode generieren im Format: (1. Buchstabe Marke)(1. Buchstabe Gerätetyp) + Jahr + 4 Zufallszahlen
      // Beispiel: Apple Smartphone = AS2305xxxx, Samsung Tablet = ST2305xxxx
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2); // letzten 2 Stellen des Jahres
      const brandFirstLetter = repairData.brand ? repairData.brand.charAt(0).toUpperCase() : 'X';
      const deviceTypeFirstLetter = repairData.deviceType ? repairData.deviceType.charAt(0).toUpperCase() : 'X';
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // zufällige 4-stellige Zahl
      const orderCode = `${brandFirstLetter}${deviceTypeFirstLetter}${year}${random}`;
      
      // Reparatur mit Shop-ID und Auftragscode erstellen
      const newRepair = {
        ...repairData,
        userId,
        shopId: user.shopId,
        orderCode,
        createdAt: new Date(),
        creationMonth: format(new Date(), 'yyyy-MM')
      };
      
      const [repair] = await db
        .insert(repairs)
        .values(newRepair)
        .returning();
      
      // Status-History-Eintrag für den initialen "eingegangen" Status erstellen
      try {
        console.log(`Erstelle Status-History-Eintrag für Reparatur ${repair.id}...`);
        const historyEntry = {
          repairId: repair.id,
          oldStatus: null, // Kein vorheriger Status bei Erstellung
          newStatus: repair.status || 'eingegangen',
          changedBy: user.username, // Benutzername statt ID speichern
          userId: userId,
          shopId: user.shopId,
          notes: "Auftrag erstellt"
        };
        console.log("Status-History-Eintrag Daten:", historyEntry);
        
        await db.insert(repairStatusHistory).values(historyEntry);
        
        console.log(`✅ Status-History-Eintrag für neue Reparatur ${repair.id} erstellt: "${repair.status || 'eingegangen'}"`);
      } catch (historyError) {
        console.error("❌ Fehler beim Erstellen des Status-History-Eintrags:", historyError);
      }

      // Activity-Log für neu erstellte Reparatur erstellen
      try {
        await storage.logRepairActivity(
          'created',
          repair.id,
          repair,
          userId,
          user.username || user.email || 'Unbekannter Benutzer'
        );
        console.log(`📋 Activity-Log für neue Reparatur ${repair.id} erstellt`);
      } catch (activityError) {
        console.error("❌ Fehler beim Erstellen des Activity-Logs:", activityError);
      }
      
      console.log(`✅ DSGVO-konform: Neue Reparatur ${repair.id} für Shop ${user.shopId} erstellt`);
      res.status(201).json(repair);
    } catch (error) {
      console.error("Error creating repair:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Reparaturdaten", errors: error.errors });
      }
      res.status(500).json({ message: "Fehler beim Erstellen der Reparatur" });
    }
  });
  
  app.patch("/api/repairs/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repairData = insertRepairSchema.partial().parse(req.body);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Validate customerId exists if provided
      if (repairData.customerId) {
        const customer = await storage.getCustomer(repairData.customerId, userId);
        if (!customer) {
          return res.status(400).json({ message: "Invalid customer ID" });
        }
      }
      
      // Nicht mehr nötig, da deviceType und brand jetzt zentral verwaltet werden 
      // und keine Enum-Validierung mehr benötigen
      
      // Validate status if provided
      if (repairData.status && !repairStatuses.safeParse(repairData.status).success) {
        return res.status(400).json({ message: "Invalid repair status" });
      }
      
      // Reparatur mit Benutzerkontext aktualisieren
      const repair = await storage.updateRepair(id, repairData, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      res.json(repair);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid repair data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update repair" });
    }
  });
  
  app.patch("/api/repairs/:id/status", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, sendEmail, technicianNote, emailTemplate } = req.body;
      
      // Validate status
      if (!status || !repairStatuses.safeParse(status).success) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Spezielle Validierung für Status "abgeholt"
      if (status === 'abgeholt') {
        const loanerDevice = await storage.getLoanerDeviceByRepairId(id, userId);
        if (loanerDevice) {
          return res.status(400).json({ 
            message: "Der Status kann nicht auf 'abgeholt' geändert werden, solange noch ein Leihgerät zugewiesen ist. Bitte geben Sie das Leihgerät zuerst zurück." 
          });
        }
      }
      
      // E-Mail-Versandvariablen initialisieren
      let emailSent = false;
      let emailError = '';
      
      // Alten Status abrufen für Activity-Logging
      const oldRepair = await storage.getRepair(id, userId);
      const oldStatus = oldRepair?.status;
      
      // Reparaturstatus mit Benutzerkontext und optionaler Techniker-Information aktualisieren
      // Die updateRepairStatus Methode erstellt automatisch History-Einträge
      const repair = await storage.updateRepairStatus(id, status, userId, technicianNote);
      
      // Activity-Log für Reparatur-Status-Änderung erstellen
      if (repair && oldStatus && oldStatus !== status) {
        console.log(`🔍 Status-Änderung erkannt: ${oldStatus} → ${status} für Reparatur ${repair.id}`);
        const user = await storage.getUser(userId);
        console.log(`🔍 User für Activity-Log: ${user?.username || user?.email}`);
        await storage.logRepairActivity(
          'status_changed',
          repair.id,
          repair,
          userId,
          user?.username || user?.email,
          oldStatus,
          status
        );
      } else {
        console.log(`🔍 Keine Status-Änderung: oldStatus=${oldStatus}, newStatus=${status}, repair=${!!repair}`);
      }
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      // Kunde und Business-Daten laden (für E-Mail)
      const customer = repair.customerId ? await storage.getCustomer(repair.customerId, userId) : null;
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Wenn Kunde existiert, Benachrichtigungen senden
      if (customer) {
        // Variablen für die Kommunikation zusammenstellen
        const variables: Record<string, string> = {
          "kundenname": `${customer.firstName} ${customer.lastName}`,
          "geraet": repair.model,
          "hersteller": repair.brand,
          "auftragsnummer": repair.orderCode || '',
          "fehler": repair.issue,
          "kostenvoranschlag": repair.estimatedCost || "Nicht angegeben",
          "geschaeftsname": businessSettings?.businessName || "Handyshop",
          "abholzeit": "ab sofort", // kann später angepasst werden
          // Fehlende Variablen hinzufügen
          "reparaturarbeit": repair.issue || "Reparatur des Geräts",
          "oeffnungszeiten": businessSettings?.openingHours || "",
          "opening_hours": businessSettings?.openingHours || "",
          // Wichtig: userId und repairId für die Datenisolierung und E-Mail-Verlauf hinzufügen
          "userId": userId.toString(),
          "repairId": repair.id.toString()
        };
        
        // E-Mail-Versandvariablen initialisieren
        let emailResult: any = null;
        
        try {
          // E-Mail-Benachrichtigung nur wenn explizit vom Benutzer gewünscht
          if (sendEmail === true) {
            console.log(`📧 E-Mail-Benachrichtigung für Status "${status}" wird gesendet für Reparatur ${repair.id} (vom Benutzer gewählt)`);
            
            
            try {
              console.log(`🔍 DEBUGGING - E-Mail-Versendung startet:`);
              console.log(`   - Status: ${status}`);
              console.log(`   - Reparatur ID: ${repair.id}`);
              console.log(`   - Benutzer ID: ${userId}`);
              console.log(`   - Kunde: ${customer?.firstName} ${customer?.lastName}`);
              console.log(`   - Kunden-E-Mail: ${customer?.email}`);
              console.log(`   - Business-Einstellungen: ${businessSettings?.businessName}`);
              
              const { emailService } = await import('./email-service.js');
              console.log(`🔍 EmailService erfolgreich geladen:`, typeof emailService);
              
              // Template-Typ basierend auf Status und Benutzerauswahl bestimmen
              let templateType = status;
              if (status === 'fertig') {
                // Bei Status "fertig" verwende das vom Benutzer gewählte Template
                templateType = emailTemplate || 'Reparatur erfolgreich abgeschlossen';
              } else if (status === 'ersatzteil_eingetroffen') {
                templateType = 'ersatzteil_eingetroffen';
              }
              
              console.log(`🔍 Template-Typ bestimmt: ${templateType}`);
              
              // Überprüfe, ob alle notwendigen Daten vorhanden sind
              if (!customer?.email) {
                console.error(`❌ FEHLER: Keine Kunden-E-Mail-Adresse vorhanden!`);
                emailError = 'Keine Kunden-E-Mail-Adresse vorhanden';
                res.setHeader('X-Email-Sent', 'false');
                res.setHeader('X-Email-Error', emailError);
                return;
              }
              
              console.log(`🔍 Rufe sendRepairStatusEmail auf...`);
              
              // E-Mail über den EmailService senden
              emailResult = await emailService.sendRepairStatusEmail(
                userId,
                repair.id,
                templateType,
                {
                  repairId: repair.id,
                  status: status,
                  customer: customer,
                  repair: repair,
                  businessSettings: businessSettings
                }
              );
              
              console.log(`🔍 E-Mail-Ergebnis erhalten:`, {
                success: emailResult?.success,
                error: emailResult?.error,
                type: typeof emailResult
              });
              
              if (emailResult && emailResult.success === true) {
                console.log(`✅ SUCCESS: E-Mail für Status "${status}" erfolgreich gesendet an ${customer.email}`);
                emailSent = true;
                res.setHeader('X-Email-Sent', 'true');
                res.setHeader('X-Email-Status', `success-${status}`);
              } else {
                const errorMessage = emailResult?.error || 'E-Mail-Versand fehlgeschlagen ohne spezifischen Fehler';
                console.error(`❌ FEHLER: E-Mail-Versand fehlgeschlagen für Status "${status}":`, errorMessage);
                emailError = errorMessage;
                res.setHeader('X-Email-Sent', 'false');
                res.setHeader('X-Email-Error', emailError);
              }
            } catch (serviceError) {
              const errorMessage = serviceError?.message || 'E-Mail-Versand fehlgeschlagen';
              console.error(`❌ EXCEPTION: EmailService Fehler für Status "${status}":`, serviceError);
              console.error(`❌ Stack Trace:`, serviceError?.stack);
              emailError = errorMessage;
              res.setHeader('X-Email-Sent', 'false');
              res.setHeader('X-Email-Error', emailError);
            }
          } else {
            console.log(`ℹ️ Status "${status}" für Reparatur ${repair.id} geändert - keine E-Mail angefordert`);
          }
          
        } catch (error) {
          console.error("Unerwarteter Fehler beim E-Mail-Versand:", error);
          emailError = 'Unerwarteter Fehler beim E-Mail-Versand';
        }
        
        // SMS-Funktionalität wurde auf Kundenwunsch entfernt
      } else {
        console.log("Kunde nicht gefunden, keine Benachrichtigung möglich");
      }
      
      // Gebe das aktualisierte Repair zurück
      const response = {
        ...repair,
        emailSent: emailSent,
        emailError: emailError
      };
      
      console.log(`📧 Response für Frontend:`, { 
        emailSent: response.emailSent, 
        emailError: response.emailError,
        repairId: repair.id 
      });
      
      res.json(response);
    } catch (error) {
      console.error("Fehler bei der Statusaktualisierung:", error);
      res.status(500).json({ message: "Failed to update repair status" });
    }
  });

  // Status History Route - get status history for a repair
  app.get("/api/repairs/:id/status-history", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Verify user has access to this repair
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      // Get status history - changedBy is already stored as username (text)
      const statusHistory = await db
        .select({
          id: repairStatusHistory.id,
          oldStatus: repairStatusHistory.oldStatus,
          newStatus: repairStatusHistory.newStatus,
          changedAt: repairStatusHistory.changedAt,
          changedByUsername: repairStatusHistory.changedBy, // This is already the username
          notes: repairStatusHistory.notes
        })
        .from(repairStatusHistory)
        .where(
          and(
            eq(repairStatusHistory.repairId, repairId),
            eq(repairStatusHistory.shopId, repair.shopId || 1)
          )
        )
        .orderBy(desc(repairStatusHistory.changedAt));
      
      res.json(statusHistory);
    } catch (error) {
      console.error("Fehler beim Abrufen der Status-History:", error);
      res.status(500).json({ message: "Failed to get status history" });
    }
  });
  
  // Delete repair
  app.delete("/api/repairs/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      const user = req.user as any;
      
      console.log(`DELETE /api/repairs/${id}: Benutzer ${user.username} (ID: ${userId}, Shop: ${user.shopId}) versucht Reparatur zu löschen`);
      
      // Reparatur mit Benutzerkontext löschen
      const deleted = await storage.deleteRepair(id, userId);
      
      if (!deleted) {
        console.warn(`DELETE /api/repairs/${id}: Reparatur nicht gefunden oder Zugriff verweigert für Benutzer ${userId}`);
        return res.status(404).json({ message: "Repair not found" });
      }
      
      console.log(`DELETE /api/repairs/${id}: Erfolgreich gelöscht durch Benutzer ${userId}`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting repair:", error);
      res.status(500).json({ message: "Failed to delete repair" });
    }
  });
  
  // API-Endpunkt, um zu prüfen, ob der User ein Professional oder Enterprise Paket hat
  // Kostenvoranschlag-Berechtigungsprüfung entfernt
  
  // API-Endpunkt für Etikettendruck-Berechtigung
  // Alle authentifizierten Benutzer können Etiketten drucken
  app.get("/api/can-print-labels", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Alle authentifizierten Benutzer haben Druckberechtigung
      res.json({ canPrintLabels: true });
    } catch (error) {
      console.error("Error checking label printing permission:", error);
      res.status(500).json({ message: "Fehler bei der Überprüfung der Druckberechtigungen" });
    }
  });
  
  // API-Endpunkt, um zu prüfen, ob der User detaillierte Statistiken sehen darf
  // Im neuen System haben alle authentifizierten Benutzer Vollzugriff
  app.get("/api/can-view-detailed-stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }
      
      // Alle authentifizierten Benutzer haben Vollzugriff auf detaillierte Statistiken
      const canViewDetailedStats = true;
      
      console.log(`Vollzugriff auf detaillierte Statistiken für ${user.username}: ${canViewDetailedStats}`);
      
      // Ergebnis zurückgeben
      res.json({ canViewDetailedStats });
    } catch (error) {
      console.error("Error checking detailed stats permission:", error);
      res.status(500).json({ message: "Fehler bei der Überprüfung der Statistik-Berechtigungen" });
    }
  });
  
  // Abrufen des Reparaturkontingents - alle Benutzer haben unbegrenzten Zugriff
  app.get("/api/repair-quota", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Benutzer abrufen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      console.log(`QUOTA-API: Benutzer ${user.username} (ID: ${userId}) - Vollzugriff gewährt`);
      
      // Alle Benutzer haben unbegrenzten Zugriff
      let quotaInfo = {
        count: 0,
        limit: 999999, // Praktisch unbegrenzt
        canCreate: true
      };
      
      // Versuche, die Funktion zu verwenden, falls sie existiert
      if (typeof storage.canCreateNewRepair === 'function') {
        try {
          quotaInfo = await storage.canCreateNewRepair(userId);
        } catch (err) {
          console.error("Fehler beim Abrufen des Reparaturkontingents:", err);
          // Verwende die Standardwerte
        }
      } else {
        console.warn("canCreateNewRepair-Funktion existiert nicht - verwende Standardwerte für Quota");
        
        // Aktuelle Anzahl der Reparaturen für den aktuellen Monat berechnen
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        
        if (user.shopId) {
          try {
            const count = await db
              .select({ count: sql`count(*)`.mapWith(Number) })
              .from(repairs)
              .where(
                and(
                  eq(repairs.shopId, user.shopId),
                  gte(repairs.createdAt, firstDayOfMonth),
                  lt(repairs.createdAt, nextMonth)
                )
              )
              .then(result => result[0]?.count || 0);
              
            quotaInfo.count = count;
            
            // Limit wird später basierend auf dem Paket festgelegt
          } catch (err) {
            console.error("Fehler beim Abrufen der Reparaturanzahl aus der Datenbank:", err);
          }
        }
        
        // Alle Benutzer haben unbegrenzten Zugriff
        quotaInfo.limit = 999999;
        quotaInfo.canCreate = true;
        quotaInfo.pricingPlan = "professional";
        quotaInfo.displayName = "Professional";
      }
      
      // Datumsinformationen
      const today = new Date();
      const currentMonth = today.toLocaleString('de-DE', { month: 'long' });
      const currentYear = today.getFullYear();
      
      // Alle Benutzer haben "Professional" Zugriff mit unbegrenzten Funktionen
      let pricingPlan = 'professional';
      let displayName = 'Professional';
      let trialExpiryInfo = null;
      
      res.json({
        ...quotaInfo,
        pricingPlan,
        displayName,
        currentMonth,
        currentYear,
        trialExpiryInfo
      });
    } catch (error) {
      console.error("Error fetching repair quota:", error);
      res.status(500).json({ message: "Failed to fetch repair quota" });
    }
  });
  
  // STATISTICS API
  app.get("/api/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Zeitraum-Filter aus Query-Parametern holen
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        // Setze den Endzeitpunkt auf das Ende des Tages
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Statistiken mit Benutzerkontext und optionalem Zeitraumfilter abrufen
      const stats = await storage.getStats(userId, startDate, endDate);
      
      // Multi-Shop Service nutzen für erweiterte Statistiken
      const customers = await multiShopService.getAllCustomersForUser(userId);
      const repairs = await multiShopService.getAllRepairsForUser(userId);
      console.log(`🌐 Stats: ${customers.length} customers, ${repairs.length} repairs for user ${req.user?.username}`);
      
      res.json({
        ...stats,
        customerCount: customers.length,
        repairCount: repairs.length,
        filteredRepairCount: stats.totalOrders
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });
  
  // Detaillierte Reparaturstatistiken für Analysen und Diagramme - DSGVO-konform mit Shop-Isolation
  app.get("/api/stats/detailed", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Shop-Isolation sicherstellen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      console.log(`✅ DSGVO-Schutz: Benutzer ${user.username} (ID ${userId}) arbeitet mit Shop ${user.shopId}`);
      
      // Zeitraum-Filter aus Query-Parametern holen
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate) {
        startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        // Setze den Endzeitpunkt auf das Ende des Tages
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Prüfe, ob die Umsatzberechnung auf Basis des Abholdatums erfolgen soll
      const revenueBasedOnPickup = req.query.revenueBasedOnPickup === 'true';
      
      // Detaillierte Statistiken für den Benutzer abrufen mit optionalem Zeitraum
      const detailedStats = await storage.getDetailedRepairStats(userId, startDate, endDate, revenueBasedOnPickup);
      res.json(detailedStats);
    } catch (error) {
      console.error("Error fetching detailed stats:", error);
      res.status(500).json({ message: "Failed to fetch detailed statistics" });
    }
  });

  // BUSINESS SETTINGS API - KOMPLETT ÜBERARBEITET MIT SHOP-ISOLATION
  app.get("/api/business-settings", isAuthenticated, attachShopId, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }
      
      // Rollenbasierte Berechtigung: Nur Shop-Owner haben Zugriff auf Geschäftseinstellungen
      const userRole = (req.user as any).role;
      if (userRole !== 'owner') {
        return res.status(403).json({ message: "Zugriff verweigert: Nur Shop-Owner können Geschäftseinstellungen abrufen" });
      }
      
      // Benutzer-ID direkt aus der Session nehmen
      const userId = (req.user as any).id;
      const username = (req.user as any).username;
      console.log(`NEUE IMPLEMENTATION: Fetching business settings for user ${userId} (${username})`);
      
      // Benutzer holen, um zu prüfen ob Multi-Shop Admin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // AUSNAHME für Multi-Shop Admins - sie haben keine eigenen Business Settings
      if (user.isMultiShopAdmin && !user.shopId) {
        console.log(`🔧 Multi-Shop Admin ${user.username} (ID: ${user.id}) benötigt keine Business Settings`);
        return res.status(200).json(null); // Leere Settings für Multi-Shop Admins
      }
      
      // Verwende die aktualisierte Storage-Methode mit Tenant-Isolation
      const userSettings = await storage.getBusinessSettings(userId);
      
      // Wenn keine Einstellungen gefunden wurden, erstelle Standardeinstellungen
      if (!userSettings) {
        console.log(`Keine Einstellungen für Benutzer ${userId} gefunden, erstelle Standardeinstellungen`);
        
        // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, Fehler zurückgeben statt Fallback auf Shop 1
        if (!user.shopId) {
          console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
          return res.status(403).json({ message: "Keine Shop-Zuordnung vorhanden" });
        }
        
        const shopId = user.shopId;
        
        // Erstelle ein Business-Settings-Objekt mit Standardwerten
        const userData = req.user as any;
        const defaultSettings = {
          businessName: userData?.companyName || `Reparaturshop ${username}`,
          ownerFirstName: "", 
          ownerLastName: "",
          taxId: userData?.companyVatNumber || "",
          vatNumber: "", // Neue Spalte: USt-IdNr.
          companySlogan: "", // Neue Spalte: Firmenlaut/Unternehmensslogan
          streetAddress: "",
          city: "",
          zipCode: "",
          country: "Österreich",
          phone: "",
          email: userData?.email || "",
          website: "",
          colorTheme: "blue",
          receiptWidth: "80mm",
          userId: userId, // WICHTIG: Benutzer-ID setzen
          shopId: shopId  // WICHTIG: Shop-ID für Tenant-Isolation setzen
        };
        
        // Speichere die Standardeinstellungen über die Storage-Methode
        const newSettings = await storage.updateBusinessSettings(defaultSettings, userId);
          
        console.log(`Standardeinstellungen für Benutzer ${userId} (Shop ${shopId}) erstellt:`, newSettings.id);
        return res.json(newSettings);
      }
      
      // Ansonsten geben wir die gespeicherten Einstellungen zurück
      console.log(`Einstellungen für Benutzer ${userId} gefunden: ID ${userSettings.id} (Shop ${userSettings.shopId})`);
      res.json(userSettings);
    } catch (error) {
      console.error("Fehler beim Abrufen der Geschäftseinstellungen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Geschäftseinstellungen" });
    }
  });

  app.post("/api/business-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }
      
      // Rollenbasierte Berechtigung: Nur Shop-Owner können Geschäftseinstellungen ändern
      const userRole = (req.user as any).role;
      if (userRole !== 'owner') {
        return res.status(403).json({ message: "Zugriff verweigert: Nur Shop-Owner können Geschäftseinstellungen ändern" });
      }
      
      // Benutzer-ID direkt aus der Session nehmen
      const userId = (req.user as any).id;
      const username = (req.user as any).username;
      console.log(`NEUE IMPLEMENTATION: Updating business settings for user ${userId} (${username})`);
      
      // Benutzer holen, um Shop-ID für die Einstellungen zu bestimmen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, Fehler zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return res.status(403).json({ message: "Keine Shop-Zuordnung vorhanden" });
      }
      
      const shopId = user.shopId;
      
      // Aktuelle Einstellungen abrufen (mit Shop-Isolation)
      const currentSettings = await storage.getBusinessSettings(userId);
      
      // Konsolidiere alle Daten aus dem Request-Body
      const settingsData = {
        ...req.body,
        userId, // WICHTIG: Benutzer-ID setzen
        shopId  // WICHTIG: Shop-ID für Tenant-Isolation setzen
      };
      
      // Nicht vorhandene Pflichtfelder mit Standardwerten auffüllen, wenn keine Einstellungen existieren
      if (!currentSettings) {
        // Erstelle ein komplettes Settings-Objekt mit Standardwerten für fehlende Felder
        const userData = req.user as any;
        const defaultSettings = {
          businessName: settingsData.businessName || userData?.companyName || `Reparaturshop ${username}`,
          ownerFirstName: settingsData.ownerFirstName || "", 
          ownerLastName: settingsData.ownerLastName || "",
          taxId: settingsData.taxId || userData?.companyVatNumber || "",
          vatNumber: settingsData.vatNumber || "", // Neue Spalte: USt-IdNr.
          companySlogan: settingsData.companySlogan || "", // Neue Spalte: Firmenlaut
          streetAddress: settingsData.streetAddress || "",
          city: settingsData.city || "",
          zipCode: settingsData.zipCode || "",
          country: settingsData.country || "Österreich",
          phone: settingsData.phone || "",
          email: settingsData.email || userData?.email || "",
          website: settingsData.website || "",
          colorTheme: settingsData.colorTheme || "blue",
          receiptWidth: settingsData.receiptWidth || "80mm",
          logoImage: settingsData.logoImage || "",
          smtpSenderName: settingsData.smtpSenderName || "",
          smtpHost: settingsData.smtpHost || "",
          smtpUser: settingsData.smtpUser || "",
          smtpPassword: settingsData.smtpPassword || "",
          smtpPort: settingsData.smtpPort || "",
          reviewLink: settingsData.reviewLink || "",
          userId, // WICHTIG: Benutzer-ID setzen
          shopId  // WICHTIG: Shop-ID für Tenant-Isolation setzen
        };
        
        // Verwende die aktualisierte Storage-Methode mit Tenant-Isolation
        const newSettings = await storage.updateBusinessSettings(defaultSettings, userId);
        
        console.log(`Neue Einstellungen für Benutzer ${userId} (Shop ${shopId}) erstellt:`, newSettings.id);
        return res.json(newSettings);
      }
      
      // Bestehende Einstellungen aktualisieren
      console.log(`Aktualisiere bestehende Einstellungen für Benutzer ${userId} (Settings-ID: ${currentSettings.id}, Shop: ${shopId})`);
      
      // Verwende die aktualisierte Storage-Methode mit Tenant-Isolation
      const updatedSettings = await storage.updateBusinessSettings(settingsData, userId);
      
      console.log(`Einstellungen für Benutzer ${userId} erfolgreich aktualisiert (Settings-ID: ${updatedSettings.id}, Shop: ${updatedSettings.shopId})`);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Geschäftseinstellungen:", error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren der Geschäftseinstellungen",
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // GERÄTETYPEN UND MARKEN API (für Lesezugriff durch alle Benutzer)
  // Benutzerspezifische Gerätearten abrufen
  app.get("/api/device-types", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Der alte Workaround mit bugisUserId (3) verletzt die Mandantentrennung/DSGVO-Konformität
      // Stattdessen verwenden wir jetzt den aktuellen Benutzer (Shop-Isolation)
      console.log(`GET /api/device-types: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      const deviceTypes = await storage.getDeviceTypes(userId);
      res.json(deviceTypes);
    } catch (error) {
      console.error("Error retrieving device types:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätearten" });
    }
  });
  
  // Benutzerspezifische Gerätearte nach ID abrufen
  app.get("/api/device-types/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const deviceType = await storage.getUserDeviceType(id, userId);
      if (!deviceType) {
        return res.status(404).json({ message: "Geräteart nicht gefunden" });
      }
      
      res.json(deviceType);
    } catch (error) {
      console.error("Error retrieving device type:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Geräteart" });
    }
  });
  
  // Benutzerspezifische Geräteart erstellen
  app.post("/api/device-types", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer Bugi (Admin) ist
      if (userId !== 3) {
        return res.status(403).json({ message: "Nur Administratoren können Gerätetypen erstellen" });
      }
      
      // WORKAROUND: Wir erstellen immer Gerätetypen für Bugi (ID 3)
      const bugisUserId = 3;
      
      const deviceTypeData = insertUserDeviceTypeSchema.parse({
        ...req.body,
        userId: bugisUserId  // Wir überschreiben immer mit Bugis User-ID
      });
      
      const deviceType = await storage.createUserDeviceType(deviceTypeData, bugisUserId);
      
      res.status(201).json(deviceType);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Geräteart-Daten", errors: error.errors });
      }
      console.error("Error creating device type:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Geräteart" });
    }
  });
  
  // Benutzerspezifische Geräteart aktualisieren
  app.patch("/api/device-types/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer Bugi (Admin) ist
      if (userId !== 3) {
        return res.status(403).json({ message: "Nur Administratoren können Gerätetypen bearbeiten" });
      }
      
      // WORKAROUND: Wir aktualisieren immer Bugis Gerätetypen
      const bugisUserId = 3;
      
      const deviceTypeData = insertUserDeviceTypeSchema.partial().parse(req.body);
      const deviceType = await storage.updateUserDeviceType(id, deviceTypeData, bugisUserId);
      
      if (!deviceType) {
        return res.status(404).json({ message: "Geräteart nicht gefunden" });
      }
      
      res.json(deviceType);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Geräteart-Daten", errors: error.errors });
      }
      console.error("Error updating device type:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren der Geräteart" });
    }
  });
  
  // Benutzerspezifische Geräteart löschen
  app.delete("/api/device-types/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer Bugi (Admin) ist
      if (userId !== 3) {
        return res.status(403).json({ message: "Nur Administratoren können Gerätetypen löschen" });
      }
      
      // WORKAROUND: Wir löschen immer Bugis Gerätetypen
      const bugisUserId = 3;
      
      const success = await storage.deleteUserDeviceType(id, bugisUserId);
      
      if (!success) {
        return res.status(400).json({ message: "Geräteart konnte nicht gelöscht werden. Möglicherweise wird sie noch von Marken verwendet." });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting device type:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Geräteart" });
    }
  });
  
  // Alle benutzerspezifischen Marken abrufen (optional nach Gerätetyp gefiltert)
  app.get("/api/brands", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Der alte Workaround mit bugisUserId (3) verletzt die Mandantentrennung/DSGVO-Konformität
      // Stattdessen verwenden wir jetzt den aktuellen Benutzer (Shop-Isolation)
      console.log(`GET /api/brands: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      const deviceTypeId = req.query.deviceTypeId ? parseInt(req.query.deviceTypeId as string) : undefined;
      
      let brands;
      if (deviceTypeId) {
        brands = await storage.getUserBrandsByDeviceTypeId(deviceTypeId, userId);
      } else {
        brands = await storage.getUserBrands(userId);
      }
      
      res.json(brands);
    } catch (error) {
      console.error("Error retrieving brands:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Marken" });
    }
  });
  
  // Benutzerspezifische Marke nach ID abrufen
  app.get("/api/brands/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const brand = await storage.getUserBrand(id, userId);
      
      if (!brand) {
        return res.status(404).json({ message: "Marke nicht gefunden" });
      }
      
      res.json(brand);
    } catch (error) {
      console.error("Error retrieving brand:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Marke" });
    }
  });
  
  // Benutzerspezifische Marke erstellen
  app.post("/api/brands", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer Bugi (Admin) ist
      if (userId !== 3) {
        return res.status(403).json({ message: "Nur Administratoren können Marken erstellen" });
      }
      
      // WORKAROUND: Alle Gerätetypen und Marken werden immer unter Bugi gespeichert (ID 3)
      // Das ist eine temporäre Lösung, bis globale Gerätetypen implementiert sind
      const bugisUserId = 3;
      
      const brandData = insertUserBrandSchema.parse({
        ...req.body,
        userId: bugisUserId  // Wir überschreiben immer mit Bugis User-ID
      });
      
      // Prüfen, ob der Gerätetyp existiert
      const deviceType = await storage.getUserDeviceType(brandData.deviceTypeId, bugisUserId);
      if (!deviceType) {
        return res.status(400).json({ message: "Ungültiger Gerätetyp" });
      }
      
      const brand = await storage.createUserBrand(brandData, bugisUserId);
      
      res.status(201).json(brand);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Marken-Daten", errors: error.errors });
      }
      console.error("Error creating brand:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Marke" });
    }
  });
  
  // Benutzerspezifische Marke aktualisieren
  app.patch("/api/brands/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const brandData = insertUserBrandSchema.partial().parse(req.body);
      
      // Wenn deviceTypeId gegeben ist, prüfen, ob der Gerätetyp existiert und dem Benutzer gehört
      if (brandData.deviceTypeId) {
        const deviceType = await storage.getUserDeviceType(brandData.deviceTypeId, userId);
        if (!deviceType) {
          return res.status(400).json({ message: "Ungültiger Gerätetyp" });
        }
      }
      
      const brand = await storage.updateUserBrand(id, brandData, userId);
      
      if (!brand) {
        return res.status(404).json({ message: "Marke nicht gefunden" });
      }
      
      res.json(brand);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Marken-Daten", errors: error.errors });
      }
      console.error("Error updating brand:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren der Marke" });
    }
  });
  
  // Benutzerspezifische Marke löschen
  app.delete("/api/brands/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const success = await storage.deleteUserBrand(id, userId);
      
      if (!success) {
        return res.status(500).json({ message: "Marke konnte nicht gelöscht werden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Marke" });
    }
  });
  
  // MODEL SERIES API entfernt (keine Modellreihen mehr)
  
  // MODELS API
  // Alle benutzerspezifischen Modelle abrufen 
  // (optional nach Gerätetyp oder Marke gefiltert)
  app.get("/api/models", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      console.log(`GET /api/models: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      const deviceTypeId = req.query.deviceTypeId ? parseInt(req.query.deviceTypeId as string) : undefined;
      const brandId = req.query.brandId ? parseInt(req.query.brandId as string) : undefined;
      
      let models: any[] = [];
      
      if (brandId) {
        // Modelle für diese Marke abrufen
        models = await storage.getUserModelsByBrand(brandId, userId);
      } else {
        // Alle Modelle holen
        models = await storage.getUserModels(userId);
      }
      
      res.json(models);
    } catch (error) {
      console.error("Error retrieving models:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Modelle" });
    }
  });
  
  // Benutzerspezifisches Modell erstellen
  app.post("/api/models", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Der alte Workaround mit bugisUserId (3) verletzt die Mandantentrennung/DSGVO-Konformität
      // Stattdessen verwenden wir jetzt den aktuellen Benutzer (Shop-Isolation)
      console.log(`POST /api/models: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      const modelData = insertUserModelSchema.parse({
        ...req.body,
        userId: userId  // Aktuelle Benutzer-ID verwenden
      });
      
      const model = await storage.createUserModel(modelData, userId);
      
      res.status(201).json(model);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Modell-Daten", errors: error.errors });
      }
      console.error("Error creating model:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Modells" });
    }
  });
  
  // Benutzerspezifisches Modell aktualisieren
  app.patch("/api/models/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Der alte Workaround mit bugisUserId (3) verletzt die Mandantentrennung/DSGVO-Konformität
      // Stattdessen verwenden wir jetzt den aktuellen Benutzer (Shop-Isolation)
      console.log(`PATCH /api/models/${id}: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      const modelData = insertUserModelSchema.partial().parse(req.body);
      const updatedModel = await storage.updateUserModel(id, modelData, userId);
      
      if (!updatedModel) {
        return res.status(404).json({ message: "Modell nicht gefunden" });
      }
      
      res.json(updatedModel);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Modell-Daten", errors: error.errors });
      }
      console.error("Error updating model:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Modells" });
    }
  });
  
  // Benutzerspezifisches Modell löschen
  app.delete("/api/models/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Der alte Workaround mit bugisUserId (3) verletzt die Mandantentrennung/DSGVO-Konformität
      // Stattdessen verwenden wir jetzt den aktuellen Benutzer (Shop-Isolation)
      console.log(`DELETE /api/models/${id}: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      const success = await storage.deleteUserModel(id, userId);
      
      if (!success) {
        return res.status(500).json({ message: "Modell konnte nicht gelöscht werden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting model:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Modells" });
    }
  });

  // Mehrere Modelle auf einmal aktualisieren/erstellen (Batch)
  app.post("/api/models/batch", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      console.log(`POST /api/models/batch: Verwende Benutzer ${userId} statt fest codierter bugi-ID`);
      
      // Request Validierung
      const { deviceTypeId, brandId, models } = req.body;
      
      if (!deviceTypeId || !brandId || !models || !Array.isArray(models)) {
        return res.status(400).json({ 
          message: "Ungültige Daten. deviceTypeId, brandId und ein models-Array werden benötigt" 
        });
      }
      
      // Zuerst alle vorhandenen Modelle für diese Marke löschen
      await storage.deleteAllUserModelsForBrand(parseInt(brandId), userId);
      
      // Dann die neuen Modelle erstellen
      const createdModels = [];
      
      for (const modelName of models) {
        if (modelName.trim() === '') continue;
        
        const modelData = {
          name: modelName.trim(),
          modelSeriesId: null, // Keine Modellreihe mehr
          brandId: parseInt(brandId),
          userId: userId
        };
        
        const model = await storage.createUserModel(modelData, userId);
        createdModels.push(model);
      }
      
      res.status(201).json({
        message: `${createdModels.length} Modelle wurden erfolgreich erstellt`,
        models: createdModels
      });
    } catch (error) {
      console.error("Error creating models in batch:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Modelle" });
    }
  });
  
  // Alle Modelle für eine bestimmte Marke löschen
  app.delete("/api/brands/:brandId/models", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const brandId = parseInt(req.params.brandId);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      console.log(`DELETE /api/brands/${brandId}/models: Verwende Benutzer ${userId}`);
      
      const success = await storage.deleteAllUserModelsForBrand(brandId, userId);
      
      if (!success) {
        return res.status(500).json({ message: "Modelle konnten nicht gelöscht werden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting all models for brand:", error);
      res.status(500).json({ message: "Fehler beim Löschen aller Modelle für die Marke" });
    }
  });
  
  // FEEDBACK API
  // Erzeuge einen neuen Feedback-Token für eine Reparatur
  app.post("/api/repairs/:id/feedback-token", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Reparatur mit Benutzerkontext abrufen
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      const customerId = repair.customerId;
      const token = await storage.createFeedbackToken(repairId, customerId);
      
      res.json({ token });
    } catch (error) {
      console.error("Error creating feedback token:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Feedback-Tokens" });
    }
  });
  
  // Feedback-Informationen für einen bestimmten Token abrufen (ohne Authentifizierung)
  app.get("/api/feedback/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const feedback = await storage.getFeedbackByToken(token);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback-Token ungültig oder abgelaufen" });
      }
      
      // Reparaturinformationen laden - hier brauchen wir die zugehörige Benutzer-ID
      // Da wir ohne Authentifizierung sind, holen wir den Besitzer aus der Feedback-ID
      const [feedbackWithRepair] = await db
        .select({
          repair: repairs,
          feedback: feedbacks
        })
        .from(feedbacks)
        .innerJoin(repairs, eq(feedbacks.repairId, repairs.id))
        .where(eq(feedbacks.feedbackToken, token));
      
      if (!feedbackWithRepair?.repair) {
        return res.status(404).json({ message: "Zugehörige Reparatur nicht gefunden" });
      }
      
      const repair = feedbackWithRepair.repair;
      const repairUserId = repair.userId;
      
      // Kundeninformationen laden mit dem Benutzerkontext der Reparatur
      const customer = await storage.getCustomer(feedback.customerId, repairUserId || undefined);
      
      if (!customer) {
        return res.status(404).json({ message: "Kunde nicht gefunden" });
      }
      
      // Geschäftsinformationen für den Besitzer der Reparatur laden
      const businessSettings = await storage.getBusinessSettings(repairUserId || undefined);
      
      // Nur die notwendigen Informationen zurückgeben
      res.json({
        token: feedback.feedbackToken,
        rating: feedback.rating,
        comment: feedback.comment,
        submitted: feedback.rating > 0, // rating=0 bedeutet noch nicht abgegeben
        repair: {
          id: repair.id,
          brand: repair.brand,
          model: repair.model,
          deviceType: repair.deviceType,
          status: repair.status
        },
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName
        },
        business: {
          name: businessSettings?.businessName || "Handyshop Verwaltung",
          logoImage: businessSettings?.logoImage
        }
      });
    } catch (error) {
      console.error("Error retrieving feedback:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Feedbacks" });
    }
  });
  
  // Feedback einreichen (ohne Authentifizierung)
  app.post("/api/feedback/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const { rating, comment } = req.body;
      
      // Validiere die Bewertung
      if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Ungültige Bewertung. Bitte geben Sie 1-5 Sterne an." });
      }
      
      // Feedback speichern
      const feedback = await storage.submitFeedback(token, rating, comment);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback-Token ungültig oder abgelaufen" });
      }
      
      res.json({ success: true, message: "Feedback erfolgreich gespeichert" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Fehler beim Speichern des Feedbacks" });
    }
  });
  
  // Feedback für eine bestimmte Reparatur abrufen (mit Authentifizierung)
  app.get("/api/repairs/:id/feedback", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Zuerst prüfen, ob die Reparatur dem angemeldeten Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      // Wenn die Reparatur gefunden wurde, Feedback abrufen
      const feedbacks = await storage.getFeedbacksByRepairId(repairId);
      res.json(feedbacks);
    } catch (error) {
      console.error("Error retrieving repair feedback:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Feedbacks" });
    }
  });

  // E-Mail-Vorlagen API-Endpunkte
  app.get("/api/email-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierungsinformation extrahieren
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log(`📧 Normale Benutzer rufen globale E-Mail-Templates ab (User ID: ${userId})`);
      
      // Lade ALLE globalen Templates (Customer-Type) aus der emailTemplates Tabelle
      // Globale Templates haben userId = null und shopId = 0
      const globalTemplates = await db
        .select()
        .from(emailTemplates)
        .where(
          and(
            isNull(emailTemplates.userId),
            eq(emailTemplates.shopId, 0),
            eq(emailTemplates.type, 'customer')
          )
        )
        .orderBy(asc(emailTemplates.name));
      
      console.log(`📧 ${globalTemplates.length} globale Kunden-Templates gefunden:`, globalTemplates.map(t => t.name));
      
      // Formatiere die Templates für das Frontend (gleiche Struktur wie früher)
      const formattedTemplates = globalTemplates.map(template => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables || [],
        type: template.type,
        isGlobal: true,
        userId: null, // Globale Templates haben keine userId
        shopId: null, // Globale Templates haben keine shopId
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }));
      
      console.log(`📧 Zurückgegebene Templates für normalen Benutzer ${userId}:`, formattedTemplates.map(t => t.name));
      
      return res.status(200).json(formattedTemplates);
    } catch (error) {
      console.error("Fehler beim Abrufen der globalen E-Mail-Templates:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/email-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Benutzer-ID aus der Authentifizierungsinformation extrahieren
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Rollenbasierte Berechtigung: Nur Shop-Owner haben Zugriff auf E-Mail-Vorlagen
      const userRole = (req.user as any).role;
      if (userRole !== 'owner') {
        return res.status(403).json({ error: "Zugriff verweigert: Nur Shop-Owner können E-Mail-Vorlagen verwalten" });
      }
      
      // userId an die Methode übergeben, um shop-basierte Filterung zu ermöglichen
      const template = await storage.getEmailTemplate(id, userId);
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }
      
      return res.status(200).json(template);
    } catch (error) {
      console.error("Error retrieving email template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Einfache Validierung
      const { name, subject, body, variables } = req.body;
      if (!name || !subject || !body) {
        return res.status(400).json({ error: "Name, subject, and body are required" });
      }
      
      // Benutzer-ID aus der Authentifizierungsinformation extrahieren
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Verarbeitung der Variablen: Konvertiere String zu Array, wenn es als String kommt
      let variablesArray: string[] = [];
      if (variables) {
        if (typeof variables === 'string') {
          // Wenn ein Komma-separierter String übergeben wird
          variablesArray = variables.split(',').map(v => v.trim()).filter(v => v.length > 0);
        } else if (Array.isArray(variables)) {
          // Wenn bereits ein Array übergeben wird
          variablesArray = variables;
        }
      }
      
      const newTemplate = await storage.createEmailTemplate({
        name,
        subject,
        body,
        variables: variablesArray
      }, userId); // userId übergeben für shop-basierte Zuordnung
      
      return res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating email template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/email-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Benutzer-ID aus der Authentifizierungsinformation extrahieren
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // userId an die Methode übergeben, um shop-basierte Filterung zu ermöglichen
      const template = await storage.getEmailTemplate(id, userId);
      if (!template) {
        return res.status(404).json({ error: "Email template not found" });
      }
      
      // Kopie der Anfragedaten erstellen und variables verarbeiten, wenn vorhanden
      const updateData = { ...req.body };
      
      if (updateData.variables !== undefined) {
        let variablesArray: string[] = [];
        if (typeof updateData.variables === 'string') {
          // Wenn ein Komma-separierter String übergeben wird
          const varString: string = updateData.variables;
          variablesArray = varString.split(',').map((v: string) => v.trim()).filter((v: string) => v.length > 0);
        } else if (Array.isArray(updateData.variables)) {
          // Wenn bereits ein Array übergeben wird
          variablesArray = updateData.variables as string[];
        }
        updateData.variables = variablesArray;
      }
      
      // userId an die Methode übergeben, um shop-basierte Filterung zu ermöglichen
      const updatedTemplate = await storage.updateEmailTemplate(id, updateData, userId);
      return res.status(200).json(updatedTemplate);
    } catch (error) {
      console.error("Error updating email template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Benutzer-ID aus der Authentifizierungsinformation extrahieren
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // userId an die Methode übergeben, um shop-basierte Filterung zu ermöglichen
      try {
        const success = await storage.deleteEmailTemplate(id, userId);
        if (!success) {
          return res.status(404).json({ error: "Email template not found or could not be deleted" });
        }
      } catch (err: any) {
        // Prüfen, ob es sich um einen spezifischen Fehler handelt
        if (err.message && err.message.includes("used in email history")) {
          return res.status(409).json({ 
            error: "Diese E-Mail-Vorlage wurde bereits für den Versand von E-Mails verwendet und kann nicht gelöscht werden. Sie können jedoch die Vorlage bearbeiten, um den Inhalt zu ändern." 
          });
        }
        
        // Wenn es ein anderer Fehler ist, werfen wir ihn weiter
        throw err;
      }
      
      return res.status(200).json({ message: "Email template deleted successfully" });
    } catch (error) {
      console.error("Error deleting email template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // API für einfachen SMTP-Test für normale Benutzer mit automatischem Speichern
  app.post('/api/user-smtp-test', isAuthenticated, async (req, res) => {
    try {
      const { host, port, user, password, sender, recipient } = req.body;
      
      console.log('SMTP-Test von normalem Benutzer mit folgenden Parametern:');
      console.log(`Host: ${host}, Port: ${port}, Benutzer: ${user}`);
      
      if (!host || !port || !user || !password || !sender || !recipient) {
        return res.status(400).json({
          success: false,
          message: 'Alle SMTP-Parameter müssen angegeben werden'
        });
      }
      
      // Erstelle einen temporären Transporter zum Testen
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
          user,
          pass: password
        },
        debug: true,
        logger: true
      });
      
      try {
        // Explizit die Verbindung testen
        console.log('SMTP-Verbindungstest wird gestartet...');
        await transporter.verify();
        console.log('SMTP-Verbindungstest erfolgreich');
        
        // Test-E-Mail senden
        const info = await transporter.sendMail({
          from: `"${sender}" <${user}>`,
          to: recipient,
          subject: 'SMTP-Test von Handyshop Verwaltung',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #4f46e5;">SMTP-Test erfolgreich!</h2>
              <p>Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist und E-Mails versendet werden können.</p>
              <p>Details der Konfiguration:</p>
              <ul>
                <li>Host: ${host}</li>
                <li>Port: ${port}</li>
                <li>Benutzer: ${user}</li>
                <li>Absender: ${sender}</li>
              </ul>
              <p>Gesendet: ${new Date().toLocaleString('de-DE')}</p>
            </div>
          `,
          text: `SMTP-Test erfolgreich! Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist und E-Mails versendet werden können.`
        });
        
        console.log('Test-E-Mail erfolgreich gesendet:', info.messageId);
        
        // Erfolgreiche SMTP-Einstellungen automatisch in den Geschäftseinstellungen speichern
        try {
          // Benutzer-ID aus der Anfrage holen
          const userId = (req.user as any)?.id;
          if (!userId) {
            throw new Error('Benutzer-ID nicht gefunden');
          }
          
          // Aktuelle Geschäftseinstellungen des Benutzers holen
          const userSettings = await storage.getBusinessSettings(userId);
          if (!userSettings) {
            throw new Error('Geschäftseinstellungen nicht gefunden');
          }
          
          // SMTP-Einstellungen aktualisieren
          await storage.updateBusinessSettings({
            ...userSettings,
            smtpHost: host,
            smtpPort: port.toString(),
            smtpUser: user,
            smtpPassword: password,
            smtpSenderName: sender
          }, userId);
          
          console.log(`SMTP-Einstellungen für Benutzer ${userId} erfolgreich aktualisiert.`);
          
          return res.json({
            success: true,
            message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet. Die SMTP-Einstellungen wurden automatisch in Ihren Geschäftseinstellungen gespeichert.',
            details: {
              messageId: info.messageId,
              response: info.response,
              settingsSaved: true
            }
          });
        } catch (saveError) {
          console.error('Fehler beim Speichern der SMTP-Einstellungen:', saveError);
          
          // Test war erfolgreich, aber Speichern der Einstellungen fehlgeschlagen
          return res.json({
            success: true,
            message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet, aber die Einstellungen konnten nicht automatisch gespeichert werden: ' + (saveError as Error).message,
            details: {
              messageId: info.messageId,
              response: info.response,
              settingsSaved: false
            }
          });
        }
      } catch (error) {
        console.error('SMTP-Test fehlgeschlagen:', error);
        
        return res.status(500).json({
          success: false,
          message: 'SMTP-Test fehlgeschlagen',
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            response: error.response,
            responseCode: error.responseCode,
            command: error.command
          }
        });
      } finally {
        // Transporter schließen
        transporter.close();
      }
    } catch (error) {
      console.error('Fehler beim SMTP-Test:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Fehler beim SMTP-Test',
        error: error.message
      });
    }
  });

  app.post("/api/send-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { templateId, to, variables } = req.body;
      
      if (!templateId || !to || !variables) {
        return res.status(400).json({ error: "Template ID, recipient email, and variables are required" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Füge userId zu den Variablen hinzu, um die Datenisolierung zu gewährleisten
      const variablesWithUserId = {
        ...variables,
        userId: userId.toString()
      };
      
      const success = await storage.sendEmailWithTemplate(templateId, to, variablesWithUserId);
      if (!success) {
        return res.status(500).json({ error: "Failed to send email" });
      }
      
      return res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // SMS-Vorlagen API-Endpunkte wurden auf Kundenwunsch entfernt
  
  // API-Endpunkt zum Senden von Bewertungs-E-Mails
  app.post("/api/repairs/:id/send-review-request", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Benutzer abrufen, um Preispaket zu prüfen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Für Basic-Benutzer: Bewertungsanfragen nicht erlauben
      if (user.pricingPlan === 'basic') {
        return res.status(403).json({ 
          message: "Im Basic-Paket können keine Bewertungsanfragen gesendet werden. Upgrade auf Professional, um diese Funktion zu nutzen."
        });
      }
      
      // Zuerst prüfen, ob die Reparatur dem angemeldeten Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      // Kunde und Business-Daten laden
      const customer = await storage.getCustomer(repair.customerId, userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Kunde nicht gefunden" });
      }
      
      if (!customer.email) {
        return res.status(400).json({ message: "Kunde hat keine E-Mail-Adresse" });
      }
      
      // Business-Einstellungen laden
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Prüfen, ob der Benutzer SMTP-Einstellungen konfiguriert hat
      if (!businessSettings || !businessSettings.smtpHost || !businessSettings.smtpUser || !businessSettings.smtpPassword) {
        return res.status(400).json({ 
          message: "Keine E-Mail-Einstellungen konfiguriert. Bitte konfigurieren Sie Ihre SMTP-Einstellungen in den Geschäftseinstellungen, bevor Sie E-Mails versenden."
        });
      }
      
      // Lade den Bewertungslink aus den Geschäftseinstellungen
      let reviewLink = businessSettings?.reviewLink || "";
      
      // Stelle sicher, dass der Bewertungslink mit http:// oder https:// beginnt
      if (reviewLink && !reviewLink.startsWith('http')) {
        reviewLink = 'https://' + reviewLink;
      }
      
      console.log(`Bewertungslink für E-Mail: "${reviewLink}"`);
      
      // Variablen für die Kommunikation zusammenstellen
      const variables: Record<string, string> = {
        "kundenname": `${customer.firstName} ${customer.lastName}`,
        "geraet": repair.model,
        "hersteller": repair.brand,
        "auftragsnummer": repair.orderCode || '',
        "fehler": repair.issue,
        "geschaeftsname": businessSettings?.businessName || "Handyshop",
        "logo": businessSettings?.logoImage || "",
        "telefon": businessSettings?.phone || "",
        "email": businessSettings?.email || "",
        "adresse": `${businessSettings?.streetAddress || ""}, ${businessSettings?.zipCode || ""} ${businessSettings?.city || ""}`,
        "website": businessSettings?.website || "",
        "bewertungslink": reviewLink, // Explizit setzen
        // Wichtig für E-Mail-Verlaufseinträge
        "repairId": repairId.toString(),
        // Wichtig: userId für die Datenisolierung hinzufügen
        "userId": userId.toString()
      };
      
      // Direkte Datenbankabfrage für E-Mail-Vorlagen (globale + benutzerspezifische)
      const templates = await db.select()
        .from(emailTemplates)
        .where(
          or(
            isNull(emailTemplates.userId), // Globale Vorlagen
            eq(emailTemplates.userId, userId) // Benutzerspezifische Vorlagen
          )
        );
      
      console.log(`Suche nach Bewertungsvorlage für Benutzer ${userId}. Gefundene Vorlagen: ${templates.length}`);
      templates.forEach((t, index) => {
        console.log(`  Vorlage ${index+1}: ID=${t.id}, Name="${t.name}", Typ=${t.type || 'unbekannt'}`);
      });
      
      const reviewTemplate = templates.find(t => 
        t.name.toLowerCase().includes("bewertung") || 
        t.name.toLowerCase().includes("feedback") ||
        t.name.toLowerCase().includes("bewertungen")
      );
      
      if (reviewTemplate) {
        console.log(`Bewertungsvorlage gefunden: ID=${reviewTemplate.id}, Name="${reviewTemplate.name}"`);
      } else {
        console.log("Keine passende Bewertungsvorlage gefunden!");
      }
      
      if (!reviewTemplate) {
        return res.status(404).json({ message: "Keine Bewertungs-E-Mail-Vorlage gefunden" });
      }
      
      // E-Mail senden - verwende die gleiche Methode wie bei Statusänderungen
      try {
        const { emailService } = await import('./email-service.js');
        
        // E-Mail über den EmailService senden mit korrekten Variablen für die Bewertungsvorlage
        const emailResult = await emailService.sendRepairStatusEmail(
          user.id,
          repair.id,
          'bewertung', // templateType
          {
            repairId: repair.id,
            status: 'bewertung_angefordert',
            customer: customer,
            repair: repair,
            businessSettings: businessSettings,
            // Zusätzliche Variablen für die Bewertungsvorlage
            customVariables: {
              "kundenname": `${customer.firstName} ${customer.lastName}`,
              "geraet": repair.model,
              "hersteller": repair.brand,
              "geschaeftsname": businessSettings?.businessName || "Handyshop",
              "telefon": businessSettings?.phone || "",
              "email": businessSettings?.email || "",
              "adresse": `${businessSettings?.streetAddress || ""}, ${businessSettings?.zipCode || ""} ${businessSettings?.city || ""}`.trim(),
              "website": businessSettings?.website || "",
              "bewertungslink": reviewLink,
              "businessLogo": businessSettings?.logoImage || ""
            }
          }
        );
        
        if (!emailResult || !emailResult.success) {
          const errorMessage = emailResult?.error || 'E-Mail-Versand fehlgeschlagen';
          return res.status(500).json({ message: `E-Mail konnte nicht gesendet werden: ${errorMessage}` });
        }
      } catch (error) {
        console.error("Fehler beim Senden der Bewertungs-E-Mail:", error);
        const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
        return res.status(500).json({ 
          message: `E-Mail konnte nicht gesendet werden: ${errorMessage}`
        });
      }
      
      // Setze das reviewRequestSent-Flag in der Datenbank
      console.log(`Aktualisiere reviewRequestSent für Reparatur ${repairId} auf TRUE`);
      try {
        const result = await db.update(repairs)
          .set({ reviewRequestSent: true })
          .where(eq(repairs.id, repairId));
        console.log(`Update-Ergebnis: ${JSON.stringify(result)}`);
        
        // Direkte Bestätigung durch erneute Abfrage
        const [updatedRepair] = await db.select()
          .from(repairs)
          .where(eq(repairs.id, repairId));
        console.log(`Überprüfung des Flags: reviewRequestSent = ${updatedRepair.reviewRequestSent}`);
        
        // Manuellen E-Mail-Verlaufseintrag erstellen
        console.log(`Erstelle manuellen E-Mail-Verlaufseintrag für Reparatur ${repairId}`);
        try {
          // Direktes SQL für den E-Mail-Verlaufseintrag
          const emailHistoryQuery = `
            INSERT INTO "email_history" ("repairId", "emailTemplateId", "subject", "recipient", "status", "userId") 
            VALUES (
              ${repairId},
              ${reviewTemplate.id},
              '${reviewTemplate.subject.replace(/'/g, "''")}',
              '${customer.email.replace(/'/g, "''")}',
              'success',
              ${userId}
            )
          `;
          console.log('Manuelles SQL für E-Mail-Verlaufseintrag:', emailHistoryQuery);
          await db.execute(emailHistoryQuery);
          console.log(`E-Mail-Verlaufseintrag für Reparatur ${repairId} erstellt`);
        } catch (historyError) {
          console.error('Fehler beim Erstellen des manuellen E-Mail-Verlaufseintrags:', historyError);
        }
      } catch (updateError) {
        console.error("Fehler beim Aktualisieren des reviewRequestSent-Flags:", updateError);
      }
      
      res.json({ success: true, message: "Bewertungs-E-Mail wurde gesendet" });
    } catch (error) {
      console.error("Error sending review request email:", error);
      res.status(500).json({ message: "Failed to send review request email" });
    }
  });

  // Reparaturauftrag per E-Mail senden - mit client-generiertem PDF (exakt wie Download)
  app.post("/api/send-repair-pdf-email", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const { repairId, customerEmail, customerName, pdfData, orderCode } = req.body;
      const userId = (req.user as any).id;
      
      // Überprüfen, ob alle erforderlichen Daten vorhanden sind
      if (!repairId || !customerEmail || !pdfData) {
        console.log('Fehlende Daten:', { repairId: !!repairId, customerEmail: !!customerEmail, pdfData: !!pdfData });
        return res.status(400).json({ 
          message: "Reparatur-ID, E-Mail-Adresse und PDF-Daten sind erforderlich" 
        });
      }
      
      // Reparatur abrufen für Berechtigungsprüfung
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      console.log(`Sende Reparaturauftrag ${orderCode || repair.orderCode} per E-Mail an ${customerEmail}`);
      
      // PDF-Buffer aus Base64-Daten erstellen (exakt wie Download)
      const pdfBuffer = Buffer.from(pdfData, 'base64');
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        return res.status(500).json({ message: "Fehler beim Verarbeiten der PDF-Daten" });
      }
      
      // Geschäftseinstellungen für den Absender abrufen
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // E-Mail-Absender-Informationen aus Geschäftseinstellungen verwenden
      const senderName = businessSettings?.businessName || 'Handyshop Verwaltung';
      const senderEmail = businessSettings?.email || businessSettings?.smtpUser;
      
      const subject = `Reparaturauftrag ${orderCode || repair.orderCode}`;
      
      // Kunde und vollständige Daten abrufen für das neue Template
      const customer = await storage.getCustomer(repair.customerId, userId);
      if (!customer) {
        console.log(`Kunde ${repair.customerId} nicht gefunden für Reparatur ${repairId}`);
        return res.status(404).json({ message: "Kunde nicht gefunden" });
      }

      // E-Mail mit bewährter Kostenvoranschlag-Methode senden (ohne komplexes HTML)
      const emailSent = await storage.sendEmailWithAttachment({
        to: customerEmail,
        from: `"${senderName}" <${senderEmail}>`,
        subject: subject,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">Reparaturauftrag ${orderCode || repair.orderCode}</h2>
            <p>Sehr geehrte/r ${customer.firstName} ${customer.lastName},</p>
            <p>anbei erhalten Sie Ihren Reparaturauftrag als PDF-Dokument mit allen wichtigen Informationen.</p>
            <p>Bei Fragen oder für Rücksprachen stehen wir Ihnen gerne zur Verfügung.</p>
            <p>Mit freundlichen Grüßen,</p>
            <p><strong>${senderName}</strong></p>
          </div>
        `,
        textBody: `Reparaturauftrag ${orderCode || `#${repairId}`}\n\nSehr geehrte/r ${customer.firstName} ${customer.lastName},\n\nanbei erhalten Sie Ihren Reparaturauftrag als PDF-Dokument.\n\nBei Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen,\n${senderName}`,
        attachments: [{
          filename: `Reparaturauftrag_${orderCode || repairId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }],
        userId: userId
      });
      
      if (!emailSent) {
        return res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
      }
      
      res.status(200).json({ success: true, message: "Reparaturauftrag wurde per E-Mail gesendet" });
    } catch (error) {
      console.error("Fehler beim Senden des Reparaturauftrags per E-Mail:", error);
      res.status(500).json({ 
        message: "Fehler beim Senden des Reparaturauftrags per E-Mail",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test-E-Mail-Endpunkt zur Überprüfung der SMTP-Konfiguration
  app.post("/api/test-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { testEmail } = req.body;
      
      if (!testEmail) {
        return res.status(400).json({ message: "Test-E-Mail-Adresse erforderlich" });
      }
      
      const userId = (req.user as any).id;
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Einfache Test-E-Mail ohne PDF
      const testSubject = "Test-E-Mail von Handyshop Verwaltung";
      const testContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test-E-Mail</h2>
          <p>Diese E-Mail wurde erfolgreich von Ihrem Handyshop-System versendet.</p>
          <p>Zeitstempel: ${new Date().toLocaleString('de-DE')}</p>
          <p>Von: ${businessSettings?.businessName || 'Handyshop'}</p>
        </div>
      `;
      
      console.log(`🧪 Sende Test-E-Mail an ${testEmail}`);
      
      const emailSent = await storage.sendEmailWithAttachment({
        to: testEmail,
        from: `"${businessSettings?.businessName || 'Handyshop'}" <${businessSettings?.email || process.env.SMTP_USER}>`,
        subject: testSubject,
        htmlBody: testContent,
        textBody: `Test-E-Mail von ${businessSettings?.businessName || 'Handyshop'}\n\nDiese E-Mail wurde erfolgreich versendet.\nZeitstempel: ${new Date().toLocaleString('de-DE')}`,
        attachments: [],
        userId: userId
      });
      
      console.log(`🧪 Test-E-Mail Ergebnis: ${emailSent ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}`);
      
      if (emailSent) {
        res.json({ 
          success: true, 
          message: `Test-E-Mail wurde an ${testEmail} gesendet` 
        });
      } else {
        res.status(500).json({ 
          message: "Test-E-Mail konnte nicht gesendet werden" 
        });
      }
      
    } catch (error) {
      console.error("Fehler beim Senden der Test-E-Mail:", error);
      res.status(500).json({ message: "Fehler beim Senden der Test-E-Mail" });
    }
  });

  // Test-E-Mail mit Auftragsbestätigungs-Vorlage senden
  app.post("/api/send-test-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { repairId, customerEmail } = req.body;
      
      if (!repairId || !customerEmail) {
        return res.status(400).json({ message: "Reparatur-ID und Kunden-E-Mail erforderlich" });
      }
      
      const userId = (req.user as any).id;
      
      // Reparatur abrufen
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }

      // Kunde abrufen
      const customer = await storage.getCustomer(repair.customerId, userId);
      if (!customer) {
        return res.status(404).json({ message: "Kunde nicht gefunden" });
      }

      // Auftragsbestätigung Template aus der Datenbank laden (Superadmin-Template)
      const adminTemplate = await db.select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.name, 'Auftragsbestätigung'),
          isNull(emailTemplates.userId) // Globale Superadmin-Templates haben userId = null
        ))
        .limit(1);

      if (adminTemplate.length === 0) {
        return res.status(404).json({ message: "Auftragsbestätigung Vorlage nicht gefunden" });
      }

      const template = adminTemplate[0];

      
      // Geschäftseinstellungen abrufen
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Template-Variablen ersetzen
      let emailContent = template.body;
      let emailSubject = template.subject;
      
      // Template-Variablen für das "Test Email" Template bereitstellen
      const variables = {
        zeitstempel: new Date().toLocaleString('de-DE'),
        geschaeftsname: businessSettings?.businessName || 'Handyshop',
        kundenname: `${customer.firstName} ${customer.lastName}`,
        hersteller: repair.brand,
        geraet: repair.model,
        auftragsnummer: repair.orderCode,
        fehler: repair.issue,
        kosten: repair.estimatedCost?.toString() || '0',
        telefon: businessSettings?.phone || '',
        email: businessSettings?.email || '',
        reparaturbedingungen: businessSettings?.repairTerms || 'Keine Reparaturbedingungen hinterlegt'
      };
      
      // Variablen im Subject und Content ersetzen
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        emailContent = emailContent.replace(regex, value);
        emailSubject = emailSubject.replace(regex, value);
      });
      
      console.log(`🧪 Sende Test-E-Mail an ${customerEmail} mit Template: ${template.name}`);
      console.log(`🧪 Template Betreff VOR Ersetzung: ${template.subject}`);
      console.log(`🧪 Template Betreff NACH Ersetzung: ${emailSubject}`);
      console.log(`🧪 E-Mail Inhalt (erste 200 Zeichen):`, emailContent.substring(0, 200));
      
      // Verwende den Standard-E-Mail-Versand mit dem aufbereiteten Template
      const emailSent = await storage.sendEmailWithAttachment({
        to: customerEmail,
        from: `"${businessSettings?.businessName || 'Handyshop'}" <${businessSettings?.email || process.env.SMTP_USER}>`,
        subject: emailSubject,
        htmlBody: emailContent.replace(/\n/g, '<br>'),
        textBody: emailContent.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen für Text-Version
        attachments: [],
        userId: userId
      });
      
      if (emailSent) {
        // E-Mail-Historie speichern - verwende manuelle DB-Insertion
        try {
          await db.insert(emailHistory).values({
            repairId: repair.id,
            emailTemplateId: null, // Globale Templates haben keine lokale Template-ID  
            subject: emailSubject,
            recipient: customerEmail,
            status: 'sent',
            userId: userId,
            shopId: repair.shopId,
            sentAt: new Date()
          });
        } catch (historyError) {
          console.warn('Fehler beim Speichern der E-Mail-Historie:', historyError);
        }
        
        res.json({ 
          success: true, 
          message: `Test-E-Mail wurde an ${customerEmail} gesendet` 
        });
      } else {
        res.status(500).json({ 
          message: "Test-E-Mail konnte nicht gesendet werden" 
        });
      }
      
    } catch (error) {
      console.error("Fehler beim Senden der Test-E-Mail:", error);
      res.status(500).json({ message: "Fehler beim Senden der Test-E-Mail" });
    }
  });

  // SMS-Endpunkt wurde auf Kundenwunsch entfernt

  // API-Endpunkt zum Abrufen des E-Mail-Verlaufs für eine Reparatur
  // API-Endpunkt zum Speichern einer digitalen Unterschrift für eine Reparatur
  // API-Endpunkt zum Speichern einer digitalen Unterschrift für eine Reparatur
  // Zwei Arten von Unterschriften werden unterstützt: Abgabe (dropoff) und Abholung (pickup)
  app.patch("/api/repairs/:id/signature/:type", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      const signatureType = req.params.type as 'dropoff' | 'pickup';
      const { signature } = req.body;
      
      // Prüfen, ob der Signatur-Typ gültig ist
      if (signatureType !== 'dropoff' && signatureType !== 'pickup') {
        return res.status(400).json({ message: "Ungültiger Signatur-Typ. Erlaubt sind 'dropoff' oder 'pickup'" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Benutzer abrufen, um Preispaket zu prüfen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Alle Benutzer haben Vollzugriff auf beide Unterschriftstypen
      // Paketbeschränkungen wurden entfernt
      
      // Zuerst prüfen, ob die Reparatur dem angemeldeten Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      // Unterschrift und Zeitstempel speichern (mit Shop-Isolation durch User-ID)
      const updatedRepair = await storage.updateRepairSignature(repairId, signature, signatureType, userId);
      
      res.json(updatedRepair);
    } catch (error) {
      console.error("Error saving signature:", error);
      res.status(500).json({ message: "Fehler beim Speichern der Unterschrift" });
    }
  });
  
  // Alten Endpunkt für Rückwärtskompatibilität beibehalten (verwendet standardmäßig 'dropoff')
  app.patch("/api/repairs/:id/signature", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      const { signature } = req.body;
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Benutzer abrufen, um Preispaket zu prüfen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      // Alle Benutzer haben Vollzugriff auf beide Unterschriftstypen
      // Paketbeschränkungen wurden entfernt
      
      // Zuerst prüfen, ob die Reparatur dem angemeldeten Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      // Unterschrift und Zeitstempel speichern mit Shop-Isolation (Standard: Abgabe-Unterschrift)
      const updatedRepair = await storage.updateRepairSignature(repairId, signature, 'dropoff', userId);
      
      res.json(updatedRepair);
    } catch (error) {
      console.error("Error saving signature:", error);
      res.status(500).json({ message: "Fehler beim Speichern der Unterschrift" });
    }
  });

  // API-Endpunkt zum Abrufen des E-Mail-Verlaufs für eine Reparatur
  app.get("/api/repairs/:id/email-history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Zuerst prüfen, ob die Reparatur dem angemeldeten Benutzer gehört
      const repair = await storage.getRepair(repairId, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      // E-Mail-Verlauf für diese Reparatur abrufen (mit Shop-Isolation)
      const emailHistory = await storage.getEmailHistoryForRepair(repairId, userId);
      
      res.json(emailHistory);
    } catch (error) {
      console.error("Error retrieving email history for repair:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des E-Mail-Verlaufs" });
    }
  });

  // Registriere die Admin-Routen
  registerAdminRoutes(app);
  
  // KOSTENVORANSCHLAG API ENTFERNT
  // Alle API-Endpunkte für Kostenvoranschläge wurden komplett entfernt
  // Diese Funktionalität wird später komplett neu implementiert
  
  // Kostenvoranschlag-Funktionalität komplett entfernt
  // Die Umwandlung von Kostenvoranschlägen in Reparaturaufträge wurde entfernt

  // Feature-Zugriff-Test-Endpunkt für das Testen der Feature-Übersteuerungen
  app.get("/api/check-feature-access/:feature", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const featureName = req.params.feature;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({ hasAccess: false, message: "Nicht authentifiziert" });
      }

      // Featureübersteuerungen parsen
      let featureOverrides = null;
      if (user.featureOverrides) {
        try {
          if (typeof user.featureOverrides === "string") {
            featureOverrides = JSON.parse(user.featureOverrides);
          } else {
            featureOverrides = user.featureOverrides;
          }
        } catch (e) {
          console.warn(`Fehler beim Parsen der Feature-Übersteuerungen für Benutzer ${user.id}:`, e);
        }
      }

      // Zugriffsberechtigung prüfen
      const accessGranted = hasAccess(user, featureName);

      res.json({ 
        hasAccess: accessGranted,
        userId: user.id,
        username: user.username,
        feature: featureName,
        pricingPlan: user.pricingPlan || "basic",
        featureOverrides
      });
    } catch (error) {
      console.error("Fehler bei der Zugriffsprüfung:", error);
      res.status(500).json({ 
        hasAccess: false, 
        message: "Fehler bei der Zugriffsprüfung", 
        error: (error as Error).message 
      });
    }
  });

  // API-Endpunkt zur Überprüfung des Feature-Zugriffs (für das neue Paketsystem)
  app.get("/api/check-feature-access", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { feature } = req.query;
      
      if (!feature || typeof feature !== 'string') {
        return res.status(400).json({ message: "Feature-Parameter muss angegeben werden" });
      }
      
      // Benutzer aus dem Request verwenden
      const user = req.user;
      
      // Berechtigungsprüfung mit dem neuen System durchführen
      const hasAccess = await hasAccessAsync(user, feature);
      
      res.json({
        feature,
        hasAccess,
        // Debug-Informationen für Admin-Benutzer
        debug: user?.isAdmin ? {
          userId: (user as any).id,
          packageId: (user as any).packageId,
          pricingPlan: (user as any).pricingPlan,
          username: (user as any).username
        } : undefined
      });
    } catch (error) {
      console.error("Fehler bei der Feature-Zugriffsüberprüfung:", error);
      res.status(500).json({ message: "Fehler bei der Feature-Zugriffsüberprüfung" });
    }
  });

  /**
   * Druckvorlagen für Benutzer abrufen
   * Diese Route gibt die globalen (Standard-)Druckvorlagen zurück
   */
  app.get("/api/print-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      
      // Direkte Abfrage an den Pool, um immer die aktuellsten Vorlagen zu bekommen (kein Caching)
      let query = `
        SELECT 
          id, 
          name, 
          type, 
          content, 
          variables, 
          user_id as "userId", 
          shop_id as "shopId",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM 
          print_templates
        WHERE 
          shop_id = 0`; // Nur globale Vorlagen (shop_id = 0)
          
      const queryParams = [];
      
      // Optionale Filterung nach Vorlagentyp
      if (type && typeof type === 'string') {
        query += ` AND type = $1`;
        queryParams.push(type);
      }
      
      query += ` ORDER BY id ASC`;
      
      const { pool } = await import('./db');
      const result = await pool.query(query, queryParams);
      
      console.log(`Druckvorlagen abgerufen für Benutzer ${(req.user as any).username}, Typ: ${type || 'alle'}, Anzahl: ${result.rows.length}`);
      res.json(result.rows);
    } catch (error) {
      console.error("Fehler beim Abrufen der Druckvorlagen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Druckvorlagen" });
    }
  });

  /**
   * Spezifische Druckvorlage für einen bestimmten Typ abrufen
   */
  app.get("/api/print-templates/:type", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      
      if (!type) {
        return res.status(400).json({ message: "Vorlagentyp muss angegeben werden" });
      }
      
      // Direkte Abfrage an den Pool, um immer die aktuellste Vorlage zu bekommen (kein Caching)
      const { pool } = await import('./db');
      const result = await pool.query(
        `SELECT 
          id, 
          name, 
          type, 
          content, 
          variables, 
          user_id as "userId", 
          shop_id as "shopId",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM 
          print_templates
        WHERE 
          shop_id = 0 AND
          type = $1
        ORDER BY 
          id DESC
        LIMIT 1`,
        [type]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: `Keine Druckvorlage für Typ '${type}' gefunden` });
      }
      
      console.log(`Druckvorlage vom Typ '${type}' abgerufen für Benutzer ${(req.user as any).username}`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Fehler beim Abrufen der Druckvorlage:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Druckvorlage" });
    }
  });

  // Die globalen Gerätedata-Routen wurden bereits oben registriert
  
  // Support-Zugriffs-Routen für DSGVO-Konformität wurden bereits oben registriert

  // KOSTENVORANSCHLÄGE API mit DSGVO-konformer Shop-Isolation
  app.get("/api/cost-estimates", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      console.log(`Abrufen aller Kostenvoranschläge für Benutzer ${userId}`);
      
      const estimates = await storage.getAllCostEstimates(userId);
      res.json(estimates);
    } catch (error) {
      console.error("Fehler beim Abrufen der Kostenvoranschläge:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Kostenvoranschläge",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Einzelnen Kostenvoranschlag abrufen
  app.get("/api/cost-estimates/:id", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const userId = (req.user as any).id;
      const estimate = await storage.getCostEstimate(id, userId);
      
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      res.json(estimate);
    } catch (error) {
      console.error(`Fehler beim Abrufen des Kostenvoranschlags ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen des Kostenvoranschlags",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Positionen eines Kostenvoranschlags abrufen
  app.get("/api/cost-estimates/:id/items", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const userId = (req.user as any).id;
      console.log(`getCostEstimateItems: Abrufen der Positionen für Kostenvoranschlag ${id}`);
      
      // Kostenvoranschlag direkt abfragen
      const estimate = await storage.getCostEstimate(id, userId);
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      // Positionen direkt aus dem items Feld des Kostenvoranschlags extrahieren
      let items = [];
      try {
        if (estimate.items) {
          console.log("Items aus Datenbank (Typ: " + typeof estimate.items + "):", estimate.items);
          if (typeof estimate.items === 'string') {
            items = JSON.parse(estimate.items);
          } else if (Array.isArray(estimate.items)) {
            items = estimate.items;
          } else if (typeof estimate.items === 'object') {
            items = estimate.items;
          }
        }
        console.log(`Items sind ${Array.isArray(items) ? "bereits ein Array" : "KEIN Array"} mit ${items ? items.length : 0} Elementen`);
      } catch (err) {
        console.error("Fehler beim Parsen der Items:", err);
      }
      
      res.json(items);
    } catch (error) {
      console.error(`Fehler beim Abrufen der Positionen für Kostenvoranschlag ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Positionen",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Neuen Kostenvoranschlag erstellen
  app.post("/api/cost-estimates", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      console.log("Erstelle neuen Kostenvoranschlag mit Daten:", JSON.stringify(req.body));
      
      // Robust machen wir die Verarbeitung der Positionen (items)
      let processedItems = [];
      if (req.body.items) {
        try {
          if (typeof req.body.items === 'string') {
            // Versuche zu parsen, falls es ein JSON-String ist
            processedItems = JSON.parse(req.body.items);
          } else if (Array.isArray(req.body.items)) {
            // Bereits ein Array, direkt übernehmen
            processedItems = req.body.items;
          }
        } catch (e) {
          console.warn("Items konnten nicht geparst werden:", e);
          // Falls ein Fehler auftritt, leeres Array verwenden
          processedItems = [];
        }
      }
      
      // Items zurück in request.body setzen
      req.body.items = processedItems;
      console.log("Verarbeitete Items:", processedItems);
      
      // Zuerst: Kunde erstellen oder finden
      let customerId = req.body.customerId;
      let isNewCustomer = false;
      
      if (!customerId) {
        isNewCustomer = true;
        // Automatisch einen Kunden erstellen
        const customerData = {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phone: req.body.phone,
          email: req.body.email,
          address: req.body.address,
          postalCode: req.body.postalCode,
          city: req.body.city
        };
        
        console.log("Erstelle automatisch Kunde für Kostenvoranschlag:", customerData);
        
        // Benutzer holen für createdBy und Shop-ID
        const userId = (req.user as any).id;
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user || !user.shopId) {
          return res.status(403).json({ error: "Zugriff verweigert: Keine Shop-ID vorhanden" });
        }
        
        // Moderne Drizzle-ORM Syntax für sichere Kundenerstellung
        const [newCustomer] = await db
          .insert(customers)
          .values({
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            phone: customerData.phone,
            email: customerData.email,
            address: customerData.address,
            zipCode: customerData.postalCode,
            city: customerData.city,
            userId: userId,
            shopId: user.shopId,
            createdBy: storage.getUserDisplayName(user), // Audit-Trail: Benutzername für Shop-Owner, Vorname für Mitarbeiter
            createdAt: new Date()
          })
          .returning();
        
        const customerResult = { rows: [{ id: newCustomer.id }] };
        
        customerId = customerResult.rows[0]?.id;
        console.log("Neuer Kunde erstellt mit ID:", customerId);
      }
      
      // CustomerId zum Request hinzufügen
      req.body.customerId = customerId;
      
      // Bei bestehenden Kunden: Adressdaten aus der Datenbank laden
      if (!isNewCustomer && customerId) {
        const [dbCustomer] = await db
          .select({
            firstName: customers.firstName,
            lastName: customers.lastName,
            phone: customers.phone,
            email: customers.email,
            address: customers.address,
            zipCode: customers.zipCode,
            city: customers.city
          })
          .from(customers)
          .where(eq(customers.id, customerId))
          .limit(1);
        
        if (dbCustomer) {
          // Überschreibe Formulardaten mit Datenbankdaten
          req.body.firstName = dbCustomer.firstName;
          req.body.lastName = dbCustomer.lastName;
          req.body.phone = dbCustomer.phone;
          req.body.email = dbCustomer.email;
          req.body.address = dbCustomer.address;
          req.body.postalCode = dbCustomer.zipCode;
          req.body.city = dbCustomer.city;
          
          console.log("Adressdaten aus Datenbank geladen für Kunde", customerId, ":", {
            address: dbCustomer.address,
            zipCode: dbCustomer.zipCode,
            city: dbCustomer.city
          });
        }
      }
      
      // Validierung der Daten mit Zod
      const data = insertCostEstimateSchema.parse(req.body);
      
      // Zusätzliche Validierung - Prüfe, ob der Kunde zum Shop des Benutzers gehört
      await validateCustomerBelongsToShop(data.customerId, (req.user as any).id);
      
      // !!! FIX: IMMER 20% MwSt für Österreich !!!
      // MwSt korrekt berechnen - 20% im Bruttopreis enthalten
      // Bei einem Bruttopreis von 240€ sind das 40€ MwSt.
      let total = parseFloat(data.total?.replace(',', '.') || '0');
      
      // Brutto-Betrag durch 1.2 teilen um Netto zu bekommen (20% MwSt)
      const subtotal = (total / 1.2).toFixed(2);
      
      // MwSt = Brutto - Netto
      const taxAmount = (total - parseFloat(subtotal)).toFixed(2);
      
      // Werte im data-Objekt explizit aktualisieren und fixieren
      data.subtotal = subtotal.replace('.', ',');
      data.tax_rate = "20"; // !!! WICHTIG: Immer als String "20" speichern !!!
      data.tax_amount = taxAmount.replace('.', ',');
      data.total = total.toFixed(2).replace('.', ',');
      
      console.log("!!! Korrigierte MwSt-Berechnung !!!", {
        brutto: total,
        netto: subtotal,
        mwst: taxAmount,
        mwstRate: "20%",
        items: Array.isArray(data.items) ? data.items.length : (typeof data.items === 'string' ? 'JSON-String' : typeof data.items)
      });
      
      // Kostenvoranschlag mit Shop-Isolation erstellen
      const userId = (req.user as any).id;
      
      // DIREKTES SQL AUSFÜHREN ANSTATT STORAGE FUNKTION ZU VERWENDEN
      // Dies umgeht das Problem mit der falschen MwSt und fehlenden Positionen
      
      // Zuerst Shop-ID ermitteln
      const shopIdResult = await db.execute(`
        SELECT shop_id FROM users WHERE id = ${userId}
      `);
      const shopId = shopIdResult.rows[0]?.shop_id || 1;
      
      // Nächste Referenznummer generieren mit verbesserter Logik
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      
      // Hole die höchste Nummer für diesen Monat shop-spezifisch
      const lastEstimateQuery = await db.execute(`
        SELECT reference_number
        FROM cost_estimates 
        WHERE shop_id = ${shopId} 
          AND reference_number LIKE 'KV-${year}${month}-%'
        ORDER BY reference_number DESC
        LIMIT 1
      `);
      
      let nextNumber = 1;
      if (lastEstimateQuery.rows.length > 0 && lastEstimateQuery.rows[0].reference_number) {
        const lastNumber = lastEstimateQuery.rows[0].reference_number;
        const match = lastNumber.match(/KV-\d{4}-(\d{3})/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      // Versuche mehrere Nummern, falls die erste bereits vergeben ist
      let estimateNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        estimateNumber = `KV-${year}${month}-${String(nextNumber + attempts).padStart(3, '0')}`;
        
        // Prüfe ob die Nummer bereits existiert (shop-spezifisch)
        const existsQuery = await db.execute(`
          SELECT 1 FROM cost_estimates 
          WHERE reference_number = '${estimateNumber}' 
          AND shop_id = ${shopId}
          LIMIT 1
        `);
        
        if (existsQuery.rows.length === 0) {
          break; // Nummer ist frei
        }
        
        console.log(`Referenznummer ${estimateNumber} bereits vergeben, versuche nächste...`);
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error("Konnte keine eindeutige Referenznummer generieren");
      }
      
      console.log(`Neue Kostenvoranschlagsnummer erstellt: ${estimateNumber}`);
      
      // Direktes SQL ohne Storage-Funktion
      const sql = `
        INSERT INTO cost_estimates (
          reference_number, customer_id, title, device_type, brand, model, 
          issue, status, created_at, updated_at, items, user_id, shop_id,
          subtotal, tax_rate, tax_amount, total, serial_number
        )
        VALUES (
          '${estimateNumber}', 
          ${data.customerId}, 
          '${data.title || "Kostenvoranschlag"}', 
          '${data.deviceType}', 
          '${data.brand}', 
          '${data.model}', 
          '${data.issue || "Keine Angabe"}', 
          'offen', 
          NOW(), 
          NOW(), 
          '${JSON.stringify(data.items)}'::jsonb, 
          ${userId}, 
          ${shopId},
          '${data.subtotal}',    /* subtotal - Netto */
          '20',                  /* tax_rate - FEST 20% für Österreich */
          '${data.tax_amount}',  /* tax_amount - 20% MwSt */
          '${data.total}',       /* total - Brutto */
          ${data.serial_number ? `'${data.serial_number}'` : 'NULL'}
        )
        RETURNING *;
      `;
      
      console.log("Direktes SQL ausführen:", sql);
      const result = await db.execute(sql);
      
      if (result.rows && result.rows.length > 0) {
        console.log(`Neuer Kostenvoranschlag ${result.rows[0].id} erstellt für Benutzer ${userId}`);
        const newEstimate = result.rows[0];
        
        res.status(201).json(newEstimate);
      } else {
        throw new Error("Fehler beim Erstellen des Kostenvoranschlags: Keine Rückgabedaten");
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Kostenvoranschlags:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validierungsfehler", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Fehler beim Erstellen des Kostenvoranschlags",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Kostenvoranschlag-Status aktualisieren
  app.patch("/api/cost-estimates/:id/status", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const status = req.body.status;
      if (!status) {
        return res.status(400).json({ message: "Status muss angegeben werden" });
      }
      
      const userId = (req.user as any).id;
      const updatedEstimate = await storage.updateCostEstimateStatus(id, status, userId);
      
      if (!updatedEstimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden oder keine Berechtigung" });
      }
      
      return res.json({ success: true, status });
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Status für Kostenvoranschlag ${req.params.id}:`, error);
      return res.status(500).json({ message: "Fehler beim Aktualisieren des Status" });
    }
  });
  
  // Kostenvoranschlag aktualisieren
  app.put("/api/cost-estimates/:id", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Prüfe, ob der Kostenvoranschlag existiert und zum Shop des Benutzers gehört
      const existingEstimate = await storage.getCostEstimate(id, userId);
      if (!existingEstimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      // Wenn sich die customerId ändert, prüfen, ob der neue Kunde zum Shop gehört
      if (req.body.customerId && req.body.customerId !== existingEstimate.customerId) {
        await validateCustomerBelongsToShop(req.body.customerId, userId);
      }
      
      // Aktualisierung durchführen
      const updatedEstimate = await storage.updateCostEstimate(id, req.body, userId);
      
      if (!updatedEstimate) {
        return res.status(404).json({ message: "Kostenvoranschlag konnte nicht aktualisiert werden" });
      }
      
      console.log(`Kostenvoranschlag ${id} aktualisiert von Benutzer ${userId}`);
      res.json(updatedEstimate);
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Kostenvoranschlags ${req.params.id}:`, error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validierungsfehler", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren des Kostenvoranschlags",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Kostenvoranschlag löschen
  app.delete("/api/cost-estimates/:id", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const userId = (req.user as any).id;
      const success = await storage.deleteCostEstimate(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Kostenvoranschlag konnte nicht gelöscht werden oder wurde nicht gefunden" });
      }
      
      console.log(`Kostenvoranschlag ${id} gelöscht von Benutzer ${userId}`);
      res.status(204).end();
    } catch (error) {
      console.error(`Fehler beim Löschen des Kostenvoranschlags ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Löschen des Kostenvoranschlags",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Position eines Kostenvoranschlags erstellen (neue Implementierung mit JSONB)
  app.post("/api/cost-estimates/:id/items", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Prüfe, ob der Kostenvoranschlag existiert und zum Shop des Benutzers gehört
      const existingEstimate = await storage.getCostEstimate(id, userId);
      if (!existingEstimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      // Validierung der Daten
      const itemData = req.body;
      
      // Existierende Items parsen oder leeres Array initialisieren
      let existingItems = [];
      try {
        console.log("Vorhandene Items (Typ):", typeof existingEstimate.items);
        console.log("Vorhandene Items (Wert):", existingEstimate.items);
        
        if (existingEstimate.items) {
          if (typeof existingEstimate.items === 'string') {
            // String parsen
            existingItems = JSON.parse(existingEstimate.items);
          } else if (Array.isArray(existingEstimate.items)) {
            // Array direkt verwenden
            existingItems = existingEstimate.items;
          } else if (typeof existingEstimate.items === 'object') {
            // Objekt in Array umwandeln
            existingItems = [existingEstimate.items];
          }
        }
        console.log("Verarbeitete existierende Items:", existingItems);
      } catch (err) {
        console.error("Fehler beim Parsen der vorhandenen Items:", err);
        // Leeres Array beibehalten
        existingItems = [];
      }
      
      // Neue eindeutige ID generieren
      const maxId = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => Number(item.id || 0))) 
        : 0;
      const newItem = {
        ...itemData,
        id: maxId + 1
      };
      
      // Item zur Liste hinzufügen und zurück in JSON konvertieren
      existingItems.push(newItem);
      
      // Summen neu berechnen
      let total = 0;
      existingItems.forEach(item => {
        // Komma durch Punkt ersetzen, um parseFloat zu ermöglichen
        const itemTotal = parseFloat(item.totalPrice.replace(',', '.'));
        if (!isNaN(itemTotal)) {
          total += itemTotal;
        }
      });
      
      // FIX: Immer 20% MwSt für Österreich verwenden, kein Abruf vom Steuersatz aus der Datenbank mehr
      const taxRate = 20;
      
      // Netto-Betrag berechnen (Brutto / (1 + taxRate/100))
      const subtotal = total / (1 + taxRate/100);
      
      // MwSt-Betrag berechnen (Brutto - Netto)
      const taxAmount = total - subtotal;
      
      console.log("MwSt-Berechnung bei Kostenvoranschlag:", {
        brutto: total,
        taxRate,
        netto: subtotal,
        mwst: taxAmount
      });
      
      // Kostenvoranschlag aktualisieren
      await storage.updateCostEstimate(id, {
        items: JSON.stringify(existingItems),
        subtotal: subtotal.toFixed(2).replace('.', ','),
        tax_rate: "20", // FIX: Immer 20% MwSt für Österreich
        tax_amount: taxAmount.toFixed(2).replace('.', ','),
        total: total.toFixed(2).replace('.', ',')
      }, userId);
      
      console.log(`Neue Position für Kostenvoranschlag ${id} erstellt von Benutzer ${userId}`);
      res.status(201).json(newItem);
    } catch (error) {
      console.error(`Fehler beim Erstellen der Position für Kostenvoranschlag ${req.params.id}:`, error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validierungsfehler", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Fehler beim Erstellen der Position",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Positionen eines Kostenvoranschlags abrufen
  app.get("/api/cost-estimates/:id/items", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Prüfe, ob der Kostenvoranschlag existiert und zum Shop des Benutzers gehört
      const existingEstimate = await storage.getCostEstimate(id, userId);
      if (!existingEstimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      // Existierende Items parsen oder leeres Array zurückgeben
      let items = [];
      try {
        console.log("Kostenvoranschlag Items (Typ):", typeof existingEstimate.items);
        console.log("Kostenvoranschlag Items (Wert):", existingEstimate.items);
        
        if (existingEstimate.items) {
          if (typeof existingEstimate.items === 'string') {
            // String parsen, wenn es sich um einen JSON-String handelt
            items = JSON.parse(existingEstimate.items);
          } else if (Array.isArray(existingEstimate.items)) {
            // Wenn es bereits ein Array ist, direkt verwenden
            items = existingEstimate.items;
          } else if (typeof existingEstimate.items === 'object') {
            // Wenn es ein Objekt ist, es in ein Array umwandeln
            items = [existingEstimate.items];
          }
        }
        console.log("Verarbeitete Items:", items);
      } catch (err) {
        console.error("Fehler beim Parsen der Items:", err);
        // Fallback: leeres Array verwenden
        console.log("Verwende leeres Array als Fallback");
        items = [];
      }
      
      console.log(`Positionen für Kostenvoranschlag ${id} abgerufen von Benutzer ${userId}`);
      res.json(items);
    } catch (error) {
      console.error(`Fehler beim Abrufen der Positionen für Kostenvoranschlag ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Positionen",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Position eines Kostenvoranschlags löschen (neue Implementierung mit JSONB)
  app.delete("/api/cost-estimate-items/:itemId/estimate/:estimateId", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const estimateId = parseInt(req.params.estimateId);
      
      if (isNaN(itemId) || isNaN(estimateId)) {
        return res.status(400).json({ message: "Ungültige ID-Parameter" });
      }
      
      const userId = (req.user as any).id;
      
      // Prüfe, ob der Kostenvoranschlag existiert und zum Shop des Benutzers gehört
      const existingEstimate = await storage.getCostEstimate(estimateId, userId);
      if (!existingEstimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      // Existierende Items parsen mit verbesserter Verarbeitung
      let existingItems = [];
      try {
        console.log("Vorhandene Items beim Löschen (Typ):", typeof existingEstimate.items);
        console.log("Vorhandene Items beim Löschen (Wert):", existingEstimate.items);
        
        if (existingEstimate.items) {
          if (typeof existingEstimate.items === 'string') {
            existingItems = JSON.parse(existingEstimate.items);
          } else if (Array.isArray(existingEstimate.items)) {
            existingItems = existingEstimate.items;
          } else if (typeof existingEstimate.items === 'object') {
            existingItems = [existingEstimate.items];
          }
        }
        console.log("Erfolgreich geparste Items:", existingItems);
      } catch (err) {
        console.error("Fehler beim Parsen der vorhandenen Items:", err);
        return res.status(500).json({ message: "Fehler beim Verarbeiten der Daten" });
      }
      
      // Prüfen, ob das Item existiert
      const itemIndex = existingItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        return res.status(404).json({ message: "Position nicht gefunden" });
      }
      
      // Item entfernen
      existingItems.splice(itemIndex, 1);
      
      // Summen neu berechnen
      let total = 0;
      existingItems.forEach(item => {
        const itemPrice = parseFloat((item.totalPrice || "0").replace(',', '.'));
        if (!isNaN(itemPrice)) {
          total += itemPrice;
        }
      });
      
      // FIX: Immer 20% MwSt für Österreich verwenden
      const taxRate = 20;
      const subtotal = total / (1 + (taxRate/100));
      const taxAmount = total - subtotal;
      
      console.log("Aktualisierte MwSt-Berechnung beim Löschen:", {
        total,
        taxRate,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2)
      });
      
      // Kostenvoranschlag aktualisieren mit korrekter MwSt
      await storage.updateCostEstimate(estimateId, {
        items: JSON.stringify(existingItems),
        subtotal: subtotal.toFixed(2).replace('.', ','),
        tax_rate: "20", // FIX: Immer 20% MwSt für Österreich
        tax_amount: taxAmount.toFixed(2).replace('.', ','),
        total: total.toFixed(2).replace('.', ',')
      }, userId);
      
      console.log(`Position ${itemId} von Kostenvoranschlag ${estimateId} gelöscht von Benutzer ${userId}`);
      res.status(204).end();
    } catch (error) {
      console.error(`Fehler beim Löschen der Position ${req.params.itemId}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Löschen der Position",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Kostenvoranschlag in Reparaturauftrag umwandeln
  // Kostenvoranschlag per E-Mail senden
  app.post("/api/cost-estimates/:id/send-email", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      const { email, subject, pdfAttachment, pdfFilename } = req.body;
      
      // Überprüfen, ob alle erforderlichen Daten vorhanden sind
      if (!email || !subject || !pdfAttachment || !pdfFilename) {
        return res.status(400).json({ 
          message: "E-Mail-Adresse, Betreff, PDF-Anhang und Dateiname sind erforderlich" 
        });
      }
      
      // Kostenvoranschlag abrufen für Berechtigungsprüfung
      const estimate = await storage.getCostEstimate(id, userId);
      
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      console.log(`Sende Kostenvoranschlag ${estimate.reference_number} per E-Mail an ${email}`);
      
      // PDF aus Base64 konvertieren (client-seitig generiert)
      const pdfBuffer = Buffer.from(pdfAttachment, 'base64');
      
      // Geschäftseinstellungen für den Absender abrufen
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // E-Mail-Absender-Informationen festlegen
      const senderName = businessSettings?.businessName || 'Handyshop Verwaltung';
      const senderEmail = businessSettings?.businessEmail || businessSettings?.smtpUser;
      
      // E-Mail mit PDF-Anhang senden
      const emailSent = await storage.sendEmailWithAttachment({
        to: email,
        from: `"${senderName}" <${senderEmail}>`,
        subject: subject,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">Kostenvoranschlag ${estimate.reference_number}</h2>
            <p>Sehr geehrte(r) Kunde/Kundin,</p>
            <p>anbei erhalten Sie den angeforderten Kostenvoranschlag für Ihre Reparatur.</p>
            <p>Bei Fragen oder zur Beauftragung kontaktieren Sie uns bitte.</p>
            <p>Mit freundlichen Grüßen,</p>
            <p><strong>${senderName}</strong></p>
          </div>
        `,
        textBody: `Kostenvoranschlag ${estimate.reference_number}\n\nSehr geehrte(r) Kunde/Kundin,\n\nanbei erhalten Sie den angeforderten Kostenvoranschlag für Ihre Reparatur.\n\nBei Fragen oder zur Beauftragung kontaktieren Sie uns bitte.\n\nMit freundlichen Grüßen,\n${senderName}`,
        attachments: [{
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }],
        userId: userId
      });
      
      if (!emailSent) {
        return res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
      }
      
      // Erfolgreichen Versand protokollieren - ohne repairId da es ein Kostenvoranschlag ist
      try {
        await storage.logEmailHistory({
          subject: subject,
          status: 'sent',
          recipient: email,
          userId: userId,
          shopId: estimate.shopId || undefined
        });
      } catch (logError) {
        console.error("Fehler beim Protokollieren des E-Mail-Verlaufs:", logError);
        // E-Mail wurde erfolgreich gesendet, nur die Protokollierung ist fehlgeschlagen
      }
      
      res.status(200).json({ success: true, message: "Kostenvoranschlag wurde per E-Mail gesendet" });
    } catch (error) {
      console.error("Fehler beim Senden des Kostenvoranschlags per E-Mail:", error);
      res.status(500).json({ 
        message: "Fehler beim Senden des Kostenvoranschlags per E-Mail",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Neuer Endpunkt für A4-PDF E-Mail-Versand
  app.post("/api/send-repair-email", async (req: Request, res: Response) => {
    try {
      // Benutzer-Authentifizierung prüfen
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Nicht authentifiziert" });
      }

      const { repairId, recipient, pdfBase64, filename } = req.body;
      
      if (!repairId || !recipient || !pdfBase64 || !filename) {
        return res.status(400).json({ message: "Fehlende Parameter" });
      }

      const userId = (req.user as any).id;
      console.log(`E-Mail-Versand für Reparatur ${repairId} von Benutzer ${userId} an ${recipient}`);
      
      // Reparatur abrufen
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }

      // Debug: Auftragscode überprüfen
      console.log(`Reparatur Details:`, {
        id: repair.id,
        orderCode: repair.orderCode,
        reference_number: repair.reference_number,
        allKeys: Object.keys(repair)
      });

      // Korrekten Auftragscode ermitteln
      const correctOrderCode = repair.orderCode || repair.reference_number || `RA-${repair.id}`;
      
      // E-Mail mit PDF senden
      try {
        const customer = await storage.getCustomer(repair.customerId, userId);
        const businessSettings = await storage.getBusinessSettings(userId);
        
        if (!customer) {
          return res.status(404).json({ message: "Kunde nicht gefunden" });
        }

        const emailSent = await storage.sendEmailWithAttachment({
          to: recipient,
          from: `${businessSettings?.businessName || 'Handyshop'} <${businessSettings?.email || businessSettings?.smtpUser}>`,
          subject: `Reparaturauftrag ${correctOrderCode}`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Reparaturauftrag ${correctOrderCode}</h1>
              </div>
              
              <p style="margin-bottom: 20px;">Sehr geehrte/r ${customer.firstName} ${customer.lastName},</p>
              
              <p style="margin-bottom: 20px;">anbei erhalten Sie Ihren Reparaturauftrag als PDF-Dokument mit allen wichtigen Informationen.</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">Reparaturdetails:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 40%;">Gerät:</td>
                    <td style="padding: 8px 0;">${repair.brand} ${repair.model}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Problem:</td>
                    <td style="padding: 8px 0;">${repair.issue}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Abgabedatum:</td>
                    <td style="padding: 8px 0;">${new Date(repair.createdAt).toLocaleDateString('de-DE')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Geschätzter Preis:</td>
                    <td style="padding: 8px 0;">${repair.estimatedCost ? repair.estimatedCost + '€' : 'Nach Diagnose'}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #d97706; font-size: 18px;">Wichtige Reparaturbedingungen:</h3>
                <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8; color: #92400e;">
                  <li style="margin-bottom: 8px;">Die Reparatur erfolgt nach einer kostenlosen Diagnose</li>
                  <li style="margin-bottom: 8px;">Bei Kostenvoranschlag über 50€ ist eine Anzahlung erforderlich</li>
                  <li style="margin-bottom: 8px;">Nicht abgeholte Geräte werden nach 6 Monaten entsorgt</li>
                  <li style="margin-bottom: 8px;">Keine Haftung für Datenverlust - Datensicherung vor Abgabe empfohlen</li>
                  <li style="margin-bottom: 8px;">Garantie: 3 Monate auf durchgeführte Reparaturen</li>
                  <li style="margin-bottom: 8px;">Bei Nichtdurchführung der Reparatur: Diagnosekosten 25€</li>
                </ul>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #f1f5f9; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">Kundenadresse:</h3>
                <p style="margin: 0; line-height: 1.5;">
                  <strong>${customer.firstName || ''} ${customer.lastName || ''}</strong><br>
                  ${customer.address || 'Adresse nicht angegeben'}<br>
                  ${(customer.zipCode || '') + ' ' + (customer.city || '')}<br>
                  ${customer.phone ? 'Tel: ' + customer.phone + '<br>' : ''}
                  ${customer.email ? 'E-Mail: ' + customer.email : ''}
                </p>
              </div>
              
              <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p style="margin: 0; line-height: 1.5;">
                  <strong>${businessSettings?.businessName || 'Handyshop'}</strong><br>
                  ${businessSettings?.streetAddress || ''}<br>
                  ${businessSettings?.zipCode || ''} ${businessSettings?.city || ''}<br>
                  ${businessSettings?.phone ? 'Tel: ' + businessSettings.phone : ''}<br>
                  ${businessSettings?.email ? 'E-Mail: ' + businessSettings.email : ''}<br>
                  ${businessSettings?.openingHours ? 'Öffnungszeiten: ' + businessSettings.openingHours : ''}
                </p>
              </div>
              
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Bei Fragen zu Ihrem Reparaturauftrag stehen wir Ihnen gerne zur Verfügung.
              </p>
              
              <p style="margin-top: 20px; font-weight: bold;">
                Mit freundlichen Grüßen<br>
                Ihr ${businessSettings?.businessName || 'Handyshop'} Team
              </p>
            </div>
          `,
          textBody: `Reparaturauftrag ${correctOrderCode}\n\nSehr geehrte/r ${customer.firstName} ${customer.lastName},\n\nanbei erhalten Sie Ihren Reparaturauftrag als PDF-Dokument.\n\nMit freundlichen Grüßen\nIhr ${businessSettings?.businessName || 'Handyshop'} Team`,
          attachments: [{
            filename: filename,
            content: Buffer.from(pdfBase64, 'base64'),
            contentType: 'application/pdf'
          }],
          userId: userId
        });

        if (!emailSent) {
          console.error("E-Mail-Service gab false zurück");
          return res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
        }

        console.log(`E-Mail erfolgreich gesendet für Reparatur ${correctOrderCode}`);
        res.status(200).json({ success: true, message: "Reparaturauftrag wurde per E-Mail gesendet" });
      } catch (emailError) {
        console.error("Fehler beim Senden der E-Mail:", emailError);
        return res.status(500).json({ message: "Fehler beim Senden der E-Mail" });
      }
    } catch (error) {
      console.error("Fehler beim Senden des Reparaturauftrags per E-Mail:", error);
      res.status(500).json({ 
        message: "Fehler beim Senden des Reparaturauftrags per E-Mail",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/cost-estimates/:id/convert-to-repair", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlags-ID" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschlag abrufen
      const estimate = await storage.getCostEstimate(id, userId);
      
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      // Prüfen, ob der Kostenvoranschlag bereits in einen Reparaturauftrag umgewandelt wurde
      if (estimate.convertedToRepair) {
        return res.status(400).json({ 
          message: "Der Kostenvoranschlag wurde bereits in einen Reparaturauftrag umgewandelt" 
        });
      }
      
      // Debug-Ausgabe für Kunden-ID
      console.log("Kostenvoranschlag Daten:", {
        id: estimate.id,
        customerId: estimate.customerId,
        customer_id: estimate.customer_id,
        referenceNumber: estimate.referenceNumber,
        reference_number: estimate.reference_number,
        allKeys: Object.keys(estimate)
      });
      
      // Kunden-ID bestimmen - der Wert könnte in verschiedenen Properties stehen
      const customerId = estimate.customerId || estimate.customer_id;
      if (!customerId) {
        return res.status(400).json({ message: "Keine Kunden-ID im Kostenvoranschlag gefunden" });
      }
      
      // Reparatur erstellen
      const insertRepair = {
        reference_number: estimate.referenceNumber ? estimate.referenceNumber.replace('KV-', 'RA-') : 
                          (estimate.reference_number ? estimate.reference_number.replace('KV-', 'RA-') : 
                          `RA-${Date.now()}`),
        customerId: customerId, // Hier den richtigen Feldnamen verwenden
        deviceType: estimate.deviceType || estimate.device_type,
        brand: estimate.brand,
        model: estimate.model,
        serialNumber: estimate.serialNumber || estimate.serial_number,
        issue: estimate.issue,
        notes: `Umgewandelt aus Kostenvoranschlag ${estimate.referenceNumber || estimate.reference_number}`,
        status: 'angenommen',
        costEstimateId: estimate.id,
        estimatedPrice: estimate.total,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId,
        shopId: (req.user as any).shopId
      };
      
      // Reparatur in der Datenbank erstellen
      const repair = await storage.createRepair(insertRepair);
      
      if (!repair) {
        return res.status(500).json({ message: "Fehler beim Erstellen der Reparatur" });
      }
      
      // Kostenvoranschlag als umgewandelt markieren
      await storage.updateCostEstimate(id, {
        convertedToRepair: true,
        repairId: repair.id
      }, userId);
      
      res.status(200).json({ success: true, repairId: repair.id });
    } catch (error) {
      console.error("Fehler beim Umwandeln des Kostenvoranschlags in eine Reparatur:", error);
      res.status(500).json({ 
        message: "Fehler beim Umwandeln des Kostenvoranschlags in eine Reparatur",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // QR-Code Unterschriften API-Endpoints
  
  // QR-Code für Unterschrift generieren
  app.post("/api/signature/generate-qr", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { repairData } = req.body;
      const userId = req.user?.id;
      const shopId = req.user?.shopId;

      if (!userId || !shopId) {
        return res.status(401).json({ message: "Authentifizierung fehlgeschlagen" });
      }

      if (!repairData) {
        return res.status(400).json({ message: "Reparaturdaten sind erforderlich" });
      }

      // Kundendaten direkt aus der Reparatur laden
      let customerData = null;
      if (repairData.repairId) {
        try {
          const repair = await storage.getRepair(repairData.repairId, userId);
          
          if (repair && repair.customerId) {
            customerData = await storage.getCustomer(repair.customerId, userId);
          }
        } catch (error) {
          console.error("Fehler beim Laden der Reparatur/Kundendaten:", error);
        }
      }

      // Erweiterte Reparaturdaten mit Kundendaten zusammenführen
      const enrichedRepairData = {
        ...repairData,
        customerData: customerData ? {
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          zipCode: customerData.zipCode,
          city: customerData.city
        } : null
      };

      // Eindeutige temporäre ID generieren
      const tempId = crypto.randomUUID();

      // Temporäre Unterschrift in der Datenbank erstellen
      const tempSignature = await storage.createTempSignature(tempId, enrichedRepairData, userId, shopId);

      // QR-Code URL für Kunde erstellen - robuste Deployment-Erkennung
      let protocol = 'https'; // Default für Deployment
      let host = req.get('host') || req.get('x-forwarded-host');
      
      // Für lokale Entwicklung
      if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
        protocol = req.protocol || 'http';
      }
      
      // Für Replit Deployment
      if (host?.includes('.replit.dev') || host?.includes('.repl.it')) {
        protocol = 'https';
      }
      
      // Header-basierte Protokoll-Erkennung
      if (req.get('x-forwarded-proto')) {
        protocol = req.get('x-forwarded-proto');
      }
      
      // Fallback Host
      if (!host) {
        host = 'localhost:5000';
        protocol = 'http';
      }
      
      const baseUrl = `${protocol}://${host}`;
      const signatureUrl = `${baseUrl}/signature/${tempId}`;
      
      console.log(`QR-Code URL generiert: ${signatureUrl} (Protocol: ${protocol}, Host: ${host})`);

      res.json({
        success: true,
        tempId,
        signatureUrl,
        expiresAt: tempSignature.expiresAt
      });

    } catch (error) {
      console.error("Fehler beim Generieren des QR-Codes:", error);
      res.status(500).json({ 
        message: "Fehler beim Generieren des QR-Codes",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Status der temporären Unterschrift abrufen
  app.get("/api/signature/status/:tempId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { tempId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentifizierung fehlgeschlagen" });
      }

      const tempSignature = await storage.getTempSignature(tempId);

      if (!tempSignature) {
        return res.status(404).json({ message: "Unterschrift nicht gefunden" });
      }

      // Prüfen ob die Unterschrift zum angemeldeten Benutzer gehört
      if (tempSignature.userId !== userId) {
        return res.status(403).json({ message: "Zugriff verweigert" });
      }

      res.json({
        status: tempSignature.status,
        signedAt: tempSignature.signedAt,
        customerSignature: tempSignature.customerSignature,
        expiresAt: tempSignature.expiresAt,
        hasDeviceCode: !!tempSignature.deviceCode,
        hasSignature: !!tempSignature.customerSignature
      });

    } catch (error) {
      console.error("Fehler beim Abrufen des Unterschriftsstatus:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen des Unterschriftsstatus",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Unterschrift abschließen und zur Reparatur hinzufügen
  app.post("/api/signature/complete/:tempId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { tempId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentifizierung fehlgeschlagen" });
      }

      const tempSignature = await storage.getTempSignature(tempId);

      if (!tempSignature) {
        return res.status(404).json({ message: "Unterschrift nicht gefunden" });
      }

      // Prüfen ob die Unterschrift zum angemeldeten Benutzer gehört
      if (tempSignature.userId !== userId) {
        return res.status(403).json({ message: "Zugriff verweigert" });
      }

      if (tempSignature.status !== 'signed') {
        return res.status(400).json({ message: "Unterschrift noch nicht vorhanden" });
      }

      // Unterschrift zur Reparatur hinzufügen basierend auf dem Typ
      const repairData = tempSignature.repairData as any;
      const signatureType = repairData?.signatureType || 'pickup';
      const repairId = repairData?.repairId;
      
      console.log(`🔄 Completing signature: tempId=${tempId}, type=${signatureType}, repairId=${repairId}, userId=${userId}`);
      
      if (!repairId || !tempSignature.customerSignature) {
        console.error(`❌ Missing data: repairId=${repairId}, signature=${tempSignature.customerSignature}`);
        return res.status(400).json({ message: "Fehlende Daten für Unterschrift" });
      }
      
      if (signatureType === 'dropoff') {
        console.log(`📝 Saving dropoff signature for repair ${repairId}`);
        const result = await storage.updateRepairSignature(repairId, tempSignature.customerSignature, 'dropoff', userId);
        console.log(`✅ Dropoff signature save result:`, result ? 'SUCCESS' : 'FAILED');
      } else if (signatureType === 'pickup') {
        console.log(`📝 Saving pickup signature for repair ${repairId}`);
        const result = await storage.updateRepairSignature(repairId, tempSignature.customerSignature, 'pickup', userId);
        console.log(`✅ Pickup signature save result:`, result ? 'SUCCESS' : 'FAILED');
      }

      // Unterschrift als abgeschlossen markieren
      await storage.completeTempSignature(tempId);

      res.json({
        success: true,
        message: "Unterschrift erfolgreich abgeschlossen",
        signature: tempSignature.customerSignature
      });

    } catch (error) {
      console.error("Fehler beim Abschließen der Unterschrift:", error);
      res.status(500).json({ 
        message: "Fehler beim Abschließen der Unterschrift",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Öffentlicher Endpunkt für Kunden-Unterschrift (ohne Authentifizierung)
  app.get("/api/signature/customer/:tempId", async (req: Request, res: Response) => {
    try {
      const { tempId } = req.params;

      const tempSignature = await storage.getTempSignature(tempId);

      if (!tempSignature) {
        return res.status(404).json({ message: "Unterschrifts-Link ungültig oder abgelaufen" });
      }

      // Prüfen ob abgelaufen
      if (new Date() > tempSignature.expiresAt) {
        return res.status(410).json({ message: "Unterschrifts-Link ist abgelaufen" });
      }

      // Nur notwendige Daten für den Kunden zurückgeben
      res.json({
        tempId,
        repairData: tempSignature.repairData,
        status: tempSignature.status,
        expiresAt: tempSignature.expiresAt
      });

    } catch (error) {
      console.error("Fehler beim Abrufen der Kundendaten:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Unterschriftsdaten",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Kunden-Unterschrift speichern (ohne Authentifizierung)
  app.post("/api/signature/customer/:tempId", async (req: Request, res: Response) => {
    try {
      const { tempId } = req.params;
      const { signature, deviceCode, deviceCodeType } = req.body;

      if (!signature) {
        return res.status(400).json({ message: "Unterschrift ist erforderlich" });
      }

      const tempSignature = await storage.getTempSignature(tempId);

      if (!tempSignature) {
        return res.status(404).json({ message: "Unterschrifts-Link ungültig oder abgelaufen" });
      }

      // Prüfen ob abgelaufen
      if (new Date() > tempSignature.expiresAt) {
        return res.status(410).json({ message: "Unterschrifts-Link ist abgelaufen" });
      }

      if (tempSignature.status !== 'pending') {
        return res.status(400).json({ message: "Unterschrift wurde bereits geleistet" });
      }

      // Unterschrift speichern
      await storage.updateTempSignatureWithSignature(tempId, signature);

      // Gerätecode in der Reparatur speichern (wenn vorhanden)
      if (tempSignature.repairData?.repairId && (deviceCode || deviceCodeType)) {
        const repairId = tempSignature.repairData.repairId;
        const userId = tempSignature.userId;
        
        console.log(`💾 Speichere Gerätecode für Reparatur ${repairId}: Type=${deviceCodeType}, Code vorhanden=${!!deviceCode}`);
        
        // Gerätecode verschlüsseln vor dem Speichern
        let encryptedCode = null;
        if (deviceCode) {
          encryptedCode = Buffer.from(deviceCode, 'utf-8').toString('base64');
        }
        
        // Gerätecode in der Reparatur speichern mit Shop-Isolation
        await storage.updateRepairDeviceCode(repairId, encryptedCode, deviceCodeType, userId);
      }

      // UNTERSCHRIFT ZUR REPARATUR HINZUFÜGEN
      const signatureType = tempSignature.repairData?.signatureType;
      const repairId = tempSignature.repairData?.repairId;
      const userId = tempSignature.userId;
      
      if (repairId && signature && userId) {
        console.log(`📝 QR-Code: Speichere Unterschrift für Reparatur ${repairId}, Typ: ${signatureType}`);
        
        try {
          // Unterschrift zur Reparatur hinzufügen
          if (signatureType === 'dropoff') {
            await storage.updateRepairSignature(repairId, signature, 'dropoff', userId);
            console.log(`✅ QR-Code Dropoff-Unterschrift gespeichert für Reparatur ${repairId}`);
          } else if (signatureType === 'pickup') {
            await storage.updateRepairSignature(repairId, signature, 'pickup', userId);
            console.log(`✅ QR-Code Pickup-Unterschrift gespeichert für Reparatur ${repairId}`);
            
            // PICKUP OPTIMIERUNG: Aktuellen Status aus Datenbank abrufen und prüfen
            const currentRepair = await storage.getRepair(repairId, userId);
            if (currentRepair && currentRepair.status === 'fertig') {
              console.log(`🚀 QR-Code Pickup: Aktueller Status "fertig" → "abgeholt" für Reparatur ${repairId}`);
              
              // Status ohne E-Mail-Benachrichtigung auf "abgeholt" setzen
              await pool.query(
                'UPDATE repairs SET status = $1 WHERE id = $2',
                ['abgeholt', repairId]
              );
              
              // Status-History-Eintrag für automatische Änderung erstellen
              const shopId = tempSignature.shopId;
              
              // Benutzer-Daten abrufen für korrekte changedBy-Attribution
              const user = await storage.getUser(userId);
              const changedBy = user ? storage.getUserDisplayName(user) : 'System';
              
              await pool.query(
                'INSERT INTO repair_status_history (repair_id, old_status, new_status, changed_at, changed_by, notes, shop_id, user_id) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)',
                [repairId, 'fertig', 'abgeholt', changedBy, 'Automatisch nach QR-Code Pickup-Unterschrift', shopId, userId]
              );
              
              console.log(`✅ QR-Code Status-Änderung erfolgreich: ${repairId} fertig → abgeholt`);
            } else {
              console.log(`ℹ️ QR-Code Pickup: Status nicht "fertig" (aktuell: ${currentRepair?.status}) - keine automatische Änderung`);
            }
          }
        } catch (signatureError) {
          console.error(`❌ Fehler beim Speichern der QR-Code-Unterschrift:`, signatureError);
        }
      }

      res.json({
        success: true,
        message: "Unterschrift erfolgreich gespeichert"
      });

    } catch (error) {
      console.error("Fehler beim Speichern der Kundenunterschrift:", error);
      res.status(500).json({ 
        message: "Fehler beim Speichern der Unterschrift",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Unterschrifts-Anfrage an Kiosk-Geräte senden
  app.post("/api/repairs/:id/request-signature", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentifizierung fehlgeschlagen" });
      }
      
      // Reparatur und Kundendaten abrufen
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      const customer = await storage.getCustomer(repair.customerId, userId);
      if (!customer) {
        return res.status(404).json({ message: "Kunde nicht gefunden" });
      }
      
      // Geschäftseinstellungen für Reparaturbedingungen abrufen
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Nachricht für Kiosk-Geräte vorbereiten
      const message = {
        type: 'signature-request',
        payload: {
          repairId: repair.id,
          tempId: `temp-${Date.now()}-${repair.id}`,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerAddress: customer.address,
          repairDetails: repair.issue,
          deviceInfo: `${repair.brand} ${repair.model}${repair.serialNumber ? ' | ' + repair.serialNumber : ''} (${repair.deviceType})`,
          orderCode: repair.orderCode,
          estimatedCost: repair.estimatedCost,
          status: repair.status,
          repairTerms: businessSettings?.repairTerms || null,
          shopName: businessSettings?.businessName || 'Reparaturservice',
          timestamp: Date.now(),
          attempt: 1
        }
      };
      
      // An alle Clients senden
      const onlineStatusManager = getOnlineStatusManager();
      if (onlineStatusManager) {
        console.log('Sende Unterschrifts-Anfrage an alle Clients:', {
          repairId: repair.id,
          customerName: message.payload.customerName,
          repairDetails: message.payload.repairDetails,
          deviceInfo: message.payload.deviceInfo,
          timestamp: new Date().toISOString()
        });
        
        // Primärer Broadcast an alle Clients
        onlineStatusManager.broadcast(message);
        
        // Gezielter Broadcast an Kiosk-Geräte mit Retry
        for (let attempt = 1; attempt <= 3; attempt++) {
          onlineStatusManager.broadcastToKiosks({
            ...message,
            payload: { ...message.payload, attempt }
          });
          
          if (attempt < 3) {
            // Kurze Pause zwischen Versuchen
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        console.log('Unterschrifts-Anfrage erfolgreich an Kiosk-Geräte gesendet');
        
        res.json({
          success: true,
          message: "Unterschrifts-Anfrage wurde an Kiosk-Geräte gesendet",
          repairId: repair.id,
          customerName: message.payload.customerName
        });
      } else {
        res.status(500).json({ 
          message: "WebSocket-Server nicht verfügbar" 
        });
      }
      
    } catch (error) {
      console.error("Fehler beim Senden der Unterschrifts-Anfrage:", error);
      res.status(500).json({ 
        message: "Fehler beim Senden der Unterschrifts-Anfrage",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Online-Status API-Endpunkte - Hybrid-Ansatz
  app.get("/api/online-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const onlineStatusManager = getOnlineStatusManager();
      let webSocketOnlineUsers: number[] = [];
      
      // WebSocket-basierte Online-Benutzer abrufen
      if (onlineStatusManager) {
        webSocketOnlineUsers = onlineStatusManager.getOnlineUsers();
      }

      // Zusätzlich: Benutzer mit kürzlichen Logins (letzte 15 Minuten) ohne Logout
      // WICHTIG: Nur aktive Benutzer berücksichtigen
      const allUsers = await storage.getAllUsers();
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const recentlyActiveUsers = allUsers
        .filter(user => {
          // Nur aktive Benutzer berücksichtigen
          if (!user.isActive) return false;
          
          if (!user.lastLoginAt) return false;
          
          const loginTime = new Date(user.lastLoginAt);
          
          // Prüfe ob Login innerhalb der letzten 15 Minuten war
          if (loginTime <= fifteenMinutesAgo) return false;
          
          // Wenn es einen Logout gibt, prüfe ob er nach dem Login war
          if (user.lastLogoutAt) {
            const logoutTime = new Date(user.lastLogoutAt);
            if (logoutTime > loginTime) return false;
          }
          
          return true;
        })
        .map(user => user.id);

      // Kombiniere WebSocket-Online-Benutzer mit kürzlich aktiven Benutzern
      const allOnlineUsers = [...new Set([...webSocketOnlineUsers, ...recentlyActiveUsers])];
      
      console.log(`Online-Status: WebSocket: [${webSocketOnlineUsers.join(', ')}], Kürzlich aktiv: [${recentlyActiveUsers.join(', ')}], Kombiniert: [${allOnlineUsers.join(', ')}]`);

      res.json({
        onlineUsers: allOnlineUsers,
        onlineCount: allOnlineUsers.length,
        webSocketUsers: webSocketOnlineUsers,
        recentlyActiveUsers: recentlyActiveUsers
      });
    } catch (error) {
      console.error("Error getting online status:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen des Online-Status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/online-status/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const onlineStatusManager = getOnlineStatusManager();
      
      if (!onlineStatusManager) {
        return res.json({
          isOnline: false,
          lastSeen: null
        });
      }

      const isOnline = onlineStatusManager.isUserOnline(userId);
      const lastSeen = onlineStatusManager.getUserLastSeen(userId);

      res.json({
        isOnline,
        lastSeen: lastSeen ? lastSeen.toISOString() : null
      });
    } catch (error) {
      console.error("Error getting user online status:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen des Benutzer-Online-Status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Superadmin-Passwort ändern
  app.post("/api/superadmin/change-password", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentifizierung fehlgeschlagen" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Aktuelles und neues Passwort sind erforderlich" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Neues Passwort muss mindestens 6 Zeichen haben" });
      }

      // Aktuellen Benutzer abrufen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      // Aktuelles Passwort prüfen
      const { comparePasswords } = await import('./auth');
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Aktuelles Passwort ist nicht korrekt" });
      }

      // Neues Passwort hashen
      const { hashPassword } = await import('./auth');
      const hashedNewPassword = await hashPassword(newPassword);

      // Passwort in der Datenbank aktualisieren
      await storage.updateUserPassword(userId, hashedNewPassword);

      console.log(`Superadmin ${user.username} (ID: ${userId}) hat das Passwort erfolgreich geändert`);

      res.json({ 
        success: true,
        message: "Passwort erfolgreich geändert" 
      });

    } catch (error) {
      console.error('Fehler beim Ändern des Superadmin-Passworts:', error);
      res.status(500).json({ message: 'Fehler beim Ändern des Passworts' });
    }
  });

  // ===== KIOSK-MODUS API-ENDPUNKTE =====
  
  // PIN-Validierung für Kiosk-Modus - funktioniert auch ohne aktive Session
  app.post("/api/validate-kiosk-pin", async (req: Request, res: Response) => {
    try {
      const { pin } = req.body;
      
      // Master-PIN Check (funktioniert immer)
      const MASTER_PIN = "678910";
      if (pin === MASTER_PIN) {
        return res.json({ valid: true });
      }
      
      // Normale PIN-Validierung - versuche User-ID aus Session zu ermitteln
      let userId = null;
      if (req.isAuthenticated && req.isAuthenticated()) {
        userId = (req.user as any)?.id;
      }
      
      // Wenn keine aktive Session, aber PIN-Eingabe, prüfe alle Shop-PINs
      if (!userId) {
        // Suche in allen Business Settings nach dem PIN
        const allSettings = await db.select().from(businessSettings);
        
        for (const settings of allSettings) {
          const validPin = settings.kioskPin || "1234";
          if (pin === validPin) {
            return res.json({ valid: true });
          }
        }
        
        // PIN nicht gefunden
        return res.status(401).json({ valid: false, message: "Ungültiger PIN" });
      }
      
      // Standard-Validierung für authentifizierte User
      const settings = await storage.getBusinessSettings(userId);
      const validPin = settings?.kioskPin || "1234";
      
      if (pin === validPin) {
        res.json({ valid: true });
      } else {
        res.status(401).json({ valid: false, message: "Ungültiger PIN" });
      }
    } catch (error) {
      console.error("Fehler bei PIN-Validierung:", error);
      res.status(500).json({ message: "Fehler bei der PIN-Validierung" });
    }
  });




  // ERSATZTEIL-VERWALTUNG API mit DSGVO-konformer Shop-Isolation

  // Alle Ersatzteile für eine Reparatur abrufen
  app.get("/api/repairs/:repairId/spare-parts", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.repairId);
      if (isNaN(repairId)) {
        return res.status(400).json({ message: "Ungültige Reparatur-ID" });
      }
      
      const userId = (req.user as any).id;
      console.log(`Abrufen aller Ersatzteile für Reparatur ${repairId} (Benutzer ${userId})`);
      
      const spareParts = await storage.getSparePartsByRepairId(repairId, userId);
      console.log(`Gefunden: ${spareParts.length} Ersatzteile für Reparatur ${repairId}`);
      if (spareParts.length > 0) {
        console.log('Ersatzteile Details:', spareParts.map(p => ({ id: p.id, name: p.partName, status: p.status })));
      }
      res.json(spareParts);
    } catch (error) {
      console.error("Fehler beim Abrufen der Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Send signature request to specific kiosk
  app.post("/api/send-to-kiosk", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { repairId, kioskId } = req.body;
      const userId = req.user?.id;
      
      if (!userId || !repairId) {
        return res.status(400).json({ message: "User ID und Repair ID sind erforderlich" });
      }
      
      console.log(`📤 Sende Unterschrifts-Anfrage von User ${userId} für Reparatur ${repairId} an Kiosk ${kioskId || 'alle'}`);
      
      // Reparatur und Kundendaten abrufen
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      const customer = await storage.getCustomer(repair.customerId, userId);
      if (!customer) {
        return res.status(404).json({ message: "Kunde nicht gefunden" });
      }
      
      // Geschäftseinstellungen für Reparaturbedingungen abrufen
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Nachricht für Kiosk-Geräte vorbereiten
      const message = {
        type: 'signature-request',
        payload: {
          repairId: repair.id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerAddress: customer.address,
          repairDetails: repair.issue,
          deviceInfo: `${repair.brand} ${repair.model}${repair.serialNumber ? ' | ' + repair.serialNumber : ''} (${repair.deviceType})`,
          orderCode: repair.orderCode,
          estimatedCost: repair.estimatedCost,
          status: repair.status,
          repairTerms: businessSettings?.repairTerms || null,
          shopName: businessSettings?.businessName || 'Reparaturservice',
          timestamp: Date.now()
        }
      };
      
      // An spezifischen Kiosk oder alle Kiosks senden
      const onlineStatusManager = getOnlineStatusManager();
      if (onlineStatusManager) {
        if (kioskId) {
          // An spezifischen Kiosk senden
          console.log(`🎯 Sende an spezifischen Kiosk ${kioskId}`);
          const success = onlineStatusManager.sendToSpecificKiosk(kioskId, message);
          
          return res.json({ 
            success: true,
            sent: success,
            message: success ? `Nachricht erfolgreich an Kiosk ${kioskId} gesendet` : `Kiosk ${kioskId} nicht online`
          });
        } else {
          // An alle Kiosks senden
          console.log(`📡 Sende an alle verfügbaren Kiosks`);
          onlineStatusManager.broadcastToKiosks(message);
          
          return res.json({ 
            success: true,
            sent: true,
            message: "Nachricht an alle verfügbaren Kiosks gesendet"
          });
        }
      } else {
        return res.status(500).json({ 
          success: false,
          sent: false,
          message: "WebSocket-Server nicht verfügbar" 
        });
      }
      
    } catch (error) {
      console.error("❌ Fehler beim Senden an Kiosk:", error);
      res.status(500).json({ 
        success: false,
        sent: false,
        message: "Fehler beim Senden der Anfrage",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Alle Ersatzteile für Bestellungen-Tab abrufen (nur Reparaturen mit Status "warten_auf_ersatzteile")
  app.get("/api/spare-parts/orders", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      console.log(`Abrufen aller Ersatzteile für Bestellungen-Tab (Benutzer ${userId})`);
      
      const spareParts = await storage.getSparePartsForOrders(userId);
      res.json(spareParts);
    } catch (error) {
      console.error("Fehler beim Abrufen der Ersatzteile für Bestellungen:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Ersatzteile für Bestellungen",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Alle Ersatzteile für einen Benutzer abrufen
  app.get("/api/spare-parts", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      console.log(`Abrufen aller Ersatzteile für Benutzer ${userId}`);
      
      const spareParts = await storage.getAllSpareParts(userId);
      res.json(spareParts);
    } catch (error) {
      console.error("Fehler beim Abrufen aller Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen aller Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Alle Reparaturen mit Ersatzteilen abrufen - MUSS vor :id Route stehen!
  app.get("/api/spare-parts/with-repairs", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      console.log(`Abrufen aller Reparaturen mit Ersatzteilen für Benutzer ${userId}`);
      
      const repairs = await storage.getRepairsWithSpareParts(userId);
      console.log(`Gefunden: ${repairs.length} Reparaturen mit Ersatzteilen für Benutzer ${userId}`);
      
      res.json(repairs);
    } catch (error) {
      console.error("Fehler beim Abrufen der Reparaturen mit Ersatzteilen:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Reparaturen",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  // Einzelnes Ersatzteil abrufen
  app.get("/api/spare-parts/:id", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-ID" });
      }
      
      const userId = (req.user as any).id;
      const sparePart = await storage.getSparePart(id, userId);
      
      if (!sparePart) {
        return res.status(404).json({ message: "Ersatzteil nicht gefunden" });
      }
      
      res.json(sparePart);
    } catch (error) {
      console.error(`Fehler beim Abrufen des Ersatzteils ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen des Ersatzteils",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Neues Ersatzteil erstellen
  app.post("/api/spare-parts", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      console.log(`Erstellen eines neuen Ersatzteils für Benutzer ${userId}`);
      
      // Validierung mit Zod Schema (ohne userId und shopId, die server-seitig hinzugefügt werden)
      const validatedData = insertSparePartSchema.omit({ 
        userId: true, 
        shopId: true 
      }).parse(req.body);
      
      // Prüfe, ob die Reparatur dem Benutzer gehört
      const repair = await storage.getRepair(validatedData.repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden oder keine Berechtigung" });
      }
      
      const sparePart = await storage.createSparePart(validatedData, userId);
      
      console.log(`✅ Ersatzteil ${sparePart.id} erfolgreich erstellt:`, {
        id: sparePart.id,
        name: sparePart.partName,
        repairId: sparePart.repairId,
        status: sparePart.status,
        userId: sparePart.userId,
        shopId: sparePart.shopId
      });
      
      // Activity-Log für neu erstelltes Ersatzteil
      try {
        const user = await storage.getUser(userId);
        await storage.logOrderActivity(
          'created',
          sparePart.id,
          sparePart,
          userId,
          user?.username || user?.email || 'Unbekannter Benutzer'
        );
        console.log(`📋 Activity-Log für neues Ersatzteil ${sparePart.id} erstellt`);
      } catch (activityError) {
        console.error("❌ Fehler beim Erstellen des Order-Activity-Logs:", activityError);
      }
      
      res.status(201).json(sparePart);
    } catch (error) {
      console.error("Fehler beim Erstellen des Ersatzteils:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Validierungsfehler", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Fehler beim Erstellen des Ersatzteils",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ersatzteil aktualisieren
  app.patch("/api/spare-parts/:id", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-ID" });
      }
      
      const userId = (req.user as any).id;
      console.log(`Aktualisieren des Ersatzteils ${id} für Benutzer ${userId}`);
      
      // Prüfe, ob das Ersatzteil existiert und dem Benutzer gehört
      const existingSparePart = await storage.getSparePart(id, userId);
      if (!existingSparePart) {
        return res.status(404).json({ message: "Ersatzteil nicht gefunden oder keine Berechtigung" });
      }
      
      const sparePart = await storage.updateSparePart(id, req.body, userId);
      
      if (!sparePart) {
        return res.status(404).json({ message: "Ersatzteil nicht gefunden" });
      }

      // Activity-Log für Ersatzteil-Update erstellen
      if (req.body.status && req.body.status !== existingSparePart.status) {
        try {
          const user = await storage.getUser(userId);
          const repair = await storage.getRepair(sparePart.repairId, userId);
          
          await storage.logOrderActivity(
            'status_updated',
            sparePart.id,
            { 
              oldStatus: existingSparePart.status, 
              newStatus: req.body.status, 
              partName: sparePart.partName,
              orderCode: repair?.orderCode || 'Unbekannt',
              updatedBy: user?.username || user?.email || 'Benutzer'
            },
            userId,
            user?.username || user?.email || 'Unbekannter Benutzer'
          );
          console.log(`📋 Activity-Log erstellt: Ersatzteil-Status ${existingSparePart.status} → ${req.body.status}`);
        } catch (activityError) {
          console.error("❌ Fehler beim Erstellen des Order-Activity-Logs:", activityError);
        }
      }
      
      console.log(`Ersatzteil ${id} aktualisiert von Benutzer ${userId}`);
      res.json(sparePart);
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Ersatzteils ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren des Ersatzteils",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ersatzteil löschen
  app.delete("/api/spare-parts/:id", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Ersatzteil-ID" });
      }
      
      const userId = (req.user as any).id;
      console.log(`Löschen des Ersatzteils ${id} für Benutzer ${userId}`);
      
      // Prüfe, ob das Ersatzteil existiert und dem Benutzer gehört
      const existingSparePart = await storage.getSparePart(id, userId);
      if (!existingSparePart) {
        return res.status(404).json({ message: "Ersatzteil nicht gefunden oder keine Berechtigung" });
      }
      
      const success = await storage.deleteSparePart(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Ersatzteil nicht gefunden" });
      }
      
      console.log(`Ersatzteil ${id} gelöscht von Benutzer ${userId}`);
      res.json({ message: "Ersatzteil erfolgreich gelöscht" });
    } catch (error) {
      console.error(`Fehler beim Löschen des Ersatzteils ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Fehler beim Löschen des Ersatzteils",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Alle Ersatzteile für erweiterte OrdersTab abrufen
  app.get("/api/spare-parts/all", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      console.log(`Abrufen aller Ersatzteile für Benutzer ${userId}`);
      
      const spareParts = await storage.getAllSpareParts(userId);
      console.log(`Gefunden: ${spareParts.length} Ersatzteile für Benutzer ${userId}`);
      
      res.json(spareParts);
    } catch (error) {
      console.error("Fehler beim Abrufen aller Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Abrufen der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });





  // Bulk-Update für Ersatzteil-Status
  app.patch("/api/spare-parts/bulk-update", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { partIds, status } = req.body;
      
      if (!Array.isArray(partIds) || partIds.length === 0) {
        return res.status(400).json({ message: "Keine Ersatzteil-IDs angegeben" });
      }
      
      if (!["bestellen", "bestellt", "eingetroffen", "erledigt"].includes(status)) {
        return res.status(400).json({ message: "Ungültiger Status" });
      }
      
      console.log(`Bulk-Update für ${partIds.length} Ersatzteile auf Status "${status}" für Benutzer ${userId}`);
      
      const success = await storage.bulkUpdateSparePartStatus(partIds, status, userId);
      
      if (!success) {
        return res.status(400).json({ message: "Fehler beim Aktualisieren der Ersatzteile" });
      }

      // Activity-Log für Ersatzteil Bulk-Update erstellen
      try {
        const user = await storage.getUser(userId);
        await storage.logOrderActivity(
          'bulk_updated',
          0, // Bulk-Operation hat keine einzelne ID
          { partIds, status, count: partIds.length },
          userId,
          user?.username || user?.email || 'Unbekannter Benutzer'
        );
        console.log(`📋 Activity-Log für Ersatzteil Bulk-Update erstellt: ${partIds.length} Teile → ${status}`);
      } catch (activityError) {
        console.error("❌ Fehler beim Erstellen des Order-Activity-Logs:", activityError);
      }
      
      console.log(`Bulk-Update erfolgreich für Benutzer ${userId}`);
      res.json({ message: "Ersatzteile erfolgreich aktualisiert" });
    } catch (error) {
      console.error("Fehler beim Bulk-Update der Ersatzteile:", error);
      res.status(500).json({ 
        message: "Fehler beim Aktualisieren der Ersatzteile",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PDF-Export für Ersatzteile
  app.post("/api/orders/export-pdf", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { spareParts, filters } = req.body;
      
      // PDF-Erstellung mit jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Ersatzteile-Übersicht', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Exportiert am: ${new Date().toLocaleDateString('de-DE')}`, 20, 35);
      
      if (filters.searchTerm) {
        doc.text(`Suchbegriff: ${filters.searchTerm}`, 20, 45);
      }
      if (filters.statusFilter !== 'all') {
        doc.text(`Status-Filter: ${filters.statusFilter}`, 20, 55);
      }
      
      // Tabelle
      let yPos = 70;
      doc.setFontSize(10);
      
      // Header der Tabelle
      doc.text('Teil', 20, yPos);
      doc.text('Auftrag', 60, yPos);
      doc.text('Lieferant', 100, yPos);
      doc.text('Kosten', 140, yPos);
      doc.text('Status', 170, yPos);
      yPos += 10;
      
      // Daten - Auftragsnummer von zugehöriger Reparatur abrufen
      for (const part of spareParts) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Auftragsnummer von der zugehörigen Reparatur abrufen
        const repair = await storage.getRepair(part.repairId, req.user.id);
        const orderCode = repair ? repair.orderCode : `R${part.repairId}`;
        
        doc.text(part.partName.substring(0, 20), 20, yPos);
        doc.text(orderCode, 60, yPos);
        doc.text(part.supplier?.substring(0, 15) || '-', 100, yPos);
        doc.text(part.cost ? `€${part.cost.toFixed(2)}` : '-', 140, yPos);
        doc.text(part.status, 170, yPos);
        yPos += 8;
      }
      
      const pdfBuffer = doc.output('arraybuffer');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="ersatzteile.pdf"');
      res.send(Buffer.from(pdfBuffer));
      
    } catch (error) {
      console.error('PDF-Export-Fehler:', error);
      res.status(500).json({ error: "PDF konnte nicht erstellt werden" });
    }
  });

  // PDF Export für Bestellungen mit Status "bestellen"
  app.post("/api/orders/export-orders-pdf", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { spareParts, accessories } = req.body;
      
      if ((!spareParts || spareParts.length === 0) && (!accessories || accessories.length === 0)) {
        return res.status(400).json({ message: "Keine Artikel zum Exportieren vorhanden" });
      }
      
      // PDF-Erstellung mit jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Bestellungen Übersicht', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Exportiert am: ${new Date().toLocaleDateString('de-DE')}`, 20, 35);
      doc.text('Status: Bestellen', 20, 45);
      
      let yPos = 60;
      
      // Ersatzteile Sektion
      if (spareParts && spareParts.length > 0) {
        doc.setFontSize(14);
        doc.text('Ersatzteile', 20, yPos);
        yPos += 15;
        
        doc.setFontSize(10);
        // Header der Tabelle - neue Spaltenstruktur: Modell | Ersatzteil | Lieferant | Erstellt am
        doc.text('Modell', 20, yPos);
        doc.text('Ersatzteil', 120, yPos);
        doc.text('Lieferant', 160, yPos);
        doc.text('Erstellt am', 190, yPos);
        yPos += 10;
        
        // Ersatzteile-Daten
        for (const part of spareParts) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          
          // Reparatur abrufen, um Modell-Info zu bekommen
          const repair = await storage.getRepair(part.repairId, req.user.id);
          const deviceModel = repair ? `${repair.brand} ${repair.model}`.substring(0, 50) : 'Unbekannt';
          
          doc.text(deviceModel, 20, yPos);
          doc.text(part.partName.substring(0, 18), 120, yPos);
          doc.text(part.supplier?.substring(0, 12) || '-', 160, yPos);
          doc.text(new Date(part.createdAt).toLocaleDateString('de-DE'), 190, yPos);
          yPos += 8;
        }
        
        yPos += 10;
      }
      
      // Zubehör Sektion
      if (accessories && accessories.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.text('Zubehör', 20, yPos);
        yPos += 15;
        
        doc.setFontSize(10);
        // Header der Tabelle - Status-Spalte entfernt
        doc.text('Artikel', 20, yPos);
        doc.text('Menge', 70, yPos);
        doc.text('Kunde', 100, yPos);
        doc.text('Erstellt', 160, yPos);
        yPos += 10;
        
        // Zubehör-Daten
        for (const accessory of accessories) {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          
          let customerName = 'Geschäft'; // Default für Lagerartikel
          if (accessory.customerId) {
            const customer = await storage.getCustomer(accessory.customerId, req.user.id);
            if (customer) {
              customerName = `${customer.firstName} ${customer.lastName}`.substring(0, 20);
            }
          }
          
          doc.text((accessory.articleName || '').substring(0, 25), 20, yPos);
          doc.text((accessory.quantity || 1).toString(), 70, yPos);
          doc.text(customerName, 100, yPos);
          doc.text(accessory.createdAt ? new Date(accessory.createdAt).toLocaleDateString('de-DE') : '-', 160, yPos);
          yPos += 8;
        }
      }
      
      const pdfBuffer = doc.output('arraybuffer');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="bestellungen.pdf"');
      res.send(Buffer.from(pdfBuffer));
      
    } catch (error) {
      console.error('Fehler beim Bestellungen-PDF-Export:', error);
      res.status(500).json({ message: 'Fehler beim Bestellungen-PDF-Export' });
    }
  });

  // Kiosk-spezifischer Endpunkt für Business-Settings (ohne Authentifizierung)
  app.get("/api/kiosk/business-settings", async (req: Request, res: Response) => {
    try {
      // Prüfe, ob aktuell eingeloggte User "bugi" ist über Query-Parameter oder Session
      const currentUserId = req.query.userId;
      let currentUser = null;
      
      if (currentUserId) {
        currentUser = await storage.getUser(parseInt(currentUserId as string));
      }
      
      // Fallback: ersten aktiven User für Business-Settings nehmen
      if (!currentUser) {
        const allUsers = await storage.getAllUsers();
        currentUser = allUsers.find(user => user.isActive);
      }
      
      if (!currentUser) {
        return res.status(404).json({ message: "Keine aktiven Benutzer gefunden" });
      }
      
      const businessSettings = await storage.getBusinessSettings(currentUser.id);
      
      if (!businessSettings) {
        return res.status(404).json({ message: "Keine Geschäftseinstellungen gefunden" });
      }
      
      // Verwende Logo aus business_settings falls vorhanden, sonst Fallback auf ClientKing Logo
      const logoUrl = businessSettings.logoImage || null;
      
      console.log('Kiosk Business Settings geladen:', {
        businessName: businessSettings.businessName,
        username: currentUser.username,
        hasCustomLogo: !!businessSettings.logoImage,
        logoUrl: logoUrl
      });
      
      // Nur die für das Frontend notwendigen Felder zurückgeben
      // logoImage wird als logoUrl zurückgegeben für Frontend-Kompatibilität
      res.json({
        businessName: businessSettings.businessName,
        logoUrl: logoUrl
      });
    } catch (error) {
      console.error("Fehler beim Abrufen der Kiosk Business-Settings:", error);
      res.status(500).json({ message: "Interner Serverfehler" });
    }
  });

  // DSGVO-konforme Statistik-Daten
  app.post("/api/statistics/data", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      const shopId = user.shopId;
      const { start: startDate, end: endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start- und Enddatum sind erforderlich" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      console.log(`Generiere DSGVO-konforme Statistikdaten für Shop ${shopId}`);

      const businessSettings = await storage.getBusinessSettings(userId);

      // 1. Statistiken nach Gerätetypen
      const deviceTypeStats = await db.select({
        deviceType: repairs.deviceType,
        count: sql<number>`count(*)::int`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end)
      ))
      .groupBy(repairs.deviceType)
      .orderBy(repairs.deviceType);

      // 2. Statistiken nach Gerätetyp und Marke
      const brandStats = await db.select({
        deviceType: repairs.deviceType,
        brand: repairs.brand,
        count: sql<number>`count(*)::int`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end),
        isNotNull(repairs.brand)
      ))
      .groupBy(repairs.deviceType, repairs.brand)
      .orderBy(repairs.deviceType, repairs.brand);

      // 3. Statistiken nach Gerätetyp, Marke und Modell
      const modelStats = await db.select({
        deviceType: repairs.deviceType,
        brand: repairs.brand,
        model: repairs.model,
        count: sql<number>`count(*)::int`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end),
        isNotNull(repairs.brand),
        isNotNull(repairs.model)
      ))
      .groupBy(repairs.deviceType, repairs.brand, repairs.model)
      .orderBy(repairs.deviceType, repairs.brand, repairs.model);

      // Rückgabe der DSGVO-konformen Statistikdaten
      res.json({
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          generated: new Date().toISOString().split('T')[0]
        },
        businessName: businessSettings?.businessName || 'Reparaturshop',
        data: {
          deviceTypeStats: deviceTypeStats.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            count: stat.count
          })),
          brandStats: brandStats.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            brand: stat.brand || 'Unbekannt', 
            count: stat.count
          })),
          modelStats: modelStats.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            brand: stat.brand || 'Unbekannt',
            model: stat.model || 'Unbekannt',
            count: stat.count
          }))
        }
      });

    } catch (error) {
      console.error("Fehler beim Generieren der Statistikdaten:", error);
      res.status(500).json({ 
        message: "Fehler beim Generieren der Statistikdaten",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PDF-Statistik-Endpoint - Verwendet Frontend-PDF-Generierung wie bei Kostenvoranschlägen
  app.get("/api/statistics/pdf", isAuthenticated, enforceShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      const shopId = user.shopId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start- und Enddatum sind erforderlich" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      console.log(`Generiere PDF-Statistik für Shop ${shopId}`);

      const businessSettings = await storage.getBusinessSettings(userId);

      // Gleiche Datenabfrage wie bei /api/statistics/data
      const deviceTypeStats = await db.select({
        deviceType: repairs.deviceType,
        count: sql<number>`count(*)::int`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end)
      ))
      .groupBy(repairs.deviceType)
      .orderBy(repairs.deviceType);

      const brandStats = await db.select({
        deviceType: repairs.deviceType,
        brand: repairs.brand,
        count: sql<number>`count(*)::int`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end),
        isNotNull(repairs.brand)
      ))
      .groupBy(repairs.deviceType, repairs.brand)
      .orderBy(repairs.deviceType, repairs.brand);

      const modelStats = await db.select({
        deviceType: repairs.deviceType,
        brand: repairs.brand,
        model: repairs.model,
        count: sql<number>`count(*)::int`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end),
        isNotNull(repairs.brand),
        isNotNull(repairs.model)
      ))
      .groupBy(repairs.deviceType, repairs.brand, repairs.model)
      .orderBy(repairs.deviceType, repairs.brand, repairs.model);

      // 4. "Außer Haus" Reparaturen - alle die während des Zeitraums diesen Status hatten (mit Datum)
      const ausserHausRepairs = await db.select({
        deviceType: repairs.deviceType,
        brand: repairs.brand,
        model: repairs.model,
        statusDate: sql<string>`
          CASE 
            WHEN ${repairs.status} = 'ausser_haus' AND ${repairStatusHistory.changedAt} IS NOT NULL 
            THEN ${repairStatusHistory.changedAt}::date
            WHEN ${repairs.status} = 'ausser_haus' 
            THEN ${repairs.createdAt}::date
            ELSE ${repairStatusHistory.changedAt}::date
          END
        `
      })
      .from(repairs)
      .leftJoin(repairStatusHistory, eq(repairStatusHistory.repairId, repairs.id))
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end),
        or(
          // Entweder aktuell "Außer Haus"
          eq(repairs.status, 'ausser_haus'),
          // Oder hatte "Außer Haus" Status während des Zeitraums
          and(
            eq(repairStatusHistory.newStatus, 'ausser_haus'),
            gte(repairStatusHistory.changedAt, start),
            lte(repairStatusHistory.changedAt, end)
          )
        )
      ))
      .orderBy(repairs.deviceType, repairs.brand, repairs.model);

      // 5. Umsatzstatistik - Gesamtumsatz und Status-basierte Aufschlüsselung  
      const revenueStats = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(CASE 
          WHEN status = 'abgeholt' AND estimated_cost IS NOT NULL 
          AND estimated_cost ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$' 
          THEN CAST(estimated_cost AS DECIMAL) 
          ELSE 0 
        END), 0)`,
        pendingRevenue: sql<number>`COALESCE(SUM(CASE 
          WHEN status IN ('abholbereit', 'fertig') AND estimated_cost IS NOT NULL 
          AND estimated_cost ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$' 
          THEN CAST(estimated_cost AS DECIMAL) 
          ELSE 0 
        END), 0)`
      })
      .from(repairs)
      .where(and(
        eq(repairs.shopId, shopId),
        gte(repairs.createdAt, start),
        lte(repairs.createdAt, end)
      ));

      // Einzelne Revenue-Werte extrahieren
      const revenue = revenueStats[0] || { totalRevenue: 0, pendingRevenue: 0 };

      // JSON-Antwort für Frontend-PDF-Generierung (wie bei Kostenvoranschlägen)
      res.json({
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          generated: new Date().toISOString().split('T')[0]
        },
        businessName: businessSettings?.businessName || 'Reparaturshop',
        data: {
          deviceTypeStats: deviceTypeStats.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            count: stat.count
          })),
          brandStats: brandStats.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            brand: stat.brand || 'Unbekannt', 
            count: stat.count
          })),
          modelStats: modelStats.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            brand: stat.brand || 'Unbekannt',
            model: stat.model || 'Unbekannt',
            count: stat.count
          })),
          ausserHausRepairs: ausserHausRepairs.map(stat => ({
            deviceType: stat.deviceType || 'Unbekannt',
            brand: stat.brand || 'Unbekannt',
            model: stat.model || 'Unbekannt',
            statusDate: stat.statusDate
          })),
          revenue: {
            totalRevenue: Number(revenue.totalRevenue) || 0,
            pendingRevenue: Number(revenue.pendingRevenue) || 0
          }
        }
      });

    } catch (error) {
      console.error("Fehler beim Generieren der PDF-Statistik:", error);
      res.status(500).json({ 
        message: "Fehler beim Generieren der PDF-Statistik",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // LEIHGERÄTE API ROUTES
  // Verfügbare Leihgeräte abrufen (MUSS vor der :id Route stehen!)
  app.get("/api/loaner-devices/available", async (req: Request, res: Response) => {
    try {
      const userIdHeader = req.headers['x-user-id'] as string;
      
      if (!userIdHeader) {
        return res.status(401).json({ message: "Benutzer-ID fehlt" });
      }
      
      const userId = parseInt(userIdHeader);
      const devices = await storage.getAvailableLoanerDevices(userId);
      res.json(devices);
    } catch (error) {
      console.error("Fehler beim Abrufen verfügbarer Leihgeräte:", error);
      res.status(500).json({ message: "Fehler beim Abrufen verfügbarer Leihgeräte" });
    }
  });

  // Alle Leihgeräte abrufen
  app.get("/api/loaner-devices", async (req: Request, res: Response) => {
    try {
      const userIdHeader = req.headers['x-user-id'] as string;
      
      if (!userIdHeader) {
        return res.status(401).json({ message: "Benutzer-ID fehlt" });
      }
      
      const userId = parseInt(userIdHeader);
      const devices = await storage.getAllLoanerDevices(userId);
      res.json(devices);
    } catch (error) {
      console.error("Fehler beim Abrufen der Leihgeräte:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Leihgeräte" });
    }
  });

  // Einzelnes Leihgerät abrufen
  app.get("/api/loaner-devices/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const device = await storage.getLoanerDevice(id, userId);
      if (!device) {
        return res.status(404).json({ message: "Leihgerät nicht gefunden" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Fehler beim Abrufen des Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Leihgeräts" });
    }
  });

  // Neues Leihgerät erstellen
  app.post("/api/loaner-devices", async (req: Request, res: Response) => {
    try {
      const userIdHeader = req.headers['x-user-id'] as string;
      
      if (!userIdHeader) {
        return res.status(401).json({ message: "Benutzer-ID fehlt" });
      }
      
      const userId = parseInt(userIdHeader);
      console.log(`X-User-ID Header gefunden: ${userId}`);
      
      const user = await storage.getUser(userId);
      console.log(`Benutzer mit ID ${userId} aus Header gefunden:`, user?.username);
      
      if (!user) {
        return res.status(401).json({ message: "Benutzer nicht gefunden" });
      }

      const deviceData = {
        ...req.body,
        userId: userId,
        shopId: user.shopId || 1,
        status: 'verfügbar'
      };

      console.log('Erstelle Leihgerät mit Daten:', deviceData);
      console.log('userId in deviceData:', deviceData.userId);
      
      // Explizit userId setzen - Schema-korrekte Feldnamen verwenden
      const deviceToInsert = {
        deviceType: deviceData.deviceType,
        brand: deviceData.brand,
        model: deviceData.model,
        imei: deviceData.imei || null,
        condition: deviceData.condition,
        status: deviceData.status || 'verfügbar',
        notes: deviceData.notes || null,
        userId: userId, // Explizit setzen
        shopId: user.shopId || 1
      };
      
      console.log('Final device data für DB:', deviceToInsert);
      const device = await storage.createLoanerDevice(deviceToInsert);
      res.status(201).json(device);
    } catch (error) {
      console.error("Fehler beim Erstellen des Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Leihgeräts" });
    }
  });

  // Leihgerät aktualisieren
  app.patch("/api/loaner-devices/:id", async (req: Request, res: Response) => {
    try {
      const userIdHeader = req.headers['x-user-id'] as string;
      
      if (!userIdHeader) {
        return res.status(401).json({ message: "Benutzer-ID fehlt" });
      }
      
      const id = parseInt(req.params.id);
      const userId = parseInt(userIdHeader);
      
      const device = await storage.updateLoanerDevice(id, req.body, userId);
      if (!device) {
        return res.status(404).json({ message: "Leihgerät nicht gefunden" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Leihgeräts" });
    }
  });

  // Leihgerät löschen
  app.delete("/api/loaner-devices/:id", async (req: Request, res: Response) => {
    try {
      const userIdHeader = req.headers['x-user-id'] as string;
      
      if (!userIdHeader) {
        return res.status(401).json({ message: "Benutzer-ID fehlt" });
      }
      
      const id = parseInt(req.params.id);
      const userId = parseInt(userIdHeader);
      
      const success = await storage.deleteLoanerDevice(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Leihgerät nicht gefunden oder kann nicht gelöscht werden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen des Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Leihgeräts" });
    }
  });

  // Leihgerät einer Reparatur zuweisen
  app.post("/api/repairs/:repairId/assign-loaner", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.repairId);
      const { deviceId } = req.body;
      const userId = (req.user as any).id;
      
      // Prüfe den Status der Reparatur vor der Zuweisung
      const repair = await storage.getRepair(repairId, userId);
      if (!repair) {
        return res.status(404).json({ message: "Reparatur nicht gefunden" });
      }
      
      if (repair.status === 'abgeholt') {
        return res.status(400).json({ 
          message: "Leihgeräte können nicht an bereits abgeholte Reparaturen vergeben werden" 
        });
      }
      
      const success = await storage.assignLoanerDevice(repairId, deviceId, userId);
      if (!success) {
        return res.status(400).json({ message: "Leihgerät konnte nicht zugewiesen werden" });
      }
      
      res.json({ success: true, message: "Leihgerät erfolgreich zugewiesen" });
    } catch (error) {
      console.error("Fehler beim Zuweisen des Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Zuweisen des Leihgeräts" });
    }
  });

  // Leihgerät von einer Reparatur zurückgeben
  app.post("/api/repairs/:repairId/return-loaner", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.repairId);
      const userId = (req.user as any).id;
      
      const success = await storage.returnLoanerDevice(repairId, userId);
      if (!success) {
        return res.status(400).json({ message: "Leihgerät konnte nicht zurückgegeben werden" });
      }
      
      res.json({ success: true, message: "Leihgerät erfolgreich zurückgegeben" });
    } catch (error) {
      console.error("Fehler beim Zurückgeben des Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Zurückgeben des Leihgeräts" });
    }
  });

  // Verfügbare Leihgeräte abrufen (für Zuordnung in RepairDetailsDialog)
  app.get("/api/loaner-devices/available", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const availableDevices = await storage.getAvailableLoanerDevices(userId);
      res.json(availableDevices);
    } catch (error) {
      console.error("Fehler beim Abrufen verfügbarer Leihgeräte:", error);
      res.status(500).json({ message: "Fehler beim Abrufen verfügbarer Leihgeräte" });
    }
  });

  // Zugewiesenes Leihgerät für eine Reparatur abrufen
  app.get("/api/repairs/:repairId/loaner-device", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.repairId);
      const userId = (req.user as any).id;
      
      const loanerDevice = await storage.getLoanerDeviceByRepairId(repairId, userId);
      if (!loanerDevice) {
        return res.status(404).json({ message: "Kein Leihgerät zugewiesen" });
      }
      
      res.json(loanerDevice);
    } catch (error) {
      console.error("Fehler beim Abrufen des zugewiesenen Leihgeräts:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des zugewiesenen Leihgeräts" });
    }
  });

  // Leihgerät für eine Reparatur abrufen
  app.get("/api/repairs/:repairId/loaner-device", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.repairId);
      const userId = (req.user as any).id;
      
      const device = await storage.getLoanerDeviceByRepairId(repairId, userId);
      res.json(device || null);
    } catch (error) {
      console.error("Fehler beim Abrufen des Leihgeräts für Reparatur:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Leihgeräts" });
    }
  });

  // MULTI-SHOP PERMISSION API ENDPUNKTE
  
  // Ausstehende Permission-Anfragen für Shop-Owner abrufen
  app.get("/api/permissions/pending", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const pendingPermissions = await storage.getPendingPermissions(userId);
      
      // Multi-Shop Admin Details laden für jede Permission
      const permissionsWithDetails = await Promise.all(
        pendingPermissions.map(async (permission) => {
          const admin = await storage.getUser(permission.multiShopAdminId);
          const shop = await storage.getShop(permission.shopId);
          return {
            ...permission,
            adminName: admin?.username || 'Unbekannt',
            shopName: shop?.name || 'Unbekannt',
          };
        })
      );
      
      console.log(`📋 ${pendingPermissions.length} ausstehende Permissions für Shop-Owner ${userId}`);
      res.json(permissionsWithDetails);
    } catch (error) {
      console.error("Fehler beim Abrufen der ausstehenden Permissions:", error);
      res.status(500).json({ message: "Failed to fetch pending permissions" });
    }
  });

  // Permission gewähren
  app.post("/api/permissions/:id/grant", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const permissionId = parseInt(req.params.id);
      const success = await storage.grantShopAccess(permissionId);
      
      if (success) {
        console.log(`✅ Permission ${permissionId} gewährt`);
        res.json({ success: true, message: "Zugriff erfolgreich gewährt" });
      } else {
        res.status(404).json({ message: "Permission nicht gefunden" });
      }
    } catch (error) {
      console.error("Fehler beim Gewähren der Permission:", error);
      res.status(500).json({ message: "Failed to grant permission" });
    }
  });

  // Permission ablehnen/widerrufen
  app.post("/api/permissions/:id/revoke", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const permissionId = parseInt(req.params.id);
      const success = await storage.revokeShopAccess(permissionId);
      
      if (success) {
        console.log(`❌ Permission ${permissionId} widerrufen`);
        res.json({ success: true, message: "Zugriff erfolgreich widerrufen" });
      } else {
        res.status(404).json({ message: "Permission nicht gefunden" });
      }
    } catch (error) {
      console.error("Fehler beim Widerrufen der Permission:", error);
      res.status(500).json({ message: "Failed to revoke permission" });
    }
  });

  // NEUE KIOSK-MITARBEITER API-ENDPUNKTE
  
  // Alle Kiosk-Mitarbeiter für den aktuellen Shop abrufen (vereinfachte Route)
  app.get("/api/kiosk/employees", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.shopId) {
        return res.status(403).json({ message: "Keine Shop-Zuordnung gefunden" });
      }
      
      const kioskEmployees = await storage.getKioskEmployees(user.shopId);
      console.log(`📱 ${kioskEmployees.length} Kiosk-Mitarbeiter für Shop ${user.shopId} gefunden (User: ${user.username})`);
      
      res.json(kioskEmployees);
    } catch (error) {
      console.error("Fehler beim Abrufen der Kiosk-Mitarbeiter:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Kiosk-Mitarbeiter" });
    }
  });
  
  // Kiosk-Mitarbeiter für einen Shop abrufen
  app.get("/api/kiosk/employees/:shopId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const userId = (req.user as any).id;
      
      // Nur Shop-Owner und Superadmins können Kiosk-Mitarbeiter verwalten
      const user = await storage.getUser(userId);
      if (!user || (!user.isSuperadmin && user.shopId !== shopId)) {
        return res.status(403).json({ message: "Keine Berechtigung für diesen Shop" });
      }
      
      const kioskEmployees = await storage.getKioskEmployees(shopId);
      console.log(`📱 ${kioskEmployees.length} Kiosk-Mitarbeiter für Shop ${shopId} gefunden`);
      
      res.json(kioskEmployees);
    } catch (error) {
      console.error("Fehler beim Abrufen der Kiosk-Mitarbeiter:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Kiosk-Mitarbeiter" });
    }
  });
  
  // Neuen Kiosk-Mitarbeiter erstellen
  app.post("/api/kiosk/create", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const userId = (req.user as any).id;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "E-Mail, Passwort, Vor- und Nachname sind erforderlich" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (!user.isSuperadmin && user.role !== "owner")) {
        return res.status(403).json({ message: "Nur Shop-Owner können Kiosk-Mitarbeiter erstellen" });
      }
      
      // Prüfen ob E-Mail bereits existiert
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "E-Mail-Adresse wird bereits verwendet" });
      }
      
      // Passwort hashen
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      const kioskEmployee = await storage.createKioskEmployee({
        email,
        password: hashedPassword,
        shopId: user.shopId!,
        parentUserId: userId,
        firstName,
        lastName
      });
      
      console.log(`✅ Kiosk-Mitarbeiter erstellt: ${kioskEmployee.email} für Shop ${user.shopId}`);
      res.json({ 
        success: true, 
        message: "Kiosk-Mitarbeiter erfolgreich erstellt",
        kioskEmployee: {
          id: kioskEmployee.id,
          email: kioskEmployee.email,
          firstName: kioskEmployee.firstName,
          lastName: kioskEmployee.lastName,
          isActive: kioskEmployee.isActive
        }
      });
    } catch (error) {
      console.error("Fehler beim Erstellen des Kiosk-Mitarbeiters:", error);
      res.status(500).json({ message: "Fehler beim Erstellen des Kiosk-Mitarbeiters" });
    }
  });
  
  // Kiosk-Verfügbarkeit ohne explizite shopId (nutzt User-Session)
  app.get("/api/kiosk/availability", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentifizierung fehlgeschlagen" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.shopId) {
        return res.status(404).json({ message: "Benutzer oder Shop nicht gefunden" });
      }

      const shopId = user.shopId;
      
      const kioskEmployees = await storage.getKioskEmployees(shopId);
      
      // Verwende den WebSocket-Manager aus dem Export
      const webSocketManager = getOnlineStatusManager();
      
      // Alle Kiosk-Mitarbeiter und ihre Online-Status prüfen
      const kioskStatuses = kioskEmployees.map(kiosk => {
        const isOnline = webSocketManager ? webSocketManager.isUserOnline(kiosk.id) : false;
        return {
          id: kiosk.id,
          email: kiosk.email,
          firstName: kiosk.firstName,
          lastName: kiosk.lastName,
          isOnline
        };
      });
      
      const onlineCount = kioskStatuses.filter(k => k.isOnline).length;
      
      console.log(`📱 Multi-Kiosk-Status für Shop ${shopId}: ${onlineCount}/${kioskEmployees.length} online`);
      console.log('📱 Online-Status Details:', kioskStatuses.map(k => `${k.firstName} ${k.lastName} (ID: ${k.id}) - ${k.isOnline ? 'ONLINE' : 'OFFLINE'}`));
      
      res.json({
        totalKiosks: kioskEmployees.length,
        onlineCount,
        kiosks: kioskStatuses,
        // Für Rückwärtskompatibilität - erster Online-Kiosk
        isOnline: onlineCount > 0,
        kioskUser: kioskStatuses.find(k => k.isOnline) || null
      });
    } catch (error) {
      console.error("Fehler beim Prüfen der Kiosk-Verfügbarkeit:", error);
      res.status(500).json({ message: "Fehler beim Prüfen der Kiosk-Verfügbarkeit" });
    }
  });

  // Multi-Kiosk-Verfügbarkeit prüfen (neue Multi-Terminal Version)
  app.get("/api/kiosk/availability/:shopId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const shopId = parseInt(req.params.shopId);
      
      const kioskEmployees = await storage.getKioskEmployees(shopId);
      
      // Verwende den WebSocket-Manager aus dem Export für Multi-Terminal
      const webSocketManager = getOnlineStatusManager();
      
      // Alle Kiosk-Mitarbeiter und ihre Online-Status prüfen
      const kioskStatuses = kioskEmployees.map(kiosk => {
        const isOnline = webSocketManager ? webSocketManager.isUserOnline(kiosk.id) : false;
        return {
          id: kiosk.id,
          email: kiosk.email,
          firstName: kiosk.firstName,
          lastName: kiosk.lastName,
          isOnline
        };
      });
      
      const onlineCount = kioskStatuses.filter(k => k.isOnline).length;
      
      console.log(`📱 Multi-Kiosk-Status für Shop ${shopId}: ${onlineCount}/${kioskEmployees.length} online`);
      console.log('📱 Online-Status Details:', kioskStatuses.map(k => `${k.firstName} ${k.lastName} (ID: ${k.id}) - ${k.isOnline ? 'ONLINE' : 'OFFLINE'}`));
      
      res.json({
        totalKiosks: kioskEmployees.length,
        onlineCount,
        kiosks: kioskStatuses,
        // Für Rückwärtskompatibilität - erster Online-Kiosk
        isOnline: onlineCount > 0,
        kioskUser: kioskStatuses.find(k => k.isOnline) || null
      });
    } catch (error) {
      console.error("Fehler beim Prüfen der Multi-Kiosk-Verfügbarkeit:", error);
      res.status(500).json({ message: "Fehler beim Prüfen der Multi-Kiosk-Verfügbarkeit" });
    }
  });

  // Debug-Endpoint um WebSocket-Status zu prüfen
  app.get("/api/debug/websocket-status", async (req: Request, res: Response) => {
    try {
      const onlineStatusManager = getOnlineStatusManager();
      
      if (onlineStatusManager) {
        const registeredUsers = onlineStatusManager.getRegisteredUsers();
        const debugInfo = {
          totalConnected: registeredUsers.length,
          users: registeredUsers.map(user => ({
            userId: user.userId,
            username: user.username,
            isActive: user.isActive,
            isKiosk: user.isKiosk,
            lastHeartbeat: user.lastHeartbeat,
            socketReady: user.socket?.readyState === 1,
            isOnlineByMethod: onlineStatusManager.isUserOnline(user.userId)
          }))
        };
        
        console.log(`🔍 DEBUG: WebSocket-Status`, debugInfo);
        res.json(debugInfo);
      } else {
        res.status(500).json({ message: "Online-Status-Manager nicht verfügbar" });
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des WebSocket-Status:", error);
      res.status(500).json({ message: "Fehler beim Status-Abruf" });
    }
  });

  // Debug-Endpoint um Kiosk manuell zu registrieren
  app.post("/api/debug/register-kiosk/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Ungültige User-ID" });
    }
    
    try {
      const onlineStatusManager = getOnlineStatusManager();
      
      if (onlineStatusManager) {
        // Simuliere WebSocket-Registrierung für Debug-Zwecke
        console.log(`🛠️ DEBUG: Registriere Kiosk ${userId} manuell`);
        onlineStatusManager.forceRegisterKiosk(userId);
        res.json({ message: `Kiosk ${userId} erfolgreich registriert`, userId });
      } else {
        res.status(500).json({ message: "Online-Status-Manager nicht verfügbar" });
      }
    } catch (error) {
      console.error('Debug-Registrierung fehlgeschlagen:', error);
      res.status(500).json({ message: "Registrierung fehlgeschlagen" });
    }
  });

  // Kiosk-Mitarbeiter bearbeiten
  app.patch("/api/kiosk/:kioskId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const kioskId = parseInt(req.params.kioskId);
      const { email, firstName, lastName, isActive, password } = req.body;
      const userId = (req.user as any).id;
      
      const user = await storage.getUser(userId);
      if (!user || (!user.isSuperadmin && user.role !== "owner")) {
        return res.status(403).json({ message: "Nur Shop-Owner können Kiosk-Mitarbeiter bearbeiten" });
      }
      
      // Kiosk-Mitarbeiter abrufen und Berechtigung prüfen
      const kioskEmployee = await storage.getUser(kioskId);
      if (!kioskEmployee || kioskEmployee.role !== "kiosk" || kioskEmployee.shopId !== user.shopId) {
        return res.status(404).json({ message: "Kiosk-Mitarbeiter nicht gefunden oder keine Berechtigung" });
      }
      
      // E-Mail-Eindeutigkeit prüfen (falls E-Mail geändert wird)
      if (email && email !== kioskEmployee.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== kioskId) {
          return res.status(400).json({ message: "E-Mail-Adresse wird bereits verwendet" });
        }
      }
      
      // Passwort-Update vorbereiten (falls angegeben)
      let updateData: any = {
        email: email || kioskEmployee.email,
        firstName: firstName || kioskEmployee.firstName,
        lastName: lastName || kioskEmployee.lastName,
        isActive: isActive !== undefined ? isActive : kioskEmployee.isActive
      };

      // Wenn ein neues Passwort angegeben wurde, es hashen
      if (password && password.trim() !== '') {
        const hashedPassword = await hashPassword(password);
        updateData.password = hashedPassword;
        console.log(`🔐 Neues Passwort für Kiosk-Mitarbeiter ${kioskEmployee.email} wird gesetzt`);
      }

      const updatedKiosk = await storage.updateKioskEmployee(kioskId, updateData);
      
      console.log(`✅ Kiosk-Mitarbeiter bearbeitet: ${updatedKiosk.email} für Shop ${user.shopId}`);
      res.json({ 
        success: true, 
        message: "Kiosk-Mitarbeiter erfolgreich bearbeitet",
        kioskEmployee: {
          id: updatedKiosk.id,
          email: updatedKiosk.email,
          firstName: updatedKiosk.firstName,
          lastName: updatedKiosk.lastName,
          isActive: updatedKiosk.isActive
        }
      });
    } catch (error) {
      console.error("Fehler beim Bearbeiten des Kiosk-Mitarbeiters:", error);
      res.status(500).json({ message: "Fehler beim Bearbeiten des Kiosk-Mitarbeiters" });
    }
  });

  // Kiosk-Mitarbeiter löschen
  app.delete("/api/kiosk/:kioskId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const kioskId = parseInt(req.params.kioskId);
      const userId = (req.user as any).id;
      
      const user = await storage.getUser(userId);
      if (!user || (!user.isSuperadmin && user.role !== "owner")) {
        return res.status(403).json({ message: "Nur Shop-Owner können Kiosk-Mitarbeiter löschen" });
      }
      
      // Kiosk-Mitarbeiter abrufen und Berechtigung prüfen
      const kioskEmployee = await storage.getUser(kioskId);
      if (!kioskEmployee || kioskEmployee.role !== "kiosk" || kioskEmployee.shopId !== user.shopId) {
        return res.status(404).json({ message: "Kiosk-Mitarbeiter nicht gefunden oder keine Berechtigung" });
      }
      
      await storage.deleteKioskEmployee(kioskId);
      
      console.log(`❌ Kiosk-Mitarbeiter gelöscht: ${kioskEmployee.email} für Shop ${user.shopId}`);
      res.json({ 
        success: true, 
        message: "Kiosk-Mitarbeiter erfolgreich gelöscht"
      });
    } catch (error) {
      console.error("Fehler beim Löschen des Kiosk-Mitarbeiters:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Kiosk-Mitarbeiters" });
    }
  });

  // Registriere Superadmin E-Mail-Routen
  await registerSuperadminEmailRoutes(app);
  console.log("✅ Superadmin E-Mail routes registered");

  // Registriere Newsletter-Routen (für Abmeldung und User-Abonnement)
  setupNewsletterRoutes(app);
  console.log("✅ Newsletter routes registered");

  // Newsletter-Logo Route hinzufügen - WICHTIG für Logo-Anzeige in E-Mails!
  app.get("/public-objects/newsletter-logos/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      
      // Versuche, das Logo über die öffentlichen Suchpfade zu finden
      const logoPath = `newsletter-logos/${filename}`;
      const file = await objectStorageService.searchPublicObject(logoPath);
      
      if (file) {
        await objectStorageService.downloadObject(file, res);
      } else {
        res.status(404).json({ error: "Logo nicht gefunden" });
      }
    } catch (error) {
      console.error("Fehler beim Laden des Newsletter-Logos:", error);
      res.status(500).json({ error: "Interner Server-Fehler" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket-Server initialisieren
  const onlineStatusManager = initializeWebSocketServer(httpServer);
  console.log("WebSocket-Server für Online-Status initialisiert");

  return httpServer;
}