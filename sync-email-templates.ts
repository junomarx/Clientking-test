/**
 * Dieses Skript synchronisiert die globalen E-Mail-Vorlagen in der Datenbank
 * mit den aktuellen Vorlagen aus dem Code.
 */

import { pool } from "./server/db";
import { eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./shared/schema";
import { defaultAppEmailTemplates, defaultCustomerEmailTemplates } from "./server/superadmin-email-routes";

const db = drizzle(pool, { schema });

async function syncEmailTemplates() {
  try {
    // Umgebung initialisieren
    console.log("Synchronisiere E-Mail-Vorlagen...");
    
    // Lösche alle globalen E-Mail-Vorlagen (userId = null, shopId = 0)
    await db.delete(schema.emailTemplates)
      .where(isNull(schema.emailTemplates.userId));
    
    console.log("Alle globalen Vorlagen wurden gelöscht.");
    
    // Füge App-Vorlagen hinzu
    for (const template of defaultAppEmailTemplates) {
      await db.insert(schema.emailTemplates).values({
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        type: template.type,
        userId: null,
        shopId: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`App-Vorlage '${template.name}' wurde erstellt.`);
    }
    
    // Füge Kunden-Vorlagen hinzu
    for (const template of defaultCustomerEmailTemplates) {
      await db.insert(schema.emailTemplates).values({
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        type: template.type,
        userId: null,
        shopId: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Kunden-Vorlage '${template.name}' wurde erstellt.`);
    }
    
    console.log("E-Mail-Vorlagen-Synchronisation abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Synchronisierung der E-Mail-Vorlagen:", error);
  } finally {
    // Verbindung schließen
    await pool.end();
  }
}

// Führe die Synchronisation aus
syncEmailTemplates();