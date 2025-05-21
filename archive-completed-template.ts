/**
 * Dieses Skript archiviert die redundante "Reparatur abgeschlossen" Vorlage
 * und stellt sicher, dass "Reparatur abholbereit" als Standard verwendet wird.
 */

import { db } from "./server/db";
import { emailTemplates, emailHistory, users } from "./shared/schema";
import { eq, and, desc, SQL, count } from "drizzle-orm";

// Diese Funktion archiviert die "Reparatur abgeschlossen" Vorlage für einen bestimmten Benutzer
async function archiveCompletedTemplate(userId: number) {
  try {
    console.log(`Archiviere "Reparatur abgeschlossen" Vorlage für Benutzer ${userId}...`);
    
    // Prüfen, ob eine "Reparatur abholbereit" Vorlage existiert
    const readyTemplates = await db.select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.userId, userId),
          eq(emailTemplates.name, "Reparatur abholbereit")
        )
      );
    
    const hasReadyTemplate = readyTemplates.length > 0;
    
    // Nur fortfahren, wenn "Reparatur abholbereit" existiert
    if (!hasReadyTemplate) {
      console.log(`Keine "Reparatur abholbereit" Vorlage für Benutzer ${userId} gefunden. Überspringen.`);
      return;
    }
    
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
      // Prüfen, ob die Vorlage bereits in Email-Historie verwendet wird
      const historyEntries = await db.select({ count: count() })
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, template.id));
      
      const isUsedInHistory = historyEntries[0]?.count > 0;
      
      if (isUsedInHistory) {
        // Archivieren durch Umbenennung
        await db.update(emailTemplates)
          .set({
            name: `[ARCHIVIERT] Reparatur abgeschlossen`,
            updatedAt: new Date()
          })
          .where(eq(emailTemplates.id, template.id));
        
        console.log(`Vorlage "${template.name}" (ID: ${template.id}) wurde archiviert, da sie in der Email-Historie verwendet wird.`);
      } else {
        // Löschen, da sie nicht verwendet wird
        await db.delete(emailTemplates)
          .where(eq(emailTemplates.id, template.id));
        
        console.log(`Vorlage "${template.name}" (ID: ${template.id}) wurde gelöscht, da sie nicht in der Email-Historie verwendet wird.`);
      }
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
    
    // Alle Benutzer aus der Datenbank holen
    const allUsers = await db.select()
      .from(users);
    
    console.log(`Gefunden: ${allUsers.length} Benutzer insgesamt.`);
    
    // Für jeden Benutzer die "Reparatur abgeschlossen" Vorlage archivieren, wenn nötig
    for (const user of allUsers) {
      console.log(`Bearbeite Benutzer: ${user.username} (ID: ${user.id})`);
      await archiveCompletedTemplate(user.id);
    }
    
    console.log("Archivierung abgeschlossen.");
    process.exit(0);
  } catch (error) {
    console.error("Fehler im Hauptprogramm:", error);
    process.exit(1);
  }
}

// Ausführung des Skripts
main();