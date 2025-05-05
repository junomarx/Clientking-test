/**
 * Dieses Skript aktualisiert die device_issues-Tabelle mit neuen Feldern für den Fehlerkatalog
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addDeviceIssuesFields() {
  console.log("Starte Migration: Hinzufügen von Feldern zur device_issues-Tabelle...");

  try {
    // Prüfe, ob die title-Spalte bereits existiert
    const titleColumnExists = await columnExists("title", "device_issues");
    if (!titleColumnExists) {
      console.log("Füge title-Spalte hinzu...");
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN title TEXT NOT NULL DEFAULT 'Fehlerbeschreibung'`);
    } else {
      console.log("Die title-Spalte existiert bereits.");
    }

    // Prüfe, ob die solution-Spalte bereits existiert
    const solutionColumnExists = await columnExists("solution", "device_issues");
    if (!solutionColumnExists) {
      console.log("Füge solution-Spalte hinzu...");
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN solution TEXT`);
    } else {
      console.log("Die solution-Spalte existiert bereits.");
    }

    // Prüfe, ob die severity-Spalte bereits existiert
    const severityColumnExists = await columnExists("severity", "device_issues");
    if (!severityColumnExists) {
      console.log("Füge severity-Spalte hinzu...");
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN severity TEXT DEFAULT 'medium'`);
    } else {
      console.log("Die severity-Spalte existiert bereits.");
    }

    // Prüfe, ob die isCommon-Spalte bereits existiert
    const isCommonColumnExists = await columnExists("is_common", "device_issues");
    if (!isCommonColumnExists) {
      console.log("Füge is_common-Spalte hinzu...");
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN is_common BOOLEAN DEFAULT false`);
    } else {
      console.log("Die is_common-Spalte existiert bereits.");
    }

    console.log("Migration für device_issues-Felder erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Migration der device_issues-Tabelle:", error);
    throw error;
  }
}

// Hilfsfunktion zum Prüfen, ob eine Spalte in einer Tabelle existiert
async function columnExists(columnName: string, tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        AND column_name = ${columnName}
      ) AS column_exists
    `);
    const rows = result.rows as Array<{column_exists: boolean}>;
    return rows.length > 0 && rows[0].column_exists;
  } catch (error) {
    console.error(`Fehler beim Prüfen, ob Spalte ${columnName} in Tabelle ${tableName} existiert:`, error);
    throw error;
  }
}
