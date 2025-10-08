/**
 * TENANT DATA VALIDATION SCRIPT
 * 
 * Validates data integrity after migration by comparing master and tenant databases.
 * Checks row counts, data consistency, and relationship integrity.
 * 
 * Usage:
 *   docker-compose --profile manual run --rm tenant-validator
 * 
 * Environment Variables:
 *   - DATABASE_URL: Master database connection string
 *   - TENANT_ENCRYPTION_KEY: Key for accessing tenant credentials
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { createConnectionRegistry } from '../server/tenancy/connectionRegistry';

// Tables to validate
const TABLES_TO_VALIDATE = [
  'customers',
  'repairs',
  'spare_parts',
  'loaner_devices',
  'cost_estimates',
  'email_log',
  'orders',
  'qr_codes',
  'signatures',
] as const;

interface ValidationResult {
  tenantShopId: number;
  shopName: string;
  totalChecks: number;
  passed: number;
  failed: number;
  errors: Array<{ table: string; issue: string }>;
}

async function validateAllTenants(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ TENANT DATA VALIDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Connect to master database
  const masterPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(masterPool, { schema });

  try {
    // Initialize connection registry
    const registry = createConnectionRegistry();
    console.log('✅ Connected to master database\n');

    // Get all tenant shop IDs
    const tenantShopIds = await registry.getAllShopIds();

    if (tenantShopIds.length === 0) {
      console.log('⚠️  No tenant databases found');
      process.exit(0);
    }

    console.log(`📊 Validating ${tenantShopIds.length} tenant databases\n`);

    const results: ValidationResult[] = [];

    // Validate each tenant
    for (const tenantShopId of tenantShopIds) {
      try {
        const result = await validateTenant(
          masterPool,
          registry,
          tenantShopId
        );
        results.push(result);

      } catch (error) {
        console.error(`❌ Failed to validate tenant ${tenantShopId}:`, error);
        results.push({
          tenantShopId,
          shopName: `Shop ${tenantShopId}`,
          totalChecks: 0,
          passed: 0,
          failed: 1,
          errors: [{ table: 'ALL', issue: error instanceof Error ? error.message : String(error) }]
        });
      }
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('VALIDATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Tenants validated:  ${tenantShopIds.length}`);
    console.log(`Total checks:       ${results.reduce((sum, r) => sum + r.totalChecks, 0)}`);
    console.log(`Passed:             ${results.reduce((sum, r) => sum + r.passed, 0)}`);
    console.log(`Failed:             ${results.reduce((sum, r) => sum + r.failed, 0)}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Print detailed failures
    const failures = results.filter(r => r.failed > 0);
    if (failures.length > 0) {
      console.log('❌ VALIDATION FAILURES:\n');
      failures.forEach(result => {
        console.log(`Tenant ${result.tenantShopId} (${result.shopName}):`);
        result.errors.forEach(err => {
          console.log(`  - ${err.table}: ${err.issue}`);
        });
        console.log('');
      });
      process.exit(1);
    }

    console.log('✅ All validations passed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await masterPool.end();
  }
}

async function validateTenant(
  masterPool: Pool,
  registry: any,
  tenantShopId: number
): Promise<ValidationResult> {
  console.log(`\n┌─────────────────────────────────────────────────────────┐`);
  console.log(`│ Validating Tenant ${tenantShopId}`.padEnd(59) + '│');
  console.log(`└─────────────────────────────────────────────────────────┘\n`);

  const result: ValidationResult = {
    tenantShopId,
    shopName: `Shop ${tenantShopId}`,
    totalChecks: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  // Get tenant connection
  const tenantConnection = await registry.getConnection(tenantShopId);
  if (!tenantConnection) {
    result.failed = 1;
    result.errors.push({ table: 'CONNECTION', issue: 'No connection found' });
    return result;
  }

  // Connect to tenant database
  const tenantPool = new Pool({ connectionString: tenantConnection.connectionString });

  try {
    // Test connection
    await tenantPool.query('SELECT 1');
    console.log('  ✅ Connection established');

    // Validate each table
    for (const tableName of TABLES_TO_VALIDATE) {
      result.totalChecks++;

      try {
        // Count rows in master DB
        const masterCount = await masterPool.query(
          `SELECT COUNT(*) as count FROM ${tableName} WHERE shop_id = $1`,
          [tenantShopId]
        );
        const masterRows = parseInt(masterCount.rows[0]?.count || '0');

        // Count rows in tenant DB
        const tenantCount = await tenantPool.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        const tenantRows = parseInt(tenantCount.rows[0]?.count || '0');

        if (masterRows === tenantRows) {
          console.log(`  ✅ ${tableName}: ${masterRows} rows (match)`);
          result.passed++;
        } else {
          console.log(`  ❌ ${tableName}: Master=${masterRows}, Tenant=${tenantRows} (MISMATCH)`);
          result.failed++;
          result.errors.push({
            table: tableName,
            issue: `Row count mismatch: master has ${masterRows}, tenant has ${tenantRows}`
          });
        }

      } catch (error) {
        console.log(`  ❌ ${tableName}: Validation failed`);
        result.failed++;
        result.errors.push({
          table: tableName,
          issue: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Additional integrity checks
    result.totalChecks++;
    try {
      // Check for orphaned records (repairs without customers)
      const orphanCheck = await tenantPool.query(
        `SELECT COUNT(*) as count FROM repairs r 
         LEFT JOIN customers c ON r.customer_id = c.id 
         WHERE c.id IS NULL`
      );
      const orphans = parseInt(orphanCheck.rows[0]?.count || '0');

      if (orphans === 0) {
        console.log(`  ✅ Referential integrity: No orphaned repairs`);
        result.passed++;
      } else {
        console.log(`  ⚠️  Referential integrity: ${orphans} orphaned repairs`);
        result.failed++;
        result.errors.push({
          table: 'repairs',
          issue: `Found ${orphans} repairs without matching customers`
        });
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log(`  ⏭️  Referential integrity: Skipped (table not found)`);
    }

    if (result.failed === 0) {
      console.log(`\n✅ Tenant ${tenantShopId} validation passed\n`);
    } else {
      console.log(`\n⚠️  Tenant ${tenantShopId} validation failed: ${result.failed} checks\n`);
    }

  } finally {
    await tenantPool.end();
  }

  return result;
}

// Run validation
validateAllTenants().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
