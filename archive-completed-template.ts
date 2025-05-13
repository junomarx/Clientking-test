/**
 * Dieses Skript archiviert die redundante "Reparatur abgeschlossen" Vorlage
 * und stellt sicher, dass "Reparatur abholbereit" als Standard verwendet wird.
 */

import { db } from "./server/db";
import { emailTemplates, emailHistory } from "./shared/schema";
import { eq, and, desc, SQL } from "drizzle-orm";

// Diese Funktion archiviert die "Reparatur abgeschlossen" Vorlage für einen bestimmten Benutzer
async function archiveCompletedTemplate(userId: number) {
  try {
    console.log(`Archiviere "Reparatur abgeschlossen" Vorlage für Benutzer ${userId}...`);
    
    // Die problematische Vorlage finden
    const templates = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.userId, userId),
          eq(emailTemplates.name, "Reparatur abgeschlossen")
        )
      );
    
    if (templates.length === 0) {
      console.log(`Keine "Reparatur abgeschlossen" Vorlage für Benutzer ${userId} gefunden.`);
      return;
    }
    
    console.log(`Gefunden: ${templates.length} "Reparatur abgeschlossen" Vorlagen für Benutzer ${userId}.`);
    
    // Für jede gefundene Vorlage (sollte eigentlich nur eine sein)
    for (const template of templates) {
      // Archivieren durch Umbenennung
      await db.update(emailTemplates)
        .set({
          name: `[ARCHIVIERT] Reparatur abgeschlossen`,
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, template.id));
      
      console.log(`Vorlage "${template.name}" (ID: ${template.id}) wurde archiviert.`);
    }
    
    console.log(`Archivierung für Benutzer ${userId} abgeschlossen.`);
  } catch (error) {
    console.error(`Fehler bei der Archivierung für Benutzer ${userId}:`, error);
  }
}

// Hauptfunktion
async function main() {
  try {
    console.log("Archiviere redundante E-Mail-Vorlagen...");
    
    // Für den bekannten Benutzer bugi (ID=3)
    await archiveCompletedTemplate(3);
    
    console.log("Archivierung abgeschlossen.");
    process.exit(0);
  } catch (error) {
    console.error("Fehler im Hauptprogramm:", error);
    process.exit(1);
  }
}

// Ausführung des Skripts
main();