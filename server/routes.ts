import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Import der Berechtigungsprüfung aus permissions.ts
import { isProfessionalOrHigher, isEnterprise, hasAccess, hasAccessAsync } from './permissions';
import { 
  insertCustomerSchema, 
  insertRepairSchema,
  insertBusinessSettingsSchema,
  insertFeedbackSchema,
  insertUserDeviceTypeSchema,
  insertUserBrandSchema,
  insertUserModelSchema,
  insertCostEstimateSchema,
  costEstimateItemSchema,
  repairStatuses,
  deviceTypes,
  type InsertEmailTemplate,
  customers,
  users
} from "@shared/schema";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

/**
 * Middleware zum Prüfen der Authentifizierung
 * Wird für alle API-Routen verwendet, die eine Anmeldung erfordern
 */
async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    // X-User-ID Header prüfen (für Tests und Entwicklung)
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      const userId = parseInt(userIdHeader as string, 10);
      const user = await storage.getUser(userId);
      
      if (user) {
        console.log(`Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
        // @ts-ignore
        req.user = user;
        return next();
      }
    }
  } catch (error) {
    console.error('Fehler beim Verarbeiten der X-User-ID:', error);
  }
  
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Nicht authentifiziert" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Benutzer nicht gefunden" });
  }
  
  if (!user.isActive) {
    return res.status(403).json({ message: "Benutzer ist deaktiviert" });
  }
  
  // @ts-ignore
  req.user = user;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Status der Benutzerauthentifizierung
  app.get("/api/user", async (req, res) => {
    try {
      // X-User-ID Header prüfen (für Tests und Entwicklung)
      const userIdHeader = req.headers['x-user-id'];
      if (userIdHeader) {
        const userId = parseInt(userIdHeader as string, 10);
        const user = await storage.getUser(userId);
        
        if (user) {
          console.log(`Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
          return res.status(200).json(user);
        }
      }
    } catch (error) {
      console.error('Token authentication error:', error);
      return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
    }
    
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Nicht authentifiziert" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Benutzer nicht gefunden" });
    }
    
    res.status(200).json(user);
  });

  // Status-Änderungen für Reparaturen
  app.patch("/api/repairs/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { status, sendEmail } = req.body;
    
    // @ts-ignore
    const userId = req.user.id;
    
    // Prüfen, ob der Status gültig ist
    if (!Object.values(repairStatuses.enum).includes(status)) {
      return res.status(400).json({ error: "Ungültiger Status" });
    }
    
    try {
      const repair = await storage.getRepair(id, userId);
      if (!repair) {
        return res.status(404).json({ error: "Reparatur nicht gefunden" });
      }
      
      const statusChanged = await storage.updateRepairStatus(id, status, userId);
      if (!statusChanged) {
        return res.status(400).json({ error: "Status konnte nicht aktualisiert werden" });
      }
      
      // Status-Historie aktualisieren
      if (typeof storage.addStatusHistoryEntry === 'function') {
        await storage.addStatusHistoryEntry(id, status, userId);
      }
      
      // Wenn die Reparatur mit einem Kunden verknüpft ist und eine E-Mail gesendet werden soll,
      // dann die Kundendaten abrufen für die E-Mail-Benachrichtigung
      const customer = repair.customerId 
        ? await storage.getCustomer(repair.customerId, userId) 
        : null;
      
      // Geschäftseinstellungen für die E-Mail-Vorlage abrufen
      const businessSettings = await storage.getBusinessSettings(userId);
      
      if (customer) {
        // Variablen für die Kommunikation zusammenstellen
        const variables: Record<string, string> = {
          "kundenname": `${customer.firstName} ${customer.lastName}`,
          "geraet": repair.model || "",
          "hersteller": repair.brand || "",
          "auftragsnummer": repair.orderCode || `#${repair.id}`,
          "fehler": repair.issue || "",
          "kostenvoranschlag": repair.estimatedCost?.toString() || "Nicht angegeben",
          "geschaeftsname": businessSettings?.businessName || "Handyshop",
          "abholzeit": "ab sofort", // kann später angepasst werden
          // Wichtig: userId und repairId für die Datenisolierung und E-Mail-Verlauf hinzufügen
          "userId": userId.toString(),
          "repairId": repair.id.toString()
        };
        
        // Automatischer E-Mail-Versand wurde entfernt
        // E-Mails werden jetzt über den Dialog im Frontend nach Status-Änderung versendet
        if (sendEmail === true) {
          console.log("Status wurde aktualisiert. E-Mail-Versand erfolgt über Frontend-Dialog.");
        }
      } else {
        console.log("Kunde nicht gefunden, keine Benachrichtigung möglich");
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Status erfolgreich aktualisiert" 
      });
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      res.status(500).json({ error: "Interner Serverfehler" });
    }
  });

  // Senden einer E-Mail
  app.post("/api/send-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { templateId, to, variables } = req.body;
      
      if (!templateId || !to) {
        return res.status(400).json({ error: "Template ID und Empfänger sind erforderlich" });
      }
      
      // @ts-ignore
      const userId = req.user.id;
      
      // Variables erweitern um die userId
      const variablesWithUserId = { 
        ...variables, 
        userId: userId.toString() 
      };
      
      const success = await storage.sendEmailWithTemplate(templateId, to, variablesWithUserId);
      
      if (!success) {
        return res.status(500).json({ error: "E-Mail konnte nicht gesendet werden" });
      }
      
      return res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Abrufen von E-Mail-Vorlagen für Status-Änderungen
  app.get("/api/email-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const type = req.query.type as string | undefined;
      
      // Optionale Filterung nach Typ
      const templates = await storage.getAllEmailTemplates(userId, type);
      
      res.status(200).json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}