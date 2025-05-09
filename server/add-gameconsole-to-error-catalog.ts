/**
 * Diese Migration fügt die for_gameconsole-Spalte zur error_catalog_entries-Tabelle hinzu
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addGameconsoleToErrorCatalog() {
  console.log("Starte Migration: Hinzufügen der for_gameconsole-Spalte zur error_catalog_entries-Tabelle...");

  try {
    // Prüfen, ob die Spalte bereits existiert
    const columnExists = await doesColumnExist("error_catalog_entries", "for_gameconsole");
    
    if (columnExists) {
      console.log("Die for_gameconsole-Spalte existiert bereits.");
      return;
    }

    // Spalte hinzufügen
    await db.execute(sql`
      ALTER TABLE error_catalog_entries 
      ADD COLUMN for_gameconsole BOOLEAN DEFAULT false
    `);

    console.log("Die for_gameconsole-Spalte wurde erfolgreich hinzugefügt.");
  } catch (error) {
    console.error("Fehler beim Hinzufügen der for_gameconsole-Spalte:", error);
    throw error;
  }
}

// Hilfsfunktion, um zu prüfen, ob eine Spalte existiert
async function doesColumnExist(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    )
  `);
  
  return result.rows[0].exists === 't' || result.rows[0].exists === true;
}