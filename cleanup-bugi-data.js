/**
 * Dieses Skript bereinigt alle von Benutzer "bugi" (ID 3) erstellten Daten in der Geräteverwaltung
 * und konvertiert Standard-Gerätetypen wie "Smartphone", "Tablet", usw. zu globalen Typen (userId = 0)
 * 
 * Reihenfolge der Löschung:
 * 1. Modelle (user_models)
 * 2. Modellserien (user_model_series)
 * 3. Marken (user_brands)
 * 4. Nicht-Standard Gerätetypen von Bugi (user_device_types)
 * 5. Konvertierung der Standard-Gerätetypen zu globalen Typen
 */

import { db } from './server/db.js';
import { eq, and, or, inArray } from 'drizzle-orm';
import { 
  userDeviceTypes, 
  userBrands, 
  userModelSeries, 
  userModels
} from './shared/schema.js';

// Standard-Gerätetypen, die wir behalten wollen
const standardDeviceTypes = ['Smartphone', 'Tablet', 'Laptop', 'Watch'];

async function cleanupBugiData() {
  console.log('Bereinige Daten von Benutzer "bugi" (ID 3)...');
  
  try {
    // 1. Alle Modelle löschen
    console.log('Lösche alle Modelle von Bugi...');
    const deletedModels = await db.delete(userModels)
      .where(eq(userModels.userId, 3))
      .returning();
    console.log(`${deletedModels.length} Modelle gelöscht`);
    
    // 2. Alle Modellserien löschen
    console.log('Lösche alle Modellserien von Bugi...');
    const deletedSeries = await db.delete(userModelSeries)
      .where(eq(userModelSeries.userId, 3))
      .returning();
    console.log(`${deletedSeries.length} Modellserien gelöscht`);
    
    // 3. Alle Marken löschen
    console.log('Lösche alle Marken von Bugi...');
    const deletedBrands = await db.delete(userBrands)
      .where(eq(userBrands.userId, 3))
      .returning();
    console.log(`${deletedBrands.length} Marken gelöscht`);
    
    // 4. Nicht-Standard Gerätetypen von Bugi löschen
    console.log('Lösche alle nicht-standard Gerätetypen von Bugi...');
    const deletedDeviceTypes = await db.delete(userDeviceTypes)
      .where(
        and(
          eq(userDeviceTypes.userId, 3),
          or(
            ...standardDeviceTypes.map(type => eq(userDeviceTypes.name, type)).map(condition => {
              // Negiere jede Bedingung, um alle AUSSER diesen zu löschen
              return and(condition.not());
            })
          )
        )
      )
      .returning();
    console.log(`${deletedDeviceTypes.length} nicht-standard Gerätetypen gelöscht`);
    
    // 5. Konvertiere Standard-Gerätetypen zu globalen Typen (userId = 0, shopId = 0)
    console.log('Konvertiere Standard-Gerätetypen zu globalen Typen...');
    let convertedTypes = 0;
    for (const typeName of standardDeviceTypes) {
      // Prüfe, ob ein Typ mit diesem Namen existiert, der Bugi gehört
      const existingType = await db.select().from(userDeviceTypes)
        .where(
          and(
            eq(userDeviceTypes.name, typeName),
            eq(userDeviceTypes.userId, 3)
          )
        );
      
      if (existingType.length > 0) {
        // Konvertiere den Typ zu einem globalen Typ
        const updatedType = await db.update(userDeviceTypes)
          .set({
            userId: 0,
            shopId: 0,
            updatedAt: new Date()
          })
          .where(eq(userDeviceTypes.id, existingType[0].id))
          .returning();
        
        console.log(`Gerätetyp "${typeName}" (ID ${existingType[0].id}) zu einem globalen Typ konvertiert`);
        convertedTypes++;
      }
    }
    console.log(`${convertedTypes} Standard-Gerätetypen zu globalen Typen konvertiert`);
    
    console.log('Bereinigung abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Bereinigung:', error);
  } finally {
    process.exit(0);
  }
}

cleanupBugiData();
