/**
 * DSGVO-Fix: Strikte Shop-Isolation für Kundendaten
 * 
 * Dieses Skript implementiert eine strikte Shop-Isolation, bei der jeder Kunde
 * nur dem Shop zugeordnet ist, dessen Benutzer ihn erstellt hat. Dies stellt sicher, 
 * dass kein Shop auf Kundendaten eines anderen Shops zugreifen kann.
 */

import { db } from "./server/db";
import { eq, sql } from "drizzle-orm";
import { customers, users } from "./shared/schema";

async function main() {
  try {
    console.log("Starte strikte DSGVO-Korrektur der Shop-Isolation für Kundendaten...");
    
    // Hole alle Benutzer (mit Shop-IDs)
    const allUsers = await db.select().from(users);
    console.log(`Gefunden: ${allUsers.length} Benutzer im System`);
    
    // Erstelle eine Zuordnung von Benutzern zu ihrer Shop-ID
    const userToShopMap = new Map<number, number>();
    for (const user of allUsers) {
      if (user.shopId) {
        userToShopMap.set(user.id, user.shopId);
      }
    }
    
    // Hole alle Kunden
    const allCustomers = await db.select().from(customers);
    console.log(`Gefunden: ${allCustomers.length} Kundendatensätze gesamt`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Überprüfe jeden Kunden
    for (const customer of allCustomers) {
      const userId = customer.userId;
      
      // Wenn der Kunde einem Benutzer gehört, der eine Shop-ID hat
      if (userId && userToShopMap.has(userId)) {
        const correctShopId = userToShopMap.get(userId)!;
        
        // Nur aktualisieren, wenn die Shop-ID falsch ist
        if (customer.shopId !== correctShopId) {
          try {
            await db
              .update(customers)
              .set({ shopId: correctShopId })
              .where(eq(customers.id, customer.id));
            
            console.log(`✅ Kunde ID ${customer.id} (${customer.firstName} ${customer.lastName}) wurde von Shop ${customer.shopId} zu Shop ${correctShopId} migriert (Benutzer ID: ${userId})`);
            successCount++;
          } catch (error) {
            console.error(`❌ Fehler beim Aktualisieren des Kunden ID ${customer.id}:`, error);
            errorCount++;
          }
        } else {
          console.log(`✓ Kunde ID ${customer.id} (${customer.firstName} ${customer.lastName}) hat bereits die korrekte Shop-ID ${customer.shopId}`);
        }
      } else {
        console.warn(`⚠️ Kunde ID ${customer.id} hat keinen gültigen Benutzer oder Shop-ID: ${userId}`);
        errorCount++;
      }
    }
    
    console.log(`Migration abgeschlossen: ${successCount} Kunden erfolgreich migriert, ${errorCount} Fehler`);
    
    // Prüfe, ob alle Kunden nun korrekte Shop-IDs haben
    for (const user of allUsers) {
      if (user.shopId) {
        const customerCount = await db
          .select({ count: sql`count(*)` })
          .from(customers)
          .where(eq(customers.shopId, user.shopId));
        
        console.log(`Shop ${user.shopId} (${user.username}): ${customerCount[0].count} Kunden`);
      }
    }
    
  } catch (error) {
    console.error("Fehler bei der Migration:", error);
  } finally {
    // Verbindung zur Datenbank schließen
    await db.end?.();
  }
}

main();