/**
 * Fix für Benutzerrechte und globalen Vorlagenzugriff
 * Stellt sicher, dass alle Benutzer Zugriff auf die globalen Vorlagen haben
 */

import { db } from "./db";
import { users, emailTemplates, printTemplates } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function fixBugiAdminRights() {
  console.log("🛠️ Stelle Benutzerrechte wieder her und aktiviere Zugriff auf globale Vorlagen...");
  
  // 1. Repariere Admin-Rechte für Benutzer bugi
  const bugiResults = await db.select().from(users).where(eq(users.username, "bugi"));
  
  if (bugiResults.length > 0) {
    const bugi = bugiResults[0];
    await db
      .update(users)
      .set({
        isAdmin: true,           // Admin-Rechte setzen
        shopId: 1,               // Shop-ID 1 zuweisen
        isSuperadmin: false,     // Kein Superadmin
        pricingPlan: "enterprise", // Enterprise Plan
      })
      .where(eq(users.id, bugi.id));
    
    console.log(`✅ Admin-Rechte für bugi (ID: ${bugi.id}) wurden wiederhergestellt`);
  }
  
  // 2. Stelle sicher, dass alle globalen Vorlagen verfügbar sind
  try {
    // Markiere alle globalen Vorlagen als für alle sichtbar
    await db.execute(sql`
      UPDATE email_templates 
      SET is_global = true 
      WHERE user_id = 10 OR user_id IS NULL
    `);
    
    await db.execute(sql`
      UPDATE print_templates 
      SET is_global = true 
      WHERE user_id = 10 OR user_id IS NULL
    `);
    
    console.log(`✅ Globaler Zugriff auf alle Vorlagen aktiviert`);
  } catch (error) {
    console.error("❌ Fehler bei der Aktualisierung der globalen Vorlagen:", error);
  }
  
  // 3. Verhindere, dass Nutzern die Admin-Rechte versehentlich entzogen werden
  try {
    // Setze alle vorhandenen User auf 'active' und erhalte Admin-Rechte
    await db.execute(sql`
      UPDATE users
      SET is_active = true
      WHERE is_active IS NULL OR is_active = false
    `);
    
    console.log(`✅ Alle Benutzerkonten wurden aktiviert`);
  } catch (error) {
    console.error("❌ Fehler bei der Aktivierung der Benutzerkonten:", error);
  }
}