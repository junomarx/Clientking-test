/**
 * Hilfsskript zum sicheren Löschen eines Benutzers mit allen verknüpften Daten
 */

import { pool } from './server/db.js';

const userId = process.argv[2];

if (!userId || isNaN(parseInt(userId))) {
  console.error('Bitte geben Sie eine gültige Benutzer-ID als Argument an');
  process.exit(1);
}

async function deleteUser(id) {
  const client = await pool.connect();
  
  try {
    // Transaktion starten
    await client.query('BEGIN');
    
    console.log(`Starte Löschvorgang für Benutzer mit ID ${id}...`);
    
    // 1. Finde alle Kunden dieses Benutzers
    const { rows: customers } = await client.query(
      'SELECT id FROM customers WHERE "userId" = $1',
      [id]
    );
    
    const customerIds = customers.map(c => c.id);
    console.log(`Gefundene Kunden: ${customerIds.length}`);
    
    if (customerIds.length > 0) {
      // 2. Finde alle Reparaturen dieser Kunden
      const { rows: repairs } = await client.query(
        'SELECT id FROM repairs WHERE "customerId" IN (' + customerIds.map((_, i) => `$${i+1}`).join(',') + ')',
        customerIds
      );
      
      const repairIds = repairs.map(r => r.id);
      console.log(`Gefundene Reparaturen: ${repairIds.length}`);
      
      // 3. Lösche verknüpfte Daten zu Reparaturen
      if (repairIds.length > 0) {
        // Lösche Kosten-Schätzungen
        await client.query(
          'DELETE FROM cost_estimates WHERE "repairId" IN (' + repairIds.map((_, i) => `$${i+1}`).join(',') + ')',
          repairIds
        );
        console.log('Kosten-Schätzungen gelöscht');
        
        // Lösche Email-History
        await client.query(
          'DELETE FROM email_history WHERE "repairId" IN (' + repairIds.map((_, i) => `$${i+1}`).join(',') + ')',
          repairIds
        );
        console.log('Email-History gelöscht');
        
        // Lösche Reparaturen
        await client.query(
          'DELETE FROM repairs WHERE id IN (' + repairIds.map((_, i) => `$${i+1}`).join(',') + ')',
          repairIds
        );
        console.log('Reparaturen gelöscht');
      }
      
      // 4. Lösche Kunden
      await client.query(
        'DELETE FROM customers WHERE "userId" = $1',
        [id]
      );
      console.log('Kunden gelöscht');
    }
    
    // 5. Lösche Geschäftseinstellungen des Benutzers
    await client.query(
      'DELETE FROM business_settings WHERE "userId" = $1',
      [id]
    );
    console.log('Geschäftseinstellungen gelöscht');
    
    // 6. Lösche Email-Vorlagen des Benutzers
    await client.query(
      'DELETE FROM email_templates WHERE "userId" = $1',
      [id]
    );
    console.log('Email-Vorlagen gelöscht');
    
    // 7. Lösche Gerätetypen des Benutzers
    await client.query(
      'DELETE FROM user_device_types WHERE "userId" = $1',
      [id]
    );
    console.log('Gerätetypen gelöscht');
    
    // 8. Lösche Marken des Benutzers
    await client.query(
      'DELETE FROM user_brands WHERE "userId" = $1',
      [id]
    );
    console.log('Marken gelöscht');
    
    // 9. Lösche Modelle des Benutzers
    await client.query(
      'DELETE FROM user_models WHERE "userId" = $1',
      [id]
    );
    console.log('Modelle gelöscht');
    
    // 10. Lösche Shop des Benutzers
    await client.query(
      'DELETE FROM shops WHERE "userId" = $1',
      [id]
    );
    console.log('Shop gelöscht');

    // 11. Lösche versteckte Standard-Gerätetypen
    await client.query(
      'DELETE FROM hidden_standard_device_types WHERE "userId" = $1',
      [id]
    );
    console.log('Versteckte Standard-Gerätetypen gelöscht');
    
    // 12. Lösche den Benutzer selbst
    await client.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    console.log('Benutzer gelöscht');
    
    // Transaktion erfolgreich abschließen
    await client.query('COMMIT');
    
    console.log(`Benutzer mit ID ${id} wurde erfolgreich gelöscht`);
    return true;
  } catch (error) {
    // Bei Fehler: Transaktion zurückrollen
    await client.query('ROLLBACK');
    console.error('Fehler beim Löschen des Benutzers:', error);
    return false;
  } finally {
    client.release();
  }
}

// Führe die Löschung aus
deleteUser(parseInt(userId))
  .then(success => {
    if (success) {
      console.log('Löschvorgang erfolgreich abgeschlossen.');
    } else {
      console.error('Löschvorgang fehlgeschlagen.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unerwarteter Fehler:', err);
    process.exit(1);
  });