/**
 * Dieses Skript fügt die Tabelle für Druckvorlagen hinzu
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addPrintTemplatesTable() {
  try {
    // Prüfen, ob die Tabelle bereits existiert
    const tableExists = await doesTableExist('print_templates');
    
    if (tableExists) {
      console.log('Die print_templates-Tabelle existiert bereits.');
      return;
    }
    
    // Tabelle erstellen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS print_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        variables TEXT[],
        user_id INTEGER,
        shop_id INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Die print_templates-Tabelle wurde erfolgreich erstellt.');
  } catch (error) {
    console.error('Fehler beim Erstellen der print_templates-Tabelle:', error);
  }
}

async function doesTableExist(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    ) as table_exists
  `);
  
  // In PostgreSQL wird ein t/f (Text) für boolean zurückgegeben
  return result.rows[0].table_exists === 't' || result.rows[0].table_exists === true;
}

// In ES Modulen ist dieser Code nicht mehr notwendig
// Diese Funktion wird nur über den Import in index.ts aufgerufen
