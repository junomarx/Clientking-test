/**
 * Migrationsskript zur Erstellung der cost_estimate_items Tabelle
 * 
 * Dieses Skript erstellt die Tabelle für die Positionen der Kostenvoranschläge,
 * falls diese noch nicht existiert.
 */
import { db } from './server/db';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Funktion zur Prüfung, ob die Tabelle bereits existiert
async function doesTableExist(tableName: string): Promise<boolean> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [tableName]);

    return result.rows[0].exists;
  } catch (error) {
    console.error(`Fehler beim Prüfen der Tabelle ${tableName}:`, error);
    return false;
  } finally {
    await pool.end();
  }
}

// Funktion zur Erstellung der Tabelle
async function createCostEstimateItemsTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const tableExists = await doesTableExist('cost_estimate_items');
    
    if (tableExists) {
      console.log("Die Tabelle 'cost_estimate_items' existiert bereits.");
      return;
    }

    console.log("Erstelle Tabelle 'cost_estimate_items'...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cost_estimate_items (
        id SERIAL PRIMARY KEY,
        cost_estimate_id INTEGER NOT NULL REFERENCES cost_estimates(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price TEXT NOT NULL,
        total_price TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    console.log("Tabelle 'cost_estimate_items' erfolgreich erstellt!");
  } catch (error) {
    console.error("Fehler beim Erstellen der Tabelle 'cost_estimate_items':", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Hauptfunktion
async function main() {
  try {
    console.log("Starte Migration für cost_estimate_items...");
    await createCostEstimateItemsTable();
    console.log("Migration erfolgreich abgeschlossen!");
  } catch (error) {
    console.error("Migration fehlgeschlagen:", error);
    process.exit(1);
  }
}

// Skript ausführen
main();