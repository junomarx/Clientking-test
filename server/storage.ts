import { 
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  repairs, type Repair, type InsertRepair,
  businessSettings, type BusinessSettings, type InsertBusinessSettings,
  feedbacks, type Feedback, type InsertFeedback,
  emailTemplates, type EmailTemplate, type InsertEmailTemplate,
  smsTemplates, type SmsTemplate, type InsertSmsTemplate,
  deviceTypesList, type DeviceType, type InsertDeviceType,
  brandsList, type Brand, type InsertBrand
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lt, count, isNotNull, like } from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { emailService } from "./email-service";
import { smsService } from "./sms-service";

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
    readyForPickup: number;
    outsourced: number;
  }>;
  
  // Detaillierte Reparaturstatistiken für erweiterte Analysen
  getDetailedRepairStats(): Promise<{
    byDeviceType: Record<string, number>;
    byBrand: Record<string, number>;
    byIssue: Record<string, number>;
    mostRecentRepairs: Repair[];
  }>;

  // Feedback methods
  createFeedbackToken(repairId: number, customerId: number): Promise<string>;
  getFeedbackByToken(token: string): Promise<Feedback | undefined>;
  submitFeedback(token: string, rating: number, comment?: string): Promise<Feedback | undefined>;
  getFeedbacksByRepairId(repairId: number): Promise<Feedback[]>;
  
  // Email template methods
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  
  // Email sending method (with template)
  sendEmailWithTemplate(templateId: number, to: string, variables: Record<string, string>): Promise<boolean>;
  
  // SMS template methods
  getAllSmsTemplates(userId?: number): Promise<SmsTemplate[]>;
  getSmsTemplate(id: number, userId?: number): Promise<SmsTemplate | undefined>;
  createSmsTemplate(template: InsertSmsTemplate, userId?: number): Promise<SmsTemplate>;
  updateSmsTemplate(id: number, template: Partial<InsertSmsTemplate>, userId?: number): Promise<SmsTemplate | undefined>;
  deleteSmsTemplate(id: number, userId?: number): Promise<boolean>;
  
  // SMS sending method
  sendSmsWithTemplate(templateId: number, phoneNumber: string, variables: Record<string, string>, userId?: number): Promise<boolean>;
  
  // Device types methods (zentral verwaltet)
  getAllDeviceTypes(): Promise<DeviceType[]>;
  getDeviceType(id: number): Promise<DeviceType | undefined>;
  createDeviceType(deviceType: InsertDeviceType): Promise<DeviceType>;
  updateDeviceType(id: number, deviceType: Partial<InsertDeviceType>): Promise<DeviceType | undefined>;
  deleteDeviceType(id: number): Promise<boolean>;
  
  // Brands methods (zentral verwaltet)
  getAllBrands(deviceTypeId?: number): Promise<Brand[]>;
  getBrand(id: number): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: number, brand: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: number): Promise<boolean>;
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
  
  async getUsersByEmail(email: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.email, email));
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
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
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
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
    return await db
      .select()
      .from(customers)
      .where(eq(customers.userId, currentUserId))
      .orderBy(desc(customers.createdAt));
  }
  
  async getCustomer(id: number, currentUserId?: number): Promise<Customer | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.userId, currentUserId)
        )
      );
    return customer;
  }
  
  async findCustomersByName(firstName: string, lastName: string, currentUserId?: number): Promise<Customer[]> {
    // Suche Kunden, deren Vor- und Nachname die gesuchten Begriffe enthalten (case-insensitive)
    // und die zum aktuellen Benutzer gehören (falls currentUserId angegeben ist)
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    return await db
      .select()
      .from(customers)
      .where(
        and(
          sql`LOWER(${customers.firstName}) LIKE LOWER(${'%' + firstName + '%'})`,
          sql`LOWER(${customers.lastName}) LIKE LOWER(${'%' + lastName + '%'})`,
          eq(customers.userId, currentUserId)
        )
      );
  }
  
  async createCustomer(insertCustomer: InsertCustomer, currentUserId?: number): Promise<Customer> {
    const [customer] = await db.insert(customers).values({
      ...insertCustomer,
      createdAt: new Date(),
      // Wenn ein Benutzerkontext vorhanden ist, setze den userId-Wert
      userId: currentUserId
    }).returning();
    return customer;
  }
  
  async updateCustomer(id: number, customerUpdate: Partial<InsertCustomer>, currentUserId?: number): Promise<Customer | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    const [updatedCustomer] = await db
      .update(customers)
      .set(customerUpdate)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.userId, currentUserId)
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
      await db.delete(customers).where(
        and(
          eq(customers.id, id),
          eq(customers.userId, currentUserId)
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
    return await db
      .select()
      .from(repairs)
      .where(eq(repairs.userId, currentUserId))
      .orderBy(desc(repairs.createdAt));
  }
  
  async getRepair(id: number, currentUserId?: number): Promise<Repair | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    const [repair] = await db
      .select()
      .from(repairs)
      .where(
        and(
          eq(repairs.id, id),
          eq(repairs.userId, currentUserId)
        )
      );
    return repair;
  }
  
  async getRepairsByCustomerId(customerId: number, currentUserId?: number): Promise<Repair[]> {
    if (!currentUserId) {
      return []; // Wenn keine Benutzer-ID angegeben ist, gebe eine leere Liste zurück
    }
    return await db
      .select()
      .from(repairs)
      .where(
        and(
          eq(repairs.customerId, customerId),
          eq(repairs.userId, currentUserId)
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

  async createRepair(insertRepair: InsertRepair, currentUserId?: number): Promise<Repair> {
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
      updatedAt: now,
      // Setze die Benutzer-ID, wenn vorhanden
      userId: currentUserId
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
    const [updatedRepair] = await db
      .update(repairs)
      .set({
        ...repairUpdate,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(repairs.id, id),
          eq(repairs.userId, currentUserId)
        )
      )
      .returning();
    
    return updatedRepair;
  }
  
  async updateRepairStatus(id: number, status: string, currentUserId?: number): Promise<Repair | undefined> {
    if (!currentUserId) {
      return undefined; // Wenn keine Benutzer-ID angegeben ist, gebe undefined zurück
    }
    const [updatedRepair] = await db
      .update(repairs)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(repairs.id, id),
          eq(repairs.userId, currentUserId)
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
      // Lösche nur Reparaturen, die dem aktuellen Benutzer gehören
      await db.delete(repairs).where(
        and(
          eq(repairs.id, id),
          eq(repairs.userId, currentUserId)
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
    // Wenn eine Benutzer-ID angegeben ist, filtere nach dieser
    if (userId) {
      const [settings] = await db.select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId));
      return settings;
    }
    
    // Ansonsten gebe die erste Einstellung zurück (für Kompatibilität)
    const [settings] = await db.select().from(businessSettings);
    return settings;
  }
  
  async updateBusinessSettings(settingsData: Partial<InsertBusinessSettings>, userId?: number): Promise<BusinessSettings> {
    // Wenn eine Benutzer-ID angegeben ist, versuche die Einstellungen für diesen Benutzer zu finden
    const existingSettings = userId ? 
      await this.getBusinessSettings(userId) : 
      await this.getBusinessSettings();
    
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
      // Create new settings for this user
      const [newSettings] = await db
        .insert(businessSettings)
        .values({
          ...settingsData as InsertBusinessSettings,
          updatedAt: new Date(),
          userId: userId // Speichere die Benutzer-ID
        })
        .returning();
      
      return newSettings;
    }
  }
  
  // Stats methods
  async getStats(currentUserId?: number): Promise<{ 
    totalOrders: number; 
    inRepair: number; 
    completed: number; 
    today: number;
    readyForPickup: number; 
    outsourced: number; 
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
      };
    }
    
    const userFilter = eq(repairs.userId, currentUserId);
    
    // Get total number of orders
    const [totalResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(userFilter);
    
    // Get number of repairs in progress
    const [inRepairResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "in_reparatur"), userFilter)
      );
    
    // Get number of completed repairs
    const [completedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(
          or(
            eq(repairs.status, "fertig"),
            eq(repairs.status, "abgeholt")
          ),
          userFilter
        )
      );
    
    // Get number of repairs ready for pickup
    const [readyForPickupResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "fertig"), userFilter)
      );
      
    // Get number of outsourced repairs
    const [outsourcedResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(eq(repairs.status, "ausser_haus"), userFilter)
      );
    
    // Get number of repairs created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateFilter = and(
      gte(repairs.createdAt, today),
      lt(repairs.createdAt, tomorrow)
    );
    
    const [todayResult] = await db
      .select({ count: count() })
      .from(repairs)
      .where(
        and(dateFilter, userFilter)
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
  
  // Detaillierte Reparaturstatistiken nach Gerätetyp und häufigen Problemen
  async getDetailedRepairStats(currentUserId?: number): Promise<{
    byDeviceType: Record<string, number>;
    byBrand: Record<string, number>;
    byIssue: Record<string, number>;
    mostRecentRepairs: Repair[];
  }> {
    try {
      if (!currentUserId) {
        return {
          byDeviceType: {},
          byBrand: {},
          byIssue: {},
          mostRecentRepairs: []
        };
      }
      
      // Alle Reparaturen des Benutzers abrufen
      const userRepairs = await db
        .select()
        .from(repairs)
        .where(eq(repairs.userId, currentUserId));
      
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
      
      return {
        byDeviceType,
        byBrand,
        byIssue,
        mostRecentRepairs
      };
    } catch (error) {
      console.error("Error getting detailed repair stats:", error);
      return {
        byDeviceType: {},
        byBrand: {},
        byIssue: {},
        mostRecentRepairs: []
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
      const repair = await this.getRepair(repairId, currentUserId);
      if (!repair) {
        // Wenn die Reparatur nicht gefunden wurde oder nicht dem Benutzer gehört
        return [];
      }
      
      // Wenn die Reparatur dem Benutzer gehört, hole die zugehörigen Feedbacks
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
  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await emailService.getAllEmailTemplates();
  }
  
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return await emailService.getEmailTemplate(id);
  }
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    return await emailService.createEmailTemplate(template);
  }
  
  async updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    return await emailService.updateEmailTemplate(id, template);
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    return await emailService.deleteEmailTemplate(id);
  }
  
  // Email sending method with template processing
  async sendEmailWithTemplate(templateId: number, to: string, variables: Record<string, string>): Promise<boolean> {
    return await emailService.sendEmailWithTemplate(templateId, to, variables);
  }
  
  // SMS template methods
  async getAllSmsTemplates(userId?: number): Promise<SmsTemplate[]> {
    try {
      // Wenn eine Benutzer-ID angegeben ist, filtere nach dieser ID
      if (userId) {
        return await db
          .select()
          .from(smsTemplates)
          .where(eq(smsTemplates.userId, userId))
          .orderBy(desc(smsTemplates.createdAt));
      }
      
      // Ansonsten gebe alle SMS-Vorlagen zurück
      return await db
        .select()
        .from(smsTemplates)
        .orderBy(desc(smsTemplates.createdAt));
    } catch (error) {
      console.error("Error retrieving SMS templates:", error);
      return [];
    }
  }
  
  async getSmsTemplate(id: number, userId?: number): Promise<SmsTemplate | undefined> {
    try {
      // Wenn eine Benutzer-ID angegeben ist, filtere nach dieser ID
      if (userId) {
        const [template] = await db
          .select()
          .from(smsTemplates)
          .where(
            and(
              eq(smsTemplates.id, id),
              eq(smsTemplates.userId, userId)
            )
          );
        return template;
      }
      
      // Ansonsten hole die Vorlage nur anhand der ID
      const [template] = await db
        .select()
        .from(smsTemplates)
        .where(eq(smsTemplates.id, id));
      return template;
    } catch (error) {
      console.error("Error retrieving SMS template:", error);
      return undefined;
    }
  }
  
  async createSmsTemplate(template: InsertSmsTemplate, userId?: number): Promise<SmsTemplate> {
    try {
      const [newTemplate] = await db.insert(smsTemplates).values({
        ...template,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return newTemplate;
    } catch (error) {
      console.error("Error creating SMS template:", error);
      throw new Error("Fehler beim Erstellen der SMS-Vorlage");
    }
  }
  
  async updateSmsTemplate(id: number, template: Partial<InsertSmsTemplate>, userId?: number): Promise<SmsTemplate | undefined> {
    try {
      // Wenn eine Benutzer-ID angegeben ist, aktualisiere nur, wenn die Vorlage dem Benutzer gehört
      if (userId) {
        const [updatedTemplate] = await db
          .update(smsTemplates)
          .set({
            ...template,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(smsTemplates.id, id),
              eq(smsTemplates.userId, userId)
            )
          )
          .returning();
        return updatedTemplate;
      }
      
      // Ansonsten aktualisiere ohne Benutzerfilter
      const [updatedTemplate] = await db
        .update(smsTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(eq(smsTemplates.id, id))
        .returning();
      return updatedTemplate;
    } catch (error) {
      console.error("Error updating SMS template:", error);
      return undefined;
    }
  }
  
  async deleteSmsTemplate(id: number, userId?: number): Promise<boolean> {
    try {
      // Wenn eine Benutzer-ID angegeben ist, lösche nur, wenn die Vorlage dem Benutzer gehört
      if (userId) {
        await db.delete(smsTemplates).where(
          and(
            eq(smsTemplates.id, id),
            eq(smsTemplates.userId, userId)
          )
        );
      } else {
        // Ansonsten lösche ohne Benutzerfilter
        await db.delete(smsTemplates).where(eq(smsTemplates.id, id));
      }
      return true;
    } catch (error) {
      console.error("Error deleting SMS template:", error);
      return false;
    }
  }
  
  // SMS sending method
  async sendSmsWithTemplate(templateId: number, phoneNumber: string, variables: Record<string, string>, userId?: number): Promise<boolean> {
    try {
      // Hole die SMS-Vorlage
      const template = await this.getSmsTemplate(templateId, userId);
      if (!template) {
        console.error("SMS template not found");
        return false;
      }
      
      // Sende die SMS mit der Vorlage
      return await smsService.sendSmsWithTemplate(template, phoneNumber, variables);
    } catch (error) {
      console.error("Error sending SMS with template:", error);
      return false;
    }
  }
  
  // ==========================================================================
  // Device Types Management Methods (zentral verwaltet durch Admin)
  // ==========================================================================
  
  async getAllDeviceTypes(): Promise<DeviceType[]> {
    return await db
      .select()
      .from(deviceTypesList)
      .orderBy(deviceTypesList.name);
  }
  
  async getDeviceType(id: number): Promise<DeviceType | undefined> {
    const [deviceType] = await db
      .select()
      .from(deviceTypesList)
      .where(eq(deviceTypesList.id, id));
    
    return deviceType;
  }
  
  async createDeviceType(deviceType: InsertDeviceType): Promise<DeviceType> {
    const now = new Date();
    
    const [newDeviceType] = await db
      .insert(deviceTypesList)
      .values({
        ...deviceType,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return newDeviceType;
  }
  
  async updateDeviceType(id: number, deviceTypeUpdate: Partial<InsertDeviceType>): Promise<DeviceType | undefined> {
    const [updatedDeviceType] = await db
      .update(deviceTypesList)
      .set({
        ...deviceTypeUpdate,
        updatedAt: new Date()
      })
      .where(eq(deviceTypesList.id, id))
      .returning();
    
    return updatedDeviceType;
  }
  
  async deleteDeviceType(id: number): Promise<boolean> {
    try {
      // Prüfe, ob dieser Gerätetyp noch von Marken verwendet wird
      const brandsUsingType = await db
        .select({ count: count() })
        .from(brandsList)
        .where(eq(brandsList.deviceTypeId, id));
      
      if (brandsUsingType[0]?.count > 0) {
        // Es gibt noch Marken, die diesen Gerätetyp verwenden
        return false;
      }
      
      // Lösche den Gerätetyp, wenn er nicht mehr verwendet wird
      await db.delete(deviceTypesList).where(eq(deviceTypesList.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting device type:", error);
      return false;
    }
  }
  
  // ==========================================================================
  // Brands Management Methods (zentral verwaltet durch Admin)
  // ==========================================================================
  
  async getAllBrands(deviceTypeId?: number): Promise<Brand[]> {
    // Wenn eine Gerätetyp-ID angegeben ist, filtere nach dieser
    if (deviceTypeId) {
      return await db
        .select()
        .from(brandsList)
        .where(eq(brandsList.deviceTypeId, deviceTypeId))
        .orderBy(brandsList.name);
    }
    
    // Andernfalls gib alle Marken zurück
    return await db
      .select()
      .from(brandsList)
      .orderBy(brandsList.name);
  }
  
  async getBrand(id: number): Promise<Brand | undefined> {
    const [brand] = await db
      .select()
      .from(brandsList)
      .where(eq(brandsList.id, id));
    
    return brand;
  }
  
  async createBrand(brand: InsertBrand): Promise<Brand> {
    const now = new Date();
    
    const [newBrand] = await db
      .insert(brandsList)
      .values({
        ...brand,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return newBrand;
  }
  
  async updateBrand(id: number, brandUpdate: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [updatedBrand] = await db
      .update(brandsList)
      .set({
        ...brandUpdate,
        updatedAt: new Date()
      })
      .where(eq(brandsList.id, id))
      .returning();
    
    return updatedBrand;
  }
  
  async deleteBrand(id: number): Promise<boolean> {
    try {
      // Hier könnten wir prüfen, ob diese Marke noch von Reparaturen verwendet wird
      // Für diese Implementierung erlauben wir das Löschen von Marken ohne Prüfung
      await db.delete(brandsList).where(eq(brandsList.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting brand:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();