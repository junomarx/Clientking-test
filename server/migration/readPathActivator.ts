import type { TenantRouter } from '../tenancy/tenantRouter.js';
import type { ReadPathSwitcher } from './readPathSwitcher.js';

// =============================================================================
// READ PATH ACTIVATOR - Gradual rollout of tenant DB reads
// =============================================================================
// Manages the switch from unified DB reads to tenant DB reads
// Supports cohort-based gradual rollout with rollback capability
// Integrates with ReadPathSwitcher for actual query routing
// =============================================================================

export interface ReadPathActivationConfig {
  activationMode: 'manual' | 'automatic' | 'gradual';
  cohortSize: number; // Number of shops to activate at once
  validationThreshold: number; // Percentage of successful reads required (0-100)
  rollbackOnFailure: boolean;
  monitoringWindowMs: number; // Time window to monitor before next activation
}

export interface ShopCohort {
  cohortId: number;
  shopIds: number[];
  activatedAt?: Date;
  status: 'pending' | 'activating' | 'active' | 'failed' | 'rolled_back';
  successRate?: number;
  errorCount?: number;
  readCount?: number;
}

export interface ReadPathMetrics {
  shopId: number;
  readCount: number;
  errorCount: number;
  avgLatencyMs: number;
  lastReadAt: Date;
  source: 'unified' | 'tenant';
}

export class ReadPathActivator {
  private tenantRouter: TenantRouter;
  private readPathSwitcher: ReadPathSwitcher;
  private config: ReadPathActivationConfig;
  private cohorts: Map<number, ShopCohort> = new Map();
  private metrics: Map<number, ReadPathMetrics> = new Map();
  private activationInProgress = false;

  constructor(
    tenantRouter: TenantRouter,
    readPathSwitcher: ReadPathSwitcher,
    config: Partial<ReadPathActivationConfig> = {}
  ) {
    this.tenantRouter = tenantRouter;
    this.readPathSwitcher = readPathSwitcher;
    this.config = {
      activationMode: config.activationMode || 'gradual',
      cohortSize: config.cohortSize || 5,
      validationThreshold: config.validationThreshold || 95,
      rollbackOnFailure: config.rollbackOnFailure ?? true,
      monitoringWindowMs: config.monitoringWindowMs || 60000, // 1 minute
    };

    console.log('📊 Read Path Activator initialized with config:', this.config);
  }

  // =============================================================================
  // COHORT MANAGEMENT
  // =============================================================================

  /**
   * Creates cohorts from a list of shop IDs
   */
  createCohorts(shopIds: number[]): ShopCohort[] {
    const cohorts: ShopCohort[] = [];
    const cohortSize = this.config.cohortSize;

    for (let i = 0; i < shopIds.length; i += cohortSize) {
      const cohortShopIds = shopIds.slice(i, i + cohortSize);
      const cohort: ShopCohort = {
        cohortId: Math.floor(i / cohortSize) + 1,
        shopIds: cohortShopIds,
        status: 'pending'
      };
      cohorts.push(cohort);
      this.cohorts.set(cohort.cohortId, cohort);
    }

    console.log(`📊 Created ${cohorts.length} cohorts from ${shopIds.length} shops`);
    return cohorts;
  }

  /**
   * Gets all cohorts
   */
  getCohorts(): ShopCohort[] {
    return Array.from(this.cohorts.values());
  }

  /**
   * Gets cohort by ID
   */
  getCohort(cohortId: number): ShopCohort | undefined {
    return this.cohorts.get(cohortId);
  }

  // =============================================================================
  // ACTIVATION WORKFLOW
  // =============================================================================

  /**
   * Activates read path for a specific cohort
   */
  async activateCohort(cohortId: number): Promise<{
    success: boolean;
    cohort: ShopCohort;
    message: string;
  }> {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    if (cohort.status === 'active') {
      return {
        success: true,
        cohort,
        message: `Cohort ${cohortId} is already active`
      };
    }

    console.log(`🔄 Activating cohort ${cohortId} with ${cohort.shopIds.length} shops...`);
    cohort.status = 'activating';

    try {
      // Switch read path for all shops in cohort
      for (const shopId of cohort.shopIds) {
        await this.readPathSwitcher.switchReadPath(shopId, 'tenant');
        console.log(`  ✅ Shop ${shopId} switched to tenant DB reads`);
      }

      // Update cohort status
      cohort.status = 'active';
      cohort.activatedAt = new Date();

      console.log(`✅ Cohort ${cohortId} activated successfully`);

      return {
        success: true,
        cohort,
        message: `Cohort ${cohortId} activated with ${cohort.shopIds.length} shops`
      };
    } catch (error) {
      console.error(`❌ Failed to activate cohort ${cohortId}:`, error);
      cohort.status = 'failed';

      if (this.config.rollbackOnFailure) {
        await this.rollbackCohort(cohortId);
      }

      return {
        success: false,
        cohort,
        message: `Failed to activate cohort ${cohortId}: ${error}`
      };
    }
  }

  /**
   * Activates read path for all cohorts gradually
   */
  async activateAllCohortsGradually(): Promise<void> {
    if (this.activationInProgress) {
      throw new Error('Activation already in progress');
    }

    this.activationInProgress = true;
    console.log('🚀 Starting gradual cohort activation...');

    try {
      const cohorts = this.getCohorts().filter(c => c.status === 'pending');

      for (const cohort of cohorts) {
        console.log(`\n📊 Processing cohort ${cohort.cohortId}/${cohorts.length}...`);

        // Activate cohort
        const result = await this.activateCohort(cohort.cohortId);

        if (!result.success) {
          console.error(`❌ Cohort ${cohort.cohortId} activation failed, stopping rollout`);
          break;
        }

        // Monitor performance
        console.log(`⏱️ Monitoring cohort ${cohort.cohortId} for ${this.config.monitoringWindowMs}ms...`);
        await this.sleep(this.config.monitoringWindowMs);

        // Validate performance
        const metrics = this.getCohortMetrics(cohort.cohortId);
        const successRate = this.calculateSuccessRate(metrics);

        console.log(`📊 Cohort ${cohort.cohortId} success rate: ${successRate.toFixed(2)}%`);

        if (successRate < this.config.validationThreshold) {
          console.error(`❌ Cohort ${cohort.cohortId} below threshold (${successRate.toFixed(2)}% < ${this.config.validationThreshold}%)`);
          
          if (this.config.rollbackOnFailure) {
            await this.rollbackCohort(cohort.cohortId);
          }
          break;
        }

        console.log(`✅ Cohort ${cohort.cohortId} validated, proceeding to next cohort`);
      }

      console.log('\n🎉 Gradual activation complete!');
    } finally {
      this.activationInProgress = false;
    }
  }

  /**
   * Activates read path for specific shops immediately
   */
  async activateShops(shopIds: number[]): Promise<void> {
    console.log(`🔄 Activating read path for ${shopIds.length} shops...`);

    for (const shopId of shopIds) {
      await this.readPathSwitcher.switchReadPath(shopId, 'tenant');
      console.log(`  ✅ Shop ${shopId} activated`);
    }

    console.log(`✅ All ${shopIds.length} shops activated`);
  }

  /**
   * Rolls back a cohort to unified DB reads
   */
  async rollbackCohort(cohortId: number): Promise<void> {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    console.log(`⏪ Rolling back cohort ${cohortId}...`);

    for (const shopId of cohort.shopIds) {
      await this.readPathSwitcher.switchReadPath(shopId, 'unified');
      console.log(`  ⏪ Shop ${shopId} rolled back to unified DB`);
    }

    cohort.status = 'rolled_back';
    console.log(`✅ Cohort ${cohortId} rolled back`);
  }

  /**
   * Rolls back all active cohorts
   */
  async rollbackAll(): Promise<void> {
    console.log('⏪ Rolling back all active cohorts...');

    const activeCohorts = this.getCohorts().filter(c => c.status === 'active');

    for (const cohort of activeCohorts) {
      await this.rollbackCohort(cohort.cohortId);
    }

    console.log(`✅ Rolled back ${activeCohorts.length} cohorts`);
  }

  // =============================================================================
  // METRICS & MONITORING
  // =============================================================================

  /**
   * Records read metrics for a shop
   */
  recordReadMetric(
    shopId: number,
    success: boolean,
    latencyMs: number,
    source: 'unified' | 'tenant'
  ): void {
    let metric = this.metrics.get(shopId);

    if (!metric) {
      metric = {
        shopId,
        readCount: 0,
        errorCount: 0,
        avgLatencyMs: 0,
        lastReadAt: new Date(),
        source
      };
      this.metrics.set(shopId, metric);
    }

    metric.readCount++;
    if (!success) {
      metric.errorCount++;
    }
    metric.avgLatencyMs = (metric.avgLatencyMs * (metric.readCount - 1) + latencyMs) / metric.readCount;
    metric.lastReadAt = new Date();
    metric.source = source;
  }

  /**
   * Gets metrics for a specific shop
   */
  getShopMetrics(shopId: number): ReadPathMetrics | undefined {
    return this.metrics.get(shopId);
  }

  /**
   * Gets metrics for all shops in a cohort
   */
  getCohortMetrics(cohortId: number): ReadPathMetrics[] {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) {
      return [];
    }

    return cohort.shopIds
      .map(shopId => this.metrics.get(shopId))
      .filter(m => m !== undefined) as ReadPathMetrics[];
  }

  /**
   * Calculates success rate from metrics
   */
  private calculateSuccessRate(metrics: ReadPathMetrics[]): number {
    if (metrics.length === 0) {
      return 100; // No data means no errors
    }

    const totalReads = metrics.reduce((sum, m) => sum + m.readCount, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);

    if (totalReads === 0) {
      return 100;
    }

    return ((totalReads - totalErrors) / totalReads) * 100;
  }

  /**
   * Gets overall activation status
   */
  getActivationStatus(): {
    totalCohorts: number;
    activeCohorts: number;
    pendingCohorts: number;
    failedCohorts: number;
    totalShops: number;
    activeShops: number;
    overallSuccessRate: number;
  } {
    const cohorts = this.getCohorts();
    const activeCohorts = cohorts.filter(c => c.status === 'active');
    const pendingCohorts = cohorts.filter(c => c.status === 'pending');
    const failedCohorts = cohorts.filter(c => c.status === 'failed');

    const totalShops = cohorts.reduce((sum, c) => sum + c.shopIds.length, 0);
    const activeShops = activeCohorts.reduce((sum, c) => sum + c.shopIds.length, 0);

    const allMetrics = Array.from(this.metrics.values());
    const overallSuccessRate = this.calculateSuccessRate(allMetrics);

    return {
      totalCohorts: cohorts.length,
      activeCohorts: activeCohorts.length,
      pendingCohorts: pendingCohorts.length,
      failedCohorts: failedCohorts.length,
      totalShops,
      activeShops,
      overallSuccessRate
    };
  }

  /**
   * Generates activation report
   */
  generateReport(): string {
    const status = this.getActivationStatus();
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('READ PATH ACTIVATION STATUS');
    lines.push('='.repeat(80));
    lines.push(`Mode: ${this.config.activationMode.toUpperCase()}`);
    lines.push(`Cohort Size: ${this.config.cohortSize} shops`);
    lines.push(`Validation Threshold: ${this.config.validationThreshold}%`);
    lines.push('');

    lines.push('COHORT STATUS:');
    lines.push(`  Total Cohorts: ${status.totalCohorts}`);
    lines.push(`  Active: ${status.activeCohorts}`);
    lines.push(`  Pending: ${status.pendingCohorts}`);
    lines.push(`  Failed: ${status.failedCohorts}`);
    lines.push('');

    lines.push('SHOP STATUS:');
    lines.push(`  Total Shops: ${status.totalShops}`);
    lines.push(`  Active on Tenant DB: ${status.activeShops}`);
    lines.push(`  Still on Unified DB: ${status.totalShops - status.activeShops}`);
    lines.push('');

    lines.push('PERFORMANCE:');
    lines.push(`  Overall Success Rate: ${status.overallSuccessRate.toFixed(2)}%`);
    lines.push('');

    lines.push('COHORT DETAILS:');
    for (const cohort of this.getCohorts()) {
      const metrics = this.getCohortMetrics(cohort.cohortId);
      const successRate = this.calculateSuccessRate(metrics);
      
      lines.push(`  Cohort ${cohort.cohortId}:`);
      lines.push(`    Status: ${cohort.status.toUpperCase()}`);
      lines.push(`    Shops: ${cohort.shopIds.length}`);
      if (cohort.activatedAt) {
        lines.push(`    Activated: ${cohort.activatedAt.toISOString()}`);
      }
      if (metrics.length > 0) {
        lines.push(`    Success Rate: ${successRate.toFixed(2)}%`);
      }
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Helper to sleep for a duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resets all activation state
   */
  reset(): void {
    this.cohorts.clear();
    this.metrics.clear();
    this.activationInProgress = false;
    console.log('🔄 Read Path Activator reset');
  }
}

/**
 * Factory function to create read path activator
 */
export function createReadPathActivator(
  tenantRouter: TenantRouter,
  readPathSwitcher: ReadPathSwitcher,
  config?: Partial<ReadPathActivationConfig>
): ReadPathActivator {
  return new ReadPathActivator(tenantRouter, readPathSwitcher, config);
}
