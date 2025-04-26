/**
 * Dieses Skript ist ein Diagnose-Tool zum Überprüfen und Reparieren der Datenisolierung.
 * Es prüft, ob alle Kunden und Reparaturen einem Benutzer zugeordnet sind.
 */
import { db } from "./db";
import { 
  customers, 
  repairs, 
  businessSettings,
  users,
  feedbacks
} from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

export async function checkDataIsolation() {
  console.log("===== DATENBANK-DIAGNOSE BEGINNT =====");
  
  // 1. Alle Benutzer abrufen
  const allUsers = await db.select().from(users);
  console.log(`Gefundene Benutzer: ${allUsers.length}`);
  
  // 2. Kunden ohne userId prüfen
  const customersWithoutUser = await db.select().from(customers).where(isNull(customers.userId));
  console.log(`Kunden ohne Benutzer-ID: ${customersWithoutUser.length}`);
  
  // 3. Reparaturen ohne userId prüfen
  const repairsWithoutUser = await db.select().from(repairs).where(isNull(repairs.userId));
  console.log(`Reparaturen ohne Benutzer-ID: ${repairsWithoutUser.length}`);
  
  // 4. Zähle Kunden pro Benutzer
  console.log("Kunden pro Benutzer:");
  for (const user of allUsers) {
    const customersForUser = await db.select().from(customers).where(eq(customers.userId, user.id));
    console.log(`- ${user.username}: ${customersForUser.length} Kunden`);
  }
  
  // 5. Zähle Reparaturen pro Benutzer
  console.log("Reparaturen pro Benutzer:");
  for (const user of allUsers) {
    const repairsForUser = await db.select().from(repairs).where(eq(repairs.userId, user.id));
    console.log(`- ${user.username}: ${repairsForUser.length} Reparaturen`);
  }
  
  // 6. Prüfe Geschäftseinstellungen
  const businessSettingsData = await db.select().from(businessSettings);
  console.log(`Geschäftseinstellungen-Einträge: ${businessSettingsData.length}`);
  for (const settings of businessSettingsData) {
    console.log(`- ID: ${settings.id}, BusinessName: ${settings.businessName}, UserId: ${settings.userId}`);
  }
  
  console.log("===== DATENBANK-DIAGNOSE ABGESCHLOSSEN =====");
}

export async function fixDataIsolation() {
  console.log("===== DATENBANK-REPARATUR BEGINNT =====");
  
  // 1. Finde alle Kunden ohne userId
  const customersWithoutUser = await db.select().from(customers).where(isNull(customers.userId));
  console.log(`Kunden ohne Benutzer-ID: ${customersWithoutUser.length}`);
  
  // 2. Finde alle Reparaturen ohne userId
  const repairsWithoutUser = await db.select().from(repairs).where(isNull(repairs.userId));
  console.log(`Reparaturen ohne Benutzer-ID: ${repairsWithoutUser.length}`);
  
  // 3. Standard-Benutzer finden (bugi - id:3)
  const defaultUser = await db.select().from(users).where(eq(users.username, "bugi"));
  
  if (defaultUser.length === 0) {
    console.error("Standard-Benutzer 'bugi' nicht gefunden!");
    return;
  }
  
  const defaultUserId = defaultUser[0].id;
  console.log(`Standard-Benutzer gefunden: ${defaultUser[0].username} (ID: ${defaultUserId})`);
  
  // 4. Alle Kunden ohne userId dem Standard-Benutzer zuweisen
  if (customersWithoutUser.length > 0) {
    console.log(`Weise ${customersWithoutUser.length} Kunden dem Benutzer ${defaultUser[0].username} zu...`);
    
    for (const customer of customersWithoutUser) {
      await db.update(customers)
        .set({ userId: defaultUserId })
        .where(eq(customers.id, customer.id));
    }
    console.log("Kundenzuweisung abgeschlossen.");
  }
  
  // 5. Alle Reparaturen ohne userId dem Standard-Benutzer zuweisen
  if (repairsWithoutUser.length > 0) {
    console.log(`Weise ${repairsWithoutUser.length} Reparaturen dem Benutzer ${defaultUser[0].username} zu...`);
    
    for (const repair of repairsWithoutUser) {
      await db.update(repairs)
        .set({ userId: defaultUserId })
        .where(eq(repairs.id, repair.id));
    }
    console.log("Reparaturzuweisung abgeschlossen.");
  }
  
  // 6. Geschäftseinstellungen prüfen und korrigieren
  const businessSettingsData = await db.select().from(businessSettings);
  
  if (businessSettingsData.length > 0) {
    for (const settings of businessSettingsData) {
      if (!settings.userId) {
        console.log(`Aktualisiere Geschäftseinstellungen ID ${settings.id} mit Benutzer-ID ${defaultUserId}`);
        await db.update(businessSettings)
          .set({ userId: defaultUserId })
          .where(eq(businessSettings.id, settings.id));
      }
    }
  }
  
  console.log("===== DATENBANK-REPARATUR ABGESCHLOSSEN =====");
  
  // Prüfung der durchgeführten Änderungen
  await checkDataIsolation();
}