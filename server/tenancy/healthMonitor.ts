import type { TenantRouter } from './tenantRouter.js';
import type { ConnectionRegistry } from './connectionRegistry.js';

// =============================================================================
// TENANT HEALTH MONITOR - System-wide tenant database monitoring
// =============================================================================
// Monitors health and performance of all tenant databases
// Provides alerts, metrics, and automated recovery for database issues
// Integrates with tenancy router and connection registry
// =============================================================================

interface TenantHealthStatus {
  shopId: number;
  shopName?: string;
  isHealthy: boolean;
  lastCheckAt: Date;
  responseTimeMs: number;
  issues: string[];
  metrics: {
    connectionCount: number;
    queryLatency: number;
    errorRate: number;
    uptime: number;
  };
}

interface SystemHealthReport {
  masterDatabase: {
    isHealthy: boolean;
    responseTimeMs: number;
    issues: string[];
  };
  tenantDatabases: TenantHealthStatus[];
  summary: {
    totalTenants: number;
    healthyTenants: number;
    unhealthyTenants: number;
    averageResponseTime: number;
    systemUptime: number;
  };
  generatedAt: Date;
}

interface HealthMonitorConfig {
  checkIntervalMs: number; // How often to run health checks
  timeoutMs: number; // Timeout for individual health checks
  retryAttempts: number; // Retry attempts for failed checks
  alertThresholds: {
    responseTimeMs: number; // Alert if response time exceeds this
    errorRate: number; // Alert if error rate exceeds this percentage
    downTimeMinutes: number; // Alert if database is down for this long
  };
  enableAlerting: boolean;
  enableAutoRecovery: boolean;
}

export class TenantHealthMonitor {
  private tenantRouter: TenantRouter;
  private connectionRegistry: ConnectionRegistry;
  private config: HealthMonitorConfig;
  private healthCache: Map<number, TenantHealthStatus> = new Map();
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private systemStartTime = Date.now();

  constructor(
    tenantRouter: TenantRouter,
    connectionRegistry: ConnectionRegistry,
    config: Partial<HealthMonitorConfig> = {}
  ) {
    this.tenantRouter = tenantRouter;
    this.connectionRegistry = connectionRegistry;
    this.config = {
      checkIntervalMs: config.checkIntervalMs || 60000, // 1 minute default
      timeoutMs: config.timeoutMs || 10000, // 10 seconds default
      retryAttempts: config.retryAttempts || 3,
      alertThresholds: {
        responseTimeMs: config.alertThresholds?.responseTimeMs || 5000, // 5 seconds
        errorRate: config.alertThresholds?.errorRate || 10, // 10%
        downTimeMinutes: config.alertThresholds?.downTimeMinutes || 5
      },
      enableAlerting: config.enableAlerting ?? true,
      enableAutoRecovery: config.enableAutoRecovery ?? false
    };
  }

  /**
   * Starts continuous health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('Health monitoring is already running');
      return;
    }

    console.log(`🏥 Starting tenant health monitoring (interval: ${this.config.checkIntervalMs}ms)`);
    this.isMonitoring = true;

    // Run initial health check
    this.runHealthCheck().catch(error => {
      console.error('Initial health check failed:', error);
    });

    // Schedule periodic health checks
    this.monitoringTimer = setInterval(() => {
      this.runHealthCheck().catch(error => {
        console.error('Scheduled health check failed:', error);
      });
    }, this.config.checkIntervalMs);
  }

  /**
   * Stops health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('Health monitoring is not running');
      return;
    }

    console.log('🛑 Stopping tenant health monitoring');
    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }

  /**
   * Runs a comprehensive health check on all tenants
   */
  async runHealthCheck(): Promise<SystemHealthReport> {
    console.log('🔍 Running system health check...');
    const startTime = Date.now();

    try {
      // Check master database health
      const masterHealth = await this.checkMasterHealth();

      // Get all tenant shop IDs
      const shopIds = await this.connectionRegistry.getAllShopIds();

      // Check each tenant database health
      const tenantHealthPromises = shopIds.map(shopId => 
        this.checkTenantHealth(shopId)
      );

      const tenantHealthResults = await Promise.allSettled(tenantHealthPromises);

      // Process tenant health results
      const tenantDatabases: TenantHealthStatus[] = [];
      let healthyCount = 0;
      let totalResponseTime = 0;

      tenantHealthResults.forEach((result, index) => {
        const shopId = shopIds[index];
        
        if (result.status === 'fulfilled' && result.value) {
          const health = result.value;
          tenantDatabases.push(health);
          this.healthCache.set(shopId, health);
          
          if (health.isHealthy) {
            healthyCount++;
          }
          totalResponseTime += health.responseTimeMs;
        } else {
          // Create error status for failed checks
          const errorHealth: TenantHealthStatus = {
            shopId,
            isHealthy: false,
            lastCheckAt: new Date(),
            responseTimeMs: 0,
            issues: ['Health check failed completely'],
            metrics: {
              connectionCount: 0,
              queryLatency: 0,
              errorRate: 100,
              uptime: 0
            }
          };
          tenantDatabases.push(errorHealth);
          this.healthCache.set(shopId, errorHealth);
        }
      });

      // Generate system health report
      const report: SystemHealthReport = {
        masterDatabase: masterHealth,
        tenantDatabases,
        summary: {
          totalTenants: shopIds.length,
          healthyTenants: healthyCount,
          unhealthyTenants: shopIds.length - healthyCount,
          averageResponseTime: shopIds.length > 0 ? totalResponseTime / shopIds.length : 0,
          systemUptime: Date.now() - this.systemStartTime
        },
        generatedAt: new Date()
      };

      // Process alerts and recovery
      await this.processHealthReport(report);

      const checkDuration = Date.now() - startTime;
      console.log(`✅ Health check completed in ${checkDuration}ms - ${healthyCount}/${shopIds.length} tenants healthy`);

      return report;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  /**
   * Checks master database health
   */
  private async checkMasterHealth(): Promise<SystemHealthReport['masterDatabase']> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Use tenant router to get master health
      const healthResult = await this.tenantRouter.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: healthResult.master,
        responseTimeMs: responseTime,
        issues: healthResult.master ? [] : ['Master database connection failed']
      };

    } catch (error) {
      return {
        isHealthy: false,
        responseTimeMs: Date.now() - startTime,
        issues: [`Master health check error: ${error}`]
      };
    }
  }

  /**
   * Checks individual tenant database health
   */
  private async checkTenantHealth(shopId: number): Promise<TenantHealthStatus | null> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Get tenant connection
      const connection = await this.connectionRegistry.getConnection(shopId);
      if (!connection) {
        return {
          shopId,
          isHealthy: false,
          lastCheckAt: new Date(),
          responseTimeMs: 0,
          issues: ['Connection not found in registry'],
          metrics: {
            connectionCount: 0,
            queryLatency: 0,
            errorRate: 100,
            uptime: 0
          }
        };
      }

      if (!connection.isActive) {
        issues.push('Connection marked as inactive');
      }

      // Try to get database connection through router
      const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
      
      // Run basic health queries
      const healthQueries = [
        'SELECT 1 as health_check',
        'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'',
        'SELECT pg_database_size(current_database()) as db_size'
      ];

      const queryResults = [];
      let totalQueryTime = 0;

      for (const query of healthQueries) {
        const queryStart = Date.now();
        try {
          const result = await tenantDb.pool.query(query);
          const queryTime = Date.now() - queryStart;
          totalQueryTime += queryTime;
          queryResults.push({ query, success: true, time: queryTime, result });
        } catch (error) {
          const queryTime = Date.now() - queryStart;
          totalQueryTime += queryTime;
          queryResults.push({ query, success: false, time: queryTime, error });
          issues.push(`Query failed: ${query} - ${error}`);
        }
      }

      const responseTime = Date.now() - startTime;
      const avgQueryLatency = queryResults.length > 0 ? totalQueryTime / queryResults.length : 0;
      const errorRate = queryResults.length > 0 ? 
        (queryResults.filter(r => !r.success).length / queryResults.length) * 100 : 0;

      // Check thresholds
      if (responseTime > this.config.alertThresholds.responseTimeMs) {
        issues.push(`High response time: ${responseTime}ms`);
      }

      if (errorRate > this.config.alertThresholds.errorRate) {
        issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      }

      // Mark connection as used
      await this.connectionRegistry.markConnectionUsed(shopId);

      return {
        shopId,
        isHealthy: issues.length === 0,
        lastCheckAt: new Date(),
        responseTimeMs: responseTime,
        issues,
        metrics: {
          connectionCount: 1, // Simplified - would be actual connection pool size
          queryLatency: avgQueryLatency,
          errorRate,
          uptime: Date.now() - this.systemStartTime // Simplified uptime calculation
        }
      };

    } catch (error) {
      return {
        shopId,
        isHealthy: false,
        lastCheckAt: new Date(),
        responseTimeMs: Date.now() - startTime,
        issues: [`Health check error: ${error}`],
        metrics: {
          connectionCount: 0,
          queryLatency: 0,
          errorRate: 100,
          uptime: 0
        }
      };
    }
  }

  /**
   * Processes health report for alerts and recovery actions
   */
  private async processHealthReport(report: SystemHealthReport): Promise<void> {
    // Master database alerts
    if (!report.masterDatabase.isHealthy && this.config.enableAlerting) {
      console.error('🚨 CRITICAL: Master database is unhealthy!');
      await this.sendAlert('CRITICAL', 'Master database health check failed', {
        issues: report.masterDatabase.issues,
        responseTime: report.masterDatabase.responseTimeMs
      });
    }

    // Tenant database alerts
    const unhealthyTenants = report.tenantDatabases.filter(t => !t.isHealthy);
    
    if (unhealthyTenants.length > 0 && this.config.enableAlerting) {
      console.warn(`⚠️ ${unhealthyTenants.length} tenant(s) are unhealthy`);
      
      for (const tenant of unhealthyTenants) {
        if (tenant.issues.length > 0) {
          await this.sendAlert('WARNING', `Tenant ${tenant.shopId} is unhealthy`, {
            shopId: tenant.shopId,
            issues: tenant.issues,
            responseTime: tenant.responseTimeMs
          });
        }
      }
    }

    // Auto-recovery attempts
    if (this.config.enableAutoRecovery) {
      await this.attemptAutoRecovery(unhealthyTenants);
    }
  }

  /**
   * Attempts automatic recovery for unhealthy tenants
   */
  private async attemptAutoRecovery(unhealthyTenants: TenantHealthStatus[]): Promise<void> {
    console.log(`🔧 Attempting auto-recovery for ${unhealthyTenants.length} unhealthy tenants`);

    for (const tenant of unhealthyTenants) {
      try {
        // Simple recovery: try to re-establish connection
        console.log(`🔄 Attempting recovery for tenant ${tenant.shopId}`);
        
        // Force connection refresh (simplified recovery)
        const connection = await this.connectionRegistry.getConnection(tenant.shopId);
        if (connection) {
          // Attempt to reconnect
          const newConnection = await this.tenantRouter.getTenantConnection(tenant.shopId);
          if (newConnection) {
            console.log(`✅ Recovery successful for tenant ${tenant.shopId}`);
            await this.sendAlert('INFO', `Auto-recovery successful for tenant ${tenant.shopId}`, {
              shopId: tenant.shopId
            });
          }
        }

      } catch (error) {
        console.error(`❌ Auto-recovery failed for tenant ${tenant.shopId}:`, error);
        await this.sendAlert('ERROR', `Auto-recovery failed for tenant ${tenant.shopId}`, {
          shopId: tenant.shopId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Sends alert notifications (placeholder implementation)
   */
  private async sendAlert(level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL', message: string, details: any): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`🚨 [${level}] ${timestamp}: ${message}`, details);

    // TODO: Implement actual alerting (email, Slack, webhook, etc.)
    // This could integrate with your existing notification system
  }

  /**
   * Gets current health status for a specific tenant
   */
  getTenantHealth(shopId: number): TenantHealthStatus | null {
    return this.healthCache.get(shopId) || null;
  }

  /**
   * Gets current health status for all tenants
   */
  getAllTenantHealth(): TenantHealthStatus[] {
    return Array.from(this.healthCache.values());
  }

  /**
   * Gets system health summary
   */
  getHealthSummary(): {
    isMonitoring: boolean;
    totalTenants: number;
    healthyTenants: number;
    lastCheckAt?: Date;
    systemUptime: number;
  } {
    const allHealth = this.getAllTenantHealth();
    const healthyCount = allHealth.filter(h => h.isHealthy).length;
    const lastCheck = allHealth.length > 0 ? 
      Math.max(...allHealth.map(h => h.lastCheckAt.getTime())) : undefined;

    return {
      isMonitoring: this.isMonitoring,
      totalTenants: allHealth.length,
      healthyTenants: healthyCount,
      lastCheckAt: lastCheck ? new Date(lastCheck) : undefined,
      systemUptime: Date.now() - this.systemStartTime
    };
  }

  /**
   * Runs a health check for a specific tenant only
   */
  async checkSpecificTenant(shopId: number): Promise<TenantHealthStatus | null> {
    console.log(`🔍 Running health check for tenant ${shopId}`);
    const result = await this.checkTenantHealth(shopId);
    
    if (result) {
      this.healthCache.set(shopId, result);
    }
    
    return result;
  }
}

/**
 * Factory function to create health monitor with dependencies
 */
export function createHealthMonitor(
  tenantRouter: TenantRouter,
  connectionRegistry: ConnectionRegistry,
  config?: Partial<HealthMonitorConfig>
): TenantHealthMonitor {
  return new TenantHealthMonitor(tenantRouter, connectionRegistry, config);
}