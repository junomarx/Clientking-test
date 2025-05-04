import { 
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  repairs, type Repair, type InsertRepair,
  businessSettings, type BusinessSettings, type InsertBusinessSettings,
  feedbacks, type Feedback, type InsertFeedback,
  emailTemplates, type EmailTemplate, type InsertEmailTemplate,
  emailHistory, type EmailHistory, type InsertEmailHistory,
  userDeviceTypes, type UserDeviceType, type InsertUserDeviceType,
  userBrands, type UserBrand, type InsertUserBrand,
  userModelSeries, type UserModelSeries, type InsertUserModelSeries,
  userModels, type UserModel, type InsertUserModel,
  costEstimates, type CostEstimate, type InsertCostEstimate, type CostEstimateItem
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lt, lte, gt, count, isNotNull, like, SQL } from "drizzle-orm";
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
  getUsersByEmail(email: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, userData: Partial<Omit<User, 'id' | 'password'>>): Promise<User | undefined>;
  updateUserPassword(id: number, newPassword: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
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
  updateRepairSignature(id: number, signature: string): Promise<Repair | undefined>;
  deleteRepair(id: number): Promise<boolean>;
  
  // Business settings methods
  getBusinessSettings(userId?: number): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(settings: Partial<InsertBusinessSettings>, userId?: number): Promise<BusinessSettings>;
  
  // Stats methods
  getStats(): Promise<{
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
  submitFeedback(token: string, rating: number, comment?: string): Promise<Feedback | undefined>;
  getFeedbacksByRepairId(repairId: number): Promise<Feedback[]>;
  
  // Email template methods
  getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>, userId?: number): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId?: number): Promise<boolean>;
  
  // Email sending method (with template)
  sendEmailWithTemplate(templateId: number, to: string, variables: Record<string, string>, userId?: number): Promise<boolean>;
  
  // SMS-Funktionalität wurde auf Kundenwunsch entfernt
  
  // User device types methods
  getUserDeviceTypes(userId: number): Promise<UserDeviceType[]>;
  getUserDeviceType(id: number, userId: number): Promise<UserDeviceType | undefined>;
  createUserDeviceType(deviceType: InsertUserDeviceType, userId: number): Promise<UserDeviceType>;
  updateUserDeviceType(id: number, deviceType: Partial<InsertUserDeviceType>, userId: number): Promise<UserDeviceType | undefined>;
  deleteUserDeviceType(id: number, userId: number): Promise<boolean>;
  
  // User brands methods
  getUserBrands(userId: number): Promise<UserBrand[]>;
  getUserBrand(id: number, userId: number): Promise<UserBrand | undefined>;
  getUserBrandsByDeviceTypeId(deviceTypeId: number, userId: number): Promise<UserBrand[]>;
  createUserBrand(brand: InsertUserBrand, userId: number): Promise<UserBrand>;
  updateUserBrand(id: number, brand: Partial<InsertUserBrand>, userId: number): Promise<UserBrand | undefined>;
  deleteUserBrand(id: number, userId: number): Promise<boolean>;

  // User model series methods
  getUserModelSeries(userId: number): Promise<UserModelSeries[]>;
  getUserModelSeriesByBrandId(brandId: number, userId: number): Promise<UserModelSeries[]>;
  getUserModelSeriesByNameAndBrand(name: string, brandId: number, userId: number): Promise<UserModelSeries | undefined>;
  getUserModelSeries_ByDeviceTypeAndBrand(deviceTypeId: number, brandId: number, userId: number): Promise<UserModelSeries[]>;
  createUserModelSeries(modelSeries: InsertUserModelSeries, userId: number): Promise<UserModelSeries>;
  updateUserModelSeries(id: number, modelSeries: Partial<InsertUserModelSeries>, userId: number): Promise<UserModelSeries | undefined>;
  deleteUserModelSeries(id: number, userId: number): Promise<boolean>;
  deleteAllUserModelSeriesForBrand(brandId: number, userId: number): Promise<boolean>;
  
  // User models methods
  getUserModels(userId: number): Promise<UserModel[]>;
  getUserModelsByModelSeriesId(modelSeriesId: number, userId: number): Promise<UserModel[]>;
  createUserModel(model: InsertUserModel, userId: number): Promise<UserModel>;
  updateUserModel(id: number, model: Partial<InsertUserModel>, userId: number): Promise<UserModel | undefined>;
  deleteUserModel(id: number, userId: number): Promise<boolean>;
  deleteAllUserModelsForModelSeries(modelSeriesId: number, userId: number): Promise<boolean>;
  deleteAllUserModelsForBrand(brandId: number, deviceTypeId: number, userId: number): Promise<boolean>;
  
  // Kostenvoranschläge (CostEstimates) methods
  getAllCostEstimates(currentUserId?: number): Promise<CostEstimate[]>;
  getCostEstimate(id: number, currentUserId?: number): Promise<CostEstimate | undefined>;
  getCostEstimatesByCustomerId(customerId: number, currentUserId?: number): Promise<CostEstimate[]>;
  createCostEstimate(estimate: InsertCostEstimate, currentUserId?: number): Promise<CostEstimate>;
  updateCostEstimate(id: number, estimateUpdate: Partial<InsertCostEstimate>, currentUserId?: number): Promise<CostEstimate | undefined>;
  updateCostEstimateStatus(id: number, status: string, currentUserId?: number): Promise<CostEstimate | undefined>;
  deleteCostEstimate(id: number, currentUserId?: number): Promise<boolean>;
  convertToRepair(id: number, currentUserId?: number): Promise<Repair | undefined>;
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
    pricingPlan: row.pricing_plan ? String(row.pricing_plan) : null,
    shopId: row.shop_id ? Number(row.shop_id) : null,
    companyName: row.company_name ? String(row.company_name) : null,
    companyAddress: row.company_address ? String(row.company_address) : null,
    companyVatNumber: row.company_vat_number ? String(row.company_vat_number) : null,
    companyPhone: row.company_phone ? String(row.company_phone) : null,
    companyEmail: row.company_email ? String(row.company_email) : null,
    resetToken: row.reset_token ? String(row.reset_token) : null,
    resetTokenExpires: row.reset_token_expires ? new Date(row.reset_token_expires) : null,
    createdAt: new Date(row.created_at),
    featureOverrides: row.feature_overrides,
    packageId: row.package_id ? Number(row.package_id) : null
  };
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  // Hilfsfunktion: Extrahiert eine Zahl aus einem String (z.B. "€ 150,99" -> 150.99)
  private extractNumberFromString(input: string): number {
    if (!input) return 0;
    
    // Entferne Währungssymbole, Kommas und andere nicht-numerische Zeichen
    // Behalte Zahlen, Punkte und Kommas
    const cleaned = input.replace(/[^0-9.,]/g, '');
    
    // Ersetze Kommas durch Punkte für die Umwandlung in eine Zahl
    const normalized = cleaned.replace(',', '.');
    
    // Wandle in Zahl um, gib 0 zurück, wenn keine Zahl gefunden wurde
    const number = parseFloat(normalized);
    return isNaN(number) ? 0 : number;
  }

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Versuche zuerst, mit dem vollen Schema zu holen
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      // Wenn ein Fehler auftritt (z.B. fehlende Spalte), versuche es mit einer Raw-Abfrage
      console.log(`Fehler beim Abrufen des Benutzers mit ID ${id}:`, error);
      console.log("Verwende Fallback-Abfrage für Benutzer...");
      
      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, pricing_plan, 
               shop_id, company_name, company_address, company_vat_number,
               company_phone, company_email, reset_token, reset_token_expires,
               created_at, feature_overrides, package_id
        FROM users
        WHERE id = ${id}
      `);
      
      if (result.rows.length === 0) return undefined;
      
      // Verwende die Hilfsfunktion zur Konvertierung
      return convertToUser(result.rows[0]);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.log(`Fehler beim Abrufen des Benutzers mit Username ${username}:`, error);
      console.log("Verwende Fallback-Abfrage für Benutzer...");
      
      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, pricing_plan, 
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
      console.log(`Fehler beim Abrufen der Benutzer mit Email ${email}:`, error);
      console.log("Verwende Fallback-Abfrage...");
      
      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, pricing_plan, 
               shop_id, company_name, company_address, company_vat_number,
               company_phone, company_email, reset_token, reset_token_expires,
               created_at, feature_overrides, package_id
        FROM users
        WHERE email = ${email}
      `);
      
      return result.rows.map(row => convertToUser(row));
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.log(`Fehler beim Abrufen des Benutzers mit Email ${email}:`, error);
      console.log("Verwende Fallback-Abfrage für Benutzer...");
      
      const result = await db.execute(sql`
        SELECT id, username, password, email, is_active, is_admin, pricing_plan, 
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
  
  async getAllUsers(): Promise<User[]> {
    // Für Bugi (Admin) alle Benutzer zurückgeben
    const adminUser = await this.getUserByUsername('bugi');
    if (adminUser?.isAdmin) {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    }
    // Für andere Benutzer nur die Benutzer des gleichen Shops zurückgeben
    return await db.select().from(users).where(eq(users.shopId, adminUser?.shopId || 1)).orderBy(desc(users.createdAt));
  }
  
  async updateUser(id: number, userData: Partial<Omit<User, 'id' | 'password'>>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
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
  
  async setPasswordResetToken(email: string, token: string, expiryTime: Date): Promise<boolean> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) return false;
      
      await db
        .update(users)
        .set({ 
          resetToken: token,
          resetTokenExpires: expiryTime
        })
        .where(eq(users.id, user.id));
      return true;
    } catch (error) {
      console.error("Error setting password reset token:", error);
      return false;
    }
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const now = new Date();
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.resetToken, token),
            sql`${users.resetTokenExpires} > ${now}`
          )
        );
      return user;
    } catch (error) {
      console.error("Error finding user by reset token:", error);
      return undefined;
    }
  }
  
  async clearResetToken(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ 
          resetToken: null,
          resetTokenExpires: null
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Error clearing reset token:", error);
      return false;
    }
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`Beginne mit dem Löschen des Benutzers mit ID ${id} und aller zugehörigen Daten...`);
      
      // 1. Lösche alle Kunden des Benutzers und deren Reparaturen
      try {
        const userCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.userId, id));
          
        console.log(`Gefundene Kunden des Benutzers: ${userCustomers.length}`);
        
        // Für jeden Kunden, lösche alle zugehörigen Daten
        for (const customer of userCustomers) {
          try {
            // 1a. Lösche Kostenvoranschläge des Kunden
            await db
              .delete(costEstimates)
              .where(eq(costEstimates.customerId, customer.id));
              
            console.log(`Kostenvoranschläge für Kunde ${customer.id} gelöscht`);
            
            // 1b. Lösche alle Reparaturen des Kunden
            await db
              .delete(repairs)
              .where(eq(repairs.customerId, customer.id));
              
            console.log(`Reparaturen für Kunde ${customer.id} gelöscht`);
          } catch (err) {
            const error = err as Error;
            console.warn(`Fehler beim Löschen der Daten für Kunde ${customer.id}:`, error.message);
            // Fortfahren mit dem nächsten Kunden
          }
        }
        
        // 2. Lösche alle Reparaturen, die zum Benutzer gehören (und nicht über Kunden erfasst wurden)
        try {
          await db
            .delete(repairs)
            .where(eq(repairs.userId, id));
            
          console.log(`Alle direkten Reparaturen des Benutzers gelöscht`);
        } catch (err) {
          const error = err as Error;
          console.warn(`Fehler beim Löschen der Reparaturen des Benutzers:`, error.message);
        }
        
        // 3. Lösche alle Kostenvoranschläge, die zum Benutzer gehören (und nicht über Kunden erfasst wurden)
        try {
          await db
            .delete(costEstimates)
            .where(eq(costEstimates.userId, id));
            
          console.log(`Alle direkten Kostenvoranschläge des Benutzers gelöscht`);
        } catch (err) {
          const error = err as Error;
          console.warn(`Fehler beim Löschen der Kostenvoranschläge des Benutzers:`, error.message);
        }
      
        // 4. Lösche alle Kunden des Benutzers
        await db
          .delete(customers)
          .where(eq(customers.userId, id));
          
        console.log(`Alle Kunden des Benutzers gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Kundendaten:`, error.message);
      }
      
      // 5. Lösche alle E-Mail-Vorlagen des Benutzers
      try {
        await db
          .delete(emailTemplates)
          .where(eq(emailTemplates.userId, id));
          
        console.log(`Alle E-Mail-Vorlagen des Benutzers gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der E-Mail-Vorlagen:`, error.message);
      }
      
      // 6. SMS-Vorlagen-Löschung wurde entfernt
      // SMS-Funktionalität wurde vollständig auf Kundenwunsch entfernt
      
      // 7. Lösche den E-Mail-Verlauf des Benutzers
      try {
        // Die Spalte heißt in der Datenbank "userId" (camelCase), aber wir verwenden quoted Identifier
        // um sicherzustellen, dass es genau so abgefragt wird
        await db.execute(sql`DELETE FROM email_history WHERE "userId" = ${id}`);
        console.log(`E-Mail-Verlauf des Benutzers gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen des E-Mail-Verlaufs:`, error.message);
      }
      
      // 8. Lösche benutzerdefinierte Gerätemodelle
      try {
        await db
          .delete(userModels)
          .where(eq(userModels.userId, id));
          
        console.log(`Alle benutzerdefinierten Gerätemodelle gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Gerätemodelle:`, error.message);
      }
      
      // 9. Lösche benutzerdefinierte Modellserien
      try {
        await db
          .delete(userModelSeries)
          .where(eq(userModelSeries.userId, id));
          
        console.log(`Alle benutzerdefinierten Modellserien gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Modellserien:`, error.message);
      }
      
      // 10. Lösche benutzerdefinierte Marken/Hersteller
      try {
        await db
          .delete(userBrands)
          .where(eq(userBrands.userId, id));
          
        console.log(`Alle benutzerdefinierten Marken/Hersteller gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Marken/Hersteller:`, error.message);
      }
      
      // 11. Lösche benutzerdefinierte Gerätetypen
      try {
        await db
          .delete(userDeviceTypes)
          .where(eq(userDeviceTypes.userId, id));
          
        console.log(`Alle benutzerdefinierten Gerätetypen gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Gerätetypen:`, error.message);
      }
      
      // 12. Lösche Business-Einstellungen des Benutzers
      try {
        await db
          .delete(businessSettings)
          .where(eq(businessSettings.userId, id));
          
        console.log(`Business-Einstellungen des Benutzers gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Business-Einstellungen:`, error.message);
      }
      
      // 13. Entferne alle möglichen Sessions des Benutzers
      try {
        // Direkte SQL-Anfrage, da sessions möglicherweise nicht im Schema definiert ist
        await db.execute(sql`DELETE FROM sessions WHERE sess->'user'->>'id' = ${id.toString()}`);
        console.log(`Sessions des Benutzers gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.warn(`Fehler beim Löschen der Sessions:`, error.message);
      }
      
      // 14. Jetzt können wir den Benutzer sicher löschen
      try {
        await db
          .delete(users)
          .where(eq(users.id, id));
          
        console.log(`Benutzer mit ID ${id} erfolgreich gelöscht`);
      } catch (err) {
        const error = err as Error;
        console.error(`KRITISCHER FEHLER: Benutzer konnte nicht gelöscht werden:`, error.message);
        return false;
      }
        
      console.log(`Benutzer mit ID ${id} und alle zugehörigen Daten wurden erfolgreich gelöscht.`);
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date()
    }).returning();
    return user;
  }
  
  // Customer methods
  async getAllCustomers(currentUserId?: number): Promise<Customer[]> {
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];
    
    // Jeder Benutzer sieht nur Kunden aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    return await db
      .select()
      .from(customers)
      .where(eq(customers.shopId, shopIdValue))
      .orderBy(desc(customers.createdAt));
  }
  
  async getCustomer(id: number, currentUserId?: number): Promise<Customer | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    // Jeder Benutzer sieht nur Kunden aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.shopId, shopIdValue)
        )
      );
    return customer;
  }
  
  async findCustomersByName(firstName: string, lastName: string, currentUserId?: number): Promise<Customer[]> {
    // Suche Kunden, deren Vor- und Nachname die gesuchten Begriffe enthalten (case-insensitive)
    // und die zum gleichen Shop gehören
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];
    
    // Basisfilter erstellen abhängig von den angegebenen Suchparametern
    let firstNameFilter = sql`1=1`; // Standard, wenn kein firstName angegeben
    let lastNameFilter = sql`1=1`;  // Standard, wenn kein lastName angegeben
    
    // Wenn firstName angegeben, erstelle den entsprechenden Filter
    if (firstName && firstName.length > 0) {
      firstNameFilter = sql`LOWER(${customers.firstName}) LIKE LOWER(${'%' + firstName + '%'})`;
    }
    
    // Wenn lastName angegeben, erstelle den entsprechenden Filter
    if (lastName && lastName.length > 0) {
      lastNameFilter = sql`LOWER(${customers.lastName}) LIKE LOWER(${'%' + lastName + '%'})`;
    }
    
    // Jeder Benutzer sieht nur Kunden aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    return await db
      .select()
      .from(customers)
      .where(
        and(
          firstNameFilter,
          lastNameFilter,
          eq(customers.shopId, shopIdValue)
        ) as SQL<unknown>
      );
  }
  
  async createCustomer(insertCustomer: InsertCustomer, currentUserId?: number): Promise<Customer> {
    // Wenn eine Benutzer-ID vorhanden ist, hole den Benutzer, um die shop_id zu setzen
    let shopId = 1; // Standardwert
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser && currentUser.shopId) {
        shopId = currentUser.shopId;
      }
    }

    const [customer] = await db.insert(customers).values({
      ...insertCustomer,
      createdAt: new Date(),
      // Wenn ein Benutzerkontext vorhanden ist, setze den userId-Wert
      userId: currentUserId,
      // Shop-ID setzen
      shopId: shopId
    }).returning();
    return customer;
  }
  
  async updateCustomer(id: number, customerUpdate: Partial<InsertCustomer>, currentUserId?: number): Promise<Customer | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    // Jeder Benutzer kann nur Kunden aus seinem eigenen Shop aktualisieren (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const [updatedCustomer] = await db
      .update(customers)
      .set(customerUpdate)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.shopId, shopIdValue)
        )
      )
      .returning();
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number, currentUserId?: number): Promise<boolean> {
    try {
      if (!currentUserId) {
        return false; // Wenn keine Benutzer-ID angegeben ist, gebe false zurück
      }
      
      // Benutzer holen, um Shop-ID zu erhalten
      const currentUser = await this.getUser(currentUserId);
      if (!currentUser) return false;
      
      // Jeder Benutzer kann nur Kunden aus seinem eigenen Shop löschen (DSGVO-konform)
      const shopIdValue = currentUser.shopId || 1;
      await db.delete(customers).where(
        and(
          eq(customers.id, id),
          eq(customers.shopId, shopIdValue)
        )
      );
      return true;
    } catch (error) {
      console.error("Error deleting customer:", error);
      return false;
    }
  }
  
  // Repair methods
  async getAllRepairs(currentUserId?: number): Promise<Repair[]> {
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];
    
    // Jeder Benutzer sieht nur Reparaturen aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    return await db
      .select()
      .from(repairs)
      .where(eq(repairs.shopId, shopIdValue))
      .orderBy(desc(repairs.createdAt));
  }
  
  // Zählt die Anzahl der Reparaturen im aktuellen Monat für einen Benutzer
  async getRepairsCountForCurrentMonth(userId: number): Promise<number> {
    const today = new Date();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1); // Format: YYYYMM
    const currentMonthStr = currentMonth.toString();
    
    const result = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(
          eq(repairs.userId, userId),
          eq(repairs.creationMonth, currentMonthStr)
        )
      );
      
    return result[0]?.count || 0;
  }
  
  async getRepair(id: number, currentUserId?: number): Promise<Repair | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    // Jeder Benutzer sieht nur Reparaturen aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const [repair] = await db
      .select()
      .from(repairs)
      .where(
        and(
          eq(repairs.id, id),
          eq(repairs.shopId, shopIdValue)
        )
      );
    return repair;
  }
  
  async getRepairsByCustomerId(customerId: number, currentUserId?: number): Promise<Repair[]> {
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];
    
    // Jeder Benutzer sieht nur Reparaturen aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    return await db
      .select()
      .from(repairs)
      .where(
        and(
          eq(repairs.customerId, customerId),
          eq(repairs.shopId, shopIdValue)
        )
      )
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
  
  // Generiert eine eindeutige Referenznummer für Kostenvoranschläge im Format: KV[Jahr]-[laufende Nummer]
  // z.B. KV2025-0001
  private async generateUniqueReferenceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear().toString();
    const prefix = `KV${currentYear}-`;
    
    // Finde die höchste Nummer, die in diesem Jahr bereits vergeben wurde
    const existingNumbers = await db
      .select({ refNumber: costEstimates.referenceNumber })
      .from(costEstimates)
      .where(like(costEstimates.referenceNumber, `${prefix}%`));
      
    let highestNumber = 0;
    
    existingNumbers.forEach(entry => {
      if (entry.refNumber) {
        const numberPart = entry.refNumber.substring(prefix.length);
        const number = parseInt(numberPart, 10);
        if (!isNaN(number) && number > highestNumber) {
          highestNumber = number;
        }
      }
    });
    
    // Nächste Nummer
    const nextNumber = highestNumber + 1;
    // Formatiere die Nummer mit führenden Nullen (z.B. 0001, 0023, etc.)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return prefix + formattedNumber;
  }

  // Prüft, ob ein Benutzer mit einem Basic-Paket im aktuellen Monat
  // noch weitere Reparaturen anlegen darf
  async canCreateNewRepair(userId: number): Promise<{ canCreate: boolean; currentCount: number; limit: number; pricingPlan: string; displayName: string; currentMonth: string; currentYear: number }> {
    // Benutzer abrufen, um Preispaket zu prüfen
    const user = await this.getUser(userId);
    
    // Aktuelles Datum für die Rückgabe
    const currentDate = new Date();
    const monthName = currentDate.toLocaleString('de-DE', { month: 'long' });
    const year = currentDate.getFullYear();
    
    if (!user) {
      return { 
        canCreate: false, 
        currentCount: 0, 
        limit: 0, 
        pricingPlan: 'basic',
        displayName: 'Basic',
        currentMonth: monthName,
        currentYear: year
      };
    }
    
    // Basic, Professional oder Enterprise Plan
    const pricingPlan = user.pricingPlan || 'basic';
    
    // Display-Namen für die Preispakete
    const displayNames = {
      'basic': 'Basic',
      'professional': 'Professional',
      'enterprise': 'Enterprise'
    };
    
    // Wenn kein Basic-Paket, keine Einschränkung
    if (pricingPlan !== 'basic') {
      return { 
        canCreate: true, 
        currentCount: 0, 
        limit: 999,
        pricingPlan,
        displayName: displayNames[pricingPlan as keyof typeof displayNames],
        currentMonth: monthName,
        currentYear: year
      };
    }
    
    // Für Basic-Paket: Prüfe Anzahl der Reparaturen im aktuellen Monat
    const repairCount = await this.getRepairsCountForCurrentMonth(userId);
    const repairLimit = 50; // Basic-Paket: 50 Reparaturen pro Monat
    
    return { 
      canCreate: repairCount < repairLimit, 
      currentCount: repairCount,
      limit: repairLimit,
      pricingPlan,
      displayName: displayNames[pricingPlan as keyof typeof displayNames],
      currentMonth: monthName,
      currentYear: year
    };
  }
  
  async createRepair(insertRepair: InsertRepair, currentUserId?: number): Promise<Repair> {
    const now = new Date();
    
    // Prüfe, ob der Benutzer neue Reparaturen erstellen darf
    if (currentUserId) {
      const canCreate = await this.canCreateNewRepair(currentUserId);
      if (!canCreate.canCreate) {
        throw new Error(`Monatliches Limit erreicht: ${canCreate.currentCount}/${canCreate.limit} Reparaturen im Basic-Paket`);
      }
    }
    
    // Format des aktuellen Monats erstellen (YYYYMM)
    const currentMonth = now.getFullYear() * 100 + (now.getMonth() + 1);
    const currentMonthStr = currentMonth.toString();
    
    // Generiere einen eindeutigen Auftragscode
    const orderCode = await this.generateUniqueOrderCode(
      insertRepair.brand,
      insertRepair.deviceType
    );
    
    // Wenn eine Benutzer-ID vorhanden ist, hole den Benutzer, um die shop_id zu setzen
    let shopId = 1; // Standardwert
    if (currentUserId) {
      const currentUser = await this.getUser(currentUserId);
      if (currentUser && currentUser.shopId) {
        shopId = currentUser.shopId;
      }
    }
    
    // Make sure status is set
    const repairData = {
      ...insertRepair,
      orderCode,
      status: insertRepair.status || 'eingegangen',
      createdAt: now,
      updatedAt: now,
      creationMonth: currentMonthStr, // Setze den Erstellungsmonat für die Limitprüfung
      // Setze die Benutzer-ID, wenn vorhanden
      userId: currentUserId,
      // Shop-ID setzen
      shopId: shopId
    };
    
    const [repair] = await db.insert(repairs)
      .values(repairData)
      .returning();
    
    return repair;
  }
  
  async updateRepair(id: number, repairUpdate: Partial<InsertRepair>, currentUserId?: number): Promise<Repair | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    // Jeder Benutzer kann nur Reparaturen aus seinem eigenen Shop aktualisieren (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const [updatedRepair] = await db
      .update(repairs)
      .set({
        ...repairUpdate,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(repairs.id, id),
          eq(repairs.shopId, shopIdValue)
        )
      )
      .returning();
    
    return updatedRepair;
  }
  
  async updateRepairSignature(id: number, signature: string, type: 'dropoff' | 'pickup' = 'dropoff'): Promise<Repair | undefined> {
    const now = new Date();
    
    // Je nach Typ (Abgabe oder Abholung) unterschiedliche Spalten aktualisieren
    const updateData = type === 'dropoff' ? {
      dropoffSignature: signature,
      dropoffSignedAt: now,
      updatedAt: now
    } : {
      pickupSignature: signature,
      pickupSignedAt: now,
      updatedAt: now
    };
    
    const [updatedRepair] = await db
      .update(repairs)
      .set(updateData)
      .where(eq(repairs.id, id))
      .returning();
    
    return updatedRepair;
  }
  
  async updateRepairStatus(id: number, status: string, currentUserId?: number): Promise<Repair | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    const now = new Date();
    
    // Jeder Benutzer kann nur den Status von Reparaturen aus seinem eigenen Shop aktualisieren (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const [updatedRepair] = await db
      .update(repairs)
      .set({
        status,
        updatedAt: now,
        statusUpdatedAt: now // Setze den Zeitpunkt der Statusänderung für Umsatzanalysen
      })
      .where(
        and(
          eq(repairs.id, id),
          eq(repairs.shopId, shopIdValue)
        )
      )
      .returning();
    
    return updatedRepair;
  }
  
  async deleteRepair(id: number, currentUserId?: number): Promise<boolean> {
    try {
      if (!currentUserId) {
        return false; // Wenn keine Benutzer-ID angegeben ist, gebe false zurück
      }
      
      // Benutzer holen, um Shop-ID zu erhalten
      const currentUser = await this.getUser(currentUserId);
      if (!currentUser) return false;
      
      // Jeder Benutzer kann nur Reparaturen aus seinem eigenen Shop löschen (DSGVO-konform)
      const shopIdValue = currentUser.shopId || 1;
      await db.delete(repairs).where(
        and(
          eq(repairs.id, id),
          eq(repairs.shopId, shopIdValue)
        )
      );
      return true;
    } catch (error) {
      console.error("Error deleting repair:", error);
      return false;
    }
  }
  
  // Business settings methods
  async getBusinessSettings(userId?: number): Promise<BusinessSettings | undefined> {
    console.log('getBusinessSettings called with userId:', userId);
    
    try {
      // Wenn keine Benutzer-ID angegeben ist, gib undefined zurück
      if (!userId) {
        console.log('Keine Benutzer-ID angegeben, kann keine Geschäftseinstellungen abrufen');
        return undefined;
      }

      // Benutzer abrufen, um festzustellen, welche Shop-ID er hat
      const user = await this.getUser(userId);
      if (!user) {
        console.log(`Benutzer mit ID ${userId} nicht gefunden`);
        return undefined;
      }

      // Shop-ID aus dem Benutzer extrahieren
      const shopId = user.shopId || 1; // Default auf 1, wenn keine Shop-ID
      
      // DSGVO-konform: Jeder Benutzer sieht nur Einstellungen seines eigenen Shops
      console.log(`Suche nach Geschäftseinstellungen für Benutzer ${user.username} (ID ${userId}, Shop ${shopId})`);
      
      // Zuerst versuchen, die eigenen Benutzereinstellungen zu finden
      const [userSettings] = await db.select()
        .from(businessSettings)
        .where(and(
          eq(businessSettings.userId, userId),
          eq(businessSettings.shopId, shopId)
        ));
        
      if (userSettings) {
        console.log(`Gefunden: Einstellungen mit ID ${userSettings.id} für User ${userSettings.userId} (Shop ${shopId})`);
        return userSettings;
      }
      
      // Wenn keine eigenen Einstellungen gefunden wurden, versuche allgemeine Shop-Einstellungen zu finden
      const [shopSettings] = await db.select()
        .from(businessSettings)
        .where(eq(businessSettings.shopId, shopId));
        
      if (shopSettings) {
        console.log(`Shop-Einstellungen gefunden: ID ${shopSettings.id} für Shop ${shopId}`);
        return shopSettings;
      }
      
      console.log(`Keine Einstellungen für Benutzer ${user.username} (ID ${userId}, Shop ${shopId}) gefunden`);
      return undefined;
    } catch (error) {
      console.error('Fehler in getBusinessSettings:', error);
      throw error;
    }
  }
  
  async updateBusinessSettings(settingsData: Partial<InsertBusinessSettings>, userId?: number): Promise<BusinessSettings> {
    try {
      // Debug-Informationen
      console.log('⭐ updateBusinessSettings called with userId:', userId);
      console.log('⭐ Settings data keys:', Object.keys(settingsData));
      
      if (!userId) {
        console.error('⭐⭐⭐ KRITISCHER FEHLER - Keine userId angegeben!');
        throw new Error('User ID ist erforderlich, um Geschäftseinstellungen zu aktualisieren');
      }
      
      // Benutzer abrufen, um festzustellen, ob er Admin-Rechte besitzt und welche Shop-ID er hat
      const user = await this.getUser(userId);
      if (!user) {
        console.error(`⭐⭐⭐ KRITISCHER FEHLER - Benutzer mit ID ${userId} nicht gefunden!`);
        throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      }
      
      // Shop-ID aus dem Benutzer extrahieren
      const shopId = user.shopId || 1; // Default auf 1, wenn keine Shop-ID
      
      // Stellen wir sicher, dass die userId und shopId in den Daten korrekt gesetzt sind
      settingsData = { 
        ...settingsData, 
        userId, // Erzwingen, dass die richtige userId verwendet wird
        shopId  // Setze die shopId basierend auf dem Benutzer
      };
      
      console.log('⭐ Using forced userId:', userId, 'and shopId:', shopId, 'in settingsData');
      
      // DSGVO-konform: Jeder Benutzer darf nur Einstellungen seines eigenen Shops bearbeiten
      console.log('⭐ Suche nach Einstellungen mit Shop-Isolation für Benutzer', user.username);
      const conditions = and(
        eq(businessSettings.userId, userId),
        eq(businessSettings.shopId, shopId)
      ) as SQL<unknown>;
      
      // Einstellungen für diesen Benutzer suchen
      const [existingSettings] = await db
        .select()
        .from(businessSettings)
        .where(conditions);
      
      console.log('⭐ Existing settings found:', existingSettings ? 
        `ID: ${existingSettings.id} für User: ${existingSettings.userId} (Shop ${existingSettings.shopId})` : 
        'keine');
      
      if (existingSettings) {
        console.log(`⭐ Updating settings with ID ${existingSettings.id} for user ${userId} (Shop ${shopId})`);
        
        // Bereite die Daten für das Update vor
        const dataToUpdate = {
          ...settingsData,
          updatedAt: new Date()
        };
        
        console.log('⭐ Ready to save with keys:', Object.keys(dataToUpdate));
        
        // Führe ein direktes Update mit der Einstellungs-ID durch
        // Die WHERE-Bedingung ist wichtig: Nur die Einstellungen aktualisieren, die
        // dem Benutzer gehören (und bei normalen Benutzern auch zur Shop-ID passen)
        const [updatedSettings] = await db
          .update(businessSettings)
          .set(dataToUpdate)
          .where(and(
            eq(businessSettings.id, existingSettings.id),
            conditions // Verwende dieselben Bedingungen wie bei der Suche
          ) as SQL<unknown>)
          .returning();
        
        if (!updatedSettings) {
          console.error(`⭐⭐⭐ Update fehlgeschlagen für User ${userId}!`);
          throw new Error('Einstellungen konnten nicht aktualisiert werden');
        }
        
        console.log('⭐ Settings updated successfully:', updatedSettings.id, 'for user', updatedSettings.userId, 'in shop', updatedSettings.shopId);
        return updatedSettings;
      } else {
        // Create new settings for this user
        console.log('Creating new business settings for user', userId, 'in shop', shopId);
        
        // Stellen Sie sicher, dass alle erforderlichen Felder vorhanden sind
        const requiredFields = {
          businessName: settingsData.businessName || 'Mein Unternehmen',
          ownerFirstName: settingsData.ownerFirstName || 'Vorname',
          ownerLastName: settingsData.ownerLastName || 'Nachname',
          streetAddress: settingsData.streetAddress || 'Straße 1',
          city: settingsData.city || 'Stadt',
          zipCode: settingsData.zipCode || '1000',
          country: settingsData.country || 'Österreich',
        };
        
        const dataToInsert = {
          ...requiredFields,
          ...settingsData,
          updatedAt: new Date(),
          userId,   // Speichere die Benutzer-ID
          shopId    // Speichere die Shop-ID
        };
        
        // Sicherstellen, dass die Benutzer-ID und Shop-ID nicht null oder undefined sind
        if (!dataToInsert.userId) {
          console.warn('User ID is undefined in insert data, forcing to user ID:', userId);
          dataToInsert.userId = userId;
        }
        
        if (!dataToInsert.shopId) {
          console.warn('Shop ID is undefined in insert data, forcing to shop ID:', shopId);
          dataToInsert.shopId = shopId;
        }
        
        console.log('Insert data with keys:', Object.keys(dataToInsert));
        
        const [newSettings] = await db
          .insert(businessSettings)
          .values(dataToInsert as InsertBusinessSettings)
          .returning();
        
        console.log('New settings created with ID:', newSettings.id, 'for user', newSettings.userId, 'in shop', newSettings.shopId);
        return newSettings;
      }
    } catch (error) {
      console.error('Error in updateBusinessSettings:', error);
      throw error;
    }
  }
  
  // Stats methods
  async getStats(currentUserId?: number, startDate?: Date, endDate?: Date): Promise<{ 
    totalOrders: number; 
    inRepair: number; 
    completed: number; 
    today: number;
    readyForPickup: number; 
    outsourced: number; 
    received: number; // Neu: Anzahl der eingegangenen Reparaturen
  }> {
    if (!currentUserId) {
      // Wenn keine Benutzer-ID angegeben ist, gebe Nullwerte zurück
      return {
        totalOrders: 0,
        inRepair: 0,
        completed: 0,
        today: 0,
        readyForPickup: 0,
        outsourced: 0,
        received: 0, // Neu: Anzahl der eingegangenen Reparaturen
      };
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) {
      return {
        totalOrders: 0,
        inRepair: 0,
        completed: 0,
        today: 0,
        readyForPickup: 0,
        outsourced: 0,
        received: 0, // Neu: Anzahl der eingegangenen Reparaturen
      };
    }
    
    // Jeder Benutzer sieht nur Statistiken aus seinem eigenen Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const baseFilter = eq(repairs.shopId, shopIdValue);
    
    // Basisfilter für Benutzer erstellen
    let combinedFilter: SQL<unknown> = baseFilter;
    
    // Füge Zeitraumfilter hinzu, wenn vorhanden
    if (startDate && endDate) {
      combinedFilter = and(
        baseFilter,
        gte(repairs.createdAt, startDate),
        lte(repairs.createdAt, endDate)
      ) as SQL<unknown>;
    } else if (startDate) {
      combinedFilter = and(
        baseFilter,
        gte(repairs.createdAt, startDate)
      ) as SQL<unknown>;
    } else if (endDate) {
      combinedFilter = and(
        baseFilter,
        lte(repairs.createdAt, endDate)
      ) as SQL<unknown>;
    } else {
      // Falls kein Datum gesetzt ist, behalte einfach den Benutzerfilter bei
      combinedFilter = baseFilter;
    }
    
    // Get total number of orders with optional date range filter
    const [totalResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(combinedFilter);
    
    // Get number of repairs in progress with optional date range filter
    const [inRepairResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "in_reparatur"), combinedFilter)
      );
    
    // Get number of completed repairs with optional date range filter
    const [completedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(
          or(
            eq(repairs.status, "fertig"),
            eq(repairs.status, "abgeholt")
          ),
          combinedFilter
        )
      );
    
    // Get number of repairs ready for pickup with optional date range filter
    const [readyForPickupResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "fertig"), combinedFilter)
      );
      
    // Get number of outsourced repairs with optional date range filter
    const [outsourcedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "ausser_haus"), combinedFilter)
      );
      
    // Get number of received repairs with optional date range filter
    const [receivedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "eingegangen"), combinedFilter)
      );
    
    // Get number of repairs created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayFilter = and(
      gte(repairs.createdAt, today),
      lt(repairs.createdAt, tomorrow),
      baseFilter
    ) as SQL<unknown>;
    
    const [todayResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(todayFilter);
    
    return {
      totalOrders: totalResult?.count || 0,
      inRepair: inRepairResult?.count || 0,
      completed: completedResult?.count || 0,
      today: todayResult?.count || 0,
      readyForPickup: readyForPickupResult?.count || 0,
      outsourced: outsourcedResult?.count || 0,
      received: receivedResult?.count || 0,
    };
  }
  
  // Detaillierte Reparaturstatistiken nach Gerätetyp und häufigen Problemen
  async getDetailedRepairStats(currentUserId?: number, startDate?: Date, endDate?: Date, revenueBasedOnPickup: boolean = false): Promise<{
    byDeviceType: Record<string, number>;
    byBrand: Record<string, number>;
    byIssue: Record<string, number>;
    mostRecentRepairs: Repair[];
    revenue: {
      total: number;
      byStatus: Record<string, number>;
      byMonth: Record<number, number>;
      byDay: Record<string, number>;
    };
  }> {
    try {
      if (!currentUserId) {
        return {
          byDeviceType: {},
          byBrand: {},
          byIssue: {},
          mostRecentRepairs: [],
          revenue: {
            total: 0,
            byStatus: {},
            byMonth: {},
            byDay: {}
          }
        };
      }
      
      // Benutzer holen, um Shop-ID zu erhalten
      const currentUser = await this.getUser(currentUserId);
      if (!currentUser) {
        return {
          byDeviceType: {},
          byBrand: {},
          byIssue: {},
          mostRecentRepairs: [],
          revenue: {
            total: 0,
            byStatus: {},
            byMonth: {},
            byDay: {}
          }
        };
      }
      
      // Jeder Benutzer sieht nur Statistiken aus seinem eigenen Shop (DSGVO-konform)
      const shopIdValue = currentUser.shopId || 1;
      const baseFilter = eq(repairs.shopId, shopIdValue);
      
      // Basisfilter für Benutzer erstellen
      let combinedFilter: SQL<unknown> = baseFilter;
      
      // Füge Zeitraumfilter hinzu, wenn vorhanden
      if (startDate && endDate) {
        combinedFilter = and(
          baseFilter,
          gte(repairs.createdAt, startDate),
          lte(repairs.createdAt, endDate)
        ) as SQL<unknown>;
      } else if (startDate) {
        combinedFilter = and(
          baseFilter,
          gte(repairs.createdAt, startDate)
        ) as SQL<unknown>;
      } else if (endDate) {
        combinedFilter = and(
          baseFilter,
          lte(repairs.createdAt, endDate)
        ) as SQL<unknown>;
      } else {
        // Falls kein Datum gesetzt ist, behalte einfach den Basisfilter bei
        combinedFilter = baseFilter;
      }
      
      // Alle Reparaturen des Benutzers abrufen mit optionalem Zeitraumfilter
      const userRepairs = await db
        .select()
        .from(repairs)
        .where(combinedFilter);
      
      // Statistiken nach Gerätetyp
      const byDeviceType: Record<string, number> = {};
      userRepairs.forEach(repair => {
        const deviceType = repair.deviceType;
        byDeviceType[deviceType] = (byDeviceType[deviceType] || 0) + 1;
      });
      
      // Statistiken nach Marke
      const byBrand: Record<string, number> = {};
      userRepairs.forEach(repair => {
        const brand = repair.brand;
        byBrand[brand] = (byBrand[brand] || 0) + 1;
      });
      
      // Statistiken nach Problemen (häufigste Probleme)
      // Hier extrahieren wir die ersten paar Wörter aus dem Issue-Feld
      // oder verwenden bestimmte Schlüsselwörter
      const byIssue: Record<string, number> = {};
      userRepairs.forEach(repair => {
        // Extrahiere relevante Schlüsselwörter aus dem Problem
        const issue = repair.issue.toLowerCase();
        
        // Überprüfe auf häufige Probleme mit einfachen Stichwörtern
        const keywords = [
          'display', 'akku', 'battery', 'ladeport', 'ladebuchse', 'charging port', 
          'kamera', 'camera', 'wasserschaden', 'water damage', 'software', 'wasser',
          'mic', 'mikrofon', 'lautsprecher', 'speaker', 'touch', 'button', 'knopf',
          'home', 'wifi', 'wlan', 'bluetooth', 'netz', 'network'
        ];
        
        let matched = false;
        for (const keyword of keywords) {
          if (issue.includes(keyword)) {
            byIssue[keyword] = (byIssue[keyword] || 0) + 1;
            matched = true;
            break; // Nehme nur das erste passende Schlüsselwort
          }
        }
        
        // Wenn kein Schlüsselwort gefunden wurde, verwende "Sonstiges"
        if (!matched) {
          byIssue['sonstiges'] = (byIssue['sonstiges'] || 0) + 1;
        }
      });
      
      // Die neuesten 5 Reparaturen
      const mostRecentRepairs = [...userRepairs]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      
      // Umsatzberechnung
      const revenue = {
        total: 0,
        byStatus: {} as Record<string, number>,
        byMonth: {} as Record<number, number>,
        byDay: {} as Record<string, number>
      };
      
      // Gesamtumsatz und Umsatz nach Status berechnen
      userRepairs.forEach(repair => {
        // Extrahiere den geschätzten Kostenwert
        const cost = this.extractNumberFromString(repair.estimatedCost || '0');
        
        // Der Gesamtumsatz wird nur aus Reparaturen mit Status "abgeholt" berechnet
        if (repair.status === 'abgeholt') {
          revenue.total += cost;
        }
        
        // Gruppiere nach Status
        const status = repair.status;
        revenue.byStatus[status] = (revenue.byStatus[status] || 0) + cost;
        
        // Wähle das Datum basierend auf dem Abholstatus oder Erstellungsdatum
        const dateToUse = revenueBasedOnPickup && repair.statusUpdatedAt && repair.status === 'abgeholt'
          ? new Date(repair.statusUpdatedAt)
          : new Date(repair.createdAt);
        
        // Gruppiere nach Monat
        const monthKey = dateToUse.getMonth(); // 0-11 für Jan-Dez
        revenue.byMonth[monthKey] = (revenue.byMonth[monthKey] || 0) + cost;
        
        // Gruppiere nach Tag im Format YYYY-MM-DD
        const year = dateToUse.getFullYear();
        const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
        const day = String(dateToUse.getDate()).padStart(2, '0');
        const dayKey = `${year}-${month}-${day}`;
        revenue.byDay[dayKey] = (revenue.byDay[dayKey] || 0) + cost;
      });
      
      return {
        byDeviceType,
        byBrand,
        byIssue,
        mostRecentRepairs,
        revenue
      };
    } catch (error) {
      console.error("Error getting detailed repair stats:", error);
      return {
        byDeviceType: {},
        byBrand: {},
        byIssue: {},
        mostRecentRepairs: [],
        revenue: {
          total: 0,
          byStatus: {},
          byMonth: {},
          byDay: {}
        }
      };
    }
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
  
  async getFeedbacksByRepairId(repairId: number, currentUserId?: number): Promise<Feedback[]> {
    try {
      if (!currentUserId) {
        return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
      }
      
      // Zuerst die Reparatur abrufen, um zu prüfen, ob sie dem aktuellen Benutzer gehört
      // getRepair enthält bereits die Shop-Isolation basierend auf currentUserId
      const repair = await this.getRepair(repairId, currentUserId);
      if (!repair) {
        // Wenn die Reparatur nicht gefunden wurde oder nicht dem Benutzer gehört
        return [];
      }
      
      // Wenn die Reparatur dem Benutzer gehört, hole die zugehörigen Feedbacks
      // Durch die vorherige Prüfung von getRepair ist die Shop-Isolation bereits sichergestellt
      return await db
        .select()
        .from(feedbacks)
        .where(eq(feedbacks.repairId, repairId));
    } catch (error) {
      console.error("Error retrieving feedbacks for repair:", error);
      return [];
    }
  }

  // Email template methods
  async getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
    try {
      return await emailService.getAllEmailTemplates(userId);
    } catch (error) {
      console.error("Error getting email templates:", error);
      return [];
    }
  }
  
  async getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined> {
    return await emailService.getEmailTemplate(id, userId);
  }
  
  async createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate> {
    return await emailService.createEmailTemplate(template, userId);
  }
  
  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>, userId?: number): Promise<EmailTemplate | undefined> {
    return await emailService.updateEmailTemplate(id, template, userId);
  }
  
  async deleteEmailTemplate(id: number, userId?: number): Promise<boolean> {
    return await emailService.deleteEmailTemplate(id, userId);
  }
  
  // Email sending method with template processing
  async sendEmailWithTemplate(templateId: number, to: string, variables: Record<string, string>, userId?: number): Promise<boolean> {
    try {
      console.log('Storage sendEmailWithTemplate aufgerufen mit templateId:', templateId);
      
      // Benutzer-ID aus den Parametern oder Variablen extrahieren, wenn vorhanden
      const userIdForAccess = userId || (variables.userId ? parseInt(variables.userId) : undefined);
      
      // E-Mail-Vorlage abrufen (mit userId, falls vorhanden, um Zugriffsrechte zu prüfen)
      const template = await this.getEmailTemplate(templateId, userIdForAccess);
      if (!template) {
        console.error(`E-Mail-Vorlage mit ID ${templateId} nicht gefunden`);
        return false;
      }
      
      // E-Mail über den E-Mail-Service senden
      const emailSent = await emailService.sendEmailWithTemplate(templateId, to, variables);
      
      // Wenn die E-Mail erfolgreich gesendet wurde und eine Reparatur-ID in den Variablen ist
      if (emailSent && variables.repairId) {
        console.log(`E-Mail erfolgreich gesendet. Erstelle Verlaufseintrag für Reparatur ${variables.repairId}`);
        
        // Reparatur-ID und Benutzer-ID aus den Variablen extrahieren
        const repairId = parseInt(variables.repairId);
        const userIdForHistory = variables.userId ? parseInt(variables.userId) : undefined;
        
        if (!isNaN(repairId)) {
          // E-Mail-Verlaufseintrag erstellen
          try {
            const historyEntry: InsertEmailHistory = {
              repairId,
              emailTemplateId: templateId,
              subject: template.subject,
              recipient: to,
              status: 'success',
              userId
            };
            
            console.log('Erstelle E-Mail-Verlaufseintrag in der Datenbank:', historyEntry);
            
            // Direktes SQL für den E-Mail-Verlaufseintrag verwenden, um Spaltennamenprobleme zu vermeiden
            const emailHistoryQuery = `
              INSERT INTO "email_history" ("repairId", "emailTemplateId", "subject", "recipient", "status", "userId", "sentAt") 
              VALUES (
                ${repairId},
                ${templateId},
                '${template.subject.replace(/'/g, "''")}',
                '${to.replace(/'/g, "''")}',
                'success',
                ${userId || 'NULL'},
                NOW()
              )
            `;
            
            console.log('Manuelles SQL für E-Mail-Verlaufseintrag:', emailHistoryQuery);
            await db.execute(emailHistoryQuery);
            console.log(`E-Mail-Verlaufseintrag für Reparatur ${repairId} erstellt`);
          } catch (historyError) {
            console.error('Fehler beim Erstellen des E-Mail-Verlaufseintrags:', historyError);
            // Trotzdem true zurückgeben, da die E-Mail erfolgreich gesendet wurde
          }
        } else {
          console.error(`Ungültige Reparatur-ID in Variablen: ${variables.repairId}`);
        }
      }
      
      return emailSent;
    } catch (error) {
      console.error('Fehler in storage.sendEmailWithTemplate:', error);
      return false;
    }
  }
  
  // SMS-Funktionalität wurde auf Kundenwunsch entfernt
  
  // User device types methods
  async getUserDeviceTypes(userId: number): Promise<UserDeviceType[]> {
    return await db
      .select()
      .from(userDeviceTypes)
      .where(eq(userDeviceTypes.userId, userId))
      .orderBy(userDeviceTypes.name);
  }
  
  async getUserDeviceType(id: number, userId: number): Promise<UserDeviceType | undefined> {
    const [deviceType] = await db
      .select()
      .from(userDeviceTypes)
      .where(
        and(
          eq(userDeviceTypes.id, id),
          eq(userDeviceTypes.userId, userId)
        )
      );
    return deviceType;
  }
  
  async createUserDeviceType(deviceType: InsertUserDeviceType, userId: number): Promise<UserDeviceType> {
    const now = new Date();
    const [newDeviceType] = await db
      .insert(userDeviceTypes)
      .values({
        ...deviceType,
        userId,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newDeviceType;
  }
  
  async updateUserDeviceType(id: number, deviceType: Partial<InsertUserDeviceType>, userId: number): Promise<UserDeviceType | undefined> {
    const [updatedDeviceType] = await db
      .update(userDeviceTypes)
      .set({
        ...deviceType,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userDeviceTypes.id, id),
          eq(userDeviceTypes.userId, userId)
        )
      )
      .returning();
    return updatedDeviceType;
  }
  
  async deleteUserDeviceType(id: number, userId: number): Promise<boolean> {
    try {
      // Prüfen, ob Marken diesen Gerätetyp verwenden
      const relatedBrands = await db
        .select()
        .from(userBrands)
        .where(
          and(
            eq(userBrands.deviceTypeId, id),
            eq(userBrands.userId, userId)
          )
        );
      
      if (relatedBrands.length > 0) {
        console.error(`Gerätetyp mit ID ${id} kann nicht gelöscht werden, da er von ${relatedBrands.length} Marken verwendet wird.`);
        return false;
      }
      
      await db
        .delete(userDeviceTypes)
        .where(
          and(
            eq(userDeviceTypes.id, id),
            eq(userDeviceTypes.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting device type:", error);
      return false;
    }
  }
  
  // User brands methods
  async getUserBrands(userId: number): Promise<UserBrand[]> {
    return await db
      .select()
      .from(userBrands)
      .where(eq(userBrands.userId, userId))
      .orderBy(userBrands.name);
  }
  
  async getUserBrand(id: number, userId: number): Promise<UserBrand | undefined> {
    const [brand] = await db
      .select()
      .from(userBrands)
      .where(
        and(
          eq(userBrands.id, id),
          eq(userBrands.userId, userId)
        )
      );
    return brand;
  }
  
  async getUserBrandsByDeviceTypeId(deviceTypeId: number, userId: number): Promise<UserBrand[]> {
    return await db
      .select()
      .from(userBrands)
      .where(
        and(
          eq(userBrands.deviceTypeId, deviceTypeId),
          eq(userBrands.userId, userId)
        )
      )
      .orderBy(userBrands.name);
  }
  
  async createUserBrand(brand: InsertUserBrand, userId: number): Promise<UserBrand> {
    const now = new Date();
    const [newBrand] = await db
      .insert(userBrands)
      .values({
        ...brand,
        userId,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newBrand;
  }
  
  async updateUserBrand(id: number, brand: Partial<InsertUserBrand>, userId: number): Promise<UserBrand | undefined> {
    const [updatedBrand] = await db
      .update(userBrands)
      .set({
        ...brand,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userBrands.id, id),
          eq(userBrands.userId, userId)
        )
      )
      .returning();
    return updatedBrand;
  }
  
  async deleteUserBrand(id: number, userId: number): Promise<boolean> {
    try {
      // Zuerst alle zugehörigen Modellreihen löschen
      await this.deleteAllUserModelSeriesForBrand(id, userId);
      
      // Dann die Marke löschen
      await db
        .delete(userBrands)
        .where(
          and(
            eq(userBrands.id, id),
            eq(userBrands.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting brand:", error);
      return false;
    }
  }
  
  // User model series methods
  async getUserModelSeries(userId: number): Promise<UserModelSeries[]> {
    return await db
      .select()
      .from(userModelSeries)
      .where(eq(userModelSeries.userId, userId))
      .orderBy(userModelSeries.name);
  }
  
  async getUserModelSeriesByBrandId(brandId: number, userId: number): Promise<UserModelSeries[]> {
    return await db
      .select()
      .from(userModelSeries)
      .where(
        and(
          eq(userModelSeries.brandId, brandId),
          eq(userModelSeries.userId, userId)
        )
      )
      .orderBy(userModelSeries.name);
  }
  
  async getUserModelSeriesByNameAndBrand(name: string, brandId: number, userId: number): Promise<UserModelSeries | undefined> {
    const [modelSeries] = await db
      .select()
      .from(userModelSeries)
      .where(
        and(
          eq(userModelSeries.name, name),
          eq(userModelSeries.brandId, brandId),
          eq(userModelSeries.userId, userId)
        )
      );
    return modelSeries;
  }
  
  async getUserModelSeries_ByDeviceTypeAndBrand(deviceTypeId: number, brandId: number, userId: number): Promise<UserModelSeries[]> {
    // Diese Methode holt Modellreihen für eine bestimmte Gerätetyp-Marken-Kombination
    // Wir müssen zuerst die Marke mit dem passenden Gerätetyp finden
    const [brand] = await db
      .select()
      .from(userBrands)
      .where(
        and(
          eq(userBrands.id, brandId),
          eq(userBrands.deviceTypeId, deviceTypeId),
          eq(userBrands.userId, userId)
        )
      );
    
    if (!brand) {
      return [];
    }
    
    // Dann die Modellreihen für diese Marke holen
    return await db
      .select()
      .from(userModelSeries)
      .where(
        and(
          eq(userModelSeries.brandId, brandId),
          eq(userModelSeries.userId, userId)
        )
      )
      .orderBy(userModelSeries.name);
  }
  
  async createUserModelSeries(modelSeries: InsertUserModelSeries, userId: number): Promise<UserModelSeries> {
    // Prüfen, ob bereits eine Modellreihe mit diesem Namen für dieselbe Marke existiert
    const existingModelSeries = await db
      .select()
      .from(userModelSeries)
      .where(
        and(
          eq(userModelSeries.brandId, modelSeries.brandId),
          eq(userModelSeries.name, modelSeries.name),
          eq(userModelSeries.userId, userId)
        )
      )
      .limit(1);
    
    // Wenn bereits eine Modellreihe mit diesem Namen existiert, geben wir diese zurück
    if (existingModelSeries.length > 0) {
      console.log(`[Modellreihe] Eine Modellreihe mit dem Namen '${modelSeries.name}' existiert bereits für Brand ${modelSeries.brandId}`);
      return existingModelSeries[0];
    }
    
    // Ansonsten erstellen wir eine neue Modellreihe
    console.log(`[Modellreihe] Erstelle neue Modellreihe '${modelSeries.name}' für Brand ${modelSeries.brandId}`);
    const [newModelSeries] = await db
      .insert(userModelSeries)
      .values({
        ...modelSeries,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newModelSeries;
  }
  
  async updateUserModelSeries(id: number, modelSeriesData: Partial<InsertUserModelSeries>, userId: number): Promise<UserModelSeries | undefined> {
    const [updatedModelSeries] = await db
      .update(userModelSeries)
      .set({
        ...modelSeriesData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userModelSeries.id, id),
          eq(userModelSeries.userId, userId)
        )
      )
      .returning();
    return updatedModelSeries;
  }
  
  async deleteUserModelSeries(id: number, userId: number): Promise<boolean> {
    try {
      // Zuerst alle zugehörigen Modelle löschen
      await this.deleteAllUserModelsForModelSeries(id, userId);
      
      // Dann die Modellreihe löschen
      await db
        .delete(userModelSeries)
        .where(
          and(
            eq(userModelSeries.id, id),
            eq(userModelSeries.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting user model series:", error);
      return false;
    }
  }
  
  async deleteAllUserModelSeriesForBrand(brandId: number, userId: number): Promise<boolean> {
    try {
      // Hole alle Modellreihen für diese Marke
      const modelSeriesList = await this.getUserModelSeriesByBrandId(brandId, userId);
      
      // Lösche alle zugehörigen Modelle für jede Modellreihe
      for (const modelSeries of modelSeriesList) {
        await this.deleteAllUserModelsForModelSeries(modelSeries.id, userId);
      }
      
      // Lösche alle Modellreihen für diese Marke
      await db
        .delete(userModelSeries)
        .where(
          and(
            eq(userModelSeries.brandId, brandId),
            eq(userModelSeries.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting all user model series for brand:", error);
      return false;
    }
  }
  
  // User models methods
  async getUserModels(userId: number): Promise<UserModel[]> {
    return await db
      .select()
      .from(userModels)
      .where(eq(userModels.userId, userId))
      .orderBy(userModels.name);
  }
  
  async getUserModelsByModelSeriesId(modelSeriesId: number, userId: number): Promise<UserModel[]> {
    return await db
      .select()
      .from(userModels)
      .where(
        and(
          eq(userModels.modelSeriesId, modelSeriesId),
          eq(userModels.userId, userId)
        )
      )
      .orderBy(userModels.name);
  }
  
  async createUserModel(model: InsertUserModel, userId: number): Promise<UserModel> {
    const [newModel] = await db
      .insert(userModels)
      .values({
        ...model,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newModel;
  }
  
  async updateUserModel(id: number, modelData: Partial<InsertUserModel>, userId: number): Promise<UserModel | undefined> {
    const [updatedModel] = await db
      .update(userModels)
      .set({
        ...modelData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userModels.id, id),
          eq(userModels.userId, userId)
        )
      )
      .returning();
    return updatedModel;
  }
  
  async deleteUserModel(id: number, userId: number): Promise<boolean> {
    try {
      await db
        .delete(userModels)
        .where(
          and(
            eq(userModels.id, id),
            eq(userModels.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting user model:", error);
      return false;
    }
  }
  
  async deleteAllUserModelsForModelSeries(modelSeriesId: number, userId: number): Promise<boolean> {
    try {
      await db
        .delete(userModels)
        .where(
          and(
            eq(userModels.modelSeriesId, modelSeriesId),
            eq(userModels.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting all user models for model series:", error);
      return false;
    }
  }
  
  async deleteAllUserModelsForBrand(brandId: number, deviceTypeId: number, userId: number): Promise<boolean> {
    try {
      // Da userModels kein direktes brandId-Feld hat, müssen wir einen Umweg gehen
      // Wir holen zuerst alle Modellreihen für diese Marke
      const modelSeriesList = await this.getUserModelSeriesByBrandId(brandId, userId);
      
      // Lösche alle Modelle für diese Modellreihen
      for (const modelSeries of modelSeriesList) {
        await this.deleteAllUserModelsForModelSeries(modelSeries.id, userId);
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting all user models for brand and device type:", error);
      return false;
    }
  }
  
  // Die Device Types und Brands Management Methoden wurden entfernt
  
  // Kostenvoranschlag-Methoden (CostEstimate)
  async getAllCostEstimates(currentUserId?: number): Promise<CostEstimate[]> {
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];
    
    // Prüfen, ob der Benutzer Admin ist (bugi)
    if (currentUser.isAdmin) {
      // Admin kann alle Kostenvoranschläge sehen
      return await db
        .select()
        .from(costEstimates)
        .orderBy(desc(costEstimates.createdAt));
    }
    
    // Normaler Benutzer sieht nur Kostenvoranschläge aus seinem Shop
    const shopIdValue = currentUser.shopId || 1;
    return await db
      .select()
      .from(costEstimates)
      .where(eq(costEstimates.shopId, shopIdValue))
      .orderBy(desc(costEstimates.createdAt));
  }
  
  async getCostEstimate(id: number, currentUserId?: number): Promise<(CostEstimate & { customer?: any }) | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    let estimate: CostEstimate | undefined;
    
    // Prüfen, ob der Benutzer Admin ist (bugi)
    if (currentUser.isAdmin) {
      // Admin kann alle Kostenvoranschläge sehen
      const [result] = await db
        .select()
        .from(costEstimates)
        .where(eq(costEstimates.id, id));
      estimate = result;
    } else {
      // Normaler Benutzer sieht nur Kostenvoranschläge aus seinem Shop
      const shopIdValue = currentUser.shopId || 1;
      const [result] = await db
        .select()
        .from(costEstimates)
        .where(
          and(
            eq(costEstimates.id, id),
            eq(costEstimates.shopId, shopIdValue)
          ) as SQL<unknown>
        );
      estimate = result;
    }
    
    if (!estimate) {
      return undefined;
    }
    
    // Kundeninformationen aus der Datenbank abrufen
    if (estimate.customerId) {
      const customer = await this.getCustomer(estimate.customerId, currentUserId);
      if (customer) {
        // Kombiniere Kostenvoranschlag mit Kundendaten
        return {
          ...estimate,
          customer
        };
      }
    }
    
    return estimate;
  }
  
  async getCostEstimatesByCustomerId(customerId: number, currentUserId?: number): Promise<CostEstimate[]> {
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return [];
    
    // Jeder Benutzer, auch Admin, sieht nur Kostenvoranschläge aus seinem Shop (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    return await db
      .select()
      .from(costEstimates)
      .where(
        and(
          eq(costEstimates.customerId, customerId),
          eq(costEstimates.shopId, shopIdValue)
        ) as SQL<unknown>
      )
      .orderBy(desc(costEstimates.createdAt));
  }
  
  async createCostEstimate(estimate: InsertCostEstimate, currentUserId?: number): Promise<CostEstimate> {
    const now = new Date();
    
    // Wenn keine Benutzer-ID angegeben ist, gebe einen Fehler zurück
    if (!currentUserId) {
      throw new Error("Benutzer-ID erforderlich, um einen Kostenvoranschlag zu erstellen");
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) {
      throw new Error("Benutzer nicht gefunden");
    }
    
    // Shop-ID des Benutzers ermitteln
    const shopIdValue = currentUser.shopId || 1;
    
    // Generiere eine eindeutige Referenznummer für den Kostenvoranschlag
    const referenceNumber = await this.generateUniqueReferenceNumber();
    
    // Berechne die Summen neu, um sicherzustellen, dass sie korrekt sind
    const items = Array.isArray(estimate.items) ? estimate.items : [];
    
    // Extrahiere alle Preise aus den Positionen
    const itemPrices = items.map(item => this.extractNumberFromString(item.totalPrice));
    
    // Berechne die Zwischensumme
    const subtotalValue = itemPrices.reduce((sum, price) => sum + price, 0);
    const subtotal = subtotalValue.toFixed(2) + ' €';
    
    // Berechne die MwSt
    const taxRateValue = this.extractNumberFromString(estimate.taxRate || '20');
    const taxAmountValue = subtotalValue * (taxRateValue / 100);
    const taxAmount = taxAmountValue.toFixed(2) + ' €';
    
    // Berechne die Gesamtsumme
    const totalValue = subtotalValue + taxAmountValue;
    const total = totalValue.toFixed(2) + ' €';
    
    const costEstimateData = {
      ...estimate,
      referenceNumber,
      subtotal,
      taxAmount,
      total,
      createdAt: now,
      updatedAt: now,
      userId: currentUserId,
      shopId: shopIdValue // Shop-ID setzen
    };
    
    const [newEstimate] = await db.insert(costEstimates)
      .values(costEstimateData)
      .returning();
    
    return newEstimate;
  }
  
  async updateCostEstimate(id: number, estimateUpdate: Partial<InsertCostEstimate>, currentUserId?: number): Promise<CostEstimate | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    // Aktuellen Kostenvoranschlag abrufen
    const currentEstimate = await this.getCostEstimate(id, currentUserId);
    if (!currentEstimate) {
      return undefined;
    }
    
    // Wenn die Items aktualisiert werden, berechne die Summen neu
    let updateData: any = { ...estimateUpdate, updatedAt: new Date() };
    
    if (estimateUpdate.items) {
      const items = Array.isArray(estimateUpdate.items) ? estimateUpdate.items : [];
      
      // Extrahiere alle Preise aus den Positionen
      const itemPrices = items.map(item => this.extractNumberFromString(item.totalPrice));
      
      // Berechne die Zwischensumme
      const subtotalValue = itemPrices.reduce((sum, price) => sum + price, 0);
      updateData.subtotal = subtotalValue.toFixed(2) + ' €';
      
      // Berechne die MwSt
      const taxRateValue = this.extractNumberFromString(estimateUpdate.taxRate || currentEstimate.taxRate);
      const taxAmountValue = subtotalValue * (taxRateValue / 100);
      updateData.taxAmount = taxAmountValue.toFixed(2) + ' €';
      
      // Berechne die Gesamtsumme
      const totalValue = subtotalValue + taxAmountValue;
      updateData.total = totalValue.toFixed(2) + ' €';
    } else if (estimateUpdate.taxRate) {
      // Wenn nur der Steuersatz aktualisiert wird, berechne MwSt und Gesamtsumme neu
      const subtotalValue = this.extractNumberFromString(currentEstimate.subtotal);
      const taxRateValue = this.extractNumberFromString(estimateUpdate.taxRate);
      const taxAmountValue = subtotalValue * (taxRateValue / 100);
      updateData.taxAmount = taxAmountValue.toFixed(2) + ' €';
      
      // Berechne die Gesamtsumme
      const totalValue = subtotalValue + taxAmountValue;
      updateData.total = totalValue.toFixed(2) + ' €';
    }
    
    // Jeder Benutzer, auch Admin, kann nur Kostenvoranschläge aus seinem Shop aktualisieren (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const whereCondition = and(
      eq(costEstimates.id, id),
      eq(costEstimates.shopId, shopIdValue)
    ) as SQL<unknown>;
    
    const [updatedEstimate] = await db
      .update(costEstimates)
      .set(updateData)
      .where(whereCondition)
      .returning();
    
    return updatedEstimate;
  }
  
  async updateCostEstimateStatus(id: number, status: string, currentUserId?: number): Promise<CostEstimate | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    let updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    // Wenn der Status auf "angenommen" gesetzt wird, aktualisiere das Annahmedatum
    if (status === 'angenommen') {
      updateData.acceptedAt = new Date();
    }
    
    // Jeder Benutzer, auch Admin, kann nur Kostenvoranschläge aus seinem Shop aktualisieren (DSGVO-konform)
    const shopIdValue = currentUser.shopId || 1;
    const whereCondition = and(
      eq(costEstimates.id, id),
      eq(costEstimates.shopId, shopIdValue)
    ) as SQL<unknown>;
    
    const [updatedEstimate] = await db
      .update(costEstimates)
      .set(updateData)
      .where(whereCondition)
      .returning();
    
    return updatedEstimate;
  }
  
  async deleteCostEstimate(id: number, currentUserId?: number): Promise<boolean> {
    try {
      if (!currentUserId) {
        return false; // Wenn keine Benutzer-ID angegeben ist, gebe false zurück
      }
      
      // Benutzer holen, um Shop-ID zu erhalten
      const currentUser = await this.getUser(currentUserId);
      if (!currentUser) return false;
      
      // Jeder Benutzer, auch Admin, kann nur Kostenvoranschläge aus seinem Shop löschen (DSGVO-konform)
      const shopIdValue = currentUser.shopId || 1;
      const whereCondition = and(
        eq(costEstimates.id, id),
        eq(costEstimates.shopId, shopIdValue)
      ) as SQL<unknown>;
      
      await db.delete(costEstimates).where(whereCondition);
      return true;
    } catch (error) {
      console.error("Error deleting cost estimate:", error);
      return false;
    }
  }
  
  async convertToRepair(id: number, currentUserId?: number): Promise<Repair | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    
    // Benutzer holen, um Shop-ID zu erhalten
    const currentUser = await this.getUser(currentUserId);
    if (!currentUser) return undefined;
    
    // Kostenvoranschlag abrufen (getCostEstimate enthält bereits die Shop-ID-Überprüfung)
    const estimate = await this.getCostEstimate(id, currentUserId);
    if (!estimate) {
      return undefined;
    }
    
    // Erstelle einen neuen Reparaturauftrag basierend auf dem Kostenvoranschlag
    const repairData: InsertRepair = {
      customerId: estimate.customerId,
      deviceType: estimate.deviceType,
      brand: estimate.brand,
      model: estimate.model,
      serialNumber: estimate.serialNumber,
      issue: estimate.issue || estimate.title,
      estimatedCost: estimate.total,
      status: 'eingegangen',
      notes: `Erstellt aus Kostenvoranschlag ${estimate.referenceNumber}. ${estimate.notes || ''}`.trim(),
    };
    
    try {
      // Reparatur erstellen
      const repair = await this.createRepair(repairData, currentUserId);
      
      // SQL-Bedingung für das Update basierend auf Benutzerrechten erstellen
      let whereCondition: SQL<unknown>;
      
      if (currentUser.isAdmin) {
        // Admin kann jeden Kostenvoranschlag konvertieren
        whereCondition = eq(costEstimates.id, id);
      } else {
        // Normaler Benutzer kann nur Kostenvoranschläge aus seinem Shop konvertieren
        const shopIdValue = currentUser.shopId || 1;
        whereCondition = and(
          eq(costEstimates.id, id),
          eq(costEstimates.shopId, shopIdValue)
        ) as SQL<unknown>;
      }
      
      // Kostenvoranschlag als umgewandelt markieren
      await db
        .update(costEstimates)
        .set({
          convertedToRepair: true,
          repairId: repair.id,
          updatedAt: new Date()
        })
        .where(whereCondition);
      
      return repair;
    } catch (error) {
      console.error("Error converting cost estimate to repair:", error);
      return undefined;
    }
  }

  // E-Mail-Verlauf Methoden
  async getEmailHistoryForRepair(repairId: number): Promise<(EmailHistory & { templateName?: string })[]> {
    try {
      console.log(`Suche E-Mail-Verlauf für Reparatur ${repairId}`);
      
      // JOIN-Abfrage, um auch den Namen der Vorlagen zu laden
      const query = `
        SELECT 
          h.*, 
          t.name as "templateName" 
        FROM 
          "email_history" h 
        LEFT JOIN 
          "email_templates" t ON h."emailTemplateId" = t.id 
        WHERE 
          h."repairId" = ${repairId} 
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

  async createEmailHistoryEntry(entry: InsertEmailHistory): Promise<EmailHistory> {
    try {
      console.log('Erstelle E-Mail-Verlaufseintrag in der Datenbank:', entry);
      console.log('RepairId Typ:', typeof entry.repairId, 'Wert:', entry.repairId);
      
      // Verwende Drizzle ORM für die Datenbankoperation
      const [result] = await db.insert(emailHistory)
        .values({
          repairId: Number(entry.repairId), // Stelle sicher, dass es eine Zahl ist
          emailTemplateId: entry.emailTemplateId ? Number(entry.emailTemplateId) : null,
          subject: entry.subject,
          recipient: entry.recipient,
          status: entry.status,
          userId: entry.userId ? Number(entry.userId) : null
        })
        .returning();
      
      console.log('Erstellter E-Mail-Verlaufseintrag:', result);
      return result;
    } catch (error) {
      console.error("Error creating email history entry:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();