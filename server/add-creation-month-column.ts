/**
 * Dieses Skript fügt die Spalte creationMonth zur repairs-Tabelle hinzu
 * um die monatliche Begrenzung von Reparaturen im Basic-Paket zu ermöglichen
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

async function addCreationMonthColumn() {
  console.log('Starte Migration: Hinzufügen der creationMonth-Spalte...');

  try {
    // Prüfen, ob die Spalte bereits existiert
    const columnExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repairs' AND column_name = 'creation_month';
    `);

    if (columnExists.rows.length === 0) {
      // Spalte existiert noch nicht, also hinzufügen
      console.log('Füge creationMonth-Spalte zur repairs-Tabelle hinzu...');
      await db.execute(sql`
        ALTER TABLE repairs ADD COLUMN creation_month TEXT;
      `);

      // Fülle die Spalte mit Daten aus dem Erstellungsdatum für bestehende Einträge
      console.log('Aktualisiere bestehende Reparaturen mit Monats- und Jahresinformationen...');
      await db.execute(sql`
        UPDATE repairs 
        SET creation_month = to_char(created_at, 'YYYYMM')
        WHERE creation_month IS NULL;
      `);

      console.log('Migration für creationMonth-Spalte erfolgreich abgeschlossen.');
    } else {
      console.log('Die creationMonth-Spalte existiert bereits.');
    }
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    throw error;
  }
}

// Führe die Migration aus
addCreationMonthColumn().catch(console.error);
