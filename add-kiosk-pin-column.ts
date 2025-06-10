/**
 * Migrationsskript zum Hinzufügen der kiosk_pin-Spalte zur business_settings-Tabelle
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import ws from 'ws';

config();
neonConfig.webSocketConstructor = ws;

async function addKioskPinColumn() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Füge kiosk_pin-Spalte zur business_settings-Tabelle hinzu...');
    
    // Prüfe, ob die Spalte bereits existiert
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_settings' 
      AND column_name = 'kiosk_pin'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Spalte hinzufügen mit Standardwert "1234"
      await pool.query(`
        ALTER TABLE business_settings 
        ADD COLUMN kiosk_pin TEXT DEFAULT '1234'
      `);
      
      console.log('✅ kiosk_pin-Spalte erfolgreich hinzugefügt');
    } else {
      console.log('ℹ️ kiosk_pin-Spalte existiert bereits');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen der kiosk_pin-Spalte:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await addKioskPinColumn();
    console.log('Migration erfolgreich abgeschlossen');
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
    process.exit(1);
  }
}

// Führe das Skript aus, wenn es direkt aufgerufen wird
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}