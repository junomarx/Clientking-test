/**
 * Migrationsskript zum Hinzufügen der opening_hours-Spalte zur business_settings-Tabelle
 */
import { db, pool } from './server/db';
import { sql } from 'drizzle-orm';

async function addOpeningHoursColumn() {
  console.log('Füge opening_hours-Spalte zur business_settings-Tabelle hinzu...');
  
  try {
    await db.execute(sql`
      ALTER TABLE business_settings 
      ADD COLUMN IF NOT EXISTS opening_hours TEXT DEFAULT NULL;
    `);
    
    console.log('✅ opening_hours-Spalte erfolgreich hinzugefügt!');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen der opening_hours-Spalte:', error);
    return false;
  }
}

async function main() {
  try {
    const success = await addOpeningHoursColumn();
    
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