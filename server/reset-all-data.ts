/**
 * Dieses Skript löscht ALLE Kunden und Reparaturdaten, damit jeder Benutzer bei 0 anfängt.
 * Es behält nur die Benutzerkonten und Geschäftseinstellungen bei.
 * ACHTUNG: Dieser Vorgang kann nicht rückgängig gemacht werden!
 */
import { db } from "./db";
import { 
  customers, 
  repairs, 
  businessSettings,
  users,
  feedbacks
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function resetAllData() {
  console.log("===== KOMPLETTER DATENBANK-RESET BEGINNT =====");
  console.log("WARNUNG: Alle Kunden- und Reparaturdaten werden gelöscht!");
  
  try {
    // Beginne Transaktion
    console.log("Beginne Transaktion...");
    await db.execute(sql`BEGIN`);
    
    // 1. Alle Feedbacks löschen
    console.log("Lösche alle Feedbacks...");
    await db.delete(feedbacks);
    
    // 2. Alle Reparaturen löschen
    console.log("Lösche alle Reparaturen...");
    await db.delete(repairs);
    
    // 3. Alle Kunden löschen
    console.log("Lösche alle Kunden...");
    await db.delete(customers);
    
    // 4. Geschäftseinstellungen für jeden Benutzer erhalten oder neu anlegen
    console.log("Prüfe Geschäftseinstellungen für alle Benutzer...");
    
    // Alle Benutzer abrufen
    const allUsers = await db.select().from(users);
    console.log(`Gefundene Benutzer: ${allUsers.length}`);
    
    // Für jeden Benutzer prüfen, ob Geschäftseinstellungen existieren
    for (const user of allUsers) {
      const settings = await db.select().from(businessSettings).where(sql`user_id = ${user.id}`);
      
      if (settings.length === 0) {
        console.log(`Erstelle Standardeinstellungen für Benutzer ${user.username} (ID: ${user.id})...`);
        
        // Default-Werte basierend auf Benutzername setzen
        let businessName = "Mein Reparaturshop";
        let colorTheme = "blue";
        
        if (user.username === "bugi") {
          businessName = "Mac and Phone Doc";
          colorTheme = "purple";
        } else if (user.username === "murat") {
          businessName = "Jahuu Mobilestore";
          colorTheme = "green";
        } else if (user.username === "simo") {
          businessName = "Simo's Phone Repair";
          colorTheme = "orange";
        }
        
        // Geschäftseinstellungen erstellen
        await db.insert(businessSettings).values({
          businessName,
          ownerFirstName: "", 
          ownerLastName: "",
          taxId: "",
          streetAddress: "",
          city: "",
          zipCode: "",
          country: "Österreich",
          phone: "",
          email: user.email || "",
          website: "",
          colorTheme,
          receiptWidth: "80mm",
          userId: user.id
        });
      } else {
        console.log(`Geschäftseinstellungen für Benutzer ${user.username} existieren bereits.`);
      }
    }
    
    // Transaktion abschließen
    console.log("Schließe Transaktion ab...");
    await db.execute(sql`COMMIT`);
    
    console.log("===== KOMPLETTER DATENBANK-RESET ERFOLGREICH ABGESCHLOSSEN =====");
    console.log("Alle Kunden- und Reparaturdaten wurden gelöscht.");
    console.log("Jeder Benutzer startet jetzt bei 0.");
    
    // Prüfe Ergebnisse
    await checkResults();
    
  } catch (error) {
    console.error("Fehler beim Datenbank-Reset:", error);
    await db.execute(sql`ROLLBACK`);
    console.log("Transaktion wurde zurückgerollt.");
  }
}

async function checkResults() {
  console.log("\n===== ERGEBNISSE =====");
  
  // Zähle Kunden
  const customersCount = await db.select({ count: sql`count(*)` }).from(customers);
  console.log(`Anzahl Kunden in der Datenbank: ${Number(customersCount[0].count)}`);
  
  // Zähle Reparaturen
  const repairsCount = await db.select({ count: sql`count(*)` }).from(repairs);
  console.log(`Anzahl Reparaturen in der Datenbank: ${Number(repairsCount[0].count)}`);
  
  // Zähle Feedbacks
  const feedbacksCount = await db.select({ count: sql`count(*)` }).from(feedbacks);
  console.log(`Anzahl Feedbacks in der Datenbank: ${Number(feedbacksCount[0].count)}`);
  
  // Zähle Benutzer
  const usersCount = await db.select({ count: sql`count(*)` }).from(users);
  console.log(`Anzahl Benutzer in der Datenbank: ${Number(usersCount[0].count)}`);
  
  // Zähle Geschäftseinstellungen
  const settingsCount = await db.select({ count: sql`count(*)` }).from(businessSettings);
  console.log(`Anzahl Geschäftseinstellungen in der Datenbank: ${Number(settingsCount[0].count)}`);
  
  // Business Settings anzeigen
  const allBusinessSettings = await db.select().from(businessSettings);
  console.log("Geschäftseinstellungen:");
  for (const settings of allBusinessSettings) {
    console.log(`- ID: ${settings.id}, Name: ${settings.businessName}, UserId: ${settings.userId}`);
  }
}

// Ausführen des Scripts
resetAllData().catch(error => {
  console.error("Fehler bei der Ausführung:", error);
  process.exit(1);
});