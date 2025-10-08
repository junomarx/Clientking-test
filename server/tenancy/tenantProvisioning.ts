import { Client } from 'pg';
import crypto from 'crypto';
import { execSync } from 'child_process';

// =============================================================================
// TENANT PROVISIONING SERVICE
// =============================================================================
// Handles automated database and user creation for new tenants in containerized 
// environment with full PostgreSQL administrative privileges
// =============================================================================

interface TenantProvisioningConfig {
  adminConnectionString: string; // Full admin access to PostgreSQL instance
  masterConnectionString: string; // Master database connection
  tenantDatabasePrefix: string; // Prefix for tenant database names (e.g., 'shop_')
  tenantUserPrefix: string; // Prefix for tenant users (e.g., 'shop_user_')
}

interface TenantCredentials {
  databaseName: string;
  username: string;
  password: string;
  connectionString: string;
  host: string;
  port: number;
}

interface TenantProvisioningResult {
  success: boolean;
  tenantId: string;
  credentials?: TenantCredentials;
  error?: string;
}

export class TenantProvisioningService {
  private config: TenantProvisioningConfig;
  
  constructor(config: TenantProvisioningConfig) {
    // CRITICAL: This service requires PostgreSQL superuser access
    // Only run in dedicated admin containers with ADMIN_MODE=true
    if (process.env.ADMIN_MODE !== 'true') {
      throw new Error(
        'TenantProvisioningService requires ADMIN_MODE=true. ' +
        'This service must only run in dedicated admin containers with PostgreSQL superuser access. ' +
        'DO NOT run this in the application container.'
      );
    }
    
    this.config = config;
    console.log('🔐 TenantProvisioningService initialized in ADMIN_MODE');
  }

  /**
   * Creates a new tenant database with dedicated user and full schema setup
   */
  async provisionTenant(shopId: number, shopName: string): Promise<TenantProvisioningResult> {
    const tenantId = `${this.config.tenantDatabasePrefix}${shopId}_db`;
    const username = `${this.config.tenantUserPrefix}${shopId}`;
    const password = this.generateSecurePassword();

    let adminClient: Client | null = null;

    try {
      // Connect with admin privileges
      adminClient = new Client({ connectionString: this.config.adminConnectionString });
      await adminClient.connect();

      console.log(`🏗️  Provisioning tenant database for shop ${shopId}: ${shopName}`);

      // 1. Create dedicated database
      await this.createTenantDatabase(adminClient, tenantId);
      console.log(`✅ Created database: ${tenantId}`);

      // 2. Create dedicated user with restricted privileges
      await this.createTenantUser(adminClient, username, password, tenantId);
      console.log(`✅ Created user: ${username}`);

      // 3. Build tenant connection string
      const credentials = this.buildTenantCredentials(tenantId, username, password);
      console.log(`✅ Generated credentials for tenant ${shopId}`);

      // 4. Run tenant schema migrations
      await this.runTenantMigrations(credentials.connectionString);
      console.log(`✅ Applied tenant schema for shop ${shopId}`);

      // 5. Seed initial tenant data
      await this.seedTenantData(credentials.connectionString, shopId, shopName);
      console.log(`✅ Seeded initial data for shop ${shopId}`);

      return {
        success: true,
        tenantId,
        credentials
      };

    } catch (error) {
      console.error(`❌ Failed to provision tenant for shop ${shopId}:`, error);
      
      // Attempt cleanup on failure
      if (adminClient) {
        await this.cleanupFailedProvisioning(adminClient, tenantId, username);
      }

      return {
        success: false,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

    } finally {
      if (adminClient) {
        await adminClient.end();
      }
    }
  }

  /**
   * Creates a new PostgreSQL database for the tenant
   */
  private async createTenantDatabase(adminClient: Client, databaseName: string): Promise<void> {
    // Check if database already exists
    const existsResult = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (existsResult.rows.length > 0) {
      throw new Error(`Database ${databaseName} already exists`);
    }

    // Create the database (note: database names cannot be parameterized)
    const sanitizedDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '');
    await adminClient.query(`CREATE DATABASE ${sanitizedDbName}`);
  }

  /**
   * Creates a dedicated user for the tenant with restricted privileges
   */
  private async createTenantUser(
    adminClient: Client, 
    username: string, 
    password: string, 
    databaseName: string
  ): Promise<void> {
    // Check if user already exists
    const userExistsResult = await adminClient.query(
      'SELECT 1 FROM pg_user WHERE usename = $1',
      [username]
    );

    if (userExistsResult.rows.length > 0) {
      throw new Error(`User ${username} already exists`);
    }

    // Create user with login privileges
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
    //await adminClient.query(`CREATE USER ${sanitizedUsername} WITH PASSWORD $1 LOGIN`, [password]);
    const escapedPassword = password.replace(/'/g, "''"); // Escape single quotes
    await adminClient.query(`CREATE USER ${sanitizedUsername} WITH PASSWORD '${escapedPassword}' LOGIN`);

    // Grant privileges on the tenant database
    const sanitizedDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '');
    //await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${sanitizedDbName} TO ${sanitizedUsername}`);
    
    // Grant usage on public schema and all privileges on all objects
    //await adminClient.query(`GRANT USAGE ON SCHEMA public TO ${sanitizedUsername}`);
    //await adminClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${sanitizedUsername}`);
    //await adminClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${sanitizedUsername}`);
    
    // Grant default privileges for future objects
    //await adminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${sanitizedUsername}`);
    //await adminClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${sanitizedUsername}`);

        // Connect to the tenant database to grant schema-level privileges
    // This is required for PostgreSQL 15+ where public schema is no longer world-writable
    const tenantDbUrl = `${this.config.adminConnectionString.substring(0, this.config.adminConnectionString.lastIndexOf('/'))}/${sanitizedDbName}`;
    const tenantDbClient = new Client({ connectionString: tenantDbUrl });
    
    try {
      await tenantDbClient.connect();
      
      // Grant CREATE privilege on public schema (required for PG15+)
      await tenantDbClient.query(`GRANT CREATE ON SCHEMA public TO ${sanitizedUsername}`);
      await tenantDbClient.query(`GRANT USAGE ON SCHEMA public TO ${sanitizedUsername}`);
      
      // Grant default privileges for future objects created by this user
      await tenantDbClient.query(`ALTER DEFAULT PRIVILEGES FOR USER ${sanitizedUsername} IN SCHEMA public GRANT ALL ON TABLES TO ${sanitizedUsername}`);
      await tenantDbClient.query(`ALTER DEFAULT PRIVILEGES FOR USER ${sanitizedUsername} IN SCHEMA public GRANT ALL ON SEQUENCES TO ${sanitizedUsername}`);
      
    } finally {
      await tenantDbClient.end();
    }
  
  }

  /**
   * Runs tenant schema migrations on the newly created database
   */
  private async runTenantMigrations(connectionString: string): Promise<void> {
    try {
      // Use Drizzle migrations for tenant schema
      // This will be implemented when we have the tenant schema migration files
      
      // For now, we'll run a basic schema creation
      const tenantClient = new Client({ connectionString });
      await tenantClient.connect();

      try {
        // This is a placeholder - will be replaced with actual tenant schema migrations
        await tenantClient.query(`
          CREATE TABLE IF NOT EXISTS _tenant_schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT NOW()
          )
        `);

        await tenantClient.query(`
          INSERT INTO _tenant_schema_version (version) VALUES (1)
          ON CONFLICT (version) DO NOTHING
        `);

        console.log('✅ Basic tenant schema applied');
      } finally {
        await tenantClient.end();
      }

    } catch (error) {
      console.error('Failed to run tenant migrations:', error);
      throw error;
    }
  }

  /**
   * Seeds initial data for the tenant
   */
  private async seedTenantData(connectionString: string, shopId: number, shopName: string): Promise<void> {
    const tenantClient = new Client({ connectionString });
    await tenantClient.connect();

    try {
      // Seed basic business settings
      // This is a placeholder - actual implementation will use tenantSchema
      await tenantClient.query(`
        CREATE TABLE IF NOT EXISTS business_settings (
          id SERIAL PRIMARY KEY,
          business_name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await tenantClient.query(`
        INSERT INTO business_settings (business_name) 
        VALUES ($1)
        ON CONFLICT (id) DO NOTHING
      `, [shopName]);

      console.log(`✅ Seeded basic data for ${shopName}`);
    } finally {
      await tenantClient.end();
    }
  }

  /**
   * Builds tenant connection credentials object
   */
  private buildTenantCredentials(databaseName: string, username: string, password: string): TenantCredentials {
    // Extract host and port from admin connection string
    // const adminUrl = new URL(this.config.adminConnectionString);
    // const host = adminUrl.hostname;
    // const port = parseInt(adminUrl.port) || 5432;

    // const connectionString = `postgresql://${username}:${password}@${host}:${port}/${databaseName}`;
    // Extract host and port from admin connection string
    let host: string;
    let port: number;
    
    try {
      const adminUrl = new URL(this.config.adminConnectionString);
      host = adminUrl.hostname;
      port = parseInt(adminUrl.port) || 5432;
    } catch (error) {
      // Fallback parsing if URL constructor fails
      const match = this.config.adminConnectionString.match(/\/\/[^:]+:[^@]+@([^:]+):(\d+)/);
      if (match) {
        host = match[1];
        port = parseInt(match[2]);
      } else {
        throw new Error(`Failed to parse admin connection string: ${error}`);
      }
    }

    // URL-encode username and password to handle special characters
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    
    const connectionString = `postgresql://${encodedUsername}:${encodedPassword}@${host}:${port}/${databaseName}`;
    return {
      databaseName,
      username,
      password,
      connectionString,
      host,
      port
    };
  }

  /**
   * Generates a cryptographically secure password for tenant users
   */
  private generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Cleans up partially created resources in case of provisioning failure
   */
  private async cleanupFailedProvisioning(
    adminClient: Client, 
    databaseName: string, 
    username: string
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning up failed provisioning for ${databaseName}...`);

      // Drop database if it exists
      const sanitizedDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '');
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '');

      // Terminate any existing connections to the database
      await adminClient.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [sanitizedDbName]);

      // Drop database
      await adminClient.query(`DROP DATABASE IF EXISTS ${sanitizedDbName}`);
      
      // Drop user
      await adminClient.query(`DROP USER IF EXISTS ${sanitizedUsername}`);

      console.log(`✅ Cleanup completed for ${databaseName}`);
    } catch (cleanupError) {
      console.error('Failed to cleanup failed provisioning:', cleanupError);
      // Don't throw here - we don't want to mask the original error
    }
  }

  /**
   * Deprovisions a tenant by dropping their database and user
   * GDPR-compliant cleanup of all tenant data
   * USE WITH EXTREME CAUTION - This permanently deletes all tenant data
   */
  async deprovisionTenant(shopId: number): Promise<{ success: boolean; error?: string }> {
    const tenantId = `${this.config.tenantDatabasePrefix}${shopId}_db`;
    const username = `${this.config.tenantUserPrefix}${shopId}`;

    let adminClient: Client | null = null;

    try {
      // Connect with admin privileges
      adminClient = new Client({ connectionString: this.config.adminConnectionString });
      await adminClient.connect();

      console.log(`🗑️  Deprovisioning tenant database for shop ${shopId}`);

      // 1. Terminate all active connections to the tenant database
      await adminClient.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [tenantId]);
      console.log(`✅ Terminated connections to database: ${tenantId}`);

      // 2. Drop the tenant database
      const sanitizedDbName = tenantId.replace(/[^a-zA-Z0-9_]/g, '');
      await adminClient.query(`DROP DATABASE IF EXISTS ${sanitizedDbName}`);
      console.log(`✅ Dropped database: ${tenantId}`);

      // 3. Drop the tenant user
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '');
      await adminClient.query(`DROP USER IF EXISTS ${sanitizedUsername}`);
      console.log(`✅ Dropped user: ${username}`);

      console.log(`✅ Successfully deprovisioned tenant for shop ${shopId}`);

      return { success: true };

    } catch (error) {
      console.error(`❌ Failed to deprovision tenant for shop ${shopId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

    } finally {
      if (adminClient) {
        await adminClient.end();
      }
    }
  }

  /**
   * Validates that a tenant database is accessible and healthy
   */
  async validateTenantHealth(credentials: TenantCredentials): Promise<boolean> {
    let tenantClient: Client | null = null;

    try {
      tenantClient = new Client({ connectionString: credentials.connectionString });
      await tenantClient.connect();

      // Simple health check query
      const result = await tenantClient.query('SELECT 1 as health_check');
      return result.rows.length > 0 && result.rows[0].health_check === 1;

    } catch (error) {
      console.error(`Health check failed for tenant ${credentials.databaseName}:`, error);
      return false;

    } finally {
      if (tenantClient) {
        await tenantClient.end();
      }
    }
  }
}

// Factory function to create tenant provisioning service with environment configuration
export function createTenantProvisioningService(): TenantProvisioningService {
  const config: TenantProvisioningConfig = {
    adminConnectionString: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL || '',
    masterConnectionString: process.env.DATABASE_URL || '',
    tenantDatabasePrefix: 'shop_',
    tenantUserPrefix: 'shop_user_'
  };

  if (!config.adminConnectionString) {
    throw new Error('ADMIN_DATABASE_URL or DATABASE_URL environment variable is required');
  }

  return new TenantProvisioningService(config);
}