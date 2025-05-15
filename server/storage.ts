import {
  users,
  type User,
  type InsertUser,
  customers,
  type Customer,
  type InsertCustomer,
  repairs,
  type Repair,
  type InsertRepair,
  businessSettings,
  type BusinessSettings,
  type InsertBusinessSettings,
  feedbacks,
  type Feedback,
  type InsertFeedback,
  emailTemplates,
  type EmailTemplate,
  type InsertEmailTemplate,
  emailHistory,
  type EmailHistory,
  type InsertEmailHistory,
  userDeviceTypes,
  type UserDeviceType,
  type InsertUserDeviceType,
  userBrands,
  type UserBrand,
  type InsertUserBrand,
  userModelSeries,
  type UserModelSeries,
  type InsertUserModelSeries,
  userModels,
  type UserModel,
  type InsertUserModel,
  costEstimates,
  type CostEstimate,
  type InsertCostEstimate,
  type CostEstimateItem,
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import {
  eq,
  desc,
  and,
  or,
  sql,
  gte,
  lt,
  lte,
  gt,
  count,
  isNotNull,
  isNull,
  like,
  SQL,
} from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { emailService } from "./email-service";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User methods (required by template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByShopId(shopId: number): Promise<User | undefined>;
  getUsersByEmail(email: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getSuperadmins(): Promise<User[]>;
  updateUser(
    id: number,
    userData: Partial<Omit<User, "id" | "password">>,
  ): Promise<User | undefined>;
  updateUserPassword(id: number, newPassword: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  createUser(user: InsertUser): Promise<User>;
  
  // Global device data methods for public access
  getGlobalDeviceTypes(): Promise<UserDeviceType[]>;
  getGlobalBrands(): Promise<UserBrand[]>;
  getGlobalBrandsByDeviceType(deviceTypeId: number): Promise<UserBrand[]>;
  getGlobalModels(): Promise<UserModel[]>;
  getGlobalModelsByBrand(brandId: number): Promise<UserModel[]>;
  getGlobalModelsByBrandAndDeviceType(brandId: number, deviceTypeId: number): Promise<UserModel[]>;

  // Customer methods
  getAllCustomers(userId: number): Promise<Customer[]>;
  getCustomer(id: number, userId: number): Promise<Customer | undefined>;
  findCustomersByName(firstName: string, lastName: string, userId: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer, userId: number): Promise<Customer>;
  updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
    userId: number,
  ): Promise<Customer | undefined>;
  deleteCustomer(id: number, userId: number): Promise<boolean>;

  // Repair methods
  getAllRepairs(userId: number): Promise<Repair[]>;
  getRepair(id: number, userId: number): Promise<Repair | undefined>;
  getRepairsByCustomerId(customerId: number, userId: number): Promise<Repair[]>;
  createRepair(repair: InsertRepair, userId: number): Promise<Repair>;
  updateRepair(
    id: number,
    repair: Partial<InsertRepair>,
    userId: number,
  ): Promise<Repair | undefined>;
  updateRepairStatus(id: number, status: string, userId: number): Promise<Repair | undefined>;
  updateRepairSignature(
    id: number,
    signature: string,
    userId: number,
  ): Promise<Repair | undefined>;
  deleteRepair(id: number, userId: number): Promise<boolean>;

  // Business settings methods
  getBusinessSettings(userId?: number): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(
    settings: Partial<InsertBusinessSettings>,
    userId?: number,
  ): Promise<BusinessSettings>;

  // Stats methods
  getStats(userId: number): Promise<{
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
    readyForPickup: number;
    outsourced: number;
    received: number; // Neu: Anzahl der eingegangenen Reparaturen
  }>;

  // Detaillierte Reparaturstatistiken für erweiterte Analysen
  getDetailedRepairStats(): Promise<{
    byDeviceType: Record<string, number>;
    byBrand: Record<string, number>;
    byIssue: Record<string, number>;
    mostRecentRepairs: Repair[];
    revenue: {
      total: number;
      byStatus: Record<string, number>;
      byMonth: Record<number, number>;
    };
  }>;

  // Feedback methods
  createFeedbackToken(repairId: number, customerId: number): Promise<string>;
  getFeedbackByToken(token: string): Promise<Feedback | undefined>;
  submitFeedback(
    token: string,
    rating: number,
    comment?: string,
  ): Promise<Feedback | undefined>;
  getFeedbacksByRepairId(repairId: number): Promise<Feedback[]>;

  // Email template methods
  getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]>;
  getEmailTemplate(
    id: number,
    userId?: number,
  ): Promise<EmailTemplate | undefined>;
  createEmailTemplate(
    template: InsertEmailTemplate,
    userId?: number,
  ): Promise<EmailTemplate>;
  updateEmailTemplate(
    id: number,
    template: Partial<InsertEmailTemplate>,
    userId?: number,
  ): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId?: number): Promise<boolean>;

  // Email sending method (with template)
  sendEmailWithTemplate(
    templateId: number,
    to: string,
    variables: Record<string, string>,
    userId?: number,
  ): Promise<boolean>;
  
  sendEmailWithTemplateById(
    templateId: number,
    to: string,
    variables: Record<string, string>,
    userId?: number,
  ): Promise<boolean>;

  // SMS-Funktionalität wurde auf Kundenwunsch entfernt

  // User device types methods
  getUserDeviceTypes(userId: number): Promise<UserDeviceType[]>;
  getUserDeviceType(
    id: number,
    userId: number,
  ): Promise<UserDeviceType | undefined>;
  createUserDeviceType(
    deviceType: InsertUserDeviceType,
    userId: number,
  ): Promise<UserDeviceType>;
  updateUserDeviceType(
    id: number,
    deviceType: Partial<InsertUserDeviceType>,
    userId: number,
  ): Promise<UserDeviceType | undefined>;
  deleteUserDeviceType(id: number, userId: number): Promise<boolean>;

  // User brands methods
  getUserBrands(userId: number): Promise<UserBrand[]>;
  getUserBrand(id: number, userId: number): Promise<UserBrand | undefined>;
  getUserBrandsByDeviceTypeId(
    deviceTypeId: number,
    userId: number,
  ): Promise<UserBrand[]>;
  createUserBrand(brand: InsertUserBrand, userId: number): Promise<UserBrand>;
  updateUserBrand(
    id: number,
    brand: Partial<InsertUserBrand>,
    userId: number,
  ): Promise<UserBrand | undefined>;
  deleteUserBrand(id: number, userId: number): Promise<boolean>;

  // User model series methods
  getUserModelSeries(userId: number): Promise<UserModelSeries[]>;
  getUserModelSeriesByBrandId(
    brandId: number,
    userId: number,
  ): Promise<UserModelSeries[]>;
  getUserModelSeriesByNameAndBrand(
    name: string,
    brandId: number,
    userId: number,
  ): Promise<UserModelSeries | undefined>;
  getUserModelSeries_ByDeviceTypeAndBrand(
    deviceTypeId: number,
    brandId: number,
    userId: number,
  ): Promise<UserModelSeries[]>;
  createUserModelSeries(
    modelSeries: InsertUserModelSeries,
    userId: number,
  ): Promise<UserModelSeries>;
  updateUserModelSeries(
    id: number,
    modelSeries: Partial<InsertUserModelSeries>,
    userId: number,
  ): Promise<UserModelSeries | undefined>;
  deleteUserModelSeries(id: number, userId: number): Promise<boolean>;
  deleteAllUserModelSeriesForBrand(
    brandId: number,
    userId: number,
  ): Promise<boolean>;

  // User models methods
  getUserModels(userId: number): Promise<UserModel[]>;
  getUserModelsByModelSeriesId(
    modelSeriesId: number,
    userId: number,
  ): Promise<UserModel[]>;
  getUserModelsByBrand(
    brandId: number,
    userId: number,
  ): Promise<UserModel[]>;
  createUserModel(model: InsertUserModel, userId: number): Promise<UserModel>;
  updateUserModel(
    id: number,
    model: Partial<InsertUserModel>,
    userId: number,
  ): Promise<UserModel | undefined>;
  deleteUserModel(id: number, userId: number): Promise<boolean>;
  deleteAllUserModelsForModelSeries(
    modelSeriesId: number,
    userId: number,
  ): Promise<boolean>;
  deleteAllUserModelsForBrand(
    brandId: number,
    userId: number,
  ): Promise<boolean>;

  // Kostenvoranschläge (CostEstimates) methods
  getAllCostEstimates(currentUserId?: number): Promise<CostEstimate[]>;
  getCostEstimate(
    id: number,
    currentUserId?: number,
  ): Promise<CostEstimate | undefined>;
  getCostEstimatesByCustomerId(
    customerId: number,
    currentUserId?: number,
  ): Promise<CostEstimate[]>;
  createCostEstimate(
    estimate: InsertCostEstimate,
    currentUserId?: number,
  ): Promise<CostEstimate>;
  updateCostEstimate(
    id: number,
    estimateUpdate: Partial<InsertCostEstimate>,
    currentUserId?: number,
  ): Promise<CostEstimate | undefined>;
  updateCostEstimateStatus(
    id: number,
    status: string,
    currentUserId?: number,
  ): Promise<CostEstimate | undefined>;
  deleteCostEstimate(id: number, currentUserId?: number): Promise<boolean>;
  convertToRepair(
    id: number,
    currentUserId?: number,
  ): Promise<Repair | undefined>;
}

/**
 * Hilfsfunktion zum Konvertieren von Rohergebnissen in typsichere User-Objekte
 */
function convertToUser(row: any): User {
  return {
    id: Number(row.id),
    username: String(row.username),
    password: String(row.password),
    email: String(row.email),
    isActive: Boolean(row.is_active),
    isAdmin: Boolean(row.is_admin),
    isSuperadmin: Boolean(row.is_superadmin),
    pricingPlan: row.pricing_plan ? String(row.pricing_plan) : null,
    shopId: row.shop_id ? Number(row.shop_id) : null,
    companyName: row.company_name ? String(row.company_name) : null,
    companyAddress: row.company_address ? String(row.company_address) : null,
    companyVatNumber: row.company_vat_number
      ? String(row.company_vat_number)
      : null,
    companyPhone: row.company_phone ? String(row.company_phone) : null,
    companyEmail: row.company_email ? String(row.company_email) : null,
    resetToken: row.reset_token ? String(row.reset_token) : null,
    resetTokenExpires: row.reset_token_expires
      ? new Date(row.reset_token_expires)
      : null,
    createdAt: new Date(row.created_at),
    featureOverrides: row.feature_overrides,
    packageId: row.package_id ? Number(row.package_id) : null,
  };
}

export class DatabaseStorage implements IStorage {
  // Session store
  sessionStore: session.Store;
  
  constructor() {
    // Initialize session store with PostgreSQL
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
  }
  
  // Holt aktive Support-Zugriffslogs für Support-Modus-Protokollierung
  async getActiveSupportAccessLogs(userId: number, shopId: number) {
    try {
      return await db
        .select()
        .from(supportAccessLogs)
        .where(
          and(
            eq(supportAccessLogs.superadminId, userId),
            eq(supportAccessLogs.shopId, shopId),
            eq(supportAccessLogs.isActive, true),
            eq(supportAccessLogs.status, 'approved') // Nur genehmigte Anfragen
          )
        );
    } catch (error) {
      console.error("Fehler beim Abrufen der aktiven Support-Zugriffslogger:", error);
      return [];
    }
  }
  
  // Implementierung der User-Methoden
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      
      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }
  
  async getUserByShopId(shopId: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.shopId, shopId));
      
      return user;
    } catch (error) {
      console.error("Error getting user by shop ID:", error);
      return undefined;
    }
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    try {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      return results;
    } catch (error) {
      console.error("Error getting users by email:", error);
      return [];
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const results = await db
        .select()
        .from(users)
        .orderBy(users.username);
      
      return results;
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async updateUser(
    id: number,
    userData: Partial<Omit<User, "id" | "password">>,
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ password: newPassword })
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error updating user password:", error);
      return false;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await db
        .delete(users)
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values(user)
        .returning();
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  
  // Superadmin-Benutzer abfragen
  async getSuperadmins(): Promise<User[]> {
    try {
      const superadmins = await db
        .select()
        .from(users)
        .where(eq(users.isSuperadmin, true));
      
      console.log(`Gefunden: ${superadmins.length} Superadmin-Benutzer im System`);
      return superadmins;
    } catch (error) {
      console.error("Fehler beim Abfragen der Superadmins:", error);
      return [];
    }
  }

  // Implementierung der Kunden-Methoden mit userId-Parameter für Shop-Isolation
  async getAllCustomers(userId: number): Promise<Customer[]> {
    try {
      console.log(`getAllCustomers: Benutzer mit ID ${userId} angefragt`);
      const user = await this.getUser(userId);
      if (!user) return [];

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return [];
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        // Wir importieren die Funktion hasActiveSupportAccess dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
        const { hasActiveSupportAccess } = await import('./support-access');
        
        // Prüfe, ob ein aktiver Support-Zugriff besteht - nur dann darf ein Superadmin auf Kundendaten zugreifen
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return [];
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getAllCustomers: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId} - isAdmin: ${user.isAdmin}`);

      const results = await db
        .select()
        .from(customers)
        .where(eq(customers.shopId, shopId))
        .orderBy(customers.lastName, customers.firstName);

      console.log(`Returning all ${results.length} customers`);
      return results;
    } catch (error) {
      console.error("Error getting all customers:", error);
      return [];
    }
  }

  async getCustomer(id: number, userId: number): Promise<Customer | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        // Wir importieren die Funktion hasActiveSupportAccess dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
        const { hasActiveSupportAccess } = await import('./support-access');
        
        // Prüfe, ob ein aktiver Support-Zugriff besteht - nur dann darf ein Superadmin auf Kundendaten zugreifen
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return undefined;
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;

      const [result] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.shopId, shopId)));

      return result;
    } catch (error) {
      console.error("Error getting customer:", error);
      return undefined;
    }
  }

  async findCustomersByName(firstName: string, lastName: string, userId: number): Promise<Customer[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return [];
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        // Wir importieren die Funktion hasActiveSupportAccess dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
        const { hasActiveSupportAccess } = await import('./support-access');
        
        // Prüfe, ob ein aktiver Support-Zugriff besteht - nur dann darf ein Superadmin auf Kundendaten zugreifen
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return [];
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;

      let query = db
        .select()
        .from(customers)
        .where(eq(customers.shopId, shopId));

      if (firstName) {
        query = query.where(sql`LOWER(${customers.firstName}) LIKE LOWER(${'%' + firstName + '%'})`);
      }

      if (lastName) {
        query = query.where(sql`LOWER(${customers.lastName}) LIKE LOWER(${'%' + lastName + '%'})`);
      }

      return await query.orderBy(customers.lastName, customers.firstName);
    } catch (error) {
      console.error("Error finding customers by name:", error);
      return [];
    }
  }

  // Reparatur-Methoden mit userId-Parameter
  async getAllRepairs(userId: number): Promise<Repair[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return [];
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        // Wir importieren die Funktion hasActiveSupportAccess dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
        const { hasActiveSupportAccess } = await import('./support-access');
        
        // Prüfe, ob ein aktiver Support-Zugriff besteht - nur dann darf ein Superadmin auf Reparaturdaten zugreifen
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return [];
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getAllRepairs: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId} - isAdmin: ${user.isAdmin}`);

      const results = await db
        .select()
        .from(repairs)
        .where(eq(repairs.shopId, shopId))
        .orderBy(desc(repairs.createdAt));

      return results;
    } catch (error) {
      console.error("Error getting all repairs:", error);
      return [];
    }
  }

  async getRepair(id: number, userId: number): Promise<Repair | undefined> {
    try {
      console.log(`getRepair: Abrufen der Reparatur ID ${id} für Benutzer ${userId}`);
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`getRepair: Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }

      // Für alle Benutzer: DSGVO-Fix - Wenn keine Shop-ID vorhanden ist, undefined zurückgeben
      if (!user.shopId) {
        console.warn(`❌ getRepair: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        // Wir importieren die Funktion hasActiveSupportAccess dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
        const { hasActiveSupportAccess } = await import('./support-access');
        
        // Prüfe, ob ein aktiver Support-Zugriff besteht - nur dann darf ein Superadmin auf Reparaturdaten zugreifen
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return undefined;
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getRepair: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId}`);

      const [repair] = await db
        .select()
        .from(repairs)
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, shopId)
          )
        );

      if (repair) {
        console.log(`getRepair: Reparatur ${id} gefunden für Benutzer ${userId}`);
      } else {
        console.warn(`getRepair: Reparatur ${id} wurde nicht gefunden oder gehört nicht zu Shop ${shopId}`);
      }

      return repair;
    } catch (error) {
      console.error(`Error getting repair ${id}:`, error);
      return undefined;
    }
  }

  async getRepairsByCustomerId(customerId: number, userId: number): Promise<Repair[]> {
    try {
      console.log(`getRepairsByCustomerId: Abrufen der Reparaturen für Kunde ${customerId} (Benutzer ${userId})`);
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`getRepairsByCustomerId: Benutzer mit ID ${userId} nicht gefunden.`);
        return [];
      }

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ getRepairsByCustomerId: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return [];
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        // Wir importieren die Funktion hasActiveSupportAccess dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
        const { hasActiveSupportAccess } = await import('./support-access');
        
        // Prüfe, ob ein aktiver Support-Zugriff besteht - nur dann darf ein Superadmin auf Reparaturdaten zugreifen
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return [];
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getRepairsByCustomerId: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId}`);

      const results = await db
        .select()
        .from(repairs)
        .where(
          and(
            eq(repairs.customerId, customerId),
            eq(repairs.shopId, shopId)
          )
        )
        .orderBy(desc(repairs.createdAt));

      return results;
    } catch (error) {
      console.error(`Error getting repairs for customer ${customerId}:`, error);
      return [];
    }
  }

  // Geschäftseinstellungen
  async getBusinessSettings(userId?: number): Promise<BusinessSettings | undefined> {
    try {
      if (!userId) {
        return undefined;
      }

      console.log(`NEUE IMPLEMENTATION: Fetching business settings for user ${userId}`);
      
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }

      // Superadmin-Fall: Für Superadmins werden Default-Einstellungen zurückgegeben oder erstellt
      if (user.isSuperadmin) {
        console.log(`Superadmin-Benutzer gefunden: ID=${user.id}, username=${user.username}, shopId=${user.shopId}`);
        
        // Superadmin-Einstellungen suchen (könnten bereits existieren)
        const [superadminSettings] = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.userId, userId));
          
        if (superadminSettings) {
          console.log(`Bestehende Superadmin-Einstellungen gefunden: ID ${superadminSettings.id}`);
          return superadminSettings;
        }
        
        // Keine Einstellungen gefunden - Default-Einstellungen für Superadmin erstellen
        console.log(`Keine Einstellungen für Superadmin ${user.username} gefunden, erstelle Standard-Superadmin-Einstellungen`);
        
        // Hier würden wir normalerweise Default-Einstellungen erstellen, aber für den Moment
        // geben wir nur eine Warnung aus, da die Einstellungen ohne Shop-ID nicht gespeichert werden können
        return undefined;
      }

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }

      console.log(`Suche nach Geschäftseinstellungen für Benutzer ${user.username} (ID ${userId}, Shop ${user.shopId})`);
      
      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;

      // GEÄNDERT: Wir filtern NUR nach shopId, um die Shopeinstellungen für ALLE Benutzer des Shops
      // zugänglich zu machen. Die Datenisolation zwischen Shops bleibt gewährleistet.
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.shopId, shopId));

      if (settings) {
        console.log(`Gefunden: Einstellungen mit ID ${settings.id} für Shop ${shopId}`);
        console.log(`Einstellungen für Shop ${shopId} gefunden: ID ${settings.id}`);
      } else {
        console.log(`Keine Einstellungen für Shop ${shopId} gefunden.`);
      }

      return settings;
    } catch (error) {
      console.error("Error getting business settings:", error);
      return undefined;
    }
  }

  async updateBusinessSettings(
    settings: Partial<InsertBusinessSettings>,
    userId?: number,
  ): Promise<BusinessSettings> {
    try {
      if (!userId) {
        throw new Error("User ID muss angegeben werden");
      }

      console.log(`NEUE IMPLEMENTATION: Updating business settings for user ${userId}`);
      
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden.`);
      }

      // Spezialfall: Superadmin darf Einstellungen auch ohne Shop-ID aktualisieren
      if (user.isSuperadmin) {
        console.log(`Superadmin-Benutzer aktualisiert Einstellungen: ID=${user.id}, username=${user.username}`);
        
        // Prüfen, ob bereits Einstellungen für diesen Superadmin existieren
        const [existingSuperadminSettings] = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.userId, userId));
          
        if (existingSuperadminSettings) {
          console.log(`Bestehende Superadmin-Einstellungen gefunden: ID ${existingSuperadminSettings.id}`);
          
          // Einstellungen aktualisieren
          const [updatedSettings] = await db
            .update(businessSettings)
            .set({
              ...settings,
              updatedAt: new Date(),
              userId: userId,
              // Verwende die vorhandene Shop-ID, wenn die Einstellungen bereits eine hatten
              shopId: existingSuperadminSettings.shopId
            })
            .where(eq(businessSettings.id, existingSuperadminSettings.id))
            .returning();
          
          console.log(`Superadmin-Einstellungen aktualisiert: ID ${updatedSettings.id}`);
          return updatedSettings;
        } else if (user.shopId) {
          // Wenn der Superadmin eine Shop-ID hat, erstellen wir neue Einstellungen
          console.log(`Erstelle neue Einstellungen für Superadmin mit Shop-ID ${user.shopId}`);
          
          // Neue Einstellungen erstellen
          const [newSettings] = await db
            .insert(businessSettings)
            .values({
              businessName: settings.businessName || "",
              city: settings.city || "",
              zipCode: settings.zipCode || "",
              phone: settings.phone || "",
              email: settings.email || "",
              website: settings.website || "",
              // Für Superadmin hier weitere Felder einfügen - oder besser als any casten
              ...(settings as any),
              shopId: user.shopId,
              userId: userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          
          console.log(`Neue Superadmin-Einstellungen erstellt: ID ${newSettings.id}`);
          return newSettings;
        } else {
          // Der Superadmin hat keine Shop-ID, wir können keine Einstellungen erstellen
          throw new Error("Superadmin benötigt eine Shop-ID, um neue Einstellungen zu erstellen");
        }
      }

      // Regulärer Benutzer (nicht Superadmin)
      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, Fehler werfen statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        throw new Error(`Benutzer ${user.username} hat keine Shop-Zuordnung`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;

      // Prüfen, ob Einstellungen für diesen Shop bereits existieren
      const existingSettings = await this.getBusinessSettings(userId);

      if (existingSettings) {
        // Einstellungen aktualisieren
        const [updatedSettings] = await db
          .update(businessSettings)
          .set({
            ...settings,
            updatedAt: new Date(),
          })
          .where(eq(businessSettings.id, existingSettings.id))
          .returning();

        console.log(`Geschäftseinstellungen für Shop ${shopId} aktualisiert: ID ${updatedSettings.id}`);
        return updatedSettings;
      } else {
        // Neue Einstellungen erstellen
        const [newSettings] = await db
          .insert(businessSettings)
          .values({
            businessName: settings.businessName || "",
            street: settings.street || "",
            city: settings.city || "",
            zipCode: settings.zipCode || "",
            phone: settings.phone || "",
            email: settings.email || "",
            website: settings.website || "",
            vatId: settings.vatId || "",
            taxNumber: settings.taxNumber || "",
            bankName: settings.bankName || "",
            iban: settings.iban || "",
            bic: settings.bic || "",
            logoUrl: settings.logoUrl || "",
            footerText: settings.footerText || "",
            repairTerms: settings.repairTerms || "",
            termsAndConditions: settings.termsAndConditions || "",
            receiptText: settings.receiptText || "",
            invoiceTemplate: settings.invoiceTemplate || "",
            shopId: shopId,
            userId: userId,
            color: settings.color || "#3b82f6",
            businessCurrency: settings.businessCurrency || "EUR",
            businessCountry: settings.businessCountry || "Deutschland"
          })
          .returning();

        console.log(`Neue Geschäftseinstellungen für Shop ${shopId} erstellt: ID ${newSettings.id}`);
        return newSettings;
      }
    } catch (error) {
      console.error("Error updating business settings:", error);
      throw error;
    }
  }

  // Statistiken abhängig vom Benutzer
  async getStats(userId: number): Promise<{
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
    readyForPickup: number;
    outsourced: number;
    received: number;
  }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return {
          totalOrders: 0,
          inRepair: 0,
          completed: 0,
          today: 0,
          readyForPickup: 0,
          outsourced: 0,
          received: 0
        };
      }

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Statistik zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return {
          totalOrders: 0,
          inRepair: 0,
          completed: 0,
          today: 0,
          readyForPickup: 0,
          outsourced: 0,
          received: 0
        };
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getStats: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId} - isAdmin: ${user.isAdmin}`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(eq(repairs.shopId, shopId));

      const [inRepairResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'in-reparatur')
        ));

      const [completedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'fertig')
        ));

      const [todayResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          gte(repairs.createdAt, today)
        ));

      const [readyForPickupResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'abholbereit')
        ));

      const [outsourcedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'ausgelagert')
        ));

      const [receivedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'angenommen')
        ));

      const totalOrders = Number(countResult?.count) || 0;
      const inRepair = Number(inRepairResult?.count) || 0;
      const completed = Number(completedResult?.count) || 0;
      const todayCount = Number(todayResult?.count) || 0;
      const readyForPickup = Number(readyForPickupResult?.count) || 0;
      const outsourced = Number(outsourcedResult?.count) || 0;
      const received = Number(receivedResult?.count) || 0;

      return {
        totalOrders,
        inRepair,
        completed,
        today: todayCount,
        readyForPickup,
        outsourced,
        received
      };
    } catch (error) {
      console.error("Error getting repair stats:", error);
      return {
        totalOrders: 0,
        inRepair: 0,
        completed: 0,
        today: 0,
        readyForPickup: 0,
        outsourced: 0,
        received: 0
      };
    }
  }
  
  // Findet eine System-E-Mail-Vorlage anhand des Namens
  async findSystemEmailTemplateIdByName(name: string): Promise<number | undefined> {
    try {
      // Suche nach der E-Mail-Vorlage für System-E-Mails (type = 'app')
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(
          and(
            sql`LOWER(${emailTemplates.name}) LIKE ${`%${name.toLowerCase()}%`}`,
            eq(emailTemplates.type, 'app')
          )
        );
      
      if (template) {
        console.log(`Systemvorlage "${name}" gefunden: ID=${template.id}`);
        return template.id;
      } else {
        console.warn(`Systemvorlage "${name}" nicht gefunden`);
        return undefined;
      }
    } catch (error) {
      console.error(`Fehler beim Suchen der Systemvorlage "${name}":`, error);
      return undefined;
    }
  }
  // Hilfsfunktion: Extrahiert eine Zahl aus einem String (z.B. "€ 150,99" -> 150.99)
  private extractNumberFromString(input: string): number {
    if (!input) return 0;

    // Entferne Währungssymbole, Kommas und andere nicht-numerische Zeichen
    // Behalte Zahlen, Punkte und Kommas
    const cleaned = input.replace(/[^0-9.,]/g, "");

    // Ersetze Kommas durch Punkte für die Umwandlung in eine Zahl
    const normalized = cleaned.replace(",", ".");

    // Wandle in Zahl um, gib 0 zurück, wenn keine Zahl gefunden wurde
    const number = parseFloat(normalized);
    return isNaN(number) ? 0 : number;
  }

  // Bereits im ersten constructor definiert

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Versuche zuerst, mit dem vollen Schema zu holen
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      // Debugging-Ausgabe für den Superadmin
      if (user && user.isSuperadmin) {
        console.log(`Superadmin-Benutzer gefunden: ID=${user.id}, username=${user.username}, shopId=${user.shopId}`);
      }
      
      return user;
    } catch (error) {
      // Wenn ein Fehler auftritt (z.B. fehlende Spalte), versuche es mit einer Raw-Abfrage
      console.log(`Fehler beim Abrufen des Benutzers mit ID ${id}:`, error);
      console.log("Verwende Fallback-Abfrage für Benutzer...");

      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, is_superadmin, pricing_plan, 
               shop_id, company_name, company_address, company_vat_number,
               company_phone, company_email, reset_token, reset_token_expires,
               created_at, feature_overrides, package_id
        FROM users
        WHERE id = ${id}
      `);

      if (result.rows.length === 0) return undefined;
      
      // Verwende die Hilfsfunktion zur Konvertierung
      const user = convertToUser(result.rows[0]);
      
      // Debugging-Ausgabe für den Superadmin
      if (user.isSuperadmin) {
        console.log(`Superadmin-Benutzer gefunden (Fallback): ID=${user.id}, username=${user.username}, shopId=${user.shopId}`);
      }
      
      return user;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      return user;
    } catch (error) {
      console.log(
        `Fehler beim Abrufen des Benutzers mit Username ${username}:`,
        error,
      );
      console.log("Verwende Fallback-Abfrage für Benutzer...");

      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, is_superadmin, pricing_plan, 
               shop_id, company_name, company_address, company_vat_number,
               company_phone, company_email, reset_token, reset_token_expires,
               created_at, feature_overrides, package_id
        FROM users
        WHERE username = ${username}
      `);

      if (result.rows.length === 0) return undefined;

      // Verwende die Hilfsfunktion zur Konvertierung
      return convertToUser(result.rows[0]);
    }
  }

  async getUsersByEmail(email: string): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.email, email));
    } catch (error) {
      console.log(
        `Fehler beim Abrufen der Benutzer mit Email ${email}:`,
        error,
      );
      console.log("Verwende Fallback-Abfrage...");

      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, is_superadmin, pricing_plan, 
               shop_id, company_name, company_address, company_vat_number,
               company_phone, company_email, reset_token, reset_token_expires,
               created_at, feature_overrides, package_id
        FROM users
        WHERE email = ${email}
      `);

      return result.rows.map((row) => convertToUser(row));
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.log(
        `Fehler beim Abrufen des Benutzers mit Email ${email}:`,
        error,
      );
      console.log("Verwende Fallback-Abfrage für Benutzer...");

      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, is_superadmin, pricing_plan, 
               shop_id, company_name, company_address, company_vat_number,
               company_phone, company_email, reset_token, reset_token_expires,
               created_at, feature_overrides, package_id
        FROM users
        WHERE email = ${email}
        LIMIT 1
      `);

      if (result.rows.length === 0) return undefined;

      // Verwende die Hilfsfunktion zur Konvertierung
      return convertToUser(result.rows[0]);
    }
  }

  async getAllUsers(currentUserId?: number): Promise<User[]> {
    // Wenn keine Benutzer-ID angegeben ist, versuche den Standard-Admin zu laden
    const currentUser = currentUserId
      ? await this.getUser(currentUserId)
      : await this.getUserByUsername("bugi");

    if (!currentUser) return [];

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
    if (!currentUser.shopId) {
      console.warn(`❌ Benutzer ${currentUser.username} (ID: ${currentUser.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
      return [];
    }
    
    // Jeder Benutzer, auch Admin, sieht nur Benutzer aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId;
    return await db
      .select()
      .from(users)
      .where(eq(users.shopId, shopIdValue))
      .orderBy(desc(users.createdAt));
  }

  async updateUser(
    id: number,
    userData: Partial<Omit<User, "id" | "password">>,
    currentUserId?: number,
  ): Promise<User | undefined> {
    // Prüfe Berechtigungen: Nur Benutzer aus dem eigenen Shop können bearbeitet werden
    if (!currentUserId) return undefined;

    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben statt Fallback auf Shop 1
    if (!currentUser.shopId) {
      console.warn(`❌ Benutzer ${currentUser.username} (ID: ${currentUser.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
      return undefined;
    }

    // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
    const shopIdValue = currentUser.shopId;
    const whereCondition = and(
      eq(costEstimates.id, id),
      eq(costEstimates.shopId, shopIdValue),
    ) as SQL<unknown>;

    const [updatedEstimate] = await db
      .update(costEstimates)
      .set(updateData)
      .where(whereCondition)
      .returning();

    return updatedEstimate;
  }

  async updateCostEstimateStatus(
    id: number,
    status: string,
    currentUserId?: number,
  ): Promise<CostEstimate | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }

    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben statt Fallback auf Shop 1
    if (!currentUser.shopId) {
      console.warn(`❌ Benutzer ${currentUser.username} (ID: ${currentUser.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
      return undefined;
    }

    // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
    const shopIdValue = currentUser.shopId;
    const whereCondition = and(
      eq(costEstimates.id, id),
      eq(costEstimates.shopId, shopIdValue),
    ) as SQL<unknown>;

    const [updatedEstimate] = await db
      .update(costEstimates)
      .set(updateData)
      .where(whereCondition)
      .returning();

    return updatedEstimate;
  }

  async deleteCostEstimate(
    id: number,
    currentUserId?: number,
  ): Promise<boolean> {
    try {
      if (!currentUserId) {
        return false; // Wenn keine Benutzer-ID angegeben ist, gebe false zurück
      }

      // Benutzer holen, um Shop-ID zu erhalten
      const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;

    // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben statt Fallback auf Shop 1
    if (!currentUser.shopId) {
      console.warn(`❌ Benutzer ${currentUser.username} (ID: ${currentUser.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
      return undefined;
    }

    // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
    const shopIdValue = currentUser.shopId;
      const whereCondition = and(
        eq(costEstimates.id, id),
        eq(costEstimates.shopId, shopIdValue),
      ) as SQL<unknown>;

      // Kostenvoranschlag als umgewandelt markieren
      await db
        .update(costEstimates)
        .set({
          convertedToRepair: true,
          repairId: repair.id,
          updatedAt: new Date(),
        })
        .where(whereCondition);

      return repair;
    } catch (error) {
      console.error("Error converting cost estimate to repair:", error);
      return undefined;
    }
  }

  // Global device data methods for public access
  async getGlobalDeviceTypes(): Promise<UserDeviceType[]> {
    try {
      // Holen alle Gerätetypen vom Superadmin mit Shop-ID 1682
      const results = await db
        .select()
        .from(userDeviceTypes)
        .where(
          and(
            eq(userDeviceTypes.userId, 10), // Superadmin-ID
            eq(userDeviceTypes.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .orderBy(userDeviceTypes.name);
      
      console.log(`Globale Gerätetypen (Shop 1682): ${results.length} gefunden`);
      return results;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Gerätetypen:', error);
      return [];
    }
  }

  async getGlobalBrands(): Promise<UserBrand[]> {
    try {
      // Holen alle Marken vom Superadmin mit Shop-ID 1682
      const results = await db
        .select()
        .from(userBrands)
        .where(
          and(
            eq(userBrands.userId, 10), // Superadmin-ID
            eq(userBrands.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .orderBy(userBrands.name);
      
      console.log(`Globale Marken (Shop 1682): ${results.length} gefunden`);
      return results;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Marken:', error);
      return [];
    }
  }

  async getGlobalBrandsByDeviceType(deviceTypeId: number): Promise<UserBrand[]> {
    try {
      // Holen alle Marken vom Superadmin mit Shop-ID 1682 für einen bestimmten Gerätetyp
      const results = await db
        .select()
        .from(userBrands)
        .where(
          and(
            eq(userBrands.deviceTypeId, deviceTypeId),
            eq(userBrands.userId, 10), // Superadmin-ID
            eq(userBrands.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .orderBy(userBrands.name);
      
      console.log(`Globale Marken für Gerätetyp ${deviceTypeId} (Shop 1682): ${results.length} gefunden`);
      return results;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Marken nach Gerätetyp:', error);
      return [];
    }
  }

  async getGlobalModels(): Promise<UserModel[]> {
    try {
      // Holen alle Modelle vom Superadmin mit Shop-ID 1682
      const results = await db
        .select()
        .from(userModels)
        .where(
          and(
            eq(userModels.userId, 10), // Superadmin-ID
            eq(userModels.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .orderBy(userModels.name);
      
      console.log(`Globale Modelle (Shop 1682): ${results.length} gefunden`);
      return results;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Modelle:', error);
      return [];
    }
  }

  async getGlobalModelsByBrand(brandId: number): Promise<UserModel[]> {
    try {
      // Holen alle Modelle vom Superadmin mit Shop-ID 1682 für eine bestimmte Marke
      const results = await db
        .select()
        .from(userModels)
        .where(
          and(
            eq(userModels.brandId, brandId),
            eq(userModels.userId, 10), // Superadmin-ID
            eq(userModels.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .orderBy(userModels.name);
      
      console.log(`Globale Modelle für Marke ${brandId} (Shop 1682): ${results.length} gefunden`);
      return results;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Modelle nach Marke:', error);
      return [];
    }
  }
  
  async getGlobalModelsByBrandAndDeviceType(brandId: number, deviceTypeId: number): Promise<UserModel[]> {
    try {
      // Zuerst die Marke abrufen, um zu überprüfen, ob sie zum Gerätetyp passt
      const brand = await db
        .select()
        .from(userBrands)
        .where(
          and(
            eq(userBrands.id, brandId),
            eq(userBrands.deviceTypeId, deviceTypeId),
            eq(userBrands.userId, 10), // Superadmin-ID
            eq(userBrands.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .limit(1);
      
      if (brand.length === 0) {
        console.log(`Keine Marke mit ID ${brandId} für Gerätetyp ${deviceTypeId} in Shop 1682 gefunden`);
        return [];
      }
      
      // Alle Modelle vom Superadmin mit Shop-ID 1682 für die angegebene Marke abrufen
      // Da die Marke bereits auf den Gerätetyp gefiltert wurde, müssen wir bei den Modellen
      // nicht noch einmal nach dem Gerätetyp filtern
      const results = await db
        .select()
        .from(userModels)
        .where(
          and(
            eq(userModels.brandId, brandId),
            eq(userModels.userId, 10), // Superadmin-ID
            eq(userModels.shopId, 1682) // Feste Shop-ID für globale Gerätedaten
          )
        )
        .orderBy(userModels.name);
      
      console.log(`Globale Modelle für Marke ${brandId} und Gerätetyp ${deviceTypeId} (Shop 1682): ${results.length} gefunden`);
      return results;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen Modelle nach Marke und Gerätetyp:', error);
      return [];
    }
  }

  // E-Mail-Verlauf Methoden
  async getEmailHistoryForRepair(
    repairId: number,
    currentUserId?: number,
  ): Promise<(EmailHistory & { templateName?: string })[]> {
    try {
      console.log(`Suche E-Mail-Verlauf für Reparatur ${repairId}`);

      // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
      if (!currentUserId) {
        console.log("Keine Benutzer-ID angegeben, gebe leere Liste zurück");
        return [];
      }

      // Benutzer holen, um Shop-ID zu erhalten
      const currentUser = await this.getUser(currentUserId);
      if (!currentUser) {
        console.log(
          `Benutzer mit ID ${currentUserId} nicht gefunden, gebe leere Liste zurück`,
        );
        return [];
      }

      // Shop-ID des Benutzers ermitteln für Shop-Isolation
      const shopIdValue = currentUser.shopId /* DSGVO-Fix: Fallback auf Shop 1 entfernt */;

      // Zuerst prüfen, ob die Reparatur zum Shop des Benutzers gehört
      const repair = await this.getRepair(repairId, currentUserId);
      if (!repair) {
        console.log(
          `Reparatur ${repairId} nicht gefunden oder nicht im Shop ${shopIdValue} des Benutzers ${currentUserId}`,
        );
        return [];
      }

      // JOIN-Abfrage, um auch den Namen der Vorlagen zu laden
      // Jetzt mit zusätzlichem Filter für die Shop-ID (DSGVO-konform)
      const query = `
        SELECT 
          h.*, 
          t.name as "templateName" 
        FROM 
          "email_history" h 
        LEFT JOIN 
          "email_templates" t ON h."emailTemplateId" = t.id 
        WHERE 
          h."repairId" = ${repairId} AND
          h."shop_id" = ${shopIdValue}
        ORDER BY 
          h."sentAt" DESC
      `;

      const result = await db.execute(query);

      console.log(`Gefundener E-Mail-Verlauf:`, result.rows);
      return result.rows as (EmailHistory & { templateName?: string })[];
    } catch (error) {
      console.error("Error getting email history for repair:", error);
      return [];
    }
  }

  async createEmailHistoryEntry(
    entry: InsertEmailHistory,
  ): Promise<EmailHistory> {
    try {
      console.log("Erstelle E-Mail-Verlaufseintrag in der Datenbank:", entry);
      console.log(
        "RepairId Typ:",
        typeof entry.repairId,
        "Wert:",
        entry.repairId,
      );

      // Stelle sicher, dass ein Benutzer vorhanden ist, um Shop-ID zu setzen
      let shopId = 1; // Standardwert, falls keine Benutzer-ID angegeben ist

      if (entry.userId) {
        const user = await this.getUser(Number(entry.userId));
        if (user && user.shopId) {
          shopId = user.shopId;
          console.log(
            `Benutzer mit ID ${entry.userId} gefunden, setze Shop-ID auf ${shopId}`,
          );
        }
      }

      // Verwende Drizzle ORM für die Datenbankoperation mit Shop-Isolation
      const [result] = await db
        .insert(emailHistory)
        .values({
          repairId: Number(entry.repairId), // Stelle sicher, dass es eine Zahl ist
          emailTemplateId: entry.emailTemplateId
            ? Number(entry.emailTemplateId)
            : null,
          subject: entry.subject,
          recipient: entry.recipient,
          status: entry.status,
          userId: entry.userId ? Number(entry.userId) : null,
          shopId: shopId, // Wichtig für die Shop-Isolation
        })
        .returning();

      console.log("Erstellter E-Mail-Verlaufseintrag:", result);
      return result;
    } catch (error) {
      console.error("Error creating email history entry:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
