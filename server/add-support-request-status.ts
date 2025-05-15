/**
 * Dieses Skript erweitert die Support-Zugriffsprotokolle um Statusfelder
 * für den Genehmigungsprozess (DSGVO-Konformität)
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

// Füge die Statusfelder zur Tabelle hinzu
export async function addSupportRequestStatus() {
  try {
    console.log("Starte Migration: Erweiterung der Support-Zugriffsprotokolle um Statusfelder...");

    // Prüfe, ob die Spalte bereits existiert
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'support_access_logs' 
        AND column_name = 'status'
      );
    `);

    // Wenn die Spalte noch nicht existiert, füge sie hinzu
    if (!columnExists.rows[0].exists) {
      await db.execute(sql`
        ALTER TABLE support_access_logs 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending',
        ADD COLUMN responded_at TIMESTAMP,
        ADD COLUMN responding_user_id INTEGER;
      `);
      console.log("Statusfelder zur Support-Zugriffsprotokolle-Tabelle hinzugefügt.");
    } else {
      console.log("Die status-Spalte existiert bereits.");
    }
    
    // Setze den Status für bestehende Einträge auf 'approved'
    await db.execute(sql`
      UPDATE support_access_logs 
      SET status = 'approved' 
      WHERE status = 'pending';
    `);
    console.log("Status für bestehende Einträge aktualisiert.");

    console.log("Migration für Support-Zugriffsprotokolle erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Migration der Support-Zugriffsprotokolle:", error);
  }
}