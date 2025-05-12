/**
 * Dieses Modul synchronisiert die Standard-E-Mail-Vorlagen aus dem Code
 * mit der Datenbank, wenn sie noch nicht existieren.
 */
import { db } from "./db";
import { emailTemplates } from "@shared/schema";
import { and, eq, isNull } from "drizzle-orm";

// Standard E-Mail-Vorlagen aus superadmin-email-routes.ts
// Dies ist eine vereinfachte Version, nur damit wir auf die richtige Struktur zugreifen können
// Die eigentlichen Inhalte kommen aus der superadmin-email-routes.ts Datei
interface DefaultEmailTemplate {
  name: string;
  subject: string;
  body: string;
  variables: string[];
  type: 'app' | 'customer' | 'archived';
}

// Externe Liste der Standard-E-Mail-Vorlagen
import { defaultCustomerEmailTemplates } from "./superadmin-email-routes";

/**
 * Überprüft, ob in der Datenbank bereits globale E-Mail-Vorlagen existieren
 * (userId = null, shopId = 0).
 * Falls nicht, werden die Standard-Vorlagen aus dem Code in die DB eingefügt.
 */
export async function syncEmailTemplates(): Promise<void> {
  try {
    console.log("Prüfe, ob globale E-Mail-Vorlagen in der Datenbank existieren...");
    
    // Alle systemweiten Vorlagen abrufen (userId = null, shopId = 0)
    const systemTemplates = await db.select()
      .from(emailTemplates)
      .where(and(
        isNull(emailTemplates.userId),
        eq(emailTemplates.shopId, 0)
      ));
    
    if (systemTemplates.length === 0) {
      console.log("Keine globalen E-Mail-Vorlagen gefunden. Erstelle Standardvorlagen aus dem Code...");
      
      const now = new Date();
      
      // Alle Vorlagen aus dem Code in die Datenbank einfügen
      for (const template of defaultCustomerEmailTemplates) {
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          userId: null, // Globale Vorlage
          shopId: 0, // Systemweit
          createdAt: now,
          updatedAt: now,
          type: template.type
        });
        
        console.log(`Globale E-Mail-Vorlage '${template.name}' wurde in der Datenbank erstellt`);
      }
      
      console.log(`${defaultCustomerEmailTemplates.length} globale E-Mail-Vorlagen wurden erfolgreich erstellt`);
    } else {
      console.log(`${systemTemplates.length} globale E-Mail-Vorlagen existieren bereits in der Datenbank`);
    }
  } catch (error: any) {
    console.error(`Fehler bei der Synchronisierung der E-Mail-Vorlagen: ${error.message}`);
  }
}