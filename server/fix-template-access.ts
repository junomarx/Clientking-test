/**
 * Dieses Modul verbessert den Zugriff auf E-Mail- und Druckvorlagen
 * Stellt sicher, dass alle Benutzer sowohl auf ihre eigenen als auch auf globale Vorlagen
 * zugreifen können.
 */

import { emailTemplates, printTemplates } from "@shared/schema";
import { db } from "./db";
import { eq, or, isNull } from "drizzle-orm";

/**
 * Prüft, ob eine E-Mail-Vorlage global ist oder dem Benutzer gehört
 */
export async function isEmailTemplateAccessible(templateId: number, userId: number): Promise<boolean> {
  const template = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, templateId)
  });

  if (!template) return false;

  // Superadmin-Vorlagen (Shop-ID 10) oder Vorlagen ohne Benutzer sind für alle sichtbar
  if (template.userId === 10 || template.userId === null) return true;

  // Eigene Vorlagen des Benutzers sind immer sichtbar
  return template.userId === userId;
}

/**
 * Holt alle E-Mail-Vorlagen, die für einen Benutzer zugänglich sind
 * (eigene Vorlagen und globale Vorlagen)
 */
export async function getAccessibleEmailTemplates(userId: number) {
  try {
    const templates = await db.query.emailTemplates.findMany({
      where: or(
        eq(emailTemplates.userId, userId),
        eq(emailTemplates.userId, 10),  // Superadmin-Vorlagen
        isNull(emailTemplates.userId)   // Vorlagen ohne Benutzer
      )
    });
    
    return templates;
  } catch (error) {
    console.error("Fehler beim Abrufen der E-Mail-Vorlagen:", error);
    return [];
  }
}

/**
 * Holt alle Druckvorlagen, die für einen Benutzer zugänglich sind
 * (eigene Vorlagen und globale Vorlagen)
 */
export async function getAccessiblePrintTemplates(userId: number) {
  try {
    const templates = await db.query.printTemplates.findMany({
      where: or(
        eq(printTemplates.userId, userId),
        eq(printTemplates.userId, 10),   // Superadmin-Vorlagen
        isNull(printTemplates.userId)    // Vorlagen ohne Benutzer
      )
    });
    
    return templates;
  } catch (error) {
    console.error("Fehler beim Abrufen der Druckvorlagen:", error);
    return [];
  }
}

/**
 * Überprüft und repariert alle Vorlagen-Berechtigungen
 */
export async function repairTemplateAccess() {
  try {
    // Aktualisiere alle Vorlagen vom Superadmin als global
    try {
      // Verwende einen direkteren Ansatz, der die Spaltenattribute umgeht
      try {
        await db.execute(`
          ALTER TABLE email_templates 
          ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false
        `);
        console.log("✅ is_global-Spalte zur email_templates-Tabelle hinzugefügt");
      } catch (error) {
        console.log("ℹ️ is_global-Spalte in email_templates existiert bereits oder kann nicht erstellt werden");
      }
      
      try {
        await db.execute(`
          ALTER TABLE print_templates 
          ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false
        `);
        console.log("✅ is_global-Spalte zur print_templates-Tabelle hinzugefügt");
      } catch (error) {
        console.log("ℹ️ is_global-Spalte in print_templates existiert bereits oder kann nicht erstellt werden");
      }
      
      // Markiere alle globalen Vorlagen
      await db.execute(`
        UPDATE email_templates 
        SET is_global = true 
        WHERE user_id = 10 OR user_id IS NULL
      `);
      
      await db.execute(`
        UPDATE print_templates 
        SET is_global = true 
        WHERE user_id = 10 OR user_id IS NULL
      `);
      
      console.log("✅ Globaler Zugriff auf alle Vorlagen aktiviert");
    } catch (error) {
      console.error("❌ Fehler beim Setzen globaler Vorlagen:", error);
    }
  } catch (error) {
    console.error("Fehler bei der Reparatur der Vorlagen-Berechtigungen:", error);
  }
}