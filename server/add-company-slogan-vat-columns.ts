/**
 * Dieses Skript fügt die Spalten für Firmenlaut und USt-IdNr. zur business_settings-Tabelle hinzu
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

export async function addCompanySloganVatColumns() {
  try {
    console.log('Starte Migration: Hinzufügen von Firmenlaut und USt-IdNr. Spalten...');
    
    // Prüfe, ob die companySlogan-Spalte bereits existiert
    const checkCompanySloganColumn = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'business_settings' AND column_name = 'company_slogan'`
    );
    
    // Prüfe, ob die vatNumber-Spalte bereits existiert
    const checkVatNumberColumn = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'business_settings' AND column_name = 'vat_number'`
    );

    // Füge die companySlogan-Spalte hinzu, wenn sie noch nicht existiert
    if ((checkCompanySloganColumn as any[]).length === 0) {
      console.log('Füge die company_slogan-Spalte hinzu...');
      await db.execute(sql`ALTER TABLE business_settings ADD COLUMN company_slogan TEXT`);
    } else {
      console.log('Die company_slogan-Spalte existiert bereits.');
    }

    // Füge die vatNumber-Spalte hinzu, wenn sie noch nicht existiert
    if ((checkVatNumberColumn as any[]).length === 0) {
      console.log('Füge die vat_number-Spalte hinzu...');
      await db.execute(sql`ALTER TABLE business_settings ADD COLUMN vat_number TEXT`);
    } else {
      console.log('Die vat_number-Spalte existiert bereits.');
    }

    console.log('Migration für Firmenlaut und USt-IdNr. Spalten erfolgreich abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    throw error;
  }
}

// Die ESM-kompatible Version für direktes Ausführen
// ist nicht notwendig, da das Skript über index.ts importiert wird
