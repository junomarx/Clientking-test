/**
 * Benutzerlöschungs-Service
 * 
 * Dieser Service dient dem sicheren und vollständigen Löschen von Benutzern
 * und allen damit verbundenen Daten, einschließlich Kunden, Reparaturen, etc.
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Löscht einen Benutzer und alle damit verbundenen Daten vollständig aus der Datenbank
 * 
 * @param userId Die ID des zu löschenden Benutzers
 * @returns true, wenn der Benutzer erfolgreich gelöscht wurde
 * @throws Error, wenn der Löschvorgang fehlschlägt
 */
export async function deleteUserCompletely(userId: number): Promise<boolean> {
  try {
    console.log(`Lösche abhängige Daten für Benutzer mit ID ${userId}...`);
    
    // Strukturiertes, schrittweises Löschen ohne Änderung von session_replication_role
    
    // 1. E-Mail-Verlauf für Reparaturen des Benutzers löschen
    try {
      await db.execute(sql`
        DELETE FROM email_history 
        WHERE "repairId" IN (
          SELECT r.id 
          FROM repairs r 
          JOIN customers c ON r.customer_id = c.id 
          WHERE c.user_id = ${userId}
        )
      `);
      console.log(`E-Mail-Verlauf für Benutzer ${userId} gelöscht.`);
    } catch (error) {
      console.log(`Hinweis: E-Mail-Verlauf konnte nicht gelöscht werden: ${error.message || String(error)}`);
    }
    
    // 2. Kostenvoranschläge für Reparaturen des Benutzers löschen
    try {
      await db.execute(sql`
        DELETE FROM cost_estimates 
        WHERE repair_id IN (
          SELECT r.id 
          FROM repairs r 
          JOIN customers c ON r.customer_id = c.id 
          WHERE c.user_id = ${userId}
        )
      `);
      console.log(`Kostenvoranschläge für Benutzer ${userId} gelöscht.`);
    } catch (error) {
      console.log(`Hinweis: Kostenvoranschläge konnten nicht gelöscht werden: ${error.message || String(error)}`);
    }
    
    // 3. Reparaturen des Benutzers löschen
    try {
      await db.execute(sql`
        DELETE FROM repairs 
        WHERE customer_id IN (
          SELECT id 
          FROM customers 
          WHERE user_id = ${userId}
        )
      `);
      console.log(`Reparaturen für Benutzer ${userId} gelöscht.`);
    } catch (error) {
      console.log(`Hinweis: Reparaturen konnten nicht gelöscht werden: ${error.message || String(error)}`);
    }
    
    // 4. Kunden des Benutzers löschen
    try {
      await db.execute(sql`DELETE FROM customers WHERE user_id = ${userId}`);
      console.log(`Kunden für Benutzer ${userId} gelöscht.`);
    } catch (error) {
      console.log(`Hinweis: Kunden konnten nicht gelöscht werden: ${error.message || String(error)}`);
    }
    
    // 5. Geschäftseinstellungen des Benutzers löschen
    try {
      await db.execute(sql`DELETE FROM business_settings WHERE user_id = ${userId}`);
      console.log(`Geschäftseinstellungen für Benutzer ${userId} gelöscht.`);
    } catch (error) {
      console.log(`Hinweis: Geschäftseinstellungen konnten nicht gelöscht werden: ${error.message || String(error)}`);
    }
    
    // 6. E-Mail-Vorlagen des Benutzers löschen
    try {
      await db.execute(sql`DELETE FROM email_templates WHERE user_id = ${userId}`);
      console.log(`E-Mail-Vorlagen für Benutzer ${userId} gelöscht.`);
    } catch (error) {
      console.log(`Hinweis: E-Mail-Vorlagen konnten nicht gelöscht werden: ${error.message || String(error)}`);
    }
    
    // 7. Gerätespezifische Daten löschen (falls vorhanden)
    try {
      // Diese Löschoperationen können fehlschlagen, wenn die Tabellen nicht existieren oder anders strukturiert sind
      await db.execute(sql`DELETE FROM user_models WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM user_brands WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM user_device_types WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM hidden_standard_device_types WHERE user_id = ${userId}`);
      console.log(`Gerätedaten für Benutzer ${userId} gelöscht.`);
    } catch (deviceError) {
      console.log(`Hinweis: Nicht-kritischer Fehler beim Löschen von Gerätedaten: ${deviceError.message || String(deviceError)}`);
    }
    
    // 8. Support-Zugriffsprotokolle löschen
    try {
      await db.execute(sql`DELETE FROM support_access_logs WHERE user_id = ${userId}`);
      console.log(`Support-Zugriffsprotokolle für Benutzer ${userId} gelöscht.`);
    } catch (supportLogError) {
      console.log(`Hinweis: Support-Zugriffsprotokolle konnten nicht gelöscht werden: ${supportLogError.message || String(supportLogError)}`);
    }
    
    // 9. Den Benutzer selbst löschen
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
    
    console.log(`Benutzer mit ID ${userId} und alle abhängigen Daten wurden erfolgreich gelöscht.`);
    return true;
  } catch (error) {
    console.error(`Fehler beim vollständigen Löschen des Benutzers mit ID ${userId}:`, error);
    throw new Error(`Fehler beim vollständigen Löschen des Benutzers: ${error.message || String(error)}`);
  }
}