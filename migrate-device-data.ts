/**
 * Skript zur Migration aller Gerätedaten (Typen, Marken, Modelle, Fehler) 
 * auf die Shop-ID des Superadmins (macnphone, ID=10)
 */

import { pool, db } from "./server/db";
import { userDeviceTypes, userBrands, userModels, deviceIssues } from "./shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";

const SUPERADMIN_ID = 10; // macnphone
const SUPERADMIN_SHOP_ID = null; // Shop-ID von macnphone ist laut Tabelle nicht gesetzt

async function main() {
  console.log("Starte optimierte Migration der Gerätedaten zum Superadmin (ID=10)...");

  try {
    // 1. Migrate all device types to superadmin in one query
    console.log("Migriere Gerätetypen...");
    const deviceTypesResult = await db
      .update(userDeviceTypes)
      .set({ 
        shopId: SUPERADMIN_SHOP_ID
      })
      .where(
        and(
          or(
            isNull(userDeviceTypes.shopId),
            eq(userDeviceTypes.shopId, 0),
            eq(userDeviceTypes.shopId, 2)
          ),
          eq(userDeviceTypes.userId, 10) // Nur vom Superadmin erstellte Typen
        )
      )
      .returning();
    
    console.log(`${deviceTypesResult.length} Gerätetypen migriert.`);

    // 2. Migrate all brands to superadmin in one query
    console.log("Migriere Marken...");
    const brandsResult = await db
      .update(userBrands)
      .set({ 
        shopId: SUPERADMIN_SHOP_ID
      })
      .where(
        and(
          or(
            isNull(userBrands.shopId),
            eq(userBrands.shopId, 0),
            eq(userBrands.shopId, 2)
          ),
          eq(userBrands.userId, 10) // Nur vom Superadmin erstellte Marken
        )
      )
      .returning();
    
    console.log(`${brandsResult.length} Marken migriert.`);

    // 3. Migrate all models to superadmin in one query
    console.log("Migriere Modelle...");
    const modelsResult = await db
      .update(userModels)
      .set({ 
        shopId: SUPERADMIN_SHOP_ID
      })
      .where(
        and(
          or(
            isNull(userModels.shopId),
            eq(userModels.shopId, 0),
            eq(userModels.shopId, 2)
          ),
          eq(userModels.userId, 10) // Nur vom Superadmin erstellte Modelle
        )
      )
      .returning();
    
    console.log(`${modelsResult.length} Modelle migriert.`);

    // deviceIssues hat keine shopId und userId Spalten, wir überspringen diesen Teil
    console.log("Fehlereinträge werden übersprungen, da keine shopId und userId Spalten vorhanden sind.");
    
    // Kein issuesResult vorhanden, daher kein console.log

    console.log("Migration erfolgreich abgeschlossen!");
  } catch (error) {
    console.error("Fehler bei der Migration:", error);
  } finally {
    await pool.end();
  }
}

main();