import { 
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  repairs, type Repair, type InsertRepair,
  businessSettings, type BusinessSettings, type InsertBusinessSettings,
  feedbacks, type Feedback, type InsertFeedback
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lt, count, isNotNull, like } from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods (required by template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Customer methods
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  findCustomersByName(firstName: string, lastName: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  // Repair methods
  getAllRepairs(): Promise<Repair[]>;
  getRepair(id: number): Promise<Repair | undefined>;
  getRepairsByCustomerId(customerId: number): Promise<Repair[]>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair(id: number, repair: Partial<InsertRepair>): Promise<Repair | undefined>;
  updateRepairStatus(id: number, status: string): Promise<Repair | undefined>;
  deleteRepair(id: number): Promise<boolean>;
  
  // Business settings methods
  getBusinessSettings(): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(settings: Partial<InsertBusinessSettings>): Promise<BusinessSettings>;
  
  // Stats methods
  getStats(): Promise<{
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
  }>;

  // Feedback methods
  createFeedbackToken(repairId: number, customerId: number): Promise<string>;
  getFeedbackByToken(token: string): Promise<Feedback | undefined>;
  submitFeedback(token: string, rating: number, comment?: string): Promise<Feedback | undefined>;
  getFeedbacksByRepairId(repairId: number): Promise<Feedback[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Customer methods
  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  
  async findCustomersByName(firstName: string, lastName: string): Promise<Customer[]> {
    // Suche Kunden, deren Vor- und Nachname die gesuchten Begriffe enthalten (case-insensitive)
    return await db
      .select()
      .from(customers)
      .where(
        and(
          sql`LOWER(${customers.firstName}) LIKE LOWER(${'%' + firstName + '%'})`,
          sql`LOWER(${customers.lastName}) LIKE LOWER(${'%' + lastName + '%'})`
        )
      );
  }
  
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values({
      ...insertCustomer,
      createdAt: new Date()
    }).returning();
    return customer;
  }
  
  async updateCustomer(id: number, customerUpdate: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(customerUpdate)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    try {
      await db.delete(customers).where(eq(customers.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting customer:", error);
      return false;
    }
  }
  
  // Repair methods
  async getAllRepairs(): Promise<Repair[]> {
    return await db.select().from(repairs).orderBy(desc(repairs.createdAt));
  }
  
  async getRepair(id: number): Promise<Repair | undefined> {
    const [repair] = await db.select().from(repairs).where(eq(repairs.id, id));
    return repair;
  }
  
  async getRepairsByCustomerId(customerId: number): Promise<Repair[]> {
    return await db
      .select()
      .from(repairs)
      .where(eq(repairs.customerId, customerId))
      .orderBy(desc(repairs.createdAt));
  }
  
  // Generiert einen eindeutigen Auftragscode im Format: [Marke-Anfangsbuchstabe][Geräteart-Anfangsbuchstabe][4 zufällige Ziffern]
  // z.B. Apple Smartphone = AS1234
  private async generateUniqueOrderCode(brand: string, deviceType: string): Promise<string> {
    // Extrahiere den ersten Buchstaben der Marke und der Geräteart und konvertiere zu Großbuchstaben
    const brandInitial = brand.charAt(0).toUpperCase();
    const deviceInitial = deviceType.charAt(0).toUpperCase();
    const prefix = brandInitial + deviceInitial;
    
    // Prüfe, ob ein Auftragscode mit diesem Präfix bereits existiert
    const existingCodes = await db
      .select({ orderCode: repairs.orderCode })
      .from(repairs)
      .where(
        and(
          isNotNull(repairs.orderCode),
          like(repairs.orderCode, `${prefix}%`)
        )
      );
    
    // Extrahiere alle verwendeten Zahlenkombinationen
    const usedNumbers = new Set<string>();
    existingCodes.forEach(code => {
      if (code.orderCode && code.orderCode.length >= 6) {
        usedNumbers.add(code.orderCode.substring(2));
      }
    });
    
    // Generiere eine zufällige vierstellige Zahl, die noch nicht verwendet wurde
    let randomNum: string;
    do {
      randomNum = Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
    } while (usedNumbers.has(randomNum));
    
    return prefix + randomNum;
  }

  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const now = new Date();
    
    // Generiere einen eindeutigen Auftragscode
    const orderCode = await this.generateUniqueOrderCode(
      insertRepair.brand,
      insertRepair.deviceType
    );
    
    // Make sure status is set
    const repairData = {
      ...insertRepair,
      orderCode,
      status: insertRepair.status || 'eingegangen',
      createdAt: now,
      updatedAt: now
    };
    
    const [repair] = await db.insert(repairs)
      .values(repairData)
      .returning();
    
    return repair;
  }
  
  async updateRepair(id: number, repairUpdate: Partial<InsertRepair>): Promise<Repair | undefined> {
    const [updatedRepair] = await db
      .update(repairs)
      .set({
        ...repairUpdate,
        updatedAt: new Date()
      })
      .where(eq(repairs.id, id))
      .returning();
    
    return updatedRepair;
  }
  
  async updateRepairStatus(id: number, status: string): Promise<Repair | undefined> {
    const [updatedRepair] = await db
      .update(repairs)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(repairs.id, id))
      .returning();
    
    return updatedRepair;
  }
  
  async deleteRepair(id: number): Promise<boolean> {
    try {
      await db.delete(repairs).where(eq(repairs.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting repair:", error);
      return false;
    }
  }
  
  // Business settings methods
  async getBusinessSettings(): Promise<BusinessSettings | undefined> {
    const [settings] = await db.select().from(businessSettings);
    return settings;
  }
  
  async updateBusinessSettings(settingsData: Partial<InsertBusinessSettings>): Promise<BusinessSettings> {
    const existingSettings = await this.getBusinessSettings();
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(businessSettings)
        .set({
          ...settingsData,
          updatedAt: new Date()
        })
        .where(eq(businessSettings.id, existingSettings.id))
        .returning();
      
      return updatedSettings;
    } else {
      // Create new settings
      const [newSettings] = await db
        .insert(businessSettings)
        .values({
          ...settingsData as InsertBusinessSettings,
          updatedAt: new Date()
        })
        .returning();
      
      return newSettings;
    }
  }
  
  // Stats methods
  async getStats(): Promise<{ 
    totalOrders: number; 
    inRepair: number; 
    completed: number; 
    today: number;
    readyForPickup: number; 
    outsourced: number; 
  }> {
    // Get total number of orders
    const [totalResult] = await db
      .select({ count: count() })
      .from(repairs);
    
    // Get number of repairs in progress
    const [inRepairResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(eq(repairs.status, "in_reparatur"));
    
    // Get number of completed repairs
    const [completedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        or(
          eq(repairs.status, "fertig"),
          eq(repairs.status, "abgeholt")
        )
      );
    
    // Get number of repairs ready for pickup
    const [readyForPickupResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(eq(repairs.status, "fertig"));
      
    // Get number of outsourced repairs
    const [outsourcedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(eq(repairs.status, "ausser_haus"));
    
    // Get number of repairs created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [todayResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(
          gte(repairs.createdAt, today),
          lt(repairs.createdAt, tomorrow)
        )
      );
    
    return {
      totalOrders: totalResult?.count || 0,
      inRepair: inRepairResult?.count || 0,
      completed: completedResult?.count || 0,
      today: todayResult?.count || 0,
      readyForPickup: readyForPickupResult?.count || 0,
      outsourced: outsourcedResult?.count || 0,
    };
  }
  
  // Feedback methods
  async createFeedbackToken(repairId: number, customerId: number): Promise<string> {
    try {
      // Generiere einen einzigartigen Token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Prüfe, ob schon ein Feedback für diese Reparatur existiert
      const existingFeedbacks = await db
        .select()
        .from(feedbacks)
        .where(eq(feedbacks.repairId, repairId));
      
      if (existingFeedbacks.length > 0) {
        // Wenn bereits ein Feedback-Token existiert, gebe diesen zurück
        return existingFeedbacks[0].feedbackToken;
      }
      
      // Erstelle einen neuen Feedback-Eintrag mit dem Token
      await db.insert(feedbacks).values({
        repairId,
        customerId,
        rating: 0, // Platzhalter-Bewertung (0 bedeutet 'noch nicht bewertet')
        feedbackToken: token,
        createdAt: new Date()
      });
      
      return token;
    } catch (error) {
      console.error("Error creating feedback token:", error);
      throw new Error("Fehler beim Erstellen des Feedback-Tokens");
    }
  }
  
  async getFeedbackByToken(token: string): Promise<Feedback | undefined> {
    try {
      const [feedback] = await db
        .select()
        .from(feedbacks)
        .where(eq(feedbacks.feedbackToken, token));
      
      return feedback;
    } catch (error) {
      console.error("Error retrieving feedback by token:", error);
      return undefined;
    }
  }
  
  async submitFeedback(token: string, rating: number, comment?: string): Promise<Feedback | undefined> {
    try {
      // Prüfe, ob der Token existiert
      const existingFeedback = await this.getFeedbackByToken(token);
      
      if (!existingFeedback) {
        return undefined;
      }
      
      // Aktualisiere das Feedback
      const [updatedFeedback] = await db
        .update(feedbacks)
        .set({
          rating: rating,
          comment: comment || existingFeedback.comment
        })
        .where(eq(feedbacks.feedbackToken, token))
        .returning();
      
      return updatedFeedback;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      return undefined;
    }
  }
  
  async getFeedbacksByRepairId(repairId: number): Promise<Feedback[]> {
    try {
      return await db
        .select()
        .from(feedbacks)
        .where(eq(feedbacks.repairId, repairId));
    } catch (error) {
      console.error("Error retrieving feedbacks for repair:", error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
