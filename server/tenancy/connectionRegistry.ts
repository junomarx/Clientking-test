import crypto from 'crypto';
import { tenantConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db, getMasterDb } from '../db';

// =============================================================================
// CONNECTION REGISTRY - Secure tenant database credential management
// =============================================================================
// Securely stores and retrieves tenant database connection information
// Encrypts sensitive credentials and provides secure access patterns
// Integrates with tenant provisioning and routing systems
// =============================================================================

interface TenantConnectionCredentials {
  shopId: number;
  databaseName: string;
  username: string;
  password: string; // Encrypted
  host: string;
  port: number;
  connectionString: string; // Encrypted
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

interface ConnectionRegistryConfig {
  encryptionKey: string; // 32-byte key for AES-256
  maxCacheSize: number;
  cacheTTLMs: number;
  persistToDatabase: boolean;
}

export class ConnectionRegistry {
  //private config: ConnectionRegistryConfig;
  private cache = new Map<number, TenantConnectionCredentials>();
  private cacheTimestamps = new Map<number, number>();
  private encryptionAlgorithm = 'aes-256-gcm';
  private masterDb: ReturnType<typeof getMasterDb> | null = null;  // ← add

// constructor(config: ConnectionRegistryConfig) {
//   this.config = config;
//   this.validateEncryptionKey();

//   if (this.config.persistToDatabase) {
//     // lazily create the master client only when you actually plan to persist
//     this.masterDb = getMasterDb();
//   }
// }

  constructor(private config: ConnectionRegistryConfig) {
    this.validateEncryptionKey();
  }



  /**
   * Registers a new tenant connection with encrypted credentials
   */
  async registerConnection(
    shopId: number,
    credentials: {
      databaseName: string;
      username: string;
      password: string;
      host: string;
      port: number;
    }
  ): Promise<void> {
    try {
      console.log(`🔐 Registering encrypted connection for shop ${shopId}`);

      const connectionString = `postgresql://${credentials.username}:${credentials.password}@${credentials.host}:${credentials.port}/${credentials.databaseName}`;

      const connectionInfo: TenantConnectionCredentials = {
        shopId,
        databaseName: credentials.databaseName,
        username: credentials.username,
        password: this.encrypt(credentials.password),
        host: credentials.host,
        port: credentials.port,
        connectionString: this.encrypt(connectionString),
        createdAt: new Date(),
        lastUsed: new Date(),
        isActive: true
      };

      // Store in cache
      this.cache.set(shopId, connectionInfo);
      this.cacheTimestamps.set(shopId, Date.now());

      // Persist to database if enabled
      if (this.config.persistToDatabase) {
        await this.persistConnection(connectionInfo);
      }

      console.log(`✅ Registered connection for shop ${shopId}`);

    } catch (error) {
      console.error(`❌ Failed to register connection for shop ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves decrypted connection credentials for a tenant
   */
  async getConnection(shopId: number): Promise<TenantConnectionCredentials | null> {
    try {
      // Check cache first
      const cached = this.getCachedConnection(shopId);
      if (cached) {
        return this.decryptCredentials(cached);
      }

      // Load from database if cache miss
      if (this.config.persistToDatabase) {
        const persisted = await this.loadConnection(shopId);
        if (persisted) {
          // Update cache
          this.cache.set(shopId, persisted);
          this.cacheTimestamps.set(shopId, Date.now());
          return this.decryptCredentials(persisted);
        }
      }

      console.log(`⚠️ No connection found for shop ${shopId}`);
      return null;

    } catch (error) {
      console.error(`❌ Failed to get connection for shop ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Updates connection credentials for a tenant
   */
  async updateConnection(
    shopId: number,
    updates: Partial<{
      password: string;
      host: string;
      port: number;
      isActive: boolean;
    }>
  ): Promise<void> {
    try {
      console.log(`🔄 Updating connection for shop ${shopId}`);

      const existing = await this.getConnection(shopId);
      if (!existing) {
        throw new Error(`Connection for shop ${shopId} not found`);
      }

      // Apply updates
      if (updates.password) {
        existing.password = updates.password;
        // Regenerate connection string if password changed
        const newConnectionString = `postgresql://${existing.username}:${updates.password}@${existing.host}:${existing.port}/${existing.databaseName}`;
        existing.connectionString = newConnectionString;
      }

      if (updates.host) existing.host = updates.host;
      if (updates.port) existing.port = updates.port;
      if (updates.isActive !== undefined) existing.isActive = updates.isActive;

      // Re-encrypt and store
      const encryptedInfo: TenantConnectionCredentials = {
        ...existing,
        password: this.encrypt(existing.password),
        connectionString: this.encrypt(existing.connectionString)
      };

      this.cache.set(shopId, encryptedInfo);
      this.cacheTimestamps.set(shopId, Date.now());

      if (this.config.persistToDatabase) {
        await this.persistConnection(encryptedInfo);
      }

      console.log(`✅ Updated connection for shop ${shopId}`);

    } catch (error) {
      console.error(`❌ Failed to update connection for shop ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Removes connection credentials for a tenant
   */
  async removeConnection(shopId: number): Promise<void> {
    try {
      console.log(`🗑️ Removing connection for shop ${shopId}`);

      // Remove from cache
      this.cache.delete(shopId);
      this.cacheTimestamps.delete(shopId);

      // Remove from database
      if (this.config.persistToDatabase) {
        await this.deleteConnection(shopId);
      }

      console.log(`✅ Removed connection for shop ${shopId}`);

    } catch (error) {
      console.error(`❌ Failed to remove connection for shop ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Bootstrap connections from Docker/Kubernetes secrets (environment variables)
   * Scans for TENANT_<ID>_URL or TENANT_<ID>_DATABASE_URL env vars
   * Parses connection strings and registers them in the registry
   * 
   * Example env vars:
   * - TENANT_1_URL=postgresql://shop_user_1:password@postgres:5432/shop_1_db
   * - TENANT_2_DATABASE_URL=postgresql://shop_user_2:password@postgres:5432/shop_2_db
   */
  async bootstrapFromSecrets(): Promise<{
    loaded: number;
    failed: number;
    errors: Array<{ tenantId: string; error: string }>;
  }> {
    console.log('🔐 Bootstrapping tenant connections from Docker/K8s secrets...');
    
    const results = {
      loaded: 0,
      failed: 0,
      errors: [] as Array<{ tenantId: string; error: string }>
    };

    // Scan environment variables for tenant connection strings
    const tenantSecrets: Array<{ shopId: number; envVar: string; connectionString: string }> = [];
    
    for (const [key, value] of Object.entries(process.env)) {
      // Match TENANT_<ID>_URL or TENANT_<ID>_DATABASE_URL patterns
      const match = key.match(/^TENANT_(\d+)(?:_DATABASE)?_URL$/);
      
      if (match && value) {
        const shopId = parseInt(match[1]);
        tenantSecrets.push({
          shopId,
          envVar: key,
          connectionString: value
        });
      }
    }

    if (tenantSecrets.length === 0) {
      console.log('ℹ️ No tenant secrets found in environment (TENANT_<ID>_URL pattern)');
      return results;
    }

    console.log(`📦 Found ${tenantSecrets.length} tenant secrets to bootstrap`);

    // Register each tenant connection
    for (const secret of tenantSecrets) {
      try {
        const parsed = this.parseConnectionString(secret.connectionString);
        
        await this.registerConnection(secret.shopId, {
          databaseName: parsed.databaseName,
          username: parsed.username,
          password: parsed.password,
          host: parsed.host,
          port: parsed.port
        });

        results.loaded++;
        console.log(`  ✅ Loaded tenant ${secret.shopId} from ${secret.envVar}`);

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push({
          tenantId: `TENANT_${secret.shopId}`,
          error: errorMsg
        });
        console.error(`  ❌ Failed to load tenant ${secret.shopId}: ${errorMsg}`);
      }
    }

    console.log(`\n✅ Bootstrap complete: ${results.loaded} loaded, ${results.failed} failed`);
    return results;
}

  /**
   * Parses PostgreSQL connection string into components
   * Format: postgresql://username:password@host:port/database
   */
  private parseConnectionString(connectionString: string): {
    username: string;
    password: string;
    host: string;
    port: number;
    databaseName: string;
  } {
    try {
      const url = new URL(connectionString);
      
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        throw new Error('Invalid protocol - must be postgresql:// or postgres://');
      }

      return {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        databaseName: url.pathname.slice(1) // Remove leading /
      };
    } catch (error) {
      throw new Error(`Invalid connection string: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets all registered shop IDs
   */

  async getAllShopIds(): Promise<number[]> {
    return this.config.persistToDatabase ? this.getAllPersistedShopIds() : Array.from(this.cache.keys());
  }

  /**
   * Updates last used timestamp for a connection
   */
  async markConnectionUsed(shopId: number): Promise<void> {
    const connection = this.cache.get(shopId);
    if (connection) {
      connection.lastUsed = new Date();
      this.cacheTimestamps.set(shopId, Date.now());
    }
  }

  /**
   * Validates that all connections are accessible
   */
  async validateAllConnections(): Promise<{
    shopId: number;
    isValid: boolean;
    error?: string;
  }[]> {
    const shopIds = await this.getAllShopIds();
    const results = [];

    for (const shopId of shopIds) {
      try {
        const connection = await this.getConnection(shopId);
        if (!connection) {
          results.push({
            shopId,
            isValid: false,
            error: 'Connection not found'
          });
          continue;
        }

        // Test connection (simplified test)
        const isValid = connection.isActive && 
                       connection.connectionString.length > 0 &&
                       connection.username.length > 0;

        results.push({
          shopId,
          isValid,
          error: isValid ? undefined : 'Invalid connection data'
        });

      } catch (error) {
        results.push({
          shopId,
          isValid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Cleans up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    const expiredKeys = [];

    for (const [shopId, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.config.cacheTTLMs) {
        expiredKeys.push(shopId);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Gets cached connection if valid
   */
  private getCachedConnection(shopId: number): TenantConnectionCredentials | null {
    const cached = this.cache.get(shopId);
    const timestamp = this.cacheTimestamps.get(shopId);

    if (!cached || !timestamp) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - timestamp > this.config.cacheTTLMs) {
      this.cache.delete(shopId);
      this.cacheTimestamps.delete(shopId);
      return null;
    }

    return cached;
  }

  /**
   * Decrypts connection credentials
   */
  private decryptCredentials(encrypted: TenantConnectionCredentials): TenantConnectionCredentials {
    return {
      ...encrypted,
      password: this.decrypt(encrypted.password),
      connectionString: this.decrypt(encrypted.connectionString)
    };
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * Format: iv:authTag:ciphertext (all hex-encoded)
   */
  private encrypt(text: string): string {
    // GCM requires 12-byte (96-bit) IV for optimal security
    const iv = crypto.randomBytes(12);
    
    // Key must be 32 bytes for AES-256
    const key = this.getKeyBuffer();
    
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // GCM authentication tag (16 bytes)
    const authTag = cipher.getAuthTag();
    
    // Return as: iv:authTag:ciphertext
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypts data encrypted with encrypt()
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Key must be 32 bytes for AES-256
    const key = this.getKeyBuffer();
    
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Converts encryption key to 32-byte Buffer
   * Supports hex string (64 chars) or base64 string (44 chars)
   */
  private getKeyBuffer(): Buffer {
    const key = this.config.encryptionKey;
    
    // Try hex first (64 hex chars = 32 bytes)
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex');
    }
    
    // Try base64 (44 chars = 32 bytes)
    if (key.length === 44) {
      return Buffer.from(key, 'base64');
    }
    
    // Fallback: hash the key to get 32 bytes (for backward compatibility)
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Validates encryption key
   */
  private validateEncryptionKey(): void {
    if (!this.config.encryptionKey || this.config.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters (64 hex chars or 44 base64 chars recommended)');
    }
    
    // Warn if using default key
    if (this.config.encryptionKey === 'default-key-change-in-production-environment') {
      throw new Error('Default encryption key detected - TENANT_ENCRYPTION_KEY must be set in production!');
    }
  }

  /**
   * Persists connection to master database
   */
  private async persistConnection(connection: TenantConnectionCredentials): Promise<void> {
    try {
      //await db.insert(tenantConnections)
      const mdb = this.masterDb!;
      const [result] = await mdb.select()
        .values({
          shopId: connection.shopId,
          databaseName: connection.databaseName,
          username: connection.username,
          encryptedPassword: connection.password, // Already encrypted
          encryptedConnectionString: connection.connectionString, // Already encrypted
          host: connection.host,
          port: connection.port,
          isActive: connection.isActive,
          lastUsed: connection.lastUsed,
        })
        .onConflictDoUpdate({
          target: tenantConnections.shopId,
          set: {
            encryptedPassword: connection.password,
            encryptedConnectionString: connection.connectionString,
            host: connection.host,
            port: connection.port,
            isActive: connection.isActive,
            lastUsed: connection.lastUsed,
          }
        });
      
      console.log(`💾 Persisted connection for shop ${connection.shopId}`);
    } catch (error) {
      console.error(`❌ Failed to persist connection for shop ${connection.shopId}:`, error);
      throw error;
    }
  }

  /**
   * Loads connection from database
   */
  private async loadConnection(shopId: number): Promise<TenantConnectionCredentials | null> {
    try {
      const [result] = await db.select()
        .from(tenantConnections)
        .where(eq(tenantConnections.shopId, shopId));

      if (!result) {
        return null;
      }

      return {
        shopId: result.shopId,
        databaseName: result.databaseName,
        username: result.username,
        password: result.encryptedPassword, // Still encrypted
        connectionString: result.encryptedConnectionString, // Still encrypted
        host: result.host,
        port: result.port,
        isActive: result.isActive,
        createdAt: result.createdAt,
        lastUsed: result.lastUsed,
      };
    } catch (error) {
      console.error(`❌ Failed to load connection for shop ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes connection from database
   */
  private async deleteConnection(shopId: number): Promise<void> {
    try {
      //await db.delete(tenantConnections)
      const mdb = this.masterDb!;
      await mdb.delete(tenantConnections)
        .where(eq(tenantConnections.shopId, shopId));
      
      console.log(`🗑️ Deleted persisted connection for shop ${shopId}`);
    } catch (error) {
      console.error(`❌ Failed to delete connection for shop ${shopId}:`, error);
      throw error;
    }
  }

    /**
     * Gets all persisted shop IDs
     */
    private async getAllPersistedShopIds(): Promise<number[]> {
      const first = getRegistryDb();
      try {
        const rows = await first
          .select({ shopId: tenantConnections.shopId })
          .from(tenantConnections)
          .where(eq(tenantConnections.isActive, true));
        return rows.map(r => r.shopId);
      } catch (e: any) {
        if (e?.code !== '42P01') throw e; // not "relation does not exist"
        // fallback to other DB
        const fallback = first === db ? getMasterDb() : db;
        const rows = await fallback
          .select({ shopId: tenantConnections.shopId })
          .from(tenantConnections)
          .where(eq(tenantConnections.isActive, true));
        return rows.map(r => r.shopId);
      }
    }

}





  /**
   * Factory function to create connection registry with environment configuration
   * 
   * Environment variables:
   * - CONNECTION_ENCRYPTION_KEY or TENANT_ENCRYPTION_KEY: 64 hex chars (32 bytes) for AES-256
   *   Generate with: `openssl rand -hex 32`
   * - CONNECTION_CACHE_SIZE: Max cache entries (default: 100)
   * - CONNECTION_CACHE_TTL: Cache TTL in ms (default: 3600000 = 1 hour)
   * - PERSIST_CONNECTIONS: 'true' to persist to master DB (default: false)
   * - BOOTSTRAP_FROM_SECRETS: 'true' to auto-load from TENANT_<ID>_URL env vars (default: false)
   */
export function createConnectionRegistry(): ConnectionRegistry {
  const encryptionKey =
    process.env.CONNECTION_ENCRYPTION_KEY ||
    process.env.TENANT_ENCRYPTION_KEY ||
    process.env.SECRET_KEY ||
    'default-key-change-in-production-environment';

  const persist =
    (process.env.PERSIST_TO_DATABASE === 'true') ||
    (process.env.PERSIST_CONNECTIONS === 'true');

  const config: ConnectionRegistryConfig = {
    encryptionKey,
    maxCacheSize: parseInt(process.env.CONNECTION_CACHE_SIZE || '100', 10),
    cacheTTLMs: parseInt(process.env.CONNECTION_CACHE_TTL || '3600000', 10),
    persistToDatabase: persist,
  };
  return new ConnectionRegistry(config);
}


  /**
   * Factory function to create and bootstrap connection registry
   * Loads tenant connections from Docker/K8s secrets automatically
   * 
   * Usage in containerized deployments:
   * ```typescript
   * const registry = await createAndBootstrapRegistry();
   * ```
   */
  export async function createAndBootstrapRegistry(): Promise<ConnectionRegistry> {
    const registry = createConnectionRegistry();
    
    // Bootstrap from secrets if enabled
    if (process.env.BOOTSTRAP_FROM_SECRETS === 'true') {
      const results = await registry.bootstrapFromSecrets();
      
      if (results.failed > 0) {
        console.warn(`⚠️ Some tenant connections failed to bootstrap: ${results.failed} failures`);
        results.errors.forEach(err => {
          console.error(`  - ${err.tenantId}: ${err.error}`);
        });
      }
      
      if (results.loaded === 0 && results.failed === 0) {
        console.log('ℹ️ No tenant secrets found - connections can be registered programmatically');
      }
    }
    
    return registry;
  }