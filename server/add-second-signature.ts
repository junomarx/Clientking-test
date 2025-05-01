import { pool } from './db';

async function addSecondSignatureColumns() {
  try {
    console.log('Starte Migration: Hinzufügen von Spalten für zweite Unterschrift...');
    
    // Verbindung zur Datenbank herstellen
    const client = await pool.connect();
    
    try {
      // Überprüfen, ob die 'customerSignature'-Spalte existiert
      const checkCustomerSignatureQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'repairs' AND column_name = 'customer_signature';
      `;
      
      const customerSignatureResult = await client.query(checkCustomerSignatureQuery);
      const hasCustomerSignature = customerSignatureResult.rows.length > 0;
      
      // Wenn die alte Spalte existiert, sie umbenennen und die neuen Spalten hinzufügen
      if (hasCustomerSignature) {
        console.log('Die Spalte "customer_signature" existiert und wird umbenannt in "dropoff_signature"');
        
        await client.query(`
          -- Umbenennen der alten Spalte in dropoff_signature 
          ALTER TABLE repairs RENAME COLUMN customer_signature TO dropoff_signature;
        `);
        
        await client.query(`
          -- Umbenennen der alten Spalte signed_at in dropoff_signed_at
          ALTER TABLE repairs RENAME COLUMN signed_at TO dropoff_signed_at;
        `);
      } else {
        // Wenn die Spalten nicht existieren, neue Spalten für Abgabe-Unterschrift hinzufügen
        console.log('Füge neue Spalten für Abgabe-Unterschrift hinzu...');
        
        await client.query(`
          -- Hinzufügen der Spalte für Abgabe-Unterschrift
          ALTER TABLE repairs ADD COLUMN IF NOT EXISTS dropoff_signature TEXT;
        `);
        
        await client.query(`
          -- Hinzufügen der Spalte für Abgabe-Unterschrift Zeitstempel
          ALTER TABLE repairs ADD COLUMN IF NOT EXISTS dropoff_signed_at TIMESTAMPTZ;
        `);
      }
      
      // Überprüfen, ob die 'pickup_signature'-Spalte existiert
      const checkPickupSignatureQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'repairs' AND column_name = 'pickup_signature';
      `;
      
      const pickupSignatureResult = await client.query(checkPickupSignatureQuery);
      const hasPickupSignature = pickupSignatureResult.rows.length > 0;
      
      // Spalten für Abholungs-Unterschrift hinzufügen, wenn sie noch nicht existieren
      if (!hasPickupSignature) {
        console.log('Füge neue Spalten für Abholungs-Unterschrift hinzu...');
        
        await client.query(`
          -- Hinzufügen der Spalte für Abholungs-Unterschrift
          ALTER TABLE repairs ADD COLUMN pickup_signature TEXT;
        `);
        
        await client.query(`
          -- Hinzufügen der Spalte für Abholungs-Unterschrift Zeitstempel
          ALTER TABLE repairs ADD COLUMN pickup_signed_at TIMESTAMPTZ;
        `);
      } else {
        console.log('Die Spalten für Abholungs-Unterschrift existieren bereits.');
      }
      
      console.log('Migration für zweite Unterschrift erfolgreich abgeschlossen.');
    } finally {
      // Verbindung trennen
      client.release();
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Spalten für die zweite Unterschrift:', error);
    throw error;
  }
}

// Exportieren wir die Funktion, damit sie aus index.ts aufgerufen werden kann
export default addSecondSignatureColumns;
