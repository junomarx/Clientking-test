import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCustomerSchema, 
  insertRepairSchema,
  insertBusinessSettingsSchema,
  insertFeedbackSchema,
  insertSmsTemplateSchema,
  repairStatuses,
  deviceTypes,
  customers,
  repairs,
  feedbacks,
  smsTemplates
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { registerAdminRoutes } from "./admin-routes";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Middleware to check if user is authenticated
async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Standardauthentifizierung über Session
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Alternativ über Token-Authentifizierung
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
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Benutzer nicht gefunden" });
      }
      
      if (!user.isActive && !user.isAdmin) {
        return res.status(401).json({ message: "Konto ist nicht aktiviert" });
      }
      
      // Benutzer in Request setzen
      req.user = user;
      return next();
    } catch (error) {
      console.error('Token authentication error:', error);
      return res.status(401).json({ message: "Fehler bei der Token-Authentifizierung" });
    }
  }
  
  res.status(401).json({ message: "Nicht angemeldet" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Set up admin routes
  registerAdminRoutes(app);
  
  // CUSTOMERS API
  app.get("/api/customers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("GET /api/customers: Auth status:", req.isAuthenticated(), "User:", req.user?.username);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Wenn firstName und lastName als Query-Parameter übergeben werden, suche nach Kunden mit diesem Namen
      if (req.query.firstName && req.query.lastName) {
        console.log(`Searching for customers with name: ${req.query.firstName} ${req.query.lastName}`);
        const firstName = req.query.firstName as string;
        const lastName = req.query.lastName as string;
        
        // Wenn einer der Parameter zu kurz ist, gebe eine leere Liste zurück
        if (firstName.length < 1 || lastName.length < 1) {
          return res.json([]);
        }
        
        // Alle Kunden abrufen und sowohl nach Vor- als auch Nachnamen filtern
        const allCustomers = await storage.getAllCustomers(userId);
        const matchingCustomers = allCustomers.filter(customer => 
          customer.firstName.toLowerCase().includes(firstName.toLowerCase()) &&
          customer.lastName.toLowerCase().includes(lastName.toLowerCase())
        );
        console.log(`Found ${matchingCustomers.length} matching customers`);
        return res.json(matchingCustomers);
      }
      
      // Wenn nur firstName als Query-Parameter übergeben wird, suche nach Kunden mit ähnlichem Vornamen
      if (req.query.firstName) {
        console.log(`Searching for customers with first name: ${req.query.firstName}`);
        const firstName = req.query.firstName as string;
        if (firstName.length < 2) {
          return res.json([]);
        }
        
        // Alle Kunden abrufen und nach Vornamen filtern
        const allCustomers = await storage.getAllCustomers(userId);
        const matchingCustomers = allCustomers.filter(customer => 
          customer.firstName.toLowerCase().includes(firstName.toLowerCase())
        );
        console.log(`Found ${matchingCustomers.length} customers matching first name "${firstName}"`);
        return res.json(matchingCustomers);
      }
      
      // Ansonsten gebe alle Kunden zurück (gefiltert nach Benutzer)
      const customers = await storage.getAllCustomers(userId);
      console.log(`Returning all ${customers.length} customers`);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Kunden" });
    }
  });
  
  app.get("/api/customers/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  
  app.post("/api/customers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kunde mit Benutzerkontext erstellen
      const customer = await storage.createCustomer(customerData, userId);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });
  
  app.patch("/api/customers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kunde mit Benutzerkontext aktualisieren
      const customer = await storage.updateCustomer(id, customerData, userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });
  
  // Delete customer
  app.delete("/api/customers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kunde mit Benutzerkontext löschen
      const deleted = await storage.deleteCustomer(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });
  
  // REPAIRS API
  app.get("/api/repairs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Reparaturen mit Benutzerfilterung abrufen
      const repairs = await storage.getAllRepairs(userId);
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });
  
  app.get("/api/repairs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Reparatur mit Benutzerfilterung abrufen
      const repair = await storage.getRepair(id, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      res.json(repair);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repair" });
    }
  });
  
  app.get("/api/customers/:id/repairs", isAuthenticated, async (req: Request, res: Response) => {
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
  
  app.post("/api/repairs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Received repair data:", req.body);
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
      
      // Validate deviceType
      if (!deviceTypes.safeParse(repairData.deviceType).success) {
        console.error("Invalid device type:", repairData.deviceType);
        return res.status(400).json({ message: "Ungültiger Gerätetyp" });
      }
      
      // Validate status if provided
      if (repairData.status && !repairStatuses.safeParse(repairData.status).success) {
        console.error("Invalid status:", repairData.status);
        return res.status(400).json({ message: "Ungültiger Reparaturstatus" });
      }
      
      // Reparatur mit Benutzerkontext erstellen
      const repair = await storage.createRepair(repairData, userId);
      console.log("Created repair:", repair);
      res.status(201).json(repair);
    } catch (error) {
      console.error("Error creating repair:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Reparaturdaten", errors: error.errors });
      }
      res.status(500).json({ message: "Fehler beim Erstellen der Reparatur" });
    }
  });
  
  app.patch("/api/repairs/:id", isAuthenticated, async (req: Request, res: Response) => {
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
      
      // Validate deviceType if provided
      if (repairData.deviceType && !deviceTypes.safeParse(repairData.deviceType).success) {
        return res.status(400).json({ message: "Invalid device type" });
      }
      
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
  
  app.patch("/api/repairs/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, sendEmail, sendSms } = req.body;
      
      // Validate status
      if (!status || !repairStatuses.safeParse(status).success) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Reparaturstatus mit Benutzerkontext aktualisieren
      const repair = await storage.updateRepairStatus(id, status, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      // Kunde und Business-Daten laden (für E-Mail und SMS)
      const customer = await storage.getCustomer(repair.customerId, userId);
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Wenn Kunde existiert, Benachrichtigungen senden
      if (customer) {
        // Variablen für die Kommunikation zusammenstellen
        const variables: Record<string, string> = {
          "kundenname": `${customer.firstName} ${customer.lastName}`,
          "geraet": repair.model,
          "marke": repair.brand,
          "auftragsnummer": repair.orderCode || `#${repair.id}`,
          "fehler": repair.issue,
          "kostenvoranschlag": repair.estimatedCost || "Nicht angegeben",
          "geschaeftsname": businessSettings?.businessName || "Handyshop",
          "abholzeit": "ab sofort", // kann später angepasst werden
          // Wichtig: userId für die Datenisolierung hinzufügen
          "userId": userId.toString()
        };
        
        // Wenn Status auf "fertig"/"abholbereit" gesetzt wird und sendEmail=true, dann E-Mail senden
        if ((status === "fertig" || status === "abholbereit") && sendEmail === true && customer.email) {
          console.log("E-Mail-Benachrichtigung wird vorbereitet...");
          
          try {
            // Suche nach einer E-Mail-Vorlage mit name "fertig"
            const templates = await storage.getAllEmailTemplates();
            const pickupTemplate = templates.find(t => t.name.toLowerCase().includes("fertig") || 
                                                     t.name.toLowerCase().includes("abholbereit") ||
                                                     t.name.toLowerCase().includes("abholung"));
            
            if (pickupTemplate) {
              console.log(`E-Mail-Vorlage gefunden: ${pickupTemplate.name}`);
              
              // E-Mail senden
              const emailSent = await storage.sendEmailWithTemplate(pickupTemplate.id, customer.email, variables);
              console.log("E-Mail gesendet:", emailSent);
            } else {
              console.log("Keine passende E-Mail-Vorlage für 'Fertig/Abholbereit' gefunden");
            }
          } catch (emailError) {
            console.error("Fehler beim Senden der E-Mail:", emailError);
            // Wir werfen hier keinen Fehler, damit der Status trotzdem aktualisiert wird
          }
        }
        
        // Wenn Status auf "fertig"/"abholbereit" gesetzt wird und sendSms=true, dann SMS senden
        if ((status === "fertig" || status === "abholbereit") && sendSms === true && customer.phone) {
          console.log("SMS-Benachrichtigung wird vorbereitet...");
          
          try {
            // Suche nach einer SMS-Vorlage mit name "abholbereit"
            const smsTemplates = await storage.getAllSmsTemplates(userId);
            const pickupSmsTemplate = smsTemplates.find(t => 
              t.name.toLowerCase().includes("fertig") || 
              t.name.toLowerCase().includes("abholbereit") || 
              t.name.toLowerCase().includes("abholung"));
            
            if (pickupSmsTemplate) {
              console.log(`SMS-Vorlage gefunden: ${pickupSmsTemplate.name}`);
              
              // SMS senden
              const smsSent = await storage.sendSmsWithTemplate(pickupSmsTemplate.id, customer.phone, variables, userId);
              console.log("SMS gesendet:", smsSent);
            } else {
              console.log("Keine passende SMS-Vorlage für 'Abholbereit' gefunden");
            }
          } catch (smsError) {
            console.error("Fehler beim Senden der SMS:", smsError);
            // Wir werfen hier keinen Fehler, damit der Status trotzdem aktualisiert wird
          }
        }
      } else {
        console.log("Kunde nicht gefunden, keine Benachrichtigung möglich");
      }
      
      res.json(repair);
    } catch (error) {
      console.error("Fehler bei der Statusaktualisierung:", error);
      res.status(500).json({ message: "Failed to update repair status" });
    }
  });
  
  // Delete repair
  app.delete("/api/repairs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Reparatur mit Benutzerkontext löschen
      const deleted = await storage.deleteRepair(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting repair:", error);
      res.status(500).json({ message: "Failed to delete repair" });
    }
  });
  
  // STATISTICS API
  app.get("/api/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Statistiken mit Benutzerkontext abrufen
      const stats = await storage.getStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });
  
  // Detaillierte Reparaturstatistiken für Analysen und Diagramme
  app.get("/api/stats/detailed", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Detaillierte Statistiken für den Benutzer abrufen
      const detailedStats = await storage.getDetailedRepairStats(userId);
      res.json(detailedStats);
    } catch (error) {
      console.error("Error fetching detailed stats:", error);
      res.status(500).json({ message: "Failed to fetch detailed statistics" });
    }
  });

  // BUSINESS SETTINGS API
  app.get("/api/business-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      console.log(`Fetching business settings for user ${userId} (${req.user?.username})`);
      
      // Einstellungen für diesen spezifischen Benutzer abrufen
      const settings = await storage.getBusinessSettings(userId);
      
      // Wenn der Benutzer noch keine eigenen Einstellungen hat,
      // initialisieren wir sie mit den Firmendaten aus seinem Profil
      if (!settings) {
        console.log(`No settings found for user ${userId}, creating default settings`);
        // Verwende die Firmendaten des angemeldeten Benutzers
        const userData = req.user as any;
        
        // Erstelle ein Business-Settings-Objekt aus den Benutzerdaten
        const userSettings = {
          businessName: userData?.companyName || "Mein Reparaturshop",
          ownerFirstName: "", 
          ownerLastName: "",
          taxId: userData?.companyVatNumber || "",
          streetAddress: userData?.companyAddress || "",
          city: "",
          zipCode: "",
          country: "Österreich",
          phone: userData?.companyPhone || "",
          email: userData?.companyEmail || userData?.email || "",
          website: "",
          colorTheme: "blue",
          receiptWidth: "80mm"
        };
        
        // Speichere die Einstellungen für diesen Benutzer in der Datenbank
        const newSettings = await storage.updateBusinessSettings(userSettings, userId);
        return res.json(newSettings);
      }
      
      // Ansonsten geben wir die gespeicherten Einstellungen zurück
      res.json(settings);
    } catch (error) {
      console.error("Error fetching business settings:", error);
      res.status(500).json({ message: "Failed to fetch business settings" });
    }
  });

  app.post("/api/business-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      console.log(`Updating business settings for user ${userId} (${req.user?.username})`);
      
      // Wir extrahieren das logoImage und colorTheme aus dem Request-Body, bevor wir die Validierung durchführen
      const { logoImage, colorTheme, ...settingsData } = req.body;
      
      // Validierung der Geschäftsdaten
      const validatedData = insertBusinessSettingsSchema.partial().parse(settingsData);
      
      // Zusätzliche Daten für die Speicherung
      const additionalData: any = {};
      
      // Wenn ein Logo im Request ist, validieren wir es
      if (logoImage) {
        // Basis-Validierung: Prüfen, ob es sich um einen gültigen Base64-String handelt
        if (typeof logoImage !== 'string' || !logoImage.startsWith('data:image/')) {
          return res.status(400).json({ 
            message: "Ungültiges Logo-Format. Nur Base64-codierte Bilder werden unterstützt." 
          });
        }
        
        additionalData.logoImage = logoImage;
      }
      
      // Wenn ein Farbthema im Request ist, validieren wir es
      if (colorTheme) {
        // Validierung: Prüfen, ob es sich um ein gültiges Farbthema handelt
        if (typeof colorTheme === 'string' && ['blue', 'green', 'purple', 'red', 'orange'].includes(colorTheme)) {
          additionalData.colorTheme = colorTheme;
        } else {
          return res.status(400).json({ 
            message: "Ungültiges Farbthema. Erlaubte Werte sind: blue, green, purple, red, orange." 
          });
        }
      }
      
      // Speichere die Daten einschließlich der zusätzlichen Daten mit der Benutzer-ID
      const settings = await storage.updateBusinessSettings({
        ...validatedData,
        ...additionalData
      }, userId);
      
      return res.json(settings);
    } catch (error) {
      console.error("Error updating business settings:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid business settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update business settings" });
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
      const templates = await storage.getAllEmailTemplates();
      return res.status(200).json(templates);
    } catch (error) {
      console.error("Error retrieving email templates:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/email-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await storage.getEmailTemplate(id);
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
      });
      
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
      
      const template = await storage.getEmailTemplate(id);
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
      
      const updatedTemplate = await storage.updateEmailTemplate(id, updateData);
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
      
      const success = await storage.deleteEmailTemplate(id);
      if (!success) {
        return res.status(404).json({ error: "Email template not found or could not be deleted" });
      }
      
      return res.status(200).json({ message: "Email template deleted successfully" });
    } catch (error) {
      console.error("Error deleting email template:", error);
      return res.status(500).json({ error: "Internal server error" });
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
  
  // SMS-Vorlagen API-Endpunkte
  app.get("/api/sms-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const templates = await storage.getAllSmsTemplates(userId);
      return res.status(200).json(templates);
    } catch (error) {
      console.error("Error retrieving SMS templates:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/sms-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const template = await storage.getSmsTemplate(id, userId);
      if (!template) {
        return res.status(404).json({ error: "SMS template not found" });
      }
      
      return res.status(200).json(template);
    } catch (error) {
      console.error("Error retrieving SMS template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/sms-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Einfache Validierung
      const { name, body, variables } = req.body;
      if (!name || !body) {
        return res.status(400).json({ error: "Name and body are required" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
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
      
      const newTemplate = await storage.createSmsTemplate({
        name,
        body,
        variables: variablesArray
      }, userId);
      
      return res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating SMS template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.patch("/api/sms-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const template = await storage.getSmsTemplate(id, userId);
      if (!template) {
        return res.status(404).json({ error: "SMS template not found" });
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
      
      const updatedTemplate = await storage.updateSmsTemplate(id, updateData, userId);
      return res.status(200).json(updatedTemplate);
    } catch (error) {
      console.error("Error updating SMS template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.delete("/api/sms-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const template = await storage.getSmsTemplate(id, userId);
      if (!template) {
        return res.status(404).json({ error: "SMS template not found" });
      }
      
      const success = await storage.deleteSmsTemplate(id, userId);
      if (success) {
        return res.status(200).json({ message: "SMS template deleted successfully" });
      } else {
        return res.status(500).json({ error: "Failed to delete SMS template" });
      }
    } catch (error) {
      console.error("Error deleting SMS template:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // API-Endpunkt zum Senden von Bewertungs-E-Mails
  app.post("/api/repairs/:id/send-review-request", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
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
      
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Variablen für die Kommunikation zusammenstellen
      const variables: Record<string, string> = {
        "kundenname": `${customer.firstName} ${customer.lastName}`,
        "geraet": repair.model,
        "marke": repair.brand,
        "auftragsnummer": repair.orderCode || `#${repair.id}`,
        "fehler": repair.issue,
        "geschaeftsname": businessSettings?.businessName || "Handyshop",
        // Wichtig: userId für die Datenisolierung hinzufügen
        "userId": userId.toString()
      };
      
      // Suche nach der Bewertungs-E-Mail-Vorlage
      const templates = await storage.getAllEmailTemplates();
      const reviewTemplate = templates.find(t => 
        t.name.toLowerCase().includes("bewertung") || 
        t.name.toLowerCase().includes("feedback")
      );
      
      if (!reviewTemplate) {
        return res.status(404).json({ message: "Keine Bewertungs-E-Mail-Vorlage gefunden" });
      }
      
      // E-Mail senden
      const emailSent = await emailService.sendEmailWithTemplate(
        reviewTemplate.id, 
        customer.email, 
        variables
      );
      
      if (!emailSent) {
        return res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
      }
      
      res.json({ success: true, message: "Bewertungs-E-Mail wurde gesendet" });
    } catch (error) {
      console.error("Error sending review request email:", error);
      res.status(500).json({ message: "Failed to send review request email" });
    }
  });

  app.post("/api/send-sms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { templateId, phoneNumber, variables } = req.body;
      
      if (!templateId || !phoneNumber) {
        return res.status(400).json({ error: "Template ID and phone number are required" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const template = await storage.getSmsTemplate(templateId, userId);
      if (!template) {
        return res.status(404).json({ error: "SMS template not found" });
      }
      
      // Füge userId zu den Variablen hinzu, um die Datenisolierung zu gewährleisten
      const variablesWithUserId = {
        ...(variables || {}),
        userId: userId.toString()
      };
      
      const success = await storage.sendSmsWithTemplate(templateId, phoneNumber, variablesWithUserId, userId);
      if (success) {
        return res.status(200).json({ message: "SMS sent successfully" });
      } else {
        return res.status(500).json({ error: "Failed to send SMS" });
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}