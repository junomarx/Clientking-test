import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// LEGACY SCHEMA - DATABASE PER TENANT MIGRATION IN PROGRESS
// =============================================================================
// 
// ⚠️  MIGRATION NOTICE: This file is being migrated to a database-per-tenant architecture
//
// MIGRATION PLAN:
// - Master Database (masterSchema.ts): Cross-tenant authentication, shop registry, 
//   multi-shop management, subscription packages, global catalogs, newsletters
// - Tenant Databases (tenantSchema.ts): Shop-specific operational data
//   (customers, repairs, business settings, etc.) - one database per shop
//
// MIGRATION PHASES:
// Phase 1: ✅ Schema classification and new schema files created
// Phase 2: 🔄 Tenancy gateway and connection routing
// Phase 3: 🔄 Dual-write migration system  
// Phase 4: 🔄 Data backfill and validation
// Phase 5: 🔄 Switch reads to tenant DBs and cleanup
//
// TABLE MIGRATION MAPPING:
// 🔵 MASTER DB: users, shops, packages, userShopAccess, multiShopPermissions,
//              msaProfiles, msaPricing, globalErrorCatalog, newsletters, etc.
// 🟢 TENANT DB: customers, repairs, businessSettings, feedbacks, spareParts,
//              accessories, loanerDevices, activityLogs, emailHistory, etc.
//
// =============================================================================

// 🔵 MASTER DB: Shops Tabelle für Multi-Tenant-Unterstützung
// MIGRATION: Will move to masterSchema.ts (enhanced with more metadata)
// NOTE: shops.id is the database entity ID (used as FK in users.shopId)
// Tenant isolation uses users.tenantShopId (sequential immutable ID)

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShopSchema = createInsertSchema(shops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;

// 🔵 MASTER DB: Tenant database connection credentials (encrypted)
// MIGRATION: Will move to masterSchema.ts
export const tenantConnections = pgTable("tenant_connections", {
  shopId: integer("shop_id").primaryKey().references(() => shops.id, { onDelete: 'cascade' }),
  databaseName: text("database_name").notNull(),
  username: text("username").notNull(),
  encryptedPassword: text("encrypted_password").notNull(), // AES-256-GCM encrypted
  encryptedConnectionString: text("encrypted_connection_string").notNull(), // AES-256-GCM encrypted
  host: text("host").notNull(),
  port: integer("port").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
});

export const insertTenantConnectionSchema = createInsertSchema(tenantConnections).omit({
  createdAt: true,
});

export type TenantConnection = typeof tenantConnections.$inferSelect;
export type InsertTenantConnection = z.infer<typeof insertTenantConnectionSchema>;

// 🟢 TENANT DB: Customers table
// MIGRATION: Will move to tenantSchema.ts (shopId and userId removed)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  zipCode: text("zip_code"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Jeder Kunde gehört zu einem Benutzer/Unternehmen
  userId: integer("user_id").references(() => users.id),
  // Jeder Kunde gehört zu einem Shop (für Multi-Tenant-Isolation)
  shopId: integer("shop_id").default(1),
  // Audit-Trail: Wer hat den Kunden erstellt (Mitarbeiter-System)
  createdBy: text("created_by"), // Speichert Benutzername oder "KIOSK-MODUS"
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

// Device types enum
export const deviceTypes = z.enum(["smartphone", "tablet", "laptop"]);

// Repair statuses enum
export const repairStatuses = z.enum(["eingegangen", "in_reparatur", "ersatzteile_bestellen", "warten_auf_ersatzteile", "ersatzteil_eingetroffen", "fertig", "abgeholt", "ausser_haus"]);

// 🔵🟢 SPLIT: Error catalog table (Fehlerkatalog)
// MIGRATION: Global catalogs → masterSchema.ts, Shop-specific → tenantSchema.ts
export const errorCatalogEntries = pgTable("error_catalog_entries", {
  id: serial("id").primaryKey(),
  errorText: text("error_text").notNull(),
  forSmartphone: boolean("for_smartphone").default(false),
  forTablet: boolean("for_tablet").default(false),
  forLaptop: boolean("for_laptop").default(false),
  forSmartwatch: boolean("for_smartwatch").default(false),
  forGameconsole: boolean("for_gameconsole").default(false), // Für Spielekonsole
  shopId: integer("shop_id").default(1682), // Default ist die superadmin shopId
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertErrorCatalogEntrySchema = createInsertSchema(errorCatalogEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 🟢 TENANT DB: Legacy device issues (wird später entfernt)
// MIGRATION: Will move to tenantSchema.ts for compatibility
export const deviceIssues = pgTable("device_issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Fehlerbeschreibung"),
  description: text("description").notNull(),
  deviceType: text("device_type"),
  solution: text("solution"),
  severity: text("severity").default("medium"),
  isCommon: boolean("is_common").default(false),
  isGlobal: boolean("is_global").default(true),
  userId: integer("user_id"),
  shopId: integer("shop_id").default(1682), // Default ist die superadmin shopId
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeviceIssueSchema = createInsertSchema(deviceIssues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DeviceIssue = typeof deviceIssues.$inferSelect;
export type InsertDeviceIssue = z.infer<typeof insertDeviceIssueSchema>;

export type ErrorCatalogEntry = typeof errorCatalogEntries.$inferSelect;
export type InsertErrorCatalogEntry = z.infer<typeof insertErrorCatalogEntrySchema>;

// Activity Log System für MSA - zentrale Tabelle für alle wichtigen Events
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  // Event-Kategorisierung
  eventType: text("event_type").notNull(), // 'repair', 'order', 'user', 'admin', 'customer', 'system'
  action: text("action").notNull(), // 'created', 'updated', 'deleted', 'status_changed', 'login', 'logout', etc.
  
  // Betroffene Entität
  entityType: text("entity_type"), // 'repair', 'order', 'user', 'customer', 'shop', etc.
  entityId: integer("entity_id"), // ID der betroffenen Entität
  entityName: text("entity_name"), // Name/Bezeichnung für bessere Lesbarkeit
  
  // Wer hat die Aktion ausgeführt
  performedBy: integer("performed_by").references(() => users.id),
  performedByUsername: text("performed_by_username"), // Für bessere Performance bei Anzeige
  performedByRole: text("performed_by_role"), // 'admin', 'owner', 'employee', 'msa', 'system'
  
  // Shop-Kontext
  shopId: integer("shop_id").references(() => shops.id),
  shopName: text("shop_name"), // Für Performance
  
  // Event-Details
  description: text("description").notNull(), // Menschenlesbare Beschreibung
  details: jsonb("details"), // Zusätzliche strukturierte Daten (old_value, new_value, etc.)
  
  // Metadaten
  ipAddress: text("ip_address"), // Für Sicherheits-Audit
  userAgent: text("user_agent"), // Browser/System-Info
  severity: text("severity").default("info"), // 'low', 'info', 'warning', 'high', 'critical'
  
  // Zeitstempel
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// 🟢 TENANT DB: Repair orders table
// MIGRATION: Will move to tenantSchema.ts (shopId and userId removed)
export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").unique(), // Neue Spalte für das spezielle Auftragsnummerformat: z.B. AS1496
  customerId: integer("customer_id").references(() => customers.id),
  deviceType: text("device_type").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number"),
  issue: text("issue").notNull(),
  estimatedCost: text("estimated_cost"),
  depositAmount: text("deposit_amount"),
  status: text("status").notNull().default("eingegangen"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Zeitpunkt der letzten Statusänderung (wichtig für Umsatzberechnungen)
  statusUpdatedAt: timestamp("status_updated_at"),
  // Jede Reparatur gehört zu einem Benutzer/Unternehmen
  userId: integer("user_id").references(() => users.id),
  // Jede Reparatur gehört zu einem Shop (für Multi-Tenant-Isolation)
  shopId: integer("shop_id").default(1),
  // Audit-Trail: Wer hat die Reparatur erstellt (Mitarbeiter-System)
  createdBy: text("created_by"), // Speichert Benutzername oder "KIOSK-MODUS"
  // Speichert, ob bereits eine Bewertungsanfrage gesendet wurde
  reviewRequestSent: boolean("review_request_sent").default(false),
  
  // Für die monatliche Limitierung der Reparaturen im Basic-Paket
  // Format: YYYYMM (z.B. 202505 für Mai 2025)
  creationMonth: text("creation_month"),
  
  // Unterschrift bei Abgabe des Geräts
  dropoffSignature: text("dropoff_signature"),      // Digitale Unterschrift als Base64-kodiertes Bild (Abgabe)
  dropoffSignedAt: timestamp("dropoff_signed_at"),  // Datum/Uhrzeit der Unterschrift bei Abgabe
  
  // Unterschrift bei Abholung des Geräts
  pickupSignature: text("pickup_signature"),        // Digitale Unterschrift als Base64-kodiertes Bild (Abholung)
  pickupSignedAt: timestamp("pickup_signed_at"),    // Datum/Uhrzeit der Unterschrift bei Abholung
  
  // Techniker-Information für "Ausser Haus" Status
  technicianNote: text("technician_note"),         // Notiz mit Techniker-Information und Zeitstempel
  
  // Gerätecode-Funktionalität für 2-Schritt Unterschriftsprozess
  deviceCode: text("device_code"),                 // Verschlüsselter Gerätecode (PIN oder Pattern-Hash)
  deviceCodeType: text("device_code_type"),        // "text", "pattern", oder null wenn übersprungen
  
  // Leihgeräte-System
  loanerDeviceId: integer("loaner_device_id").references(() => loanerDevices.id), // Verknüpfung zum zugewiesenen Leihgerät
  
  // Alte Felder, für Abwärtskompatibilität beibehalten - nur in Drizzle definiert
  // customerSignature: text("customer_signature"),
  // signedAt: timestamp("signed_at"),
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  orderCode: true, // Wird automatisch generiert
  createdAt: true,
  updatedAt: true,
});

// Types for schema
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Repair = typeof repairs.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;

// Define the user schema as it's required by the template
// Paket-Tabelle (packages) für das neue Paket-System
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  priceMonthly: doublePrecision("price_monthly").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Paket-Features-Tabelle (package_features) für die Zuordnung von Features zu Paketen
export const packageFeatures = pgTable("package_features", {
  packageId: integer("package_id").notNull().references(() => packages.id),
  feature: text("feature").notNull(),
  value: text("value") // Wert für das Feature (z.B. '10' für maxRepairs=10)
});

// Schemas für die Pakete
export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true
});

export const insertPackageFeatureSchema = createInsertSchema(packageFeatures);

// Types
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

export type PackageFeature = typeof packageFeatures.$inferSelect;
export type InsertPackageFeature = z.infer<typeof insertPackageFeatureSchema>;

// Für Legacy-Unterstützung beibehalten wir diese temporär:
// Preispakete als enum für bessere Typsicherheit
export const pricingPlans = [
  "basic",
  "professional", 
  "enterprise"
] as const;

export type PricingPlan = typeof pricingPlans[number];

// 🔵 MASTER DB: Central user authentication and management
// MIGRATION: Will move to masterSchema.ts (core authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username"), // Nullable: nur Shop-Owner haben Benutzernamen, Mitarbeiter nicht
  password: text("password").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(false).notNull(), // Benutzer muss vom Admin freigeschaltet werden

  isSuperadmin: boolean("is_superadmin").default(false).notNull(), // Superadmin-Rechte (kann alle Shops verwalten)
  isMultiShopAdmin: boolean("is_multi_shop_admin").default(false).notNull(), // Multi-Shop Admin-Rechte (kann mehrere Shops verwalten)
  canAssignMultiShopAdmins: boolean("can_assign_multi_shop_admins").default(false).notNull(), // Shop-Owner kann Multi-Shop-Admins zuweisen (von Superadmin freigeschaltet)
  
  // Mitarbeiter-System
  role: text("role").default("owner").notNull(), // "owner", "employee", oder "kiosk"
  parentUserId: integer("parent_user_id"), // NULL für Shop-Owner, User-ID des Shop-Besitzers für Mitarbeiter - Referenz wird später hinzugefügt
  permissions: jsonb("permissions"), // Granulare Berechtigungen für Mitarbeiter
  firstName: text("first_name"), // Vorname für bessere Identifikation
  lastName: text("last_name"), // Nachname für bessere Identifikation
  // Für Abwärtskompatibilität während der Migration
  pricingPlan: text("pricing_plan").default("basic"),      // Wird ersetzt durch packageId
  featureOverrides: jsonb("feature_overrides"),            // Individuelle Feature-Freischaltungen (wird auslaufen)
  // Neu: Fremdschlüssel-Referenz zu einem Paket
  packageId: integer("package_id").references(() => packages.id),
  shopId: integer("shop_id").references(() => shops.id),  // FK to shops.id (database entity ID)
  tenantShopId: integer("tenant_shop_id"),                 // Immutable sequential ID for tenant isolation (users.shop_id → users.tenant_shop_id)
  companyName: text("company_name"),                       // Firmenname
  companyAddress: text("company_address"),                 // Firmenadresse
  companyVatNumber: text("company_vat_number"),            // USt-IdNr.
  companyPhone: text("company_phone"),                     // Geschäftstelefon
  companyEmail: text("company_email"),                     // Geschäfts-E-Mail
  // Zusätzliche Registrierungsfelder
  ownerFirstName: text("owner_first_name"),                // Vorname des Geschäftsinhabers
  ownerLastName: text("owner_last_name"),                  // Nachname des Geschäftsinhabers
  streetAddress: text("street_address"),                   // Straße und Hausnummer
  zipCode: text("zip_code"),                              // Postleitzahl
  city: text("city"),                                     // Stadt
  country: text("country"),                               // Land
  taxId: text("tax_id"),                                  // UID/Steuernummer
  website: text("website"),                               // Website
  resetToken: text("reset_token"),                         // Token für Passwort-Zurücksetzung
  resetTokenExpires: timestamp("reset_token_expires"),     // Ablaufzeit des Reset-Tokens
  trialExpiresAt: timestamp("trial_expires_at"),           // Ablaufdatum des Demo-Zugangs (nur für Demo-Paket)
  lastLoginAt: timestamp("last_login_at"),                 // Zeitpunkt der letzten Anmeldung
  lastLogoutAt: timestamp("last_logout_at"),               // Zeitpunkt der letzten Abmeldung
  // 2FA-Unterstützung (nur für Admins/Superadmins)
  twoFaEmailEnabled: boolean("two_fa_email_enabled").default(false),
  twoFaTotpEnabled: boolean("two_fa_totp_enabled").default(false),
  twoFaSecret: text("two_fa_secret"),                       // TOTP Secret für Google Authenticator
  backupCodes: text("backup_codes").array(),               // Recovery Codes
  email2FaCode: text("email_2fa_code"),                    // Aktueller Email-2FA-Code
  email2FaExpires: timestamp("email_2fa_expires"),         // Ablaufzeit des Email-Codes
  // Newsletter-Abonnement (standardmäßig aktiviert für Owner und Multi-Shop-Admins)
  newsletterSubscribed: boolean("newsletter_subscribed").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // GDPR-Compliant soft deletion
  deletedAt: timestamp("deleted_at"), // When set, user is anonymized and hidden from all lists
  createdBy: integer("created_by").references(() => users.id), // Track who created this user
  // Tenant database provisioning status
  tenantProvisioned: boolean("tenant_provisioned").default(false).notNull(), // Whether tenant database has been created
  tenantProvisionedAt: timestamp("tenant_provisioned_at"), // When tenant database was provisioned

});

// Erweiterte Registrierungsdaten für das vollständige Geschäftsprofil
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  shopId: true,  // Include shopId for registration
  companyName: true,
  companyAddress: true,
  companyVatNumber: true,
  companyPhone: true,
  companyEmail: true,
}).extend({
  // Zusätzliche Felder für die Registrierung
  ownerFirstName: z.string().min(1, "Vorname ist erforderlich"),
  ownerLastName: z.string().min(1, "Nachname ist erforderlich"),
  streetAddress: z.string().min(1, "Straße und Hausnummer sind erforderlich"),
  zipCode: z.string().min(1, "Postleitzahl ist erforderlich"),
  city: z.string().min(1, "Stadt ist erforderlich"),
  country: z.string().optional(),
  taxId: z.string().min(1, "UID/Steuernummer ist erforderlich"),
  website: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// 🔵 MASTER DB: Multi-Shop-Berechtigung Tabelle
// MIGRATION: Will move to masterSchema.ts (cross-tenant access control)
export const userShopAccess = pgTable("user_shop_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  accessLevel: text("access_level").default("admin").notNull(), // 'read', 'admin', 'owner'
  grantedBy: integer("granted_by").notNull().references(() => users.id), // Superadmin der das vergeben hat
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => ({
  uniqueUserShop: primaryKey({ columns: [table.userId, table.shopId] })
}));

export const insertUserShopAccessSchema = createInsertSchema(userShopAccess).omit({
  id: true,
  grantedAt: true,
});

export type UserShopAccess = typeof userShopAccess.$inferSelect;
export type InsertUserShopAccess = z.infer<typeof insertUserShopAccessSchema>;

// Multi-Shop Permissions - Shop-Owner Zustimmung für Multi-Shop Admin Zugriff
export const multiShopPermissions = pgTable("multi_shop_permissions", {
  id: serial("id").primaryKey(),
  multiShopAdminId: integer("multi_shop_admin_id").references(() => users.id).notNull(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  shopOwnerId: integer("shop_owner_id").references(() => users.id).notNull(),
  granted: boolean("granted").default(false).notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMultiShopPermissionSchema = createInsertSchema(multiShopPermissions).omit({
  id: true,
  createdAt: true,
});

export type MultiShopPermission = typeof multiShopPermissions.$inferSelect;
export type InsertMultiShopPermission = z.infer<typeof insertMultiShopPermissionSchema>;

// MSA Profile Tabelle für Multi-Shop Admin Geschäftsdaten
export const msaProfiles = pgTable("msa_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  // Persönliche Daten
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  // Geschäftsdaten für Rechnungsstellung
  businessData: jsonb("business_data"), // JSON mit allen Geschäftsdaten
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMSAProfileSchema = createInsertSchema(msaProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MSAProfile = typeof msaProfiles.$inferSelect;
export type InsertMSAProfile = z.infer<typeof insertMSAProfileSchema>;

// Geschäftsdaten Schema für die JSON-Struktur
export const businessDataSchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  contactPerson: z.string().min(1, "Ansprechpartner ist erforderlich"),
  street: z.string().min(1, "Straße ist erforderlich"),
  city: z.string().min(1, "Stadt ist erforderlich"),
  zipCode: z.string().min(1, "PLZ ist erforderlich"),
  country: z.string().min(1, "Land ist erforderlich"),
  vatNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  email: z.string().email("Gültige E-Mail erforderlich"),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
});

export type BusinessData = z.infer<typeof businessDataSchema>;

// MSA Pricing Tabelle für individuelle Preisgestaltung
export const msaPricing = pgTable("msa_pricing", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  pricePerShop: doublePrecision("price_per_shop").default(29.90).notNull(), // Preis pro Shop
  currency: text("currency").default("EUR").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(), // monthly, quarterly, yearly
  discountPercent: doublePrecision("discount_percent").default(0),
  notes: text("notes"), // Zusätzliche Preisnotizen
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMSAPricingSchema = createInsertSchema(msaPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MSAPricing = typeof msaPricing.$inferSelect;
export type InsertMSAPricing = z.infer<typeof insertMSAPricingSchema>;

// 🟢 TENANT DB: Unternehmensdaten / Geschäftsinformationen
// MIGRATION: Will move to tenantSchema.ts (shopId and userId removed)
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerFirstName: text("owner_first_name").notNull(),
  ownerLastName: text("owner_last_name").notNull(),
  taxId: text("tax_id"), // ATU Nummer
  vatNumber: text("vat_number"), // USt-IdNr. (EU VAT Number)
  companySlogan: text("company_slogan"), // Firmenlaut (Unternehmensslogan)
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").default("Österreich").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoImage: text("logo_image"), // Base64-encoded image data für das Logo
  colorTheme: text("color_theme").default("blue").notNull(), // Farbpalette (blue, green, purple, red, orange)
  receiptWidth: text("receipt_width").default("80mm").notNull(), // Bonbreite: 58mm oder 80mm
  
  // E-Mail-SMTP-Einstellungen für den eigenen Mail-Server
  smtpSenderName: text("smtp_sender_name"), // Bei den Mails anzuzeigender Name
  smtpHost: text("smtp_host"),             // SMTP Host (z.B. smtp.example.com)
  smtpUser: text("smtp_user"),             // SMTP Benutzername
  smtpPassword: text("smtp_password"),     // SMTP Passwort
  smtpPort: text("smtp_port"),             // SMTP Port (z.B. 587)
  
  // Link für Kundenbewertungen
  reviewLink: text("review_link"),         // Link für Bewertungen (z.B. Google, Facebook, Yelp)
  
  // Öffnungszeiten des Geschäfts - werden in E-Mail-Vorlagen verwendet
  openingHours: text("opening_hours"),     // Öffnungszeiten (z.B. "Mo-Fr 9:00-18:00, Sa 9:00-13:00")
  
  // Kiosk-Modus PIN für Tablet-Aktivierung
  kioskPin: text("kiosk_pin").default("1234"),
  
  // Reparaturbedingungen für Kiosk-Unterschrift
  repairTerms: text("repair_terms"),
  
  // Maximale Anzahl Mitarbeiter pro Shop (Standard: 2)
  maxEmployees: integer("max_employees").default(2).notNull(),
  
  // Etikett-Druck-Einstellungen
  labelFormat: text("label_format").default("portrait").notNull(), // portrait, landscape, landscape_large
  labelWidth: integer("label_width").default(32), // Etikett-Breite in mm (Standard: 32mm)
  labelHeight: integer("label_height").default(57), // Etikett-Höhe in mm (Standard: 57mm)
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Jede Geschäftseinstellung gehört zu einem bestimmten Benutzer
  userId: integer("user_id").references(() => users.id),
  // Jede Geschäftseinstellung gehört zu einem Shop (für Multi-Tenant-Isolation)
  shopId: integer("shop_id").default(1),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  updatedAt: true,
});

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

// Kundenfeedback Tabelle
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  repairId: integer("repair_id").notNull().references(() => repairs.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  rating: integer("rating").notNull(), // 1-5 Sterne
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  feedbackToken: text("feedback_token").notNull().unique(), // Einmaliger Token für Feedback-Link
  shopId: integer("shop_id").default(1), // Shop, zu dem das Feedback gehört (für Multi-Tenant-Isolation)
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Tabelle für die Superadmin-E-Mail-Einstellungen (globale E-Mail-Einstellungen)
export const superadminEmailSettings = pgTable("superadmin_email_settings", {
  id: serial("id").primaryKey(),
  smtpSenderName: text("smtp_sender_name").default("Handyshop Verwaltung").notNull(), // Bei den Mails anzuzeigender Name
  smtpSenderEmail: text("smtp_sender_email").default("noreply@phonerepair.at").notNull(), // Absender-E-Mail-Adresse
  smtpHost: text("smtp_host").notNull(),        // SMTP Host (z.B. smtp.example.com)
  smtpUser: text("smtp_user").notNull(),        // SMTP Benutzername
  smtpPassword: text("smtp_password").notNull(), // SMTP Passwort
  smtpPort: integer("smtp_port").default(587).notNull(), // SMTP Port (z.B. 587)
  isActive: boolean("is_active").default(true).notNull(), // Ob diese Einstellungen aktiv sind
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSuperadminEmailSettingsSchema = createInsertSchema(superadminEmailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SuperadminEmailSettings = typeof superadminEmailSettings.$inferSelect;
export type InsertSuperadminEmailSettings = z.infer<typeof insertSuperadminEmailSettingsSchema>;

// E-Mail-Vorlagen für Kundenkommunikation
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  variables: text("variables").array(),  // Liste von Variablen, die in der Vorlage verwendet werden können
  userId: integer("user_id"), // Benutzer, dem die Vorlage gehört
  shopId: integer("shop_id").default(1), // Shop, zu dem die Vorlage gehört (für Multi-Tenant-Isolation)
  type: text("type"), // Typ der Vorlage: 'app' (System) oder 'customer' (Kunde)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// SMS-Vorlagen wurden auf Kundenwunsch entfernt

// E-Mail-Verlauf für Reparaturen
export const emailHistory = pgTable("email_history", {
  id: serial("id").primaryKey(),
  repairId: integer("repairId").notNull().references(() => repairs.id),
  emailTemplateId: integer("emailTemplateId").references(() => emailTemplates.id),
  subject: text("subject").notNull(),
  recipient: text("recipient").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  status: text("status").notNull(), // "success" oder "failed"
  userId: integer("userId").references(() => users.id),
  shopId: integer("shop_id").default(1), // Shop, zu dem der E-Mail-Verlauf gehört (für Multi-Tenant-Isolation)
});

export const insertEmailHistorySchema = createInsertSchema(emailHistory).omit({
  id: true,
  sentAt: true,
});

export type EmailHistory = typeof emailHistory.$inferSelect;
export type InsertEmailHistory = z.infer<typeof insertEmailHistorySchema>;

// Status History - Tabelle für die Nachverfolgung von Statusänderungen
export const repairStatusHistory = pgTable("repair_status_history", {
  id: serial("id").primaryKey(),
  repairId: integer("repair_id").notNull().references(() => repairs.id),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changedBy: text("changed_by"), // Benutzername der Person, die die Änderung vorgenommen hat 
  notes: text("notes"),
  userId: integer("user_id").references(() => users.id),
  shopId: integer("shop_id").default(1),
});

export const insertRepairStatusHistorySchema = createInsertSchema(repairStatusHistory).omit({
  id: true,
  changedAt: true,
});

export type RepairStatusHistory = typeof repairStatusHistory.$inferSelect;
export type InsertRepairStatusHistory = z.infer<typeof insertRepairStatusHistorySchema>;

// Kostenvoranschläge
export const costEstimates = pgTable("cost_estimates", {
  id: serial("id").primaryKey(),
  reference_number: text("reference_number").unique(), // Individuelle Kostenvoranschlagsnummer
  customerId: integer("customer_id").notNull().references(() => customers.id),
  deviceType: text("device_type").notNull(),
  brand: text("brand").notNull(), // Hersteller (früher manufacturer)
  model: text("model").notNull(),
  issue: text("issue").notNull(),
  notes: text("notes"),
  title: text("title"),
  description: text("description"),
  serial_number: text("serial_number"),
  status: text("status").default("offen").notNull(), // offen, angenommen, abgelehnt
  convertedToRepair: boolean("converted_to_repair").default(false), // Wurde in Reparaturauftrag umgewandelt
  validUntil: timestamp("valid_until"), // Gültig bis
  subtotal: text("subtotal"),
  tax_rate: text("tax_rate"),
  tax_amount: text("tax_amount"),
  total: text("total"),
  // Positionen werden direkt als JSONB gespeichert
  items: jsonb("items").default('[]'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Jeder Kostenvoranschlag gehört zu einem Benutzer/Unternehmen
  userId: integer("user_id").references(() => users.id),
  // Jeder Kostenvoranschlag gehört zu einem Shop (für Multi-Tenant-Isolation)
  shopId: integer("shop_id").default(1),
});

// Hinweis: Die separate cost_estimate_items-Tabelle wird nicht mehr verwendet
// Stattdessen werden die Items direkt im 'items'-JSONB-Feld der cost_estimates-Tabelle gespeichert

// Schemas für Kostenvoranschläge
export const insertCostEstimateSchema = createInsertSchema(costEstimates).omit({
  id: true,
  reference_number: true, // Wird automatisch generiert
  createdAt: true,
  updatedAt: true,
}).extend({
  // Keine zusätzlichen Validierungen nötig
});

// Types für Kostenvoranschläge
export type CostEstimate = typeof costEstimates.$inferSelect;
export type InsertCostEstimate = z.infer<typeof insertCostEstimateSchema>;

// Typ für die Items im JSONB-Feld (nicht mehr aus costEstimateItems abgeleitet)
export type CostEstimateItem = {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

// Der InsertCostEstimateItem-Typ wird immer noch für die API-Validierung verwendet
export type InsertCostEstimateItem = CostEstimateItem;
// Keine InsertCostEstimateItem mehr nötig, da wir die Items direkt im JSONB speichern

// Beziehungen definieren
export const userShopAccessRelations = relations(userShopAccess, ({ one }) => ({
  user: one(users, {
    fields: [userShopAccess.userId],
    references: [users.id],
  }),
  shop: one(shops, {
    fields: [userShopAccess.shopId],
    references: [shops.id],
  }),
  grantedByUser: one(users, {
    fields: [userShopAccess.grantedBy],
    references: [users.id],
  }),
}));



// Beziehungen definieren - emailHistory zu repairs und emailTemplates
export const emailHistoryRelations = relations(emailHistory, ({ one }) => ({
  repair: one(repairs, {
    fields: [emailHistory.repairId],
    references: [repairs.id],
  }),
  emailTemplate: one(emailTemplates, {
    fields: [emailHistory.emailTemplateId],
    references: [emailTemplates.id],
  }),
  user: one(users, {
    fields: [emailHistory.userId],
    references: [users.id],
  }),
}));

// Beziehungen für repairs zu emailHistory, spareParts, statusHistory, customer, user und loanerDevice
export const repairsRelations = relations(repairs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [repairs.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [repairs.userId],
    references: [users.id],
  }),
  loanerDevice: one(loanerDevices, {
    fields: [repairs.loanerDeviceId],
    references: [loanerDevices.id],
  }),
  emailHistory: many(emailHistory),
  spareParts: many(spareParts),
  statusHistory: many(repairStatusHistory),
}));

// Beziehungen für repairStatusHistory
export const repairStatusHistoryRelations = relations(repairStatusHistory, ({ one }) => ({
  repair: one(repairs, {
    fields: [repairStatusHistory.repairId],
    references: [repairs.id],
  }),
  changedByUser: one(users, {
    fields: [repairStatusHistory.changedBy],
    references: [users.id],
  }),
}));

// Beziehungen zwischen Benutzer und Paket definieren
// Beziehungen für Kostenvoranschläge
export const costEstimatesRelations = relations(costEstimates, ({ one }) => ({
  customer: one(customers, {
    fields: [costEstimates.customerId],
    references: [customers.id],
  })
}));

export const userRelations = relations(users, ({ one, many }) => ({
  package: one(packages, {
    fields: [users.packageId],
    references: [packages.id],
  }),
  shop: one(shops, {
    fields: [users.shopId],
    references: [shops.id],
  }),
  shopAccess: many(userShopAccess),
}));

// Beziehungen für shops
export const shopRelations = relations(shops, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  repairs: many(repairs),
  userAccess: many(userShopAccess),
}));

// Tabelle für gelöschte Standard-Gerätetypen
export const hiddenStandardDeviceTypes = pgTable("hidden_standard_device_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Name des gelöschten Standardtyps (z.B. "smartphone")
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHiddenStandardDeviceTypeSchema = createInsertSchema(hiddenStandardDeviceTypes).omit({
  id: true,
  createdAt: true,
});

export type HiddenStandardDeviceType = typeof hiddenStandardDeviceTypes.$inferSelect;
export type InsertHiddenStandardDeviceType = z.infer<typeof insertHiddenStandardDeviceTypeSchema>;

// Benutzerspezifische Gerätearten
export const userDeviceTypes = pgTable("user_device_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id), // Jede Geräteart gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem die Geräteart gehört (für Multi-Tenant-Isolation)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Fehlerkatalog wurde entfernt

// Beziehungen definieren - userDeviceTypes zu userBrands
export const userDeviceTypesRelations = relations(userDeviceTypes, ({ one, many }) => ({
  user: one(users, {
    fields: [userDeviceTypes.userId],
    references: [users.id],
  }),
  brands: many(userBrands),
}));

export const insertUserDeviceTypeSchema = createInsertSchema(userDeviceTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type UserDeviceType = typeof userDeviceTypes.$inferSelect;
export type InsertUserDeviceType = z.infer<typeof insertUserDeviceTypeSchema>;

// Benutzerspezifische Marken
export const userBrands = pgTable("user_brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  deviceTypeId: integer("device_type_id").notNull().references(() => userDeviceTypes.id), // Jede Marke gehört zu einer Geräteart
  userId: integer("user_id").notNull().references(() => users.id), // Jede Marke gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem die Marke gehört (für Multi-Tenant-Isolation)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Beziehungen definieren - userBrands zu userDeviceTypes, users und userModels
export const userBrandsRelations = relations(userBrands, ({ one, many }) => ({
  deviceType: one(userDeviceTypes, {
    fields: [userBrands.deviceTypeId],
    references: [userDeviceTypes.id],
  }),
  user: one(users, {
    fields: [userBrands.userId],
    references: [users.id],
  }),
  models: many(userModels),
}));

export const insertUserBrandSchema = createInsertSchema(userBrands).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type UserBrand = typeof userBrands.$inferSelect;
export type InsertUserBrand = z.infer<typeof insertUserBrandSchema>;

// Benutzerspezifische Modellreihen
export const userModelSeries = pgTable("user_model_series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brandId: integer("brand_id").notNull().references(() => userBrands.id), // Jede Modellreihe gehört zu einer Marke
  userId: integer("user_id").notNull().references(() => users.id), // Jede Modellreihe gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem die Modellreihe gehört (für Multi-Tenant-Isolation)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Beziehungen definieren - userModelSeries zu userBrands und users
export const userModelSeriesRelations = relations(userModelSeries, ({ one, many }) => ({
  brand: one(userBrands, {
    fields: [userModelSeries.brandId],
    references: [userBrands.id],
  }),
  user: one(users, {
    fields: [userModelSeries.userId],
    references: [users.id],
  }),
  models: many(userModels)
}));

export const insertUserModelSeriesSchema = createInsertSchema(userModelSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type UserModelSeries = typeof userModelSeries.$inferSelect;
export type InsertUserModelSeries = z.infer<typeof insertUserModelSeriesSchema>;

// Benutzerspezifische Modelle
export const userModels = pgTable("user_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modelSeriesId: integer("model_series_id").references(() => userModelSeries.id), // Optional: Modell kann zu einer Modellreihe gehören
  brandId: integer("brand_id").references(() => userBrands.id), // Neues Feld: Modell gehört zu einer Marke
  userId: integer("user_id").notNull().references(() => users.id), // Jedes Modell gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem das Modell gehört (für Multi-Tenant-Isolation)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Beziehungen definieren - userModels zu userModelSeries, userBrands und users
export const userModelsRelations = relations(userModels, ({ one }) => ({
  modelSeries: one(userModelSeries, {
    fields: [userModels.modelSeriesId],
    references: [userModelSeries.id],
  }),
  brand: one(userBrands, {
    fields: [userModels.brandId],
    references: [userBrands.id],
  }),
  user: one(users, {
    fields: [userModels.userId],
    references: [users.id],
  })
}));

export const insertUserModelSchema = createInsertSchema(userModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type UserModel = typeof userModels.$inferSelect;
export type InsertUserModel = z.infer<typeof insertUserModelSchema>;

// Kostenvoranschläge wurden entfernt und werden später neu implementiert

// Druckvorlagen
export const printTemplates = pgTable('print_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // receipt_58mm, receipt_80mm, invoice_a4, label
  content: text('content').notNull(),
  variables: text('variables').array(),
  userId: integer('user_id'),
  shopId: integer('shop_id').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertPrintTemplateSchema = createInsertSchema(printTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type PrintTemplate = typeof printTemplates.$inferSelect;
export type InsertPrintTemplate = z.infer<typeof insertPrintTemplateSchema>;

// Support-Zugriffsprotokolle für DSGVO-konforme Shop-Isolation
export const supportAccessLogs = pgTable("support_access_logs", {
  id: serial("id").primaryKey(),
  superadminId: integer("superadmin_id").notNull().references(() => users.id),
  shopId: integer("shop_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, denied, revoked, expired
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
  responding_user_id: integer("responding_user_id").references(() => users.id),
});

export const insertSupportAccessLogSchema = createInsertSchema(supportAccessLogs).omit({
  id: true,
  requestedAt: true,
});

export type SupportAccessLog = typeof supportAccessLogs.$inferSelect;
export type InsertSupportAccessLog = z.infer<typeof insertSupportAccessLogSchema>;

// Temporäre Unterschriftentabelle für QR-Code-Workflow
export const tempSignatures = pgTable("temp_signatures", {
  id: serial("id").primaryKey(),
  tempId: text("temp_id").notNull().unique(), // UUID für QR-Code
  repairData: jsonb("repair_data").notNull(), // Gespeicherte Reparaturdaten
  customerSignature: text("customer_signature"), // Base64 Unterschrift
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Ablauf nach 24h
  userId: integer("user_id").notNull().references(() => users.id),
  shopId: integer("shop_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, signed, completed, expired
});

export const insertTempSignatureSchema = createInsertSchema(tempSignatures).omit({
  id: true,
  createdAt: true,
});

export type TempSignature = typeof tempSignatures.$inferSelect;
export type InsertTempSignature = z.infer<typeof insertTempSignatureSchema>;

// Ersatzteile für Reparaturen
export const sparePartStatuses = z.enum(["bestellen", "bestellt", "eingetroffen", "erledigt"]);

export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  repairId: integer("repair_id").notNull().references(() => repairs.id, { onDelete: 'cascade' }),
  partName: text("part_name").notNull(),
  supplier: text("supplier"), // Lieferant
  cost: doublePrecision("cost"), // Kosten
  status: text("status").notNull().default("bestellen"), // bestellen, bestellt, eingetroffen
  orderDate: timestamp("order_date"), // Bestelldatum
  deliveryDate: timestamp("delivery_date"), // Lieferdatum
  notes: text("notes"), // Notizen
  archived: boolean("archived").notNull().default(false), // Archiviert wenn Status "eingetroffen" oder "erledigt"
  userId: integer("user_id").notNull().references(() => users.id),
  shopId: integer("shop_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSparePartSchema = createInsertSchema(spareParts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: sparePartStatuses.optional(),
  cost: z.number().optional(),
  orderDate: z.date().optional(),
  deliveryDate: z.date().optional(),
});

export type SparePart = typeof spareParts.$inferSelect;
export type InsertSparePart = z.infer<typeof insertSparePartSchema>;

// Beziehungen für Ersatzteile
export const sparePartsRelations = relations(spareParts, ({ one }) => ({
  repair: one(repairs, {
    fields: [spareParts.repairId],
    references: [repairs.id],
  }),
  user: one(users, {
    fields: [spareParts.userId],
    references: [users.id],
  }),
}));

// Zubehör-Tabelle - separate Verwaltung von Zubehör-Bestellungen
export const accessories = pgTable("accessories", {
  id: serial("id").primaryKey(),
  
  // Artikel-Informationen
  articleName: text("article_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: text("unit_price").notNull(), // Preis pro Stück
  totalPrice: text("total_price").notNull(), // Gesamtpreis
  downPayment: text("down_payment"), // Anzahlung (optional)
  
  // Kunden-Informationen (optional für Lager-Artikel)
  customerId: integer("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  
  // Typ: "lager" für Lager-Artikel, "kundenbestellung" für Kundenbestellungen
  type: text("type").notNull().default("kundenbestellung"),
  
  // Status der Bestellung
  status: text("status").notNull().default("bestellen"),
  
  // Notizen
  notes: text("notes"),
  
  // Archivierung für erledigte Zubehör-Artikel
  archived: boolean("archived").notNull().default(false),
  
  // E-Mail Status für "eingetroffen" Benachrichtigung
  emailSent: boolean("email_sent").notNull().default(false),
  
  // Zugehörigkeit zu Benutzer und Shop
  userId: integer("user_id").references(() => users.id),
  shopId: integer("shop_id").default(1),
  
  // Zeitstempel
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAccessorySchema = createInsertSchema(accessories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Accessory = typeof accessories.$inferSelect;
export type InsertAccessory = z.infer<typeof insertAccessorySchema>;

export const accessoriesRelations = relations(accessories, ({ one }) => ({
  customer: one(customers, {
    fields: [accessories.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [accessories.userId],
    references: [users.id],
  }),
}));

// Leihgeräte - Tabelle für das Leihgeräte-Management
export const loanerDeviceStatuses = z.enum(["verfügbar", "verliehen", "defekt", "wartung"]);

export const loanerDevices = pgTable("loaner_devices", {
  id: serial("id").primaryKey(),
  deviceType: text("device_type").notNull(), // z.B. "smartphone", "tablet", "laptop" 
  brand: text("brand").notNull(), // Hersteller z.B. "Apple", "Samsung"
  model: text("model").notNull(), // Modell z.B. "iPhone 12", "Galaxy S21"
  imei: text("imei"), // IMEI-Nummer (optional)
  condition: text("condition").notNull(), // Zustand z.B. "neu", "gebraucht", "beschädigt"
  status: text("status").notNull().default("verfügbar"), // verfügbar, verliehen, defekt, wartung
  notes: text("notes"), // Notizen zum Gerät
  
  // Shop-Zugehörigkeit für DSGVO-Isolation
  userId: integer("user_id").notNull().references(() => users.id),
  shopId: integer("shop_id").notNull().default(1),
  
  // Zeitstempel
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLoanerDeviceSchema = createInsertSchema(loanerDevices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: loanerDeviceStatuses.optional(),
});

export type LoanerDevice = typeof loanerDevices.$inferSelect;
export type InsertLoanerDevice = z.infer<typeof insertLoanerDeviceSchema>;

// Beziehungen zwischen Leihgeräten und Reparaturen
export const loanerDevicesRelations = relations(loanerDevices, ({ one, many }) => ({
  user: one(users, {
    fields: [loanerDevices.userId],
    references: [users.id],
  }),
  repairs: many(repairs), // Ein Leihgerät kann für mehrere Reparaturen verwendet werden (nacheinander)
}));

// Password Reset Tokens - Sichere Token-basierte Passwort-Zurücksetzung
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  // Multi-tenant isolation
  shopId: integer("shop_id").references(() => shops.id),
  userId: integer("user_id").notNull().references(() => users.id),
  
  // Token-Sicherheit: Nur gehashte Tokens in DB speichern
  tokenHash: text("token_hash").notNull().unique(), // HMAC-SHA256 Hash des Tokens
  
  // Zeitbasierte Sicherheit
  expiresAt: timestamp("expires_at").notNull(), // 15 Minuten TTL
  usedAt: timestamp("used_at"), // NULL = nicht verwendet, Timestamp = verwendet
  
  // Audit Trail
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: text("ip_address"), // IP-Adresse für Sicherheitsanalyse
  userAgent: text("user_agent"), // User-Agent für Anomalieerkennung
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Relations für Password Reset Tokens
export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
  shop: one(shops, {
    fields: [passwordResetTokens.shopId],
    references: [shops.id],
  }),
}));

// Newsletter system - Für Superadmin-Newsletter an Shop-Owner und Multi-Shop-Admins
export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(), // HTML-Content für E-Mail
  logoNewsletter: text("logo_newsletter"), // Pfad zum Newsletter-Logo (z.B. für Weihnachten, Ostern, etc.)
  createdBy: integer("created_by").notNull().references(() => users.id), // Superadmin der erstellt hat
  status: text("status").default("draft").notNull(), // 'draft', 'sent'
  // Statistiken
  totalRecipients: integer("total_recipients").default(0).notNull(),
  successfulSends: integer("successful_sends").default(0).notNull(),
  failedSends: integer("failed_sends").default(0).notNull(),
  // Zeitstempel
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"), // NULL wenn noch nicht versendet
});

// Newsletter Logos table for logo management
export const newsletterLogos = pgTable("newsletter_logos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // User-friendly name like "Weihnachts-Logo", "Oster-Logo"
  filename: text("filename").notNull(), // Original filename
  filepath: text("filepath").notNull(), // Object storage path
  isActive: boolean("is_active").default(false).notNull(), // Only one can be active at a time
  createdBy: integer("created_by").notNull().references(() => users.id), // Superadmin who uploaded it
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  totalRecipients: true,
  successfulSends: true,
  failedSends: true,
});

export const insertNewsletterLogoSchema = createInsertSchema(newsletterLogos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;

export type NewsletterLogo = typeof newsletterLogos.$inferSelect;
export type InsertNewsletterLogo = z.infer<typeof insertNewsletterLogoSchema>;

// Newsletter Sends - Tracking einzelner Newsletter-Versände
export const newsletterSends = pgTable("newsletter_sends", {
  id: serial("id").primaryKey(),
  newsletterId: integer("newsletter_id").notNull().references(() => newsletters.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  recipientEmail: text("recipient_email").notNull(), // Backup für E-Mail-Adresse
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed', 'unsubscribed'
  errorMessage: text("error_message"), // Bei Fehlern
  sentAt: timestamp("sent_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  isTest: boolean("is_test").default(false), // Markiert Test-Newsletter-Versände
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNewsletterSendSchema = createInsertSchema(newsletterSends).omit({
  id: true,
  createdAt: true,
});

export type NewsletterSend = typeof newsletterSends.$inferSelect;
export type InsertNewsletterSend = z.infer<typeof insertNewsletterSendSchema>;

// Relations für Newsletter System
export const newslettersRelations = relations(newsletters, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [newsletters.createdBy],
    references: [users.id],
  }),
  sends: many(newsletterSends),
}));

export const newsletterSendsRelations = relations(newsletterSends, ({ one }) => ({
  newsletter: one(newsletters, {
    fields: [newsletterSends.newsletterId],
    references: [newsletters.id],
  }),
  recipient: one(users, {
    fields: [newsletterSends.recipientId],
    references: [users.id],
  }),
}));

export const migrationRuns = pgTable("migration_runs", {
  id: integer("id").notNull(), // keep as plain integer to match existing table (no serial/identity)
  runType: text("run_type").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: false }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  error: text("error"),
  metadata: jsonb("metadata").$type<unknown>(),
});

export const migrationState = pgTable("migration_state", {
  tenantShopId: integer("tenant_shop_id").notNull(),
  tableName: text("table_name").notNull(),
  lastSyncedPk: integer("last_synced_pk"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: false }),
  rowsProcessed: integer("rows_processed").default(0).notNull(),
  status: text("status").notNull(),
  error: text("error"),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});