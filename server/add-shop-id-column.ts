/**
 * Dieses Skript fügt die shopId-Spalte zu allen relevanten Tabellen hinzu
 * um die mandantenfähige Shop-Isolation zu ermöglichen
 */

import { sql } from 'drizzle-orm';
import { db } from './db';

export async function addShopIdColumn() {
  try {
    console.log('Starte Migration: Hinzufügen der shopId-Spalte...');

    // Prüfen, ob die Spalte bereits existiert in der users-Tabelle
    const userColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'shop_id'
    `);
    
    // Wenn die Spalte nicht existiert, füge sie hinzu
    if (userColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur users-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE users ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der users-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für customers hinzufügen
    const customerColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND column_name = 'shop_id'
    `);
    
    if (customerColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur customers-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE customers ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der customers-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für repairs hinzufügen
    const repairsColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'repairs' AND column_name = 'shop_id'
    `);
    
    if (repairsColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur repairs-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE repairs ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der repairs-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für business_settings hinzufügen
    const businessSettingsColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_settings' AND column_name = 'shop_id'
    `);
    
    if (businessSettingsColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur business_settings-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE business_settings ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der business_settings-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für email_templates hinzufügen
    const emailTemplatesColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_templates' AND column_name = 'shop_id'
    `);
    
    if (emailTemplatesColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur email_templates-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE email_templates ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der email_templates-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für email_history hinzufügen
    const emailHistoryColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_history' AND column_name = 'shop_id'
    `);
    
    if (emailHistoryColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur email_history-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE email_history ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der email_history-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für user_device_types hinzufügen
    const userDeviceTypesColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_device_types' AND column_name = 'shop_id'
    `);
    
    if (userDeviceTypesColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur user_device_types-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE user_device_types ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der user_device_types-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für user_brands hinzufügen
    const userBrandsColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_brands' AND column_name = 'shop_id'
    `);
    
    if (userBrandsColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur user_brands-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE user_brands ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der user_brands-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für user_model_series hinzufügen
    const userModelSeriesColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_model_series' AND column_name = 'shop_id'
    `);
    
    if (userModelSeriesColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur user_model_series-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE user_model_series ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der user_model_series-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für user_models hinzufügen
    const userModelsColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_models' AND column_name = 'shop_id'
    `);
    
    if (userModelsColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur user_models-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE user_models ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der user_models-Tabelle existiert bereits.');
    }

    // Prüfen und Spalte für cost_estimates hinzufügen
    const costEstimatesColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cost_estimates' AND column_name = 'shop_id'
    `);
    
    if (costEstimatesColumns.rows.length === 0) {
      console.log('Füge shop_id-Spalte zur cost_estimates-Tabelle hinzu...');
      await db.execute(sql`ALTER TABLE cost_estimates ADD COLUMN shop_id INTEGER DEFAULT 1`);
    } else {
      console.log('Die shop_id-Spalte in der cost_estimates-Tabelle existiert bereits.');
    }

    // Prüfen, ob die feedbacks-Tabelle existiert
    const feedbacksTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'feedbacks'
    `);
    
    if (feedbacksTable.rows.length > 0) {
      // Nur wenn die Tabelle existiert, Spalte hinzufügen
      const feedbacksColumns = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'feedbacks' AND column_name = 'shop_id'
      `);
      
      if (feedbacksColumns.rows.length === 0) {
        console.log('Füge shop_id-Spalte zur feedbacks-Tabelle hinzu...');
        await db.execute(sql`ALTER TABLE feedbacks ADD COLUMN shop_id INTEGER DEFAULT 1`);
      } else {
        console.log('Die shop_id-Spalte in der feedbacks-Tabelle existiert bereits.');
      }
    } else {
      console.log('Die feedbacks-Tabelle existiert nicht, überspringe...');
    }

    // Admin-Rechte Migration wurde entfernt da is_admin Spalte gelöscht wurde

    console.log('Shop-ID Migration erfolgreich abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    throw error;
  }
}
