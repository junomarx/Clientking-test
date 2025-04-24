import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCustomerSchema, 
  insertRepairSchema,
  repairStatuses,
  deviceTypes
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth } from "./auth";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Nicht angemeldet" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  // CUSTOMERS API
  app.get("/api/customers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("GET /api/customers: Auth status:", req.isAuthenticated(), "User:", req.user?.username);
      
      // Wenn firstName und lastName als Query-Parameter übergeben werden, suche nach Kunden mit diesem Namen
      if (req.query.firstName && req.query.lastName) {
        console.log(`Searching for customers with name: ${req.query.firstName} ${req.query.lastName}`);
        const matchingCustomers = await storage.findCustomersByName(
          req.query.firstName as string, 
          req.query.lastName as string
        );
        console.log(`Found ${matchingCustomers.length} matching customers`);
        return res.json(matchingCustomers);
      }
      
      // Ansonsten gebe alle Kunden zurück
      const customers = await storage.getAllCustomers();
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
      const customer = await storage.getCustomer(id);
      
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
      const customer = await storage.createCustomer(customerData);
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
      
      const customer = await storage.updateCustomer(id, customerData);
      
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
  
  // REPAIRS API
  app.get("/api/repairs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const repairs = await storage.getAllRepairs();
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });
  
  app.get("/api/repairs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repair = await storage.getRepair(id);
      
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
      const repairs = await storage.getRepairsByCustomerId(customerId);
      res.json(repairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer repairs" });
    }
  });
  
  app.post("/api/repairs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Received repair data:", req.body);
      console.log("Auth status:", req.isAuthenticated(), "User:", req.user?.username);
      
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
      
      // Validate customerId exists
      const customer = await storage.getCustomer(repairData.customerId);
      if (!customer) {
        console.error("Customer not found:", repairData.customerId);
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
      
      const repair = await storage.createRepair(repairData);
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
      
      // Validate customerId exists if provided
      if (repairData.customerId) {
        const customer = await storage.getCustomer(repairData.customerId);
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
      
      const repair = await storage.updateRepair(id, repairData);
      
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
      const { status } = req.body;
      
      // Validate status
      if (!status || !repairStatuses.safeParse(status).success) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const repair = await storage.updateRepairStatus(id, status);
      
      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      res.json(repair);
    } catch (error) {
      res.status(500).json({ message: "Failed to update repair status" });
    }
  });
  
  // STATISTICS API
  app.get("/api/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
