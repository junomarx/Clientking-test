/**
 * Dieses Skript fügt die neuen Spalten für die benutzerdefinierte Dokumentenvorlagen,
 * QR-Code-Einstellungen und benutzerdefinierten Fußnoten zur business_settings-Tabelle hinzu
 */

import { db, pool } from "./db";
import { sql } from "drizzle-orm";

export async function addDocumentPrintSettings() {
  try {
    console.log("Starte Migration: Hinzufügen von erweiterten Druckeinstellungen...");
    
    // Überprüfe, ob die document_templates-Spalte bereits existiert
    const checkDocumentTemplatesColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'business_settings' AND column_name = 'document_templates'
    `);
    
    if (checkDocumentTemplatesColumn.rows.length === 0) {
      console.log("Füge document_templates-Spalte hinzu...");
      await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS document_templates TEXT[]`);
    } else {
      console.log("Die document_templates-Spalte existiert bereits.");
    }
    
    // Überprüfe, ob die qr_code_enabled-Spalte bereits existiert
    const checkQrCodeEnabledColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'business_settings' AND column_name = 'qr_code_enabled'
    `);
    
    if (checkQrCodeEnabledColumn.rows.length === 0) {
      console.log("Füge qr_code_enabled-Spalte hinzu...");
      await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS qr_code_enabled BOOLEAN DEFAULT FALSE`);
    } else {
      console.log("Die qr_code_enabled-Spalte existiert bereits.");
    }
    
    // Überprüfe, ob die qr_code_type-Spalte bereits existiert
    const checkQrCodeTypeColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'business_settings' AND column_name = 'qr_code_type'
    `);
    
    if (checkQrCodeTypeColumn.rows.length === 0) {
      console.log("Füge qr_code_type-Spalte hinzu...");
      await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS qr_code_type TEXT DEFAULT 'repair_status'`);
    } else {
      console.log("Die qr_code_type-Spalte existiert bereits.");
    }
    
    // Überprüfe, ob die qr_code_content-Spalte bereits existiert
    const checkQrCodeContentColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'business_settings' AND column_name = 'qr_code_content'
    `);
    
    if (checkQrCodeContentColumn.rows.length === 0) {
      console.log("Füge qr_code_content-Spalte hinzu...");
      await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS qr_code_content TEXT`);
    } else {
      console.log("Die qr_code_content-Spalte existiert bereits.");
    }
    
    // Überprüfe, ob die custom_footer_text-Spalte bereits existiert
    const checkFooterTextColumn = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'business_settings' AND column_name = 'custom_footer_text'
    `);
    
    if (checkFooterTextColumn.rows.length === 0) {
      console.log("Füge custom_footer_text-Spalte hinzu...");
      await pool.query(`ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS custom_footer_text TEXT`);
    } else {
      console.log("Die custom_footer_text-Spalte existiert bereits.");
    }
    
    console.log("Migration für Druckeinstellungen erfolgreich abgeschlossen.");
    return true;
  } catch (error) {
    console.error("Fehler bei der Migration:", error);
    return false;
  }
}
