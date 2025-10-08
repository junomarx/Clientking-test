/**
 * User Anonymization Service
 * 
 * GDPR-compliant user anonymization that:
 * - Preserves the user record (maintains foreign key integrity)
 * - Clears all personal identifiable information (PII)
 * - Marks user as deleted (hidden from all dashboards)
 * - Maintains audit trail
 * - For shop owners: Drops tenant database and cleans up infrastructure
 */

import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { createTenantProvisioningService } from './tenancy/tenantProvisioning';
import { createConnectionRegistry } from './tenancy/connectionRegistry';

/**
 * Anonymizes a user account in a GDPR-compliant manner
 * For shop owners: Also drops their tenant database and infrastructure
 * 
 * @param userId The ID of the user to anonymize
 * @param performedBy ID of the user performing the anonymization (for audit)
 * @returns true if successful
 * @throws Error if anonymization fails
 */
export async function anonymizeUser(userId: number, performedBy: number): Promise<boolean> {
  try {
    console.log(`Starting GDPR-compliant anonymization for user ID ${userId}...`);
    
    // Get current user data for logging
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!currentUser) {
      throw new Error(`User ${userId} not found`);
    }
    
    if (currentUser.deletedAt) {
      throw new Error(`User ${userId} is already anonymized`);
    }
    
    console.log(`Anonymizing user: ${currentUser.username || currentUser.email} (Role: ${currentUser.role})`);
    
    // If user is a shop owner with a tenant database, deprovision it first
    if (currentUser.role === 'owner' && currentUser.shopId) {
      console.log(`🗑️ User is shop owner - deprovisioning tenant database for shop ${currentUser.shopId}...`);
      
      try {
        // Drop tenant database and user
        const provisioningService = createTenantProvisioningService();
        const deprovisionResult = await provisioningService.deprovisionTenant(currentUser.shopId);
        
        if (deprovisionResult.success) {
          console.log(`✅ Tenant database deprovisioned for shop ${currentUser.shopId}`);
        } else {
          console.warn(`⚠️ Tenant deprovision partial failure: ${deprovisionResult.error}`);
          // Continue with user anonymization even if tenant cleanup fails
        }
        
        // Remove connection registry entry
        try {
          const connectionRegistry = createConnectionRegistry();
          await connectionRegistry.removeConnection(currentUser.shopId);
          console.log(`✅ Connection registry cleaned up for shop ${currentUser.shopId}`);
        } catch (registryError) {
          console.warn(`⚠️ Failed to clean connection registry:`, registryError);
          // Continue anyway
        }
        
      } catch (tenantError) {
        console.error(`❌ Error during tenant cleanup:`, tenantError);
        // Continue with user anonymization even if tenant cleanup fails
      }
    }
    
    // Anonymize user data - clear all PII while preserving the record
    await db.update(users)
      .set({
        // Clear identity fields
        username: null,
        email: `deleted-${userId}@anonymized.local`,
        
        // Clear personal information
        firstName: null,
        lastName: null,
        ownerFirstName: null,
        ownerLastName: null,
        
        // Clear company information
        companyName: null,
        companyAddress: null,
        companyVatNumber: null,
        companyPhone: null,
        companyEmail: null,
        streetAddress: null,
        zipCode: null,
        city: null,
        country: null,
        taxId: null,
        website: null,
        
        // Clear authentication data
        password: 'ANONYMIZED',
        resetToken: null,
        resetTokenExpires: null,
        
        // Clear 2FA data
        twoFaSecret: null,
        backupCodes: null,
        email2FaCode: null,
        email2FaExpires: null,
        
        // Deactivate account
        isActive: false,
        
        // Mark as deleted (this is the key field for hiding from lists)
        deletedAt: sql`NOW()`,
      })
      .where(eq(users.id, userId));
    
    console.log(`User ${userId} successfully anonymized (GDPR-compliant)`);
    
    // Log the anonymization in activity_logs
    try {
      await db.execute(sql`
        INSERT INTO activity_logs (
          event_type, action, entity_type, entity_id, entity_name,
          performed_by, performed_by_username, performed_by_role,
          shop_id, description, severity
        )
        SELECT 
          'user' as event_type,
          'anonymized' as action,
          'user' as entity_type,
          ${userId} as entity_id,
          ${currentUser.username || currentUser.email} as entity_name,
          ${performedBy} as performed_by,
          u.username as performed_by_username,
          u.role as performed_by_role,
          u.shop_id as shop_id,
          'User account anonymized (GDPR compliance)' as description,
          'high' as severity
        FROM users u
        WHERE u.id = ${performedBy}
      `);
    } catch (logError) {
      console.warn('Could not log anonymization:', logError);
      // Don't fail the operation if logging fails
    }
    
    return true;
  } catch (error) {
    console.error(`Error anonymizing user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if a user is anonymized
 */
export async function isUserAnonymized(userId: number): Promise<boolean> {
  const [user] = await db.select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId));
  
  return !!user?.deletedAt;
}
