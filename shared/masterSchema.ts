import { pgSchema, pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// MASTER DATABASE SCHEMA - Cross-tenant tables
// =============================================================================
// This schema contains tables that need to be shared across all tenants:
// - User authentication and authorization
// - Shop registry and metadata  
// - Multi-shop group management
// - Subscription packages and billing
// - Global catalogs and system settings
// - Newsletter and communication systems
// =============================================================================

// Shops registry - Core shop metadata
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // New fields for enhanced shop metadata
  domain: text("domain"), // Optional custom domain
  status: text("status").default("active").notNull(), // active, suspended, terminated
  subscriptionStatus: text("subscription_status").default("trial").notNull(), // trial, active, overdue, suspended
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertShopSchema = createInsertSchema(shops).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;

// Multi-shop groups - New table for multi-location owners
export const multiShopGroups = pgTable("multi_shop_groups", {
  id: serial("id").primaryKey(),
  groupName: text("group_name").notNull(), // e.g., "Schmidt Electronics Chain"
  ownerUserId: integer("owner_user_id").notNull(), // The primary owner
  description: text("description"),
  // Shared settings across the group
  sharedErrorCatalog: boolean("shared_error_catalog").default(true).notNull(),
  centralizedBilling: boolean("centralized_billing").default(false).notNull(),
  // Group-wide preferences
  groupSettings: jsonb("group_settings"), // Flexible JSON for group preferences
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Multi-shop group memberships - Links shops to groups
export const multiShopGroupMemberships = pgTable("multi_shop_group_memberships", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => multiShopGroups.id, { onDelete: 'cascade' }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: 'cascade' }),
  role: text("role").default("member").notNull(), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => ({
  uniqueGroupShop: uniqueIndex("unique_group_shop").on(table.groupId, table.shopId)
}));

// Subscription packages
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  priceMonthly: doublePrecision("price_monthly").notNull(),
  isActive: boolean("is_active").default(true).notNull(), // Can disable packages
  sortOrder: integer("sort_order").default(0).notNull(), // For display ordering
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Package features
export const packageFeatures = pgTable("package_features", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").notNull().references(() => packages.id, { onDelete: 'cascade' }),
  feature: text("feature").notNull(),
  value: text("value") // Feature value (e.g. '10' for maxRepairs=10)
}, (table) => ({
  uniquePackageFeature: uniqueIndex("unique_package_feature").on(table.packageId, table.feature)
}));

// Users - Central authentication and user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username"), // Nullable: only shop owners have usernames
  password: text("password").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  
  // Authorization levels
  isSuperadmin: boolean("is_superadmin").default(false).notNull(),
  isMultiShopAdmin: boolean("is_multi_shop_admin").default(false).notNull(),
  canAssignMultiShopAdmins: boolean("can_assign_multi_shop_admins").default(false).notNull(),
  
  // User hierarchy for employees (references will be set up later)
  role: text("role").default("owner").notNull(), // owner, employee, kiosk
  parentUserId: integer("parent_user_id"), // NULL for owners, User ID of shop owner for employees
  permissions: jsonb("permissions"), // Granular permissions for employees
  
  // Personal information
  firstName: text("first_name"),
  lastName: text("last_name"),
  
  // Business information (for shop owners)
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyVatNumber: text("company_vat_number"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  ownerFirstName: text("owner_first_name"),
  ownerLastName: text("owner_last_name"),
  streetAddress: text("street_address"),
  zipCode: text("zip_code"),
  city: text("city"),
  country: text("country"),
  taxId: text("tax_id"),
  website: text("website"),
  
  // Subscription information
  packageId: integer("package_id").references(() => packages.id),
  pricingPlan: text("pricing_plan").default("basic"), // Legacy field for migration
  featureOverrides: jsonb("feature_overrides"), // Individual feature overrides
  
  // Primary shop association (users can access multiple shops via userShopAccess)
  primaryShopId: integer("primary_shop_id").references(() => shops.id),
  
  // Security and session management
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  trialExpiresAt: timestamp("trial_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  lastLogoutAt: timestamp("last_logout_at"),
  
  // 2FA support
  twoFaEmailEnabled: boolean("two_fa_email_enabled").default(false),
  twoFaTotpEnabled: boolean("two_fa_totp_enabled").default(false),
  twoFaSecret: text("two_fa_secret"),
  backupCodes: text("backup_codes").array(),
  email2FaCode: text("email_2fa_code"),
  email2FaExpires: timestamp("email_2fa_expires"),
  
  // Newsletter subscription
  newsletterSubscribed: boolean("newsletter_subscribed").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User shop access - Multi-shop permissions
export const userShopAccess = pgTable("user_shop_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: 'cascade' }),
  accessLevel: text("access_level").default("admin").notNull(), // read, admin, owner
  grantedBy: integer("granted_by").notNull().references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => ({
  uniqueUserShop: uniqueIndex("unique_user_shop").on(table.userId, table.shopId)
}));

// Multi-shop permissions - Shop owner consent for multi-shop admin access
export const multiShopPermissions = pgTable("multi_shop_permissions", {
  id: serial("id").primaryKey(),
  multiShopAdminId: integer("multi_shop_admin_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  shopId: integer("shop_id").references(() => shops.id, { onDelete: 'cascade' }).notNull(),
  shopOwnerId: integer("shop_owner_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  granted: boolean("granted").default(false).notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MSA profiles - Multi-shop admin business data
export const msaProfiles = pgTable("msa_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  businessData: jsonb("business_data"), // JSON with all business data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// MSA pricing - Individual pricing for multi-shop admins
export const msaPricing = pgTable("msa_pricing", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  pricePerShop: doublePrecision("price_per_shop").default(29.90).notNull(),
  currency: text("currency").default("EUR").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(),
  discountPercent: doublePrecision("discount_percent").default(0),
  notes: text("notes"),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Global error catalog entries - Shared across shops when shopId is superadmin default
export const globalErrorCatalogEntries = pgTable("global_error_catalog_entries", {
  id: serial("id").primaryKey(),
  errorText: text("error_text").notNull(),
  forSmartphone: boolean("for_smartphone").default(false),
  forTablet: boolean("for_tablet").default(false),
  forLaptop: boolean("for_laptop").default(false),
  forSmartwatch: boolean("for_smartwatch").default(false),
  forGameconsole: boolean("for_gameconsole").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Global email settings - Superadmin email configuration
export const superadminEmailSettings = pgTable("superadmin_email_settings", {
  id: serial("id").primaryKey(),
  smtpSenderName: text("smtp_sender_name"),
  smtpHost: text("smtp_host"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpPort: text("smtp_port"),
  smtpTls: boolean("smtp_tls").default(true),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Password reset tokens - Centralized password reset management
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  shopId: integer("shop_id").references(() => shops.id, { onDelete: 'cascade' }), // Can be null for superadmin resets
  tokenHash: text("token_hash").notNull().unique(), // HMAC-SHA256 hash
  expiresAt: timestamp("expires_at").notNull(), // 15 minutes TTL
  usedAt: timestamp("used_at"), // NULL = unused
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Newsletter system - System-wide newsletters
export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  logoNewsletter: text("logo_newsletter"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  status: text("status").default("draft").notNull(), // draft, sent
  totalRecipients: integer("total_recipients").default(0).notNull(),
  successfulSends: integer("successful_sends").default(0).notNull(),
  failedSends: integer("failed_sends").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

// Newsletter logos
export const newsletterLogos = pgTable("newsletter_logos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Newsletter sends tracking
export const newsletterSends = pgTable("newsletter_sends", {
  id: serial("id").primaryKey(),
  newsletterId: integer("newsletter_id").notNull().references(() => newsletters.id, { onDelete: 'cascade' }),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  recipientEmail: text("recipient_email").notNull(),
  status: text("status").default("pending").notNull(), // pending, sent, failed, unsubscribed
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  isTest: boolean("is_test").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// SCHEMAS AND TYPES
// =============================================================================

// // Shop schemas
// export const insertShopSchema = createInsertSchema(shops).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// export type Shop = typeof shops.$inferSelect;
// export type InsertShop = z.infer<typeof insertShopSchema>;

// Multi-shop group schemas
export const insertMultiShopGroupSchema = createInsertSchema(multiShopGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMultiShopGroupMembershipSchema = createInsertSchema(multiShopGroupMemberships).omit({
  id: true,
  joinedAt: true,
});

export type MultiShopGroup = typeof multiShopGroups.$inferSelect;
export type InsertMultiShopGroup = z.infer<typeof insertMultiShopGroupSchema>;
export type MultiShopGroupMembership = typeof multiShopGroupMemberships.$inferSelect;
export type InsertMultiShopGroupMembership = z.infer<typeof insertMultiShopGroupMembershipSchema>;

// Package schemas
export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true
});

export const insertPackageFeatureSchema = createInsertSchema(packageFeatures);

export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type PackageFeature = typeof packageFeatures.$inferSelect;
export type InsertPackageFeature = z.infer<typeof insertPackageFeatureSchema>;

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  companyName: true,
  companyAddress: true,
  companyVatNumber: true,
  companyPhone: true,
  companyEmail: true,
}).extend({
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

// Multi-shop access schemas
export const insertUserShopAccessSchema = createInsertSchema(userShopAccess).omit({
  id: true,
  grantedAt: true,
});

export type UserShopAccess = typeof userShopAccess.$inferSelect;
export type InsertUserShopAccess = z.infer<typeof insertUserShopAccessSchema>;

// Multi-shop permission schemas
export const insertMultiShopPermissionSchema = createInsertSchema(multiShopPermissions).omit({
  id: true,
  createdAt: true,
});

export type MultiShopPermission = typeof multiShopPermissions.$inferSelect;
export type InsertMultiShopPermission = z.infer<typeof insertMultiShopPermissionSchema>;

// MSA profile schemas
export const insertMSAProfileSchema = createInsertSchema(msaProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MSAProfile = typeof msaProfiles.$inferSelect;
export type InsertMSAProfile = z.infer<typeof insertMSAProfileSchema>;

// Business data schema for MSA profiles
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

// MSA pricing schemas
export const insertMSAPricingSchema = createInsertSchema(msaPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MSAPricing = typeof msaPricing.$inferSelect;
export type InsertMSAPricing = z.infer<typeof insertMSAPricingSchema>;

// Global error catalog schemas
export const insertGlobalErrorCatalogEntrySchema = createInsertSchema(globalErrorCatalogEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GlobalErrorCatalogEntry = typeof globalErrorCatalogEntries.$inferSelect;
export type InsertGlobalErrorCatalogEntry = z.infer<typeof insertGlobalErrorCatalogEntrySchema>;

// Password reset token schemas
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Newsletter schemas
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

export const insertNewsletterSendSchema = createInsertSchema(newsletterSends).omit({
  id: true,
  createdAt: true,
});

export type Newsletter = typeof newsletters.$inferSelect;
export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type NewsletterLogo = typeof newsletterLogos.$inferSelect;
export type InsertNewsletterLogo = z.infer<typeof insertNewsletterLogoSchema>;
export type NewsletterSend = typeof newsletterSends.$inferSelect;
export type InsertNewsletterSend = z.infer<typeof insertNewsletterSendSchema>;

// =============================================================================
// RELATIONS
// =============================================================================

// Multi-shop group relations
export const multiShopGroupsRelations = relations(multiShopGroups, ({ one, many }) => ({
  owner: one(users, {
    fields: [multiShopGroups.ownerUserId],
    references: [users.id],
  }),
  memberships: many(multiShopGroupMemberships),
}));

export const multiShopGroupMembershipsRelations = relations(multiShopGroupMemberships, ({ one }) => ({
  group: one(multiShopGroups, {
    fields: [multiShopGroupMemberships.groupId],
    references: [multiShopGroups.id],
  }),
  shop: one(shops, {
    fields: [multiShopGroupMemberships.shopId],
    references: [shops.id],
  }),
}));

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  parentUser: one(users, {
    fields: [users.parentUserId],
    references: [users.id],
  }),
  primaryShop: one(shops, {
    fields: [users.primaryShopId],
    references: [shops.id],
  }),
  package: one(packages, {
    fields: [users.packageId],
    references: [packages.id],
  }),
  shopAccess: many(userShopAccess),
  msaProfile: one(msaProfiles),
  msaPricing: one(msaPricing),
}));

// Shop relations
export const shopsRelations = relations(shops, ({ many }) => ({
  userAccess: many(userShopAccess),
  groupMemberships: many(multiShopGroupMemberships),
}));

// Package relations
export const packagesRelations = relations(packages, ({ many }) => ({
  features: many(packageFeatures),
  users: many(users),
}));

export const packageFeaturesRelations = relations(packageFeatures, ({ one }) => ({
  package: one(packages, {
    fields: [packageFeatures.packageId],
    references: [packages.id],
  }),
}));

// User shop access relations
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

// Multi-shop permissions relations
export const multiShopPermissionsRelations = relations(multiShopPermissions, ({ one }) => ({
  multiShopAdmin: one(users, {
    fields: [multiShopPermissions.multiShopAdminId],
    references: [users.id],
  }),
  shop: one(shops, {
    fields: [multiShopPermissions.shopId],
    references: [shops.id],
  }),
  shopOwner: one(users, {
    fields: [multiShopPermissions.shopOwnerId],
    references: [users.id],
  }),
}));

// MSA profile relations
export const msaProfilesRelations = relations(msaProfiles, ({ one }) => ({
  user: one(users, {
    fields: [msaProfiles.userId],
    references: [users.id],
  }),
}));

// MSA pricing relations
export const msaPricingRelations = relations(msaPricing, ({ one }) => ({
  user: one(users, {
    fields: [msaPricing.userId],
    references: [users.id],
  }),
}));

// Password reset token relations
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

// Newsletter relations
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

// =============================================================================
// LEGACY COMPATIBILITY TYPES
// =============================================================================

// For legacy compatibility during migration
export const pricingPlans = [
  "basic",
  "professional", 
  "enterprise"
] as const;

export type PricingPlan = typeof pricingPlans[number];

// 🔵🟢 SPLIT: Error catalog table (Fehlerkatalog)
// MIGRATION: Global catalogs → masterSchema.ts, Shop-specific → tenantSchema.ts

//const publicSchema = pgSchema('public');

// --- MASTER: shops -----------------------------------------------------------
// export const shops = publicSchema.table('shops', {
//   id: serial('id').primaryKey(),
//   name: text('name').notNull(),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   updatedAt: timestamp('updated_at').defaultNow().notNull(),
// });

// --- MASTER: tenant_connections (no cross-DB FK!) ----------------------------
export const tenantConnections = pgTable('tenant_connections', {
  shopId: integer('shop_id').primaryKey(),           // do NOT references(() => shops.id) if shops may be in a different DB during migration
  databaseName: text('database_name').notNull(),
  username: text('username').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  encryptedConnectionString: text('encrypted_connection_string').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsed: timestamp('last_used').defaultNow().notNull(),
});

export const insertTenantConnectionSchema = createInsertSchema(tenantConnections).omit({
  createdAt: true,
});
export type TenantConnection = typeof tenantConnections.$inferSelect;
export type InsertTenantConnection = z.infer<typeof insertTenantConnectionSchema>;

// --- MASTER: migration tables (match your CREATE TABLE exactly) --------------
export const migrationRuns = pgTable('migration_runs', {
  id: integer('id').notNull(), // keep as plain integer, no serial
  runType: text('run_type').notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: false }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: false }),
  error: text('error'),
  metadata: jsonb('metadata'),
});

export const migrationState = pgTable('migration_state', {
  tenantShopId: integer('tenant_shop_id').notNull(),
  tableName: text('table_name').notNull(),
  lastSyncedPk: integer('last_synced_pk'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: false }),
  rowsProcessed: integer('rows_processed').default(0).notNull(),
  status: text('status').notNull(),
  error: text('error'),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});


