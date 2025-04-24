import { 
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  repairs, type Repair, type InsertRepair
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lt, count } from "drizzle-orm";
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
  
  // Stats methods
  getStats(): Promise<{
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
  }>;
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
  
  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const now = new Date();
    
    // Make sure status is set
    const repairData = {
      ...insertRepair,
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
}

export const storage = new DatabaseStorage();
