/**
 * Migrationsskript zum Hinzufügen der repair_terms-Spalte zur business_settings-Tabelle
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addRepairTermsColumn() {
  try {
    console.log('Starte Migration: Hinzufügen der repair_terms-Spalte...');
    
    // Prüfe, ob die repair_terms-Spalte bereits existiert
    const checkColumn = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'business_settings' AND column_name = 'repair_terms'`
    );
    
    if ((checkColumn as any[]).length === 0) {
      console.log('Füge die repair_terms-Spalte zur business_settings-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE business_settings ADD COLUMN repair_terms TEXT`);
      console.log('✅ Die repair_terms-Spalte wurde erfolgreich hinzugefügt.');
    } else {
      console.log('ℹ️  Die repair_terms-Spalte existiert bereits.');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen der repair_terms-Spalte:', error);
    throw error;
  }
}

async function main() {
  try {
    await addRepairTermsColumn();
    console.log('✅ Migration erfolgreich abgeschlossen!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  }
}

// Direkte Ausführung für ES-Module
main();

export { addRepairTermsColumn };