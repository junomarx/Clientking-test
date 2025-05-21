/**
 * Migrationsskript zur Erstellung der email_triggers Tabelle
 * 
 * Diese Tabelle ermöglicht es dem Benutzer, spezifische E-Mail-Vorlagen 
 * bestimmten Reparaturstatus-Änderungen zuzuordnen.
 */
import { db, pool } from './server/db';
import { sql } from 'drizzle-orm';

async function createEmailTriggersTable() {
  console.log('Erstelle email_triggers Tabelle...');
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_triggers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        shop_id INTEGER,
        repair_status VARCHAR(50) NOT NULL,
        email_template_id INTEGER NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (email_template_id) REFERENCES email_templates(id) ON DELETE CASCADE
      );
    `);
    
    console.log('✅ email_triggers Tabelle erfolgreich erstellt');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der email_triggers Tabelle:', error);
    return false;
  }
}

async function main() {
  try {
    const success = await createEmailTriggersTable();
    
    if (success) {
      console.log('Migration erfolgreich abgeschlossen.');
    } else {
      console.error('Migration fehlgeschlagen.');
    }
  } catch (error) {
    console.error('Migration fehlgeschlagen mit Fehler:', error);
  } finally {
    await pool.end();
  }
}

main();