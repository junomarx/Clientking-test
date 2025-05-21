import { db } from "./server/db";
import { emailTemplates } from "@shared/schema";
import { sql } from "drizzle-orm";

async function updateEmailTemplateTypes() {
  console.log("Starte die Aktualisierung der E-Mail-Vorlagentypen...");

  try {
    // Identifizierung von Kunden-Vorlagen anhand ihrer Namen
    const customerTemplateNames = [
      "Reparatur abholbereit",
      "Reparatur abgeschlossen",
      "Ersatzteil eingetroffen",
      "Reparatur begonnen",
      "Kostenvoranschlag",
      "Versandbenachrichtigung",
      "Feedback-Anfrage",
      "Reparatur angenommen",
      "Rechnung",
      "Zahlungserinnerung"
    ];

    // Kunden-Vorlagen aktualisieren
    const updateCustomerResult = await db.execute(sql`
      UPDATE email_templates
      SET type = 'customer'
      WHERE name IN (${sql.join(customerTemplateNames, sql`, `)})
    `);
    
    console.log(`${updateCustomerResult.rowCount || 0} Kunden-Vorlagen wurden als 'customer' markiert.`);

    // Sicherstellung: Alle verbleibenden Vorlagen, die noch keinen Typ haben, als Kunden-Vorlagen markieren
    const updateRemainingResult = await db.execute(sql`
      UPDATE email_templates
      SET type = 'customer'
      WHERE type IS NULL OR type = ''
    `);
    
    console.log(`${updateRemainingResult.rowCount || 0} weitere Vorlagen wurden als 'customer' markiert.`);
    
    // Alle Vorlagen anzeigen
    const allTemplates = await db.query.emailTemplates.findMany();
    console.log("Aktuelle Vorlagen mit ihren Typen:");
    allTemplates.forEach(tmpl => {
      console.log(`- ${tmpl.name}: ${tmpl.type || 'kein Typ'}`);
    });
    
    console.log("Aktualisierung der E-Mail-Vorlagentypen abgeschlossen.");
    
    return true;
  } catch (error) {
    console.error("Fehler bei der Aktualisierung der E-Mail-Vorlagentypen:", error);
    return false;
  }
}

async function main() {
  try {
    await updateEmailTemplateTypes();
    process.exit(0);
  } catch (error) {
    console.error("Fehler bei der Aktualisierung:", error);
    process.exit(1);
  }
}

main();
