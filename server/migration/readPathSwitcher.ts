import type { IStorage } from '../storage.js';
import type { TenantRouter } from '../tenancy/tenantRouter.js';

// =============================================================================
// READ PATH SWITCHER - Gradual migration from unified to tenant read paths
// =============================================================================
// Controls which database is used for read operations during migration
// Supports gradual rollout, A/B testing, and instant rollback
// Ensures zero-downtime migration with fallback capabilities
// =============================================================================

interface ReadPathConfig {
  strategy: 'unified' | 'tenant' | 'percentage' | 'shop-list' | 'canary';
  percentage?: number; // For percentage strategy (0-100)
  shopIds?: number[]; // For shop-list strategy
  canaryShopIds?: number[]; // For canary strategy
  enableFallback: boolean; // Fallback to unified if tenant read fails
  verifyConsistency: boolean; // Compare results between sources
  logInconsistencies: boolean; // Log when unified and tenant data differ
}

interface ReadMetrics {
  totalReads: number;
  unifiedReads: number;
  tenantReads: number;
  fallbackReads: number;
  inconsistentReads: number;
  averageLatencyMs: {
    unified: number;
    tenant: number;
  };
  lastReadAt?: Date;
}

interface ConsistencyCheckResult {
  shopId: number;
  entity: string;
  recordId: number;
  isConsistent: boolean;
  unifiedData?: any;
  tenantData?: any;
  differences?: string[];
}

export class ReadPathSwitcher implements IStorage {
  private unifiedStorage: IStorage;
  private tenantRouter: TenantRouter;
  private config: ReadPathConfig;
  private metrics: ReadMetrics = {
    totalReads: 0,
    unifiedReads: 0,
    tenantReads: 0,
    fallbackReads: 0,
    inconsistentReads: 0,
    averageLatencyMs: {
      unified: 0,
      tenant: 0
    }
  };
  private consistencyLog: ConsistencyCheckResult[] = [];
  private maxConsistencyLogSize = 100;

  constructor(
    unifiedStorage: IStorage,
    tenantRouter: TenantRouter,
    config: Partial<ReadPathConfig> = {}
  ) {
    this.unifiedStorage = unifiedStorage;
    this.tenantRouter = tenantRouter;
    this.config = {
      strategy: config.strategy ?? 'unified',
      percentage: config.percentage ?? 0,
      shopIds: config.shopIds ?? [],
      canaryShopIds: config.canaryShopIds ?? [],
      enableFallback: config.enableFallback ?? true,
      verifyConsistency: config.verifyConsistency ?? false,
      logInconsistencies: config.logInconsistencies ?? true
    };

    console.log('🔀 Read path switcher initialized:', this.config);
  }

  // =============================================================================
  // READ PATH DECISION LOGIC
  // =============================================================================

  /**
   * Determines which database to read from based on strategy
   */
  private shouldReadFromTenant(shopId: number): boolean {
    switch (this.config.strategy) {
      case 'unified':
        return false;

      case 'tenant':
        return true;

      case 'percentage':
        // Deterministic percentage based on shopId hash
        const hash = this.hashShopId(shopId);
        return hash < (this.config.percentage || 0);

      case 'shop-list':
        return this.config.shopIds?.includes(shopId) || false;

      case 'canary':
        return this.config.canaryShopIds?.includes(shopId) || false;

      default:
        return false;
    }
  }

  /**
   * Hash function for deterministic percentage rollout
   */
  private hashShopId(shopId: number): number {
    // Simple hash to get consistent 0-100 range
    return (shopId * 2654435761) % 100;
  }

  /**
   * Executes a read operation with fallback and consistency checking
   */
  private async executeRead<T>(
    operation: string,
    shopId: number,
    unifiedRead: () => Promise<T>,
    tenantRead: () => Promise<T>,
    recordId?: number
  ): Promise<T> {
    const startTime = Date.now();
    const shouldUseTenant = this.shouldReadFromTenant(shopId);

    try {
      let result: T;

      if (shouldUseTenant) {
        // Read from tenant database
        try {
          result = await tenantRead();
          this.updateMetrics('tenant', Date.now() - startTime);
        } catch (error) {
          if (this.config.enableFallback) {
            console.warn(`⚠️ Tenant read failed for ${operation}, falling back to unified:`, error);
            result = await unifiedRead();
            this.metrics.fallbackReads++;
            this.updateMetrics('unified', Date.now() - startTime);
          } else {
            throw error;
          }
        }

        // Consistency verification if enabled
        if (this.config.verifyConsistency) {
          await this.verifyConsistency(operation, shopId, recordId, unifiedRead, result);
        }

      } else {
        // Read from unified database
        result = await unifiedRead();
        this.updateMetrics('unified', Date.now() - startTime);
      }

      this.metrics.lastReadAt = new Date();
      return result;

    } catch (error) {
      console.error(`❌ Read operation failed: ${operation}`, error);
      throw error;
    }
  }

  /**
   * Verifies consistency between unified and tenant databases
   */
  private async verifyConsistency<T>(
    operation: string,
    shopId: number,
    recordId: number | undefined,
    unifiedRead: () => Promise<T>,
    tenantResult: T
  ): Promise<void> {
    try {
      const unifiedResult = await unifiedRead();
      const isConsistent = JSON.stringify(unifiedResult) === JSON.stringify(tenantResult);

      if (!isConsistent) {
        this.metrics.inconsistentReads++;

        const checkResult: ConsistencyCheckResult = {
          shopId,
          entity: operation,
          recordId: recordId || 0,
          isConsistent: false,
          unifiedData: unifiedResult,
          tenantData: tenantResult,
          differences: this.findDifferences(unifiedResult, tenantResult)
        };

        this.consistencyLog.push(checkResult);

        // Keep log size manageable
        if (this.consistencyLog.length > this.maxConsistencyLogSize) {
          this.consistencyLog.shift();
        }

        if (this.config.logInconsistencies) {
          console.warn(`⚠️ Data inconsistency detected:`, checkResult);
        }
      }

    } catch (error) {
      console.error('❌ Consistency check failed:', error);
    }
  }

  /**
   * Finds differences between two objects
   */
  private findDifferences(obj1: any, obj2: any): string[] {
    const differences: string[] = [];

    if (typeof obj1 !== typeof obj2) {
      differences.push(`Type mismatch: ${typeof obj1} vs ${typeof obj2}`);
      return differences;
    }

    if (typeof obj1 === 'object' && obj1 !== null && obj2 !== null) {
      const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
      
      for (const key of keys) {
        if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          differences.push(`${key}: ${JSON.stringify(obj1[key])} vs ${JSON.stringify(obj2[key])}`);
        }
      }
    } else if (obj1 !== obj2) {
      differences.push(`Value mismatch: ${obj1} vs ${obj2}`);
    }

    return differences;
  }

  /**
   * Updates read metrics
   */
  private updateMetrics(source: 'unified' | 'tenant', latencyMs: number): void {
    this.metrics.totalReads++;
    
    if (source === 'unified') {
      this.metrics.unifiedReads++;
      this.metrics.averageLatencyMs.unified = 
        (this.metrics.averageLatencyMs.unified * (this.metrics.unifiedReads - 1) + latencyMs) / 
        this.metrics.unifiedReads;
    } else {
      this.metrics.tenantReads++;
      this.metrics.averageLatencyMs.tenant = 
        (this.metrics.averageLatencyMs.tenant * (this.metrics.tenantReads - 1) + latencyMs) / 
        this.metrics.tenantReads;
    }
  }

  // =============================================================================
  // CUSTOMER READ OPERATIONS
  // =============================================================================

  async getCustomerById(shopId: number, customerId: number): Promise<any | null> {
    return this.executeRead(
      'getCustomerById',
      shopId,
      () => this.unifiedStorage.getCustomerById(shopId, customerId),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        const result = await tenantDb.db.select()
          .from(tenantDb.schema.customers)
          .where(tenantDb.db.eq(tenantDb.schema.customers.id, customerId))
          .limit(1);
        return result[0] || null;
      },
      customerId
    );
  }

  async getCustomersByShop(shopId: number): Promise<any[]> {
    return this.executeRead(
      'getCustomersByShop',
      shopId,
      () => this.unifiedStorage.getCustomersByShop(shopId),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        return tenantDb.db.select()
          .from(tenantDb.schema.customers)
          .where(tenantDb.db.eq(tenantDb.schema.customers.shopId, shopId));
      }
    );
  }

  async searchCustomers(shopId: number, query: string): Promise<any[]> {
    return this.executeRead(
      'searchCustomers',
      shopId,
      () => this.unifiedStorage.searchCustomers(shopId, query),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        return tenantDb.db.select()
          .from(tenantDb.schema.customers)
          .where(tenantDb.db.or(
            tenantDb.db.ilike(tenantDb.schema.customers.name, `%${query}%`),
            tenantDb.db.ilike(tenantDb.schema.customers.email, `%${query}%`),
            tenantDb.db.ilike(tenantDb.schema.customers.phone, `%${query}%`)
          ));
      }
    );
  }

  // =============================================================================
  // REPAIR READ OPERATIONS
  // =============================================================================

  async getRepairById(shopId: number, repairId: number): Promise<any | null> {
    return this.executeRead(
      'getRepairById',
      shopId,
      () => this.unifiedStorage.getRepairById(shopId, repairId),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        const result = await tenantDb.db.select()
          .from(tenantDb.schema.repairs)
          .where(tenantDb.db.eq(tenantDb.schema.repairs.id, repairId))
          .limit(1);
        return result[0] || null;
      },
      repairId
    );
  }

  async getRepairsByShop(shopId: number, filters?: any): Promise<any[]> {
    return this.executeRead(
      'getRepairsByShop',
      shopId,
      () => this.unifiedStorage.getRepairsByShop(shopId, filters),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        let query = tenantDb.db.select()
          .from(tenantDb.schema.repairs)
          .where(tenantDb.db.eq(tenantDb.schema.repairs.shopId, shopId));
        
        if (filters?.status) {
          query = query.where(tenantDb.db.eq(tenantDb.schema.repairs.status, filters.status));
        }
        
        return query;
      }
    );
  }

  // =============================================================================
  // WRITE OPERATIONS (Pass-through to unified storage)
  // =============================================================================

  async createCustomer(shopId: number, data: any): Promise<any> {
    return this.unifiedStorage.createCustomer(shopId, data);
  }

  async updateCustomer(shopId: number, customerId: number, data: any): Promise<any | null> {
    return this.unifiedStorage.updateCustomer(shopId, customerId, data);
  }

  async deleteCustomer(shopId: number, customerId: number): Promise<boolean> {
    return this.unifiedStorage.deleteCustomer(shopId, customerId);
  }

  async createRepair(shopId: number, data: any): Promise<any> {
    return this.unifiedStorage.createRepair(shopId, data);
  }

  async updateRepair(shopId: number, repairId: number, data: any): Promise<any | null> {
    return this.unifiedStorage.updateRepair(shopId, repairId, data);
  }

  async deleteRepair(shopId: number, repairId: number): Promise<boolean> {
    return this.unifiedStorage.deleteRepair(shopId, repairId);
  }

  // =============================================================================
  // CONFIGURATION & MONITORING
  // =============================================================================

  /**
   * Updates read path configuration at runtime
   */
  updateConfig(updates: Partial<ReadPathConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔀 Read path config updated:', this.config);
  }

  /**
   * Gradually increases percentage of tenant reads
   */
  async rolloutTenantReads(targetPercentage: number, stepSize = 10, delayMs = 60000): Promise<void> {
    console.log(`🚀 Starting gradual rollout to ${targetPercentage}% tenant reads`);

    this.config.strategy = 'percentage';
    let currentPercentage = this.config.percentage || 0;

    while (currentPercentage < targetPercentage) {
      currentPercentage = Math.min(currentPercentage + stepSize, targetPercentage);
      this.config.percentage = currentPercentage;

      console.log(`📊 Rolled out to ${currentPercentage}% tenant reads`);

      if (currentPercentage < targetPercentage) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`✅ Rollout complete: ${targetPercentage}% tenant reads`);
  }

  /**
   * Switches to full tenant reads
   */
  enableFullTenantReads(): void {
    this.config.strategy = 'tenant';
    console.log('✅ Full tenant reads ENABLED');
  }

  /**
   * Rolls back to unified reads
   */
  rollbackToUnified(): void {
    this.config.strategy = 'unified';
    console.log('⏪ Rolled back to unified reads');
  }

  /**
   * Enables canary deployment for specific shops
   */
  enableCanary(shopIds: number[]): void {
    this.config.strategy = 'canary';
    this.config.canaryShopIds = shopIds;
    console.log(`🐤 Canary deployment enabled for ${shopIds.length} shops`);
  }

  /**
   * Gets current read metrics
   */
  getMetrics(): ReadMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets consistency check log
   */
  getConsistencyLog(limit = 100): ConsistencyCheckResult[] {
    return this.consistencyLog.slice(-limit);
  }

  /**
   * Resets metrics and consistency log
   */
  resetMetrics(): void {
    this.metrics = {
      totalReads: 0,
      unifiedReads: 0,
      tenantReads: 0,
      fallbackReads: 0,
      inconsistentReads: 0,
      averageLatencyMs: {
        unified: 0,
        tenant: 0
      }
    };
    this.consistencyLog = [];
    console.log('📊 Read path metrics reset');
  }

  // =============================================================================
  // PASS-THROUGH METHODS (No read path switching needed)
  // =============================================================================

  async getUserById(userId: number): Promise<any | null> {
    return this.unifiedStorage.getUserById(userId);
  }

  async getUserByUsername(username: string): Promise<any | null> {
    return this.unifiedStorage.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<any | null> {
    return this.unifiedStorage.getUserByEmail(email);
  }

  async createUser(data: any): Promise<any> {
    return this.unifiedStorage.createUser(data);
  }

  async updateUser(userId: number, data: any): Promise<any | null> {
    return this.unifiedStorage.updateUser(userId, data);
  }

  async getShopById(shopId: number): Promise<any | null> {
    return this.unifiedStorage.getShopById(shopId);
  }

  async getAllShops(): Promise<any[]> {
    return this.unifiedStorage.getAllShops();
  }

  async createShop(data: any): Promise<any> {
    return this.unifiedStorage.createShop(data);
  }

  async updateShop(shopId: number, data: any): Promise<any | null> {
    return this.unifiedStorage.updateShop(shopId, data);
  }
}

/**
 * Factory function to create read path switcher
 */
export function createReadPathSwitcher(
  unifiedStorage: IStorage,
  tenantRouter: TenantRouter,
  config?: Partial<ReadPathConfig>
): ReadPathSwitcher {
  return new ReadPathSwitcher(unifiedStorage, tenantRouter, config);
}