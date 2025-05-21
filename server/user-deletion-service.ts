/**
 * Benutzer-Löschservice
 * 
 * Dieses Modul bietet eine robuste Lösung zum vollständigen Löschen eines Benutzers
 * und aller zugehörigen Daten aus der Datenbank unter Berücksichtigung aller Abhängigkeiten.
 * 
 * DSGVO-konform: Stellt sicher, dass alle personenbezogenen Daten vollständig entfernt werden.
 */

import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';
import {
  users,
  customers,
  repairs,
  emailHistory,
  costEstimates,
  businessSettings,
  emailTemplates,
  userDeviceTypes,
  userBrands,
  userModels
} from '@shared/schema';

/**
 * Löscht einen Benutzer vollständig mit allen zugehörigen Daten
 * 
 * @param userId Die ID des zu löschenden Benutzers
 * @returns Ein Objekt mit Statusinformationen zum Löschvorgang
 */
export async function deleteUserWithAllData(userId: number): Promise<{
  success: boolean;
  message: string;
  deletedData?: {
    repairs: number;
    customers: number;
    businessSettings: number;
    emailTemplates: number;
    userDeviceData: number;
  };
  error?: any;
}> {
  console.log(`Starte vollständigen Löschvorgang für Benutzer mit ID ${userId}...`);
  
  try {
    // Transaktion starten
    return await db.transaction(async (tx) => {
      const deletedCounts = {
        emailHistory: 0,
        costEstimates: 0,
        repairs: 0,
        customers: 0,
        businessSettings: 0,
        emailTemplates: 0,
        userDeviceData: 0
      };

      // 1. Kunden des Benutzers finden
      const userCustomers = await tx.select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, userId));
      
      const customerIds = userCustomers.map(c => c.id);
      console.log(`${customerIds.length} Kunden des Benutzers ${userId} gefunden.`);
      
      // 2. Für jeden Kunden die Reparaturen und abhängigen Daten löschen
      if (customerIds.length > 0) {
        // Alle Reparaturen für diese Kunden finden
        const userRepairs = await tx.select({ id: repairs.id })
          .from(repairs)
          .where(sql`${repairs.customerId} IN (${customerIds.join(',')})`);
        
        const repairIds = userRepairs.map(r => r.id);
        console.log(`${repairIds.length} Reparaturen der Kunden des Benutzers ${userId} gefunden.`);
        
        // 2.1 Für jede Reparatur die abhängigen Daten löschen
        if (repairIds.length > 0) {
          // E-Mail-Historie löschen
          const emailHistoryResult = await tx.delete(emailHistory)
            .where(sql`${emailHistory.repairId} IN (${repairIds.join(',')})`)
            .returning();
          deletedCounts.emailHistory = emailHistoryResult.length;
          
          // Kostenvoranschläge löschen
          const costEstimateResult = await tx.delete(costEstimates)
            .where(sql`${costEstimates.repairId} IN (${repairIds.join(',')})`)
            .returning();
          deletedCounts.costEstimates = costEstimateResult.length;
          
          // Reparaturen löschen
          const repairsResult = await tx.delete(repairs)
            .where(sql`${repairs.id} IN (${repairIds.join(',')})`)
            .returning();
          deletedCounts.repairs = repairsResult.length;
        }
      }
      
      // 3. Kunden des Benutzers löschen
      const customersResult = await tx.delete(customers)
        .where(eq(customers.userId, userId))
        .returning();
      deletedCounts.customers = customersResult.length;
      
      // 4. Geschäftseinstellungen löschen
      const businessSettingsResult = await tx.delete(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .returning();
      deletedCounts.businessSettings = businessSettingsResult.length;
      
      // 5. E-Mail-Vorlagen löschen
      const emailTemplatesResult = await tx.delete(emailTemplates)
        .where(eq(emailTemplates.userId, userId))
        .returning();
      deletedCounts.emailTemplates = emailTemplatesResult.length;
      
      // 6. Gerätespezifische Daten löschen
      // 6.1 Modelle
      const userModelsResult = await tx.delete(userModels)
        .where(eq(userModels.userId, userId))
        .returning();
      
      // 6.2 Marken
      const userBrandsResult = await tx.delete(userBrands)
        .where(eq(userBrands.userId, userId))
        .returning();
      
      // 6.3 Gerätetypen
      const userDeviceTypesResult = await tx.delete(userDeviceTypes)
        .where(eq(userDeviceTypes.userId, userId))
        .returning();
      
      deletedCounts.userDeviceData = 
        userModelsResult.length + 
        userBrandsResult.length + 
        userDeviceTypesResult.length;
      
      // 7. Benutzer selbst löschen
      const userResult = await tx.delete(users)
        .where(eq(users.id, userId))
        .returning();
      
      if (userResult.length === 0) {
        throw new Error(`Benutzer mit ID ${userId} konnte nicht gelöscht werden.`);
      }
      
      console.log(`Benutzer mit ID ${userId} erfolgreich gelöscht.`);
      
      return {
        success: true,
        message: "Benutzer und alle zugehörigen Daten erfolgreich gelöscht.",
        deletedData: {
          repairs: deletedCounts.repairs,
          customers: deletedCounts.customers,
          businessSettings: deletedCounts.businessSettings,
          emailTemplates: deletedCounts.emailTemplates,
          userDeviceData: deletedCounts.userDeviceData
        }
      };
    });
  } catch (error) {
    console.error(`Fehler beim Löschen des Benutzers mit ID ${userId}:`, error);
    return {
      success: false,
      message: `Fehler beim Löschen des Benutzers: ${error.message || error}`,
      error
    };
  }
}