/**
 * Dieses Skript bereinigt alle von Benutzer "bugi" (ID 3) erstellten Daten in der Geräteverwaltung
 * 
 * Reihenfolge der Löschung:
 * 1. Modelle (user_models)
 * 2. Modellserien (user_model_series)
 * 3. Marken (user_brands)
 * 4. Gerätetypen (user_device_types)
 */

const { db } = require('./server/db');
const { eq } = require('drizzle-orm');
const { 
  userDeviceTypes, 
  userBrands, 
  userModelSeries, 
  userModels,
  deviceIssues
} = require('./shared/schema');

async function cleanupBugiData() {
  console.log('Bereinige Daten von Benutzer "bugi" (ID 3)...');
  
  try {
    // 1. Lösche alle Modelle von bugi
    const deletedModels = await db.delete(userModels)
      .where(eq(userModels.userId, 3))
      .returning();
    console.log(`${deletedModels.length} Modelle gelöscht`);
    
    // 2. Lösche alle Modellserien von bugi
    const deletedSeries = await db.delete(userModelSeries)
      .where(eq(userModelSeries.userId, 3))
      .returning();
    console.log(`${deletedSeries.length} Modellserien gelöscht`);
    
    // 3. Lösche alle Marken von bugi
    const deletedBrands = await db.delete(userBrands)
      .where(eq(userBrands.userId, 3))
      .returning();
    console.log(`${deletedBrands.length} Marken gelöscht`);
    
    // 4. Lösche alle Gerätetypen von bugi
    const deletedDeviceTypes = await db.delete(userDeviceTypes)
      .where(eq(userDeviceTypes.userId, 3))
      .returning();
    console.log(`${deletedDeviceTypes.length} Gerätetypen gelöscht`);
    
    // 5. Lösche alle Fehlerbeschreibungen von bugi (falls vorhanden)
    // Bemerkung: Hier nehmen wir an, dass deviceIssues eine userId-Spalte hat
    if (deviceIssues.userId) {
      const deletedIssues = await db.delete(deviceIssues)
        .where(eq(deviceIssues.userId, 3))
        .returning();
      console.log(`${deletedIssues.length} Fehlerbeschreibungen gelöscht`);
    }
    
    console.log('Bereinigung abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Bereinigung:', error);
  } finally {
    process.exit(0);
  }
}

cleanupBugiData();
