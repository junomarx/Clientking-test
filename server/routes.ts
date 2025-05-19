import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Import der Berechtigungsprüfung aus permissions.ts
import { isProfessionalOrHigher, isEnterprise, hasAccess, hasAccessAsync } from './permissions';
// Import der Middleware für die Prüfung der Trial-Version
import { checkTrialExpiry } from './middleware/check-trial-expiry';
import { format } from 'date-fns';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { 
  insertCustomerSchema, 
  insertRepairSchema,
  insertBusinessSettingsSchema,
  insertFeedbackSchema,
  insertUserDeviceTypeSchema,
  insertUserBrandSchema,
  insertUserModelSchema,
  insertCostEstimateSchema,
  repairStatuses,
  deviceTypes,
  type InsertEmailTemplate,
  type InsertCostEstimate,
  type InsertCostEstimateItem,
  customers,
  users,
  repairs,
  feedbacks,
  userDeviceTypes,
  userBrands,
  businessSettings,
  costEstimates
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { registerAdminRoutes } from "./admin-routes";
import { supportAccessRouter } from "./support-access-routes";
import { registerSuperadminRoutes } from "./superadmin-routes";
import { registerGlobalDeviceRoutes } from "./global-device-routes";
import { registerSuperadminPrintTemplatesRoutes } from "./superadmin-print-templates-routes";
import { db } from "./db";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { emailService } from "./email-service";
import { requireShopIsolation, attachShopId } from "./middleware/shop-isolation";
import { enforceShopIsolation, validateCustomerBelongsToShop } from "./middleware/enforce-shop-isolation";

// Middleware to check if user is authenticated
async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Prüfe auf benutzerdefinierte User-ID im Header (für direktes Debugging)
  const customUserId = req.headers['x-user-id'];
  if (customUserId) {
    console.log(`X-User-ID Header gefunden: ${customUserId}`);
    // Wenn wir eine Benutzer-ID im Header haben, versuchen wir, den Benutzer zu laden
    try {
      const userId = parseInt(customUserId.toString());
      const user = await storage.getUser(userId);
      if (user) {
        console.log(`Benutzer mit ID ${userId} aus Header gefunden: ${user.username}`);
        req.user = user;
        return next();
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten der X-User-ID:', error);
    }
  }
  
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
  } else {
    res.status(401).json({ message: "Nicht angemeldet" });
  }
}

// Hilfsfunktionen entfernt (keine Modellreihen mehr)

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Globale Middleware für Shop-Isolation registrieren
  // Diese Middleware hängt automatisch die Shop-ID des angemeldeten Benutzers an alle Anfragen an
  app.use(attachShopId);
  
  // Set up admin routes
  registerAdminRoutes(app);
  
  // Set up superadmin routes
  registerSuperadminRoutes(app);
  
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
          .orderBy(customers.lastName, customers.firstName);
        
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
          .orderBy(customers.lastName, customers.firstName);
        
        console.log(`Found ${matchingCustomers.length} customers matching first name "${firstName}" (strict shop isolation: ${shopId})`);
        return res.json(matchingCustomers);
      }
      
      // Ansonsten gebe alle Kunden zurück (gefiltert nach Shop-ID)
      const allCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.shopId, shopId))
        .orderBy(customers.lastName, customers.firstName);
      
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
        createdAt: new Date()
      };
      
      // Direkter DB-Zugriff für DSGVO-konforme Verarbeitung
      const [customer] = await db
        .insert(customers)
        .values(newCustomer)
        .returning();
      
      console.log(`✅ DSGVO-konform: Neuer Kunde ${customer.firstName} ${customer.lastName} für Shop ${user.shopId} erstellt`);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Fehler beim Erstellen eines Kunden:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });
  
  app.patch("/api/customers/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
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
  app.delete("/api/customers/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
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
  app.get("/api/repairs", isAuthenticated, attachShopId, async (req: Request, res: Response) => {
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
  
  app.get("/api/repairs/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
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
      const { status, sendEmail } = req.body;
      
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
      
      // Kunde und Business-Daten laden (für E-Mail)
      const customer = await storage.getCustomer(repair.customerId, userId);
      const businessSettings = await storage.getBusinessSettings(userId);
      
      // Wenn Kunde existiert, Benachrichtigungen senden
      if (customer) {
        // Variablen für die Kommunikation zusammenstellen
        const variables: Record<string, string> = {
          "kundenname": `${customer.firstName} ${customer.lastName}`,
          "geraet": repair.model,
          "hersteller": repair.brand,
          "auftragsnummer": repair.orderCode || `#${repair.id}`,
          "fehler": repair.issue,
          "kostenvoranschlag": repair.estimatedCost || "Nicht angegeben",
          "geschaeftsname": businessSettings?.businessName || "Handyshop",
          "abholzeit": "ab sofort", // kann später angepasst werden
          // Wichtig: userId und repairId für die Datenisolierung und E-Mail-Verlauf hinzufügen
          "userId": userId.toString(),
          "repairId": repair.id.toString()
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
              const emailSent = await storage.sendEmailWithTemplateById(pickupTemplate.id, customer.email, variables);
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
              const emailSent = await storage.sendEmailWithTemplateById(sparepartTemplate.id, customer.email, variables);
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
                      <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
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
        
        // SMS-Funktionalität wurde auf Kundenwunsch entfernt
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
  app.delete("/api/repairs/:id", isAuthenticated, requireShopIsolation, async (req: Request, res: Response) => {
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
  
  // API-Endpunkt, um zu prüfen, ob der User ein Professional oder Enterprise Paket hat
  // Kostenvoranschlag-Berechtigungsprüfung entfernt
  
  // API-Endpunkt, um zu prüfen, ob der User Etiketten drucken darf (nur Professional/Enterprise)
  app.get("/api/can-print-labels", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer mindestens ein Professional-Paket hat
      const isProfessional = await isProfessionalOrHigher(userId);
      
      // Ergebnis zurückgeben
      res.json({ canPrintLabels: isProfessional });
    } catch (error) {
      console.error("Error checking label printing permission:", error);
      res.status(500).json({ message: "Fehler bei der Überprüfung der Druckberechtigungen" });
    }
  });
  
  // API-Endpunkt, um zu prüfen, ob der User detaillierte Statistiken sehen darf (nur Enterprise)
  app.get("/api/can-view-detailed-stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer ein Enterprise-Paket hat
      const isEnterpriseUser = await isEnterprise(userId);
      
      // Ergebnis zurückgeben
      res.json({ canViewDetailedStats: isEnterpriseUser });
    } catch (error) {
      console.error("Error checking detailed stats permission:", error);
      res.status(500).json({ message: "Fehler bei der Überprüfung der Statistik-Berechtigungen" });
    }
  });
  
  // Abrufen des monatlichen Reparaturkontingents (für Basic-Paket)
  app.get("/api/repair-quota", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Benutzer abrufen
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      
      console.log(`QUOTA-API: Benutzer ${user.username} (ID: ${userId}, Paket: ${user.package_id}, Plan: ${user.pricing_plan})`);
      
      // Standardwerte für den Fall, dass kein Limit existiert (für Professional und Enterprise)
      let quotaInfo = {
        count: 0,
        limit: 10, // Geändert von 50 auf 10 als Standardwert
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
        
        // Prüfe auf Paket-Features für maxRepairs
        if (user.packageId) {
          console.log(`Prüfe auf max. Reparaturen für Benutzer ${userId} mit Paket ${user.packageId}`);
          
          try {
            // Direkte Abfrage des maxRepairs-Features für das Paket des Benutzers
            const features = await db.select({
              feature: packageFeatures.feature,
              value: packageFeatures.value
            })
            .from(packageFeatures)
            .where(eq(packageFeatures.packageId, user.packageId));
            
            console.log("Paket-Features für Benutzer:", features);
            
            // Direkte Suche nach dem maxRepairs-Feature
            const maxRepairsFeature = features.find(feature => feature.feature === 'maxRepairs');
            
            if (maxRepairsFeature && maxRepairsFeature.value) {
              console.log(`Max. Reparaturen Feature direkt gefunden: ${maxRepairsFeature.value}`);
              quotaInfo.limit = parseInt(maxRepairsFeature.value) || 10; // Fallback auf 10, wenn keine gültige Zahl
            } else {
              // Wenn kein spezifisches maxRepairs gefunden wurde, bestimme anhand des Pakettyps
              const userPackage = await storage.getPackageById(user.packageId);
              
              if (userPackage) {
                console.log(`Bestimme Limit basierend auf Pakettyp: ${userPackage.name}`);
                
                if (userPackage.name === 'Professional' || userPackage.name === 'Enterprise') {
                  quotaInfo.limit = 999999; // Unbegrenzt für höhere Pakete
                } else if (userPackage.name === 'Demo') {
                  console.log("DEMO-PAKET ERKANNT: Setze Limit auf 10 Reparaturen");
                  quotaInfo.limit = 10; // Demo hat 10 Reparaturen
                } else if (userPackage.name === 'Basic') {
                  quotaInfo.limit = 50; // Basic hat 50 Reparaturen
                }
              }
            }
          } catch (error) {
            console.error("Fehler beim Abrufen der Paket-Features:", error);
          }
        } else if (user.pricingPlan) {
          // Fallback auf die alte pricingPlan-Eigenschaft
          if (user.pricingPlan === 'professional' || user.pricingPlan === 'enterprise') {
            quotaInfo.limit = 999999; // Praktisch unbegrenzt
          }
        }
        
        // Prüfen, ob neue Reparaturen erstellt werden können
        quotaInfo.canCreate = quotaInfo.count < quotaInfo.limit;
      }
      
      // Datumsinformationen
      const today = new Date();
      const currentMonth = today.toLocaleString('de-DE', { month: 'long' });
      const currentYear = today.getFullYear();
      
      // Antwort mit Berücksichtigung des neuen Paketsystems
      // Wenn der Benutzer eine packageId hat, verwenden wir diese für die Bestimmung des Plans
      let pricingPlan = user.pricingPlan || 'basic'; // Fallback auf die alte Eigenschaft
      let displayName = 'Basic';
      
      if (user.packageId) {
        try {
          // Paket aus der Datenbank abrufen
          const userPackage = await storage.getPackageById(user.packageId);
          if (userPackage) {
            // Paketname für die Anzeige und Entscheidungslogik verwenden
            displayName = userPackage.name;
            
            // pricingPlan für Legacy-Kompatibilität setzen
            if (userPackage.name === 'Basic') pricingPlan = 'basic';
            else if (userPackage.name === 'Professional') pricingPlan = 'professional';
            else if (userPackage.name === 'Enterprise') pricingPlan = 'enterprise';
            else if (userPackage.name === 'Demo') pricingPlan = 'basic'; // Demo als Basic behandeln
          }
        } catch (error) {
          console.error("Fehler beim Abrufen des Pakets:", error);
        }
      } else {
        // Wenn keine packageId, dann verwenden wir die alte pricingPlan-Eigenschaft
        displayName = pricingPlan === 'basic' ? 'Basic' : 
                      pricingPlan === 'professional' ? 'Professional' : 'Enterprise';
      }
      
      // Ablaufdatum für das Demo-Paket hinzufügen
      let trialExpiryInfo = null;
      if (displayName === 'Demo' && user.trialExpiresAt) {
        const expiryDate = new Date(user.trialExpiresAt);
        const today = new Date();
        
        // Berechnung der verbleibenden Tage
        const remainingDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        trialExpiryInfo = {
          expiresAt: user.trialExpiresAt,
          remainingDays: remainingDays > 0 ? remainingDays : 0
        };
      }
      
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
  
  // Detaillierte Reparaturstatistiken für Analysen und Diagramme (nur Enterprise)
  app.get("/api/stats/detailed", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Benutzer-ID aus der Authentifizierung abrufen
      const userId = (req.user as any).id;
      
      // Prüfen, ob der Benutzer berechtigt ist, detaillierte Statistiken zu sehen
      // Diese Funktion ist nur für Enterprise-Nutzer verfügbar
      const isEnterpriseUser = await isEnterprise(userId);
      if (!isEnterpriseUser) {
        return res.status(403).json({ 
          message: "Detaillierte Statistiken sind nur im Enterprise-Paket verfügbar",
          errorCode: "FEATURE_NOT_AVAILABLE"
        });
      }
      
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
      
      // Benutzer-ID direkt aus der Session nehmen
      const userId = (req.user as any).id;
      const username = (req.user as any).username;
      console.log(`NEUE IMPLEMENTATION: Fetching business settings for user ${userId} (${username})`);
      
      // Verwende die aktualisierte Storage-Methode mit Tenant-Isolation
      const userSettings = await storage.getBusinessSettings(userId);
      
      // Wenn keine Einstellungen gefunden wurden, erstelle Standardeinstellungen
      if (!userSettings) {
        console.log(`Keine Einstellungen für Benutzer ${userId} gefunden, erstelle Standardeinstellungen`);
        
        // Benutzer holen, um Shop-ID für neue Einstellungen zu bestimmen
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
      
      const deviceTypes = await storage.getUserDeviceTypes(userId);
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
      
      // userId an die Methode übergeben, um shop-basierte Filterung zu ermöglichen
      const templates = await storage.getAllEmailTemplates(userId);
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
        "auftragsnummer": repair.orderCode || `#${repair.id}`,
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
      
      // Suche nach der Bewertungs-E-Mail-Vorlage mit Benutzer-ID für Shop-Isolation
      const templates = await storage.getAllEmailTemplates(userId);
      
      console.log(`Suche nach Bewertungsvorlage für Benutzer ${userId}. Gefundene Vorlagen: ${templates.length}`);
      templates.forEach((t, index) => {
        console.log(`  Vorlage ${index+1}: ID=${t.id}, Name="${t.name}", Typ=${t.type || 'unbekannt'}`);
      });
      
      const reviewTemplate = templates.find(t => 
        t.name.toLowerCase().includes("bewertung") || 
        t.name.toLowerCase().includes("feedback")
      );
      
      if (reviewTemplate) {
        console.log(`Bewertungsvorlage gefunden: ID=${reviewTemplate.id}, Name="${reviewTemplate.name}"`);
      } else {
        console.log("Keine passende Bewertungsvorlage gefunden!");
      }
      
      if (!reviewTemplate) {
        return res.status(404).json({ message: "Keine Bewertungs-E-Mail-Vorlage gefunden" });
      }
      
      // E-Mail senden
      // Verwende storage.sendEmailWithTemplate statt emailService.sendEmailWithTemplate
      // um E-Mail-Verlaufseinträge zu erstellen
      try {
        const emailSent = await storage.sendEmailWithTemplate(
          reviewTemplate.id, 
          customer.email, 
          variables
        );
        
        if (!emailSent) {
          return res.status(500).json({ message: "E-Mail konnte nicht gesendet werden" });
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
      
      // Für Basic-Benutzer: nur Abholungs-Unterschrift erlauben, keine Abgabe-Unterschrift
      if (user.pricingPlan === 'basic' && signatureType === 'dropoff') {
        return res.status(403).json({ 
          message: "Im Basic-Paket können nur Abholungs-Unterschriften erstellt werden. Upgrade auf Professional, um beide Unterschriftstypen zu nutzen."
        });
      }
      
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
      
      // Für Basic-Benutzer: Abgabe-Unterschrift nicht erlauben
      if (user.pricingPlan === 'basic') {
        return res.status(403).json({ 
          message: "Im Basic-Paket können nur Abholungs-Unterschriften erstellt werden. Upgrade auf Professional, um beide Unterschriftstypen zu nutzen."
        });
      }
      
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
      
      // Nächste Referenznummer generieren
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      
      const lastEstimateQuery = await db.execute(`
        SELECT reference_number 
        FROM cost_estimates 
        WHERE shop_id = ${shopId} 
        ORDER BY id DESC 
        LIMIT 1
      `);
      
      let nextNumber = 1;
      if (lastEstimateQuery.rows.length > 0) {
        const lastEstimateNumber = lastEstimateQuery.rows[0].reference_number;
        const match = lastEstimateNumber.match(/KV-\d{4}-(\d{3})/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      // Generiere die Kostenvoranschlagsnummer
      const estimateNumber = `KV-${month}${year}-${String(nextNumber).padStart(3, '0')}`;
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
      if (estimate.converted_to_repair) {
        return res.status(400).json({ 
          message: "Der Kostenvoranschlag wurde bereits in einen Reparaturauftrag umgewandelt" 
        });
      }
      
      // Reparatur erstellen
      const insertRepair: Partial<InsertRepair> = {
        reference_number: estimate.reference_number.replace('KV-', 'RA-'),
        customer_id: estimate.customer_id || estimate.customerId,
        device_type: estimate.device_type,
        brand: estimate.brand,
        model: estimate.model,
        serial_number: estimate.serial_number || estimate.serialNumber,
        issue: estimate.issue,
        notes: `Umgewandelt aus Kostenvoranschlag ${estimate.reference_number}`,
        status: 'angenommen',
        cost_estimate_id: estimate.id,
        estimated_price: estimate.total,
        created_at: new Date(),
        updated_at: new Date(),
        user_id: userId,
        shop_id: (req.user as any).shop_id || (req.user as any).shopId
      };
      
      // Reparatur in der Datenbank erstellen
      const repair = await storage.createRepair(insertRepair);
      
      if (!repair) {
        return res.status(500).json({ message: "Fehler beim Erstellen der Reparatur" });
      }
      
      // Kostenvoranschlag als umgewandelt markieren
      await storage.updateCostEstimate(id, {
        converted_to_repair: true,
        repair_id: repair.id
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

  const httpServer = createServer(app);

  return httpServer;
}