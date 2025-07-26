/**
 * Dieses Skript fügt die max_employees Spalte zur business_settings-Tabelle hinzu
 * und setzt für alle bestehenden Shops den Standard-Wert von 2 Mitarbeitern
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';

export async function addMaxEmployeesColumn() {
  try {
    console.log('Starte Migration: Hinzufügen von max_employees Spalte...');
    
    // Prüfe, ob die max_employees-Spalte bereits existiert
    const checkColumn = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'business_settings' AND column_name = 'max_employees'`
    );

    // Füge die max_employees-Spalte hinzu, wenn sie noch nicht existiert
    if ((checkColumn as any[]).length === 0) {
      console.log('Füge die max_employees-Spalte hinzu mit Standard-Wert 2...');
      await db.execute(
        sql`ALTER TABLE business_settings 
            ADD COLUMN max_employees INTEGER NOT NULL DEFAULT 2`
      );
      console.log('✅ max_employees-Spalte erfolgreich hinzugefügt');
    } else {
      console.log('Die max_employees-Spalte existiert bereits.');
    }

    // Stelle sicher, dass alle bestehenden business_settings den Standard-Wert haben
    console.log('Aktualisiere alle bestehenden Shops mit Standard-Wert 2 Mitarbeiter...');
    const updateResult = await db.execute(
      sql`UPDATE business_settings 
          SET max_employees = 2 
          WHERE max_employees IS NULL OR max_employees = 0`
    );
    
    console.log(`✅ ${(updateResult as any).rowCount || 0} Shop-Einstellungen aktualisiert`);

    // Zeige Statistik aller Shops
    const stats = await db.execute(
      sql`SELECT 
            COUNT(*) as total_shops,
            COUNT(CASE WHEN max_employees = 2 THEN 1 END) as shops_with_default,
            COUNT(CASE WHEN max_employees > 2 THEN 1 END) as shops_with_more
          FROM business_settings`
    );
    
    const statsRow = (stats as any[])[0];
    console.log(`
📊 Migration abgeschlossen:
- Gesamte Shops: ${statsRow.total_shops}
- Shops mit Standard (2): ${statsRow.shops_with_default}
- Shops mit mehr als 2: ${statsRow.shops_with_more}
    `);

  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    throw error;
  }
}

// Skript direkt ausführen
addMaxEmployeesColumn()
  .then(() => {
    console.log('✅ Migration erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  });