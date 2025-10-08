import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ConnectionRegistry } from './connectionRegistry.js';

// =============================================================================
// TENANCY ROUTER - Connection Management and Routing
// =============================================================================
// Manages connections to master database and multiple tenant databases
// Routes requests to appropriate database based on user context and operation type
// =============================================================================

interface DatabaseConnection {
  pool: Pool;
  db: NodePgDatabase<any>;
  lastUsed: Date;
  isHealthy: boolean;
}

interface TenantConnectionInfo {
  shopId: number;
  connectionString: string;
  databaseName: string;
  username: string;
}

interface UserTenantContext {
  userId: number;
  primaryShopId: number;
  accessibleShops: number[]; // Shops user has access to
  role: 'superadmin' | 'multi_shop_admin' | 'owner' | 'employee' | 'kiosk';
  currentShopId?: number; // Currently selected shop context
}

interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  cleanupIntervalMs: number;
}

export class TenantRouter {
  private masterConnection: DatabaseConnection | null = null;
  private tenantConnections: Map<number, DatabaseConnection> = new Map();
  private connectionRegistry: ConnectionRegistry | null = null;
  private config: ConnectionPoolConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 10,
      idleTimeoutMs: config.idleTimeoutMs || 300000, // 5 minutes
      connectionTimeoutMs: config.connectionTimeoutMs || 30000, // 30 seconds
      cleanupIntervalMs: config.cleanupIntervalMs || 60000, // 1 minute
    };

    // Start connection cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Initializes the master database connection
   */
  async initializeMasterConnection(connectionString: string): Promise<void> {
    if (this.masterConnection) {
      console.log('Master connection already initialized');
      return;
    }

    try {
      const pool = new Pool({
        connectionString,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMs,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
      });

      const db = drizzle(pool);
      
      // Test connection
      await pool.query('SELECT 1');

      this.masterConnection = {
        pool,
        db,
        lastUsed: new Date(),
        isHealthy: true
      };

      console.log('✅ Master database connection initialized');
    } catch (error) {
      console.error('❌ Failed to initialize master connection:', error);
      throw new Error(`Master database connection failed: ${error}`);
    }
  }

  /**
   * Sets the connection registry for secure credential management
   */
  setConnectionRegistry(registry: ConnectionRegistry): void {
    this.connectionRegistry = registry;
    console.log('🔐 Connection registry integrated with tenant router');
  }

  /**
   * Registers a tenant connection through the secure registry
   */
  async registerTenantConnection(tenantInfo: TenantConnectionInfo): Promise<void> {
    if (!this.connectionRegistry) {
      throw new Error('Connection registry not configured');
    }
    
    await this.connectionRegistry.registerConnection(tenantInfo.shopId, {
      databaseName: tenantInfo.databaseName,
      username: tenantInfo.username,
      password: tenantInfo.connectionString.split(':')[2].split('@')[0], // Extract password
      host: tenantInfo.connectionString.split('@')[1].split(':')[0],
      port: parseInt(tenantInfo.connectionString.split(':')[3].split('/')[0])
    });
    console.log(`📝 Registered tenant connection for shop ${tenantInfo.shopId}`);
  }

  /**
   * Gets or creates a tenant database connection
   */
  async getTenantConnection(shopId: number): Promise<DatabaseConnection> {
    // Check if connection already exists and is healthy
    const existingConnection = this.tenantConnections.get(shopId);
    if (existingConnection && existingConnection.isHealthy) {
      existingConnection.lastUsed = new Date();
      return existingConnection;
    }

    // Get tenant connection info from secure registry
    if (!this.connectionRegistry) {
      throw new Error('Connection registry not configured');
    }
    
    const tenantInfo = await this.connectionRegistry.getConnection(shopId);
    if (!tenantInfo) {
      throw new Error(`Tenant connection info not found for shop ${shopId}`);
    }

    try {
      console.log(`🔌 Creating new connection for shop ${shopId}`);

      const pool = new Pool({
        connectionString: tenantInfo.connectionString,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMs,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
      });
      
      // Mark connection as used in registry
      await this.connectionRegistry!.markConnectionUsed(shopId);

      const db = drizzle(pool);

      // Test connection
      await pool.query('SELECT 1');

      const connection: DatabaseConnection = {
        pool,
        db,
        lastUsed: new Date(),
        isHealthy: true
      };

      this.tenantConnections.set(shopId, connection);
      console.log(`✅ Tenant connection established for shop ${shopId}`);

      return connection;

    } catch (error) {
      console.error(`❌ Failed to connect to tenant database for shop ${shopId}:`, error);
      throw new Error(`Tenant database connection failed for shop ${shopId}: ${error}`);
    }
  }

  /**
   * Gets the master database connection
   */
  getMasterConnection(): DatabaseConnection {
    if (!this.masterConnection) {
      throw new Error('Master connection not initialized. Call initializeMasterConnection() first.');
    }

    if (!this.masterConnection.isHealthy) {
      throw new Error('Master connection is unhealthy');
    }

    this.masterConnection.lastUsed = new Date();
    return this.masterConnection;
  }

  /**
   * Resolves the appropriate database connection based on operation type and user context
   */
  async resolveConnection(
    operationType: 'master' | 'tenant' | 'auto',
    userContext?: UserTenantContext,
    explicitShopId?: number
  ): Promise<{ connection: DatabaseConnection; type: 'master' | 'tenant'; shopId?: number }> {
    
    // Master operations always use master DB
    if (operationType === 'master') {
      return {
        connection: this.getMasterConnection(),
        type: 'master'
      };
    }

    // Tenant operations need shop context
    if (operationType === 'tenant') {
      const shopId = this.resolveShopId(userContext, explicitShopId);
      const connection = await this.getTenantConnection(shopId);
      return {
        connection,
        type: 'tenant',
        shopId
      };
    }

    // Auto resolution based on operation context
    if (operationType === 'auto') {
      // If no user context or shop context, default to master
      if (!userContext || (!userContext.currentShopId && !explicitShopId)) {
        return {
          connection: this.getMasterConnection(),
          type: 'master'
        };
      }

      // Resolve to tenant database
      const shopId = this.resolveShopId(userContext, explicitShopId);
      const connection = await this.getTenantConnection(shopId);
      return {
        connection,
        type: 'tenant',
        shopId
      };
    }

    throw new Error(`Invalid operation type: ${operationType}`);
  }

  /**
   * Resolves the shop ID from user context and explicit shop ID
   */
  private resolveShopId(userContext?: UserTenantContext, explicitShopId?: number): number {
    // Explicit shop ID takes precedence
    if (explicitShopId !== undefined) {
      // Validate user has access to this shop
      if (userContext && !userContext.accessibleShops.includes(explicitShopId)) {
        throw new Error(`User does not have access to shop ${explicitShopId}`);
      }
      return explicitShopId;
    }

    // Use current shop context
    if (userContext?.currentShopId) {
      return userContext.currentShopId;
    }

    // Fall back to primary shop
    if (userContext?.primaryShopId) {
      return userContext.primaryShopId;
    }

    throw new Error('No shop context available for tenant operation');
  }

  /**
   * Executes a query with automatic connection resolution
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    operationType: 'master' | 'tenant' | 'auto',
    userContext?: UserTenantContext,
    explicitShopId?: number
  ): Promise<T[]> {
    const { connection } = await this.resolveConnection(operationType, userContext, explicitShopId);
    const result = await connection.pool.query(query, params);
    return result.rows;
  }

  /**
   * Gets a Drizzle database instance for the appropriate context
   */
  async getDatabase(
    operationType: 'master' | 'tenant' | 'auto',
    userContext?: UserTenantContext,
    explicitShopId?: number
  ): Promise<{ db: NodePgDatabase<any>; type: 'master' | 'tenant'; shopId?: number }> {
    const { connection, type, shopId } = await this.resolveConnection(operationType, userContext, explicitShopId);
    return {
      db: connection.db,
      type,
      shopId
    };
  }

  /**
   * Executes operations across multiple tenant databases (for multi-shop scenarios)
   */
  async executeMultiTenant<T>(
    shopIds: number[],
    operation: (db: NodePgDatabase<any>, shopId: number) => Promise<T>
  ): Promise<{ shopId: number; result: T; error?: string }[]> {
    const results = await Promise.allSettled(
      shopIds.map(async (shopId) => {
        const connection = await this.getTenantConnection(shopId);
        const result = await operation(connection.db, shopId);
        return { shopId, result };
      })
    );

    return results.map((result, index) => {
      const shopId = shopIds[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          shopId,
          result: null as any,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<{
    master: boolean;
    tenants: { shopId: number; healthy: boolean; error?: string }[];
  }> {
    const results = {
      master: false,
      tenants: [] as { shopId: number; healthy: boolean; error?: string }[]
    };

    // Check master connection
    try {
      if (this.masterConnection) {
        await this.masterConnection.pool.query('SELECT 1');
        results.master = true;
        this.masterConnection.isHealthy = true;
      }
    } catch (error) {
      console.error('Master connection health check failed:', error);
      if (this.masterConnection) {
        this.masterConnection.isHealthy = false;
      }
    }

    // Check tenant connections
    for (const [shopId, connection] of this.tenantConnections.entries()) {
      try {
        await connection.pool.query('SELECT 1');
        connection.isHealthy = true;
        results.tenants.push({ shopId, healthy: true });
      } catch (error) {
        console.error(`Tenant connection health check failed for shop ${shopId}:`, error);
        connection.isHealthy = false;
        results.tenants.push({
          shopId,
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Starts the connection cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Cleans up idle tenant connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const idleThreshold = this.config.idleTimeoutMs;

    for (const [shopId, connection] of this.tenantConnections.entries()) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();
      
      if (idleTime > idleThreshold) {
        console.log(`🧹 Cleaning up idle connection for shop ${shopId}`);
        try {
          await connection.pool.end();
          this.tenantConnections.delete(shopId);
        } catch (error) {
          console.error(`Error closing connection for shop ${shopId}:`, error);
        }
      }
    }
  }

  /**
   * Gets all registered tenant shop IDs (for health monitoring)
   */
  async getAllTenantShopIds(): Promise<number[]> {
    if (!this.connectionRegistry) {
      return Array.from(this.tenantConnections.keys());
    }
    return this.connectionRegistry.getAllShopIds();
  }

  /**
   * Gets connection pool statistics for monitoring
   */
  getConnectionPoolStats(): { shopId: number; totalCount: number; idleCount: number; waitingCount: number }[] {
    const stats = [];
    for (const [shopId, connection] of this.tenantConnections.entries()) {
      stats.push({
        shopId,
        totalCount: connection.pool.totalCount,
        idleCount: connection.pool.idleCount,
        waitingCount: connection.pool.waitingCount
      });
    }
    return stats;
  }

  /**
   * Closes all connections and cleans up resources
   */
  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down tenant router...');

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all tenant connections
    for (const [shopId, connection] of this.tenantConnections.entries()) {
      try {
        await connection.pool.end();
        console.log(`✅ Closed connection for shop ${shopId}`);
      } catch (error) {
        console.error(`Error closing connection for shop ${shopId}:`, error);
      }
    }
    this.tenantConnections.clear();

    // Close master connection
    if (this.masterConnection) {
      try {
        await this.masterConnection.pool.end();
        console.log('✅ Closed master connection');
      } catch (error) {
        console.error('Error closing master connection:', error);
      }
      this.masterConnection = null;
    }

    console.log('✅ Tenant router shutdown complete');
  }
}

// Singleton instance for application-wide use
let tenantRouterInstance: TenantRouter | null = null;

/**
 * Gets the singleton tenant router instance
 */
export function getTenantRouter(): TenantRouter {
  if (!tenantRouterInstance) {
    tenantRouterInstance = new TenantRouter();
  }
  return tenantRouterInstance;
}

/**
 * Factory function to initialize tenant router with master connection
 */
export async function initializeTenantRouter(masterConnectionString: string): Promise<TenantRouter> {
  const router = getTenantRouter();
  await router.initializeMasterConnection(masterConnectionString);
  return router;
}