/**
 * Dieses Skript entfernt die Logo-Spalte aus der business_settings-Tabelle,
 * da die Logo-Funktionalität komplett neu implementiert werden soll
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export async function removeLogoColumn() {
  console.log("Entferne Logo-Spalte aus der business_settings-Tabelle...");
  
  try {
    // Prüfen, ob die Spalte existiert
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'business_settings' AND column_name = 'logo_image'
      );
    `);
    
    const exists = columnExists.rows[0].exists;
    
    if (exists) {
      // Spalte entfernen
      await db.execute(sql`
        ALTER TABLE business_settings DROP COLUMN logo_image;
      `);
      console.log("Logo-Spalte erfolgreich entfernt.");
    } else {
      console.log("Logo-Spalte existiert nicht, keine Aktion erforderlich.");
    }
    
    return true;
  } catch (error) {
    console.error("Fehler beim Entfernen der Logo-Spalte:", error);
    return false;
  }
}

// Direktes Ausführen des Skripts, wenn es direkt aufgerufen wird
if (require.main === module) {
  removeLogoColumn().then(() => {
    console.log("Skript abgeschlossen.");
    process.exit(0);
  }).catch((error) => {
    console.error("Skript ist mit einem Fehler fehlgeschlagen:", error);
    process.exit(1);
  });
}
