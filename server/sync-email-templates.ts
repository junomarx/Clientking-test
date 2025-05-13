/**
 * Dieses Modul synchronisiert die Standard-E-Mail-Vorlagen aus dem Code
 * mit der Datenbank, wenn sie noch nicht existieren.
 */
import { db } from "./db";
import { emailTemplates } from "@shared/schema";
import { and, eq, isNull } from "drizzle-orm";
import { emailService } from "./email-service";

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

// Externe Listen der Standard-E-Mail-Vorlagen
import { defaultCustomerEmailTemplates, defaultAppEmailTemplates } from "./superadmin-email-routes";

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
    
    const appTemplatesCount = systemTemplates.filter(t => t.type === 'app').length;
    const customerTemplatesCount = systemTemplates.filter(t => t.type === 'customer').length;
    
    const now = new Date();
    
    // Überprüfe und erstelle App-Vorlagen
    if (appTemplatesCount === 0) {
      console.log("Keine globalen App-Vorlagen gefunden. Erstelle App-Vorlagen aus dem Code...");
      
      // Alle App-Vorlagen aus dem Code in die Datenbank einfügen
      for (const template of defaultAppEmailTemplates) {
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          userId: null, // Globale Vorlage
          shopId: 0, // Systemweit
          createdAt: now,
          updatedAt: now,
          type: 'app'
        });
        
        console.log(`Globale App-E-Mail-Vorlage '${template.name}' wurde in der Datenbank erstellt`);
      }
    } else {
      console.log(`${appTemplatesCount} globale App-Vorlagen gefunden.`);
    }
    
    // Überprüfe und erstelle Kunden-Vorlagen
    if (customerTemplatesCount === 0) {
      console.log("Keine globalen Kunden-Vorlagen gefunden. Erstelle Kunden-Vorlagen aus dem Code...");
      
      // Alle Kunden-Vorlagen aus dem Code in die Datenbank einfügen
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
          type: 'customer'
        });
        
        console.log(`Globale Kunden-E-Mail-Vorlage '${template.name}' wurde in der Datenbank erstellt`);
      }
    } else {
      console.log(`${customerTemplatesCount} globale Kunden-Vorlagen gefunden.`);
    }
    
    console.log("E-Mail-Vorlagen-Synchronisation abgeschlossen.");
    
    // Bereinige redundante E-Mail-Vorlagen (z.B. "Reparatur abgeschlossen" vs. "Reparatur abholbereit")
    try {
      console.log("Bereinige redundante E-Mail-Vorlagen...");
      await emailService.cleanupRedundantTemplates(null); // Globale Vorlagen
      console.log("Bereinigung redundanter E-Mail-Vorlagen abgeschlossen.");
    } catch (cleanupError: any) {
      console.error(`Fehler bei der Bereinigung redundanter E-Mail-Vorlagen: ${cleanupError.message}`);
    }
  } catch (error: any) {
    console.error(`Fehler bei der Synchronisierung der E-Mail-Vorlagen: ${error.message}`);
  }
}