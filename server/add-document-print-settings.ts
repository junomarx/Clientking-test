/**
 * Dieses Skript fügt die neuen Spalten für die benutzerdefinierte Dokumentenvorlagen,
 * QR-Code-Einstellungen und benutzerdefinierten Fußnoten zur business_settings-Tabelle hinzu
 */

import { pool } from './db';

export async function addDocumentPrintSettings() {
  console.log('Starte Migration: Hinzufügen von Einstellungen für Dokumentendruck...');

  try {
    // Überprüfen, ob die neue Spalten bereits existieren
    const checkQrEnabled = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='business_settings' AND column_name='qr_code_enabled'"
    );

    if (checkQrEnabled.rows.length === 0) {
      console.log('Füge QR-Code-Einstellungen hinzu...');
      // Hinzufügen der QR-Code-Einstellungen
      await pool.query(
        "ALTER TABLE business_settings ADD COLUMN qr_code_enabled BOOLEAN DEFAULT false"
      );
      await pool.query(
        "ALTER TABLE business_settings ADD COLUMN qr_code_type VARCHAR(50) DEFAULT 'repair_status'"
      );
      await pool.query(
        "ALTER TABLE business_settings ADD COLUMN qr_code_content TEXT"
      );

      // Hinzufügen der benutzerdefinierten Fußnote
      await pool.query(
        "ALTER TABLE business_settings ADD COLUMN custom_footer_text TEXT"
      );

      // Für Dokument-Vorlagen werden wir später eine separate Tabelle erstellen
      console.log('Migration erfolgreich: QR-Code-Einstellungen und Fußnoten hinzugefügt');

      // Erstellen einer neuen Tabelle für Dokumentenvorlagen
      const checkDocumentTemplatesTable = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name='document_templates'"
      );

      if (checkDocumentTemplatesTable.rows.length === 0) {
        console.log('Erstelle Dokumentenvorlagen-Tabelle...');
        await pool.query(`
          CREATE TABLE document_templates (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);
        console.log('Dokumentenvorlagen-Tabelle erstellt');
      } else {
        console.log('Dokumentenvorlagen-Tabelle existiert bereits');
      }
    } else {
      console.log('QR-Code-Einstellungen sind bereits in der Datenbank vorhanden');
    }

    console.log('Migration abgeschlossen: Dokumentendruck-Einstellungen');
    return { success: true, message: 'Dokumentendruck-Einstellungen hinzugefügt' };
  } catch (error: any) {
    console.error('Fehler bei der Migration:', error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// In ES modules wird die Migration direkt vom Hauptmodul aufgerufen
// Eine direkte Ausführung ist daher nicht notwendig.
