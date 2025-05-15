/**
 * Dieses Skript fügt die Tabelle für Support-Zugriffsprotokolle hinzu.
 * Diese Tabelle dient dazu, alle Support-Zugriffe durch Superadmins zu protokollieren
 * und ist eine wichtige Komponente für DSGVO-Konformität.
 */

import { db } from "./db";
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Schema für die Support-Zugriffsprotokolle
export const supportAccessLogs = pgTable("support_access_logs", {
  id: serial("id").primaryKey(),
  superadminId: integer("superadmin_id").notNull(),
  shopId: integer("shop_id").notNull(),
  reason: text("reason").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(true).notNull(),
  accessType: text("access_type").notNull(), // z.B. "repair_data", "customer_data", "all", etc.
  affectedEntities: text("affected_entities"), // IDs der betroffenen Entitäten, z.B. "repair:123,customer:456"
});

// Füge die Tabelle hinzu, wenn sie noch nicht existiert
export async function addSupportAccessTable() {
  try {
    console.log("Starte Migration: Hinzufügen der Tabelle für Support-Zugriffsprotokolle...");

    // Direktes Erstellen der Tabelle mit IF NOT EXISTS - keine vorherige Prüfung nötig

    // Erstelle die Tabelle
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_access_logs (
        id SERIAL PRIMARY KEY,
        superadmin_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        ended_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        access_type TEXT NOT NULL,
        affected_entities TEXT
      );
    `);

    console.log("Support-Zugriffsprotokolle-Tabelle erfolgreich erstellt.");
  } catch (error) {
    console.error("Fehler beim Erstellen der Support-Zugriffsprotokolle-Tabelle:", error);
  }
}