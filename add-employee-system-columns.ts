import { db, pool } from './server/db';

async function addEmployeeSystemColumns() {
  try {
    console.log('Starte Migration: Hinzufügen der Mitarbeiter-System-Spalten...');

    // Check if role column exists
    const roleColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);

    if (roleColumnResult.rows.length === 0) {
      console.log('Füge role-Spalte zur users-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN role TEXT DEFAULT 'owner' NOT NULL
      `);
      console.log('role-Spalte erfolgreich hinzugefügt.');
    } else {
      console.log('Die role-Spalte existiert bereits.');
    }

    // Check if parent_user_id column exists
    const parentUserIdColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'parent_user_id'
    `);

    if (parentUserIdColumnResult.rows.length === 0) {
      console.log('Füge parent_user_id-Spalte zur users-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN parent_user_id INTEGER REFERENCES users(id)
      `);
      console.log('parent_user_id-Spalte erfolgreich hinzugefügt.');
    } else {
      console.log('Die parent_user_id-Spalte existiert bereits.');
    }

    // Check if permissions column exists
    const permissionsColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'permissions'
    `);

    if (permissionsColumnResult.rows.length === 0) {
      console.log('Füge permissions-Spalte zur users-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN permissions JSONB
      `);
      console.log('permissions-Spalte erfolgreich hinzugefügt.');
    } else {
      console.log('Die permissions-Spalte existiert bereits.');
    }

    // Check if first_name column exists
    const firstNameColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'first_name'
    `);

    if (firstNameColumnResult.rows.length === 0) {
      console.log('Füge first_name-Spalte zur users-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN first_name TEXT
      `);
      console.log('first_name-Spalte erfolgreich hinzugefügt.');
    } else {
      console.log('Die first_name-Spalte existiert bereits.');
    }

    // Check if last_name column exists
    const lastNameColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_name'
    `);

    if (lastNameColumnResult.rows.length === 0) {
      console.log('Füge last_name-Spalte zur users-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN last_name TEXT
      `);
      console.log('last_name-Spalte erfolgreich hinzugefügt.');
    } else {
      console.log('Die last_name-Spalte existiert bereits.');
    }

    // Jetzt Audit-Trail-Spalten für customers und repairs hinzufügen
    
    // Check if created_by column exists in customers table
    const customerCreatedByResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'created_by'
    `);

    if (customerCreatedByResult.rows.length === 0) {
      console.log('Füge created_by-Spalte zur customers-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE customers 
        ADD COLUMN created_by TEXT
      `);
      console.log('created_by-Spalte in customers-Tabelle erfolgreich hinzugefügt.');
    } else {
      console.log('Die created_by-Spalte in customers-Tabelle existiert bereits.');
    }

    // Check if created_by column exists in repairs table
    const repairCreatedByResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repairs' AND column_name = 'created_by'
    `);

    if (repairCreatedByResult.rows.length === 0) {
      console.log('Füge created_by-Spalte zur repairs-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE repairs 
        ADD COLUMN created_by TEXT
      `);
      console.log('created_by-Spalte in repairs-Tabelle erfolgreich hinzugefügt.');
    } else {
      console.log('Die created_by-Spalte in repairs-Tabelle existiert bereits.');
    }

    // Check if changed_by column exists in repair_status_history table
    const historyChangedByResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repair_status_history' AND column_name = 'changed_by'
    `);

    if (historyChangedByResult.rows.length === 0) {
      console.log('Füge changed_by-Spalte zur repair_status_history-Tabelle hinzu...');
      await pool.query(`
        ALTER TABLE repair_status_history 
        ADD COLUMN changed_by TEXT
      `);
      console.log('changed_by-Spalte in repair_status_history-Tabelle erfolgreich hinzugefügt.');
    } else {
      console.log('Die changed_by-Spalte in repair_status_history-Tabelle existiert bereits.');
    }

    console.log('Migration für Mitarbeiter-System-Spalten erfolgreich abgeschlossen.');
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Mitarbeiter-System-Spalten:', error);
    throw error;
  }
}

// Führe die Migration aus, wenn das Skript direkt ausgeführt wird
if (import.meta.url === `file://${process.argv[1]}`) {
  addEmployeeSystemColumns()
    .then(() => {
      console.log('Migration erfolgreich abgeschlossen.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration fehlgeschlagen:', error);
      process.exit(1);
    });
}

export { addEmployeeSystemColumns };