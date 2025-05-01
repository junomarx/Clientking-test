/**
 * Dieses Skript fügt die Spalte pricingPlan zur users-Tabelle hinzu
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

async function addPricingPlanColumn() {
  console.log("Starte Migration: Hinzufügen der Preispaket-Spalte...");
  
  try {
    // Überprüfen, ob die Spalte pricingPlan bereits existiert
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'pricing_plan';
    `;
    
    const existingColumn = await db.execute(checkColumnQuery);
    
    if (existingColumn.rows.length === 0) {
      console.log("Füge Preispaket-Spalte zur users-Tabelle hinzu...");
      
      const addColumnQuery = sql`
        ALTER TABLE users 
        ADD COLUMN pricing_plan TEXT NOT NULL DEFAULT 'basic';
      `;
      
      await db.execute(addColumnQuery);
      console.log("Preispaket-Spalte erfolgreich hinzugefügt!");
    } else {
      console.log("Die Preispaket-Spalte existiert bereits.");
    }
    
    console.log("Migration für Preispaket-Spalte erfolgreich abgeschlossen.");
  } catch (error) {
    console.error("Fehler beim Hinzufügen der Preispaket-Spalte:", error);
    throw error;
  }
}

// Migration ausführen, wenn das Skript direkt ausgeführt wird
// In ESM-Modus können wir nicht require.main === module prüfen
// Wir führen die Migration nur über den Export aus
if (process.argv[1] === import.meta.url) {
  addPricingPlanColumn()
    .then(() => {
      console.log("Migration abgeschlossen.");
      process.exit(0);
    })
    .catch(error => {
      console.error("Migration fehlgeschlagen:", error);
      process.exit(1);
    });
}

export { addPricingPlanColumn };
