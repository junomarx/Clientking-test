/**
 * Direktes SQL-Skript zur Ausführung des Löschvorgangs
 */

import { pool } from './server/db.js';

async function runSQL() {
  const client = await pool.connect();

  try {
    // SQL-Befehl zum Löschen des Benutzers mit ID 20
    const sql = `
    DO $$
    DECLARE
      delete_user_id INT := 20;
      customer_ids INT[];
      repair_ids INT[];
    BEGIN
      -- Finde alle Kunden-IDs des Benutzers
      SELECT ARRAY(SELECT id FROM customers WHERE "userId" = delete_user_id) INTO customer_ids;
      RAISE NOTICE 'Gefundene Kunden: %', array_length(customer_ids, 1);
      
      -- Finde alle Reparatur-IDs dieser Kunden
      IF array_length(customer_ids, 1) > 0 THEN
        SELECT ARRAY(SELECT id FROM repairs WHERE "customerId" = ANY(customer_ids)) INTO repair_ids;
        RAISE NOTICE 'Gefundene Reparaturen: %', array_length(repair_ids, 1);
        
        -- Lösche alle abhängigen Daten
        IF array_length(repair_ids, 1) > 0 THEN
          DELETE FROM cost_estimates WHERE "repairId" = ANY(repair_ids);
          DELETE FROM email_history WHERE "repairId" = ANY(repair_ids);
          DELETE FROM repairs WHERE id = ANY(repair_ids);
        END IF;
        
        -- Lösche alle Kunden
        DELETE FROM customers WHERE "userId" = delete_user_id;
      END IF;
      
      -- Lösche weitere Benutzerdaten
      DELETE FROM business_settings WHERE "userId" = delete_user_id;
      DELETE FROM email_templates WHERE "userId" = delete_user_id;
      DELETE FROM user_device_types WHERE "userId" = delete_user_id;
      DELETE FROM user_brands WHERE "userId" = delete_user_id;
      DELETE FROM user_models WHERE "userId" = delete_user_id;
      DELETE FROM hidden_standard_device_types WHERE "userId" = delete_user_id;

      -- Lösche den Shop
      DELETE FROM shops WHERE "userId" = delete_user_id;
      
      -- Lösche den Benutzer selbst
      DELETE FROM users WHERE id = delete_user_id;
      RAISE NOTICE 'Benutzer mit ID % wurde erfolgreich gelöscht', delete_user_id;
    END $$;
    `;
    
    await client.query(sql);
    console.log('SQL-Befehl erfolgreich ausgeführt');
    return true;
  } catch (error) {
    console.error('Fehler bei der Ausführung des SQL-Befehls:', error);
    return false;
  } finally {
    client.release();
  }
}

runSQL()
  .then(success => {
    console.log(success ? 'Löschvorgang erfolgreich' : 'Löschvorgang fehlgeschlagen');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unerwarteter Fehler:', err);
    process.exit(1);
  });