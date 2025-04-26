import { db } from "./db";
import { emailTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

/**
 * Dieses Skript aktualisiert eine E-Mail-Vorlage mit verbesserter HTML-Formatierung.
 * Es kann direkt ausgeführt werden mit: npx tsx server/update-email-template.ts
 * 
 * Vorgehensweise:
 * 1. Sucht nach E-Mail-Vorlagen, deren Name "abholbereit", "fertig" oder "abholung" enthält
 * 2. Aktualisiert die Vorlage mit einer neuen, gut formatierten HTML-Version
 */
async function updateEmailTemplate() {
  try {
    console.log("Suche nach E-Mail-Vorlagen für 'Abholbereit'...");
    
    // Vorlage in der Datenbank suchen
    const templates = await db.select().from(emailTemplates).where(
      eq(emailTemplates.name, "Abholbereit") 
    );
    
    if (templates.length === 0) {
      console.log("Suche nach ähnlichen Vorlagen...");
      // Suche nach anderen möglichen Namen
      const allTemplates = await db.select().from(emailTemplates);
      
      const filteredTemplates = allTemplates.filter(t => 
        t.name.toLowerCase().includes("fertig") || 
        t.name.toLowerCase().includes("abholbereit") || 
        t.name.toLowerCase().includes("abholung")
      );
      
      if (filteredTemplates.length === 0) {
        console.log("Keine passende E-Mail-Vorlage gefunden. Sie können eine neue Vorlage erstellen.");
        return;
      }
      
      // Erste gefundene Vorlage verwenden
      await updateTemplate(filteredTemplates[0].id);
      
    } else {
      // Aktualisiere die gefundene Vorlage
      await updateTemplate(templates[0].id);
    }
    
  } catch (error) {
    console.error("Fehler beim Aktualisieren der E-Mail-Vorlage:", error);
  }
}

async function updateTemplate(templateId: number) {
  try {
    // Vorlage aus Datei lesen
    const templatePath = path.join(process.cwd(), "improved_email_template.html");
    if (!fs.existsSync(templatePath)) {
      console.error("Verbesserte E-Mail-Vorlage nicht gefunden unter:", templatePath);
      return;
    }
    
    const htmlContent = fs.readFileSync(templatePath, "utf-8");
    
    // Betreff der Vorlage
    const subject = "Ihr Gerät ist repariert und kann abgeholt werden - {{auftragsnummer}}";
    
    // Prüfe, ob die Vorlage existiert
    const template = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId));
    
    if (template.length === 0) {
      console.error("E-Mail-Vorlage mit ID", templateId, "nicht gefunden.");
      return;
    }
    
    // Variablen aus der ursprünglichen Vorlage beibehalten
    const variables = template[0].variables;
    
    // Vorlage aktualisieren
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({
        subject,
        body: htmlContent,
        updatedAt: new Date()
      })
      .where(eq(emailTemplates.id, templateId))
      .returning();
    
    console.log("E-Mail-Vorlage erfolgreich aktualisiert:", updatedTemplate);
  } catch (error) {
    console.error("Fehler beim Aktualisieren der E-Mail-Vorlage:", error);
  }
}

// Skript ausführen
updateEmailTemplate().then(() => {
  console.log("Vorgang abgeschlossen.");
  process.exit(0);
}).catch(error => {
  console.error("Fehler:", error);
  process.exit(1);
});