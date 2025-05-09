/**
 * Diese Migration erstellt die error_catalog_entries-Tabelle für den neuen Fehlerkatalog
 */
import { errorCatalogEntries } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addErrorCatalogEntriesTable() {
  console.log("Starte Migration: Hinzufügen der error_catalog_entries Tabelle...");

  try {
    // Prüfen, ob die Tabelle bereits existiert
    const tableExists = await doesTableExist("error_catalog_entries");
    
    if (tableExists) {
      console.log("Die error_catalog_entries-Tabelle existiert bereits.");
      return;
    }

    // Tabelle erstellen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS error_catalog_entries (
        id SERIAL PRIMARY KEY,
        error_text TEXT NOT NULL,
        for_smartphone BOOLEAN DEFAULT false,
        for_tablet BOOLEAN DEFAULT false,
        for_laptop BOOLEAN DEFAULT false,
        for_smartwatch BOOLEAN DEFAULT false,
        for_gameconsole BOOLEAN DEFAULT false,
        shop_id INTEGER DEFAULT 1682,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log("Die error_catalog_entries-Tabelle wurde erfolgreich erstellt.");
  } catch (error) {
    console.error("Fehler beim Erstellen der error_catalog_entries-Tabelle:", error);
    throw error;
  }
}

// Hilfsfunktion, um zu prüfen, ob eine Tabelle existiert
async function doesTableExist(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    )
  `);
  
  return result.rows[0].exists === 't' || result.rows[0].exists === true;
}