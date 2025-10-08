/**
 * TENANT DATA MIGRATION SCRIPT
 * 
 * Migrates operational data from master database to tenant databases.
 * Uses checkpoint-based resumable migration for container safety.
 * 
 * Flow:
 *   1. Read shops from master DB
 *   2. For each shop, copy customers/repairs/etc from master → tenant DB
 *   3. Track progress in migration_state table (checkpoints)
 *   4. Resume from last checkpoint if container restarts
 * 
 * Usage:
 *   docker-compose --profile manual run --rm tenant-migrator
 * 
 * Environment Variables:
 *   - DATABASE_URL: Master database connection string
 *   - TENANT_ENCRYPTION_KEY: Key for accessing tenant credentials
 *   - BATCH_SIZE: Records per batch (default: 1000)
 */

import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../shared/schema';
import { createConnectionRegistry } from '../server/tenancy/connectionRegistry';
import { db, getMasterDb } from '../server/db';
import 'dotenv/config';

process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException');
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
process.on('unhandledRejection', (reason: any) => {
  console.error('💥 unhandledRejection');
  console.error(reason && reason.stack ? reason.stack : reason);
  process.exitCode = 1;
});

// Optional: show resolved DB names (no secrets)

async function printDbId() {
  try {
    const app = await db.execute(sql`select current_database() as db`);
    const appDb = Array.isArray(app) ? app[0]?.db : app.rows?.[0]?.db;
    const master = getMasterDb();
    const m = await master.execute(sql`select current_database() as db`);
    const masterDb = Array.isArray(m) ? m[0]?.db : m.rows?.[0]?.db;
    console.log(`🧭 APP DB=${appDb} | MASTER DB=${masterDb} | REGISTRY_DB_SOURCE=${process.env.REGISTRY_DB_SOURCE}`);
  } catch (e) {
    console.log('🧭 DB probe failed:', e);
  }
}


// Tables to migrate (tenant-specific data)
const TABLES_TO_MIGRATE = [
  'customers',
  'repairs',
  'spare_parts',
  'loaner_devices',
  'cost_estimates',
  'email_log',
  'orders',
  'qr_codes',
  'signatures',
  'kiosk_devices',
  'repair_status_history',
  'error_catalog_entries', // Shop-specific error catalogs
] as const;

interface MigrationProgress {
  tenantShopId: number;
  shopName: string;
  tablesCompleted: number;
  totalTables: number;
  rowsMigrated: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000');

function asRows<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.rows)) return res.rows as T[];
  return [];
}

async function logDbInventory(label: string, client: any) {
  try {
    // DB + search_path + user
    const dbRes   = asRows(await client.execute(sql`select current_database() as db`));
    const spRes   = asRows(await client.execute(sql`show search_path`));
    const userRes = asRows(await client.execute(sql`select current_user as usr`));

    const currentDb   = dbRes[0]?.db ?? '(unknown)';
    const searchPath  = spRes[0]?.search_path ?? '(unknown)';
    const currentUser = userRes[0]?.usr ?? '(unknown)';

    console.log(`\n🔎 ${label}: db=${currentDb} user=${currentUser} search_path=${searchPath}`);

    // Schemas
    const schemas = asRows(await client.execute(sql`
      select schema_name
      from information_schema.schemata
      where schema_name not like 'pg_%'
        and schema_name <> 'information_schema'
      order by 1
    `));
    console.log(`📂 ${label}: schemas = ${schemas.map(r => r.schema_name).join(', ') || '(none)'}`);

    // Tables (sample)
    const tables = asRows(await client.execute(sql`
      select table_schema, table_name
      from information_schema.tables
      where table_type = 'BASE TABLE'
      order by 1,2
    `));
    console.log(`📋 ${label}: tables (${tables.length}) — sample: ${
      tables.slice(0, 30).map(r => `${r.table_schema}.${r.table_name}`).join(', ') || '(none)'
    }`);

    // Views (sample)
    const views = asRows(await client.execute(sql`
      select table_schema, table_name
      from information_schema.views
      order by 1,2
    `));
    console.log(`🪟 ${label}: views (${views.length}) — sample: ${
      views.slice(0, 20).map(r => `${r.table_schema}.${r.table_name}`).join(', ') || '(none)'
    }`);

    // Where is tenant_connections?
    const tc = asRows(await client.execute(sql`
      select table_schema, table_name
      from information_schema.tables
      where table_name = 'tenant_connections'
      order by 1,2
    `));
    console.log(`🔐 ${label}: tenant_connections located at: ${
      tc.length ? tc.map(r => `${r.table_schema}.${r.table_name}`).join(', ') : '(not found)'
    }`);

    // Counts (qualified vs search_path)
    try {
      const publicCnt = asRows(await client.execute(sql`select count(*)::int as cnt from public.tenant_connections`))[0]?.cnt;
      console.log(`📊 ${label}: public.tenant_connections count = ${publicCnt}`);
    } catch {
      console.log(`📊 ${label}: public.tenant_connections not accessible`);
    }
    try {
      const spCnt = asRows(await client.execute(sql`select count(*)::int as cnt from tenant_connections`))[0]?.cnt;
      console.log(`📊 ${label}: tenant_connections (unqualified) count = ${spCnt}`);
    } catch {
      console.log(`📊 ${label}: tenant_connections (unqualified) not accessible via current search_path`);
    }
  } catch (e) {
    console.error(`⚠️ Failed to inventory ${label}:`, e);
  }
}



async function migrateAllTenants(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚚 TENANT DATA MIGRATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Connect to master database
  const masterPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(masterPool, { schema });

  try {
    // Initialize connection registry
    const registry = createConnectionRegistry();
    console.log('✅ Connected to master database');
    console.log(`📦 Batch size: ${BATCH_SIZE} records\n`);

    // Create migration run record
    const [migrationRun] = await db.insert(schema.migrationRuns).values({
      runType: 'migrate',
      status: 'running',
      metadata: { batchSize: BATCH_SIZE, tables: TABLES_TO_MIGRATE }
    }).returning();

    console.log(`🔄 Migration run ID: ${migrationRun.id}\n`);

    // Get all tenant shop IDs from registry
    const tenantShopIds = await registry.getAllShopIds();

    if (tenantShopIds.length === 0) {
      console.log('⚠️  No tenant databases found');
      console.log('Run tenant-provisioner first');
      process.exit(0);
    }

    console.log(`📊 Found ${tenantShopIds.length} tenant databases\n`);

    const progress: MigrationProgress[] = [];

    // Migrate each tenant
    for (const tenantShopId of tenantShopIds) {
      try {
        const tenantProgress = await migrateTenant(
          db,
          masterPool,
          registry,
          tenantShopId
        );
        progress.push(tenantProgress);

      } catch (error) {
        console.error(`❌ Failed to migrate tenant ${tenantShopId}:`, error);
        progress.push({
          tenantShopId,
          shopName: `Shop ${tenantShopId}`,
          tablesCompleted: 0,
          totalTables: TABLES_TO_MIGRATE.length,
          rowsMigrated: 0,
          status: 'failed'
        });
      }
    }

    // Update migration run
    await db.update(schema.migrationRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          batchSize: BATCH_SIZE,
          tables: TABLES_TO_MIGRATE,
          tenantsProcessed: tenantShopIds.length,
          totalRowsMigrated: progress.reduce((sum, p) => sum + p.rowsMigrated, 0)
        }
      })
      .where(eq(schema.migrationRuns.id, migrationRun.id));

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Tenants processed: ${tenantShopIds.length}`);
    console.log(`Total rows:        ${progress.reduce((sum, p) => sum + p.rowsMigrated, 0)}`);
    console.log(`Success:           ${progress.filter(p => p.status === 'completed').length}`);
    console.log(`Failed:            ${progress.filter(p => p.status === 'failed').length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const failed = progress.filter(p => p.status === 'failed');
    if (failed.length > 0) {
      console.log('❌ Failed tenants:');
      failed.forEach(p => console.log(`  - Tenant ${p.tenantShopId}: ${p.shopName}`));
      process.exit(1);
    }

    console.log('✅ All tenants migrated successfully');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await masterPool.end();
  }
}

async function migrateTenant(
  db: any,
  masterPool: Pool,
  registry: any,
  tenantShopId: number
): Promise<MigrationProgress> {
  console.log(`\n┌─────────────────────────────────────────────────────────┐`);
  console.log(`│ Migrating Tenant ${tenantShopId}`.padEnd(59) + '│');
  console.log(`└─────────────────────────────────────────────────────────┘\n`);

  const progress: MigrationProgress = {
    tenantShopId,
    shopName: `Shop ${tenantShopId}`,
    tablesCompleted: 0,
    totalTables: TABLES_TO_MIGRATE.length,
    rowsMigrated: 0,
    status: 'in_progress'
  };

  try {
    // Get tenant connection
    const tenantConnection = await registry.getConnection(tenantShopId);
    if (!tenantConnection) {
      throw new Error(`No connection found for tenant ${tenantShopId}`);
    }

    // Connect to tenant database
    const tenantPool = new Pool({ connectionString: tenantConnection.connectionString });

    try {
      // Migrate each table
      for (const tableName of TABLES_TO_MIGRATE) {
        const tableProgress = await migrateTable(
          db,
          masterPool,
          tenantPool,
          tenantShopId,
          tableName
        );

        progress.rowsMigrated += tableProgress.rowsMigrated;
        progress.tablesCompleted++;

        console.log(`  [${progress.tablesCompleted}/${progress.totalTables}] ${tableName}: ${tableProgress.rowsMigrated} rows`);
      }

      progress.status = 'completed';
      console.log(`\n✅ Tenant ${tenantShopId} completed: ${progress.rowsMigrated} total rows\n`);

    } finally {
      await tenantPool.end();
    }

  } catch (error) {
    progress.status = 'failed';
    throw error;
  }

  return progress;
}

async function migrateTable(
  db: any,
  masterPool: Pool,
  tenantPool: Pool,
  tenantShopId: number,
  tableName: string
): Promise<{ rowsMigrated: number }> {
  // Check for existing checkpoint
  const [checkpoint] = await db.select()
    .from(schema.migrationState)
    .where(and(
      eq(schema.migrationState.tenantShopId, tenantShopId),
      eq(schema.migrationState.tableName, tableName)
    ));

  if (checkpoint?.status === 'completed') {
    return { rowsMigrated: checkpoint.rowsProcessed };
  }

  // Count total rows in master DB for this shop
  const countResult = await masterPool.query(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE shop_id = $1`,
    [tenantShopId]
  );
  const totalRows = parseInt(countResult.rows[0]?.count || '0');

  if (totalRows === 0) {
    // Mark as completed with 0 rows
    await db.insert(schema.migrationState)
      .values({
        tenantShopId,
        tableName,
        status: 'completed',
        rowsProcessed: 0
      })
      .onConflictDoUpdate({
        target: [schema.migrationState.tenantShopId, schema.migrationState.tableName],
        set: {
          status: 'completed',
          rowsProcessed: 0,
          updatedAt: new Date()
        }
      });
    return { rowsMigrated: 0 };
  }

  // Resume from checkpoint or start fresh
  let lastPk = checkpoint?.lastSyncedPk || 0;
  let rowsProcessed = checkpoint?.rowsProcessed || 0;

  // Update status to in_progress
  await db.insert(schema.migrationState)
    .values({
      tenantShopId,
      tableName,
      status: 'in_progress',
      lastSyncedPk: lastPk,
      rowsProcessed
    })
    .onConflictDoUpdate({
      target: [schema.migrationState.tenantShopId, schema.migrationState.tableName],
      set: {
        status: 'in_progress',
        updatedAt: new Date()
      }
    });

  // Migrate in batches
  while (true) {
    // Fetch batch from master DB
    const batchResult = await masterPool.query(
      `SELECT * FROM ${tableName} 
       WHERE shop_id = $1 AND id > $2 
       ORDER BY id 
       LIMIT $3`,
      [tenantShopId, lastPk, BATCH_SIZE]
    );

    if (batchResult.rows.length === 0) {
      break; // No more rows
    }

    // Remove shop_id column (not needed in tenant DB)
    const tenantRows = batchResult.rows.map(row => {
      const { shop_id, ...tenantRow } = row;
      return tenantRow;
    });

    // Insert into tenant DB (upsert to handle re-runs)
    for (const row of tenantRows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(',');

      await tenantPool.query(
        `INSERT INTO ${tableName} (${columns.join(',')})
         VALUES (${placeholders})
         ON CONFLICT (id) DO NOTHING`,
        values
      );
    }

    // Update checkpoint
    lastPk = batchResult.rows[batchResult.rows.length - 1].id;
    rowsProcessed += batchResult.rows.length;

    await db.update(schema.migrationState)
      .set({
        lastSyncedPk: lastPk,
        rowsProcessed,
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(schema.migrationState.tenantShopId, tenantShopId),
        eq(schema.migrationState.tableName, tableName)
      ));
  }

  // Mark as completed
  await db.update(schema.migrationState)
    .set({
      status: 'completed',
      updatedAt: new Date()
    })
    .where(and(
      eq(schema.migrationState.tenantShopId, tenantShopId),
      eq(schema.migrationState.tableName, tableName)
    ));

  return { rowsMigrated: rowsProcessed };
}

(async () => {
})().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

(async () => {
  const master = getMasterDb();

  await printDbId();
  await migrateAllTenants();
  await logDbInventory('MASTER', master);
  await logDbInventory('APP', db);
  await migrateAllTenants();

})().catch((e) => {
  console.error('🚨 top-level catch:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
