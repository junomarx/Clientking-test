/**
 * Dieses Skript fügt die feature_overrides Spalte zur users-Tabelle hinzu
 * um individuelle Feature-Übersteuerungen auf Benutzerebene zu ermöglichen
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addFeatureOverridesColumn() {
  try {
    // Prüfe, ob die feature_overrides-Spalte bereits existiert
    const result = await db.execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'feature_overrides'`
    );

    if (result.rows.length === 0) {
      console.log("Füge feature_overrides-Spalte hinzu...");
      // Füge die feature_overrides Spalte hinzu, wenn sie noch nicht existiert
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN feature_overrides JSONB DEFAULT NULL`
      );
      console.log("feature_overrides-Spalte erfolgreich hinzugefügt.");
    } else {
      console.log("Die feature_overrides-Spalte existiert bereits.");
    }

    console.log("Migration für feature_overrides-Spalte erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Migration der feature_overrides-Spalte:", error);
    throw error;
  }
}
