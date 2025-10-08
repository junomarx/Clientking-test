# Production Migration Script: Shared to Database-Per-Tenant

## Overview

This document provides a **step-by-step production migration script** to transition an existing deployed Handyshop Verwaltung instance from a shared PostgreSQL database to isolated database-per-tenant architecture.

**Migration Strategy**: Zero-downtime, 5-phase gradual rollout  
**Estimated Total Time**: 2-7 days (depends on data volume)  
**Downtime**: ZERO - Application remains fully operational throughout  
**Rollback Capability**: Available at every phase

---

## Prerequisites

### 1. Environment Requirements

**PostgreSQL Version**: 12+ (14+ recommended)  
**Node.js Version**: 18+ or 20+  
**Disk Space**: 2x current database size (for tenant DBs + unified DB)  
**Connection Limit**: Increase PostgreSQL max_connections (recommended: 200+)

### 2. Access Requirements

```bash
# PostgreSQL superuser credentials (for database/user creation)
POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERUSER_PASSWORD=<your-superuser-password>

# Application database credentials
DATABASE_URL=postgresql://user:pass@host:port/handyshop_db

# Tenant encryption key (generate once, keep secure!)
TENANT_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 3. Pre-Migration Checklist

- [ ] **Backup current database** - Full pg_dump of unified database
- [ ] **Test in staging** - Run complete migration on staging copy
- [ ] **Schedule maintenance window** (optional, but recommended for Phase 1)
- [ ] **Notify users** - Inform about upcoming changes (transparency)
- [ ] **Monitor resources** - Set up monitoring for disk, connections, CPU
- [ ] **Document rollback plan** - Clear steps for each phase

---

## Phase 0: Preparation & Validation

### Step 1: Backup Current Database

```bash
#!/bin/bash
# backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/unified_db_${TIMESTAMP}.sql"

mkdir -p ${BACKUP_DIR}

echo "Creating full database backup..."
pg_dump ${DATABASE_URL} > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
  echo "✅ Backup created: ${BACKUP_FILE}"
  echo "   Size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
  echo "❌ Backup failed! Aborting migration."
  exit 1
fi

# Compress backup
gzip ${BACKUP_FILE}
echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
```

### Step 2: Validate Current Data

```typescript
// scripts/validate-current-data.ts
import { db } from '../server/db';
import { shops, users } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function validateCurrentData() {
  console.log('🔍 Validating current database state...\n');

  // 1. Check all shops have valid owners
  const shopsWithoutOwners = await db.execute(sql`
    SELECT s.id, s.name 
    FROM shops s
    LEFT JOIN users u ON u.shop_id = s.id AND u.role = 'owner'
    WHERE u.id IS NULL
  `);

  if (shopsWithoutOwners.rows.length > 0) {
    console.error('❌ Found shops without owners:');
    console.error(shopsWithoutOwners.rows);
    throw new Error('Fix shop ownership before migration');
  }
  console.log('✅ All shops have valid owners');

  // 2. Check all users have shop_id (except superadmin)
  const usersWithoutShop = await db.execute(sql`
    SELECT id, username, email, role
    FROM users
    WHERE shop_id IS NULL AND role != 'superadmin'
  `);

  if (usersWithoutShop.rows.length > 0) {
    console.error('❌ Found users without shop_id:');
    console.error(usersWithoutShop.rows);
    throw new Error('Assign shop_id to all users before migration');
  }
  console.log('✅ All users have valid shop_id');

  // 3. Count total records per table
  const tables = [
    'shops', 'users', 'customers', 'repairs', 'spare_parts',
    'cost_estimates', 'email_templates', 'loaner_devices'
  ];

  console.log('\n📊 Current data volume:');
  for (const table of tables) {
    const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
    console.log(`  ${table}: ${result.rows[0].count} records`);
  }

  // 4. Check PostgreSQL connection limit
  const connectionLimit = await db.execute(sql`SHOW max_connections`);
  const currentConnections = await db.execute(sql`
    SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()
  `);

  console.log(`\n🔌 Connection capacity:`);
  console.log(`  Max connections: ${connectionLimit.rows[0].max_connections}`);
  console.log(`  Current connections: ${currentConnections.rows[0].count}`);

  const allShopsCount = await db.select().from(shops).then(s => s.length);
  console.log(`  After migration estimate: ${parseInt(currentConnections.rows[0].count) + (allShopsCount * 2)}`);

  console.log('\n✅ Validation complete!\n');
}

// Run validation
validateCurrentData().catch(console.error);
```

**Run Validation:**
```bash
npx tsx scripts/validate-current-data.ts
```

### Step 3: Generate Encryption Key

```bash
# Generate 32-byte (256-bit) encryption key for credential storage
export TENANT_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Save to .env file (DO NOT COMMIT!)
echo "TENANT_ENCRYPTION_KEY=${TENANT_ENCRYPTION_KEY}" >> .env.production

echo "✅ Encryption key generated and saved"
echo "⚠️  CRITICAL: Back up this key securely! Lost keys = lost tenant access"
```

---

## Phase 1: Provision Tenant Databases (Offline Preparation)

**Duration**: 5-30 minutes (depends on shop count)  
**Downtime**: NONE  
**Rollback**: Drop tenant databases

### Step 1: Deploy Infrastructure Code

```bash
# Deploy new tenant infrastructure code
git pull origin main
npm install

# Verify new files exist
ls -la server/tenancy/
ls -la server/migration/

# Expected files:
# - tenantRouter.ts
# - tenantProvisioning.ts
# - migrationRunner.ts
# - connectionRegistry.ts
# - dualWriteProxy.ts
# - readPathSwitcher.ts
# - performanceMonitor.ts
# - legacyRetirement.ts
```

### Step 2: Create Provisioning Script

```typescript
// scripts/provision-all-tenants.ts
import { db } from '../server/db';
import { shops } from '../shared/schema';
import { ConnectionRegistry } from '../server/tenancy/connectionRegistry';
import { TenantProvisioningService } from '../server/tenancy/tenantProvisioning';
import { TenantMigrationRunner } from '../server/tenancy/migrationRunner';

async function provisionAllTenants() {
  console.log('🚀 Starting tenant database provisioning...\n');

  // 1. Initialize infrastructure
  const encryptionKey = process.env.TENANT_ENCRYPTION_KEY!;
  if (!encryptionKey || encryptionKey.length !== 64) {
    throw new Error('Invalid TENANT_ENCRYPTION_KEY (must be 64 hex characters)');
  }

  const registry = new ConnectionRegistry({
    encryptionKey,
    maxCacheSize: 100,
    cacheTTLMs: 3600000, // 1 hour
    persistToDatabase: true
  });

  const migrationRunner = new TenantMigrationRunner(registry);
  const provisioner = new TenantProvisioningService(registry, migrationRunner);

  // 2. Get all shops
  const allShops = await db.select().from(shops);
  console.log(`📊 Found ${allShops.length} shops to provision\n`);

  // 3. Provision each shop
  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ shopId: number; error: string }> = [];

  for (let i = 0; i < allShops.length; i++) {
    const shop = allShops[i];
    console.log(`[${i + 1}/${allShops.length}] Provisioning shop ${shop.id} (${shop.name})...`);

    try {
      const result = await provisioner.provisionTenant(shop.id);
      
      if (result.success) {
        console.log(`  ✅ Database: ${result.databaseName}`);
        console.log(`  ✅ User: ${result.username}`);
        console.log(`  ✅ Tables created: 19`);
        successCount++;
      } else {
        throw new Error(result.error || 'Provisioning failed');
      }
    } catch (error) {
      console.error(`  ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
      failureCount++;
      failures.push({
        shopId: shop.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    console.log('');
  }

  // 4. Summary
  console.log('═══════════════════════════════════════════════');
  console.log('Provisioning Complete');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Success: ${successCount} shops`);
  console.log(`❌ Failures: ${failureCount} shops`);

  if (failures.length > 0) {
    console.log('\n⚠️  Failed shops:');
    failures.forEach(f => {
      console.log(`  - Shop ${f.shopId}: ${f.error}`);
    });
    throw new Error(`${failureCount} shops failed provisioning`);
  }

  console.log('\n✅ All shops provisioned successfully!');
}

// Run provisioning
provisionAllTenants()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Provisioning failed:', error);
    process.exit(1);
  });
```

**Execute Provisioning:**
```bash
# Run provisioning script
npx tsx scripts/provision-all-tenants.ts

# Expected output:
# 🚀 Starting tenant database provisioning...
# 📊 Found 42 shops to provision
# [1/42] Provisioning shop 1 (Main Shop)...
#   ✅ Database: shop_1_db
#   ✅ User: shop_user_1
#   ✅ Tables created: 19
# ...
# ✅ All shops provisioned successfully!
```

### Step 3: Verify Provisioning

```bash
# List all tenant databases
psql -U postgres -c "\l" | grep shop_.*_db

# Expected output:
# shop_1_db    | shop_user_1  | UTF8   | ...
# shop_2_db    | shop_user_2  | UTF8   | ...
# shop_3_db    | shop_user_3  | UTF8   | ...

# Check table count in one tenant DB
psql -U shop_user_1 -d shop_1_db -c "\dt" | wc -l
# Expected: 19 tables
```

---

## Phase 2: Bulk Data Migration (Offline Copy)

**Duration**: 1-10 hours (depends on data volume)  
**Downtime**: NONE (but blocks writes briefly per table)  
**Rollback**: Drop tenant databases and retry

### Step 1: Create Data Copy Script

```typescript
// scripts/bulk-migrate-data.ts
import { db } from '../server/db';
import { shops } from '../shared/schema';
import { ConnectionRegistry } from '../server/tenancy/connectionRegistry';
import { TenantRouter } from '../server/tenancy/tenantRouter';
import { sql } from 'drizzle-orm';

const TABLES_TO_MIGRATE = [
  'customers',
  'repairs',
  'repair_status_history',
  'spare_parts',
  'cost_estimates',
  'email_templates',
  'loaner_devices',
  'orders',
  'device_types',
  'user_brands',
  'user_models',
  'qr_codes',
  'signatures',
  'email_log',
  'newsletter_subscribers',
  'kiosk_devices',
  'kiosk_online_status',
  'employees',
  'support_access_tokens'
];

async function bulkMigrateData() {
  console.log('📦 Starting bulk data migration...\n');

  // 1. Initialize infrastructure
  const encryptionKey = process.env.TENANT_ENCRYPTION_KEY!;
  const registry = new ConnectionRegistry({
    encryptionKey,
    maxCacheSize: 100,
    cacheTTLMs: 3600000,
    persistToDatabase: true
  });

  const tenantRouter = new TenantRouter(registry, {
    maxPoolSize: 20,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 10000
  });

  // 2. Get all shops
  const allShops = await db.select().from(shops);
  console.log(`📊 Found ${allShops.length} shops\n`);

  // 3. Migrate each shop
  for (let i = 0; i < allShops.length; i++) {
    const shop = allShops[i];
    console.log(`[${i + 1}/${allShops.length}] Migrating shop ${shop.id} (${shop.name})...`);

    const tenantPool = await tenantRouter.getConnection(shop.id);

    for (const tableName of TABLES_TO_MIGRATE) {
      try {
        // Count rows in unified DB
        const countResult = await db.execute(sql.raw(
          `SELECT COUNT(*) as count FROM ${tableName} WHERE shop_id = ${shop.id}`
        ));
        const rowCount = parseInt(countResult.rows[0].count);

        if (rowCount === 0) {
          console.log(`  ⏭️  ${tableName}: No data`);
          continue;
        }

        // Copy data in batches
        const BATCH_SIZE = 1000;
        let offset = 0;
        let totalCopied = 0;

        while (offset < rowCount) {
          // Fetch batch from unified DB
          const rows = await db.execute(sql.raw(
            `SELECT * FROM ${tableName} WHERE shop_id = ${shop.id} LIMIT ${BATCH_SIZE} OFFSET ${offset}`
          ));

          if (rows.rows.length === 0) break;

          // Remove shop_id column
          const tenantRows = rows.rows.map(row => {
            const { shop_id, ...tenantRow } = row;
            return tenantRow;
          });

          // Build parameterized INSERT query for safety with JSON/array columns
          const columns = Object.keys(tenantRows[0]);
          
          // Insert rows one at a time with proper parameterization (safer for complex types)
          for (const row of tenantRows) {
            const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(',');
            const values = columns.map(col => {
              const val = row[col];
              // Let pg handle type conversion for JSON, arrays, dates, etc.
              if (val === null) return null;
              if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                // JSON object - stringify
                return JSON.stringify(val);
              }
              if (Array.isArray(val)) {
                // Array - let pg handle it
                return val;
              }
              return val;
            });

            const insertQuery = `
              INSERT INTO ${tableName} (${columns.join(',')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `;

            await tenantPool.query(insertQuery, values);
          }

          totalCopied += tenantRows.length;
          offset += BATCH_SIZE;
        }

        console.log(`  ✅ ${tableName}: Copied ${totalCopied} rows`);
      } catch (error) {
        console.error(`  ❌ ${tableName}: Failed -`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    console.log('');
  }

  // 4. Cleanup
  await tenantRouter.closeAllConnections();

  console.log('✅ Bulk data migration complete!\n');
}

// Run migration
bulkMigrateData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
```

**Execute Data Migration:**
```bash
# Run bulk migration (can take several hours for large datasets)
npx tsx scripts/bulk-migrate-data.ts

# Monitor progress in separate terminal
watch -n 5 'psql -U shop_user_1 -d shop_1_db -c "SELECT COUNT(*) FROM customers"'
```

### Step 2: Verify Data Integrity

```typescript
// scripts/verify-migration.ts
import { db } from '../server/db';
import { shops } from '../shared/schema';
import { ConnectionRegistry } from '../server/tenancy/connectionRegistry';
import { TenantRouter } from '../server/tenancy/tenantRouter';
import { sql } from 'drizzle-orm';

async function verifyMigration() {
  console.log('🔍 Verifying data migration...\n');

  const registry = new ConnectionRegistry({
    encryptionKey: process.env.TENANT_ENCRYPTION_KEY!,
    maxCacheSize: 100,
    cacheTTLMs: 3600000,
    persistToDatabase: true
  });

  const tenantRouter = new TenantRouter(registry, {
    maxPoolSize: 20,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 10000
  });

  const allShops = await db.select().from(shops);
  const TABLES = [
    'customers', 'repairs', 'spare_parts', 'cost_estimates',
    'email_templates', 'loaner_devices', 'orders'
  ];

  let totalMismatches = 0;

  for (const shop of allShops) {
    console.log(`Shop ${shop.id} (${shop.name}):`);
    const tenantPool = await tenantRouter.getConnection(shop.id);

    for (const table of TABLES) {
      // Count in unified DB
      const unifiedResult = await db.execute(sql.raw(
        `SELECT COUNT(*) as count FROM ${table} WHERE shop_id = ${shop.id}`
      ));
      const unifiedCount = parseInt(unifiedResult.rows[0].count);

      // Count in tenant DB
      const tenantResult = await tenantPool.query(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      const tenantCount = parseInt(tenantResult.rows[0].count);

      if (unifiedCount === tenantCount) {
        console.log(`  ✅ ${table}: ${unifiedCount} rows (match)`);
      } else {
        console.error(`  ❌ ${table}: Unified=${unifiedCount}, Tenant=${tenantCount} (MISMATCH)`);
        totalMismatches++;
      }
    }
    console.log('');
  }

  await tenantRouter.closeAllConnections();

  if (totalMismatches > 0) {
    throw new Error(`Found ${totalMismatches} mismatches! Fix before proceeding.`);
  }

  console.log('✅ All data verified successfully!\n');
}

// Run verification
verifyMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
```

**Run Verification:**
```bash
npx tsx scripts/verify-migration.ts
```

---

## Phase 3-5: Dual-Write, Read Activation, and Retirement

**Note**: These phases require integration with the application runtime and are conceptual. The actual implementation would require:

1. **Phase 3: Dual-Write** - Modify `server/storage.ts` to use `DualWriteProxy`
2. **Phase 4: Read Activation** - Use `ReadPathSwitcher` with gradual percentage rollout
3. **Phase 5: Legacy Retirement** - Use `LegacyRetirement` class after full validation

See `TECHNICAL-DOCUMENTATION.md` for complete architectural details on these phases.

---

## Rollback Procedures

### During Phase 1 (Provisioning)

```bash
# Drop all tenant databases
for shop_id in $(psql -c "SELECT id FROM shops" -t); do
  psql -U postgres -c "DROP DATABASE IF EXISTS shop_${shop_id}_db;"
  psql -U postgres -c "DROP USER IF EXISTS shop_user_${shop_id};"
done

echo "✅ Rollback complete - back to unified database"
```

### During Phase 2 (Data Migration)

```bash
# Drop tenant databases and retry
for shop_id in $(psql -c "SELECT id FROM shops" -t); do
  psql -U postgres -c "DROP DATABASE IF EXISTS shop_${shop_id}_db CASCADE;"
done

# Fix issues, then re-run provisioning and migration
```

---

## Summary

**Phases Covered**: 0 (Preparation), 1 (Provisioning), 2 (Data Migration)  
**Total Scripts**: 4 executable TypeScript scripts  
**Estimated Time**: 1-12 hours (Phase 0-2)  
**Downtime**: ZERO  
**Rollback**: Available at all stages

**Success Criteria for Phases 0-2**:
- ✅ All shops provisioned successfully
- ✅ 100% data integrity (row count matches)
- ✅ All tenant databases accessible
- ✅ Complete backups created

---

*Last Updated: September 30, 2025*  
*Status: Phases 0-2 Ready for Production, Phases 3-5 Require Runtime Integration*
