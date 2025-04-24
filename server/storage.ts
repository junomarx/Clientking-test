import { 
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  repairs, type Repair, type InsertRepair
} from "@shared/schema";

export interface IStorage {
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private repairs: Map<number, Repair>;
  
  private userCurrentId: number;
  private customerCurrentId: number;
  private repairCurrentId: number;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.repairs = new Map();
    
    this.userCurrentId = 1;
    this.customerCurrentId = 1;
    this.repairCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Customer methods
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.customerCurrentId++;
    const now = new Date();
    const customer: Customer = { 
      ...insertCustomer, 
      id, 
      createdAt: now 
    };
    this.customers.set(id, customer);
    return customer;
  }
  
  async updateCustomer(id: number, customerUpdate: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer: Customer = {
      ...customer,
      ...customerUpdate
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }
  
  // Repair methods
  async getAllRepairs(): Promise<Repair[]> {
    return Array.from(this.repairs.values());
  }
  
  async getRepair(id: number): Promise<Repair | undefined> {
    return this.repairs.get(id);
  }
  
  async getRepairsByCustomerId(customerId: number): Promise<Repair[]> {
    return Array.from(this.repairs.values()).filter(
      (repair) => repair.customerId === customerId
    );
  }
  
  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const id = this.repairCurrentId++;
    const now = new Date();
    const repair: Repair = { 
      ...insertRepair, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.repairs.set(id, repair);
    return repair;
  }
  
  async updateRepair(id: number, repairUpdate: Partial<InsertRepair>): Promise<Repair | undefined> {
    const repair = this.repairs.get(id);
    if (!repair) return undefined;
    
    const updatedRepair: Repair = {
      ...repair,
      ...repairUpdate,
      updatedAt: new Date()
    };
    
    this.repairs.set(id, updatedRepair);
    return updatedRepair;
  }
  
  async updateRepairStatus(id: number, status: string): Promise<Repair | undefined> {
    const repair = this.repairs.get(id);
    if (!repair) return undefined;
    
    const updatedRepair: Repair = {
      ...repair,
      status,
      updatedAt: new Date()
    };
    
    this.repairs.set(id, updatedRepair);
    return updatedRepair;
  }
  
  async deleteRepair(id: number): Promise<boolean> {
    return this.repairs.delete(id);
  }
  
  // Stats methods
  async getStats(): Promise<{ totalOrders: number; inRepair: number; completed: number; today: number; }> {
    const repairs = Array.from(this.repairs.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      totalOrders: repairs.length,
      inRepair: repairs.filter(r => r.status === "in_reparatur").length,
      completed: repairs.filter(r => r.status === "fertig" || r.status === "abgeholt").length,
      today: repairs.filter(r => {
        const createdDate = new Date(r.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === today.getTime();
      }).length
    };
  }
}

export const storage = new MemStorage();
