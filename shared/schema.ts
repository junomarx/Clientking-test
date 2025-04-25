import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

// Device types enum
export const deviceTypes = z.enum(["smartphone", "tablet", "laptop"]);

// Repair statuses enum
export const repairStatuses = z.enum(["eingegangen", "in_reparatur", "fertig", "abgeholt", "ausser_haus"]);

// Repair orders table
export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
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
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for schema
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Repair = typeof repairs.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;

// Define the user schema as it's required by the template
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
});

export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
