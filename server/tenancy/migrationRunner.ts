import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import fs from 'fs/promises';
import path from 'path';

// =============================================================================
// TENANT MIGRATION RUNNER - Automated schema setup and updates
// =============================================================================
// Handles applying tenant database schemas to new and existing tenant databases
// Manages schema version tracking and migration history
// Integrates with Drizzle migration system for tenant schemas
// =============================================================================

interface MigrationInfo {
  version: number;
  name: string;
  appliedAt: Date;
  checksum: string;
}

interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  skippedMigrations: string[];
  error?: string;
  totalTime?: number;
}

interface TenantMigrationConfig {
  tenantMigrationsPath: string; // Path to tenant-specific migration files
  masterMigrationsPath: string; // Path to master database migration files
  timeoutMs: number; // Migration timeout in milliseconds
  createVersionTable: boolean; // Whether to create migration tracking table
}

export class TenantMigrationRunner {
  private config: TenantMigrationConfig;

  constructor(config: Partial<TenantMigrationConfig> = {}) {
    this.config = {
      tenantMigrationsPath: config.tenantMigrationsPath || './migrations/tenant',
      masterMigrationsPath: config.masterMigrationsPath || './migrations/master',
      timeoutMs: config.timeoutMs || 300000, // 5 minutes default
      createVersionTable: config.createVersionTable ?? true,
    };
  }

  /**
   * Applies all pending tenant migrations to a specific tenant database
   */
  async runTenantMigrations(connectionString: string, shopId?: number): Promise<MigrationResult> {
    const startTime = Date.now();
    let client: Client | null = null;

    try {
      console.log(`🔄 Running tenant migrations${shopId ? ` for shop ${shopId}` : ''}...`);

      client = new Client({ connectionString });
      await client.connect();

      // Set migration timeout
      await client.query(`SET statement_timeout = '${this.config.timeoutMs}ms'`);

      // Create migration tracking table if needed
      if (this.config.createVersionTable) {
        await this.createMigrationTrackingTable(client);
      }

      // Get current migration state
      const appliedMigrations = await this.getAppliedMigrations(client);
      const availableMigrations = await this.getAvailableTenantMigrations();

      // Determine which migrations need to be applied
      const pendingMigrations = availableMigrations.filter(
        migration => !appliedMigrations.some(applied => applied.name === migration.name)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending tenant migrations');
        return {
          success: true,
          appliedMigrations: [],
          skippedMigrations: availableMigrations.map(m => m.name),
          totalTime: Date.now() - startTime
        };
      }

      console.log(`📦 Applying ${pendingMigrations.length} tenant migrations...`);

      // Apply migrations in transaction
      await client.query('BEGIN');

      const appliedMigrationNames: string[] = [];

      try {
        for (const migration of pendingMigrations) {
          console.log(`⚡ Applying migration: ${migration.name}`);
          
          await this.applyMigration(client, migration);
          await this.recordMigration(client, migration);
          
          appliedMigrationNames.push(migration.name);
          console.log(`✅ Applied migration: ${migration.name}`);
        }

        await client.query('COMMIT');
        console.log(`🎉 Successfully applied ${appliedMigrationNames.length} tenant migrations`);

        return {
          success: true,
          appliedMigrations: appliedMigrationNames,
          skippedMigrations: [],
          totalTime: Date.now() - startTime
        };

      } catch (migrationError) {
        await client.query('ROLLBACK');
        throw migrationError;
      }

    } catch (error) {
      console.error('❌ Tenant migration failed:', error);
      return {
        success: false,
        appliedMigrations: [],
        skippedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime: Date.now() - startTime
      };

    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Applies master database migrations
   */
  async runMasterMigrations(connectionString: string): Promise<MigrationResult> {
    const startTime = Date.now();
    let client: Client | null = null;

    try {
      console.log('🔄 Running master database migrations...');

      client = new Client({ connectionString });
      await client.connect();

      const db = drizzle(client);

      // Use Drizzle's built-in migration system for master database
      await migrate(db, { migrationsFolder: this.config.masterMigrationsPath });

      console.log('✅ Master migrations completed');

      return {
        success: true,
        appliedMigrations: ['master-migrations'], // Drizzle handles the details
        skippedMigrations: [],
        totalTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Master migration failed:', error);
      return {
        success: false,
        appliedMigrations: [],
        skippedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime: Date.now() - startTime
      };

    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Applies tenant schema to a new database (initial setup)
   */
  async setupNewTenantDatabase(connectionString: string, shopId: number): Promise<MigrationResult> {
    console.log(`🏗️  Setting up new tenant database for shop ${shopId}...`);

    try {
      // First, apply the base tenant schema using Drizzle if available
      const drizzleResult = await this.applyDrizzleTenantSchema(connectionString);
      if (!drizzleResult.success) {
        console.log('📦 Drizzle tenant schema not available, using custom migrations...');
      }

      // Apply any additional tenant-specific migrations
      const migrationResult = await this.runTenantMigrations(connectionString, shopId);

      console.log(`✅ Tenant database setup completed for shop ${shopId}`);
      return migrationResult;

    } catch (error) {
      console.error(`❌ Failed to setup tenant database for shop ${shopId}:`, error);
      return {
        success: false,
        appliedMigrations: [],
        skippedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Applies tenant schema using Drizzle's built-in migration system
   */
  private async applyDrizzleTenantSchema(connectionString: string): Promise<MigrationResult> {
    let client: Client | null = null;

    try {
      client = new Client({ connectionString });
      await client.connect();

      const db = drizzle(client);

      // Check if tenant migrations folder exists
      try {
        await fs.access(this.config.tenantMigrationsPath);
        await migrate(db, { migrationsFolder: this.config.tenantMigrationsPath });
        
        return {
          success: true,
          appliedMigrations: ['drizzle-tenant-schema'],
          skippedMigrations: []
        };
      } catch (error) {
        // Migrations folder doesn't exist or migration failed
        return {
          success: false,
          appliedMigrations: [],
          skippedMigrations: [],
          error: 'Drizzle tenant migrations not available'
        };
      }

    } catch (error) {
      return {
        success: false,
        appliedMigrations: [],
        skippedMigrations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Creates the migration tracking table
   */
  private async createMigrationTrackingTable(client: Client): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _tenant_migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        execution_time_ms INTEGER
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_migrations_name 
      ON _tenant_migrations (name)
    `);
  }

  /**
   * Gets list of applied migrations from the database
   */
  private async getAppliedMigrations(client: Client): Promise<MigrationInfo[]> {
    try {
      const result = await client.query(`
        SELECT version, name, applied_at, checksum 
        FROM _tenant_migrations 
        ORDER BY version ASC
      `);

      return result.rows.map(row => ({
        version: row.version,
        name: row.name,
        appliedAt: row.applied_at,
        checksum: row.checksum
      }));

    } catch (error) {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Gets list of available tenant migration files
   */
  private async getAvailableTenantMigrations(): Promise<Array<{ name: string; path: string; sql: string; checksum: string }>> {
    try {
      const files = await fs.readdir(this.config.tenantMigrationsPath);
      const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

      const migrations = [];

      for (const file of sqlFiles) {
        const filePath = path.join(this.config.tenantMigrationsPath, file);
        const sql = await fs.readFile(filePath, 'utf-8');
        const checksum = this.calculateChecksum(sql);

        migrations.push({
          name: file.replace('.sql', ''),
          path: filePath,
          sql,
          checksum
        });
      }

      return migrations;

    } catch (error) {
      console.log('No tenant migration files found or directory does not exist');
      return [];
    }
  }

  /**
   * Applies a single migration to the database
   */
  private async applyMigration(client: Client, migration: { sql: string; name: string }): Promise<void> {
    const startTime = Date.now();
    
    try {
      await client.query(migration.sql);
      const executionTime = Date.now() - startTime;
      console.log(`⚡ Migration ${migration.name} executed in ${executionTime}ms`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migration.name}:`, error);
      throw error;
    }
  }

  /**
   * Records a migration as applied in the tracking table
   */
  private async recordMigration(client: Client, migration: { name: string; checksum: string }): Promise<void> {
    const version = this.extractVersionFromName(migration.name);

    await client.query(`
      INSERT INTO _tenant_migrations (version, name, checksum, applied_at)
      VALUES ($1, $2, $3, NOW())
    `, [version, migration.name, migration.checksum]);
  }

  /**
   * Extracts version number from migration file name
   */
  private extractVersionFromName(name: string): number {
    const match = name.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Calculates checksum for migration content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Validates migration integrity by checking checksums
   */
  async validateMigrationIntegrity(connectionString: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    let client: Client | null = null;
    const issues: string[] = [];

    try {
      client = new Client({ connectionString });
      await client.connect();

      const appliedMigrations = await this.getAppliedMigrations(client);
      const availableMigrations = await this.getAvailableTenantMigrations();

      // Check for applied migrations that no longer exist
      for (const applied of appliedMigrations) {
        const available = availableMigrations.find(m => m.name === applied.name);
        if (!available) {
          issues.push(`Applied migration '${applied.name}' no longer exists in migration files`);
        } else if (available.checksum !== applied.checksum) {
          issues.push(`Migration '${applied.name}' has been modified (checksum mismatch)`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Failed to validate migrations: ${error}`);
      return { valid: false, issues };

    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Gets migration status for a tenant database
   */
  async getMigrationStatus(connectionString: string): Promise<{
    applied: MigrationInfo[];
    pending: string[];
    total: number;
    lastMigration?: MigrationInfo;
  }> {
    let client: Client | null = null;

    try {
      client = new Client({ connectionString });
      await client.connect();

      const appliedMigrations = await this.getAppliedMigrations(client);
      const availableMigrations = await this.getAvailableTenantMigrations();

      const pendingMigrations = availableMigrations
        .filter(migration => !appliedMigrations.some(applied => applied.name === migration.name))
        .map(m => m.name);

      const lastMigration = appliedMigrations.length > 0 
        ? appliedMigrations[appliedMigrations.length - 1]
        : undefined;

      return {
        applied: appliedMigrations,
        pending: pendingMigrations,
        total: availableMigrations.length,
        lastMigration
      };

    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        applied: [],
        pending: [],
        total: 0
      };

    } finally {
      if (client) {
        await client.end();
      }
    }
  }
}

/**
 * Factory function to create migration runner with default configuration
 */
export function createMigrationRunner(config?: Partial<TenantMigrationConfig>): TenantMigrationRunner {
  return new TenantMigrationRunner(config);
}

/**
 * Utility function to create initial tenant migration files
 */
export async function generateTenantMigrationTemplate(migrationName: string, migrationPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const fileName = `${timestamp}_${migrationName}.sql`;
  const filePath = path.join(migrationPath, fileName);

  const template = `-- Tenant Migration: ${migrationName}
-- Created at: ${new Date().toISOString()}
-- 
-- This migration will be applied to all tenant databases
-- Use this template to add tenant-specific schema changes

-- Example: Create a new table
-- CREATE TABLE example_table (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- Example: Add column to existing table
-- ALTER TABLE existing_table ADD COLUMN new_column VARCHAR(100);

-- Example: Create index
-- CREATE INDEX idx_example_name ON example_table (name);

-- WARNING: This migration will be applied to ALL tenant databases
-- Test thoroughly before deployment
`;

  await fs.mkdir(migrationPath, { recursive: true });
  await fs.writeFile(filePath, template, 'utf-8');

  console.log(`📝 Created tenant migration template: ${filePath}`);
  return filePath;
}