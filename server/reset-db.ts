/**
 * Dieses Skript setzt die Datenbank zurück, indem es:
 * 1. Alle Kunden und Reparaturen einem Benutzer neu zuordnet
 * 2. Businesseinstellungen für jeden Benutzer erstellt
 * 3. Die Datenisolierung zwischen den Benutzern sicherstellt
 */
import { db } from "./db";
import { 
  customers, 
  repairs, 
  businessSettings,
  users,
  feedbacks
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function resetDatabase() {
  console.log("===== DATENBANK-RESET BEGINNT =====");
  
  // 1. Alle Benutzer abrufen
  const allUsers = await db.select().from(users);
  console.log(`Gefundene Benutzer: ${allUsers.length}`);
  
  if (allUsers.length === 0) {
    console.error("Keine Benutzer gefunden. Abbruch.");
    return;
  }
  
  // 2. Benutzer-IDs für Zuweisungen definieren
  const bugiId = allUsers.find(u => u.username === "bugi")?.id;
  const muratId = allUsers.find(u => u.username === "murat")?.id;
  const simoId = allUsers.find(u => u.username === "simo")?.id;
  
  console.log(`Benutzer-IDs: bugi=${bugiId}, murat=${muratId}, simo=${simoId}`);
  
  if (!bugiId || !muratId || !simoId) {
    console.error("Nicht alle erwarteten Benutzer gefunden. Abbruch.");
    return;
  }
  
  try {
    // Beginne Transaktion
    console.log("Beginne Transaktion...");
    await db.execute(sql`BEGIN`);
    
    // 3. Alle Kunden für bugi
    console.log("Aktualisiere Kunden für bugi...");
    await db.update(customers)
      .set({ userId: bugiId })
      .where(eq(customers.id, 15)); // Bingo Bongo
    
    await db.update(customers)
      .set({ userId: bugiId })
      .where(eq(customers.id, 2)); // Elon Musk
    
    await db.update(customers)
      .set({ userId: bugiId })
      .where(eq(customers.id, 7)); // Peter Parker
    
    // 4. Alle Kunden für murat
    console.log("Aktualisiere Kunden für murat...");
    await db.update(customers)
      .set({ userId: muratId })
      .where(eq(customers.id, 8)); // Hasan Bal
    
    await db.update(customers)
      .set({ userId: muratId })
      .where(eq(customers.id, 9)); // Ali Veli
    
    await db.update(customers)
      .set({ userId: muratId })
      .where(eq(customers.id, 10)); // Amir Khan
    
    // 5. Reparaturen entsprechend auf die Benutzer aufteilen
    console.log("Aktualisiere Reparaturen für bugi...");
    await db.update(repairs)
      .set({ userId: bugiId })
      .where(eq(repairs.customerId, 15));
    
    await db.update(repairs)
      .set({ userId: bugiId })
      .where(eq(repairs.customerId, 2));
    
    await db.update(repairs)
      .set({ userId: bugiId })
      .where(eq(repairs.customerId, 7));
    
    console.log("Aktualisiere Reparaturen für murat...");
    await db.update(repairs)
      .set({ userId: muratId })
      .where(eq(repairs.customerId, 8));
    
    await db.update(repairs)
      .set({ userId: muratId })
      .where(eq(repairs.customerId, 9));
    
    await db.update(repairs)
      .set({ userId: muratId })
      .where(eq(repairs.customerId, 10));
    
    // 6. Business-Einstellungen aktualisieren
    console.log("Aktualisiere Geschäftseinstellungen...");
    
    // Für bugi
    const bugiSettings = await db.select().from(businessSettings).where(eq(businessSettings.userId, bugiId));
    if (bugiSettings.length === 0) {
      await db.insert(businessSettings).values({
        businessName: "Mac and Phone Doc",
        ownerFirstName: "Bugi",
        ownerLastName: "Admin", 
        taxId: "ATU12345678",
        streetAddress: "Hauptstraße 1",
        city: "Wien",
        zipCode: "1010",
        country: "Österreich",
        phone: "+43 1 123456",
        email: "admin@example.com",
        website: "www.macandphonedoc.at",
        colorTheme: "purple",
        receiptWidth: "80mm",
        userId: bugiId
      });
    } else {
      await db.update(businessSettings)
        .set({ businessName: "Mac and Phone Doc", userId: bugiId })
        .where(eq(businessSettings.id, bugiSettings[0].id));
    }
    
    // Für murat
    const muratSettings = await db.select().from(businessSettings).where(eq(businessSettings.userId, muratId));
    if (muratSettings.length === 0) {
      await db.insert(businessSettings).values({
        businessName: "Jahuu Mobilestore",
        ownerFirstName: "Murat",
        ownerLastName: "Jahuu", 
        taxId: "ATU87654321",
        streetAddress: "Mariahilferstraße 42",
        city: "Wien",
        zipCode: "1060",
        country: "Österreich",
        phone: "+43 1 654321",
        email: "office@jahuu.example.com",
        website: "www.jahuu-mobile.at",
        colorTheme: "green",
        receiptWidth: "80mm",
        userId: muratId
      });
    } else {
      await db.update(businessSettings)
        .set({ businessName: "Jahuu Mobilestore", userId: muratId })
        .where(eq(businessSettings.id, muratSettings[0].id));
    }
    
    // Für simo
    const simoSettings = await db.select().from(businessSettings).where(eq(businessSettings.userId, simoId));
    if (simoSettings.length === 0) {
      await db.insert(businessSettings).values({
        businessName: "Simo's Phone Repair",
        ownerFirstName: "Simo",
        ownerLastName: "Techniker", 
        taxId: "ATU98765432",
        streetAddress: "Landstraße 15",
        city: "Graz",
        zipCode: "8010",
        country: "Österreich",
        phone: "+43 316 9876543",
        email: "simo@example.com",
        website: "www.simo-repair.at",
        colorTheme: "orange",
        receiptWidth: "80mm",
        userId: simoId
      });
    }
    
    // Entferne Geschäftseinstellungen ohne Benutzer-ID
    console.log("Entferne verwaiste Geschäftseinstellungen...");
    await db.delete(businessSettings).where(sql`user_id IS NULL`);
    
    // Transaktion abschließen
    console.log("Schließe Transaktion ab...");
    await db.execute(sql`COMMIT`);
    
    console.log("===== DATENBANK-RESET ERFOLGREICH ABGESCHLOSSEN =====");
    
    // Prüfe Ergebnisse
    await checkResults(bugiId, muratId, simoId);
    
  } catch (error) {
    console.error("Fehler beim Datenbank-Reset:", error);
    await db.execute(sql`ROLLBACK`);
    console.log("Transaktion wurde zurückgerollt.");
  }
}

async function checkResults(bugiId: number, muratId: number, simoId: number) {
  console.log("\n===== ERGEBNISSE =====");
  
  // Kunden pro Benutzer
  const bugiCustomers = await db.select().from(customers).where(eq(customers.userId, bugiId));
  const muratCustomers = await db.select().from(customers).where(eq(customers.userId, muratId));
  const simoCustomers = await db.select().from(customers).where(eq(customers.userId, simoId));
  
  console.log(`Kunden für bugi: ${bugiCustomers.length}`);
  console.log(`Kunden für murat: ${muratCustomers.length}`);
  console.log(`Kunden für simo: ${simoCustomers.length}`);
  
  // Reparaturen pro Benutzer
  const bugiRepairs = await db.select().from(repairs).where(eq(repairs.userId, bugiId));
  const muratRepairs = await db.select().from(repairs).where(eq(repairs.userId, muratId));
  const simoRepairs = await db.select().from(repairs).where(eq(repairs.userId, simoId));
  
  console.log(`Reparaturen für bugi: ${bugiRepairs.length}`);
  console.log(`Reparaturen für murat: ${muratRepairs.length}`);
  console.log(`Reparaturen für simo: ${simoRepairs.length}`);
  
  // Business Settings
  const allBusinessSettings = await db.select().from(businessSettings);
  console.log("Geschäftseinstellungen:");
  for (const settings of allBusinessSettings) {
    console.log(`- ID: ${settings.id}, Name: ${settings.businessName}, UserId: ${settings.userId}`);
  }
}

// Ausführen des Scripts
resetDatabase().catch(error => {
  console.error("Fehler bei der Ausführung:", error);
  process.exit(1);
});