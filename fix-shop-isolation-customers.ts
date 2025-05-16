/**
 * DSGVO-Fix: Skript zur Korrektur von Kundendaten ohne korrekte Shop-Isolation
 * 
 * Dieses Skript korrigiert Kundendaten, die fälschlicherweise der Shop-ID 1 
 * zugewiesen wurden statt der korrekten Shop-ID des jeweiligen Benutzers.
 */

import { db } from "./server/db";
import { eq, sql } from "drizzle-orm";
import { customers, users } from "./shared/schema";

async function main() {
  try {
    console.log("Starte Korrektur der Shop-Isolation für Kundendaten...");
    
    // Hole alle Benutzer (mit Shop-IDs)
    const allUsers = await db.select().from(users);
    console.log(`Gefunden: ${allUsers.length} Benutzer im System`);
    
    // Finde problematische Kundendaten (Shop-ID 1)
    const problematicCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.shopId, 1));
    
    console.log(`Gefunden: ${problematicCustomers.length} Kundendatensätze mit Shop-ID 1`);
    
    // Erstelle eine Zuordnung von Benutzern zu ihrer Shop-ID
    const userToShopMap = new Map<number, number>();
    for (const user of allUsers) {
      if (user.shopId) {
        userToShopMap.set(user.id, user.shopId);
      }
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Überprüfe jeden problematischen Kunden
    for (const customer of problematicCustomers) {
      const userId = customer.userId;
      
      // Wenn der Kunde einem Benutzer gehört, der eine Shop-ID hat
      if (userId && userToShopMap.has(userId)) {
        const correctShopId = userToShopMap.get(userId)!;
        
        // Aktualisiere den Kunden mit der korrekten Shop-ID
        try {
          await db
            .update(customers)
            .set({ shopId: correctShopId })
            .where(eq(customers.id, customer.id));
          
          console.log(`✅ Kunde ID ${customer.id} (${customer.firstName} ${customer.lastName}) wurde von Shop 1 zu Shop ${correctShopId} migriert (Benutzer ID: ${userId})`);
          successCount++;
        } catch (error) {
          console.error(`❌ Fehler beim Aktualisieren des Kunden ID ${customer.id}:`, error);
          errorCount++;
        }
      } else {
        console.warn(`⚠️ Kunde ID ${customer.id} hat keinen gültigen Benutzer oder Shop-ID: ${userId}`);
        errorCount++;
      }
    }
    
    console.log(`Migration abgeschlossen: ${successCount} Kunden erfolgreich migriert, ${errorCount} Fehler`);
    
    // Überprüfe, ob noch fehlerhafte Daten existieren
    const remainingProblems = await db
      .select()
      .from(customers)
      .where(eq(customers.shopId, 1));
    
    console.log(`Nach der Migration verbleiben ${remainingProblems.length} Kundendatensätze mit Shop-ID 1`);
    
  } catch (error) {
    console.error("Fehler bei der Migration:", error);
  } finally {
    // Verbindung zur Datenbank schließen
    await db.end?.();
  }
}

main();