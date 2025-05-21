/**
 * Benutzer-Löschskript für den Handyshop
 * 
 * Dieses Skript kann direkt ausgeführt werden, um einen Benutzer mit allen verknüpften Daten
 * vollständig aus der Datenbank zu löschen.
 * 
 * Verwendung: node delete-user.mjs [userId]
 * Beispiel: node delete-user.mjs 6
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Umgebungsvariablen laden
dotenv.config();

// Datenbankverbindung
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Löscht einen Benutzer und alle verknüpften Daten
 */
async function deleteUser(userId) {
  console.log(`\n====== Starte Löschvorgang für Benutzer ID: ${userId} ======`);
  
  // Transaktion starten
  const client = await pool.connect();
  
  try {
    // Benutzerinformationen abrufen
    const userResult = await client.query('SELECT username, email FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      console.log(`❌ Benutzer mit ID ${userId} nicht gefunden.`);
      return false;
    }
    
    const user = userResult.rows[0];
    console.log(`ℹ️ Gefundener Benutzer: ${user.username} (${user.email})`);
    
    // Transaktion starten
    await client.query('BEGIN');
    
    // Temporär Fremdschlüsselprüfungen ausschalten für saubere Löschung
    await client.query('SET session_replication_role = replica');
    
    // 1. Kunden und deren abhängige Daten finden
    const customerResult = await client.query('SELECT id FROM customers WHERE user_id = $1', [userId]);
    const customerIds = customerResult.rows.map(c => c.id);
    console.log(`ℹ️ Gefundene Kunden: ${customerIds.length}`);
    
    let repairIds = [];
    if (customerIds.length > 0) {
      // 2. Reparaturen für diese Kunden finden
      const repairsQuery = {
        text: `SELECT id FROM repairs WHERE customer_id IN (${customerIds.map((_, i) => `$${i + 1}`).join(',')})`,
        values: customerIds
      };
      
      const repairsResult = await client.query(repairsQuery);
      repairIds = repairsResult.rows.map(r => r.id);
      console.log(`ℹ️ Gefundene Reparaturen: ${repairIds.length}`);
    }
    
    // 3. E-Mail-Verlauf für Reparaturen löschen
    if (repairIds.length > 0) {
      const emailHistoryQuery = {
        text: `DELETE FROM email_history WHERE "repairId" IN (${repairIds.map((_, i) => `$${i + 1}`).join(',')})`,
        values: repairIds
      };
      const emailResult = await client.query(emailHistoryQuery);
      console.log(`✅ E-Mail-Verlaufseinträge gelöscht: ${emailResult.rowCount}`);
      
      // 4. Kostenvoranschläge für Reparaturen löschen
      const costEstimatesQuery = {
        text: `DELETE FROM cost_estimates WHERE repair_id IN (${repairIds.map((_, i) => `$${i + 1}`).join(',')})`,
        values: repairIds
      };
      const costResult = await client.query(costEstimatesQuery);
      console.log(`✅ Kostenvoranschläge gelöscht: ${costResult.rowCount}`);
      
      // 5. Reparaturen löschen
      const repairsDeleteQuery = {
        text: `DELETE FROM repairs WHERE id IN (${repairIds.map((_, i) => `$${i + 1}`).join(',')})`,
        values: repairIds
      };
      const repairsDeleteResult = await client.query(repairsDeleteQuery);
      console.log(`✅ Reparaturen gelöscht: ${repairsDeleteResult.rowCount}`);
    }
    
    // 6. Kunden löschen
    const customerDeleteResult = await client.query('DELETE FROM customers WHERE user_id = $1', [userId]);
    console.log(`✅ Kunden gelöscht: ${customerDeleteResult.rowCount}`);
    
    // 7. Geschäftseinstellungen löschen
    const businessSettingsResult = await client.query('DELETE FROM business_settings WHERE user_id = $1', [userId]);
    console.log(`✅ Geschäftseinstellungen gelöscht: ${businessSettingsResult.rowCount}`);
    
    // 8. E-Mail-Vorlagen löschen
    const emailTemplatesResult = await client.query('DELETE FROM email_templates WHERE user_id = $1', [userId]);
    console.log(`✅ E-Mail-Vorlagen gelöscht: ${emailTemplatesResult.rowCount}`);
    
    // 9. Gerätespezifische Daten löschen
    const userModelsResult = await client.query('DELETE FROM user_models WHERE user_id = $1', [userId]);
    console.log(`✅ Gerätemodelle gelöscht: ${userModelsResult.rowCount}`);
    
    const userBrandsResult = await client.query('DELETE FROM user_brands WHERE user_id = $1', [userId]);
    console.log(`✅ Gerätemarken gelöscht: ${userBrandsResult.rowCount}`);
    
    const userDeviceTypesResult = await client.query('DELETE FROM user_device_types WHERE user_id = $1', [userId]);
    console.log(`✅ Gerätetypen gelöscht: ${userDeviceTypesResult.rowCount}`);
    
    // 10. Prüfen auf weitere mögliche Tabellen mit user_id
    try {
      await client.query('DELETE FROM feedback_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM feedback WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM superadmin_email_settings WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM hidden_standard_device_types WHERE user_id = $1', [userId]);
    } catch (err) {
      // Ignorieren, da nicht alle Tabellen existieren müssen
    }
    
    // 11. Benutzer selbst löschen
    const userDeleteResult = await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    if (userDeleteResult.rowCount === 0) {
      throw new Error('Benutzer konnte nicht gelöscht werden. Möglicherweise bestehen noch unbekannte Abhängigkeiten.');
    }
    
    // Fremdschlüsselprüfungen wiederherstellen
    await client.query('SET session_replication_role = origin');
    
    // Transaktion abschließen
    await client.query('COMMIT');
    
    console.log(`✅ Benutzer ${user.username} (ID: ${userId}) wurde erfolgreich gelöscht!`);
    return true;
  } catch (error) {
    // Bei Fehler Transaktion zurückrollen
    await client.query('ROLLBACK');
    console.error(`❌ Fehler beim Löschen des Benutzers ${userId}:`, error.message);
    return false;
  } finally {
    // Client zurück in den Pool
    client.release();
  }
}

// Hauptfunktion
async function main() {
  try {
    // Benutzer-ID aus Kommandozeilenargumenten holen
    const userId = parseInt(process.argv[2], 10);
    
    if (isNaN(userId)) {
      console.error('Bitte geben Sie eine gültige Benutzer-ID an.');
      console.log('Verwendung: node delete-user.mjs [userId]');
      process.exit(1);
    }
    
    await deleteUser(userId);
  } catch (error) {
    console.error('Unerwarteter Fehler:', error.message);
    process.exit(1);
  } finally {
    // Pool beenden, damit das Skript sauber endet
    await pool.end();
  }
}

// Programm starten
main();