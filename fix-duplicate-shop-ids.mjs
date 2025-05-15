/**
 * Migrationsskript zur Behebung duplizierter Shop-IDs
 * 
 * Dieses Skript findet Benutzer mit der gleichen Shop-ID und weist ihnen neue,
 * eindeutige Shop-IDs zu. Das Problem wurde entdeckt, als mehrere Benutzer
 * die Shop-ID 1 hatten, was DSGVO-Konformität verletzte, da sie dadurch
 * potenziell Zugriff auf die Daten anderer Shops erhalten könnten.
 */

// Importiere die nötigen Abhängigkeiten (ES Module Syntax)
import { db } from "./server/db.js";
import { sql } from "drizzle-orm";

/**
 * Findet Benutzer mit doppelten Shop-IDs und weist neue, eindeutige IDs zu
 */
async function fixDuplicateShopIds() {
  try {
    console.log("Starte Korrektur duplizierter Shop-IDs...");

    // 1. Finde alle verwendeten Shop-IDs und die dazugehörigen Benutzer
    const result = await db.execute(sql`
      SELECT shop_id, array_agg(id) as user_ids, count(*) as user_count
      FROM users
      WHERE shop_id IS NOT NULL
      GROUP BY shop_id
      HAVING count(*) > 1
      ORDER BY shop_id;
    `);

    if (result.rows.length === 0) {
      console.log("Keine doppelten Shop-IDs gefunden. Nichts zu tun.");
      return;
    }

    // 2. Hole die höchste verwendete Shop-ID
    const maxShopIdResult = await db.execute(sql`
      SELECT COALESCE(MAX(shop_id), 0) as max_shop_id FROM users WHERE shop_id IS NOT NULL;
    `);
    let nextShopId = parseInt(maxShopIdResult.rows[0].max_shop_id) + 1;

    console.log(`Höchste bestehende Shop-ID: ${nextShopId - 1}, nächste zu verwendende ID: ${nextShopId}`);

    // 3. Für jede doppelte Shop-ID:
    for (const row of result.rows) {
      const shopId = parseInt(row.shop_id);
      const userIds = row.user_ids.replace('{', '').replace('}', '').split(',').map(id => parseInt(id));
      const userCount = parseInt(row.user_count);

      console.log(`Shop-ID ${shopId} wird von ${userCount} Benutzern verwendet: ${userIds.join(', ')}`);

      // Behalte den ersten Benutzer mit der ursprünglichen Shop-ID, weise allen anderen neue IDs zu
      for (let i = 1; i < userIds.length; i++) {
        const userId = userIds[i];
        
        // Aktualisiere den Benutzer mit einer neuen Shop-ID
        await db.execute(sql`
          UPDATE users
          SET shop_id = ${nextShopId}
          WHERE id = ${userId}
        `);
        
        console.log(`Benutzer ID ${userId} von Shop-ID ${shopId} auf neue Shop-ID ${nextShopId} verschoben`);
        nextShopId++;
      }
    }

    console.log("Korrektur duplizierter Shop-IDs abgeschlossen.");
  } catch (error) {
    console.error("Fehler bei der Korrektur duplizierter Shop-IDs:", error);
  }
}

/**
 * Verhindert zukünftige Duplizierung von Shop-IDs durch Einfügen einer 
 * Eindeutigkeitsbeschränkung für die Shop-ID-Spalte
 */
async function addShopIdUniqueConstraint() {
  try {
    console.log("Füge Eindeutigkeitsbeschränkung für Shop-IDs hinzu...");
    
    // Prüfe, ob die Beschränkung bereits existiert
    const constraintResult = await db.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
      AND constraint_name = 'users_shop_id_unique';
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log("Eindeutigkeitsbeschränkung existiert bereits.");
      return;
    }
    
    // Füge die Eindeutigkeitsbeschränkung hinzu
    await db.execute(sql`
      ALTER TABLE users
      ADD CONSTRAINT users_shop_id_unique UNIQUE (shop_id)
      DEFERRABLE INITIALLY DEFERRED;
    `);
    
    console.log("Eindeutigkeitsbeschränkung für Shop-IDs erfolgreich hinzugefügt.");
  } catch (error) {
    console.error("Fehler beim Hinzufügen der Eindeutigkeitsbeschränkung:", error);
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log("Starte Migration: Korrektur duplizierter Shop-IDs");
  
  await fixDuplicateShopIds();
  await addShopIdUniqueConstraint();
  
  console.log("Migration abgeschlossen.");
  process.exit(0);
}

main().catch(err => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});