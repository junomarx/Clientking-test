import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCustomerSchema, 
  insertRepairSchema,
  insertBusinessSettingsSchema,
  insertFeedbackSchema,
  insertSmsTemplateSchema,
  insertUserDeviceTypeSchema,
  insertUserBrandSchema,
  insertCostEstimateSchema,
  costEstimateItemSchema,
  repairStatuses,
  deviceTypes,
  type InsertEmailTemplate,
  customers,
  repairs,
  feedbacks,
  smsTemplates,
  userDeviceTypes,
  userBrands,
  costEstimates
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { registerAdminRoutes } from "./admin-routes";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { brevoEmailService } from "./brevo-email-service";

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
      
      // Nicht mehr nötig, da deviceType und brand jetzt zentral verwaltet werden 
      // und keine Enum-Validierung mehr benötigen
      
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
            const templates = await storage.getAllEmailTemplates(userId);
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
        
        // Wenn Status auf "ersatzteil_eingetroffen" gesetzt wird und sendEmail=true, dann E-Mail senden
        if (status === "ersatzteil_eingetroffen" && sendEmail === true && customer.email) {
          console.log("E-Mail-Benachrichtigung für Ersatzteillieferung wird vorbereitet...");
          
          try {
            // Suche nach einer E-Mail-Vorlage mit name "ersatzteil"
            const templates = await storage.getAllEmailTemplates(userId);
            const sparepartTemplate = templates.find(t => t.name.toLowerCase().includes("ersatzteil") || 
                                                      t.name.toLowerCase().includes("ersatz") ||
                                                      t.name.toLowerCase().includes("teil"));
            
            if (sparepartTemplate) {
              console.log(`E-Mail-Vorlage gefunden: ${sparepartTemplate.name}`);
              
              // E-Mail senden
              const emailSent = await storage.sendEmailWithTemplate(sparepartTemplate.id, customer.email, variables);
              console.log("E-Mail gesendet:", emailSent);
              
              // Erfolgsmeldung zurückgeben, die im Frontend als Toast angezeigt wird
              if (emailSent) {
                res.setHeader('X-Email-Sent', 'true');
              }
            } else {
              console.log("Keine passende E-Mail-Vorlage für 'Ersatzteil eingetroffen' gefunden");
              console.log("Erstelle Standard-Ersatzteil-Vorlage...");
              
              // Erstelle eine Standard-Vorlage, wenn keine vorhanden ist
              try {
                // Erstelle die E-Mail-Vorlage
                const templateData: InsertEmailTemplate = {
                  name: "Ersatzteil eingetroffen",
                  subject: "Ersatzteil für Ihre Reparatur ist eingetroffen",
                  body: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <h2 style="color: #10b981;">Gute Neuigkeiten!</h2>
                    </div>
                    
                    <p>Sehr geehrte(r) {{kundenname}},</p>
                    
                    <p>wir freuen uns, Ihnen mitteilen zu können, dass das bestellte Ersatzteil für Ihre Reparatur eingetroffen ist.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                      <p style="margin: 5px 0;"><strong>Gerät:</strong> {{marke}} {{geraet}}</p>
                      <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
                      <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{fehler}}</p>
                    </div>
                    
                    <p>Wir werden nun umgehend mit der Reparatur fortfahren und Sie informieren, sobald Ihr Gerät wieder abholbereit ist.</p>
                    
                    <p>Falls Sie Fragen haben, können Sie uns gerne kontaktieren.</p>
                    
                    <p>Mit freundlichen Grüßen,<br>
                    Ihr Team von {{geschaeftsname}}</p>
                  </div>
                  `,
                  userId
                };
                
                const newTemplate = await storage.createEmailTemplate(templateData);
                
                console.log("Neue E-Mail-Vorlage erstellt:", newTemplate);
                
                // E-Mail mit der neuen Vorlage senden
                const emailSent = await storage.sendEmailWithTemplate(newTemplate.id, customer.email, variables);
                console.log("E-Mail gesendet:", emailSent);
                
                // Erfolgsmeldung zurückgeben, die im Frontend als Toast angezeigt wird
                if (emailSent) {
                  res.setHeader('X-Email-Sent', 'true');
                }
              } catch (templateError) {
                console.error("Fehler beim Erstellen der E-Mail-Vorlage:", templateError);
              }
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
      
      // Zusätzlich Kunden- und Reparaturanzahl hinzufügen
      const customers = await storage.getAllCustomers(userId);
      const repairs = await storage.getAllRepairs(userId);
      
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
  
  // Detaillierte Reparaturstatistiken für Analysen und Diagramme
  app.get("/api/stats/detailed", isAuthenticated, async (req: Request, res: Response) => {
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
      console.log('Request body keys:', Object.keys(req.body));
      
      // Wir extrahieren das logoImage und colorTheme aus dem Request-Body, bevor wir die Validierung durchführen
      const { logoImage, colorTheme, receiptWidth, ...settingsData } = req.body;
      
      console.log('Processing form data:', { 
        hasLogo: !!logoImage, 
        logoLength: logoImage ? logoImage.length : 0,
        colorTheme,
        receiptWidth,
        dataKeys: Object.keys(settingsData)
      });
      
      // Validierung der Geschäftsdaten
      const validatedData = insertBusinessSettingsSchema.partial().parse(settingsData);
      
      // Zusätzliche Daten für die Speicherung
      const additionalData: any = {};
      
      // Wenn ein Logo im Request ist, validieren wir es
      if (logoImage) {
        // Basis-Validierung: Prüfen, ob es sich um einen gültigen Base64-String handelt
        if (typeof logoImage !== 'string' || !logoImage.startsWith('data:image/')) {
          console.log('Ungültiges Logo-Format:', typeof logoImage, logoImage ? logoImage.substring(0, 20) + '...' : 'leer');
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
          console.log('Ungültiges Farbthema:', colorTheme);
          return res.status(400).json({ 
            message: "Ungültiges Farbthema. Erlaubte Werte sind: blue, green, purple, red, orange." 
          });
        }
      }
      
      // Bonbreite validieren
      if (receiptWidth) {
        if (typeof receiptWidth === 'string' && ['58mm', '80mm'].includes(receiptWidth)) {
          additionalData.receiptWidth = receiptWidth;
        } else {
          console.log('Ungültige Bonbreite:', receiptWidth);
          return res.status(400).json({
            message: "Ungültige Bonbreite. Erlaubte Werte sind: 58mm, 80mm."
          });
        }
      }
      
      const finalData = {
        ...validatedData,
        ...additionalData
      };
      
      console.log('Final data being saved:', Object.keys(finalData));
      
      // Speichere die Daten einschließlich der zusätzlichen Daten mit der Benutzer-ID
      const settings = await storage.updateBusinessSettings(finalData, userId);
      
      console.log('Business settings updated successfully');
      return res.json(settings);
    } catch (error) {
      console.error("Error updating business settings:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid business settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update business settings", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // GERÄTETYPEN UND MARKEN API (für Lesezugriff durch alle Benutzer)
  // Benutzerspezifische Gerätearten abrufen
  app.get("/api/device-types", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const deviceTypes = await storage.getUserDeviceTypes(userId);
      res.json(deviceTypes);
    } catch (error) {
      console.error("Error retrieving device types:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Gerätearten" });
    }
  });
  
  // Benutzerspezifische Gerätearte nach ID abrufen
  app.get("/api/device-types/:id", isAuthenticated, async (req: Request, res: Response) => {
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
      
      const deviceTypeData = insertUserDeviceTypeSchema.parse(req.body);
      const deviceType = await storage.createUserDeviceType(deviceTypeData, userId);
      
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
  app.patch("/api/device-types/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const deviceTypeData = insertUserDeviceTypeSchema.partial().parse(req.body);
      const deviceType = await storage.updateUserDeviceType(id, deviceTypeData, userId);
      
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
  app.delete("/api/device-types/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      const success = await storage.deleteUserDeviceType(id, userId);
      
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
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
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
  app.get("/api/brands/:id", isAuthenticated, async (req: Request, res: Response) => {
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
      
      const brandData = insertUserBrandSchema.parse(req.body);
      
      // Prüfen, ob der Gerätetyp existiert und dem Benutzer gehört
      const deviceType = await storage.getUserDeviceType(brandData.deviceTypeId, userId);
      if (!deviceType) {
        return res.status(400).json({ message: "Ungültiger Gerätetyp" });
      }
      
      const brand = await storage.createUserBrand(brandData, userId);
      
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
  app.patch("/api/brands/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  app.delete("/api/brands/:id", isAuthenticated, async (req: Request, res: Response) => {
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
        "marke": repair.brand,
        "auftragsnummer": repair.orderCode || `#${repair.id}`,
        "fehler": repair.issue,
        "geschaeftsname": businessSettings?.businessName || "Handyshop",
        "logo": businessSettings?.logoImage || "",
        "telefon": businessSettings?.phone || "",
        "email": businessSettings?.email || "",
        "adresse": `${businessSettings?.streetAddress || ""}, ${businessSettings?.zipCode || ""} ${businessSettings?.city || ""}`,
        "website": businessSettings?.website || "",
        "bewertungslink": reviewLink, // Explizit setzen
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
      const emailSent = await brevoEmailService.sendEmailWithTemplate(
        reviewTemplate.id, 
        customer.email, 
        variables
      );
      
      if (!emailSent) {
        return res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
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
      } catch (updateError) {
        console.error("Fehler beim Aktualisieren des reviewRequestSent-Flags:", updateError);
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

  // Registriere die Admin-Routen
  registerAdminRoutes(app);
  
  // KOSTENVORANSCHLAG API (COST ESTIMATES)
  // Alle Kostenvoranschläge abrufen
  app.get("/api/cost-estimates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschläge mit Benutzerfilterung abrufen
      const estimates = await storage.getAllCostEstimates(userId);
      res.json(estimates);
    } catch (error) {
      console.error("Error fetching cost estimates:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Kostenvoranschläge" });
    }
  });
  
  // Einen bestimmten Kostenvoranschlag abrufen
  app.get("/api/cost-estimates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschlag mit Benutzerfilterung abrufen
      const estimate = await storage.getCostEstimate(id, userId);
      
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      res.json(estimate);
    } catch (error) {
      console.error("Error fetching cost estimate:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Kostenvoranschlags" });
    }
  });
  
  // Kostenvoranschläge für einen bestimmten Kunden abrufen
  app.get("/api/customers/:id/cost-estimates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschläge für den Kunden mit Benutzerfilterung abrufen
      const estimates = await storage.getCostEstimatesByCustomerId(customerId, userId);
      res.json(estimates);
    } catch (error) {
      console.error("Error fetching customer cost estimates:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Kostenvoranschläge für den Kunden" });
    }
  });
  
  // Einen neuen Kostenvoranschlag erstellen
  app.post("/api/cost-estimates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Received cost estimate data:", req.body);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Verwende safeParse für bessere Fehlerdiagnose
      const validationResult = insertCostEstimateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error);
        return res.status(400).json({ 
          message: "Ungültige Kostenvoranschlagsdaten", 
          errors: validationResult.error.errors 
        });
      }
      
      const estimateData = validationResult.data;
      
      // Validiere, dass der Kunde existiert
      const customer = await storage.getCustomer(estimateData.customerId, userId);
      if (!customer) {
        console.error("Customer not found:", estimateData.customerId, "for user:", userId);
        return res.status(400).json({ message: "Ungültige Kunden-ID" });
      }
      
      // Validiere die Positionen im Kostenvoranschlag
      if (estimateData.items) {
        const itemsValidation = Array.isArray(estimateData.items) 
          ? estimateData.items.every(item => costEstimateItemSchema.safeParse(item).success)
          : false;
          
        if (!itemsValidation) {
          console.error("Invalid items in cost estimate");
          return res.status(400).json({ message: "Ungültige Positionen im Kostenvoranschlag" });
        }
      }
      
      // Kostenvoranschlag mit Benutzerkontext erstellen
      const estimate = await storage.createCostEstimate(estimateData, userId);
      console.log("Created cost estimate:", estimate);
      res.status(201).json(estimate);
    } catch (error) {
      console.error("Error creating cost estimate:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlagsdaten", errors: error.errors });
      }
      res.status(500).json({ message: "Fehler beim Erstellen des Kostenvoranschlags" });
    }
  });
  
  // Einen bestehenden Kostenvoranschlag aktualisieren
  app.patch("/api/cost-estimates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Daten validieren
      const estimateData = insertCostEstimateSchema.partial().parse(req.body);
      
      // Wenn eine Kunden-ID angegeben ist, prüfen, ob der Kunde existiert
      if (estimateData.customerId) {
        const customer = await storage.getCustomer(estimateData.customerId, userId);
        if (!customer) {
          return res.status(400).json({ message: "Ungültige Kunden-ID" });
        }
      }
      
      // Wenn items aktualisiert werden, validieren
      if (estimateData.items) {
        const itemsValidation = Array.isArray(estimateData.items) 
          ? estimateData.items.every(item => costEstimateItemSchema.safeParse(item).success)
          : false;
          
        if (!itemsValidation) {
          return res.status(400).json({ message: "Ungültige Positionen im Kostenvoranschlag" });
        }
      }
      
      // Kostenvoranschlag mit Benutzerkontext aktualisieren
      const estimate = await storage.updateCostEstimate(id, estimateData, userId);
      
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      res.json(estimate);
    } catch (error) {
      console.error("Error updating cost estimate:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Ungültige Kostenvoranschlagsdaten", errors: error.errors });
      }
      res.status(500).json({ message: "Fehler beim Aktualisieren des Kostenvoranschlags" });
    }
  });
  
  // Den Status eines Kostenvoranschlags aktualisieren
  app.patch("/api/cost-estimates/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      // Validieren, dass ein Status angegeben wurde
      if (!status) {
        return res.status(400).json({ message: "Kein Status angegeben" });
      }
      
      // Validieren, dass der Status gültig ist
      const validStatuses = ["offen", "angenommen", "abgelehnt", "abgelaufen"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Ungültiger Status" });
      }
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschlagsstatus mit Benutzerkontext aktualisieren
      const estimate = await storage.updateCostEstimateStatus(id, status, userId);
      
      if (!estimate) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      res.json(estimate);
    } catch (error) {
      console.error("Error updating cost estimate status:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Kostenvoranschlagsstatus" });
    }
  });
  
  // Einen Kostenvoranschlag löschen
  app.delete("/api/cost-estimates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschlag mit Benutzerkontext löschen
      const deleted = await storage.deleteCostEstimate(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting cost estimate:", error);
      res.status(500).json({ message: "Fehler beim Löschen des Kostenvoranschlags" });
    }
  });
  
  // Einen Kostenvoranschlag in einen Reparaturauftrag umwandeln
  app.post("/api/cost-estimates/:id/convert-to-repair", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Kostenvoranschlag in Reparaturauftrag umwandeln
      const repair = await storage.convertToRepair(id, userId);
      
      if (!repair) {
        return res.status(404).json({ message: "Kostenvoranschlag nicht gefunden oder Umwandlung fehlgeschlagen" });
      }
      
      res.status(201).json(repair);
    } catch (error) {
      console.error("Error converting cost estimate to repair:", error);
      res.status(500).json({ message: "Fehler bei der Umwandlung in einen Reparaturauftrag" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}