import type { IStorage } from '../storage.js';
import type { TenantProvisioning } from '../tenancy/tenantProvisioning.js';
import type { TenantRouter } from '../tenancy/tenantRouter.js';
import type { ConnectionRegistry } from '../tenancy/connectionRegistry.js';
import type { MigrationRunner } from '../tenancy/migrationRunner.js';

// =============================================================================
// PROVISIONING WORKFLOW - Creates tenant databases for all existing shops
// =============================================================================
// Orchestrates the provisioning of individual tenant databases
// Handles batch provisioning with progress tracking and error recovery
// Integrates with connection registry and migration runner
// =============================================================================

interface ProvisioningProgress {
  shopId: number;
  shopName: string;
  status: 'pending' | 'provisioning' | 'schema_init' | 'validating' | 'completed' | 'failed';
  databaseName?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  steps: {
    databaseCreated: boolean;
    userCreated: boolean;
    schemaInitialized: boolean;
    connectionRegistered: boolean;
    validated: boolean;
  };
}

interface ProvisioningResult {
  success: boolean;
  totalShops: number;
  provisionedShops: number;
  failedShops: number;
  progress: ProvisioningProgress[];
  duration: number;
  errors: Array<{ shopId: number; error: string }>;
}

interface ProvisioningConfig {
  concurrency: number; // Number of shops to provision in parallel
  retryAttempts: number; // Retry failed provisions
  skipExisting: boolean; // Skip shops that already have databases
  dryRun: boolean; // Simulate without actually creating databases
  databasePrefix: string; // Prefix for tenant database names
}

export class ProvisioningWorkflow {
  private unifiedStorage: IStorage;
  private tenantProvisioning: TenantProvisioning;
  private tenantRouter: TenantRouter;
  private connectionRegistry: ConnectionRegistry;
  private migrationRunner: MigrationRunner;
  private config: ProvisioningConfig;
  private progressMap: Map<number, ProvisioningProgress> = new Map();

  constructor(
    unifiedStorage: IStorage,
    tenantProvisioning: TenantProvisioning,
    tenantRouter: TenantRouter,
    connectionRegistry: ConnectionRegistry,
    migrationRunner: MigrationRunner,
    config: Partial<ProvisioningConfig> = {}
  ) {
    this.unifiedStorage = unifiedStorage;
    this.tenantProvisioning = tenantProvisioning;
    this.tenantRouter = tenantRouter;
    this.connectionRegistry = connectionRegistry;
    this.migrationRunner = migrationRunner;
    this.config = {
      concurrency: config.concurrency ?? 3,
      retryAttempts: config.retryAttempts ?? 2,
      skipExisting: config.skipExisting ?? true,
      dryRun: config.dryRun ?? false,
      databasePrefix: config.databasePrefix ?? 'tenant_shop_'
    };

    console.log('🏗️ Provisioning workflow initialized:', this.config);
  }

  // =============================================================================
  // MAIN PROVISIONING WORKFLOW
  // =============================================================================

  /**
   * Provisions tenant databases for all existing shops
   */
  async provisionAllTenants(): Promise<ProvisioningResult> {
    console.log('🚀 Starting tenant database provisioning for all shops...');
    const startTime = Date.now();

    try {
      // Get all shops from unified database
      const shops = await this.unifiedStorage.getAllShops();
      console.log(`📊 Found ${shops.length} shops to provision`);

      if (shops.length === 0) {
        return {
          success: true,
          totalShops: 0,
          provisionedShops: 0,
          failedShops: 0,
          progress: [],
          duration: 0,
          errors: []
        };
      }

      // Initialize progress tracking
      for (const shop of shops) {
        this.progressMap.set(shop.id, {
          shopId: shop.id,
          shopName: shop.name,
          status: 'pending',
          steps: {
            databaseCreated: false,
            userCreated: false,
            schemaInitialized: false,
            connectionRegistered: false,
            validated: false
          }
        });
      }

      // Check for existing tenant databases if skipExisting is enabled
      if (this.config.skipExisting) {
        await this.checkExistingTenants(shops);
      }

      // Provision in batches based on concurrency setting
      const pendingShops = shops.filter(shop => {
        const progress = this.progressMap.get(shop.id);
        return progress?.status === 'pending';
      });

      console.log(`📦 Provisioning ${pendingShops.length} shops (${shops.length - pendingShops.length} already exist)`);

      // Process shops in batches
      const results = await this.processBatches(pendingShops);

      // Compile final results
      const progress = Array.from(this.progressMap.values());
      const provisionedCount = progress.filter(p => p.status === 'completed').length;
      const failedCount = progress.filter(p => p.status === 'failed').length;
      const errors = progress
        .filter(p => p.error)
        .map(p => ({ shopId: p.shopId, error: p.error! }));

      const duration = Date.now() - startTime;

      const result: ProvisioningResult = {
        success: failedCount === 0,
        totalShops: shops.length,
        provisionedShops: provisionedCount,
        failedShops: failedCount,
        progress,
        duration,
        errors
      };

      console.log(`✅ Provisioning completed in ${duration}ms:`, {
        total: shops.length,
        provisioned: provisionedCount,
        failed: failedCount
      });

      return result;

    } catch (error) {
      console.error('❌ Provisioning workflow failed:', error);
      throw error;
    }
  }

  /**
   * Provisions a single tenant database for a shop
   */
  async provisionSingleTenant(shopId: number): Promise<ProvisioningProgress> {
    console.log(`🏗️ Provisioning tenant database for shop ${shopId}...`);

    try {
      // Get shop details
      const shop = await this.unifiedStorage.getShopById(shopId);
      if (!shop) {
        throw new Error(`Shop ${shopId} not found`);
      }

      // Initialize progress
      const progress: ProvisioningProgress = {
        shopId: shop.id,
        shopName: shop.name,
        status: 'provisioning',
        startedAt: new Date(),
        steps: {
          databaseCreated: false,
          userCreated: false,
          schemaInitialized: false,
          connectionRegistered: false,
          validated: false
        }
      };
      this.progressMap.set(shopId, progress);

      // Generate database name
      const databaseName = this.generateDatabaseName(shop.id, shop.name);
      progress.databaseName = databaseName;

      if (this.config.dryRun) {
        console.log(`🔍 DRY RUN: Would create database '${databaseName}' for shop ${shop.id}`);
        progress.status = 'completed';
        progress.completedAt = new Date();
        return progress;
      }

      // Step 1: Create database and user
      console.log(`📦 Step 1/5: Creating database '${databaseName}'...`);
      const provisionResult = await this.tenantProvisioning.provisionTenant(
        shop.id,
        databaseName
      );
      progress.steps.databaseCreated = true;
      progress.steps.userCreated = true;

      // Step 2: Register connection credentials
      console.log(`🔐 Step 2/5: Registering connection credentials...`);
      await this.connectionRegistry.registerConnection(shop.id, {
        databaseName: provisionResult.databaseName,
        username: provisionResult.username,
        password: provisionResult.password,
        host: provisionResult.host,
        port: provisionResult.port
      });
      progress.steps.connectionRegistered = true;

      // Step 3: Initialize schema
      console.log(`📋 Step 3/5: Initializing tenant schema...`);
      progress.status = 'schema_init';
      await this.migrationRunner.runMigrations(shop.id);
      progress.steps.schemaInitialized = true;

      // Step 4: Validate setup
      console.log(`✅ Step 4/5: Validating tenant database...`);
      progress.status = 'validating';
      const isValid = await this.validateTenantDatabase(shop.id);
      if (!isValid) {
        throw new Error('Tenant database validation failed');
      }
      progress.steps.validated = true;

      // Step 5: Complete
      progress.status = 'completed';
      progress.completedAt = new Date();

      console.log(`✅ Successfully provisioned tenant database for shop ${shop.id}`);
      return progress;

    } catch (error) {
      const progress = this.progressMap.get(shopId);
      if (progress) {
        progress.status = 'failed';
        progress.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      console.error(`❌ Failed to provision shop ${shopId}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // BATCH PROCESSING
  // =============================================================================

  /**
   * Processes shops in batches based on concurrency setting
   */
  private async processBatches(shops: any[]): Promise<void> {
    const batches = this.createBatches(shops, this.config.concurrency);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} shops)...`);

      // Process batch in parallel
      const batchPromises = batch.map(shop => 
        this.provisionWithRetry(shop.id)
      );

      await Promise.allSettled(batchPromises);

      // Small delay between batches to prevent database overload
      if (i < batches.length - 1) {
        await this.delay(1000);
      }
    }
  }

  /**
   * Provisions a tenant with retry logic
   */
  private async provisionWithRetry(shopId: number): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.provisionSingleTenant(shopId);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          console.warn(`⚠️ Retry ${attempt}/${this.config.retryAttempts} for shop ${shopId}...`);
          await this.delay(2000 * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    console.error(`❌ All retry attempts failed for shop ${shopId}:`, lastError);
  }

  /**
   * Creates batches of shops for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // =============================================================================
  // VALIDATION & UTILITIES
  // =============================================================================

  /**
   * Checks which shops already have tenant databases
   */
  private async checkExistingTenants(shops: any[]): Promise<void> {
    console.log('🔍 Checking for existing tenant databases...');

    for (const shop of shops) {
      try {
        const connection = await this.connectionRegistry.getConnection(shop.id);
        if (connection) {
          const progress = this.progressMap.get(shop.id);
          if (progress) {
            progress.status = 'completed';
            progress.databaseName = connection.databaseName;
            progress.steps = {
              databaseCreated: true,
              userCreated: true,
              schemaInitialized: true,
              connectionRegistered: true,
              validated: true
            };
          }
        }
      } catch (error) {
        // Connection not found, needs provisioning
      }
    }
  }

  /**
   * Validates that a tenant database is properly set up
   */
  private async validateTenantDatabase(shopId: number): Promise<boolean> {
    try {
      // Get tenant connection
      const tenantDb = await this.tenantRouter.getTenantConnection(shopId);

      // Check that schema exists by querying information_schema using the underlying pool
      const result = await tenantDb.pool.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const tableCount = parseInt(result.rows[0]?.table_count || '0');
      
      if (tableCount === 0) {
        console.error(`❌ No tables found in tenant database for shop ${shopId}`);
        return false;
      }

      console.log(`✅ Tenant database for shop ${shopId} has ${tableCount} tables`);
      return true;

    } catch (error) {
      console.error(`❌ Validation failed for shop ${shopId}:`, error);
      return false;
    }
  }

  /**
   * Generates a database name for a shop
   */
  private generateDatabaseName(shopId: number, shopName: string): string {
    // Sanitize shop name for database naming
    const sanitized = shopName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 20); // Limit length

    return `${this.config.databasePrefix}${shopId}_${sanitized}`;
  }

  /**
   * Gets current provisioning progress
   */
  getProgress(shopId?: number): ProvisioningProgress | ProvisioningProgress[] {
    if (shopId !== undefined) {
      const progress = this.progressMap.get(shopId);
      if (!progress) {
        throw new Error(`No provisioning progress found for shop ${shopId}`);
      }
      return progress;
    } else {
      return Array.from(this.progressMap.values());
    }
  }

  /**
   * Gets overall provisioning status
   */
  getOverallStatus(): {
    total: number;
    pending: number;
    provisioning: number;
    completed: number;
    failed: number;
  } {
    const progress = Array.from(this.progressMap.values());
    return {
      total: progress.length,
      pending: progress.filter(p => p.status === 'pending').length,
      provisioning: progress.filter(p => 
        p.status === 'provisioning' || p.status === 'schema_init' || p.status === 'validating'
      ).length,
      completed: progress.filter(p => p.status === 'completed').length,
      failed: progress.filter(p => p.status === 'failed').length
    };
  }

  /**
   * Clears progress tracking
   */
  clearProgress(): void {
    this.progressMap.clear();
    console.log('📊 Provisioning progress cleared');
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates provisioning report
   */
  generateReport(result: ProvisioningResult): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('TENANT PROVISIONING REPORT');
    lines.push('='.repeat(80));
    lines.push(`Status: ${result.success ? 'SUCCESS' : 'PARTIAL FAILURE'}`);
    lines.push(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push('');
    
    lines.push('SUMMARY:');
    lines.push(`  Total Shops: ${result.totalShops}`);
    lines.push(`  Provisioned: ${result.provisionedShops}`);
    lines.push(`  Failed: ${result.failedShops}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      for (const error of result.errors) {
        lines.push(`  Shop ${error.shopId}: ${error.error}`);
      }
      lines.push('');
    }

    lines.push('SHOP DETAILS:');
    for (const progress of result.progress) {
      lines.push(`  Shop ${progress.shopId} (${progress.shopName}):`);
      lines.push(`    Status: ${progress.status}`);
      lines.push(`    Database: ${progress.databaseName || 'N/A'}`);
      
      if (progress.steps.databaseCreated) {
        lines.push(`    ✅ Database created`);
      }
      if (progress.steps.schemaInitialized) {
        lines.push(`    ✅ Schema initialized`);
      }
      if (progress.steps.validated) {
        lines.push(`    ✅ Validated`);
      }
      
      if (progress.error) {
        lines.push(`    ❌ Error: ${progress.error}`);
      }
      lines.push('');
    }

    lines.push('='.repeat(80));
    return lines.join('\n');
  }
}

/**
 * Factory function to create provisioning workflow
 */
export function createProvisioningWorkflow(
  unifiedStorage: IStorage,
  tenantProvisioning: TenantProvisioning,
  tenantRouter: TenantRouter,
  connectionRegistry: ConnectionRegistry,
  migrationRunner: MigrationRunner,
  config?: Partial<ProvisioningConfig>
): ProvisioningWorkflow {
  return new ProvisioningWorkflow(
    unifiedStorage,
    tenantProvisioning,
    tenantRouter,
    connectionRegistry,
    migrationRunner,
    config
  );
}