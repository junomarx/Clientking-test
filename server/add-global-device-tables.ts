/**
 * Dieses Skript erstellt die Tabellen für die globale Geräteverwaltung
 */

import { sql } from 'drizzle-orm';
import { db } from './db';

// Funktion zum Ausführen der Migrationen
export async function addGlobalDeviceTables() {
  try {
    console.log('Starte Migration: Hinzufügen der globalen Gerätetabellen...');

    // global_device_types-Tabelle erstellen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_device_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        is_global BOOLEAN NOT NULL DEFAULT TRUE,
        user_id INTEGER REFERENCES users(id),
        shop_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('global_device_types-Tabelle erstellt.');

    // global_device_brands-Tabelle erstellen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_device_brands (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        is_global BOOLEAN NOT NULL DEFAULT TRUE,
        user_id INTEGER REFERENCES users(id),
        shop_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('global_device_brands-Tabelle erstellt.');

    // global_device_models-Tabelle erstellen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_device_models (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        device_type TEXT NOT NULL,
        is_global BOOLEAN NOT NULL DEFAULT TRUE,
        user_id INTEGER REFERENCES users(id),
        shop_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('global_device_models-Tabelle erstellt.');

    // Die device_issues-Tabelle aktualisieren, um die neuen Felder hinzuzufügen
    // Zuerst prüfen, ob die Spalten bereits existieren
    const deviceIssuesColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'device_issues' AND column_name IN ('is_global', 'user_id', 'shop_id')
    `);
    const deviceIssuesColumns = deviceIssuesColumnsResult.rows.map(row => row.column_name);

    if (!deviceIssuesColumns.includes('is_global')) {
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT TRUE`);
      console.log('is_global-Spalte zur device_issues-Tabelle hinzugefügt.');
    }

    if (!deviceIssuesColumns.includes('user_id')) {
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN user_id INTEGER REFERENCES users(id)`);
      console.log('user_id-Spalte zur device_issues-Tabelle hinzugefügt.');
    }

    if (!deviceIssuesColumns.includes('shop_id')) {
      await db.execute(sql`ALTER TABLE device_issues ADD COLUMN shop_id INTEGER`);
      console.log('shop_id-Spalte zur device_issues-Tabelle hinzugefügt.');
    }

    console.log('Migration für globale Gerätetabellen erfolgreich abgeschlossen.');
  } catch (error) {
    console.error('Fehler beim Erstellen der globalen Gerätetabellen:', error);
    throw error;
  }
}
