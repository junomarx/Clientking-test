import { pool } from './db';

async function addStatusUpdatedColumn() {
  try {
    // Prüfe, ob die Spalte bereits existiert
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repairs' 
      AND column_name = 'status_updated_at';
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Die Spalte status_updated_at existiert noch nicht, füge sie hinzu...');
      
      // Füge die neue Spalte hinzu
      await pool.query(`
        ALTER TABLE repairs
        ADD COLUMN status_updated_at TIMESTAMP;
      `);
      
      // Setze den Wert für bestehende Einträge auf das updatedAt-Datum
      await pool.query(`
        UPDATE repairs
        SET status_updated_at = updated_at
        WHERE status_updated_at IS NULL;
      `);
      
      console.log('Spalte status_updated_at wurde erfolgreich hinzugefügt und mit Werten gefüllt.');
    } else {
      console.log('Die Spalte status_updated_at existiert bereits.');
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Spalte:', error);
  } finally {
    // Schließe die Verbindung
    await pool.end();
  }
}

// Führe die Funktion aus
addStatusUpdatedColumn();