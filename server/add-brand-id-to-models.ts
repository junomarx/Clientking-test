/**
 * Diese Migration fügt die brandId-Spalte zur userModels-Tabelle hinzu,
 * um eine direkte Beziehung zu userBrands zu ermöglichen
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addBrandIdToModels() {
  console.log("Starte Migration: Hinzufügen der brandId-Spalte zur userModels-Tabelle...");

  try {
    // Prüfen, ob die Spalte bereits existiert
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_models' AND column_name = 'brand_id';
    `);

    if (result.rows.length === 0) {
      // Spalte hinzufügen, wenn sie noch nicht existiert
      await db.execute(sql`
        ALTER TABLE user_models 
        ADD COLUMN brand_id INTEGER REFERENCES user_brands(id);
      `);
      console.log("Die brandId-Spalte wurde erfolgreich hinzugefügt.");
    } else {
      console.log("Die brandId-Spalte existiert bereits.");
    }

    // Prüfen, ob model_series_id eine NOT NULL Constraint hat
    const constraintResult = await db.execute(sql`
      SELECT * FROM information_schema.columns
      WHERE table_name = 'user_models' 
      AND column_name = 'model_series_id' 
      AND is_nullable = 'NO';
    `);

    if (constraintResult.rows.length > 0) {
      // Die Spalte als nullable setzen
      await db.execute(sql`
        ALTER TABLE user_models 
        ALTER COLUMN model_series_id DROP NOT NULL;
      `);
      console.log("Die model_series_id-Spalte wurde als nullable definiert.");
    } else {
      console.log("Die model_series_id-Spalte ist bereits nullable.");
    }

    console.log("Migration für userModels-Tabelle erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Migration:", error);
  }
}
