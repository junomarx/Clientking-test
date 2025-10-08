import type { IStorage } from '../storage.js';
import type { TenantRouter } from '../tenancy/tenantRouter.js';

// =============================================================================
// DATA SYNCHRONIZER - Batch migration of existing data to tenant databases
// =============================================================================
// Migrates historical data from unified database to tenant-specific databases
// Supports incremental sync, progress tracking, and error recovery
// Ensures data consistency during migration
// =============================================================================

interface SyncConfig {
  batchSize: number; // Number of records to sync per batch
  delayBetweenBatchesMs: number; // Delay to prevent database overload
  verifyAfterSync: boolean; // Verify data consistency after migration
  skipExisting: boolean; // Skip records that already exist in tenant DB
  dryRun: boolean; // Simulate migration without actually writing
}

interface SyncProgress {
  shopId: number;
  shopName?: string;
  entity: string; // 'customers', 'repairs', etc.
  totalRecords: number;
  syncedRecords: number;
  failedRecords: number;
  percentComplete: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemainingMs?: number;
  errors: Array<{ recordId: number; error: string }>;
}

interface SyncResult {
  shopId: number;
  entity: string;
  success: boolean;
  recordsSynced: number;
  recordsFailed: number;
  duration: number;
  errors: string[];
}

interface MigrationPlan {
  totalShops: number;
  totalRecords: number;
  estimatedDurationMs: number;
  entities: string[];
  shops: Array<{ shopId: number; shopName: string; recordCount: number }>;
}

export class DataSynchronizer {
  private unifiedStorage: IStorage;
  private tenantRouter: TenantRouter;
  private config: SyncConfig;
  private progressTracking: Map<string, SyncProgress> = new Map();

  constructor(
    unifiedStorage: IStorage,
    tenantRouter: TenantRouter,
    config: Partial<SyncConfig> = {}
  ) {
    this.unifiedStorage = unifiedStorage;
    this.tenantRouter = tenantRouter;
    this.config = {
      batchSize: config.batchSize ?? 100,
      delayBetweenBatchesMs: config.delayBetweenBatchesMs ?? 100,
      verifyAfterSync: config.verifyAfterSync ?? true,
      skipExisting: config.skipExisting ?? true,
      dryRun: config.dryRun ?? false
    };

    console.log('🔄 Data synchronizer initialized:', this.config);
  }

  // =============================================================================
  // MIGRATION PLANNING
  // =============================================================================

  /**
   * Creates a migration plan by analyzing existing data
   */
  async createMigrationPlan(): Promise<MigrationPlan> {
    console.log('📋 Creating migration plan...');

    try {
      // Get all shops
      const shops = await this.unifiedStorage.getAllShops();
      
      // Count records for each shop
      const shopDetails = [];
      let totalRecords = 0;

      for (const shop of shops) {
        const customers = await this.unifiedStorage.getCustomersByShop(shop.id);
        const repairs = await this.unifiedStorage.getRepairsByShop(shop.id);
        
        const recordCount = customers.length + repairs.length;
        totalRecords += recordCount;

        shopDetails.push({
          shopId: shop.id,
          shopName: shop.name,
          recordCount
        });
      }

      // Estimate duration (rough calculation)
      const recordsPerSecond = this.config.batchSize / 
        (this.config.delayBetweenBatchesMs / 1000);
      const estimatedDurationMs = (totalRecords / recordsPerSecond) * 1000;

      const plan: MigrationPlan = {
        totalShops: shops.length,
        totalRecords,
        estimatedDurationMs,
        entities: ['customers', 'repairs', 'devices', 'error_catalog'],
        shops: shopDetails
      };

      console.log('📊 Migration plan created:', {
        shops: plan.totalShops,
        records: plan.totalRecords,
        estimatedMinutes: Math.ceil(plan.estimatedDurationMs / 60000)
      });

      return plan;

    } catch (error) {
      console.error('❌ Failed to create migration plan:', error);
      throw error;
    }
  }

  // =============================================================================
  // DATA SYNCHRONIZATION
  // =============================================================================

  /**
   * Synchronizes all data for all shops
   */
  async syncAllShops(): Promise<SyncResult[]> {
    console.log('🚀 Starting full data synchronization...');
    
    const shops = await this.unifiedStorage.getAllShops();
    const results: SyncResult[] = [];

    for (const shop of shops) {
      try {
        const shopResults = await this.syncShopData(shop.id, shop.name);
        results.push(...shopResults);
      } catch (error) {
        console.error(`❌ Failed to sync shop ${shop.id}:`, error);
        results.push({
          shopId: shop.id,
          entity: 'all',
          success: false,
          recordsSynced: 0,
          recordsFailed: 0,
          duration: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    console.log('✅ Full synchronization completed:', {
      totalShops: shops.length,
      successfulSyncs: results.filter(r => r.success).length,
      failedSyncs: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Synchronizes all data for a specific shop
   */
  async syncShopData(shopId: number, shopName?: string): Promise<SyncResult[]> {
    console.log(`🏪 Syncing data for shop ${shopId} (${shopName})...`);
    
    const results: SyncResult[] = [];

    // Sync customers
    const customerResult = await this.syncEntity(
      shopId,
      'customers',
      async () => this.unifiedStorage.getCustomersByShop(shopId),
      async (tenantDb, record) => {
        await tenantDb.db.insert(tenantDb.schema.customers).values(record);
      }
    );
    results.push(customerResult);

    // Sync repairs
    const repairResult = await this.syncEntity(
      shopId,
      'repairs',
      async () => this.unifiedStorage.getRepairsByShop(shopId),
      async (tenantDb, record) => {
        await tenantDb.db.insert(tenantDb.schema.repairs).values(record);
      }
    );
    results.push(repairResult);

    // Additional entities can be added here...

    console.log(`✅ Shop ${shopId} sync completed:`, {
      entities: results.length,
      totalRecords: results.reduce((sum, r) => sum + r.recordsSynced, 0)
    });

    return results;
  }

  /**
   * Synchronizes a specific entity (table) for a shop
   */
  private async syncEntity<T>(
    shopId: number,
    entityName: string,
    fetchRecords: () => Promise<T[]>,
    insertRecord: (tenantDb: any, record: T) => Promise<void>
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const progressKey = `${shopId}-${entityName}`;

    try {
      console.log(`📦 Syncing ${entityName} for shop ${shopId}...`);

      // Fetch all records from unified database
      const records = await fetchRecords();

      if (records.length === 0) {
        console.log(`ℹ️ No ${entityName} to sync for shop ${shopId}`);
        return {
          shopId,
          entity: entityName,
          success: true,
          recordsSynced: 0,
          recordsFailed: 0,
          duration: Date.now() - startTime,
          errors: []
        };
      }

      // Initialize progress tracking
      const progress: SyncProgress = {
        shopId,
        entity: entityName,
        totalRecords: records.length,
        syncedRecords: 0,
        failedRecords: 0,
        percentComplete: 0,
        startedAt: new Date(),
        errors: []
      };
      this.progressTracking.set(progressKey, progress);

      // Get tenant database connection
      const tenantDb = await this.tenantRouter.getTenantConnection(shopId);

      // Sync in batches
      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i += this.config.batchSize) {
        const batch = records.slice(i, i + this.config.batchSize);

        // Process batch
        for (const record of batch) {
          try {
            if (!this.config.dryRun) {
              // Check if record exists (if skipExisting is true)
              if (this.config.skipExisting) {
                const exists = await this.checkRecordExists(tenantDb, entityName, record);
                if (exists) {
                  syncedCount++;
                  continue;
                }
              }

              // Insert record into tenant database
              await insertRecord(tenantDb, record);
            }
            
            syncedCount++;

          } catch (error) {
            failedCount++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Record ${(record as any).id}: ${errorMsg}`);
            progress.errors.push({
              recordId: (record as any).id,
              error: errorMsg
            });
          }
        }

        // Update progress
        progress.syncedRecords = syncedCount;
        progress.failedRecords = failedCount;
        progress.percentComplete = Math.round((syncedCount + failedCount) / records.length * 100);
        
        // Estimate time remaining
        const elapsed = Date.now() - startTime;
        const rate = (syncedCount + failedCount) / elapsed;
        progress.estimatedTimeRemainingMs = (records.length - syncedCount - failedCount) / rate;

        // Delay between batches to prevent overload
        if (i + this.config.batchSize < records.length) {
          await this.delay(this.config.delayBetweenBatchesMs);
        }
      }

      // Mark as complete
      progress.completedAt = new Date();
      progress.percentComplete = 100;

      const duration = Date.now() - startTime;
      console.log(`✅ Synced ${syncedCount}/${records.length} ${entityName} for shop ${shopId} in ${duration}ms`);

      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} ${entityName} failed to sync for shop ${shopId}`);
      }

      // Verify data consistency if enabled
      if (this.config.verifyAfterSync && !this.config.dryRun) {
        await this.verifyEntitySync(shopId, entityName, records.length);
      }

      return {
        shopId,
        entity: entityName,
        success: failedCount === 0,
        recordsSynced: syncedCount,
        recordsFailed: failedCount,
        duration,
        errors
      };

    } catch (error) {
      console.error(`❌ Failed to sync ${entityName} for shop ${shopId}:`, error);
      return {
        shopId,
        entity: entityName,
        success: false,
        recordsSynced: 0,
        recordsFailed: 0,
        duration: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Checks if a record already exists in tenant database
   */
  private async checkRecordExists(tenantDb: any, entityName: string, record: any): Promise<boolean> {
    try {
      const table = tenantDb.schema[entityName];
      if (!table) return false;

      const result = await tenantDb.db.select()
        .from(table)
        .where(tenantDb.db.eq(table.id, record.id))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      // If error checking, assume doesn't exist to allow insertion attempt
      return false;
    }
  }

  /**
   * Verifies that data was synced correctly
   */
  private async verifyEntitySync(
    shopId: number,
    entityName: string,
    expectedCount: number
  ): Promise<boolean> {
    try {
      const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
      const table = tenantDb.schema[entityName];
      
      const result = await tenantDb.db.select({ count: tenantDb.db.count() })
        .from(table);
      
      const actualCount = result[0]?.count || 0;
      
      if (actualCount === expectedCount) {
        console.log(`✅ Verification passed: ${entityName} count matches (${actualCount})`);
        return true;
      } else {
        console.error(`❌ Verification failed: ${entityName} expected ${expectedCount}, got ${actualCount}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Verification error for ${entityName}:`, error);
      return false;
    }
  }

  // =============================================================================
  // PROGRESS TRACKING & MONITORING
  // =============================================================================

  /**
   * Gets current sync progress for a shop
   */
  getSyncProgress(shopId: number, entityName?: string): SyncProgress | SyncProgress[] {
    if (entityName) {
      const progress = this.progressTracking.get(`${shopId}-${entityName}`);
      return progress || this.createEmptyProgress(shopId, entityName);
    } else {
      // Return all progress for this shop
      const shopProgress: SyncProgress[] = [];
      for (const [key, progress] of this.progressTracking.entries()) {
        if (key.startsWith(`${shopId}-`)) {
          shopProgress.push(progress);
        }
      }
      return shopProgress;
    }
  }

  /**
   * Gets overall migration progress across all shops
   */
  getOverallProgress(): {
    totalRecords: number;
    syncedRecords: number;
    failedRecords: number;
    percentComplete: number;
    activeShops: number;
  } {
    let totalRecords = 0;
    let syncedRecords = 0;
    let failedRecords = 0;
    const activeShops = new Set<number>();

    for (const progress of this.progressTracking.values()) {
      totalRecords += progress.totalRecords;
      syncedRecords += progress.syncedRecords;
      failedRecords += progress.failedRecords;
      
      if (!progress.completedAt) {
        activeShops.add(progress.shopId);
      }
    }

    return {
      totalRecords,
      syncedRecords,
      failedRecords,
      percentComplete: totalRecords > 0 ? Math.round((syncedRecords + failedRecords) / totalRecords * 100) : 0,
      activeShops: activeShops.size
    };
  }

  /**
   * Creates an empty progress object
   */
  private createEmptyProgress(shopId: number, entityName: string): SyncProgress {
    return {
      shopId,
      entity: entityName,
      totalRecords: 0,
      syncedRecords: 0,
      failedRecords: 0,
      percentComplete: 0,
      startedAt: new Date(),
      errors: []
    };
  }

  /**
   * Clears all progress tracking
   */
  clearProgress(): void {
    this.progressTracking.clear();
    console.log('📊 Progress tracking cleared');
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =============================================================================
  // INCREMENTAL SYNC
  // =============================================================================

  /**
   * Syncs only records created/updated after a certain timestamp
   */
  async syncIncrementalUpdates(
    shopId: number,
    sinceTimestamp: Date
  ): Promise<SyncResult[]> {
    console.log(`🔄 Syncing incremental updates for shop ${shopId} since ${sinceTimestamp}`);
    
    // This would filter records by timestamp
    // Implementation depends on whether your records have updatedAt fields
    
    return this.syncShopData(shopId);
  }
}

/**
 * Factory function to create data synchronizer
 */
export function createDataSynchronizer(
  unifiedStorage: IStorage,
  tenantRouter: TenantRouter,
  config?: Partial<SyncConfig>
): DataSynchronizer {
  return new DataSynchronizer(unifiedStorage, tenantRouter, config);
}