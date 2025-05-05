/**
 * Dieses Skript fügt die Tabelle für ausgeblendete Standard-Gerätetypen hinzu
 */
import { sql } from "drizzle-orm";
import { db } from "./db";

export async function addHiddenDeviceTypesTable() {
  console.log("Starte Migration: Hinzufügen der Tabelle für ausgeblendete Standard-Gerätetypen...");
  
  try {
    // Prüfen, ob die Tabelle bereits existiert
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'hidden_standard_device_types'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log("Die Tabelle hidden_standard_device_types existiert bereits.");
      return;
    }
    
    // Tabelle erstellen
    await db.execute(sql`
      CREATE TABLE hidden_standard_device_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("Tabelle für ausgeblendete Standard-Gerätetypen erfolgreich erstellt.");
  } catch (error) {
    console.error("Fehler bei der Migration für ausgeblendete Standard-Gerätetypen:", error);
    throw error;
  }
}