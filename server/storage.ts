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
  shops,
  type Shop,
  supportAccessLogs,
  type SupportAccessLog,
  type InsertSupportAccessLog,
  packages,
  type Package,
  packageFeatures,
  costEstimates,
  type CostEstimate,
  type InsertCostEstimate,
  type CostEstimateItem,
  tempSignatures,
  type TempSignature,
  type InsertTempSignature,
  spareParts,
  type SparePart,
  type InsertSparePart,
  repairStatusHistory,
  accessories,
  type Accessory,
  type InsertAccessory,
  loanerDevices,
  type LoanerDevice,
  type InsertLoanerDevice,
  userShopAccess,
  type UserShopAccess,
  type InsertUserShopAccess,
  multiShopPermissions,
  type MultiShopPermission,
  type InsertMultiShopPermission,
  msaProfiles,
  type MSAProfile,
  msaPricing,
  type MSAPricing,
  activityLogs,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import crypto from "crypto";
import { db } from "./db";
import {
  eq,
  desc,
  and,
  gte,
  lte,
  inArray,
  or,
  sql,
  lt,
  gt,
  count,
  isNull,
  isNotNull,
  like,
  SQL,
  not,
  inArray,
} from "drizzle-orm";
import { pool } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { emailService } from "./email-service";
// import { userEmailService } from "./user-specific-email-service.js";

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
  updateUserLastLogin(id: number): Promise<boolean>;
  updateUserLastLogout(id: number): Promise<boolean>;
  updateUserLastActivity(id: number): Promise<boolean>;
  updateUserLoginTimestamp(id: number): Promise<boolean>;
  updateUserLogoutTimestamp(id: number): Promise<boolean>;

  // Multi-Shop Methoden
  getUserAccessibleShops(userId: number): Promise<Shop[]>;
  getUserAccessibleShopsCount(userId: number): Promise<number>;
  createUserShopAccess(access: InsertUserShopAccess): Promise<UserShopAccess>;
  revokeUserShopAccess(userId: number, shopId: number): Promise<boolean>;
  getUserShopAccess(userId: number): Promise<UserShopAccess[]>;
  getMultiShopAdmins(): Promise<Array<User & { accessibleShops: Shop[] }>>;
  getMultiShopAdminDetails(adminId: number): Promise<User & { accessibleShops: Shop[] } | undefined>;
  updateMultiShopAdmin(adminId: number, updates: Partial<User>): Promise<User>;
  getUserByShopId(shopId: number): Promise<User | undefined>;
  
  // Multi-Shop Permission Methoden
  requestShopAccess(multiShopAdminId: number, shopId: number, shopOwnerId: number): Promise<MultiShopPermission>;
  grantShopAccess(permissionId: number): Promise<boolean>;
  revokeShopAccess(permissionId: number): Promise<boolean>;
  getShopPermissions(shopOwnerId: number): Promise<MultiShopPermission[]>;
  hasShopPermission(multiShopAdminId: number, shopId: number): Promise<boolean>;
  getPendingPermissions(shopOwnerId: number): Promise<MultiShopPermission[]>;
  
  // Shop Metrics and Analytics
  getShopMetrics(shopId: number): Promise<{
    totalRepairs: number;
    activeRepairs: number;
    completedRepairs: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalEmployees: number;
    pendingOrders: number;
  }>;
  getShopDetails(shopId: number): Promise<any>;
  
  // Employee Transfer between Shops
  transferEmployeeBetweenShops(employeeId: number, fromShopId: number, toShopId: number): Promise<boolean>;
  getShopEmployees(shopId: number): Promise<User[]>;

  // 2FA Methoden
  setupEmailTwoFA(userId: number): Promise<boolean>;
  setupTOTPTwoFA(userId: number): Promise<{ secret: string; backupCodes: string[] }>;
  verifyTOTP(userId: number, token: string): Promise<boolean>;
  generateEmailTwoFACode(userId: number): Promise<string>;
  verifyEmailTwoFACode(userId: number, code: string): Promise<boolean>;
  disableTwoFA(userId: number): Promise<boolean>;
  generateBackupCodes(): string[];
  
  // E-Mail-Methoden
  getAllEmailTemplates(userId: number): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  sendEmailWithTemplate(templateId: number, recipientEmail: string, variables: Record<string, string>): Promise<boolean>;
  sendEmailWithTemplateById(templateId: number, recipientEmail: string, variables: Record<string, string>): Promise<boolean>;
  
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
  
  // Kostenvoranschläge methods
  getAllCostEstimates(userId: number): Promise<CostEstimate[]>;
  getCostEstimate(id: number, userId: number): Promise<CostEstimate | undefined>;
  getCostEstimateItems(costEstimateId: number, userId: number): Promise<CostEstimateItem[]>;
  createCostEstimate(estimate: InsertCostEstimate, userId: number): Promise<CostEstimate>;
  // Die Methode createCostEstimateItem wurde entfernt (JSON-basierte Implementierung)
  updateCostEstimate(
    id: number,
    estimate: Partial<InsertCostEstimate>,
    userId: number
  ): Promise<CostEstimate | undefined>;
  deleteCostEstimate(id: number, userId: number): Promise<boolean>;
  // Die Methode deleteCostEstimateItem wurde entfernt (JSON-basierte Implementierung)

  // Customer methods
  getAllCustomers(userId: number): Promise<Customer[]>;
  getCustomer(id: number, userId: number): Promise<Customer | undefined>;
  getCustomersByShopId(shopId: number): Promise<Customer[]>;
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
  getRepairByOrderCode(orderCode: string, userId: number): Promise<Repair | undefined>;
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
  updateRepairSignature(
    id: number,
    signature: string,
    signatureType: 'dropoff' | 'pickup',
    userId: number,
  ): Promise<Repair | undefined>;
  updateRepairDeviceCode(
    id: number,
    deviceCode: string | null,
    deviceCodeType: string | null,
    userId: number,
  ): Promise<Repair | undefined>;
  deleteRepair(id: number, userId: number): Promise<boolean>;
  
  // Method to get repairs waiting for spare parts with customer data
  getRepairsWaitingForParts(userId: number): Promise<any[]>;
  
  // Employee Management
  getEmployeesByShopOwner(ownerId: number): Promise<User[]>;
  getEmployeeCountForShop(shopId: number): Promise<number>;
  getMaxEmployeesForShop(shopId: number): Promise<number>;
  createEmployee(employeeData: Partial<User>): Promise<User>;
  updateEmployee(employeeId: number, updateData: Partial<User>, userId: number): Promise<User>;
  updateEmployeeStatus(employeeId: number, isActive: boolean): Promise<User>;
  deleteEmployee(employeeId: number): Promise<void>;

  // Zubehör-Methoden
  createAccessory(accessoryData: InsertAccessory): Promise<Accessory>;
  getAllAccessories(userId: number): Promise<Accessory[]>;
  getAccessory(id: number, userId: number): Promise<Accessory | undefined>;
  updateAccessory(id: number, accessoryData: Partial<InsertAccessory>, userId: number): Promise<Accessory | undefined>;
  deleteAccessory(id: number, userId: number): Promise<boolean>;

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

  // Kostenvoranschlag methods wurden entfernt für spätere Reimplementierung

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

  // Kostenvoranschläge wurden entfernt und werden später neu implementiert
  
  // Paket-Methoden
  getPackageByName(name: string): Promise<Package | undefined>;
  getPackageById(id: number): Promise<Package | undefined>;
  
  // Trial-Version Methoden
  isTrialExpired(userId: number): Promise<boolean>;
  
  // Ersatzteile-Methoden für erweiterte OrdersTab
  getAllSpareParts(userId: number): Promise<SparePart[]>;
  getRepairsWithSpareParts(userId: number): Promise<any[]>;
  bulkUpdateSparePartStatus(partIds: number[], status: string, userId: number): Promise<boolean>;
  
  // Multi-Shop Admin Methoden
  getAllMultiShopAdmins(): Promise<any[]>;
  getUserAccessibleShops(userId: number): Promise<Shop[]>;
  
  // Kiosk-Mitarbeiter Methoden
  getKioskEmployees(shopId: number): Promise<User[]>;
  createKioskEmployee(kioskData: { username: string; email: string; password: string; shopId: number; parentUserId: number }): Promise<User>;
  isKioskOnline(shopId: number): Promise<{ isOnline: boolean; kioskUser?: User }>;
  getAllOnlineKiosks(shopId: number): Promise<{ onlineKiosks: User[]; totalKiosks: number }>;
  
  // MSA Profile und Pricing Methoden
  getMSAProfile(userId: number): Promise<MSAProfile | undefined>;
  createMSAProfile(profile: any): Promise<MSAProfile>;
  updateMSAProfile(userId: number, updates: any): Promise<MSAProfile | undefined>;
  getMSAPricing(userId: number): Promise<MSAPricing | undefined>;
  createMSAPricing(pricing: any): Promise<MSAPricing>;
  updateMSAPricing(userId: number, updates: any): Promise<MSAPricing | undefined>;
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
    isMultiShopAdmin: Boolean(row.is_multi_shop_admin || false),
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

export interface IStorage {
  // Benutzer-Verwaltung
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  
  // Kunden-Verwaltung
  getAllCustomers(userId: number): Promise<Customer[]>;
  getCustomer(id: number, userId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>, userId: number): Promise<Customer | undefined>;
  deleteCustomer(id: number, userId: number): Promise<boolean>;
  
  // Reparatur-Verwaltung
  getAllRepairs(userId: number): Promise<Repair[]>;
  getRepair(id: number, userId: number): Promise<Repair | undefined>;
  getRepairsByCustomer(customerId: number, userId: number): Promise<Repair[]>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair(id: number, repair: Partial<Repair>, userId: number): Promise<Repair | undefined>;
  updateRepairStatus(id: number, status: string, userId: number): Promise<Repair | undefined>;
  deleteRepair(id: number, userId: number): Promise<boolean>;
  
  // Geschäftseinstellungen
  getBusinessSettings(userId: number): Promise<BusinessSettings | undefined>;
  createOrUpdateBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;
  
  // E-Mail-Vorlagen und E-Mail-Versand
  getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>, userId?: number): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId?: number): Promise<boolean>;
  sendEmailWithTemplate(templateId: number, recipientEmail: string, variables: Record<string, string>, userId?: number): Promise<boolean>;
  sendEmailWithTemplateById(templateId: number, recipientEmail: string, variables: Record<string, string>, attachments?: any[], isSystemEmail?: boolean, userId?: number): Promise<boolean>;
  
  // Kostenvoranschläge
  getAllCostEstimates(userId: number): Promise<CostEstimate[]>;
  getCostEstimate(id: number, userId: number): Promise<CostEstimate | undefined>;
  createCostEstimate(estimate: InsertCostEstimate): Promise<CostEstimate>;
  updateCostEstimate(id: number, estimate: Partial<CostEstimate>, userId: number): Promise<CostEstimate | undefined>;
  deleteCostEstimate(id: number, userId: number): Promise<boolean>;
  updateCostEstimateStatus(id: number, status: string, userId: number): Promise<CostEstimate | undefined>;
  
  // E-Mail mit Anhang senden
  sendEmailWithAttachment(options: {
    to: string;
    from: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
    userId?: number;
  }): Promise<boolean>;
  
  // PDF aus HTML generieren
  generatePdfFromHtml(html: string, filename: string): Promise<Buffer | null>;
  
  // E-Mail-Verlauf protokollieren
  logEmailHistory(data: Partial<InsertEmailHistory>): Promise<EmailHistory | undefined>;
  
  // QR-Code Unterschriften methods
  createTempSignature(tempId: string, repairData: any, userId: number, shopId: number): Promise<TempSignature>;
  getTempSignature(tempId: string): Promise<TempSignature | undefined>;
  updateTempSignatureWithSignature(tempId: string, signature: string): Promise<TempSignature | undefined>;
  completeTempSignature(tempId: string): Promise<TempSignature | undefined>;
  cleanupExpiredTempSignatures(): Promise<number>;
  
  // Ersatzteil-Verwaltung
  getSparePartsByRepairId(repairId: number, userId: number): Promise<SparePart[]>;
  getAllSpareParts(userId: number): Promise<SparePart[]>;
  getSparePartsForOrders(userId: number): Promise<SparePart[]>; // Nur für Bestellungen-Tab
  getSparePart(id: number, userId: number): Promise<SparePart | undefined>;
  createSparePart(sparePart: InsertSparePart, userId: number): Promise<SparePart>;
  updateSparePart(id: number, sparePart: Partial<SparePart>, userId: number): Promise<SparePart | undefined>;
  deleteSparePart(id: number, userId: number): Promise<boolean>;
  checkAndUpdateRepairStatus(repairId: number, userId: number): Promise<void>; // Automatische Status-Updates
  
  // Erweiterte Ersatzteil-Verwaltung für neue OrdersTab
  bulkUpdateSparePartStatus(partIds: number[], status: string, userId: number): Promise<boolean>;
  getRepairsWithSpareParts(userId: number): Promise<any[]>;

  // Leihgeräte-Verwaltung
  getAllLoanerDevices(userId: number): Promise<LoanerDevice[]>;
  getLoanerDevice(id: number, userId: number): Promise<LoanerDevice | undefined>;
  createLoanerDevice(device: InsertLoanerDevice): Promise<LoanerDevice>;
  updateLoanerDevice(id: number, device: Partial<InsertLoanerDevice>, userId: number): Promise<LoanerDevice | undefined>;
  deleteLoanerDevice(id: number, userId: number): Promise<boolean>;
  getAvailableLoanerDevices(userId: number): Promise<LoanerDevice[]>;
  assignLoanerDevice(repairId: number, loanerDeviceId: number, userId: number): Promise<boolean>;
  returnLoanerDevice(repairId: number, userId: number): Promise<boolean>;
  getLoanerDeviceByRepairId(repairId: number, userId: number): Promise<LoanerDevice | undefined>;
}

export class DatabaseStorage implements IStorage {
  
  /**
   * Gibt den Display-Namen für einen Benutzer zurück
   * Shop-Owner: Benutzername, Mitarbeiter: Vorname
   */
  public getUserDisplayName(user: any): string {
    if (user.role === 'employee') {
      return user.firstName || 'Unbekannter Mitarbeiter';
    }
    return user.username || 'Unbekannter Benutzer';
  }
  
  // Implementierung der E-Mail-Methoden
  
  /**
   * Holt alle E-Mail-Vorlagen für einen bestimmten Benutzer
   * @param userId ID des Benutzers
   * @returns Liste aller E-Mail-Vorlagen des Benutzers
   */
  async getAllEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    try {
      // Shop-ID des Benutzers ermitteln
      const user = await this.getUser(userId);
      if (!user) throw new Error(`Benutzer mit ID ${userId} nicht gefunden`);
      
      const shopId = user.shopId || 1;
      
      // Alle E-Mail-Vorlagen des Shops abrufen
      const templates = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.shopId, shopId))
        .orderBy(desc(emailTemplates.id));
      
      return templates;
    } catch (error) {
      console.error('Fehler beim Abrufen der E-Mail-Vorlagen:', error);
      return [];
    }
  }
  
  /**
   * Holt eine spezifische E-Mail-Vorlage
   * @param id ID der E-Mail-Vorlage
   * @param userId ID des anfragenden Benutzers (für Shop-Isolation)
   * @returns Die E-Mail-Vorlage oder undefined, wenn nicht gefunden
   */
  async getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    try {
      // Shop-ID des Benutzers ermitteln
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const shopId = user.shopId || 1;
      
      // E-Mail-Vorlage abrufen (nur wenn sie zum Shop des Benutzers gehört)
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.shopId, shopId)
        ));
      
      return template;
    } catch (error) {
      console.error(`Fehler beim Abrufen der E-Mail-Vorlage ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Erstellt eine neue E-Mail-Vorlage
   * @param template Daten der neuen E-Mail-Vorlage
   * @returns Die erstellte E-Mail-Vorlage
   */
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    try {
      const [newTemplate] = await db
        .insert(emailTemplates)
        .values(template)
        .returning();
      
      return newTemplate;
    } catch (error) {
      console.error('Fehler beim Erstellen der E-Mail-Vorlage:', error);
      throw error;
    }
  }
  
  /**
   * Aktualisiert eine bestehende E-Mail-Vorlage
   * @param id ID der zu aktualisierenden E-Mail-Vorlage
   * @param template Neue Daten für die E-Mail-Vorlage
   * @returns Die aktualisierte E-Mail-Vorlage oder undefined bei Fehler
   */
  async updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    try {
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set(template)
        .where(eq(emailTemplates.id, id))
        .returning();
      
      return updatedTemplate;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der E-Mail-Vorlage ${id}:`, error);
      return undefined;
    }
  }
  
  /**
   * Löscht eine E-Mail-Vorlage
   * @param id ID der zu löschenden E-Mail-Vorlage
   * @returns true, wenn erfolgreich gelöscht, sonst false
   */
  async deleteEmailTemplate(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Fehler beim Löschen der E-Mail-Vorlage ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Sendet eine E-Mail mit einer Vorlage
   * @param templateId ID der zu verwendenden E-Mail-Vorlage
   * @param recipientEmail E-Mail-Adresse des Empfängers
   * @param variables Variablen, die in der Vorlage ersetzt werden sollen
   * @returns true, wenn erfolgreich gesendet, sonst false
   */
  async sendEmailWithTemplate(templateId: number, recipientEmail: string, variables: Record<string, string>): Promise<boolean> {
    return this.sendEmailWithTemplateById(templateId, recipientEmail, variables);
  }
  
  /**
   * Sendet eine E-Mail mit einer Vorlage anhand ihrer ID
   * @param templateId ID der zu verwendenden E-Mail-Vorlage
   * @param recipientEmail E-Mail-Adresse des Empfängers
   * @param variables Variablen, die in der Vorlage ersetzt werden sollen
   * @returns true, wenn erfolgreich gesendet, sonst false
   */
  async sendEmailWithTemplateById(templateId: number, recipientEmail: string, variables: Record<string, string>, attachments?: any[], isSystemEmail: boolean = false, userId?: number): Promise<boolean> {
    try {
      // E-Mail-Vorlage abrufen
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, templateId));
      
      if (!template) {
        console.error(`E-Mail-Vorlage mit ID ${templateId} nicht gefunden`);
        return false;
      }
      
      // Betreff und Inhalt mit Variablen ersetzen
      let subject = template.subject || '';
      let body = template.body || '';
      
      console.log(`Verarbeite E-Mail-Vorlage "${template.name}" mit Variablen:`, variables);
      
      // Variablen in Betreff und Inhalt ersetzen
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        
        // Spezielles Handling für Öffnungszeiten - Semikolons in Zeilenumbrüche umwandeln
        let processedValue = value;
        if ((key === 'oeffnungszeiten' || key === 'opening_hours') && typeof value === 'string') {
          // Ersetze alle Semikolons durch HTML-Zeilenumbrüche
          processedValue = value.replace(/;/g, '<br>');
          console.log(`Öffnungszeiten (${key}) mit Zeilenumbrüchen formatiert: ${processedValue}`);
        }
        
        subject = subject.replace(placeholder, processedValue);
        body = body.replace(placeholder, processedValue);
      }
      
      console.log(`E-Mail wird gesendet an ${recipientEmail} mit Betreff: "${subject}"`);
      
      // Wenn es sich um eine System-E-Mail handelt oder kein Benutzer angegeben ist,
      // verwenden wir den globalen E-Mail-Service
      if (isSystemEmail || !userId) {
        console.log(`Verwende globalen E-Mail-Service für ${isSystemEmail ? 'System-E-Mail' : 'E-Mail ohne Benutzer-ID'}`);
        const success = await emailService.sendSystemEmail({
          to: recipientEmail,
          subject: subject,
          html: body,
          attachments: attachments
        });
        
        return success;
      }
      
      // Ansonsten verwenden wir den benutzerindividuellen E-Mail-Service
      console.log(`Verwende benutzerindividuellen E-Mail-Service für Benutzer ${userId}`);
      
      // Protokolliere, welcher E-Mail-Service für welchen Benutzer verwendet wird
      if (userId === 4) {
        console.log(`Verwende spezielle E-Mail-Einstellungen für Benutzer 'murat' (ID 4)`);
      }
      
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject: subject,
        html: body,
        text: body.replace(/<[^>]*>/g, ''), // Text aus HTML generieren
        attachments: attachments
      });
      
      // E-Mail-Verlaufseintrag erstellen
      try {
        await db.insert(emailHistory).values({
          templateId: templateId,
          recipientEmail: recipientEmail,
          subject: subject,
          userId: userId,
          variables: Object.entries(variables).map(([key, value]) => `${key}=${value}`),
          sentAt: new Date(),
          success: result.success
        });
        console.log(`E-Mail-Verlaufseintrag für Benutzer ${userId} erstellt`);
      } catch (historyError) {
        console.error(`Fehler beim Erstellen des E-Mail-Verlaufseintrags:`, historyError);
        // Fehler beim Speichern des Verlaufs sollten nicht den Erfolg des E-Mail-Versands beeinflussen
      }
      
      return result.success;
    } catch (error) {
      console.error(`Fehler beim Senden der E-Mail mit Vorlage ${templateId}:`, error);
      return false;
    }
  }
  
  /**
   * Generiert eine PDF-Datei aus HTML-Inhalt
   * @param html HTML-Inhalt, der in eine PDF-Datei umgewandelt werden soll
   * @param filename Name der Datei (ohne Erweiterung)
   * @returns Buffer mit PDF-Inhalt oder null bei Fehler
   */
  async generatePdfFromHtml(html: string, filename: string): Promise<Buffer | null> {
    try {
      // Node.js-Module importieren (ES Module-Style)
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      const htmlPdf = await import('html-pdf');
      
      // Temporären Dateinamen erstellen
      const tempFilePath = path.default.join(os.default.tmpdir(), `${filename}_${Date.now()}.pdf`);
      
      // A4-HTML mit enforced Styling vorbereiten
      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              width: 170mm !important;
              max-width: 170mm !important;
              min-height: 257mm;
              font-size: 12px;
              line-height: 1.4;
            }
            * { 
              box-sizing: border-box; 
              max-width: 170mm;
            }
            .container {
              width: 170mm !important;
              max-width: 170mm !important;
            }
            h1, h2, h3 { 
              color: #333; 
              margin-bottom: 10px;
            }
            h1 { font-size: 18px; }
            h2 { font-size: 16px; }
            h3 { font-size: 14px; }
            p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left;
              word-wrap: break-word;
            }
            .header { margin-bottom: 20px; }
            .footer { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${html}
          </div>
        </body>
        </html>
      `;

      // PDF-Optionen für A4-Format erzwungen
      const options = {
        format: 'A4',
        orientation: 'portrait',
        border: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        width: '210mm',
        height: '297mm',
        type: 'pdf',
        timeout: 30000,
        renderDelay: 2000,
        phantomArgs: [
          '--load-images=yes',
          '--local-storage-quota=10000000',
          '--disk-cache=no'
        ]
      };
      
      console.log(`Erstelle PDF-Datei ${tempFilePath} aus HTML-Inhalt`);
      
      // PDF erstellen und als Datei speichern
      await new Promise<void>((resolve, reject) => {
        htmlPdf.default.create(styledHtml, options).toFile(tempFilePath, (err: Error, res: any) => {
          if (err) {
            console.error('Fehler beim Erstellen des PDFs:', err);
            reject(err);
          } else {
            console.log('PDF erfolgreich erstellt:', res);
            resolve();
          }
        });
      });
      
      // PDF-Datei aus Dateisystem lesen
      const pdfBuffer = fs.default.readFileSync(tempFilePath);
      
      // PDF-Datei löschen
      fs.default.unlinkSync(tempFilePath);
      
      return pdfBuffer;
    } catch (error) {
      console.error('Fehler bei der PDF-Generierung:', error);
      return null;
    }
  }
  
  /**
   * Sendet eine E-Mail mit Anhang
   * @param options Optionen für die E-Mail (Empfänger, Betreff, Inhalt, Anhänge)
   * @returns true bei Erfolg, false bei Fehler
   */
  async sendEmailWithAttachment(options: {
    to: string;
    from: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
    userId?: number;
  }): Promise<boolean> {
    try {
      // E-Mail-Service ist bereits am Anfang der Datei importiert
      // kein erneuter Import notwendig
      
      console.log(`Sende E-Mail mit Anhang an ${options.to}`);
      
      const mailOptions = {
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.htmlBody,
        text: options.textBody,
        attachments: options.attachments || []
      };
      
      // E-Mail mit Anhang über den E-Mail-Service senden
      const success = await emailService.sendRawEmail(mailOptions, options.userId);
      
      if (success) {
        console.log('E-Mail mit Anhang erfolgreich gesendet');
      } else {
        console.error('Fehler beim Senden der E-Mail mit Anhang');
      }
      
      return success;
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail mit Anhang:', error);
      return false;
    }
  }
  
  /**
   * Protokolliert eine gesendete E-Mail im E-Mail-Verlauf
   * @param data Daten für den E-Mail-Verlaufseintrag
   * @returns E-Mail-Verlaufseintrag oder undefined bei Fehler
   */
  async logEmailHistory(data: Partial<InsertEmailHistory>): Promise<EmailHistory | undefined> {
    try {
      // Aktuelle Zeit für createdAt/updatedAt
      const now = new Date();
      
      // Sicherstellen, dass alle erforderlichen Felder vorhanden sind
      const insertData: InsertEmailHistory = {
        type: data.type || 'custom',
        recipientEmail: data.recipientEmail || '',
        subject: data.subject || '',
        referenceId: data.referenceId || 0,
        userId: data.userId || 0,
        shopId: data.shopId || 0,
        createdAt: now,
        updatedAt: now
      };
      
      // E-Mail-Verlauf in der Datenbank speichern
      const [emailHistoryEntry] = await db.insert(emailHistory).values(insertData).returning();
      
      console.log('E-Mail-Verlaufseintrag erstellt:', emailHistoryEntry);
      
      return emailHistoryEntry;
    } catch (error) {
      console.error('Fehler beim Protokollieren des E-Mail-Verlaufs:', error);
      return undefined;
    }
  }
  // Kostenvoranschläge Methoden
  async getAllCostEstimates(userId: number): Promise<CostEstimate[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Ermittle die Shop-ID des Benutzers für DSGVO-konforme Isolation
    const shopId = user.shopId || 1;
    
    console.log(`Abrufen aller Kostenvoranschläge für Shop ${shopId}`);
    
    try {
      // Erweiterte SQL-Abfrage mit JOIN zur Kundentabelle
      const result = await pool.query(`
        SELECT 
          ce.*,
          c.first_name AS firstname,
          c.last_name AS lastname,
          c.email,
          c.phone
        FROM cost_estimates ce
        LEFT JOIN customers c ON ce.customer_id = c.id
        WHERE ce.shop_id = $1
        ORDER BY ce.created_at DESC
      `, [shopId]);
      
      // Debug-Ausgabe für den ersten Eintrag
      if (result.rows.length > 0) {
        console.log("SQL-Abfrage Ergebnis (erster Eintrag):", result.rows[0]);
      }
      
      return result.rows;
    } catch (error) {
      console.error("Fehler beim Abrufen der Kostenvoranschläge:", error);
      return [];
    }
  }
  
  async getCostEstimate(id: number, userId: number): Promise<CostEstimate | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Ermittle die Shop-ID des Benutzers für DSGVO-konforme Isolation
    const shopId = user.shopId || 1;
    
    try {
      // Strenge Shop-Isolation: Nur Kostenvoranschläge aus dem eigenen Shop anzeigen
      const [costEstimate] = await db.select().from(costEstimates)
        .where(
          and(
            eq(costEstimates.id, id),
            eq(costEstimates.shopId, shopId)
          )
        );
      return costEstimate;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Kostenvoranschlags ${id}:`, error);
      return undefined;
    }
  }
  
  async getCostEstimateItems(costEstimateId: number, userId: number): Promise<any[]> {
    try {
      // Prüfen, ob der Benutzer auf diesen Kostenvoranschlag zugreifen darf
      const costEstimate = await this.getCostEstimate(costEstimateId, userId);
      if (!costEstimate) {
        console.log(`Kostenvoranschlag ${costEstimateId} nicht gefunden oder keine Berechtigung für Benutzer ${userId}`);
        return [];
      }
      
      console.log(`getCostEstimateItems: Abrufen der Positionen für Kostenvoranschlag ${costEstimateId}`);
      
      try {
        // Direkter SQL-Query, um das JSON-Parsing-Problem zu umgehen
        const result = await pool.query(
          `SELECT items FROM cost_estimates WHERE id = $1 AND shop_id = (
             SELECT shop_id FROM users WHERE id = $2
           )`,
          [costEstimateId, userId]
        );
        
        if (result.rows.length === 0) {
          console.log(`Kostenvoranschlag ${costEstimateId} nicht gefunden für Benutzer ${userId} (SQL)`);
          return [];
        }
        
        const itemsValue = result.rows[0].items;
        console.log(`Items aus Datenbank (Typ: ${typeof itemsValue}):`, itemsValue);
        
        // Wenn es ein String ist, parsen versuchen
        if (typeof itemsValue === 'string') {
          try {
            // Bei Vorhandensein von Escape-Sequenzen (z.B. \" statt ") bereinigen
            const cleanedValue = itemsValue.replace(/\\"/g, '"');
            let parsedItems;
            
            // Bei doppelten JSON-Anführungszeichen (häufiger Fehler) bereinigen
            if (cleanedValue.startsWith('"[') && cleanedValue.endsWith(']"')) {
              // Entferne die äußeren Anführungszeichen
              const innerJson = cleanedValue.substring(1, cleanedValue.length - 1);
              parsedItems = JSON.parse(innerJson);
            } else {
              // Normales Parsen versuchen
              parsedItems = JSON.parse(cleanedValue);
            }
            
            console.log(`Items erfolgreich geparst: ${parsedItems.length} Elemente gefunden`);
            return Array.isArray(parsedItems) ? parsedItems : [];
          } catch (parseError) {
            console.error(`Fehler beim JSON-Parsen von Items (String): ${parseError.message}`);
          }
        }
        
        // Wenn itemsValue bereits ein Array ist
        if (Array.isArray(itemsValue)) {
          console.log(`Items sind bereits ein Array mit ${itemsValue.length} Elementen`);
          return itemsValue;
        }
        
        // Wenn itemsValue ein Objekt ist, aber kein Array
        if (typeof itemsValue === 'object' && itemsValue !== null) {
          console.log('Items sind ein Objekt, versuche Konvertierung');
          
          // Versuche, es zu einem Array zu konvertieren, wenn möglich
          if (Object.keys(itemsValue).length > 0) {
            const itemsArray = Object.values(itemsValue);
            if (Array.isArray(itemsArray[0])) {
              return itemsArray[0];
            }
            return itemsArray;
          }
          
          return [];
        }
        
      } catch (dbError) {
        console.error(`Datenbankfehler beim Abrufen der Items: ${dbError.message}`);
      }
      
      // Fallback: Leeres Array zurückgeben
      console.log(`Fallback: Leeres Array für Kostenvoranschlag ${costEstimateId}`);
      return [];
    } catch (error) {
      console.error(`Fehler beim Abrufen der Positionen für Kostenvoranschlag ${costEstimateId}:`, error);
      return [];
    }
  }
  
  // Diese alte Implementierung wurde entfernt, da wir jetzt ein JSON-basiertes System verwenden
  
  // Die createCostEstimateItem-Funktion wurde entfernt.
  // Stattdessen werden die Items jetzt direkt im Kostenvoranschlag als JSON gespeichert.
  // Bei createCostEstimate oder updateCostEstimate werden die Items im items-Feld übergeben.
  
  async updateCostEstimate(
    id: number,
    estimate: Partial<InsertCostEstimate>,
    userId: number
  ): Promise<CostEstimate | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Ermittle die Shop-ID des Benutzers für DSGVO-konforme Isolation
    const shopId = user.shopId || 1;
    
    // Überprüfen, ob der Kostenvoranschlag zum Shop des Benutzers gehört
    const existingEstimate = await this.getCostEstimate(id, userId);
    if (!existingEstimate) return undefined;
    
    try {
      const [updatedEstimate] = await db.update(costEstimates)
        .set({
          ...estimate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(costEstimates.id, id),
            eq(costEstimates.shopId, shopId)
          )
        )
        .returning();
      
      return updatedEstimate;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Kostenvoranschlags ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteCostEstimate(id: number, userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Ermittle die Shop-ID des Benutzers für DSGVO-konforme Isolation
    const shopId = user.shopId || 1;
    
    // Überprüfen, ob der Kostenvoranschlag zum Shop des Benutzers gehört
    const existingEstimate = await this.getCostEstimate(id, userId);
    if (!existingEstimate) return false;
    
    try {
      // Keine separaten Positionen mehr zu löschen, da diese jetzt direkt im Kostenvoranschlag gespeichert sind
      
      // Dann den Kostenvoranschlag selbst löschen
      const result = await db.delete(costEstimates)
        .where(
          and(
            eq(costEstimates.id, id),
            eq(costEstimates.shopId, shopId)
          )
        );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Fehler beim Löschen des Kostenvoranschlags ${id}:`, error);
      return false;
    }
  }
  
  // Die deleteCostEstimateItem-Methode wurde entfernt, da wir jetzt ein JSON-basiertes System verwenden
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
      
      // Alle Benutzer haben jetzt unbegrenzten Zugriff
      const limit = 999999; // Praktisch unbegrenzt
      
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
        canCreate: true // Immer erlaubt da unbegrenzt
      };
    } catch (error) {
      console.error("Error in canCreateNewRepair:", error);
      // Standardwert im Fehlerfall - trotzdem unbegrenzt
      return {
        count: 0,
        limit: 999999,
        canCreate: true
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

  async updateUserLastLogin(id: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error updating user last login:", error);
      return false;
    }
  }

  async updateUserLastLogout(id: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ lastLogoutAt: new Date() })
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error updating user last logout:", error);
      return false;
    }
  }

  async updateUserLastActivity(id: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error updating user last activity:", error);
      return false;
    }
  }

  async updateUserLoginTimestamp(id: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error updating user login timestamp:", error);
      return false;
    }
  }

  async updateUserLogoutTimestamp(id: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ lastLogoutAt: new Date() })
        .where(eq(users.id, id));
      
      return true;
    } catch (error) {
      console.error("Error updating user logout timestamp:", error);
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

  // Generiere die nächste verfügbare Shop-ID
  async getNextShopId(): Promise<number> {
    try {
      const result = await db
        .select({ maxShopId: sql<number>`COALESCE(MAX(shop_id), 0)` })
        .from(users);
      
      const maxShopId = result[0]?.maxShopId || 0;
      const nextShopId = maxShopId + 1;
      
      console.log(`Aktuelle maximale Shop-ID: ${maxShopId}, neue Shop-ID wird: ${nextShopId}`);
      return nextShopId;
    } catch (error) {
      console.error("Fehler beim Generieren der nächsten Shop-ID:", error);
      // Sicherer Fallback: Finde die höchste bestehende Shop-ID und füge 1 hinzu
      const allUsers = await db.select({ shopId: users.shopId }).from(users).where(isNotNull(users.shopId));
      const maxId = Math.max(...allUsers.map(u => u.shopId || 0));
      return maxId + 1;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Entferne die Shop-ID aus den eingehenden Daten
      // Neue Benutzer erhalten KEINE Shop-ID bei der Registrierung
      const { shopId: _, ...userWithoutShopId } = user as any;
      
      // Hole das Basic-Paket für neue Benutzer
      const basicPackage = await this.getPackageByName("Basic");
      
      console.log(`Erstelle neuen Benutzer ${userWithoutShopId.username} mit Basic-Paket (keine Einschränkungen)`);

      const [newUser] = await db
        .insert(users)
        .values({
          ...userWithoutShopId,
          shopId: null,  // Explizit NULL setzen
          pricingPlan: "basic",  // Basic-Plan zuweisen
          packageId: basicPackage?.id || null  // Basic-Paket-ID zuweisen
        })
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
        .orderBy(desc(customers.createdAt));

      console.log(`Returning all ${results.length} customers`);
      return results;
    } catch (error) {
      console.error("Error getting all customers:", error);
      return [];
    }
  }

  // DSGVO-konforme Methode für Multi-Shop Admin: Kunden nach Shop-ID abrufen
  async getCustomersByShopId(shopId: number): Promise<Customer[]> {
    try {
      console.log(`🌐 getCustomersByShopId: Multi-Shop Admin lädt Kunden für Shop ${shopId}`);
      
      const customers = await db
        .select()
        .from(customers)
        .where(eq(customers.shopId, shopId))
        .orderBy(desc(customers.createdAt));
      
      console.log(`🌐 getCustomersByShopId: ${customers.length} Kunden für Shop ${shopId} abgerufen`);
      return customers;
    } catch (error) {
      console.error(`Error fetching customers for shop ${shopId}:`, error);
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

      // Multi-Shop Admin: Zugriff auf alle zugänglichen Shops
      if (user.isMultiShopAdmin) {
        console.log(`🌐 Multi-Shop Admin ${user.username} (ID: ${userId}) ruft alle Reparaturen ab`);
        const accessibleShops = await this.getUserAccessibleShops(userId);
        const shopIds = accessibleShops.map(shop => shop.shopId);
        
        if (shopIds.length === 0) {
          console.warn(`Multi-Shop Admin ${user.username} hat keine zugänglichen Shops`);
          return [];
        }

        const results = await db
          .select()
          .from(repairs)
          .where(inArray(repairs.shopId, shopIds))
          .orderBy(desc(repairs.createdAt));

        console.log(`🌐 Multi-Shop Admin: ${results.length} Reparaturen aus ${shopIds.length} Shops geladen`);
        return results;
      }

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

      // Regulärer Shop-Benutzer: Nur eigene Shop-Daten
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

  async getRepairsWaitingForParts(userId: number): Promise<any[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, leere Liste zurückgeben statt Fallback auf Shop 1
      if (!user.shopId) {
        console.warn(`❌ Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return [];
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getRepairsWaitingForParts: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId}`);

      // Reparaturen mit Status "warten_auf_ersatzteile" und zugehörige Kundendaten abrufen
      const results = await db
        .select({
          id: repairs.id,
          orderCode: repairs.orderCode,
          customerId: repairs.customerId,
          deviceType: repairs.deviceType,
          brand: repairs.brand,
          model: repairs.model,
          issue: repairs.issue,
          status: repairs.status,
          estimatedCost: repairs.estimatedCost,
          depositAmount: repairs.depositAmount,
          notes: repairs.notes,
          createdAt: repairs.createdAt,
          updatedAt: repairs.updatedAt,
          shopId: repairs.shopId,
          userId: repairs.userId,
          customer: {
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            address: customers.address,
            zipCode: customers.zipCode,
            city: customers.city,
            createdAt: customers.createdAt,
            shopId: customers.shopId,
            userId: customers.userId
          }
        })
        .from(repairs)
        .innerJoin(customers, eq(repairs.customerId, customers.id))
        .where(
          and(
            eq(repairs.shopId, shopId),
            or(
              eq(repairs.status, 'ersatzteile_bestellen'),
              eq(repairs.status, 'warten_auf_ersatzteile')
            )
          )
        )
        .orderBy(desc(repairs.createdAt));

      // Ersatzteile für jede Reparatur laden
      const resultsWithParts = await Promise.all(
        results.map(async (repair) => {
          const spareParts = await this.getSparePartsByRepairId(repair.id, userId);
          return {
            ...repair,
            spareParts
          };
        })
      );

      console.log(`Gefunden: ${resultsWithParts.length} Reparaturen mit ausstehenden Ersatzteilen für Shop ${shopId}`);
      return resultsWithParts;
    } catch (error) {
      console.error("Error getting repairs waiting for parts:", error);
      return [];
    }
  }

  // Zubehör-Methoden
  async createAccessory(accessoryData: InsertAccessory): Promise<Accessory> {
    const [accessory] = await db
      .insert(accessories)
      .values(accessoryData)
      .returning();
    return accessory;
  }

  async getAllAccessories(userId: number): Promise<Accessory[]> {
    const user = await this.getUser(userId);
    if (!user || !user.shopId) return [];
    
    const accessoryList = await db
      .select({
        id: accessories.id,
        articleName: accessories.articleName,
        quantity: accessories.quantity,
        unitPrice: accessories.unitPrice,
        totalPrice: accessories.totalPrice,
        downPayment: accessories.downPayment,
        customerId: accessories.customerId,
        type: accessories.type,
        status: accessories.status,
        notes: accessories.notes,
        createdAt: accessories.createdAt,
        updatedAt: accessories.updatedAt,
        shopId: accessories.shopId,
        userId: accessories.userId,
        customerName: sql<string>`CASE 
          WHEN ${accessories.customerId} IS NOT NULL 
          THEN CONCAT(${customers.firstName}, ' ', ${customers.lastName})
          ELSE NULL 
        END`.as('customerName')
      })
      .from(accessories)
      .leftJoin(customers, eq(accessories.customerId, customers.id))
      .where(eq(accessories.shopId, user.shopId))
      .orderBy(desc(accessories.createdAt));
    
    return accessoryList;
  }

  async getAccessory(id: number, userId: number): Promise<Accessory | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.shopId) return undefined;
    
    const [accessory] = await db
      .select()
      .from(accessories)
      .where(and(eq(accessories.id, id), eq(accessories.shopId, user.shopId)));
    return accessory;
  }

  async updateAccessory(id: number, accessoryData: Partial<InsertAccessory>, userId: number): Promise<Accessory | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.shopId) return undefined;
    
    // AUTO-DELETE: If status is "erledigt", delete instead of update
    if (accessoryData.status === "erledigt") {
      console.log(`🗑️ SERVER: Auto-deleting single accessory ${id} with status "erledigt"`);
      
      const deleteResult = await db
        .delete(accessories)
        .where(and(eq(accessories.id, id), eq(accessories.shopId, user.shopId)))
        .returning();
      
      if (deleteResult.length > 0) {
        console.log(`✅ SERVER: Auto-deleted accessory ${id} with "erledigt" status`);
        return deleteResult[0]; // Return the deleted accessory
      }
      return undefined;
    }
    
    // Regular status update for non-"erledigt" statuses
    const [accessory] = await db
      .update(accessories)
      .set({ ...accessoryData, updatedAt: new Date() })
      .where(and(eq(accessories.id, id), eq(accessories.shopId, user.shopId)))
      .returning();
    return accessory;
  }

  async deleteAccessory(id: number, userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.shopId) return false;
    
    const result = await db
      .delete(accessories)
      .where(and(eq(accessories.id, id), eq(accessories.shopId, user.shopId)));
    return result.rowCount > 0;
  }

  async bulkUpdateAccessoryStatus(accessoryIds: number[], status: string, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user || !user.shopId) {
        console.error(`bulkUpdateAccessoryStatus: Benutzer ${userId} nicht gefunden oder keine Shop-ID`);
        return false;
      }
      
      console.log(`bulkUpdateAccessoryStatus: Aktualisiere ${accessoryIds.length} Zubehör-Artikel für Benutzer ${userId} (Shop ${user.shopId}) auf Status '${status}'`);
      
      // AUTO-ARCHIVE: If status is "erledigt", archive instead of delete
      if (status === "erledigt") {
        console.log(`🗃️ SERVER: Auto-archiving ${accessoryIds.length} accessories with status "erledigt"`);
        
        const archiveResult = await db
          .update(accessories)
          .set({ 
            status: status,
            archived: true, // Automatische Archivierung
            updatedAt: new Date()
          })
          .where(
            and(
              inArray(accessories.id, accessoryIds),
              eq(accessories.shopId, user.shopId)
            )
          );
        
        const archivedCount = archiveResult.rowCount;
        console.log(`✅ SERVER: Auto-archived ${archivedCount} accessories with "erledigt" status`);
        return archivedCount > 0;
      }
      
      // Regular status update for non-"erledigt" statuses
      const result = await db
        .update(accessories)
        .set({ 
          status: status,
          updatedAt: new Date()
        })
        .where(
          and(
            inArray(accessories.id, accessoryIds),
            eq(accessories.shopId, user.shopId)
          )
        );
      
      const updatedCount = result.rowCount;
      console.log(`bulkUpdateAccessoryStatus: ${updatedCount} von ${accessoryIds.length} Zubehör-Artikel erfolgreich aktualisiert`);
      
      return updatedCount > 0;
    } catch (error) {
      console.error("Fehler beim Bulk-Update der Zubehör-Status:", error);
      return false;
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

  async getRepairByOrderCode(orderCode: string, userId: number): Promise<Repair | undefined> {
    try {
      console.log(`getRepairByOrderCode: Suche nach Auftragsnummer ${orderCode} für Benutzer ${userId}`);
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`getRepairByOrderCode: Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }

      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben
      if (!user.shopId) {
        console.warn(`❌ getRepairByOrderCode: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Spezialfall für Superadmin: Prüfen, ob ein aktiver Support-Zugriff besteht
      if (user.isSuperadmin) {
        const { hasActiveSupportAccess } = await import('./support-access');
        const hasAccess = await hasActiveSupportAccess(userId, user.shopId);
        
        if (!hasAccess) {
          console.warn(`🔒 Superadmin ${user.username} (ID: ${user.id}) hat KEINEN aktiven Support-Zugriff - Zugriff verweigert`);
          return undefined;
        }
        
        console.log(`✅ Superadmin ${user.username} (ID: ${user.id}) hat aktiven Support-Zugriff - Zugriff erlaubt`);
      }

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopId = user.shopId;
      console.log(`getRepairByOrderCode: Benutzer ${user.username} (ID: ${userId}) mit Shop-ID ${shopId}`);

      const [repair] = await db
        .select()
        .from(repairs)
        .where(
          and(
            eq(repairs.orderCode, orderCode),
            eq(repairs.shopId, shopId)
          )
        );

      if (repair) {
        console.log(`getRepairByOrderCode: Reparatur mit Auftragsnummer ${orderCode} gefunden für Benutzer ${userId}`);
      } else {
        console.warn(`getRepairByOrderCode: Reparatur mit Auftragsnummer ${orderCode} wurde nicht gefunden oder gehört nicht zu Shop ${shopId}`);
      }

      return repair;
    } catch (error) {
      console.error(`Error getting repair by order code ${orderCode}:`, error);
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

  /**
   * Aktualisiert den Status einer Reparatur
   * @param id Die ID der Reparatur
   * @param status Der neue Status
   * @param userId Die ID des Benutzers, der die Änderung vornimmt
   * @returns Die aktualisierte Reparatur oder undefined bei Fehler
   */
  async updateRepairStatus(
    id: number,
    status: string,
    userId: number,
    technicianNote?: string
  ): Promise<Repair | undefined> {
    try {
      console.log(`updateRepairStatus: Benutzer mit ID ${userId} ändert Status der Reparatur ${id} zu "${status}"`);
      
      // Zuerst prüfen, ob die Reparatur zum Shop des Benutzers gehört
      const existingRepair = await this.getRepair(id, userId);
      if (!existingRepair) {
        console.warn(`updateRepairStatus: Reparatur ${id} nicht gefunden oder nicht im Shop des Benutzers ${userId}`);
        return undefined;
      }
      
      // Benutzer holen, um Shop-ID zu verifizieren
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`updateRepairStatus: Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }
      
      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben
      if (!user.shopId) {
        console.warn(`❌ updateRepairStatus: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Vorherigen Status für History-Log speichern
      const oldStatus = existingRepair.status;
      
      // Aktualisiere den Status und optional die Techniker-Information
      const updateData: any = {
        status: status,
        updatedAt: new Date()
      };
      
      // Techniker-Information hinzufügen, wenn vorhanden
      if (technicianNote) {
        const now = new Date();
        const dateStamp = now.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric'
        });
        updateData.technicianNote = `${technicianNote} (${dateStamp})`;
      }
      
      const [updatedRepair] = await db
        .update(repairs)
        .set(updateData)
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, user.shopId)
          )
        )
        .returning();
      
      if (updatedRepair) {
        console.log(`updateRepairStatus: Status der Reparatur ${id} erfolgreich auf '${status}' aktualisiert für Benutzer ${userId}`);
        
        // Status-History-Eintrag erstellen, wenn sich der Status geändert hat
        if (oldStatus !== status) {
          try {
            // Prüfe, ob bereits ein identischer Eintrag in den letzten 5 Minuten existiert
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const existingEntry = await db
              .select()
              .from(repairStatusHistory)
              .where(
                and(
                  eq(repairStatusHistory.repairId, id),
                  eq(repairStatusHistory.newStatus, status),
                  eq(repairStatusHistory.changedBy, this.getUserDisplayName(user)),
                  eq(repairStatusHistory.shopId, user.shopId),
                  gte(repairStatusHistory.changedAt, fiveMinutesAgo)
                )
              )
              .limit(1);

            if (existingEntry.length === 0) {
              await db.insert(repairStatusHistory).values({
                repairId: id,
                oldStatus: oldStatus,
                newStatus: status,
                changedBy: this.getUserDisplayName(user), // Display-Name (Benutzername für Shop-Owner, Vorname für Mitarbeiter)
                userId: userId,
                shopId: user.shopId
              });
              console.log(`Status-History: ${oldStatus} → ${status} für Reparatur ${id} durch Benutzer ${userId} (automatisch)`);
            } else {
              console.log(`Status-History: Doppelter Eintrag verhindert für Reparatur ${id}, Status ${status}`);
            }
          } catch (historyError) {
            console.error('Fehler beim Erstellen des automatischen Status-History-Eintrags:', historyError);
          }
        }
      } else {
        console.warn(`updateRepairStatus: Status der Reparatur ${id} konnte nicht aktualisiert werden (Shop-ID Konflikt?)`);
      }
      
      return updatedRepair;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Status der Reparatur ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Löscht eine Reparatur
   * @param id Die ID der Reparatur
   * @param userId Die ID des Benutzers, der die Löschung vornimmt
   * @returns true bei Erfolg, false bei Fehler
   */
  async deleteRepair(id: number, userId: number): Promise<boolean> {
    try {
      console.log(`deleteRepair: Benutzer mit ID ${userId} löscht Reparatur ${id}`);
      
      // Benutzer holen, um Berechtigung zu prüfen
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`deleteRepair: Benutzer mit ID ${userId} nicht gefunden.`);
        return false;
      }
      
      // Superadmin-Prüfung: Superadmin kann alle Reparaturen löschen
      if (user.isSuperadmin) {
        console.log(`deleteRepair: Superadmin ${user.username} (ID: ${userId}) löscht Reparatur ${id}`);
        
        const result = await db
          .delete(repairs)
          .where(eq(repairs.id, id));
        
        if (result.rowCount === 0) {
          console.warn(`deleteRepair: Reparatur mit ID ${id} nicht gefunden`);
          return false;
        }
        
        console.log(`deleteRepair: Reparatur ${id} erfolgreich durch Superadmin gelöscht`);
        return true;
      }
      
      // Normale Benutzer: Strikte Shop-Isolation
      if (!user.shopId) {
        console.warn(`❌ deleteRepair: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return false;
      }
      
      // Direkt prüfen, ob die Reparatur in der Datenbank existiert und zum Shop gehört
      const existingRepairs = await db
        .select()
        .from(repairs)
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, user.shopId)
          )
        );
      
      if (existingRepairs.length === 0) {
        console.warn(`deleteRepair: Reparatur ${id} nicht gefunden oder nicht im Shop ${user.shopId} des Benutzers ${userId}`);
        return false;
      }
      
      // Alle abhängigen Datensätze löschen (Foreign Key Constraints)
      
      // 1. E-Mail-Historie löschen
      const emailHistoryResult = await db
        .delete(emailHistory)
        .where(eq(emailHistory.repairId, id));
      console.log(`deleteRepair: ${emailHistoryResult.rowCount || 0} E-Mail-Historie-Einträge für Reparatur ${id} gelöscht`);
      
      // 2. Status-Historie löschen
      const statusHistoryResult = await db
        .delete(repairStatusHistory)
        .where(eq(repairStatusHistory.repairId, id));
      console.log(`deleteRepair: ${statusHistoryResult.rowCount || 0} Status-Historie-Einträge für Reparatur ${id} gelöscht`);
      
      // 3. Temporäre Unterschriften löschen (JSON-Daten enthalten repairId)
      const searchPattern = `%"repairId":${id}%`;
      const tempSignaturesResult = await db
        .delete(tempSignatures)
        .where(sql`repair_data::text LIKE ${searchPattern}`);
      console.log(`deleteRepair: ${tempSignaturesResult.rowCount || 0} temporäre Unterschriften für Reparatur ${id} gelöscht`);

      // 4. Dann die Reparatur mit der korrekten Shop-ID löschen
      const result = await db
        .delete(repairs)
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, user.shopId)
          )
        );
      
      // Prüfe, ob eine Zeile gelöscht wurde
      if (result.rowCount === 0) {
        console.warn(`deleteRepair: Keine Reparatur mit ID ${id} in Shop ${user.shopId} gefunden`);
        return false;
      }
      
      console.log(`deleteRepair: Reparatur ${id} erfolgreich gelöscht für Benutzer ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting repair ${id}:`, error);
      return false;
    }
  }

  /**
   * Löscht einen Kunden
   * @param id Die ID des Kunden
   * @param userId Die ID des Benutzers, der die Löschung vornimmt
   * @returns true bei Erfolg, false bei Fehler
   */
  async deleteCustomer(id: number, userId: number): Promise<boolean> {
    try {
      console.log(`deleteCustomer: Benutzer mit ID ${userId} löscht Kunden ${id}`);
      
      // Benutzer holen, um Berechtigung zu prüfen
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`deleteCustomer: Benutzer mit ID ${userId} nicht gefunden.`);
        return false;
      }
      
      // Superadmin-Prüfung: Superadmin kann alle Kunden löschen
      if (user.isSuperadmin) {
        console.log(`deleteCustomer: Superadmin ${user.username} (ID: ${userId}) löscht Kunden ${id}`);
        
        const result = await db
          .delete(customers)
          .where(eq(customers.id, id));
        
        if (result.rowCount === 0) {
          console.warn(`deleteCustomer: Kunde mit ID ${id} nicht gefunden`);
          return false;
        }
        
        console.log(`deleteCustomer: Kunde ${id} erfolgreich durch Superadmin gelöscht`);
        return true;
      }
      
      // Normale Benutzer: Strikte Shop-Isolation
      if (!user.shopId) {
        console.warn(`❌ deleteCustomer: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return false;
      }
      
      // Direkt prüfen, ob der Kunde in der Datenbank existiert und zum Shop gehört
      const existingCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, id),
            eq(customers.shopId, user.shopId)
          )
        );
      
      if (existingCustomers.length === 0) {
        console.warn(`deleteCustomer: Kunde ${id} nicht gefunden oder nicht im Shop ${user.shopId} des Benutzers ${userId}`);
        return false;
      }
      
      // Prüfen, ob der Kunde noch Reparaturen hat
      const customerRepairs = await db
        .select()
        .from(repairs)
        .where(eq(repairs.customerId, id));
      
      if (customerRepairs.length > 0) {
        console.warn(`deleteCustomer: Kunde ${id} kann nicht gelöscht werden - hat noch ${customerRepairs.length} Reparaturen`);
        throw new Error(`Kunde kann nicht gelöscht werden - hat noch ${customerRepairs.length} aktive Reparaturen`);
      }
      
      // Kunde löschen
      const result = await db
        .delete(customers)
        .where(
          and(
            eq(customers.id, id),
            eq(customers.shopId, user.shopId)
          )
        );
      
      // Prüfe, ob eine Zeile gelöscht wurde
      if (result.rowCount === 0) {
        console.warn(`deleteCustomer: Keine Kunde mit ID ${id} in Shop ${user.shopId} gefunden`);
        return false;
      }
      
      console.log(`deleteCustomer: Kunde ${id} erfolgreich gelöscht für Benutzer ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting customer ${id}:`, error);
      // Fehler weiterwerfen anstatt false zurückzugeben
      throw error;
    }
  }

  // Implementierung der updateRepairSignature-Funktion
  async updateRepairSignature(
    id: number,
    signature: string,
    signatureType: 'dropoff' | 'pickup',
    userId: number
  ): Promise<Repair | undefined> {
    try {
      console.log(`updateRepairSignature: Benutzer mit ID ${userId} speichert ${signatureType}-Unterschrift für Reparatur ${id}`);
      
      // Zuerst prüfen, ob die Reparatur zum Shop des Benutzers gehört
      const existingRepair = await this.getRepair(id, userId);
      if (!existingRepair) {
        console.warn(`updateRepairSignature: Reparatur ${id} nicht gefunden oder nicht im Shop des Benutzers ${userId}`);
        return undefined;
      }
      
      // Benutzer holen, um Shop-ID zu verifizieren
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`updateRepairSignature: Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }
      
      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben
      if (!user.shopId) {
        console.warn(`❌ updateRepairSignature: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Je nach Signatur-Typ die entsprechenden Felder aktualisieren
      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (signatureType === 'dropoff') {
        updateData.dropoffSignature = signature;
        updateData.dropoffSignedAt = new Date();
      } else if (signatureType === 'pickup') {
        updateData.pickupSignature = signature;
        updateData.pickupSignedAt = new Date();
      }
      
      // Aktualisiere die Unterschrift der Reparatur
      const [updatedRepair] = await db
        .update(repairs)
        .set(updateData)
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, user.shopId)
          )
        )
        .returning();
      
      if (updatedRepair) {
        console.log(`updateRepairSignature: ${signatureType}-Unterschrift der Reparatur ${id} erfolgreich gespeichert für Benutzer ${userId}`);
      } else {
        console.warn(`updateRepairSignature: ${signatureType}-Unterschrift der Reparatur ${id} konnte nicht gespeichert werden (Shop-ID Konflikt?)`);
      }
      
      return updatedRepair;
    } catch (error) {
      console.error(`Fehler beim Speichern der ${signatureType}-Unterschrift der Reparatur ${id}:`, error);
      return undefined;
    }
  }

  // Implementierung der updateRepairDeviceCode-Funktion
  async updateRepairDeviceCode(
    id: number,
    deviceCode: string | null,
    deviceCodeType: string | null,
    userId: number
  ): Promise<Repair | undefined> {
    try {
      console.log(`updateRepairDeviceCode: Benutzer mit ID ${userId} speichert Gerätecode für Reparatur ${id}`);
      
      // Zuerst prüfen, ob die Reparatur zum Shop des Benutzers gehört
      const existingRepair = await this.getRepair(id, userId);
      if (!existingRepair) {
        console.warn(`updateRepairDeviceCode: Reparatur ${id} nicht gefunden oder nicht im Shop des Benutzers ${userId}`);
        return undefined;
      }
      
      // Benutzer holen, um Shop-ID zu verifizieren
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`updateRepairDeviceCode: Benutzer mit ID ${userId} nicht gefunden.`);
        return undefined;
      }
      
      // DSGVO-Fix: Wenn keine Shop-ID vorhanden ist, undefined zurückgeben
      if (!user.shopId) {
        console.warn(`❌ updateRepairDeviceCode: Benutzer ${user.username} (ID: ${user.id}) hat keine Shop-Zuordnung – Zugriff verweigert`);
        return undefined;
      }
      
      // Gerätecode-Felder aktualisieren
      const [updatedRepair] = await db
        .update(repairs)
        .set({
          deviceCode: deviceCode,
          deviceCodeType: deviceCodeType,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(repairs.id, id),
            eq(repairs.shopId, user.shopId) // DSGVO-Schutz: Nur Reparaturen des eigenen Shops
          )
        )
        .returning();
      
      if (updatedRepair) {
        console.log(`updateRepairDeviceCode: Gerätecode der Reparatur ${id} erfolgreich gespeichert für Benutzer ${userId}`);
      } else {
        console.warn(`updateRepairDeviceCode: Gerätecode der Reparatur ${id} konnte nicht gespeichert werden (Shop-ID Konflikt?)`);
      }
      
      return updatedRepair;
    } catch (error) {
      console.error(`Fehler beim Speichern des Gerätecodes der Reparatur ${id}:`, error);
      return undefined;
    }
  }

  async createRepair(repair: Partial<InsertRepair> | any, userId?: number): Promise<Repair> {
    try {
      // Direkter SQL-Zugriff für mehr Kontrolle
      // Wir verwenden direkte SQL-Anweisung, um sicherzustellen, dass die Daten korrekt formatiert werden
      console.log(`📝 Reparatur-Daten vor der Erstellung:`, repair);
      
      // Sicherstellen, dass die Kunden-ID als Zahl vorliegt
      const customerId = parseInt(String(repair.customer_id || repair.customerId), 10);
      if (isNaN(customerId)) {
        throw new Error(`Ungültige Kunden-ID: ${repair.customer_id || repair.customerId}`);
      }
      
      // Die SQL-Anweisung vorbereiten - Anpassung an tatsächliche Spaltenstruktur
      const query = `
        INSERT INTO repairs (
          order_code, 
          customer_id, 
          device_type, 
          brand, 
          model, 
          serial_number, 
          issue, 
          notes, 
          status, 
          created_at, 
          updated_at, 
          user_id, 
          shop_id,
          estimated_cost
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING *
      `;
      
      // Die Parameter vorbereiten
      const referenceNumber = repair.reference_number || repair.referenceNumber || `RA-${Date.now()}`;
      const deviceType = repair.device_type || repair.deviceType || "Smartphone";
      const brand = repair.brand || "";
      const model = repair.model || "";
      const serialNumber = repair.serial_number || repair.serialNumber || null;
      const issue = repair.issue || "";
      const notes = repair.notes || `Umgewandelt aus Kostenvoranschlag ${repair.reference_number || repair.referenceNumber}`;
      const status = repair.status || "eingegangen";
      const createdAt = repair.created_at || repair.createdAt || new Date();
      const updatedAt = repair.updated_at || repair.updatedAt || new Date();
      const userIdValue = repair.user_id || repair.userId || userId || null;
      const shopId = repair.shop_id || repair.shopId || 1; // Fallback auf Shop 1
      const costEstimateId = repair.cost_estimate_id || repair.costEstimateId || null;
      const estimatedPrice = repair.estimated_price || repair.estimatedPrice || "0,00";
      
      console.log("Eingefügte Kunden-ID:", customerId);
      
      // Die Anfrage ausführen mit korrekter Anzahl an Parametern
      const result = await pool.query(query, [
        referenceNumber,
        customerId,
        deviceType,
        brand,
        model,
        serialNumber,
        issue,
        notes,
        status,
        createdAt,
        updatedAt,
        userIdValue,
        shopId,
        estimatedPrice
      ]);
      
      console.log("Reparatur erfolgreich erstellt:", result.rows[0]);
      
      const createdRepair = result.rows[0];
      
      // Status-History-Eintrag für den initialen "eingegangen" Status erstellen
      try {
        // Benutzer-Daten für Shop-ID holen
        const user = userId ? await this.getUser(userId) : null;
        const userShopId = user?.shopId || shopId;
        
        await db.insert(repairStatusHistory).values({
          repairId: createdRepair.id,
          oldStatus: null, // Kein vorheriger Status bei Erstellung
          newStatus: status,
          changedBy: user ? this.getUserDisplayName(user) : "SYSTEM", // Display-Name (Benutzername für Shop-Owner, Vorname für Mitarbeiter)
          userId: userId || null,
          shopId: userShopId,
          notes: "Auftrag erstellt"
        });
        
        console.log(`Status-History-Eintrag für neue Reparatur ${createdRepair.id} erstellt: "eingegangen"`);
      } catch (historyError) {
        console.error("Fehler beim Erstellen des Status-History-Eintrags:", historyError);
        // Fehler nicht weiterwerfen, da die Reparatur bereits erstellt wurde
      }
      
      return createdRepair;
    } catch (error) {
      console.error("Fehler beim Erstellen einer Reparatur:", error);
      throw error;
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
            
            // Kiosk-Einstellungen
            kioskPin: settings.kioskPin || "1234",
            repairTerms: settings.repairTerms || "",
            
            // Öffnungszeiten
            openingHours: settings.openingHours || "",
            
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





  async updateCostEstimateStatus(
    id: number,
    status: string,
    currentUserId?: number,
  ): Promise<CostEstimate | undefined> {
    try {
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

      console.log(`Aktualisiere Status für Kostenvoranschlag ${id} auf "${status}" für Benutzer ${currentUserId}`);

      // Shop-ID aus dem Benutzer extrahieren für die Shop-Isolation
      const shopIdValue = currentUser.shopId;
      
      // SQL direkt ausführen, um Probleme mit dem ORM zu vermeiden
      const sql = `
        UPDATE cost_estimates 
        SET status = '${status}', updated_at = NOW() 
        WHERE id = ${id} AND shop_id = ${shopIdValue}
        RETURNING *
      `;
      
      const result = await db.execute(sql);
      
      if (result.rows && result.rows.length > 0) {
        console.log(`Status für Kostenvoranschlag ${id} erfolgreich auf "${status}" aktualisiert`);
        return result.rows[0] as CostEstimate;
      } else {
        console.log(`Kostenvoranschlag ${id} nicht gefunden oder Benutzer hat keine Berechtigung`);
        return undefined;
      }
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Status für Kostenvoranschlag ${id}:`, error);
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
      const result = await db.select({
        id: emailHistory.id,
        repairId: emailHistory.repairId,
        emailTemplateId: emailHistory.emailTemplateId,
        subject: emailHistory.subject,
        recipient: emailHistory.recipient,
        sentAt: emailHistory.sentAt,
        status: emailHistory.status,
        userId: emailHistory.userId,
        shopId: emailHistory.shopId,
        templateName: emailTemplates.name
      })
      .from(emailHistory)
      .leftJoin(emailTemplates, eq(emailHistory.emailTemplateId, emailTemplates.id))
      .where(and(
        eq(emailHistory.repairId, repairId),
        eq(emailHistory.shopId, shopIdValue)
      ))
      .orderBy(desc(emailHistory.sentAt));

      console.log(`Gefundener E-Mail-Verlauf:`, result);
      return result as (EmailHistory & { templateName?: string })[];
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
   * 
   * Diese Funktionen wurden entfernt und werden später neu implementiert
   */

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

      // Erzeuge eine eindeutige Kostenvoranschlagsnummer im Format KV-YYMM-XXX
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2); // Die letzten zwei Ziffern des Jahres
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Hole den letzten Kostenvoranschlag des Monats mit SQL, da die db.query Methode Probleme hat
      // Verwende reference_number statt estimate_number (korrekter Spaltenname)
      const pattern = `KV-${year}${month}-%`;
      const result = await pool.query(
        `SELECT reference_number FROM cost_estimates 
         WHERE shop_id = $1 AND reference_number LIKE $2 
         ORDER BY id DESC LIMIT 1`,
        [shopId, pattern]
      );

      let nextNumber = 1;
      if (result.rows.length > 0) {
        const lastEstimateNumber = result.rows[0].reference_number;
        const match = lastEstimateNumber.match(/KV-\d{4}-(\d{3})/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      // Generiere die Kostenvoranschlagsnummer
      const estimateNumber = `KV-${year}${month}-${String(nextNumber).padStart(3, '0')}`;
      console.log(`Neue Kostenvoranschlagsnummer erstellt: ${estimateNumber}`);

      // Erstelle den Kostenvoranschlag mit Shop-ID und generierter Nummer
      // Sicherstellen, dass title und items immer gesetzt sind
      // Füge einen direkten SQL-Wert für 'items' ein, der JSONB sein muss
      try {
        // Direktes SQL ohne Parametersubstitution
        // Alle Pflichtfelder müssen gesetzt werden
        const totalPrice = estimate.total || "0.00";  
        const sql = `
          INSERT INTO cost_estimates (
            reference_number, customer_id, title, device_type, brand, model, 
            issue, status, created_at, updated_at, items, user_id, shop_id,
            subtotal, tax_rate, tax_amount, total
          )
          VALUES (
            '${estimateNumber}', 
            ${estimate.customerId}, 
            '${estimate.title || "Kostenvoranschlag"}', 
            '${estimate.deviceType}', 
            '${estimate.brand}', 
            '${estimate.model}', 
            '${estimate.issue || "Keine Angabe"}', 
            'offen', 
            NOW(), 
            NOW(), 
            '${JSON.stringify(estimate.items || [])}',
            ${userId}, 
            ${shopId},
            '${totalPrice}',    /* subtotal */
            '20',               /* tax_rate (Fix: Immer 20% für Österreich) */
            '${(parseFloat(totalPrice) * 0.2).toFixed(2)}',  /* tax_amount (Fix: Immer 20% MwSt) */
            '${totalPrice}'     /* total */
          )
          RETURNING *;
        `;
        
        console.log("SQL ausführen:", sql);
        const result = await db.execute(sql);
        
        if (result.rows && result.rows.length > 0) {
          console.log(`Neuer Kostenvoranschlag ID ${result.rows[0].id} (${estimateNumber}) erstellt für Shop ${shopId}`);
          return result.rows[0];
        } else {
          throw new Error("Keine Daten vom Insert zurückgegeben.");
        }
      } catch (err) {
        console.error("Fehler beim SQL-Insert für Kostenvoranschlag:", err);
        throw err;
      }

      // Dieser Teil wird nicht mehr ausgeführt, da wir das Insert direkt per SQL machen
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
      let conditions = [eq(repairs.shopId, shopId)];
      
      if (startDate) {
        conditions.push(gte(repairs.createdAt, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(repairs.createdAt, endDate));
      }
      
      const allRepairs = await db.select().from(repairs).where(and(...conditions));
      
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
            
            // Nach Monat gruppieren (1-12 statt 0-11)
            const month = relevantDate.getMonth() + 1;
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

  // QR-Code Unterschriften Implementierung
  async createTempSignature(tempId: string, repairData: any, userId: number, shopId: number): Promise<TempSignature> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 Stunden gültig

      const [tempSignature] = await db
        .insert(tempSignatures)
        .values({
          tempId,
          repairData,
          userId,
          shopId,
          expiresAt,
          status: 'pending'
        })
        .returning();

      console.log(`✅ Temporäre Unterschrift erstellt: ${tempId} für Benutzer ${userId}`);
      return tempSignature;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der temporären Unterschrift:', error);
      throw error;
    }
  }

  async getTempSignature(tempId: string): Promise<TempSignature | undefined> {
    try {
      const [tempSignature] = await db
        .select()
        .from(tempSignatures)
        .where(eq(tempSignatures.tempId, tempId));

      return tempSignature;
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der temporären Unterschrift:', error);
      return undefined;
    }
  }

  async updateTempSignatureWithSignature(tempId: string, signature: string): Promise<TempSignature | undefined> {
    try {
      const [updatedSignature] = await db
        .update(tempSignatures)
        .set({
          customerSignature: signature,
          signedAt: new Date(),
          status: 'signed'
        })
        .where(eq(tempSignatures.tempId, tempId))
        .returning();

      console.log(`✅ Unterschrift hinzugefügt für tempId: ${tempId}`);
      return updatedSignature;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Unterschrift:', error);
      return undefined;
    }
  }

  async completeTempSignature(tempId: string): Promise<TempSignature | undefined> {
    try {
      const [completedSignature] = await db
        .update(tempSignatures)
        .set({
          status: 'completed'
        })
        .where(eq(tempSignatures.tempId, tempId))
        .returning();

      console.log(`✅ Unterschrift abgeschlossen für tempId: ${tempId}`);
      return completedSignature;
    } catch (error) {
      console.error('❌ Fehler beim Abschließen der Unterschrift:', error);
      return undefined;
    }
  }

  async cleanupExpiredTempSignatures(): Promise<number> {
    try {
      const result = await db
        .delete(tempSignatures)
        .where(lt(tempSignatures.expiresAt, new Date()));

      console.log(`🧹 ${result.rowCount || 0} abgelaufene temporäre Unterschriften gelöscht`);
      return result.rowCount || 0;
    } catch (error) {
      console.error('❌ Fehler beim Bereinigen abgelaufener Unterschriften:', error);
      return 0;
    }
  }

  // Ersatzteil-Verwaltung Implementierung
  
  /**
   * Holt alle Ersatzteile für eine spezifische Reparatur
   */
  async getSparePartsByRepairId(repairId: number, userId: number): Promise<SparePart[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];
      
      const shopId = user.shopId || 1;
      
      const parts = await db
        .select()
        .from(spareParts)
        .where(and(
          eq(spareParts.repairId, repairId),
          eq(spareParts.shopId, shopId)
        ))
        .orderBy(desc(spareParts.createdAt));
      
      return parts;
    } catch (error) {
      console.error('Fehler beim Abrufen der Ersatzteile für Reparatur:', error);
      return [];
    }
  }

  /**
   * Holt alle Ersatzteile für einen Benutzer
   */
  async getAllSpareParts(userId: number): Promise<SparePart[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];
      
      const shopId = user.shopId || 1;
      
      const parts = await db
        .select()
        .from(spareParts)
        .where(and(
          eq(spareParts.shopId, shopId),
          eq(spareParts.archived, false), // Nur nicht-archivierte Ersatzteile anzeigen
          not(eq(spareParts.status, 'erledigt')),
          not(eq(spareParts.status, 'eingetroffen')) // Eingetroffene Ersatzteile aus Bestellungen-Liste ausblenden
        ))
        .orderBy(desc(spareParts.repairId), desc(spareParts.createdAt));
      
      return parts;
    } catch (error) {
      console.error('Fehler beim Abrufen aller Ersatzteile:', error);
      return [];
    }
  }

  /**
   * Holt Ersatzteile für den Bestellungen-Tab (nur Reparaturen mit Status "warten_auf_ersatzteile")
   */
  async getSparePartsForOrders(userId: number): Promise<SparePart[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];
      
      const shopId = user.shopId || 1;
      
      // Erstelle eine Subquery für Reparaturen mit Status "warten_auf_ersatzteile"
      const parts = await db
        .select({
          id: spareParts.id,
          repairId: spareParts.repairId,
          partName: spareParts.partName,
          supplier: spareParts.supplier,
          cost: spareParts.cost,
          status: spareParts.status,
          orderDate: spareParts.orderDate,
          deliveryDate: spareParts.deliveryDate,
          notes: spareParts.notes,
          userId: spareParts.userId,
          shopId: spareParts.shopId,
          createdAt: spareParts.createdAt,
          updatedAt: spareParts.updatedAt,
        })
        .from(spareParts)
        .innerJoin(repairs, eq(spareParts.repairId, repairs.id))
        .where(and(
          eq(spareParts.shopId, shopId),
          eq(spareParts.archived, false), // Nur nicht-archivierte Ersatzteile anzeigen
          eq(repairs.status, 'warten_auf_ersatzteile'),
          not(eq(spareParts.status, 'eingetroffen')) // Eingetroffene Ersatzteile aus Bestellungen-Liste ausblenden
        ))
        .orderBy(desc(spareParts.createdAt));
      
      return parts;
    } catch (error) {
      console.error('Fehler beim Abrufen der Ersatzteile für Bestellungen:', error);
      return [];
    }
  }

  /**
   * Holt ein spezifisches Ersatzteil
   */
  async getSparePart(id: number, userId: number): Promise<SparePart | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const shopId = user.shopId || 1;
      
      const [part] = await db
        .select()
        .from(spareParts)
        .where(and(
          eq(spareParts.id, id),
          eq(spareParts.shopId, shopId)
        ));
      
      return part;
    } catch (error) {
      console.error('Fehler beim Abrufen des Ersatzteils:', error);
      return undefined;
    }
  }

  /**
   * Erstellt ein neues Ersatzteil
   */
  async createSparePart(sparePart: InsertSparePart, userId: number): Promise<SparePart> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error('Benutzer nicht gefunden');
      
      const shopId = user.shopId || 1;
      
      const [newPart] = await db
        .insert(spareParts)
        .values({
          ...sparePart,
          userId,
          shopId,
        })
        .returning();
      
      // Nach dem Erstellen prüfen, ob der Reparatur-Status aktualisiert werden muss
      await this.checkAndUpdateRepairStatus(sparePart.repairId, userId);
      
      return newPart;
    } catch (error) {
      console.error('Fehler beim Erstellen des Ersatzteils:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert ein Ersatzteil
   */
  async updateSparePart(id: number, sparePart: Partial<SparePart>, userId: number): Promise<SparePart | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const shopId = user.shopId || 1;
      
      const [updatedPart] = await db
        .update(spareParts)
        .set({
          ...sparePart,
          updatedAt: new Date(),
        })
        .where(and(
          eq(spareParts.id, id),
          eq(spareParts.shopId, shopId)
        ))
        .returning();
      
      if (updatedPart) {
        // Nach dem Update prüfen, ob der Reparatur-Status aktualisiert werden muss
        await this.checkAndUpdateRepairStatus(updatedPart.repairId, userId);
      }
      
      return updatedPart;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Ersatzteils:', error);
      return undefined;
    }
  }

  /**
   * Löscht ein Ersatzteil
   */
  async deleteSparePart(id: number, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      const shopId = user.shopId || 1;
      
      // Erst das Ersatzteil abrufen, um die repairId zu bekommen
      const part = await this.getSparePart(id, userId);
      if (!part) return false;
      
      const result = await db
        .delete(spareParts)
        .where(and(
          eq(spareParts.id, id),
          eq(spareParts.shopId, shopId)
        ));
      
      if (result.rowCount && result.rowCount > 0) {
        // Nach dem Löschen prüfen, ob der Reparatur-Status aktualisiert werden muss
        await this.checkAndUpdateRepairStatus(part.repairId, userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Fehler beim Löschen des Ersatzteils:', error);
      return false;
    }
  }

  /**
   * Prüft und aktualisiert automatisch den Reparatur-Status basierend auf Ersatzteil-Status
   */
  async checkAndUpdateRepairStatus(repairId: number, userId: number): Promise<void> {
    try {
      // Hole die Reparatur
      const repair = await this.getRepair(repairId, userId);
      if (!repair) return;
      
      // Hole alle Ersatzteile für diese Reparatur
      const parts = await this.getSparePartsByRepairId(repairId, userId);
      
      if (parts.length === 0) {
        // Keine Ersatzteile vorhanden - Status sollte nicht "warten_auf_ersatzteile" sein
        if (repair.status === 'warten_auf_ersatzteile') {
          await this.updateRepairStatus(repairId, 'in_reparatur', userId);
          console.log(`Reparatur ${repairId}: Status auf 'in_reparatur' geändert (keine Ersatzteile mehr)`);
        }
        return;
      }
      
      // Prüfe Status aller Ersatzteile
      const hasPartsToOrder = parts.some(part => part.status === 'bestellen');
      const hasOrderedParts = parts.some(part => part.status === 'bestellt');
      const allPartsDelivered = parts.every(part => part.status === 'eingetroffen');
      
      if (hasPartsToOrder && repair.status !== 'ersatzteile_bestellen') {
        // Es gibt Ersatzteile, die bestellt werden müssen
        await this.updateRepairStatus(repairId, 'ersatzteile_bestellen', userId);
        console.log(`Reparatur ${repairId}: Status auf 'ersatzteile_bestellen' geändert`);
      } else if (!hasPartsToOrder && hasOrderedParts && repair.status !== 'warten_auf_ersatzteile') {
        // Alle Teile sind bestellt oder eingetroffen, aber mindestens eines ist noch bestellt
        await this.updateRepairStatus(repairId, 'warten_auf_ersatzteile', userId);
        console.log(`Reparatur ${repairId}: Status auf 'warten_auf_ersatzteile' geändert`);
      } else if (allPartsDelivered && (repair.status === 'warten_auf_ersatzteile' || repair.status === 'ersatzteile_bestellen')) {
        // Alle Ersatzteile sind eingetroffen
        await this.updateRepairStatus(repairId, 'ersatzteil_eingetroffen', userId);
        console.log(`Reparatur ${repairId}: Status auf 'ersatzteil_eingetroffen' geändert (alle Ersatzteile eingetroffen)`);
      }
    } catch (error) {
      console.error('Fehler beim Prüfen/Aktualisieren des Reparatur-Status:', error);
    }
  }

  /**
   * Bulk-Update für Ersatzteil-Status
   */
  async bulkUpdateSparePartStatus(partIds: number[], status: string, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      const shopId = user.shopId || 1;
      
      // Erst alle betroffenen Reparatur-IDs sammeln
      const affectedParts = await db
        .select({ repairId: spareParts.repairId })
        .from(spareParts)
        .where(and(
          inArray(spareParts.id, partIds),
          eq(spareParts.shopId, shopId)
        ));
      
      const repairIds = [...new Set(affectedParts.map(p => p.repairId))];
      
      // Bei Status "eingetroffen": Erst Status setzen, dann Reparatur-Status prüfen, dann löschen
      if (status === 'eingetroffen') {
        console.log(`📦 EINGETROFFEN: Markiere Ersatzteile mit IDs ${partIds.join(', ')} als eingetroffen`);
        
        // Erst normales Update durchführen
        const updateResult = await db
          .update(spareParts)
          .set({
            status,
            deliveryDate: new Date(),
            updatedAt: new Date(),
          })
          .where(and(
            inArray(spareParts.id, partIds),
            eq(spareParts.shopId, shopId)
          ));
        
        if (updateResult.rowCount && updateResult.rowCount > 0) {
          console.log(`✅ STATUS-UPDATE: ${updateResult.rowCount} Ersatzteile als eingetroffen markiert`);
          
          // Status aller betroffenen Reparaturen aktualisieren (sollte zu "ersatzteil_eingetroffen" werden)
          for (const repairId of repairIds) {
            await this.checkAndUpdateRepairStatus(repairId, userId);
          }
          
          // Ersatzteile bleiben vollständig in der Datenbank erhalten
          console.log(`✅ BEHALTEN: Eingetroffene Ersatzteile bleiben im RepairDetailsDialog erhalten, werden nur aus Bestellungen-Liste gefiltert`);
          
          return true;
        }
        return false;
      }
      
      // Normales Update für andere Status
      const result = await db
        .update(spareParts)
        .set({
          status,
          updatedAt: new Date(),
          ...(status === 'bestellt' ? { orderDate: new Date() } : {}),
        })
        .where(and(
          inArray(spareParts.id, partIds),
          eq(spareParts.shopId, shopId)
        ));
      
      if (result.rowCount && result.rowCount > 0) {
        // Status aller betroffenen Reparaturen aktualisieren
        for (const repairId of repairIds) {
          await this.checkAndUpdateRepairStatus(repairId, userId);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Fehler beim Bulk-Update der Ersatzteile:', error);
      return false;
    }
  }

  /**
   * Holt alle Reparaturen mit ihren Ersatzteilen für den erweiterten OrdersTab
   */
  async getRepairsWithSpareParts(userId: number): Promise<any[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];
      
      const shopId = user.shopId || 1;
      
      const repairsWithParts = await db
        .select({
          id: repairs.id,
          orderCode: repairs.orderCode,
          customerId: repairs.customerId,
          deviceType: repairs.deviceType,
          brand: repairs.brand,
          model: repairs.model,
          issue: repairs.issue,
          status: repairs.status,
          estimatedCost: repairs.estimatedCost,
          depositAmount: repairs.depositAmount,
          notes: repairs.notes,
          createdAt: repairs.createdAt,
          updatedAt: repairs.updatedAt,
          shopId: repairs.shopId,
          userId: repairs.userId,
          customer: {
            id: customers.id,
            firstName: customers.firstName,
            lastName: customers.lastName,
            email: customers.email,
            phone: customers.phone,
            address: customers.address,
            zipCode: customers.zipCode,
            city: customers.city,
            createdAt: customers.createdAt,
            shopId: customers.shopId,
            userId: customers.userId,
          }
        })
        .from(repairs)
        .leftJoin(customers, eq(repairs.customerId, customers.id))
        .leftJoin(spareParts, eq(repairs.id, spareParts.repairId))
        .where(and(
          eq(repairs.shopId, shopId),
          isNotNull(spareParts.id) // Nur Reparaturen mit Ersatzteilen
        ))
        .groupBy(
          repairs.id,
          customers.id
        )
        .orderBy(desc(repairs.createdAt));
      
      return repairsWithParts;
    } catch (error) {
      console.error('Fehler beim Abrufen der Reparaturen mit Ersatzteilen:', error);
      return [];
    }
  }

  // Zubehör-Verwaltung Implementierung
  async createAccessory(accessoryData: InsertAccessory): Promise<Accessory> {
    try {
      const [accessory] = await db
        .insert(accessories)
        .values(accessoryData)
        .returning();

      console.log(`✅ Zubehör-Bestellung erstellt: ${accessory.articleName}`);
      return accessory;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Zubehör-Bestellung:', error);
      throw error;
    }
  }

  async getAllAccessories(userId: number): Promise<Accessory[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];
      
      const shopId = user.shopId || 1;
      
      const accessoryList = await db
        .select({
          id: accessories.id,
          articleName: accessories.articleName,
          quantity: accessories.quantity,
          unitPrice: accessories.unitPrice,
          totalPrice: accessories.totalPrice,
          downPayment: accessories.downPayment,
          customerId: accessories.customerId,
          type: accessories.type,
          status: accessories.status,
          notes: accessories.notes,
          createdAt: accessories.createdAt,
          updatedAt: accessories.updatedAt,
          shopId: accessories.shopId,
          userId: accessories.userId,
          customerName: sql<string>`CASE 
            WHEN ${accessories.customerId} IS NOT NULL 
            THEN CONCAT(${customers.firstName}, ' ', ${customers.lastName})
            ELSE NULL 
          END`.as('customerName')
        })
        .from(accessories)
        .leftJoin(customers, eq(accessories.customerId, customers.id))
        .where(and(
          eq(accessories.shopId, shopId),
          eq(accessories.archived, false) // Nur nicht-archivierte Zubehörteile anzeigen
        ))
        .orderBy(desc(accessories.createdAt));
      
      console.log(`✅ ${accessoryList.length} Zubehör-Bestellungen für Benutzer ${userId} abgerufen`);
      return accessoryList;
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Zubehör-Bestellungen:', error);
      return [];
    }
  }

  async getAccessory(id: number, userId: number): Promise<Accessory | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const shopId = user.shopId || 1;
      
      const [accessory] = await db
        .select()
        .from(accessories)
        .where(and(
          eq(accessories.id, id),
          eq(accessories.shopId, shopId)
        ));

      return accessory;
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Zubehör-Bestellung:', error);
      return undefined;
    }
  }

  async updateAccessory(id: number, accessoryData: Partial<InsertAccessory>, userId: number): Promise<Accessory | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const shopId = user.shopId || 1;
      
      // Automatische Archivierung bei Status "eingetroffen" oder "erledigt"
      const updateData: any = {
        ...accessoryData,
        updatedAt: new Date()
      };
      
      if (accessoryData.status && (accessoryData.status === "eingetroffen" || accessoryData.status === "erledigt")) {
        updateData.archived = true;
        console.log(`🗃️ Zubehör ${id} wird automatisch archiviert (Status: ${accessoryData.status})`);
      }

      const [updatedAccessory] = await db
        .update(accessories)
        .set(updateData)
        .where(and(
          eq(accessories.id, id),
          eq(accessories.shopId, shopId)
        ))
        .returning();

      console.log(`✅ Zubehör-Bestellung ${id} aktualisiert`);
      return updatedAccessory;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Zubehör-Bestellung:', error);
      return undefined;
    }
  }

  async deleteAccessory(id: number, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      const shopId = user.shopId || 1;
      
      const result = await db
        .delete(accessories)
        .where(and(
          eq(accessories.id, id),
          eq(accessories.shopId, shopId)
        ));

      console.log(`✅ Zubehör-Bestellung ${id} gelöscht`);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Zubehör-Bestellung:', error);
      return false;
    }
  }

  // Employee Management Methods
  async getEmployeesByShopOwner(ownerId: number): Promise<User[]> {
    const shopOwner = await this.getUser(ownerId);
    if (!shopOwner || shopOwner.role !== 'owner') {
      return [];
    }

    const employees = await db
      .select()
      .from(users)
      .where(and(
        eq(users.parentUserId, ownerId),
        eq(users.role, 'employee')
      ));

    return employees;
  }

  async getEmployeeCountForShop(shopId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        eq(users.shopId, shopId),
        eq(users.role, 'employee'),
        eq(users.isActive, true)
      ));

    return result[0]?.count || 0;
  }

  async getMaxEmployeesForShop(shopId: number): Promise<number> {
    const result = await db
      .select({ maxEmployees: businessSettings.maxEmployees })
      .from(businessSettings)
      .where(eq(businessSettings.shopId, shopId))
      .limit(1);

    return result[0]?.maxEmployees || 2; // Standard: 2 Mitarbeiter
  }

  async createEmployee(employeeData: Partial<User>): Promise<User> {
    // Prüfe Mitarbeiter-Limit bevor ein neuer Mitarbeiter erstellt wird
    const parentUserId = employeeData.parentUserId;
    if (parentUserId) {
      const shopOwner = await this.getUser(parentUserId);
      if (shopOwner?.shopId) {
        const currentCount = await this.getEmployeeCountForShop(shopOwner.shopId);
        const maxEmployees = await this.getMaxEmployeesForShop(shopOwner.shopId);
        
        if (currentCount >= maxEmployees) {
          throw new Error(`Mitarbeiterlimit erreicht. Maximal ${maxEmployees} Mitarbeiter erlaubt.`);
        }
      }
    }

    const [employee] = await db
      .insert(users)
      .values({
        ...employeeData,
        role: 'employee',
        isActive: true,
      } as any)
      .returning();

    return employee;
  }

  async updateEmployee(employeeId: number, updateData: Partial<User>, userId: number): Promise<User> {
    console.log(`📝 Aktualisiere Mitarbeiter ${employeeId} mit Daten:`, updateData);
    
    const [employee] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, employeeId))
      .returning();

    if (!employee) {
      throw new Error('Mitarbeiter nicht gefunden');
    }

    console.log(`✅ Mitarbeiter ${employeeId} erfolgreich aktualisiert`);
    return employee;
  }

  async updateEmployeeStatus(employeeId: number, isActive: boolean): Promise<User> {
    const [employee] = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, employeeId))
      .returning();

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }

  async deleteEmployee(employeeId: number): Promise<void> {
    // Zuerst ALLE Foreign Key Referenzen auf den Mitarbeiter entfernen
    try {
      // Alle Tabellen mit user_id Referenzen bereinigen
      await db.update(customers).set({ userId: null }).where(eq(customers.userId, employeeId));
      await db.update(repairs).set({ userId: null }).where(eq(repairs.userId, employeeId));
      await db.update(repairStatusHistory).set({ userId: null }).where(eq(repairStatusHistory.userId, employeeId));
      await db.update(businessSettings).set({ userId: null }).where(eq(businessSettings.userId, employeeId));
      await db.update(userDeviceTypes).set({ userId: null }).where(eq(userDeviceTypes.userId, employeeId));
      await db.update(userBrands).set({ userId: null }).where(eq(userBrands.userId, employeeId));
      await db.update(costEstimates).set({ userId: null }).where(eq(costEstimates.userId, employeeId));
      await db.update(userModelSeries).set({ userId: null }).where(eq(userModelSeries.userId, employeeId));
      await db.update(userModels).set({ userId: null }).where(eq(userModels.userId, employeeId));
      await db.update(emailHistory).set({ userId: null }).where(eq(emailHistory.userId, employeeId));
      await db.update(tempSignatures).set({ userId: null }).where(eq(tempSignatures.userId, employeeId));
      await db.update(spareParts).set({ userId: null }).where(eq(spareParts.userId, employeeId));
      await db.update(accessories).set({ userId: null }).where(eq(accessories.userId, employeeId));
      await db.update(loanerDevices).set({ userId: null }).where(eq(loanerDevices.userId, employeeId));
      
      console.log(`🗑️ Alle userId-Referenzen für Mitarbeiter ${employeeId} entfernt`);

      // Anonymisiere createdBy Felder
      await db
        .update(repairs)
        .set({ createdBy: "GELÖSCHTER MITARBEITER" })
        .where(eq(repairs.createdBy, employeeId.toString()));

      console.log(`🗑️ CreatedBy-Referenzen für Mitarbeiter ${employeeId} anonymisiert`);

      // Den Mitarbeiter selbst löschen
      await db
        .delete(users)
        .where(eq(users.id, employeeId));

      console.log(`✅ Mitarbeiter ${employeeId} erfolgreich gelöscht`);
    } catch (error) {
      console.error('Fehler beim Löschen des Mitarbeiters:', error);
      throw error;
    }
  }

  // Leihgeräte-Verwaltung Methoden
  async getAllLoanerDevices(userId: number): Promise<LoanerDevice[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      const shopId = user.shopId || 1;

      // Erweiterte Abfrage mit JOIN zu repairs und customers für Zuordnungsinformationen
      const devices = await db
        .select({
          id: loanerDevices.id,
          deviceType: loanerDevices.deviceType,
          brand: loanerDevices.brand,
          model: loanerDevices.model,
          imei: loanerDevices.imei,
          condition: loanerDevices.condition,
          status: loanerDevices.status,
          notes: loanerDevices.notes,
          shopId: loanerDevices.shopId,
          userId: loanerDevices.userId,
          createdAt: loanerDevices.createdAt,
          updatedAt: loanerDevices.updatedAt,
          // Zusätzliche Felder für zugewiesene Reparatur
          assignedRepairId: repairs.id,
          assignedOrderCode: repairs.orderCode,
          assignedCustomerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`.as('assignedCustomerName')
        })
        .from(loanerDevices)
        .leftJoin(repairs, eq(repairs.loanerDeviceId, loanerDevices.id))
        .leftJoin(customers, eq(customers.id, repairs.customerId))
        .where(eq(loanerDevices.shopId, shopId))
        .orderBy(desc(loanerDevices.createdAt));

      return devices as any[];
    } catch (error) {
      console.error('Fehler beim Abrufen der Leihgeräte:', error);
      return [];
    }
  }

  async getLoanerDevice(id: number, userId: number): Promise<LoanerDevice | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;

      const shopId = user.shopId || 1;

      const [device] = await db
        .select()
        .from(loanerDevices)
        .where(and(
          eq(loanerDevices.id, id),
          eq(loanerDevices.shopId, shopId)
        ));

      return device;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Leihgeräts ${id}:`, error);
      return undefined;
    }
  }

  async createLoanerDevice(device: InsertLoanerDevice): Promise<LoanerDevice> {
    try {
      console.log('STORAGE: createLoanerDevice aufgerufen mit:', JSON.stringify(device, null, 2));
      
      const insertData = {
        ...device,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('STORAGE: Finale Insert-Daten:', JSON.stringify(insertData, null, 2));
      console.log('STORAGE: userId in insertData:', insertData.userId);
      
      const [newDevice] = await db
        .insert(loanerDevices)
        .values(insertData)
        .returning();

      console.log('STORAGE: Erfolgreich erstellt:', JSON.stringify(newDevice, null, 2));
      return newDevice;
    } catch (error) {
      console.error('STORAGE: Fehler beim Erstellen des Leihgeräts:', error);
      throw error;
    }
  }

  async updateLoanerDevice(id: number, device: Partial<InsertLoanerDevice>, userId: number): Promise<LoanerDevice | undefined> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;

      const shopId = user.shopId || 1;

      const [updatedDevice] = await db
        .update(loanerDevices)
        .set({
          ...device,
          updatedAt: new Date(),
        })
        .where(and(
          eq(loanerDevices.id, id),
          eq(loanerDevices.shopId, shopId)
        ))
        .returning();

      return updatedDevice;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Leihgeräts ${id}:`, error);
      return undefined;
    }
  }

  async deleteLoanerDevice(id: number, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const shopId = user.shopId || 1;

      // Prüfen, ob das Gerät gerade verliehen ist
      const device = await this.getLoanerDevice(id, userId);
      if (device?.status === 'verliehen') {
        throw new Error('Leihgerät kann nicht gelöscht werden - es ist gerade verliehen');
      }

      await db
        .delete(loanerDevices)
        .where(and(
          eq(loanerDevices.id, id),
          eq(loanerDevices.shopId, shopId)
        ));

      return true;
    } catch (error) {
      console.error(`Fehler beim Löschen des Leihgeräts ${id}:`, error);
      return false;
    }
  }

  async getAvailableLoanerDevices(userId: number): Promise<LoanerDevice[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      const shopId = user.shopId || 1;

      const devices = await db
        .select()
        .from(loanerDevices)
        .where(and(
          eq(loanerDevices.shopId, shopId),
          eq(loanerDevices.status, 'verfügbar')
        ))
        .orderBy(loanerDevices.deviceType, loanerDevices.brand, loanerDevices.model);

      return devices;
    } catch (error) {
      console.error('Fehler beim Abrufen verfügbarer Leihgeräte:', error);
      return [];
    }
  }

  async assignLoanerDevice(repairId: number, loanerDeviceId: number, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const shopId = user.shopId || 1;

      // Prüfen, ob das Gerät verfügbar ist
      const device = await this.getLoanerDevice(loanerDeviceId, userId);
      if (!device || device.status !== 'verfügbar') {
        throw new Error('Leihgerät ist nicht verfügbar');
      }

      // Gerät als "verliehen" markieren
      await db
        .update(loanerDevices)
        .set({
          status: 'verliehen',
          updatedAt: new Date(),
        })
        .where(eq(loanerDevices.id, loanerDeviceId));

      // Leihgerät der Reparatur zuweisen
      await db
        .update(repairs)
        .set({
          loanerDeviceId: loanerDeviceId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(repairs.id, repairId),
          eq(repairs.shopId, shopId)
        ));

      return true;
    } catch (error) {
      console.error(`Fehler beim Zuweisen des Leihgeräts ${loanerDeviceId} zu Reparatur ${repairId}:`, error);
      return false;
    }
  }

  async returnLoanerDevice(repairId: number, userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const shopId = user.shopId || 1;

      // Reparatur abrufen
      const repair = await this.getRepair(repairId, userId);
      if (!repair || !repair.loanerDeviceId) {
        return false;
      }

      // Leihgerät als "verfügbar" markieren
      await db
        .update(loanerDevices)
        .set({
          status: 'verfügbar',
          updatedAt: new Date(),
        })
        .where(eq(loanerDevices.id, repair.loanerDeviceId));

      // Leihgerät von der Reparatur entfernen
      await db
        .update(repairs)
        .set({
          loanerDeviceId: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(repairs.id, repairId),
          eq(repairs.shopId, shopId)
        ));

      // Status-History-Eintrag für Leihgeräte-Rückgabe erstellen
      try {
        await db.insert(repairStatusHistory).values({
          repairId: repairId,
          oldStatus: repair.status,
          newStatus: repair.status, // Status bleibt gleich, nur Leihgerät wird zurückgegeben
          changedBy: this.getUserDisplayName(user), // Benutzername des aktuellen Users
          userId: userId,
          shopId: shopId,
          notes: "Leihgerät automatisch zurückgegeben"
        });
        
        console.log(`Status-History-Eintrag für Leihgeräte-Rückgabe bei Reparatur ${repairId} erstellt (Benutzer: ${this.getUserDisplayName(user)})`);
      } catch (historyError) {
        console.error("Fehler beim Erstellen des Status-History-Eintrags für Leihgeräte-Rückgabe:", historyError);
        // Fehler nicht weiterwerfen, da die Rückgabe bereits erfolgt ist
      }

      return true;
    } catch (error) {
      console.error(`Fehler beim Zurückgeben des Leihgeräts für Reparatur ${repairId}:`, error);
      return false;
    }
  }

  async getLoanerDeviceByRepairId(repairId: number, userId: number): Promise<LoanerDevice | undefined> {
    try {
      const repair = await this.getRepair(repairId, userId);
      if (!repair || !repair.loanerDeviceId) {
        return undefined;
      }

      return await this.getLoanerDevice(repair.loanerDeviceId, userId);
    } catch (error) {
      console.error(`Fehler beim Abrufen des Leihgeräts für Reparatur ${repairId}:`, error);
      return undefined;
    }
  }

  // === Multi-Shop Access Methoden ===
  
  async getUserAccessibleShops(userId: number): Promise<Shop[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      // Für normale Shop-Owner: Nur ihr eigener Shop
      if (user.shopId && !user.isSuperadmin) {
        const [shop] = await db
          .select()
          .from(shops)
          .where(eq(shops.id, user.shopId));
        return shop ? [shop] : [];
      }

      // Für Multi-Shop Admins: Alle zugänglichen Shops mit echten Firmennamen
      const accessibleShops = await db
        .select({
          shopId: userShopAccess.shopId,
          userId: userShopAccess.userId,
          grantedAt: userShopAccess.grantedAt,
          isActive: userShopAccess.isActive,
        })
        .from(userShopAccess)
        .where(
          and(
            eq(userShopAccess.userId, userId),
            eq(userShopAccess.isActive, true),
            isNull(userShopAccess.revokedAt)
          )
        );

      // Lade business_name für jeden Shop separat  
      const result = [];
      for (const shop of accessibleShops) {
        const [businessData] = await db
          .select({ businessName: businessSettings.businessName })
          .from(businessSettings)
          .where(eq(businessSettings.shopId, shop.shopId));
          
        result.push({
          id: shop.shopId,
          name: businessData?.businessName || `Shop ${shop.shopId}`,
          businessName: businessData?.businessName || `Shop ${shop.shopId}`,
          isActive: true,
          shopId: shop.shopId,
          grantedAt: shop.grantedAt
        });
      }
      
      console.log(`DEBUG: Final accessible shops with business names for user ${userId}:`, result);
      return result;
    } catch (error) {
      console.error('Error getting accessible shops:', error);
      return [];
    }
  }

  async getUserAccessibleShopsCount(userId: number): Promise<number> {
    try {
      const user = await this.getUser(userId);
      if (!user) return 0;

      // Für normale Shop-Owner: 1 Shop (ihren eigenen)
      if (user.shopId && !user.isSuperadmin) {
        const [shop] = await db
          .select()
          .from(shops)
          .where(eq(shops.id, user.shopId));
        return shop ? 1 : 0;
      }

      // Für Multi-Shop Admins: Anzahl der zugänglichen Shops
      const count = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(userShopAccess)
        .where(
          and(
            eq(userShopAccess.userId, userId),
            eq(userShopAccess.isActive, true),
            isNull(userShopAccess.revokedAt)
          )
        );

      return count[0]?.count || 0;
    } catch (error) {
      console.error('Error getting accessible shops count:', error);
      return 0;
    }
  }

  /**
   * Multi-Shop Admin Details abrufen
   */
  async getMultiShopAdminDetails(adminId: number): Promise<User & { accessibleShops: Shop[] } | undefined> {
    try {
      console.log('DEBUG: Getting multi-shop admin details for ID:', adminId);
      
      // NEUE LOGIK: Admin muss isMultiShopAdmin=true haben
      const admin = await db.select().from(users).where(
        and(
          eq(users.id, adminId),
          eq(users.isMultiShopAdmin, true),
          eq(users.isSuperadmin, false)
        )
      ).then(rows => rows[0]);

      console.log('DEBUG: Found multi-shop admin:', admin ? `${admin.username} (ID: ${admin.id}, isMultiShopAdmin: ${admin.isMultiShopAdmin})` : 'not found');

      if (!admin) {
        console.log('DEBUG: User is not a multi-shop admin or does not exist');
        return undefined;
      }

      // Zugängliche Shops abrufen (kann auch leer sein für neue Multi-Shop Admins)
      const accessibleShops = await this.getUserAccessibleShops(adminId);
      console.log('DEBUG: Retrieved', accessibleShops.length, 'accessible shops for multi-shop admin');

      return {
        ...admin,
        accessibleShops
      };
    } catch (error) {
      console.error('Error getting multi-shop admin details:', error);
      return undefined;
    }
  }

  /**
   * Multi-Shop Admin aktualisieren
   */
  async updateMultiShopAdmin(adminId: number, updates: Partial<User>): Promise<User> {
    try {
      const [updatedAdmin] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, adminId))
        .returning();

      return updatedAdmin;
    } catch (error) {
      console.error('Error updating multi-shop admin:', error);
      throw error;
    }
  }

  async createUserShopAccess(access: InsertUserShopAccess): Promise<UserShopAccess> {
    try {
      const [newAccess] = await db
        .insert(userShopAccess)
        .values(access)
        .returning();
      
      return newAccess;
    } catch (error) {
      console.error('Error creating user shop access:', error);
      throw error;
    }
  }

  async revokeUserShopAccess(userId: number, shopId: number): Promise<boolean> {
    try {
      const result = await db
        .update(userShopAccess)
        .set({
          isActive: false,
          revokedAt: new Date()
        })
        .where(
          and(
            eq(userShopAccess.userId, userId),
            eq(userShopAccess.shopId, shopId)
          )
        );

      return true;
    } catch (error) {
      console.error('Error revoking user shop access:', error);
      return false;
    }
  }

  async getUserShopAccess(userId: number): Promise<UserShopAccess[]> {
    try {
      const accesses = await db
        .select()
        .from(userShopAccess)
        .where(
          and(
            eq(userShopAccess.userId, userId),
            eq(userShopAccess.isActive, true),
            isNull(userShopAccess.revokedAt)
          )
        );

      return accesses;
    } catch (error) {
      console.error('Error getting user shop access:', error);
      return [];
    }
  }

  // DEPRECATED: Diese Funktion wurde durch getAllMultiShopAdmins() ersetzt

  /**
   * Multi-Shop Admin aktualisieren
   */
  async updateMultiShopAdmin(adminId: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      console.log('DEBUG: Updating multi-shop admin:', adminId, 'with updates:', Object.keys(updates));
      
      // Passwort aus Updates entfernen, falls leer
      if (updates.password === '') {
        delete updates.password;
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date()
        } as any)
        .where(eq(users.id, adminId))
        .returning();

      if (updatedUser) {
        console.log('DEBUG: Multi-shop admin updated successfully:', updatedUser.username);
        return updatedUser;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error updating multi-shop admin:', error);
      return undefined;
    }
  }

  // === 2FA Methoden ===
  
  async setupEmailTwoFA(userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({
          twoFaEmailEnabled: true
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('Error setting up email 2FA:', error);
      return false;
    }
  }

  async setupTOTPTwoFA(userId: number): Promise<{ secret: string; backupCodes: string[] }> {
    try {
      // Generiere Secret und Backup-Codes
      const secret = crypto.randomBytes(32).toString('base64');
      const backupCodes = this.generateBackupCodes();

      await db
        .update(users)
        .set({
          twoFaTotpEnabled: true,
          twoFaSecret: secret,
          backupCodes: backupCodes
        })
        .where(eq(users.id, userId));

      return { secret, backupCodes };
    } catch (error) {
      console.error('Error setting up TOTP 2FA:', error);
      throw error;
    }
  }

  async verifyTOTP(userId: number, token: string): Promise<boolean> {
    try {
      // Hier würde normalerweise die TOTP-Validierung mit einer Bibliothek wie speakeasy stattfinden
      // Für jetzt: Einfache Mock-Implementierung
      const user = await this.getUser(userId);
      if (!user || !user.twoFaTotpEnabled || !user.twoFaSecret) {
        return false;
      }

      // TODO: Implementiere echte TOTP-Validierung mit speakeasy
      // const verified = speakeasy.totp.verify({
      //   secret: user.twoFaSecret,
      //   encoding: 'base64',
      //   token: token,
      //   window: 1
      // });

      return token.length === 6; // Mock-Implementierung
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  async generateEmailTwoFACode(userId: number): Promise<string> {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 Minuten

      await db
        .update(users)
        .set({
          email2faCode: code,
          email2faExpires: expires
        })
        .where(eq(users.id, userId));

      return code;
    } catch (error) {
      console.error('Error generating email 2FA code:', error);
      throw error;
    }
  }

  async verifyEmailTwoFACode(userId: number, code: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user || !user.email2faCode || !user.email2faExpires) {
        return false;
      }

      const now = new Date();
      if (now > user.email2faExpires) {
        return false; // Code abgelaufen
      }

      const isValid = user.email2faCode === code;
      
      if (isValid) {
        // Code nach Verwendung löschen
        await db
          .update(users)
          .set({
            email2faCode: null,
            email2faExpires: null
          })
          .where(eq(users.id, userId));
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying email 2FA code:', error);
      return false;
    }
  }

  async disableTwoFA(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          twoFaEmailEnabled: false,
          twoFaTotpEnabled: false,
          twoFaSecret: null,
          backupCodes: null,
          email2faCode: null,
          email2faExpires: null
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  }

  generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  // Shop Metrics and Analytics Implementation
  async getShopMetrics(shopId: number, timeRange?: { start?: Date; end?: Date; period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' }) {
    try {
      console.log(`📊 Lade Metriken für Shop ${shopId}`);
      
      // Gesamtanzahl Reparaturen
      const totalRepairsResult = await db
        .select({ count: count() })
        .from(repairs)
        .where(eq(repairs.shopId, shopId));
      
      // Aktive Reparaturen (alle Status außer abgeholt)
      const activeRepairsResult = await db
        .select({ count: count() })
        .from(repairs)
        .where(
          and(
            eq(repairs.shopId, shopId),
            not(eq(repairs.status, 'abgeholt'))
          )
        );

      // Abgeschlossene Reparaturen (nur abgeholt)
      const completedRepairsResult = await db
        .select({ count: count() })
        .from(repairs)
        .where(
          and(
            eq(repairs.shopId, shopId),
            eq(repairs.status, 'abgeholt')
          )
        );

      // Mitarbeiter in diesem Shop
      const employeesResult = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.shopId, shopId),
            eq(users.isActive, true),
            or(
              eq(users.role, 'employee'),
              eq(users.role, 'owner')
            )
          )
        );

      // Einfache Dummy-Berechnung für Umsatz (basierend auf abgeschlossenen Reparaturen)
      const completedCount = completedRepairsResult[0]?.count || 0;
      const avgRepairPrice = 89.99; // Durchschnittlicher Reparaturpreis
      const totalRevenue = completedCount * avgRepairPrice;
      
      // Zeitraum-spezifische Berechnungen
      let periodRevenue = 0;
      let periodCompletedRepairs = 0;
      
      if (timeRange) {
        const { start, end, period } = timeRange;
        let startDate = start;
        let endDate = end || new Date();
        
        // Prüfe ob benutzerdefinierte Daten vorliegen
        if (start && end) {
          // Benutzerdefinierter Zeitraum - verwende direkt die übergebenen Daten
          console.log(`📅 Benutzerdefinierter Zeitraum: ${start} bis ${end}`);
        } else if (period && !start) {
          // Automatische Zeitraum-Berechnung basierend auf period
          const now = new Date();
          switch (period) {
            case 'day':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
              break;
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'quarter':
              const quarterStart = Math.floor(now.getMonth() / 3) * 3;
              startDate = new Date(now.getFullYear(), quarterStart, 1);
              break;
            case 'year':
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            case 'all':
            default:
              startDate = null;
              break;
          }
        }
        
        if (startDate) {
          const periodCompletedResult = await db
            .select({ count: count() })
            .from(repairs)
            .where(
              and(
                eq(repairs.shopId, shopId),
                eq(repairs.status, 'abgeholt'),
                gte(repairs.statusUpdatedAt, startDate),
                lte(repairs.statusUpdatedAt, endDate)
              )
            );
          
          periodCompletedRepairs = periodCompletedResult[0]?.count || 0;
          periodRevenue = periodCompletedRepairs * avgRepairPrice;
        } else {
          // Fallback für 'all' oder wenn kein Zeitraum definiert
          periodCompletedRepairs = completedCount;
          periodRevenue = totalRevenue;
        }
      } else {
        // Standard: Monatsumsatz (letzte 30 Tage)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const monthlyCompletedResult = await db
          .select({ count: count() })
          .from(repairs)
          .where(
            and(
              eq(repairs.shopId, shopId),
              eq(repairs.status, 'abgeholt'),
              gte(repairs.statusUpdatedAt, thirtyDaysAgo)
            )
          );

        periodRevenue = (monthlyCompletedResult[0]?.count || 0) * avgRepairPrice;
        periodCompletedRepairs = monthlyCompletedResult[0]?.count || 0;
      }

      const metrics = {
        totalRepairs: totalRepairsResult[0]?.count || 0,
        activeRepairs: activeRepairsResult[0]?.count || 0,
        completedRepairs: completedRepairsResult[0]?.count || 0,
        totalRevenue: Math.round(totalRevenue),
        periodRevenue: Math.round(periodRevenue),
        periodCompletedRepairs: periodCompletedRepairs,
        totalEmployees: employeesResult[0]?.count || 0,
        pendingOrders: 0,
        timeRange: timeRange || { period: 'month' } // Dokumentiert den verwendeten Zeitraum
      };

      console.log(`📊 Shop ${shopId} Metriken:`, metrics);
      return metrics;
    } catch (error) {
      console.error(`Fehler beim Laden der Shop-Metriken für Shop ${shopId}:`, error);
      throw error;
    }
  }

  async getShopDetails(shopId: number) {
    try {
      const shop = await db
        .select()
        .from(shops)
        .where(eq(shops.id, shopId))
        .limit(1);
      
      if (shop.length === 0) {
        return null;
      }

      const shopData = shop[0];
      const metrics = await this.getShopMetrics(shopId);
      const employees = await this.getShopEmployees(shopId);

      return {
        ...shopData,
        metrics,
        employees
      };
    } catch (error) {
      console.error(`Fehler beim Laden der Shop-Details für Shop ${shopId}:`, error);
      throw error;
    }
  }

  // Employee Transfer Implementation
  async transferEmployeeBetweenShops(employeeId: number, fromShopId: number, toShopId: number): Promise<boolean> {
    try {
      console.log(`🔄 Transferiere Mitarbeiter ${employeeId} von Shop ${fromShopId} zu Shop ${toShopId}`);
      
      // Prüfen ob der Mitarbeiter existiert und im Quell-Shop ist
      const employee = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, employeeId),
            eq(users.shopId, fromShopId)
          )
        )
        .limit(1);

      if (employee.length === 0) {
        console.error(`Mitarbeiter ${employeeId} nicht in Shop ${fromShopId} gefunden`);
        return false;
      }

      // Transfer durchführen
      const result = await db
        .update(users)
        .set({ shopId: toShopId })
        .where(eq(users.id, employeeId))
        .returning();

      const success = result.length > 0;
      console.log(`🔄 Transfer ${success ? 'erfolgreich' : 'fehlgeschlagen'}`);
      
      return success;
    } catch (error) {
      console.error(`Fehler beim Transferieren des Mitarbeiters:`, error);
      return false;
    }
  }

  async getShopEmployees(shopId: number): Promise<User[]> {
    try {
      const employees = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.shopId, shopId),
            eq(users.isActive, true),
            or(
              eq(users.role, 'employee'),
              eq(users.role, 'owner')
            )
          )
        );

      return employees;
    } catch (error) {
      console.error(`Fehler beim Laden der Shop-Mitarbeiter für Shop ${shopId}:`, error);
      throw error;
    }
  }

  // Multi-Shop Permission System Implementierung
  async requestShopAccess(multiShopAdminId: number, shopId: number, shopOwnerId: number): Promise<MultiShopPermission> {
    try {
      // Prüfen ob bereits eine Permission existiert
      const [existingPermission] = await db
        .select()
        .from(multiShopPermissions)
        .where(
          and(
            eq(multiShopPermissions.multiShopAdminId, multiShopAdminId),
            eq(multiShopPermissions.shopId, shopId)
          )
        );

      if (existingPermission) {
        console.log(`🔄 Permission bereits vorhanden für Admin ${multiShopAdminId} und Shop ${shopId}`);
        return existingPermission;
      }

      // Neue Permission Request erstellen
      const [newPermission] = await db
        .insert(multiShopPermissions)
        .values({
          multiShopAdminId,
          shopId,
          shopOwnerId,
          granted: false,
        })
        .returning();

      console.log(`📝 Permission Request erstellt: Admin ${multiShopAdminId} möchte Zugriff auf Shop ${shopId}`);
      return newPermission;
    } catch (error) {
      console.error('Fehler beim Erstellen der Permission Request:', error);
      throw error;
    }
  }

  async grantShopAccess(permissionId: number): Promise<boolean> {
    try {
      const [grantedPermission] = await db
        .update(multiShopPermissions)
        .set({
          granted: true,
          grantedAt: new Date(),
          revokedAt: null,
        })
        .where(eq(multiShopPermissions.id, permissionId))
        .returning();

      if (grantedPermission) {
        console.log(`✅ Shop-Zugriff gewährt für Permission ${permissionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Fehler beim Gewähren des Shop-Zugriffs:', error);
      return false;
    }
  }

  async revokeShopAccess(permissionId: number): Promise<boolean> {
    try {
      const [revokedPermission] = await db
        .update(multiShopPermissions)
        .set({
          granted: false,
          revokedAt: new Date(),
        })
        .where(eq(multiShopPermissions.id, permissionId))
        .returning();

      if (revokedPermission) {
        console.log(`❌ Shop-Zugriff widerrufen für Permission ${permissionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Fehler beim Widerrufen des Shop-Zugriffs:', error);
      return false;
    }
  }

  async getShopPermissions(shopOwnerId: number): Promise<MultiShopPermission[]> {
    try {
      const permissions = await db
        .select()
        .from(multiShopPermissions)
        .where(eq(multiShopPermissions.shopOwnerId, shopOwnerId))
        .orderBy(desc(multiShopPermissions.createdAt));

      return permissions;
    } catch (error) {
      console.error('Fehler beim Abrufen der Shop-Permissions:', error);
      return [];
    }
  }

  async hasShopPermission(multiShopAdminId: number, shopId: number): Promise<boolean> {
    try {
      const [permission] = await db
        .select()
        .from(multiShopPermissions)
        .where(
          and(
            eq(multiShopPermissions.multiShopAdminId, multiShopAdminId),
            eq(multiShopPermissions.shopId, shopId),
            eq(multiShopPermissions.granted, true)
          )
        );

      return !!permission;
    } catch (error) {
      console.error('Fehler beim Prüfen der Shop-Permission:', error);
      return false;
    }
  }

  async getPendingPermissions(shopOwnerId: number): Promise<MultiShopPermission[]> {
    try {
      const pendingPermissions = await db
        .select()
        .from(multiShopPermissions)
        .where(
          and(
            eq(multiShopPermissions.shopOwnerId, shopOwnerId),
            eq(multiShopPermissions.granted, false),
            isNull(multiShopPermissions.revokedAt)
          )
        )
        .orderBy(desc(multiShopPermissions.createdAt));

      return pendingPermissions;
    } catch (error) {
      console.error('Fehler beim Abrufen der ausstehenden Permissions:', error);
      return [];
    }
  }

  async getUserByShopId(shopId: number): Promise<User | undefined> {
    try {
      // Shop-Owner ist der Benutzer, der zu diesem Shop gehört (nicht Multi-Shop Admin)
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.shopId, shopId),
            eq(users.isMultiShopAdmin, false) // Nur normale Shop-Owner, nicht Multi-Shop Admins
          )
        );

      return user;
    } catch (error) {
      console.error('Fehler beim Abrufen des Shop-Owners:', error);
      return undefined;
    }
  }

  // Multi-Shop Admin Management Methoden
  
  async getAllMultiShopAdmins(): Promise<any[]> {
    try {
      // Alle Multi-Shop Admins laden
      const multiShopAdmins = await db
        .select()
        .from(users)
        .where(eq(users.isMultiShopAdmin, true));

      console.log(`🔍 ${multiShopAdmins.length} Multi-Shop Admins gefunden`);

      // Für jeden Multi-Shop Admin umfassende Informationen laden
      const adminsWithDetails = await Promise.all(
        multiShopAdmins.map(async (admin) => {
          // 1. Gewährte Permissions und Shops
          const grantedPermissions = await this.getGrantedPermissions(admin.id);
          const accessibleShops = await Promise.all(
            grantedPermissions.map(async (permission) => {
              // Business-Namen aus business_settings abrufen
              const [businessData] = await db
                .select({
                  businessName: businessSettings.businessName,
                  ownerFirstName: businessSettings.ownerFirstName,
                  ownerLastName: businessSettings.ownerLastName,
                  city: businessSettings.city,
                  email: businessSettings.email
                })
                .from(businessSettings)
                .where(eq(businessSettings.shopId, permission.shopId));
                
              return {
                id: permission.shopId,
                name: businessData?.businessName || `Shop #${permission.shopId}`,
                businessName: businessData?.businessName,
                ownerName: businessData ? `${businessData.ownerFirstName} ${businessData.ownerLastName}` : '',
                city: businessData?.city,
                email: businessData?.email,
                shopId: permission.shopId,
                grantedAt: permission.grantedAt,
                isActive: true
              };
            })
          );

          // 2. MSA-Profil laden
          let msaProfile;
          try {
            msaProfile = await this.getMSAProfile(admin.id);
          } catch (error) {
            console.log('MSA-Profile-Tabelle existiert noch nicht, verwende null');
            msaProfile = null;
          }
          
          // 3. MSA-Preisgestaltung laden (oder Standard verwenden)
          let msaPricing;
          try {
            msaPricing = await this.getMSAPricing(admin.id);
            if (!msaPricing) {
              // Standard-Pricing erstellen falls nicht vorhanden
              msaPricing = await this.createMSAPricing({
                userId: admin.id,
                pricePerShop: 29.90,
                currency: 'EUR',
                billingCycle: 'monthly',
                discountPercent: 0
              });
            }
          } catch (error) {
            console.log('MSA-Pricing-Tabelle existiert noch nicht, verwende Standard-Werte');
            // Fallback auf Standard-Werte falls Tabelle nicht existiert
            msaPricing = {
              pricePerShop: 29.90,
              currency: 'EUR',
              billingCycle: 'monthly',
              discountPercent: 0,
              notes: null
            };
          }

          // 4. Monatlichen Gesamtpreis berechnen
          const totalShops = accessibleShops.filter(shop => shop !== null).length;
          const monthlyTotal = totalShops * msaPricing.pricePerShop * (1 - msaPricing.discountPercent / 100);

          return {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            
            // Shop-Informationen
            accessibleShops: accessibleShops.filter(shop => shop !== null),
            totalShops,
            
            // MSA-Profil
            profile: msaProfile ? {
              firstName: msaProfile.firstName,
              lastName: msaProfile.lastName,
              email: msaProfile.email,
              phone: msaProfile.phone,
              businessData: msaProfile.businessData
            } : null,
            
            // Preisgestaltung
            pricing: {
              pricePerShop: msaPricing.pricePerShop,
              currency: msaPricing.currency,
              billingCycle: msaPricing.billingCycle,
              discountPercent: msaPricing.discountPercent,
              monthlyTotal: Number(monthlyTotal.toFixed(2)),
              notes: msaPricing.notes
            }
          };
        })
      );

      console.log(`📋 Multi-Shop Admins mit Details verarbeitet: ${adminsWithDetails.length}`);
      return adminsWithDetails;
    } catch (error) {
      console.error('Fehler beim Abrufen der Multi-Shop Admins:', error);
      return [];
    }
  }

  async getGrantedPermissions(multiShopAdminId: number): Promise<any[]> {
    try {
      const permissions = await db
        .select()
        .from(multiShopPermissions)
        .where(
          and(
            eq(multiShopPermissions.multiShopAdminId, multiShopAdminId),
            eq(multiShopPermissions.granted, true),
            isNull(multiShopPermissions.revokedAt)
          )
        );

      return permissions;
    } catch (error) {
      console.error('Fehler beim Abrufen der gewährten Permissions:', error);
      return [];
    }
  }

  async getShop(shopId: number): Promise<any | undefined> {
    try {
      const [shop] = await db
        .select()
        .from(shops)
        .where(eq(shops.id, shopId));

      return shop;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Shops ${shopId}:`, error);
      return undefined;
    }
  }

  // NEUE KIOSK-MITARBEITER METHODEN
  async getKioskEmployees(shopId: number): Promise<User[]> {
    try {
      const kioskEmployees = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.shopId, shopId),
            eq(users.role, "kiosk"),
            eq(users.isActive, true)
          )
        );
      return kioskEmployees;
    } catch (error) {
      console.error(`Fehler beim Abrufen der Kiosk-Mitarbeiter für Shop ${shopId}:`, error);
      return [];
    }
  }

  // MSA PROFILE UND PRICING METHODEN
  async getMSAProfile(userId: number): Promise<MSAProfile | undefined> {
    try {
      const [profile] = await db
        .select()
        .from(msaProfiles)
        .where(eq(msaProfiles.userId, userId));
      return profile;
    } catch (error) {
      console.error(`Fehler beim Abrufen des MSA-Profils für User ${userId}:`, error);
      return undefined;
    }
  }

  async createMSAProfile(profile: any): Promise<MSAProfile> {
    try {
      const [newProfile] = await db
        .insert(msaProfiles)
        .values(profile)
        .returning();
      return newProfile;
    } catch (error) {
      console.error('Fehler beim Erstellen des MSA-Profils:', error);
      throw error;
    }
  }

  async updateMSAProfile(userId: number, updates: any): Promise<MSAProfile | undefined> {
    try {
      const [updatedProfile] = await db
        .update(msaProfiles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(msaProfiles.userId, userId))
        .returning();
      return updatedProfile;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des MSA-Profils für User ${userId}:`, error);
      return undefined;
    }
  }

  async getMSAPricing(userId: number): Promise<MSAPricing | undefined> {
    try {
      const [pricing] = await db
        .select()
        .from(msaPricing)
        .where(eq(msaPricing.userId, userId));
      return pricing;
    } catch (error) {
      console.error(`Fehler beim Abrufen der MSA-Preisgestaltung für User ${userId}:`, error);
      return undefined;
    }
  }

  async createMSAPricing(pricing: any): Promise<MSAPricing> {
    try {
      const [newPricing] = await db
        .insert(msaPricing)
        .values(pricing)
        .returning();
      return newPricing;
    } catch (error) {
      console.error('Fehler beim Erstellen der MSA-Preisgestaltung:', error);
      throw error;
    }
  }

  async updateMSAPricing(userId: number, updates: any): Promise<MSAPricing | undefined> {
    try {
      const [updatedPricing] = await db
        .update(msaPricing)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(msaPricing.userId, userId))
        .returning();
      return updatedPricing;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der MSA-Preisgestaltung für User ${userId}:`, error);
      return undefined;
    }
  }

  async createKioskEmployee(kioskData: { 
    email: string; 
    password: string; 
    shopId: number; 
    parentUserId: number;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    try {
      const [newKioskEmployee] = await db
        .insert(users)
        .values({
          username: null, // Kiosk-Mitarbeiter haben keinen Username
          email: kioskData.email,
          password: kioskData.password,
          shopId: kioskData.shopId,
          parentUserId: kioskData.parentUserId,
          role: "kiosk",
          isActive: true,
          firstName: kioskData.firstName,
          lastName: kioskData.lastName
        })
        .returning();
      
      console.log(`✅ Kiosk-Mitarbeiter erstellt: ${newKioskEmployee.email} für Shop ${kioskData.shopId}`);
      return newKioskEmployee;
    } catch (error) {
      console.error("Fehler beim Erstellen des Kiosk-Mitarbeiters:", error);
      throw error;
    }
  }

  async isKioskOnline(shopId: number): Promise<{ isOnline: boolean; kioskUser?: User }> {
    try {
      const kioskEmployees = await this.getKioskEmployees(shopId);
      
      // TODO: Integration mit WebSocket OnlineStatusManager
      // Für jetzt geben wir false zurück, wird später mit WebSocket integriert
      return {
        isOnline: false,
        kioskUser: kioskEmployees.length > 0 ? kioskEmployees[0] : undefined
      };
    } catch (error) {
      console.error(`Fehler beim Prüfen der Kiosk-Verfügbarkeit für Shop ${shopId}:`, error);
      return { isOnline: false };
    }
  }

  async getAllOnlineKiosks(shopId: number): Promise<{ onlineKiosks: User[]; totalKiosks: number }> {
    try {
      const kioskEmployees = await this.getKioskEmployees(shopId);
      
      // TODO: Integration mit WebSocket OnlineStatusManager für alle Kiosks
      // Für jetzt geben wir alle als offline zurück
      return {
        onlineKiosks: [],
        totalKiosks: kioskEmployees.length
      };
    } catch (error) {
      console.error(`Fehler beim Prüfen der Multi-Kiosk-Verfügbarkeit für Shop ${shopId}:`, error);
      return { onlineKiosks: [], totalKiosks: 0 };
    }
  }

  async updateKioskEmployee(kioskId: number, updateData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
    password?: string;
  }): Promise<User> {
    try {
      // Erstelle das Update-Objekt dynamisch
      const setData: any = {};
      if (updateData.email !== undefined) setData.email = updateData.email;
      if (updateData.firstName !== undefined) setData.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) setData.lastName = updateData.lastName;
      if (updateData.isActive !== undefined) setData.isActive = updateData.isActive;
      if (updateData.password !== undefined) setData.password = updateData.password;

      const [updatedKiosk] = await db
        .update(users)
        .set(setData)
        .where(eq(users.id, kioskId))
        .returning();
      
      if (!updatedKiosk) {
        throw new Error("Kiosk-Mitarbeiter nicht gefunden");
      }
      
      return updatedKiosk;
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Kiosk-Mitarbeiters:", error);
      throw error;
    }
  }

  async deleteKioskEmployee(kioskId: number): Promise<void> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, kioskId))
        .returning();
      
      if (result.length === 0) {
        throw new Error("Kiosk-Mitarbeiter nicht gefunden");
      }
    } catch (error) {
      console.error("Fehler beim Löschen des Kiosk-Mitarbeiters:", error);
      throw error;
    }
  }

  // Activity-Logs System
  async createActivityLog(
    eventType: string,
    action: string,
    description: string,
    performedBy?: number,
    performedByUsername?: string,
    performedByRole?: string,
    entityType?: string,
    entityId?: number,
    entityName?: string,
    shopId?: number,
    shopName?: string,
    details?: any,
    severity: string = 'info'
  ): Promise<ActivityLog | null> {
    try {
      const [activityLog] = await db.insert(activityLogs).values({
        eventType,
        action,
        description,
        performedBy,
        performedByUsername,
        performedByRole,
        entityType,
        entityId,
        entityName,
        shopId,
        shopName,
        details,
        severity,
      }).returning();
      
      console.log('📋 Activity Log erstellt:', activityLog);
      return activityLog;
    } catch (error) {
      console.error('Fehler beim Erstellen des Activity-Logs:', error);
      return null;
    }
  }

  async getActivityLogs(
    msaUserId: number,
    options: {
      shopIds?: number[];
      period?: string;
      startDate?: string;
      endDate?: string;
      eventType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ActivityLog[]> {
    try {
      const { 
        shopIds, 
        period, 
        startDate, 
        endDate, 
        eventType, 
        limit = 100, 
        offset = 0 
      } = options;

      // Zugängliche Shops für MSA-User abrufen - direkt aus permissions laden
      let accessibleShopIds = shopIds;
      if (!accessibleShopIds) {
        const grantedPermissions = await db
          .select({ shopId: multiShopPermissions.shopId })
          .from(multiShopPermissions)
          .where(and(
            eq(multiShopPermissions.multiShopAdminId, msaUserId),
            eq(multiShopPermissions.granted, true),
            isNull(multiShopPermissions.revokedAt)
          ));
        accessibleShopIds = grantedPermissions.map(p => p.shopId);
      }
      
      if (accessibleShopIds.length === 0) {
        return [];
      }

      // Alle WHERE-Conditions sammeln
      const whereConditions = [
        inArray(activityLogs.shopId, accessibleShopIds)
      ];

      // Zeitraum-Filter
      if (period && period !== 'all') {
        const now = new Date();
        let startDateFilter: Date | null = null;

        switch (period) {
          case 'today':
            startDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDateFilter = new Date(now.getFullYear(), quarterStart, 1);
            break;
          case 'year':
            startDateFilter = new Date(now.getFullYear(), 0, 1);
            break;
        }

        if (startDateFilter) {
          whereConditions.push(gte(activityLogs.createdAt, startDateFilter));
        }
      } else if (startDate && endDate) {
        whereConditions.push(
          gte(activityLogs.createdAt, new Date(startDate)),
          lte(activityLogs.createdAt, new Date(endDate))
        );
      }

      // Event-Typ-Filter
      if (eventType && eventType !== 'all') {
        whereConditions.push(eq(activityLogs.eventType, eventType));
      }

      const query = db
        .select()
        .from(activityLogs)
        .where(and(...whereConditions))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const logs = await query;
      
      console.log(`📋 ${logs.length} Activity-Logs für MSA-User ${msaUserId} geladen`);
      return logs;
    } catch (error) {
      console.error('Fehler beim Abrufen der Activity-Logs:', error);
      return [];
    }
  }

  // Hilfsmethoden für Activity-Logging
  async logRepairActivity(
    action: string,
    repairId: number,
    repair: any,
    performedBy?: number,
    performedByUsername?: string,
    oldValue?: any,
    newValue?: any
  ): Promise<void> {
    let description = '';
    let details: any = { repairId, oldValue, newValue };

    switch (action) {
      case 'created':
        description = `Neue Reparatur "${repair.orderCode || repairId}" erstellt`;
        break;
      case 'status_changed':
        description = `Reparatur "${repair.orderCode || repairId}" Status geändert: ${oldValue} → ${newValue}`;
        break;
      case 'completed':
        description = `Reparatur "${repair.orderCode || repairId}" abgeschlossen`;
        break;
      case 'picked_up':
        description = `Reparatur "${repair.orderCode || repairId}" abgeholt`;
        break;
      default:
        description = `Reparatur "${repair.orderCode || repairId}" ${action}`;
    }

    await this.createActivityLog(
      'repair',
      action,
      description,
      performedBy,
      performedByUsername,
      undefined, // role wird später aus User-Daten geholt
      'repair',
      repairId,
      repair.orderCode || `Reparatur #${repairId}`,
      repair.shopId,
      undefined, // shopName wird später geholt
      details,
      'info'
    );
  }

  async logUserActivity(
    action: string,
    userId: number,
    user: any,
    performedBy?: number,
    performedByUsername?: string,
    details?: any
  ): Promise<void> {
    let description = '';
    
    switch (action) {
      case 'created':
        description = `Neuer Benutzer "${user.username || user.email}" erstellt`;
        break;
      case 'updated':
        description = `Benutzer "${user.username || user.email}" aktualisiert`;
        break;
      case 'deleted':
        description = `Benutzer "${user.username || user.email}" gelöscht`;
        break;
      case 'shop_transfer':
        description = `Benutzer "${user.username || user.email}" zu anderem Shop verschoben`;
        break;
      case 'login':
        description = `Benutzer "${user.username || user.email}" angemeldet`;
        break;
      case 'logout':
        description = `Benutzer "${user.username || user.email}" abgemeldet`;
        break;
      default:
        description = `Benutzer "${user.username || user.email}" ${action}`;
    }

    await this.createActivityLog(
      'user',
      action,
      description,
      performedBy,
      performedByUsername,
      undefined,
      'user',
      userId,
      user.username || user.email,
      user.shopId,
      undefined,
      details,
      action === 'deleted' ? 'warning' : 'info'
    );
  }

  async logOrderActivity(
    action: string,
    orderId: number,
    order: any,
    performedBy?: number,
    performedByUsername?: string,
    details?: any
  ): Promise<void> {
    let description = '';
    
    switch (action) {
      case 'created':
        description = `Neue Ersatzteil-Bestellung "${order.partName}" erstellt`;
        break;
      case 'status_changed':
        description = `Bestellung "${order.partName}" Status geändert`;
        break;
      case 'received':
        description = `Ersatzteil "${order.partName}" eingetroffen`;
        break;
      case 'archived':
        description = `Bestellung "${order.partName}" archiviert`;
        break;
      default:
        description = `Bestellung "${order.partName}" ${action}`;
    }

    await this.createActivityLog(
      'order',
      action,
      description,
      performedBy,
      performedByUsername,
      undefined,
      'order',
      orderId,
      order.partName,
      order.shopId,
      undefined,
      details,
      'info'
    );
  }

  async logCustomerActivity(
    action: string,
    customerId: number,
    customer: any,
    performedBy?: number,
    performedByUsername?: string,
    details?: any
  ): Promise<void> {
    let description = '';
    const customerName = `${customer.firstName} ${customer.lastName}`;
    
    switch (action) {
      case 'created':
        description = `Neuer Kunde "${customerName}" erstellt`;
        break;
      case 'updated':
        description = `Kunde "${customerName}" aktualisiert`;
        break;
      case 'deleted':
        description = `Kunde "${customerName}" gelöscht`;
        break;
      default:
        description = `Kunde "${customerName}" ${action}`;
    }

    await this.createActivityLog(
      'customer',
      action,
      description,
      performedBy,
      performedByUsername,
      undefined,
      'customer',
      customerId,
      customerName,
      customer.shopId,
      undefined,
      details,
      'info'
    );
  }

  // Activity-Logs
  async getAllActivityLogs(userId: number): Promise<ActivityLog[]> {
    // TODO: Legacy method - use getActivityLogs instead
    return await this.getActivityLogs(userId);
  }
}

export const storage = new DatabaseStorage();
