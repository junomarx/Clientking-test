/**
 * TENANT PROVISIONING SCRIPT
 * 
 * Creates dedicated databases for all shops in the master database.
 * This script requires PostgreSQL superuser access and must run in
 * a dedicated admin container with ADMIN_MODE=true.
 * 
 * Usage:
 *   docker-compose --profile manual run --rm tenant-provisioner
 * 
 * Environment Variables Required:
 *   - ADMIN_DATABASE_URL: PostgreSQL superuser connection string
 *   - DATABASE_URL: Master database connection string
 *   - TENANT_ENCRYPTION_KEY: 32-byte hex key for encrypting tenant credentials
 *   - ADMIN_MODE: Must be 'true'
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { createTenantProvisioningService } from '../server/tenancy/tenantProvisioning';
import { createConnectionRegistry } from '../server/tenancy/connectionRegistry';

interface ProvisioningStats {
  totalShops: number;
  provisioned: number;
  failed: number;
  skipped: number;
  errors: Array<{ shopId: number; error: string }>;
}

async function provisionAllTenants(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏗️  TENANT DATABASE PROVISIONING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Validate environment
  if (process.env.ADMIN_MODE !== 'true') {
    console.error('❌ ADMIN_MODE must be set to "true"');
    console.error('This script requires PostgreSQL superuser access.');
    process.exit(1);
  }

  if (!process.env.ADMIN_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error('❌ ADMIN_DATABASE_URL or DATABASE_URL environment variable required');
    process.exit(1);
  }

  if (!process.env.TENANT_ENCRYPTION_KEY) {
    console.error('❌ TENANT_ENCRYPTION_KEY environment variable required');
    console.error('Generate with: openssl rand -hex 32');
    process.exit(1);
  }

  // Connect to master database
  const masterPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  const db = drizzle(masterPool, { schema });

  let provisioningService;
  let connectionRegistry;

  try {
    // Initialize services
    provisioningService = createTenantProvisioningService();
    connectionRegistry = createConnectionRegistry();

    console.log('✅ Connected to master database');
    console.log('✅ Provisioning service initialized\n');

    // Get all shops from master database
    const shops = await db.select().from(schema.shops);
    
    if (shops.length === 0) {
      console.log('⚠️  No shops found in master database');
      console.log('Run data-importer first to populate shops');
      process.exit(0);
    }

    console.log(`📊 Found ${shops.length} shops to provision\n`);

    // Track provisioning statistics
    const stats: ProvisioningStats = {
      totalShops: shops.length,
      provisioned: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Provision each shop
    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      console.log(`[${i + 1}/${shops.length}] Processing shop ${shop.id}: ${shop.name}`);

      try {
        // Check if already provisioned
        const existingConnection = await connectionRegistry.getConnection(shop.id);
        if (existingConnection) {
          console.log(`  ⏭️  Already provisioned, skipping`);
          stats.skipped++;
          continue;
        }

        // Provision tenant database
        const result = await provisioningService.provisionTenant(shop.id, shop.name);

        if (result.success && result.credentials) {
          // Store encrypted credentials in master DB
          await connectionRegistry.registerConnection(shop.id, {
            databaseName: result.credentials.databaseName,
            username: result.credentials.username,
            password: result.credentials.password,
            host: result.credentials.host,
            port: result.credentials.port
          });

          console.log(`  ✅ Database: ${result.credentials.databaseName}`);
          console.log(`  ✅ User: ${result.credentials.username}`);
          console.log(`  ✅ Credentials stored in master DB`);
          stats.provisioned++;
        } else {
          console.error(`  ❌ Provisioning failed: ${result.error}`);
          stats.failed++;
          stats.errors.push({
            shopId: shop.id,
            error: result.error || 'Unknown error'
          });
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error: ${errorMsg}`);
        stats.failed++;
        stats.errors.push({
          shopId: shop.id,
          error: errorMsg
        });
      }

      console.log('');
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PROVISIONING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total shops:     ${stats.totalShops}`);
    console.log(`Provisioned:     ${stats.provisioned}`);
    console.log(`Skipped:         ${stats.skipped}`);
    console.log(`Failed:          ${stats.failed}`);
    console.log('═══════════════════════════════════════════════════════════');

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`  Shop ${err.shopId}: ${err.error}`);
      });
      process.exit(1);
    }

    if (stats.provisioned === 0 && stats.skipped === stats.totalShops) {
      console.log('\n✅ All shops already provisioned');
    } else if (stats.provisioned > 0) {
      console.log(`\n✅ Successfully provisioned ${stats.provisioned} new tenant databases`);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error(error);
    process.exit(1);

  } finally {
    await masterPool.end();
  }
}

// Run provisioning
provisionAllTenants().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
