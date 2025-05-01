import { pool } from './db';

async function addSecondSignatureColumns() {
  try {
    // Verbindung zur Datenbank herstellen
    const client = await pool.connect();
    
    try {
      // Prüfen, ob die Spalte bereits existiert
      const checkColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'repairs' 
        AND column_name = 'pickup_signature'
      `;
      
      const columnCheck = await client.query(checkColumnQuery);
      
      if (columnCheck.rows.length === 0) {
        console.log('Füge pickup_signature und pickup_signed_at Spalten hinzu...');
        
        // Spalten für die zweite Unterschrift hinzufügen
        const alterTableQuery = `
          ALTER TABLE repairs 
          ADD COLUMN pickup_signature TEXT,
          ADD COLUMN pickup_signed_at TIMESTAMP;
          
          -- Umbenennen der bestehenden Spalten für Klarheit
          ALTER TABLE repairs 
          RENAME COLUMN customer_signature TO dropoff_signature;
          
          ALTER TABLE repairs 
          RENAME COLUMN signed_at TO dropoff_signed_at;
        `;
        
        await client.query(alterTableQuery);
        console.log('Spalten wurden erfolgreich hinzugefügt!');
      } else {
        console.log('Die Spalten existieren bereits. Keine Änderungen vorgenommen.');
      }
    } finally {
      // Client zur Pool zurückgeben
      client.release();
    }
    
    console.log('Datenbankaktualisierung abgeschlossen.');
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Spalten:', error);
    throw error;
  }
}

// Führe die Funktion aus
addSecondSignatureColumns()
  .then(() => console.log('Script erfolgreich ausgeführt'))
  .catch((err) => console.error('Script fehlgeschlagen:', err));
