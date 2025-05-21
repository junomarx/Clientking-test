/**
 * Benutzer-Löschskript für den Handyshop
 * 
 * Dieses Skript kann direkt ausgeführt werden, um Benutzer mit allen verknüpften Daten
 * vollständig aus der Datenbank zu löschen.
 * 
 * Verwendung: node delete-users.js [userId1] [userId2] ...
 * Beispiel: node delete-users.js 6 9 12
 * 
 * Oder für interaktive Verwendung: node delete-users.js
 */

import pg from 'pg';
import readline from 'readline';
import { promisify } from 'util';

// Datenbankverbindung
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper für die Konsoleninteraktion
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

/**
 * Führt eine SQL-Abfrage mit Parametern aus und gibt das Ergebnis zurück
 */
async function executeQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error(`Fehler bei der Datenbankabfrage: ${error.message}`);
    throw error;
  }
}

/**
 * Zählt die Datensätze in einer Tabelle, die auf einen Benutzer verweisen
 */
async function countRelatedRecords(tableName, userIdColumn, userId) {
  const query = `SELECT COUNT(*) FROM ${tableName} WHERE ${userIdColumn} = $1`;
  const result = await executeQuery(query, [userId]);
  return parseInt(result[0].count, 10);
}

/**
 * Löscht einen Benutzer und alle verknüpften Daten
 */
async function deleteUser(userId) {
  console.log(`\n====== Starte Löschvorgang für Benutzer ID: ${userId} ======`);
  
  try {
    // 1. Benutzerinformationen abrufen
    const userResult = await executeQuery(`SELECT username, email FROM users WHERE id = $1`, [userId]);
    
    if (userResult.length === 0) {
      console.log(`❌ Benutzer mit ID ${userId} nicht gefunden.`);
      return false;
    }
    
    const user = userResult[0];
    console.log(`ℹ️ Gefundener Benutzer: ${user.username} (${user.email})`);
    
    // 2. Mit Transaktion alle abhängigen Daten löschen
    await pool.query('BEGIN');
    
    try {
      // 2.1 Kunden und deren abhängige Daten finden
      const customers = await executeQuery(
        `SELECT id FROM customers WHERE user_id = $1`, 
        [userId]
      );
      
      const customerIds = customers.map(c => c.id);
      console.log(`ℹ️ Gefundene Kunden: ${customerIds.length}`);
      
      if (customerIds.length > 0) {
        // 2.2 Reparaturen für diese Kunden finden
        const repairsResult = await executeQuery(
          `SELECT id FROM repairs WHERE customer_id IN (${customerIds.map((_, i) => `$${i + 1}`).join(',')})`,
          customerIds
        );
        
        const repairIds = repairsResult.map(r => r.id);
        console.log(`ℹ️ Gefundene Reparaturen: ${repairIds.length}`);
        
        if (repairIds.length > 0) {
          // 2.3 E-Mail-Historie löschen
          const emailHistoryResult = await executeQuery(
            `DELETE FROM email_history WHERE "repairId" IN (${repairIds.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
            repairIds
          );
          console.log(`✅ E-Mail-Verlaufseinträge gelöscht: ${emailHistoryResult.length}`);
          
          // 2.4 Kostenvoranschläge löschen
          const costEstimatesResult = await executeQuery(
            `DELETE FROM cost_estimates WHERE repair_id IN (${repairIds.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
            repairIds
          );
          console.log(`✅ Kostenvoranschläge gelöscht: ${costEstimatesResult.length}`);
          
          // 2.5 Reparaturen löschen
          const deletedRepairsResult = await executeQuery(
            `DELETE FROM repairs WHERE id IN (${repairIds.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
            repairIds
          );
          console.log(`✅ Reparaturen gelöscht: ${deletedRepairsResult.length}`);
        }
        
        // 2.6 Kunden löschen
        const deletedCustomersResult = await executeQuery(
          `DELETE FROM customers WHERE user_id = $1 RETURNING id`,
          [userId]
        );
        console.log(`✅ Kunden gelöscht: ${deletedCustomersResult.length}`);
      }
      
      // 3. Geschäftseinstellungen löschen
      const businessSettingsResult = await executeQuery(
        `DELETE FROM business_settings WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      console.log(`✅ Geschäftseinstellungen gelöscht: ${businessSettingsResult.length}`);
      
      // 4. E-Mail-Vorlagen löschen
      const emailTemplatesResult = await executeQuery(
        `DELETE FROM email_templates WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      console.log(`✅ E-Mail-Vorlagen gelöscht: ${emailTemplatesResult.length}`);
      
      // 5. Gerätespezifische Daten löschen
      // 5.1 Modelle
      const userModelsResult = await executeQuery(
        `DELETE FROM user_models WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      console.log(`✅ Gerätemodelle gelöscht: ${userModelsResult.length}`);
      
      // 5.2 Marken
      const userBrandsResult = await executeQuery(
        `DELETE FROM user_brands WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      console.log(`✅ Gerätemarken gelöscht: ${userBrandsResult.length}`);
      
      // 5.3 Gerätetypen
      const userDeviceTypesResult = await executeQuery(
        `DELETE FROM user_device_types WHERE user_id = $1 RETURNING id`,
        [userId]
      );
      console.log(`✅ Gerätetypen gelöscht: ${userDeviceTypesResult.length}`);
      
      // 6. Benutzer selbst löschen
      const userDeleteResult = await executeQuery(
        `DELETE FROM users WHERE id = $1 RETURNING id, username`,
        [userId]
      );
      
      if (userDeleteResult.length === 0) {
        throw new Error('Benutzer konnte nicht gelöscht werden.');
      }
      
      // Transaktion abschließen
      await pool.query('COMMIT');
      
      console.log(`✅ Benutzer ${user.username} (ID: ${userId}) erfolgreich gelöscht.`);
      return true;
    } catch (error) {
      // Bei Fehler Transaktion zurückrollen
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(`❌ Fehler beim Löschen des Benutzers ${userId}: ${error.message}`);
    return false;
  }
}

/**
 * Interaktive Benutzerlöschung starten
 */
async function interactiveDelete() {
  try {
    // Alle aktiven Benutzer auflisten
    const users = await executeQuery(`
      SELECT id, username, email, 
        CASE 
          WHEN is_superadmin THEN 'Superadmin'
          WHEN is_admin THEN 'Admin'
          ELSE 'Benutzer'
        END as role
      FROM users 
      ORDER BY id
    `);
    
    console.log('\n=== Verfügbare Benutzer ===');
    users.forEach(u => {
      console.log(`ID: ${u.id} | ${u.username} | ${u.email} | ${u.role}`);
    });
    
    const userIdInput = await question('\nGeben Sie die ID des zu löschenden Benutzers ein (oder "q" zum Beenden): ');
    
    if (userIdInput.toLowerCase() === 'q') {
      console.log('Vorgang abgebrochen.');
      rl.close();
      pool.end();
      return;
    }
    
    const userId = parseInt(userIdInput, 10);
    
    if (isNaN(userId)) {
      console.log('Ungültige Eingabe. Bitte geben Sie eine gültige Benutzer-ID ein.');
      return interactiveDelete();
    }
    
    const confirmDelete = await question(`Sind Sie sicher, dass Sie den Benutzer mit ID ${userId} löschen möchten? (j/n): `);
    
    if (confirmDelete.toLowerCase() === 'j') {
      await deleteUser(userId);
    } else {
      console.log('Löschvorgang abgebrochen.');
    }
    
    const continueDelete = await question('\nMöchten Sie einen weiteren Benutzer löschen? (j/n): ');
    
    if (continueDelete.toLowerCase() === 'j') {
      await interactiveDelete();
    } else {
      console.log('Programm wird beendet.');
      rl.close();
      pool.end();
    }
  } catch (error) {
    console.error(`Fehler bei der interaktiven Löschung: ${error.message}`);
    rl.close();
    pool.end();
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  try {
    // Prüfen auf Kommandozeilenargumente
    const userIds = process.argv.slice(2).map(arg => parseInt(arg, 10)).filter(id => !isNaN(id));
    
    if (userIds.length > 0) {
      // Batch-Modus für mehrere Benutzer
      console.log(`Lösche ${userIds.length} Benutzer im Batch-Modus: ${userIds.join(', ')}`);
      
      for (const userId of userIds) {
        await deleteUser(userId);
      }
      
      console.log('\nAlle angegebenen Benutzer wurden verarbeitet.');
    } else {
      // Interaktiver Modus
      console.log('=== Handyshop Benutzer-Löschprogramm ===');
      console.log('Dieses Tool löscht Benutzer und alle zugehörigen Daten.');
      console.log('WARNUNG: Dieser Vorgang kann nicht rückgängig gemacht werden!\n');
      
      await interactiveDelete();
    }
  } catch (error) {
    console.error(`Unerwarteter Fehler: ${error.message}`);
    process.exit(1);
  } finally {
    // Sicherstellen, dass Verbindungen geschlossen werden
    rl.close();
    pool.end();
  }
}

// Programm starten
main();