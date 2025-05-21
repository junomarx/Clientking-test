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
  let sessionReplicationRoleChanged = false;
  
  try {
    // Sitzungsreplikationsmodus auf 'replica' setzen, um Fremdschlüsselprüfungen zu deaktivieren
    await db.execute(sql`SET session_replication_role = 'replica'`);
    sessionReplicationRoleChanged = true;
    
    console.log(`Lösche abhängige Daten für Benutzer mit ID ${userId}...`);
    
    // 1. E-Mail-Verlauf für Reparaturen des Benutzers löschen
    await db.execute(sql`
      DELETE FROM email_history 
      WHERE "repairId" IN (
        SELECT r.id 
        FROM repairs r 
        JOIN customers c ON r.customer_id = c.id 
        WHERE c.user_id = ${userId}
      )
    `);
    
    // 2. Kostenvoranschläge für Reparaturen des Benutzers löschen
    await db.execute(sql`
      DELETE FROM cost_estimates 
      WHERE repair_id IN (
        SELECT r.id 
        FROM repairs r 
        JOIN customers c ON r.customer_id = c.id 
        WHERE c.user_id = ${userId}
      )
    `);
    
    // 3. Reparaturen des Benutzers löschen
    await db.execute(sql`
      DELETE FROM repairs 
      WHERE customer_id IN (
        SELECT id 
        FROM customers 
        WHERE user_id = ${userId}
      )
    `);
    
    // 4. Kunden des Benutzers löschen
    await db.execute(sql`DELETE FROM customers WHERE user_id = ${userId}`);
    
    // 5. Geschäftseinstellungen des Benutzers löschen
    await db.execute(sql`DELETE FROM business_settings WHERE user_id = ${userId}`);
    
    // 6. E-Mail-Vorlagen des Benutzers löschen
    await db.execute(sql`DELETE FROM email_templates WHERE user_id = ${userId}`);
    
    // 7. Gerätespezifische Daten löschen (falls vorhanden)
    try {
      // Diese Löschoperationen können fehlschlagen, wenn die Tabellen nicht existieren oder anders strukturiert sind
      await db.execute(sql`DELETE FROM user_models WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM user_brands WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM user_device_types WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM hidden_standard_device_types WHERE user_id = ${userId}`);
    } catch (deviceError) {
      console.log(`Hinweis: Nicht-kritischer Fehler beim Löschen von Gerätedaten: ${deviceError.message || deviceError}`);
    }
    
    // 8. Support-Zugriffsprotokolle löschen
    try {
      await db.execute(sql`DELETE FROM support_access_logs WHERE user_id = ${userId}`);
    } catch (supportLogError) {
      console.log(`Hinweis: Support-Zugriffsprotokolle konnten nicht gelöscht werden: ${supportLogError.message || supportLogError}`);
    }
    
    // 9. Den Benutzer selbst löschen
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
    
    console.log(`Benutzer mit ID ${userId} und alle abhängigen Daten wurden erfolgreich gelöscht.`);
    return true;
  } catch (error) {
    console.error(`Fehler beim vollständigen Löschen des Benutzers mit ID ${userId}:`, error);
    throw new Error(`Fehler beim vollständigen Löschen des Benutzers: ${error.message || error}`);
  } finally {
    // Stellen Sie sicher, dass die Fremdschlüsselprüfung wieder aktiviert wird,
    // unabhängig davon, ob der Löschvorgang erfolgreich war oder fehlgeschlagen ist
    if (sessionReplicationRoleChanged) {
      try {
        await db.execute(sql`SET session_replication_role = 'origin'`);
      } catch (finalError) {
        console.error('Fehler beim Wiederherstellen des session_replication_role:', finalError);
      }
    }
  }
}