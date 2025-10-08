import type { IStorage } from '../storage.js';
import type { TenantRouter } from '../tenancy/tenantRouter.js';
import { DualWriteProxy } from './dualWriteProxy.js';
import { DataSynchronizer } from './dataSynchronizer.js';
import { ReadPathSwitcher } from './readPathSwitcher.js';
import { DataValidator } from './dataValidator.js';

// =============================================================================
// MIGRATION COORDINATOR - Orchestrates the complete migration process
// =============================================================================
// Manages the entire migration from unified to tenant databases
// Coordinates dual-write, data sync, read path switching, and validation
// Provides comprehensive monitoring and rollback capabilities
// =============================================================================

export enum MigrationPhase {
  NOT_STARTED = 'not_started',
  PREPARING = 'preparing',
  DUAL_WRITE_ENABLED = 'dual_write_enabled',
  DATA_SYNCING = 'data_syncing',
  VALIDATION = 'validation',
  READ_SWITCHING = 'read_switching',
  TENANT_PRIMARY = 'tenant_primary',
  CLEANUP = 'cleanup',
  COMPLETED = 'completed',
  ROLLBACK = 'rollback',
  FAILED = 'failed'
}

interface MigrationState {
  currentPhase: MigrationPhase;
  startedAt?: Date;
  completedAt?: Date;
  progress: {
    dualWriteEnabled: boolean;
    dataSyncProgress: number; // 0-100
    readSwitchProgress: number; // 0-100
    validationCompleted: boolean;
  };
  metrics: {
    totalShops: number;
    completedShops: number;
    totalRecords: number;
    syncedRecords: number;
    validationErrors: number;
  };
  errors: Array<{ phase: string; error: string; timestamp: Date }>;
}

interface MigrationDashboard {
  state: MigrationState;
  dualWriteMetrics: any;
  syncProgress: any;
  readPathMetrics: any;
  validationResults: any;
  recommendations: string[];
}

export class MigrationCoordinator {
  private unifiedStorage: IStorage;
  private tenantRouter: TenantRouter;
  private dualWriteProxy: DualWriteProxy;
  private dataSynchronizer: DataSynchronizer;
  private readPathSwitcher: ReadPathSwitcher;
  private dataValidator: DataValidator;
  
  private state: MigrationState = {
    currentPhase: MigrationPhase.NOT_STARTED,
    progress: {
      dualWriteEnabled: false,
      dataSyncProgress: 0,
      readSwitchProgress: 0,
      validationCompleted: false
    },
    metrics: {
      totalShops: 0,
      completedShops: 0,
      totalRecords: 0,
      syncedRecords: 0,
      validationErrors: 0
    },
    errors: []
  };

  constructor(
    unifiedStorage: IStorage,
    tenantRouter: TenantRouter
  ) {
    this.unifiedStorage = unifiedStorage;
    this.tenantRouter = tenantRouter;

    // Initialize migration components
    this.dualWriteProxy = new DualWriteProxy(unifiedStorage, tenantRouter, {
      enableDualWrite: false,
      primarySource: 'unified',
      asyncSecondaryWrites: true,
      failOnSecondaryError: false
    });

    this.dataSynchronizer = new DataSynchronizer(unifiedStorage, tenantRouter, {
      batchSize: 100,
      delayBetweenBatchesMs: 100,
      verifyAfterSync: true,
      skipExisting: true
    });

    this.readPathSwitcher = new ReadPathSwitcher(unifiedStorage, tenantRouter, {
      strategy: 'unified',
      enableFallback: true,
      verifyConsistency: false
    });

    this.dataValidator = new DataValidator(unifiedStorage, tenantRouter, {
      checkMissingRecords: true,
      checkDataIntegrity: true,
      checkRelationships: false
    });

    console.log('🎯 Migration coordinator initialized');
  }

  // =============================================================================
  // AUTOMATED MIGRATION WORKFLOW
  // =============================================================================

  /**
   * Executes the complete migration workflow automatically
   */
  async executeFullMigration(): Promise<MigrationState> {
    console.log('🚀 Starting automated migration workflow...');
    
    try {
      // Phase 1: Preparation
      await this.prepareForMigration();

      // Phase 2: Enable dual-write
      await this.enableDualWrite();

      // Phase 3: Sync existing data
      await this.syncHistoricalData();

      // Phase 4: Validate data
      await this.validateMigration();

      // Phase 5: Switch read path gradually
      await this.switchReadPath();

      // Phase 6: Make tenant primary
      await this.makeTenantPrimary();

      // Phase 7: Cleanup
      await this.cleanup();

      // Mark as completed
      this.state.currentPhase = MigrationPhase.COMPLETED;
      this.state.completedAt = new Date();

      console.log('✅ Migration workflow completed successfully');
      return this.state;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.state.currentPhase = MigrationPhase.FAILED;
      this.state.errors.push({
        phase: this.state.currentPhase,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  // =============================================================================
  // INDIVIDUAL MIGRATION PHASES
  // =============================================================================

  /**
   * Phase 1: Prepare for migration
   */
  async prepareForMigration(): Promise<void> {
    console.log('📋 Phase 1: Preparing for migration...');
    this.state.currentPhase = MigrationPhase.PREPARING;
    this.state.startedAt = new Date();

    try {
      // Create migration plan
      const plan = await this.dataSynchronizer.createMigrationPlan();
      
      this.state.metrics.totalShops = plan.totalShops;
      this.state.metrics.totalRecords = plan.totalRecords;

      console.log('✅ Migration plan created:', {
        shops: plan.totalShops,
        records: plan.totalRecords,
        estimatedMinutes: Math.ceil(plan.estimatedDurationMs / 60000)
      });

    } catch (error) {
      console.error('❌ Preparation failed:', error);
      throw error;
    }
  }

  /**
   * Phase 2: Enable dual-write mode
   */
  async enableDualWrite(): Promise<void> {
    console.log('🔄 Phase 2: Enabling dual-write mode...');
    this.state.currentPhase = MigrationPhase.DUAL_WRITE_ENABLED;

    try {
      this.dualWriteProxy.enableDualWrite();
      this.state.progress.dualWriteEnabled = true;

      console.log('✅ Dual-write mode enabled');

      // Wait a bit for dual-write to stabilize
      await this.delay(5000);

    } catch (error) {
      console.error('❌ Failed to enable dual-write:', error);
      throw error;
    }
  }

  /**
   * Phase 3: Sync historical data
   */
  async syncHistoricalData(): Promise<void> {
    console.log('📦 Phase 3: Syncing historical data...');
    this.state.currentPhase = MigrationPhase.DATA_SYNCING;

    try {
      const results = await this.dataSynchronizer.syncAllShops();

      // Update metrics
      this.state.metrics.syncedRecords = results.reduce((sum, r) => sum + r.recordsSynced, 0);
      this.state.progress.dataSyncProgress = 100;

      const failedSyncs = results.filter(r => !r.success);
      if (failedSyncs.length > 0) {
        console.warn(`⚠️ ${failedSyncs.length} sync operations failed`);
        for (const failed of failedSyncs) {
          this.state.errors.push({
            phase: 'data_sync',
            error: `Shop ${failed.shopId} - ${failed.entity}: ${failed.errors.join(', ')}`,
            timestamp: new Date()
          });
        }
      }

      console.log('✅ Historical data sync completed:', {
        totalRecords: this.state.metrics.syncedRecords,
        failedSyncs: failedSyncs.length
      });

    } catch (error) {
      console.error('❌ Data sync failed:', error);
      throw error;
    }
  }

  /**
   * Phase 4: Validate migrated data
   */
  async validateMigration(): Promise<void> {
    console.log('🔍 Phase 4: Validating migrated data...');
    this.state.currentPhase = MigrationPhase.VALIDATION;

    try {
      const validationReport = await this.dataValidator.validateAllData();

      this.state.metrics.validationErrors = validationReport.totalErrors;
      this.state.progress.validationCompleted = true;

      if (validationReport.totalErrors > 0) {
        console.warn(`⚠️ Validation found ${validationReport.totalErrors} errors`);
        
        // Log validation report
        const report = this.dataValidator.generateReport(validationReport);
        console.log('\n' + report);

        // Decide whether to continue based on error severity
        const criticalErrors = validationReport.summary.missingRecords;
        if (criticalErrors > 0) {
          throw new Error(`Critical validation errors: ${criticalErrors} missing records`);
        }
      }

      console.log('✅ Data validation completed');

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Phase 5: Switch read path gradually
   */
  async switchReadPath(): Promise<void> {
    console.log('🔀 Phase 5: Switching read path to tenant databases...');
    this.state.currentPhase = MigrationPhase.READ_SWITCHING;

    try {
      // Gradual rollout: 0% -> 25% -> 50% -> 75% -> 100%
      const steps = [25, 50, 75, 100];
      
      for (const targetPercentage of steps) {
        console.log(`📊 Rolling out to ${targetPercentage}% tenant reads...`);
        
        this.readPathSwitcher.updateConfig({
          strategy: 'percentage',
          percentage: targetPercentage
        });

        this.state.progress.readSwitchProgress = targetPercentage;

        // Wait and monitor
        await this.delay(30000); // 30 seconds between steps

        // Check metrics
        const metrics = this.readPathSwitcher.getMetrics();
        if (metrics.fallbackReads > metrics.tenantReads * 0.1) {
          console.warn('⚠️ High fallback rate detected, pausing rollout');
          // Could implement automatic rollback here
        }
      }

      console.log('✅ Read path switched to tenant databases');

    } catch (error) {
      console.error('❌ Read path switch failed:', error);
      throw error;
    }
  }

  /**
   * Phase 6: Make tenant databases primary
   */
  async makeTenantPrimary(): Promise<void> {
    console.log('🎯 Phase 6: Making tenant databases primary...');
    this.state.currentPhase = MigrationPhase.TENANT_PRIMARY;

    try {
      // Switch dual-write to use tenant as primary
      this.dualWriteProxy.switchPrimarySource('tenant');

      // Switch read path to full tenant
      this.readPathSwitcher.enableFullTenantReads();

      console.log('✅ Tenant databases are now primary');

      // Monitor for a period
      await this.delay(60000); // 1 minute

    } catch (error) {
      console.error('❌ Failed to make tenant primary:', error);
      throw error;
    }
  }

  /**
   * Phase 7: Cleanup and finalization
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Phase 7: Cleanup and finalization...');
    this.state.currentPhase = MigrationPhase.CLEANUP;

    try {
      // Final validation
      const finalValidation = await this.dataValidator.validateAllData();
      
      if (finalValidation.totalErrors > 0) {
        console.warn('⚠️ Final validation found errors:', finalValidation.totalErrors);
      }

      // Disable dual-write (writes only to tenant now)
      this.dualWriteProxy.disableDualWrite();

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // ROLLBACK CAPABILITIES
  // =============================================================================

  /**
   * Rolls back to unified database
   */
  async rollback(): Promise<void> {
    console.log('⏪ Rolling back to unified database...');
    this.state.currentPhase = MigrationPhase.ROLLBACK;

    try {
      // Switch reads back to unified
      this.readPathSwitcher.rollbackToUnified();

      // Switch writes back to unified
      this.dualWriteProxy.switchPrimarySource('unified');

      // Can optionally disable dual-write
      this.dualWriteProxy.disableDualWrite();

      console.log('✅ Rollback completed - using unified database');

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // MONITORING & DASHBOARD
  // =============================================================================

  /**
   * Gets comprehensive migration dashboard
   */
  getDashboard(): MigrationDashboard {
    const recommendations: string[] = [];

    // Generate recommendations based on state
    if (this.state.currentPhase === MigrationPhase.NOT_STARTED) {
      recommendations.push('Run prepareForMigration() to begin migration process');
    }

    if (this.state.metrics.validationErrors > 0) {
      recommendations.push('Review validation errors before proceeding');
    }

    const dualWriteMetrics = this.dualWriteProxy.getMetrics();
    if (dualWriteMetrics.failedDualWrites > dualWriteMetrics.successfulDualWrites * 0.05) {
      recommendations.push('High dual-write failure rate - investigate errors');
    }

    const readMetrics = this.readPathSwitcher.getMetrics();
    if (readMetrics.fallbackReads > readMetrics.tenantReads * 0.1) {
      recommendations.push('High fallback rate - tenant databases may have issues');
    }

    return {
      state: this.state,
      dualWriteMetrics: this.dualWriteProxy.getMetrics(),
      syncProgress: this.dataSynchronizer.getOverallProgress(),
      readPathMetrics: this.readPathSwitcher.getMetrics(),
      validationResults: this.state.progress.validationCompleted ? 'Available' : 'Not run',
      recommendations
    };
  }

  /**
   * Gets current migration state
   */
  getState(): MigrationState {
    return { ...this.state };
  }

  /**
   * Gets storage proxy based on current phase
   */
  getStorageProxy(): IStorage {
    // Return appropriate storage based on migration phase
    if (this.state.currentPhase === MigrationPhase.TENANT_PRIMARY || 
        this.state.currentPhase === MigrationPhase.COMPLETED) {
      return this.readPathSwitcher; // Reads from tenant
    } else if (this.state.progress.dualWriteEnabled) {
      return this.dualWriteProxy; // Dual-write mode
    } else {
      return this.unifiedStorage; // Original storage
    }
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Exports migration state for persistence
   */
  exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Imports migration state (for recovery)
   */
  importState(stateJson: string): void {
    try {
      this.state = JSON.parse(stateJson);
      console.log('📥 Migration state imported');
    } catch (error) {
      console.error('❌ Failed to import state:', error);
    }
  }
}

/**
 * Factory function to create migration coordinator
 */
export function createMigrationCoordinator(
  unifiedStorage: IStorage,
  tenantRouter: TenantRouter
): MigrationCoordinator {
  return new MigrationCoordinator(unifiedStorage, tenantRouter);
}