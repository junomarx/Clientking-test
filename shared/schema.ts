import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customers table
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
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

// Device types enum - beibehalten für Abwärtskompatibilität
export const deviceTypeEnum = z.enum(["smartphone", "tablet", "laptop"]);

// Globale Gerätetypen-Tabelle für Superadmin
export const deviceTypes = pgTable("global_device_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isGlobal: boolean("is_global").default(true).notNull(),  // Immer true für globale Typen
  userId: integer("user_id").references(() => users.id),    // null für globale Typen
  shopId: integer("shop_id"),                              // null für globale Typen 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Globale Marken-Tabelle für Superadmin
export const deviceBrands = pgTable("global_device_brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  deviceType: text("device_type").notNull(),                // Referenz zum Gerätetyp (Name)
  isGlobal: boolean("is_global").default(true).notNull(),  // Immer true für globale Typen
  userId: integer("user_id").references(() => users.id),    // null für globale Typen
  shopId: integer("shop_id"),                              // null für globale Typen
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Globale Modell-Tabelle für Superadmin
export const deviceModels = pgTable("global_device_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),                          // Referenz zur Marke (Name)
  deviceType: text("device_type").notNull(),                // Referenz zum Gerätetyp (Name)
  isGlobal: boolean("is_global").default(true).notNull(),  // Immer true für globale Typen
  userId: integer("user_id").references(() => users.id),    // null für globale Typen
  shopId: integer("shop_id"),                              // null für globale Typen
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Repair statuses enum
export const repairStatuses = z.enum(["eingegangen", "in_reparatur", "ersatzteil_eingetroffen", "fertig", "abgeholt", "ausser_haus"]);

// Repair orders table
export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").unique(), // Neue Spalte für das spezielle Auftragsnummerformat: z.B. AS1496
  customerId: integer("customer_id").notNull().references(() => customers.id),
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
  // Zusammengesetzer Primary Key aus packageId und feature
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.packageId, table.feature] })
  };
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(false).notNull(), // Benutzer muss vom Admin freigeschaltet werden
  isAdmin: boolean("is_admin").default(false).notNull(),   // Administrator-Rechte
  isSuperadmin: boolean("is_superadmin").default(false).notNull(), // Superadmin-Rechte (kann alle Shops verwalten)
  // Für Abwärtskompatibilität während der Migration
  pricingPlan: text("pricing_plan").default("basic"),      // Wird ersetzt durch packageId
  featureOverrides: jsonb("feature_overrides"),            // Individuelle Feature-Freischaltungen (wird auslaufen)
  // Neu: Fremdschlüssel-Referenz zu einem Paket
  packageId: integer("package_id").references(() => packages.id),
  shopId: integer("shop_id"),                            // Shop-ID für Mandantentrennung (NULL für Superadmin)
  companyName: text("company_name"),                       // Firmenname
  companyAddress: text("company_address"),                 // Firmenadresse
  companyVatNumber: text("company_vat_number"),            // USt-IdNr.
  companyPhone: text("company_phone"),                     // Geschäftstelefon
  companyEmail: text("company_email"),                     // Geschäfts-E-Mail
  resetToken: text("reset_token"),                         // Token für Passwort-Zurücksetzung
  resetTokenExpires: timestamp("reset_token_expires"),     // Ablaufzeit des Reset-Tokens
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  companyName: true,
  companyAddress: true,
  companyVatNumber: true,
  companyPhone: true,
  companyEmail: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Unternehmensdaten / Geschäftsinformationen
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

// E-Mail-Vorlagen für Kundenkommunikation
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  variables: text("variables").array(),  // Liste von Variablen, die in der Vorlage verwendet werden können
  userId: integer("user_id"), // Benutzer, dem die Vorlage gehört
  shopId: integer("shop_id").default(1), // Shop, zu dem die Vorlage gehört (für Multi-Tenant-Isolation)
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
  repairId: integer("repair_id").notNull().references(() => repairs.id),
  emailTemplateId: integer("email_template_id").references(() => emailTemplates.id),
  subject: text("subject").notNull(),
  recipient: text("recipient").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  status: text("status").notNull(), // "success" oder "failed"
  userId: integer("user_id").references(() => users.id),
  shopId: integer("shop_id").default(1), // Shop, zu dem der E-Mail-Verlauf gehört (für Multi-Tenant-Isolation)
});

export const insertEmailHistorySchema = createInsertSchema(emailHistory).omit({
  id: true,
  sentAt: true,
});

export type EmailHistory = typeof emailHistory.$inferSelect;
export type InsertEmailHistory = z.infer<typeof insertEmailHistorySchema>;

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

// Beziehungen für repairs zu emailHistory
export const repairsRelations = relations(repairs, ({ many }) => ({
  emailHistory: many(emailHistory),
}));

// Beziehungen zwischen Benutzer und Paket definieren
export const userRelations = relations(users, ({ one }) => ({
  package: one(packages, {
    fields: [users.packageId],
    references: [packages.id],
  }),
}));

// Benutzerspezifische Gerätearten
export const userDeviceTypes = pgTable("user_device_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id), // Jede Geräteart gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem die Geräteart gehört (für Multi-Tenant-Isolation)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Fehlerbeschreibungen (DeviceIssues) - zentral verwaltet von Superadmin (früher: Admin/Bugi)
export const deviceIssues = pgTable("device_issues", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),      // Die Fehlerbeschreibung
  deviceType: text("device_type").notNull(),       // Für welche Geräteart ist die Fehlerbeschreibung
  isGlobal: boolean("is_global").default(true).notNull(),  // Immer true für globale Einträge
  userId: integer("user_id").references(() => users.id),    // null für globale Einträge
  shopId: integer("shop_id"),                              // null für globale Einträge
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

// Beziehungen definieren - userBrands zu userDeviceTypes und users
export const userBrandsRelations = relations(userBrands, ({ one }) => ({
  deviceType: one(userDeviceTypes, {
    fields: [userBrands.deviceTypeId],
    references: [userDeviceTypes.id],
  }),
  user: one(users, {
    fields: [userBrands.userId],
    references: [users.id],
  }),
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
  modelSeriesId: integer("model_series_id").notNull().references(() => userModelSeries.id), // Jedes Modell gehört zu einer Modellreihe
  userId: integer("user_id").notNull().references(() => users.id), // Jedes Modell gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem das Modell gehört (für Multi-Tenant-Isolation)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Beziehungen definieren - userModels zu userModelSeries und users
export const userModelsRelations = relations(userModels, ({ one }) => ({
  modelSeries: one(userModelSeries, {
    fields: [userModels.modelSeriesId],
    references: [userModelSeries.id],
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

// Kostenvoranschläge (Angebote)
export const costEstimates = pgTable("cost_estimates", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").unique(), // Eindeutige Angebotsnummer (z.B. KV2025-0001)
  customerId: integer("customer_id").notNull().references(() => customers.id),
  title: text("title").notNull(), // Titel des Kostenvoranschlags
  description: text("description"), // Beschreibung des Kostenvoranschlags
  deviceType: text("device_type").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number"),
  issue: text("issue"),
  items: jsonb("items").notNull(), // JSON Array von Posten (Position, Beschreibung, Menge, Preis)
  subtotal: text("subtotal").notNull(), // Zwischensumme (ohne MwSt)
  taxRate: text("tax_rate").default("20").notNull(), // MwSt-Satz in Prozent
  taxAmount: text("tax_amount").notNull(), // MwSt-Betrag
  total: text("total").notNull(), // Gesamtsumme (mit MwSt)
  validUntil: text("valid_until"), // Gültig bis (als ISO-String gespeichert)
  status: text("status").default("offen").notNull(), // Status: offen, angenommen, abgelehnt, abgelaufen
  notes: text("notes"), // Zusätzliche Notizen
  acceptedAt: timestamp("accepted_at"), // Wann wurde der Kostenvoranschlag angenommen
  convertedToRepair: boolean("converted_to_repair").default(false), // Wurde in Reparaturauftrag umgewandelt
  repairId: integer("repair_id").references(() => repairs.id), // Referenz auf den Reparaturauftrag, falls umgewandelt
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id), // Jeder Kostenvoranschlag gehört zu einem Benutzer
  shopId: integer("shop_id").default(1), // Shop, zu dem der Kostenvoranschlag gehört (für Multi-Tenant-Isolation)
});

// Zod-Schema für einen Kostenvoranschlag-Posten
export const costEstimateItemSchema = z.object({
  position: z.number(), // Positionsnummer
  description: z.string(), // Beschreibung des Postens
  quantity: z.number().default(1), // Menge
  unitPrice: z.string(), // Einzelpreis als String (mit €)
  totalPrice: z.string(), // Gesamtpreis als String (mit €)
});

// Wir erstellen das Schema manuell, um das Date-Objekt als String zu akzeptieren
export const insertCostEstimateSchema = z.object({
  customerId: z.number({
    required_error: "Kunde ist erforderlich",
  }),
  title: z.string().default("Kostenvoranschlag"),
  deviceType: z.string().min(1, "Gerätetyp ist erforderlich"),
  brand: z.string().min(1, "Marke ist erforderlich"),
  model: z.string().min(1, "Modell ist erforderlich"),
  serialNumber: z.string().optional(),
  issue: z.string().optional(),
  items: z.array(costEstimateItemSchema),
  subtotal: z.string().min(1, "Zwischensumme ist erforderlich"),
  taxRate: z.string().default("20"),
  taxAmount: z.string().min(1, "MwSt-Betrag ist erforderlich"),
  total: z.string().min(1, "Gesamtsumme ist erforderlich"),
  validUntil: z.string().optional(), // Akzeptiert ISO-String
  status: z.string().default("offen"),
  notes: z.string().optional(),
  repairId: z.number().optional(),
  convertedToRepair: z.boolean().optional(),
  userId: z.number().optional(),
});

export const insertCostEstimateItemsSchema = z.array(costEstimateItemSchema);

export type CostEstimate = typeof costEstimates.$inferSelect;
export type InsertCostEstimate = z.infer<typeof insertCostEstimateSchema>;
export type CostEstimateItem = z.infer<typeof costEstimateItemSchema>;
export type InsertCostEstimateItems = z.infer<typeof insertCostEstimateItemsSchema>;
