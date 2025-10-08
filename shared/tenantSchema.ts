import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// TENANT DATABASE SCHEMA - Shop-specific operational data
// =============================================================================
// This schema contains tables that are specific to each individual shop:
// - Customer data and relationships
// - Repair orders and tracking
// - Business settings and preferences
// - Operational data (spare parts, loaner devices, etc.)
// - Shop-specific catalogs and templates
// - Activity logs and communication history
//
// NOTE: shopId fields are removed since each tenant DB serves one shop
// =============================================================================

// Customers - Shop-specific customer database
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
  // Audit trail: who created the customer
  createdBy: text("created_by"), // Username or "KIOSK-MODUS"
  // Note: userId removed - will be handled at connection level
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Device types and repair statuses
export const deviceTypes = z.enum(["smartphone", "tablet", "laptop"]);
export const repairStatuses = z.enum(["eingegangen", "in_reparatur", "ersatzteile_bestellen", "warten_auf_ersatzteile", "ersatzteil_eingetroffen", "fertig", "abgeholt", "ausser_haus"]);

// Repair orders - Shop-specific repair tracking
export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").unique(), // Special order number format: e.g. AS1496
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
  statusUpdatedAt: timestamp("status_updated_at"), // For revenue calculations
  createdBy: text("created_by"), // Username or "KIOSK-MODUS"
  reviewRequestSent: boolean("review_request_sent").default(false),
  
  // For monthly limits in basic package
  creationMonth: text("creation_month"), // Format: YYYYMM (e.g. 202505)
  
  // Digital signatures
  dropoffSignature: text("dropoff_signature"), // Base64 image at device drop-off
  dropoffSignedAt: timestamp("dropoff_signed_at"),
  pickupSignature: text("pickup_signature"), // Base64 image at device pickup
  pickupSignedAt: timestamp("pickup_signed_at"),
  
  // Technician information for "Ausser Haus" status
  technicianNote: text("technician_note"),
  
  // Device code functionality for 2-step signature process
  deviceCode: text("device_code"), // Encrypted device code (PIN or pattern hash)
  deviceCodeType: text("device_code_type"), // "text", "pattern", or null if skipped
  
  // Loaner device assignment
  loanerDeviceId: integer("loaner_device_id").references(() => loanerDevices.id),
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  orderCode: true, // Auto-generated
  createdAt: true,
  updatedAt: true,
});

export type Repair = typeof repairs.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;

// Business settings - Shop-specific business configuration
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerFirstName: text("owner_first_name").notNull(),
  ownerLastName: text("owner_last_name").notNull(),
  taxId: text("tax_id"), // ATU number
  vatNumber: text("vat_number"), // VAT number
  companySlogan: text("company_slogan"), // Company slogan
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").default("Österreich").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoImage: text("logo_image"), // Base64-encoded image
  colorTheme: text("color_theme").default("blue").notNull(), // Color palette
  receiptWidth: text("receipt_width").default("80mm").notNull(), // Receipt width: 58mm or 80mm
  
  // Email SMTP settings for own mail server
  smtpSenderName: text("smtp_sender_name"),
  smtpHost: text("smtp_host"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpPort: text("smtp_port"),
  
  // Customer review link
  reviewLink: text("review_link"), // Link for reviews (Google, Facebook, Yelp)
  
  // Business opening hours
  openingHours: text("opening_hours"), // Opening hours for email templates
  
  // Kiosk mode PIN for tablet activation
  kioskPin: text("kiosk_pin").default("1234"),
  
  // Repair terms for kiosk signature
  repairTerms: text("repair_terms"),
  
  // Maximum employees per shop
  maxEmployees: integer("max_employees").default(2).notNull(),
  
  // Label printing settings
  labelFormat: text("label_format").default("portrait").notNull(), // portrait, landscape, landscape_large
  labelWidth: integer("label_width").default(32), // Label width in mm
  labelHeight: integer("label_height").default(57), // Label height in mm
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  updatedAt: true,
});

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

// Customer feedback - Shop-specific customer feedback
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  repairId: integer("repair_id").notNull().references(() => repairs.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  feedbackToken: text("feedback_token").notNull().unique(), // Unique token for feedback link
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Shop-specific error catalog entries
export const errorCatalogEntries = pgTable("error_catalog_entries", {
  id: serial("id").primaryKey(),
  errorText: text("error_text").notNull(),
  forSmartphone: boolean("for_smartphone").default(false),
  forTablet: boolean("for_tablet").default(false),
  forLaptop: boolean("for_laptop").default(false),
  forSmartwatch: boolean("for_smartwatch").default(false),
  forGameconsole: boolean("for_gameconsole").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertErrorCatalogEntrySchema = createInsertSchema(errorCatalogEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ErrorCatalogEntry = typeof errorCatalogEntries.$inferSelect;
export type InsertErrorCatalogEntry = z.infer<typeof insertErrorCatalogEntrySchema>;

// Legacy device issues (will be removed later)
export const deviceIssues = pgTable("device_issues", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Fehlerbeschreibung"),
  description: text("description").notNull(),
  deviceType: text("device_type"),
  solution: text("solution"),
  severity: text("severity").default("medium"),
  isCommon: boolean("is_common").default(false),
  isGlobal: boolean("is_global").default(true),
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

// Activity logs - Shop-specific activity tracking
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'repair', 'order', 'user', 'admin', 'customer', 'system'
  action: text("action").notNull(), // 'created', 'updated', 'deleted', 'status_changed', etc.
  
  entityType: text("entity_type"), // 'repair', 'order', 'user', 'customer', etc.
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  
  performedByUsername: text("performed_by_username"), // For performance
  performedByRole: text("performed_by_role"), // 'admin', 'owner', 'employee', 'system'
  
  description: text("description").notNull(), // Human-readable description
  details: jsonb("details"), // Additional structured data
  
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: text("severity").default("info"), // 'low', 'info', 'warning', 'high', 'critical'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Temporary signatures for signature process
export const tempSignatures = pgTable("temp_signatures", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  signatureType: text("signature_type").notNull(), // 'customer_dropoff', 'customer_pickup'
  signatureData: text("signature_data").notNull(), // Base64 signature image
  repairId: integer("repair_id"), // Optional repair association
  deviceInfo: jsonb("device_info"), // Device information as JSON
  customerInfo: jsonb("customer_info"), // Customer information as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Signature expires after some time
});

export const insertTempSignatureSchema = createInsertSchema(tempSignatures).omit({
  id: true,
  createdAt: true,
});

export type TempSignature = typeof tempSignatures.$inferSelect;
export type InsertTempSignature = z.infer<typeof insertTempSignatureSchema>;

// Spare parts for repairs
export const sparePartStatuses = z.enum(["bestellen", "bestellt", "eingetroffen", "erledigt"]);

export const spareParts = pgTable("spare_parts", {
  id: serial("id").primaryKey(),
  repairId: integer("repair_id").notNull().references(() => repairs.id, { onDelete: 'cascade' }),
  partName: text("part_name").notNull(),
  supplier: text("supplier"),
  cost: doublePrecision("cost"),
  status: text("status").notNull().default("bestellen"), // bestellen, bestellt, eingetroffen
  orderDate: timestamp("order_date"),
  deliveryDate: timestamp("delivery_date"),
  notes: text("notes"),
  archived: boolean("archived").notNull().default(false), // Archived when status is delivered/completed
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

// Accessories - Separate management of accessory orders
export const accessories = pgTable("accessories", {
  id: serial("id").primaryKey(),
  
  // Product information
  articleName: text("article_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: text("unit_price").notNull(), // Price per unit
  totalPrice: text("total_price").notNull(), // Total price
  downPayment: text("down_payment"), // Down payment (optional)
  
  // Customer information (optional for stock items)
  customerId: integer("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  
  // Type: "lager" for stock items, "kundenbestellung" for customer orders
  type: text("type").notNull().default("kundenbestellung"),
  
  // Order status
  status: text("status").notNull().default("bestellen"),
  
  // Notes
  notes: text("notes"),
  
  // Archive for completed accessory items
  archived: boolean("archived").notNull().default(false),
  
  // Email status for "arrived" notification
  emailSent: boolean("email_sent").notNull().default(false),
  
  // Timestamps
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

// Loaner devices - Loaner device management
export const loanerDeviceStatuses = z.enum(["verfügbar", "verliehen", "defekt", "wartung"]);

export const loanerDevices = pgTable("loaner_devices", {
  id: serial("id").primaryKey(),
  deviceType: text("device_type").notNull(), // e.g. "smartphone", "tablet", "laptop"
  brand: text("brand").notNull(), // Manufacturer e.g. "Apple", "Samsung"
  model: text("model").notNull(), // Model e.g. "iPhone 12", "Galaxy S21"
  imei: text("imei"), // IMEI number (optional)
  condition: text("condition").notNull(), // Condition e.g. "new", "used", "damaged"
  status: text("status").notNull().default("verfügbar"), // available, lent, broken, maintenance
  notes: text("notes"), // Device notes
  
  // Timestamps
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

// Email history - Shop-specific email logs
export const emailHistory = pgTable("email_history", {
  id: serial("id").primaryKey(),
  status: text("status").notNull(),
  subject: text("subject").notNull(),
  repairId: integer("repair_id").notNull().references(() => repairs.id),
  recipient: text("recipient").notNull(),
  emailTemplateId: integer("email_template_id"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertEmailHistorySchema = createInsertSchema(emailHistory).omit({
  id: true,
  sentAt: true,
});

export type EmailHistory = typeof emailHistory.$inferSelect;
export type InsertEmailHistory = z.infer<typeof insertEmailHistorySchema>;

// Email templates - Shop-specific email templates
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  variables: text("variables").array(), // Available variables for template
  isActive: boolean("is_active").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // System templates vs custom
  category: text("category"), // categorization for organization
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// Cost estimates - Shop-specific cost estimates
export const costEstimates = pgTable("cost_estimates", {
  id: serial("id").primaryKey(),
  reference_number: text("reference_number"),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  deviceType: text("device_type").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  issue: text("issue").notNull(),
  description: text("description"),
  laborCost: text("labor_cost").notNull(),
  partsCost: text("parts_cost").notNull(),
  totalCost: text("total_cost").notNull(),
  validUntil: timestamp("valid_until"),
  status: text("status").default("draft").notNull(), // draft, sent, accepted, rejected, expired
  notes: text("notes"),
  items: jsonb("items"), // Detailed breakdown of costs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCostEstimateSchema = createInsertSchema(costEstimates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CostEstimate = typeof costEstimates.$inferSelect;
export type InsertCostEstimate = z.infer<typeof insertCostEstimateSchema>;

// Orders - Shop-specific orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  type: text("type").notNull(), // Type of order
  status: text("status").notNull(),
  notes: text("notes"),
  articleName: text("article_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  totalPrice: text("total_price").notNull(),
  downPayment: text("down_payment"),
  archived: boolean("archived").notNull().default(false),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Support access logs - Shop-specific support access
export const supportAccessLogs = pgTable("support_access_logs", {
  id: serial("id").primaryKey(),
  supportUserId: integer("support_user_id").notNull(), // MSA or superadmin user ID (from master DB)
  supportUserEmail: text("support_user_email").notNull(),
  accessReason: text("access_reason").notNull(),
  accessStartedAt: timestamp("access_started_at").defaultNow().notNull(),
  accessEndedAt: timestamp("access_ended_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  respondingUserId: integer("responding_user_id"), // Shop owner/employee who responded
});

export const insertSupportAccessLogSchema = createInsertSchema(supportAccessLogs).omit({
  id: true,
  accessStartedAt: true,
});

export type SupportAccessLog = typeof supportAccessLogs.$inferSelect;
export type InsertSupportAccessLog = z.infer<typeof insertSupportAccessLogSchema>;

// =============================================================================
// RELATIONS
// =============================================================================

// Customer relations
export const customersRelations = relations(customers, ({ many }) => ({
  repairs: many(repairs),
  feedbacks: many(feedbacks),
  accessories: many(accessories),
  costEstimates: many(costEstimates),
  orders: many(orders),
}));

// Repair relations
export const repairsRelations = relations(repairs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [repairs.customerId],
    references: [customers.id],
  }),
  loanerDevice: one(loanerDevices, {
    fields: [repairs.loanerDeviceId],
    references: [loanerDevices.id],
  }),
  spareParts: many(spareParts),
  feedbacks: many(feedbacks),
  emailHistory: many(emailHistory),
}));

// Feedback relations
export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  repair: one(repairs, {
    fields: [feedbacks.repairId],
    references: [repairs.id],
  }),
  customer: one(customers, {
    fields: [feedbacks.customerId],
    references: [customers.id],
  }),
}));

// Spare parts relations
export const sparePartsRelations = relations(spareParts, ({ one }) => ({
  repair: one(repairs, {
    fields: [spareParts.repairId],
    references: [repairs.id],
  }),
}));

// Accessories relations
export const accessoriesRelations = relations(accessories, ({ one }) => ({
  customer: one(customers, {
    fields: [accessories.customerId],
    references: [customers.id],
  }),
}));

// Loaner devices relations
export const loanerDevicesRelations = relations(loanerDevices, ({ many }) => ({
  repairs: many(repairs), // One loaner device can be used for multiple repairs (sequentially)
}));

// Email history relations
export const emailHistoryRelations = relations(emailHistory, ({ one }) => ({
  repair: one(repairs, {
    fields: [emailHistory.repairId],
    references: [repairs.id],
  }),
  emailTemplate: one(emailTemplates, {
    fields: [emailHistory.emailTemplateId],
    references: [emailTemplates.id],
  }),
}));

// Email templates relations
export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  emailHistory: many(emailHistory),
}));

// Cost estimates relations
export const costEstimatesRelations = relations(costEstimates, ({ one }) => ({
  customer: one(customers, {
    fields: [costEstimates.customerId],
    references: [customers.id],
  }),
}));

// Orders relations
export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));