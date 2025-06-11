/**
 * Migrationsskript zur Erstellung der spare_parts Tabelle für Ersatzteil-Management
 */

import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function createSparePartsTable() {
  try {
    console.log('Erstelle spare_parts Tabelle...');
    
    // Prüfe ob Tabelle bereits existiert
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'spare_parts'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('spare_parts Tabelle existiert bereits');
      return;
    }
    
    // Erstelle spare_parts Tabelle
    await pool.query(`
      CREATE TABLE spare_parts (
        id SERIAL PRIMARY KEY,
        repair_id INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
        part_name TEXT NOT NULL,
        supplier TEXT,
        cost DOUBLE PRECISION,
        status TEXT NOT NULL DEFAULT 'bestellen',
        order_date TIMESTAMP,
        delivery_date TIMESTAMP,
        notes TEXT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        shop_id INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Index für bessere Performance
    await pool.query(`
      CREATE INDEX idx_spare_parts_repair_id ON spare_parts(repair_id);
      CREATE INDEX idx_spare_parts_user_id ON spare_parts(user_id);
      CREATE INDEX idx_spare_parts_shop_id ON spare_parts(shop_id);
      CREATE INDEX idx_spare_parts_status ON spare_parts(status);
    `);
    
    console.log('spare_parts Tabelle erfolgreich erstellt');
    
  } catch (error) {
    console.error('Fehler beim Erstellen der spare_parts Tabelle:', error);
    throw error;
  }
}

async function main() {
  try {
    await createSparePartsTable();
    console.log('Migration abgeschlossen');
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

export { createSparePartsTable };