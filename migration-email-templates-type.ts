import { db } from "./server/db";
import { emailTemplates } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Dieses Migrationsskript fügt die type-Spalte zur email_templates-Tabelle hinzu
 * und aktualisiert bestehende Vorlagen mit Typinformationen basierend auf dem Namen
 */
async function migrateEmailTemplatesType() {
  console.log("Starte Migration: Hinzufügen der type-Spalte zur email_templates-Tabelle...");

  try {
    // Überprüfen, ob die type-Spalte bereits existiert
    const checkTypeColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_templates' AND column_name = 'type'
    `);

    if (checkTypeColumn.rows.length === 0) {
      // Spalte existiert noch nicht, also hinzufügen
      console.log("Füge type-Spalte zur email_templates-Tabelle hinzu...");
      await db.execute(sql`
        ALTER TABLE email_templates
        ADD COLUMN type TEXT
      `);
      console.log("type-Spalte wurde erfolgreich hinzugefügt.");
    } else {
      console.log("Die type-Spalte existiert bereits.");
    }

    // Bestehende Vorlagen aktualisieren
    console.log("Aktualisiere bestehende Vorlagen mit Typ-Informationen...");

    // System-/App-Vorlagen identifizieren basierend auf bekannten Namen
    const appTemplateNames = [
      "Registrierungsbestätigung",
      "Konto freigeschaltet",
      "Passwort zurücksetzen",
      "Passwort geändert",
      "Willkommen"
    ];

    // App-Vorlagen (System-Vorlagen) aktualisieren
    const updateAppResult = await db.execute(sql`
      UPDATE email_templates
      SET type = 'app'
      WHERE name IN (${sql.join(appTemplateNames, sql`, `)})
    `);
    
    console.log(`${updateAppResult.rowCount || 0} System-Vorlagen wurden als 'app' markiert.`);
    
    // Alle verbleibenden Vorlagen als Kunden-Vorlagen markieren
    const updateCustomerResult = await db.execute(sql`
      UPDATE email_templates
      SET type = 'customer'
      WHERE type IS NULL
    `);
    
    console.log(`${updateCustomerResult.rowCount || 0} verbleibende Vorlagen wurden als 'customer' markiert.`);
    
    console.log("Migration für email_templates-Typen erfolgreich abgeschlossen.");
    
    return true;
  } catch (error) {
    console.error("Fehler bei der Migration für die type-Spalte:", error);
    return false;
  }
}

async function main() {
  try {
    await migrateEmailTemplatesType();
    process.exit(0);
  } catch (error) {
    console.error("Fehler bei der Migration:", error);
    process.exit(1);
  }
}

main();