import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import type { TenantRouter } from '../tenancy/tenantRouter.js';

// =============================================================================
// LEGACY TABLE RETIREMENT - Cleanup unified DB after tenant migration
// =============================================================================
// Safely retires legacy shared tables from unified database
// Archives data before deletion
// Provides rollback capability
// =============================================================================

export interface RetirementConfig {
  archiveBeforeDelete: boolean;
  verifyMigration: boolean;
  dryRun: boolean;
}

export interface TableRetirementStatus {
  tableName: string;
  status: 'pending' | 'verified' | 'archived' | 'retired' | 'failed';
  rowCount?: number;
  archivedAt?: Date;
  retiredAt?: Date;
  error?: string;
}

export interface RetirementPlan {
  tables: string[];
  estimatedRows: number;
  estimatedSizeBytes: number;
  archivePath?: string;
}

export class LegacyRetirement {
  private tenantRouter: TenantRouter;
  private config: RetirementConfig;
  private retirementStatus: Map<string, TableRetirementStatus> = new Map();

  // Tables that will be retired (moved to tenant DBs)
  private readonly TENANT_TABLES = [
    'customers',
    'repairs',
    'cost_estimates',
    'device_issues',
    'error_catalog_entries',
    'user_device_types',
    'user_brands',
    'user_models',
    'user_model_series',
    'spare_parts',
    'loaner_devices',
    'email_history',
    'email_templates',
    'business_settings',
    'print_templates',
    'qr_codes',
    'qr_code_usage',
    'kiosk_terminals'
  ];

  constructor(
    tenantRouter: TenantRouter,
    config: Partial<RetirementConfig> = {}
  ) {
    this.tenantRouter = tenantRouter;
    this.config = {
      archiveBeforeDelete: config.archiveBeforeDelete ?? true,
      verifyMigration: config.verifyMigration ?? true,
      dryRun: config.dryRun ?? true
    };

    console.log('🗑️ Legacy Retirement initialized');
    console.log(`  Archive before delete: ${this.config.archiveBeforeDelete}`);
    console.log(`  Verify migration: ${this.config.verifyMigration}`);
    console.log(`  Dry run: ${this.config.dryRun}`);
  }

  // =============================================================================
  // PLANNING & VERIFICATION
  // =============================================================================

  /**
   * Creates a retirement plan for tenant tables
   */
  async createRetirementPlan(): Promise<RetirementPlan> {
    console.log('📋 Creating retirement plan...');

    let totalRows = 0;
    let totalSizeBytes = 0;

    for (const table of this.TENANT_TABLES) {
      try {
        // Get row count
        const countResult = await db.execute(sql.raw(`
          SELECT COUNT(*) as count FROM ${table}
        `));
        const rowCount = parseInt(countResult.rows[0]?.count || '0');

        // Get table size
        const sizeResult = await db.execute(sql.raw(`
          SELECT pg_total_relation_size('${table}') as size
        `));
        const sizeBytes = parseInt(sizeResult.rows[0]?.size || '0');

        totalRows += rowCount;
        totalSizeBytes += sizeBytes;

        this.retirementStatus.set(table, {
          tableName: table,
          status: 'pending',
          rowCount
        });

        console.log(`  ✅ ${table}: ${rowCount} rows, ${this.formatBytes(sizeBytes)}`);
      } catch (error) {
        console.error(`  ❌ Error analyzing ${table}:`, error);
        this.retirementStatus.set(table, {
          tableName: table,
          status: 'failed',
          error: String(error)
        });
      }
    }

    const plan: RetirementPlan = {
      tables: this.TENANT_TABLES,
      estimatedRows: totalRows,
      estimatedSizeBytes: totalSizeBytes
    };

    console.log(`\n📊 Retirement Plan Summary:`);
    console.log(`  Tables to retire: ${plan.tables.length}`);
    console.log(`  Total rows: ${totalRows.toLocaleString()}`);
    console.log(`  Total size: ${this.formatBytes(totalSizeBytes)}`);

    return plan;
  }

  /**
   * Verifies that data has been migrated to tenant databases
   */
  async verifyMigration(shopId: number): Promise<{
    success: boolean;
    missingTables: string[];
    rowCountMismatches: Array<{ table: string; unified: number; tenant: number }>;
  }> {
    console.log(`\n🔍 Verifying migration for shop ${shopId}...`);

    const missingTables: string[] = [];
    const rowCountMismatches: Array<{ table: string; unified: number; tenant: number }> = [];

    try {
      // Get tenant database connection
      const tenantDb = await this.tenantRouter.getTenantConnection(shopId);

      for (const table of this.TENANT_TABLES) {
        try {
          // Get unified DB count
          const unifiedResult = await db.execute(sql.raw(`
            SELECT COUNT(*) as count 
            FROM ${table} 
            WHERE shop_id = ${shopId}
          `));
          const unifiedCount = parseInt(unifiedResult.rows[0]?.count || '0');

          // Get tenant DB count (no shop_id filter needed - it's isolated)
          const tenantResult = await tenantDb.pool.query(`
            SELECT COUNT(*) as count FROM ${table}
          `);
          const tenantCount = parseInt(tenantResult.rows[0]?.count || '0');

          // Compare counts
          if (unifiedCount !== tenantCount) {
            console.warn(`  ⚠️ ${table}: Mismatch! Unified=${unifiedCount}, Tenant=${tenantCount}`);
            rowCountMismatches.push({
              table,
              unified: unifiedCount,
              tenant: tenantCount
            });
          } else {
            console.log(`  ✅ ${table}: ${unifiedCount} rows (verified)`);
          }
        } catch (error) {
          console.error(`  ❌ Error verifying ${table}:`, error);
          missingTables.push(table);
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to connect to tenant DB for shop ${shopId}:`, error);
      throw new Error(`Cannot verify migration: tenant database connection failed`);
    }

    const success = missingTables.length === 0 && rowCountMismatches.length === 0;

    if (success) {
      console.log('✅ Migration verification passed - all data matches');
    } else {
      console.error('❌ Migration verification failed:');
      if (missingTables.length > 0) {
        console.error(`  Missing tables: ${missingTables.join(', ')}`);
      }
      if (rowCountMismatches.length > 0) {
        console.error(`  Row count mismatches in ${rowCountMismatches.length} tables`);
      }
    }

    return {
      success,
      missingTables,
      rowCountMismatches
    };
  }

  // =============================================================================
  // ARCHIVAL
  // =============================================================================

  /**
   * Archives a table to a backup schema
   */
  async archiveTable(tableName: string): Promise<boolean> {
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would archive table: ${tableName}`);
      return true;
    }

    console.log(`📦 Archiving table: ${tableName}...`);

    try {
      // Create archive schema if it doesn't exist
      await db.execute(sql.raw(`
        CREATE SCHEMA IF NOT EXISTS archive
      `));

      // Create archive table with timestamp
      const archiveTableName = `${tableName}_${Date.now()}`;
      
      await db.execute(sql.raw(`
        CREATE TABLE archive.${archiveTableName} AS 
        SELECT * FROM ${tableName}
      `));

      // Update status
      const status = this.retirementStatus.get(tableName);
      if (status) {
        status.status = 'archived';
        status.archivedAt = new Date();
      }

      console.log(`✅ Archived ${tableName} to archive.${archiveTableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to archive ${tableName}:`, error);
      
      const status = this.retirementStatus.get(tableName);
      if (status) {
        status.status = 'failed';
        status.error = String(error);
      }
      
      return false;
    }
  }

  /**
   * Archives all tenant tables
   */
  async archiveAllTables(): Promise<{
    successful: string[];
    failed: string[];
  }> {
    console.log('\n📦 Archiving all tenant tables...');

    const successful: string[] = [];
    const failed: string[] = [];

    for (const table of this.TENANT_TABLES) {
      const success = await this.archiveTable(table);
      
      if (success) {
        successful.push(table);
      } else {
        failed.push(table);
      }
    }

    console.log(`\n✅ Archived: ${successful.length} tables`);
    console.log(`❌ Failed: ${failed.length} tables`);

    return { successful, failed };
  }

  // =============================================================================
  // RETIREMENT
  // =============================================================================

  /**
   * Retires a table by truncating it (keeps schema)
   */
  async retireTable(tableName: string): Promise<boolean> {
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would retire table: ${tableName}`);
      return true;
    }

    // Verify archived if required
    const status = this.retirementStatus.get(tableName);
    if (this.config.archiveBeforeDelete && status?.status !== 'archived') {
      console.error(`❌ Cannot retire ${tableName}: not archived`);
      return false;
    }

    console.log(`🗑️ Retiring table: ${tableName}...`);

    try {
      // Truncate table (keeps schema, removes data)
      await db.execute(sql.raw(`TRUNCATE TABLE ${tableName} CASCADE`));

      // Update status
      if (status) {
        status.status = 'retired';
        status.retiredAt = new Date();
      }

      console.log(`✅ Retired ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to retire ${tableName}:`, error);
      
      if (status) {
        status.status = 'failed';
        status.error = String(error);
      }
      
      return false;
    }
  }

  /**
   * Verifies migration for all active shops
   */
  async verifyAllShops(shopIds: number[]): Promise<{
    success: boolean;
    failedShops: number[];
    details: Map<number, { missingTables: string[]; mismatches: any[] }>;
  }> {
    console.log(`\n🔍 Verifying migration for ${shopIds.length} shops...`);

    const failedShops: number[] = [];
    const details = new Map<number, { missingTables: string[]; mismatches: any[] }>();

    for (const shopId of shopIds) {
      const result = await this.verifyMigration(shopId);
      
      if (!result.success) {
        failedShops.push(shopId);
        details.set(shopId, {
          missingTables: result.missingTables,
          mismatches: result.rowCountMismatches
        });
      }
    }

    const success = failedShops.length === 0;

    console.log(success 
      ? `✅ All ${shopIds.length} shops verified successfully`
      : `❌ Verification failed for ${failedShops.length} shops`);

    return {
      success,
      failedShops,
      details
    };
  }

  /**
   * Retires all tenant tables (after verification)
   */
  async retireAllTables(shopIds: number[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    console.log('\n🗑️ Retiring all tenant tables...');

    // Verify migration first if configured
    if (this.config.verifyMigration) {
      console.log('🔍 Verifying migration before retirement...');
      const verification = await this.verifyAllShops(shopIds);
      
      if (!verification.success) {
        console.error(`❌ Cannot proceed with retirement: ${verification.failedShops.length} shops failed verification`);
        for (const shopId of verification.failedShops) {
          const detail = verification.details.get(shopId);
          console.error(`  Shop ${shopId}:`);
          if (detail?.missingTables.length) {
            console.error(`    Missing tables: ${detail.missingTables.join(', ')}`);
          }
          if (detail?.mismatches.length) {
            console.error(`    Row count mismatches: ${detail.mismatches.length} tables`);
          }
        }
        return { successful: [], failed: this.TENANT_TABLES };
      }
      
      console.log('✅ Verification passed - safe to proceed with retirement');
    }

    // Archive first if configured
    if (this.config.archiveBeforeDelete) {
      const archiveResult = await this.archiveAllTables();
      if (archiveResult.failed.length > 0) {
        console.error(`❌ Cannot proceed with retirement due to archive failures`);
        return { successful: [], failed: this.TENANT_TABLES };
      }
    }

    const successful: string[] = [];
    const failed: string[] = [];

    for (const table of this.TENANT_TABLES) {
      const success = await this.retireTable(table);
      
      if (success) {
        successful.push(table);
      } else {
        failed.push(table);
      }
    }

    console.log(`\n✅ Retired: ${successful.length} tables`);
    console.log(`❌ Failed: ${failed.length} tables`);

    return { successful, failed };
  }

  /**
   * Drops a table permanently (use with caution!)
   */
  async dropTable(tableName: string, force = false): Promise<boolean> {
    if (!force) {
      console.error(`❌ Cannot drop ${tableName}: force flag not set`);
      return false;
    }

    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would drop table: ${tableName}`);
      return true;
    }

    console.log(`💣 DROPPING table: ${tableName}...`);

    try {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName} CASCADE`));
      console.log(`✅ Dropped ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to drop ${tableName}:`, error);
      return false;
    }
  }

  // =============================================================================
  // ROLLBACK
  // =============================================================================

  /**
   * Restores a table from archive
   */
  async restoreFromArchive(tableName: string): Promise<boolean> {
    if (this.config.dryRun) {
      console.log(`[DRY RUN] Would restore table: ${tableName}`);
      return true;
    }

    console.log(`♻️ Restoring table from archive: ${tableName}...`);

    try {
      // Find latest archive
      const result = await db.execute(sql.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'archive' 
          AND table_name LIKE '${tableName}_%' 
        ORDER BY table_name DESC 
        LIMIT 1
      `));

      const archiveTableName = result.rows[0]?.table_name;
      
      if (!archiveTableName) {
        throw new Error(`No archive found for ${tableName}`);
      }

      // Restore data
      await db.execute(sql.raw(`
        INSERT INTO ${tableName} 
        SELECT * FROM archive.${archiveTableName}
      `));

      console.log(`✅ Restored ${tableName} from archive.${archiveTableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restore ${tableName}:`, error);
      return false;
    }
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  /**
   * Gets retirement status
   */
  getStatus(): TableRetirementStatus[] {
    return Array.from(this.retirementStatus.values());
  }

  /**
   * Generates retirement report
   */
  generateReport(): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('LEGACY TABLE RETIREMENT STATUS');
    lines.push('='.repeat(80));
    lines.push(`Configuration:`);
    lines.push(`  Archive before delete: ${this.config.archiveBeforeDelete}`);
    lines.push(`  Verify migration: ${this.config.verifyMigration}`);
    lines.push(`  Dry run: ${this.config.dryRun}`);
    lines.push('');

    lines.push('TABLE STATUS:');
    for (const status of this.retirementStatus.values()) {
      lines.push(`  ${status.tableName}:`);
      lines.push(`    Status: ${status.status.toUpperCase()}`);
      if (status.rowCount !== undefined) {
        lines.push(`    Rows: ${status.rowCount.toLocaleString()}`);
      }
      if (status.archivedAt) {
        lines.push(`    Archived: ${status.archivedAt.toISOString()}`);
      }
      if (status.retiredAt) {
        lines.push(`    Retired: ${status.retiredAt.toISOString()}`);
      }
      if (status.error) {
        lines.push(`    Error: ${status.error}`);
      }
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Formats bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Resets retirement status
   */
  reset(): void {
    this.retirementStatus.clear();
    console.log('🔄 Legacy Retirement reset');
  }
}

/**
 * Factory function to create legacy retirement service
 */
export function createLegacyRetirement(
  tenantRouter: TenantRouter,
  config?: Partial<RetirementConfig>
): LegacyRetirement {
  return new LegacyRetirement(tenantRouter, config);
}
