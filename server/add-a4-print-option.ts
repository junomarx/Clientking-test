/**
 * Dieses Skript fügt die Spalte für DIN A4-Druckfunktion zur business_settings-Tabelle hinzu
 */

import { pool } from './db';

export async function addA4PrintOption() {
  console.log('Starte Migration: Hinzufügen von DIN A4-Druckoption...');

  try {
    // Überprüfen, ob die neue Spalte bereits existiert
    const checkA4PrintOption = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='business_settings' AND column_name='print_a4_enabled'"
    );

    if (checkA4PrintOption.rows.length === 0) {
      console.log('Füge DIN A4-Druckoption hinzu...');
      // Hinzufügen der neuen Spalte
      await pool.query(
        "ALTER TABLE business_settings ADD COLUMN print_a4_enabled BOOLEAN DEFAULT false"
      );

      console.log('Migration erfolgreich: DIN A4-Druckoption hinzugefügt');
    } else {
      console.log('DIN A4-Druckoption ist bereits in der Datenbank vorhanden');
    }

    console.log('Migration abgeschlossen: DIN A4-Druckoption');
    return { success: true, message: 'DIN A4-Druckoption hinzugefügt' };
  } catch (error: any) {
    console.error('Fehler bei der Migration:', error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}
