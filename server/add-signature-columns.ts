/**
 * Dieses Skript fügt die Signatur-Spalten zur Reparatur-Tabelle hinzu
 */
import { pool } from './db';

async function addSignatureColumns() {
  try {
    console.log('Füge Signature-Spalten zur repairs-Tabelle hinzu...');
    
    // Prüfe, ob die Spalten bereits existieren
    const checkColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repairs' AND column_name = 'customer_signature'
    `);
    
    if (checkColumnResult.rows.length === 0) {
      // Spalten hinzufügen
      await pool.query(`
        ALTER TABLE repairs 
        ADD COLUMN IF NOT EXISTS customer_signature TEXT,
        ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP
      `);
      console.log('Signature-Spalten erfolgreich hinzugefügt!');
    } else {
      console.log('Signature-Spalten existieren bereits.');
    }
    
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Signature-Spalten:', error);
  } finally {
    // Pool beenden
    await pool.end();
  }
}

// Skript ausführen
addSignatureColumns().catch(console.error);
