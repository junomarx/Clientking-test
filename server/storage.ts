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
  shops,
  type Shop,
  supportAccessLogs,
  type SupportAccessLog,
  type InsertSupportAccessLog,
  packages,
  type Package,
  packageFeatures,
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
  not,
} from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { emailService } from "./email-service";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getPackageByName(name: string): Promise<Package | undefined>;
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
  
  /**
   * Löscht einen Benutzer aus dem System
   * @param id Die ID des zu löschenden Benutzers
   * @returns True, wenn der Benutzer gelöscht wurde
   */
  deleteUser(id: number): Promise<boolean>;
  
  /**
   * Vollständiges Löschen eines Benutzers mit allen zugehörigen Daten (DSGVO-konform)
   * @param id Die ID des zu löschenden Benutzers
   * @returns Ein Objekt mit Informationen über die gelöschten Daten
   */
  completeUserDeletion(id: number): Promise<{
    success: boolean;
    deletedData: {
      user: boolean;
      businessSettings: boolean;
      customers: number;
      repairs: number;
      emailTemplates: number;
      costEstimates: number;
      deviceTypes: number;
      brands: number;
      models: number;
      feedbackTokens: number;
    };
  }>;
  
  createUser(user: InsertUser & { trialExpiresAt?: Date }): Promise<User>;
  
  // Subscription and quota methods
  canCreateNewRepair(userId: number): Promise<{ count: number, limit: number, canCreate: boolean }>;
  
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
  
  /**
   * Aktualisiert den Status einer Reparatur
   * @param id Die ID der Reparatur
   * @param status Der neue Status
   * @param userId Die ID des Benutzers, der die Aktion durchführt
   * @returns Die aktualisierte Reparatur oder undefined
   */
  updateRepairStatus(
    id: number,
    status: string,
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
  getDetailedRepairStats(
    userId: number, 
    startDate?: Date, 
    endDate?: Date, 
    revenueBasedOnPickup?: boolean
  ): Promise<{
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

  // Kostenvoranschlag methods
  getAllCostEstimates(userId: number): Promise<CostEstimate[]>;
  getCostEstimate(id: number, userId: number): Promise<CostEstimate | undefined>;
  createCostEstimate(estimate: InsertCostEstimate, userId: number): Promise<CostEstimate>;
  updateCostEstimate(id: number, estimate: Partial<InsertCostEstimate>, userId: number): Promise<CostEstimate | undefined>;
  deleteCostEstimate(id: number, userId: number): Promise<boolean>;

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
  
  // Paket-Methoden
  getPackageByName(name: string): Promise<Package | undefined>;
  getPackageById(id: number): Promise<Package | undefined>;
  
  // Trial-Version Methoden
  isTrialExpired(userId: number): Promise<boolean>;
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
    trialExpiresAt: row.trial_expires_at ? new Date(row.trial_expires_at) : null,
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
  
  // Paket anhand des Namens abrufen
  async getPackageByName(name: string): Promise<Package | undefined> {
    try {
      const [pkg] = await db
        .select()
        .from(packages)
        .where(eq(packages.name, name));
      
      return pkg;
    } catch (error) {
      console.error(`Error getting package with name "${name}":`, error);
      return undefined;
    }
  }
  
  // Implementierung für Abonnement-Kontingente
  async canCreateNewRepair(userId: number): Promise<{ count: number, limit: number, canCreate: boolean }> {
    try {
      // Benutzer abrufen, um den Plan zu ermitteln
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }
      
      // Wenn der Benutzer auf Professional oder Enterprise ist, hat er unbegrenzte Reparaturen
      if (user.pricingPlan === 'professional' || user.pricingPlan === 'enterprise') {
        return {
          count: 0,
          limit: 999999, // Praktisch unbegrenzt
          canCreate: true
        };
      }
      
      // Basic-Plan: 50 Reparaturen pro Monat
      const limit = 50;
      
      // Wenn keine Shop-ID vorhanden ist, kann der Benutzer keine Reparaturen erstellen
      if (!user.shopId) {
        return {
          count: 0,
          limit,
          canCreate: false
        };
      }
      
      // Aktuellen Monat ermitteln (z.B. 202505 für Mai 2025)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      // Anzahl der Reparaturen im aktuellen Monat abrufen
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
      
      return {
        count,
        limit,
        canCreate: count < limit
      };
    } catch (error) {
      console.error("Error in canCreateNewRepair:", error);
      // Standardwert im Fehlerfall
      return {
        count: 0,
        limit: 50,
        canCreate: false
      };
    }
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
  
  async completeUserDeletion(id: number): Promise<{
    success: boolean;
    deletedData: {
      user: boolean;
      businessSettings: boolean;
      customers: number;
      repairs: number;
      emailTemplates: number;
      costEstimates: number;
      deviceTypes: number;
      brands: number;
      models: number;
      feedbackTokens: number;
    };
  }> {
    // Zunächst den Benutzer und die zugehörige Shop-ID abrufen
    const user = await this.getUser(id);
    if (!user || !user.shopId) {
      return {
        success: false,
        deletedData: {
          user: false,
          businessSettings: false,
          customers: 0,
          repairs: 0,
          emailTemplates: 0,
          costEstimates: 0,
          deviceTypes: 0,
          brands: 0,
          models: 0,
          feedbackTokens: 0
        }
      };
    }
    
    const shopId = user.shopId;
    
    // Zur Protokollierung der gelöschten Einträge
    const deletedData = {
      user: false,
      businessSettings: false,
      customers: 0,
      repairs: 0,
      emailTemplates: 0,
      costEstimates: 0,
      deviceTypes: 0,
      brands: 0,
      models: 0,
      feedbackTokens: 0
    };
    
    try {
      console.log(`Starte vollständiges Löschen für Benutzer ID ${id} (Shop ID ${shopId})...`);
      
      // Verwenden einer Transaktion, um Atomarität sicherzustellen
      return await db.transaction(async (tx) => {
        // 1. Löschen aller Reparaturen für den Shop
        try {
          const repairsResult = await tx.delete(repairs)
            .where(eq(repairs.shopId, shopId));
          deletedData.repairs = repairsResult.rowCount || 0;
          console.log(`Gelöschte Reparaturen: ${deletedData.repairs}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Reparaturen:", error);
        }
        
        // 2. Löschen aller Kunden für den Shop
        try {
          const customersResult = await tx.delete(customers)
            .where(eq(customers.shopId, shopId));
          deletedData.customers = customersResult.rowCount || 0;
          console.log(`Gelöschte Kunden: ${deletedData.customers}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Kunden:", error);
        }
        
        // 3. Löschen aller E-Mail-Vorlagen für den Benutzer
        try {
          const templatesResult = await tx.delete(emailTemplates)
            .where(eq(emailTemplates.userId, id));
          deletedData.emailTemplates = templatesResult.rowCount || 0;
          console.log(`Gelöschte E-Mail-Vorlagen: ${deletedData.emailTemplates}`);
        } catch (error) {
          console.error("Fehler beim Löschen der E-Mail-Vorlagen:", error);
        }
        
        // 4. Löschen aller Kostenvoranschläge für den Shop
        try {
          // Kostenvoranschläge mit zugehörigen IDs abrufen
          const costEstimatesList = await tx
            .select({ id: costEstimates.id })
            .from(costEstimates)
            .where(eq(costEstimates.shopId, shopId));
            
          const costEstimateIds = costEstimatesList.map(entry => entry.id);
          
          // Wenn Kostenvoranschläge vorhanden sind
          if (costEstimateIds.length > 0) {
            // Kostenvoranschläge-Positionen löschen
            await tx.execute(sql`DELETE FROM cost_estimate_items WHERE cost_estimate_id IN (${sql.join(costEstimateIds)})`);
          }
            
          // Dann die Kostenvoranschläge selbst löschen
          const estimatesResult = await tx.delete(costEstimates)
            .where(eq(costEstimates.shopId, shopId));
          deletedData.costEstimates = estimatesResult.rowCount || 0;
          console.log(`Gelöschte Kostenvoranschläge: ${deletedData.costEstimates}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Kostenvoranschläge:", error);
        }
        
        // 5. Löschen aller Gerätetypen des Benutzers
        try {
          const deviceTypesResult = await tx.execute(
            sql`DELETE FROM user_device_types WHERE user_id = ${id} AND is_global = false`
          );
          deletedData.deviceTypes = deviceTypesResult.rowCount || 0;
          console.log(`Gelöschte Gerätetypen: ${deletedData.deviceTypes}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Gerätetypen:", error);
        }
        
        // 6. Löschen aller Marken des Benutzers
        try {
          const brandsResult = await tx.execute(
            sql`DELETE FROM user_brands WHERE user_id = ${id} AND is_global = false`
          );
          deletedData.brands = brandsResult.rowCount || 0;
          console.log(`Gelöschte Marken: ${deletedData.brands}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Marken:", error);
        }
        
        // 7. Löschen aller Modelle des Benutzers
        try {
          const modelsResult = await tx.execute(
            sql`DELETE FROM user_models WHERE user_id = ${id} AND is_global = false`
          );
          deletedData.models = modelsResult.rowCount || 0;
          console.log(`Gelöschte Modelle: ${deletedData.models}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Modelle:", error);
        }
        
        // 8. Löschen aller Feedback-Tokens für den Shop
        try {
          const feedbackResult = await tx.execute(
            sql`DELETE FROM feedback_tokens WHERE shop_id = ${shopId}`
          );
          deletedData.feedbackTokens = feedbackResult.rowCount || 0;
          console.log(`Gelöschte Feedback-Tokens: ${deletedData.feedbackTokens}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Feedback-Tokens:", error);
        }
        
        // 9. Löschen der Geschäftseinstellungen
        try {
          const settingsResult = await tx.execute(
            sql`DELETE FROM business_settings WHERE shop_id = ${shopId}`
          );
          deletedData.businessSettings = (settingsResult.rowCount || 0) > 0;
          console.log(`Geschäftseinstellungen gelöscht: ${deletedData.businessSettings}`);
        } catch (error) {
          console.error("Fehler beim Löschen der Geschäftseinstellungen:", error);
        }
        
        // 10. Löschen des Benutzers
        try {
          const userResult = await tx.execute(
            sql`DELETE FROM users WHERE id = ${id}`
          );
          deletedData.user = (userResult.rowCount || 0) > 0;
          console.log(`Benutzer gelöscht: ${deletedData.user}`);
        } catch (error) {
          console.error("Fehler beim Löschen des Benutzers:", error);
        }
        
        return {
          success: deletedData.user,
          deletedData
        };
      });
    } catch (error) {
      console.error("Fehler bei der vollständigen Benutzerlöschung:", error);
      return {
        success: false,
        deletedData
      };
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

  // Implementierung der fehlenden updateRepair-Funktion
  async updateRepair(
    id: number,
    repair: Partial<InsertRepair>,
    userId: number
  ): Promise<Repair | undefined> {
    try {
      console.log(`updateRepair: Benutzer mit ID ${userId} aktualisiert Reparatur ${id}`);
      
      // Zuerst prüfen, ob die Reparatur zum Shop des Benutzers gehört
      const existingRepair = await this.getRepair(id, userId);
      if (!existingRepair) {
        console.warn(`updateRepair: Reparatur ${id} nicht gefunden oder nicht im Shop des Benutzers ${userId}`);
        return undefined;
      }
      
      // Benutzer holen, um Shop-ID zu verifizieren
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`updateRepair: Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }
      
      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben
      if (!user.shopId) {
        console.warn(`❌ updateRepair: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Aktualisiere die Reparatur mit der korrekten Shop-ID
      const [updatedRepair] = await db
        .update(repairs)
        .set({
          ...repair,
          updatedAt: new Date(),
          // Shop-ID niemals überschreiben lassen - beibehalten der ursprünglichen shopId für Datenisolierung
          shopId: existingRepair.shopId
        })
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, user.shopId)
          )
        )
        .returning();
      
      if (updatedRepair) {
        console.log(`updateRepair: Reparatur ${id} erfolgreich aktualisiert für Benutzer ${userId}`);
      } else {
        console.warn(`updateRepair: Reparatur ${id} konnte nicht aktualisiert werden (Shop-ID Konflikt?)`);
      }
      
      return updatedRepair;
    } catch (error) {
      console.error(`Error updating repair ${id}:`, error);
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

      console.log(`FINALE IMPLEMENTATION: Fetching business settings for user ${userId}`);
      
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

      // VERBESSERTE LÖSUNG: Wir suchen nach den neuesten Einstellungen dieses Benutzers für diesen Shop
      // Dies behebt das Problem, dass ein Benutzer möglicherweise mehrere Business-Settings Einträge hat
      let personalSettings = await db
        .select()
        .from(businessSettings)
        .where(
          and(
            eq(businessSettings.shopId, shopId),
            eq(businessSettings.userId, userId)
          )
        )
        .orderBy(desc(businessSettings.id))  // Wir verwenden die höchste ID (neueste Einträge)
        .limit(1);

      // Benutze persönliche Einstellungen, wenn vorhanden
      let settings = personalSettings.length > 0 ? personalSettings[0] : undefined;

      // Wenn keine persönlichen Einstellungen gefunden wurden...
      if (!settings) {
        console.log(`Keine persönlichen Einstellungen für Benutzer ${user.username} gefunden, suche Shop-Einstellungen...`);
        
        // Finde nur die neuesten Einstellungen für diesen Shop (nur für denselben Shop)
        // Das ist besser für die DSGVO-Einhaltung - keine Shop-übergreifenden Daten
        const shopSettings = await db
          .select()
          .from(businessSettings)
          .where(
            eq(businessSettings.shopId, shopId)
          )
          .orderBy(desc(businessSettings.id))
          .limit(1);
          
        if (shopSettings.length > 0) {
          settings = shopSettings[0];
          console.log(`Shop-Einstellungen von anderem Benutzer gefunden: ID ${settings.id} für Shop ${shopId}`);
        }
      }

      if (settings) {
        console.log(`Finale Einstellungen mit ID ${settings.id} für Benutzer ${user.username} (Shop ${shopId})`);
      } else {
        console.log(`Keine Einstellungen für Benutzer ${user.username} oder Shop ${shopId} gefunden.`);
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
        // Neue Einstellungen erstellen mit überarbeiteten Schema
        const [newSettings] = await db
          .insert(businessSettings)
          .values({
            // Grundlegende Geschäftsdaten
            businessName: settings.businessName || "",
            
            // Inhaber-Informationen
            ownerFirstName: settings.ownerFirstName || "",
            ownerLastName: settings.ownerLastName || "",
            
            // Adressinformationen
            streetAddress: settings.streetAddress || settings.companyAddress || "",
            city: settings.city || "",
            zipCode: settings.zipCode || "",
            country: settings.country || "Österreich",
            
            // Steuernummern
            taxId: settings.taxId || "", // ATU Nummer
            vatNumber: settings.vatNumber || settings.companyVatNumber || "",
            
            // Kontaktinformationen
            phone: settings.phone || settings.companyPhone || "",
            email: settings.email || settings.companyEmail || "",
            website: settings.website || "",
            
            // Design-Einstellungen
            colorTheme: settings.colorTheme || "blue",
            receiptWidth: settings.receiptWidth || "80mm",
            logoImage: settings.logoImage || "",
            companySlogan: settings.companySlogan || "",
            
            // SMTP-Einstellungen
            smtpSenderName: settings.smtpSenderName || "",
            smtpHost: settings.smtpHost || "",
            smtpUser: settings.smtpUser || "",
            smtpPassword: settings.smtpPassword || "",
            smtpPort: settings.smtpPort || "",
            
            // Review Link
            reviewLink: settings.reviewLink || "",
            
            // Mandanten-Isolation
            userId: userId,
            shopId: shopId,
            
            // Timestamps
            updatedAt: new Date()
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

      // In Reparatur Anzahl (Status: in_reparatur)
      const [inRepairResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'in_reparatur')
        ));
      
      // Fertige Reparaturen = Alle mit Status "abgeholt" für die Dashboard-Anzeige
      const [completedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'abgeholt')
        ));

      // Heute erstellte Reparaturen
      const [todayResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          gte(repairs.createdAt, today)
        ));

      // Abholbereite Reparaturen (Status "fertig", NICHT "abholbereit")
      const [readyForPickupResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'fertig')
        ));

      // Ausgelagerte Reparaturen (Außer Haus)
      const [outsourcedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'ausser_haus')
        ));

      // Neue eingegangene Reparaturen
      const [receivedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(repairs)
        .where(and(
          eq(repairs.shopId, shopId),
          eq(repairs.status, 'eingegangen')
        ));

      // Debug-Ausgaben für die Statistik
      console.log(`Statistik für Shop ${shopId}:`);
      console.log(`- Gesamt: ${Number(countResult?.count) || 0}`);
      console.log(`- In Reparatur: ${Number(inRepairResult?.count) || 0}`);
      console.log(`- Abgeholt: ${Number(completedResult?.count) || 0}`);
      console.log(`- Abholbereit/Fertig: ${Number(readyForPickupResult?.count) || 0}`);
      console.log(`- Eingegangen: ${Number(receivedResult?.count) || 0}`);
      console.log(`- Außer Haus: ${Number(outsourcedResult?.count) || 0}`);

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

  // Paket-Methoden Implementation
  async getPackageByName(name: string): Promise<Package | undefined> {
    try {
      const [pkg] = await db
        .select()
        .from(packages)
        .where(eq(packages.name, name));
      
      return pkg;
    } catch (error) {
      console.error("Fehler beim Abrufen des Pakets nach Namen:", error);
      return undefined;
    }
  }

  async getPackageById(id: number): Promise<Package | undefined> {
    try {
      const [pkg] = await db
        .select()
        .from(packages)
        .where(eq(packages.id, id));
      
      return pkg;
    } catch (error) {
      console.error("Fehler beim Abrufen des Pakets nach ID:", error);
      return undefined;
    }
  }
  
  /**
   * Überprüft, ob die Testversion eines Benutzers abgelaufen ist
   * @param userId Die Benutzer-ID
   * @returns true, wenn die Testversion abgelaufen ist, sonst false
   */
  async isTrialExpired(userId: number): Promise<boolean> {
    try {
      // Benutzer abrufen
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`Benutzer mit ID ${userId} nicht gefunden bei Prüfung des Trial-Ablaufs`);
        return true; // Im Zweifelsfall annehmen, dass die Trial abgelaufen ist
      }
      
      // Wenn der Benutzer kein trialExpiresAt hat, ist es keine Demo-Version
      if (!user.trialExpiresAt) {
        return false; // Kein Ablaufdatum bedeutet, es ist keine Trial
      }
      
      // Prüfen, ob das Demo-Paket zugewiesen ist
      const demoPackage = await this.getPackageByName("Demo");
      if (!demoPackage || user.packageId !== demoPackage.id) {
        return false; // Wenn nicht das Demo-Paket, dann keine Einschränkung
      }
      
      // Jetzt prüfen wir, ob das Ablaufdatum in der Vergangenheit liegt
      const now = new Date();
      return user.trialExpiresAt < now;
    } catch (error) {
      console.error("Fehler bei der Überprüfung des Trial-Ablaufs:", error);
      return true; // Im Fehlerfall gehen wir davon aus, dass die Trial abgelaufen ist
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

  /**
   * Kostenvoranschlag methods
   */

  async getAllCostEstimates(userId: number): Promise<CostEstimate[]> {
    try {
      // Finde den Shop-ID des Benutzers
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }

      const shopId = user.shopId || 1;
      console.log(`getAllCostEstimates: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId}`);

      // Hole alle Kostenvoranschläge für diesen Shop
      const estimates = await db
        .select()
        .from(costEstimates)
        .where(eq(costEstimates.shopId, shopId))
        .orderBy(desc(costEstimates.createdAt));

      console.log(`Gefunden: ${estimates.length} Kostenvoranschläge für Shop ${shopId}`);
      return estimates;
    } catch (error) {
      console.error("Fehler beim Abrufen der Kostenvoranschläge:", error);
      return [];
    }
  }

  async getCostEstimate(id: number, userId: number): Promise<CostEstimate | undefined> {
    try {
      // Finde den Shop-ID des Benutzers
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }

      const shopId = user.shopId || 1;
      console.log(`getCostEstimate: Abrufen des Kostenvoranschlags ID ${id} für Benutzer ${userId}`);

      // Suche nach dem Kostenvoranschlag mit der angegebenen ID für diesen Shop
      const [estimate] = await db
        .select()
        .from(costEstimates)
        .where(and(eq(costEstimates.id, id), eq(costEstimates.shopId, shopId)));

      if (!estimate) {
        console.log(`Kostenvoranschlag mit ID ${id} für Shop ${shopId} nicht gefunden`);
        return undefined;
      }

      console.log(`Kostenvoranschlag ${id} gefunden für Benutzer ${userId}`);
      return estimate;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Kostenvoranschlags ${id}:`, error);
      return undefined;
    }
  }

  async createCostEstimate(estimate: InsertCostEstimate, userId: number): Promise<CostEstimate> {
    try {
      // Finde den Shop-ID des Benutzers
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }

      const shopId = user.shopId || 1;
      console.log(`createCostEstimate: Erstelle Kostenvoranschlag für Benutzer ${userId} (Shop ${shopId})`);

      // Erzeuge eine eindeutige Referenznummer (falls nicht vorhanden)
      if (!estimate.referenceNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        estimate.referenceNumber = `KV${year}${month}-${random}`;
      }

      // Erstelle den Kostenvoranschlag mit Shop-ID
      const [createdEstimate] = await db
        .insert(costEstimates)
        .values({
          ...estimate,
          userId,
          shopId,
        })
        .returning();

      console.log(`Neuer Kostenvoranschlag ID ${createdEstimate.id} erstellt für Shop ${shopId}`);
      return createdEstimate;
    } catch (error) {
      console.error("Fehler beim Erstellen des Kostenvoranschlags:", error);
      throw error;
    }
  }

  async updateCostEstimate(
    id: number,
    estimate: Partial<InsertCostEstimate>,
    userId: number
  ): Promise<CostEstimate | undefined> {
    try {
      // Finde den Shop-ID des Benutzers
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }

      const shopId = user.shopId || 1;
      console.log(`updateCostEstimate: Benutzer mit ID ${userId} aktualisiert Kostenvoranschlag ${id}`);

      // Prüfe, ob der Kostenvoranschlag existiert und zum Shop des Benutzers gehört
      const existingEstimate = await this.getCostEstimate(id, userId);
      if (!existingEstimate) {
        console.log(`Kostenvoranschlag mit ID ${id} für Shop ${shopId} nicht gefunden, Aktualisierung abgebrochen`);
        return undefined;
      }

      // Aktualisiere den Kostenvoranschlag
      const [updatedEstimate] = await db
        .update(costEstimates)
        .set({
          ...estimate,
          updatedAt: new Date(),
        })
        .where(and(eq(costEstimates.id, id), eq(costEstimates.shopId, shopId)))
        .returning();

      console.log(`Kostenvoranschlag ${id} erfolgreich aktualisiert für Benutzer ${userId}`);
      return updatedEstimate;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Kostenvoranschlags ${id}:`, error);
      return undefined;
    }
  }

  async deleteCostEstimate(id: number, userId: number): Promise<boolean> {
    try {
      // Finde den Shop-ID des Benutzers
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }

      const shopId = user.shopId || 1;
      console.log(`deleteCostEstimate: Benutzer mit ID ${userId} löscht Kostenvoranschlag ${id}`);

      // Prüfe, ob der Kostenvoranschlag existiert und zum Shop des Benutzers gehört
      const existingEstimate = await this.getCostEstimate(id, userId);
      if (!existingEstimate) {
        console.log(`Kostenvoranschlag mit ID ${id} für Shop ${shopId} nicht gefunden, Löschung abgebrochen`);
        return false;
      }

      // Lösche den Kostenvoranschlag
      const result = await db
        .delete(costEstimates)
        .where(and(eq(costEstimates.id, id), eq(costEstimates.shopId, shopId)))
        .returning();

      const success = result.length > 0;
      console.log(`Kostenvoranschlag ${id} ${success ? 'erfolgreich gelöscht' : 'konnte nicht gelöscht werden'} für Benutzer ${userId}`);
      return success;
    } catch (error) {
      console.error(`Fehler beim Löschen des Kostenvoranschlags ${id}:`, error);
      return false;
    }
  }

  // Implementierung der detaillierten Reparaturstatistik
  async getDetailedRepairStats(
    userId: number, 
    startDate?: Date, 
    endDate?: Date, 
    revenueBasedOnPickup: boolean = false
  ): Promise<{
    byDeviceType: Record<string, number>;
    byBrand: Record<string, number>;
    byIssue: Record<string, number>;
    mostRecentRepairs: Repair[];
    revenue: {
      total: number;
      byStatus: Record<string, number>;
      byMonth: Record<number, number>;
    };
  }> {
    try {
      // Benutzer und Shop-ID abrufen
      const user = await this.getUser(userId);
      if (!user || !user.shopId) {
        console.warn(`Benutzer mit ID ${userId} nicht gefunden oder keine Shop-ID vorhanden für detaillierte Statistiken`);
        return {
          byDeviceType: {},
          byBrand: {},
          byIssue: {},
          mostRecentRepairs: [],
          revenue: {
            total: 0,
            byStatus: {},
            byMonth: {},
          },
        };
      }
      
      // DSGVO-konform: Nur Daten des eigenen Shops
      const shopId = user.shopId;
      
      // Alle Reparaturen des Shops abrufen (mit Zeitraumfilter falls angegeben)
      let query = db.select().from(repairs).where(eq(repairs.shopId, shopId));
      
      if (startDate) {
        query = query.where(gte(repairs.createdAt, startDate));
      }
      
      if (endDate) {
        query = query.where(lte(repairs.createdAt, endDate));
      }
      
      const allRepairs = await query;
      
      // Nach Gerätetyp gruppieren
      const byDeviceType: Record<string, number> = {};
      const byBrand: Record<string, number> = {};
      const byIssue: Record<string, number> = {};
      let total = 0;
      const byStatus: Record<string, number> = {};
      const byMonth: Record<number, number> = {};
      
      // Durch alle Reparaturen iterieren und Statistiken berechnen
      for (const repair of allRepairs) {
        // Gerätetype zählen
        if (repair.deviceType) {
          byDeviceType[repair.deviceType] = (byDeviceType[repair.deviceType] || 0) + 1;
        }
        
        // Marke zählen
        if (repair.brand) {
          byBrand[repair.brand] = (byBrand[repair.brand] || 0) + 1;
        }
        
        // Probleme/Fehler zählen
        if (repair.issue) {
          byIssue[repair.issue] = (byIssue[repair.issue] || 0) + 1;
        }
        
        // Umsatz berechnen (nur wenn ein Preis vorhanden ist)
        // Verwende estimatedCost (von Repair) statt price
        if (repair.estimatedCost) {
          // String in Nummer konvertieren (z.B. "123,45" oder "123.45" zu 123.45)
          const cost = parseFloat(repair.estimatedCost.replace(',', '.'));
          
          if (!isNaN(cost)) {
            // Abhängig von der Einstellung, ob nach Erstellungs- oder Abholdatum
            // Verwende pickupSignedAt statt pickedUpAt
            const relevantDate = revenueBasedOnPickup ? 
              (repair.pickupSignedAt || repair.createdAt) : repair.createdAt;
              
            // Umsatz zum Gesamtumsatz addieren
            total += cost;
            
            // Nach Status gruppieren (Status als String verwenden)
            const statusKey = repair.status || 'Unbekannt';
            byStatus[statusKey] = (byStatus[statusKey] || 0) + cost;
            
            // Nach Monat gruppieren
            const month = relevantDate.getMonth();
            byMonth[month] = (byMonth[month] || 0) + cost;
          }
        }
      }
      
      // Die neuesten 5 Reparaturen zurückgeben
      const mostRecentRepairs = allRepairs
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
      
      return {
        byDeviceType,
        byBrand,
        byIssue,
        mostRecentRepairs,
        revenue: {
          total,
          byStatus,
          byMonth,
        },
      };
    } catch (error) {
      console.error("Fehler beim Abrufen der detaillierten Statistiken:", error);
      return {
        byDeviceType: {},
        byBrand: {},
        byIssue: {},
        mostRecentRepairs: [],
        revenue: {
          total: 0,
          byStatus: {},
          byMonth: {},
        },
      };
    }
  }
}

export const storage = new DatabaseStorage();
