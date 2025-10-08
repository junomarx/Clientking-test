import type { TenantRouter } from '../tenancy/tenantRouter.js';

// =============================================================================
// PERFORMANCE MONITOR - Query performance tracking for tenant databases
// =============================================================================
// Monitors query performance across tenant databases
// Tracks latency, throughput, error rates
// Identifies slow queries and optimization opportunities
// =============================================================================

export interface QueryMetric {
  shopId: number;
  queryType: string; // 'select', 'insert', 'update', 'delete'
  table: string;
  durationMs: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  source: 'unified' | 'tenant';
}

export interface PerformanceStats {
  shopId: number;
  totalQueries: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  queriesPerSecond: number;
  slowQueries: number; // Queries > threshold
  byTable: Map<string, TableStats>;
  byType: Map<string, QueryTypeStats>;
}

export interface TableStats {
  tableName: string;
  queryCount: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface QueryTypeStats {
  type: string;
  count: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface PerformanceAlert {
  severity: 'info' | 'warning' | 'critical';
  shopId: number;
  type: 'high_latency' | 'high_error_rate' | 'slow_query' | 'connection_issue';
  message: string;
  metric: QueryMetric;
  timestamp: Date;
}

export class PerformanceMonitor {
  private metrics: QueryMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private slowQueryThresholdMs: number;
  private maxMetricsRetention: number;
  private monitoringEnabled = true;

  constructor(
    slowQueryThresholdMs = 1000,
    maxMetricsRetention = 10000
  ) {
    this.slowQueryThresholdMs = slowQueryThresholdMs;
    this.maxMetricsRetention = maxMetricsRetention;
    
    console.log('📊 Performance Monitor initialized');
    console.log(`  Slow query threshold: ${slowQueryThresholdMs}ms`);
    console.log(`  Max metrics retention: ${maxMetricsRetention} records`);
  }

  // =============================================================================
  // METRIC COLLECTION
  // =============================================================================

  /**
   * Records a query metric
   */
  recordQuery(
    shopId: number,
    queryType: string,
    table: string,
    durationMs: number,
    success: boolean,
    source: 'unified' | 'tenant' = 'tenant',
    error?: string
  ): void {
    if (!this.monitoringEnabled) {
      return;
    }

    const metric: QueryMetric = {
      shopId,
      queryType: queryType.toLowerCase(),
      table,
      durationMs,
      success,
      error,
      timestamp: new Date(),
      source
    };

    this.metrics.push(metric);

    // Check for performance issues
    this.checkForIssues(metric);

    // Manage retention
    if (this.metrics.length > this.maxMetricsRetention) {
      this.metrics = this.metrics.slice(-this.maxMetricsRetention);
    }
  }

  /**
   * Wraps a database query with performance tracking
   */
  async trackQuery<T>(
    shopId: number,
    queryType: string,
    table: string,
    source: 'unified' | 'tenant',
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await queryFn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;
      this.recordQuery(shopId, queryType, table, durationMs, success, source, error);
    }
  }

  // =============================================================================
  // PERFORMANCE ANALYSIS
  // =============================================================================

  /**
   * Gets performance stats for a specific shop
   */
  getShopStats(shopId: number, timeWindowMs?: number): PerformanceStats {
    const now = Date.now();
    const cutoff = timeWindowMs ? now - timeWindowMs : 0;

    const shopMetrics = this.metrics.filter(
      m => m.shopId === shopId && m.timestamp.getTime() >= cutoff
    );

    if (shopMetrics.length === 0) {
      return {
        shopId,
        totalQueries: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        errorRate: 0,
        queriesPerSecond: 0,
        slowQueries: 0,
        byTable: new Map(),
        byType: new Map()
      };
    }

    // Calculate latency percentiles
    const latencies = shopMetrics.map(m => m.durationMs).sort((a, b) => a - b);
    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);

    // Calculate averages and rates
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const errorCount = shopMetrics.filter(m => !m.success).length;
    const errorRate = (errorCount / shopMetrics.length) * 100;
    const slowQueries = shopMetrics.filter(m => m.durationMs > this.slowQueryThresholdMs).length;

    // Calculate QPS
    const timeSpanMs = now - shopMetrics[0].timestamp.getTime();
    const queriesPerSecond = timeSpanMs > 0 ? (shopMetrics.length / timeSpanMs) * 1000 : 0;

    // Group by table
    const byTable = new Map<string, TableStats>();
    for (const metric of shopMetrics) {
      const existing = byTable.get(metric.table) || {
        tableName: metric.table,
        queryCount: 0,
        avgLatencyMs: 0,
        errorCount: 0
      };

      existing.queryCount++;
      existing.avgLatencyMs = (existing.avgLatencyMs * (existing.queryCount - 1) + metric.durationMs) / existing.queryCount;
      if (!metric.success) {
        existing.errorCount++;
      }

      byTable.set(metric.table, existing);
    }

    // Group by query type
    const byType = new Map<string, QueryTypeStats>();
    for (const metric of shopMetrics) {
      const existing = byType.get(metric.queryType) || {
        type: metric.queryType,
        count: 0,
        avgLatencyMs: 0,
        errorCount: 0
      };

      existing.count++;
      existing.avgLatencyMs = (existing.avgLatencyMs * (existing.count - 1) + metric.durationMs) / existing.count;
      if (!metric.success) {
        existing.errorCount++;
      }

      byType.set(metric.queryType, existing);
    }

    return {
      shopId,
      totalQueries: shopMetrics.length,
      avgLatencyMs: avgLatency,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      errorRate,
      queriesPerSecond,
      slowQueries,
      byTable,
      byType
    };
  }

  /**
   * Gets overall performance stats across all shops
   */
  getOverallStats(timeWindowMs?: number): PerformanceStats {
    const now = Date.now();
    const cutoff = timeWindowMs ? now - timeWindowMs : 0;

    const allMetrics = this.metrics.filter(
      m => m.timestamp.getTime() >= cutoff
    );

    if (allMetrics.length === 0) {
      return {
        shopId: 0,
        totalQueries: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        errorRate: 0,
        queriesPerSecond: 0,
        slowQueries: 0,
        byTable: new Map(),
        byType: new Map()
      };
    }

    // Calculate latency percentiles
    const latencies = allMetrics.map(m => m.durationMs).sort((a, b) => a - b);
    const p50 = this.percentile(latencies, 50);
    const p95 = this.percentile(latencies, 95);
    const p99 = this.percentile(latencies, 99);

    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const errorCount = allMetrics.filter(m => !m.success).length;
    const errorRate = (errorCount / allMetrics.length) * 100;
    const slowQueries = allMetrics.filter(m => m.durationMs > this.slowQueryThresholdMs).length;

    const timeSpanMs = now - allMetrics[0].timestamp.getTime();
    const queriesPerSecond = timeSpanMs > 0 ? (allMetrics.length / timeSpanMs) * 1000 : 0;

    // Aggregate by table and type (similar to shop stats)
    const byTable = new Map<string, TableStats>();
    const byType = new Map<string, QueryTypeStats>();

    for (const metric of allMetrics) {
      // Table stats
      const tableStats = byTable.get(metric.table) || {
        tableName: metric.table,
        queryCount: 0,
        avgLatencyMs: 0,
        errorCount: 0
      };
      tableStats.queryCount++;
      tableStats.avgLatencyMs = (tableStats.avgLatencyMs * (tableStats.queryCount - 1) + metric.durationMs) / tableStats.queryCount;
      if (!metric.success) tableStats.errorCount++;
      byTable.set(metric.table, tableStats);

      // Type stats
      const typeStats = byType.get(metric.queryType) || {
        type: metric.queryType,
        count: 0,
        avgLatencyMs: 0,
        errorCount: 0
      };
      typeStats.count++;
      typeStats.avgLatencyMs = (typeStats.avgLatencyMs * (typeStats.count - 1) + metric.durationMs) / typeStats.count;
      if (!metric.success) typeStats.errorCount++;
      byType.set(metric.queryType, typeStats);
    }

    return {
      shopId: 0, // 0 indicates overall stats
      totalQueries: allMetrics.length,
      avgLatencyMs: avgLatency,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      errorRate,
      queriesPerSecond,
      slowQueries,
      byTable,
      byType
    };
  }

  /**
   * Calculates percentile from sorted array
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  // =============================================================================
  // ALERTING
  // =============================================================================

  /**
   * Checks for performance issues and generates alerts
   */
  private checkForIssues(metric: QueryMetric): void {
    // Check for slow queries
    if (metric.durationMs > this.slowQueryThresholdMs) {
      this.addAlert({
        severity: metric.durationMs > this.slowQueryThresholdMs * 2 ? 'critical' : 'warning',
        shopId: metric.shopId,
        type: 'slow_query',
        message: `Slow query detected: ${metric.table} ${metric.queryType} took ${metric.durationMs}ms`,
        metric,
        timestamp: new Date()
      });
    }

    // Check for errors
    if (!metric.success) {
      this.addAlert({
        severity: 'warning',
        shopId: metric.shopId,
        type: 'high_error_rate',
        message: `Query failed: ${metric.table} ${metric.queryType} - ${metric.error}`,
        metric,
        timestamp: new Date()
      });
    }
  }

  /**
   * Adds an alert
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL: ${alert.message}`);
    } else if (alert.severity === 'warning') {
      console.warn(`⚠️ WARNING: ${alert.message}`);
    }
  }

  /**
   * Gets recent alerts
   */
  getAlerts(
    limit = 100,
    severity?: 'info' | 'warning' | 'critical',
    shopId?: number
  ): PerformanceAlert[] {
    let filtered = this.alerts;

    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }

    if (shopId !== undefined) {
      filtered = filtered.filter(a => a.shopId === shopId);
    }

    return filtered.slice(-limit);
  }

  // =============================================================================
  // REPORTING
  // =============================================================================

  /**
   * Generates performance report
   */
  generateReport(shopId?: number, timeWindowMs?: number): string {
    const stats = shopId !== undefined 
      ? this.getShopStats(shopId, timeWindowMs)
      : this.getOverallStats(timeWindowMs);

    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push(shopId !== undefined 
      ? `PERFORMANCE REPORT - Shop ${shopId}` 
      : 'OVERALL PERFORMANCE REPORT');
    lines.push('='.repeat(80));

    lines.push('\nQUERY STATISTICS:');
    lines.push(`  Total Queries: ${stats.totalQueries}`);
    lines.push(`  Queries/Second: ${stats.queriesPerSecond.toFixed(2)}`);
    lines.push(`  Error Rate: ${stats.errorRate.toFixed(2)}%`);
    lines.push(`  Slow Queries: ${stats.slowQueries} (>${this.slowQueryThresholdMs}ms)`);

    lines.push('\nLATENCY:');
    lines.push(`  Average: ${stats.avgLatencyMs.toFixed(2)}ms`);
    lines.push(`  P50: ${stats.p50LatencyMs.toFixed(2)}ms`);
    lines.push(`  P95: ${stats.p95LatencyMs.toFixed(2)}ms`);
    lines.push(`  P99: ${stats.p99LatencyMs.toFixed(2)}ms`);

    lines.push('\nBY QUERY TYPE:');
    for (const [type, typeStats] of stats.byType) {
      lines.push(`  ${type.toUpperCase()}:`);
      lines.push(`    Count: ${typeStats.count}`);
      lines.push(`    Avg Latency: ${typeStats.avgLatencyMs.toFixed(2)}ms`);
      lines.push(`    Errors: ${typeStats.errorCount}`);
    }

    lines.push('\nBY TABLE (Top 10):');
    const topTables = Array.from(stats.byTable.values())
      .sort((a, b) => b.queryCount - a.queryCount)
      .slice(0, 10);

    for (const tableStats of topTables) {
      lines.push(`  ${tableStats.tableName}:`);
      lines.push(`    Queries: ${tableStats.queryCount}`);
      lines.push(`    Avg Latency: ${tableStats.avgLatencyMs.toFixed(2)}ms`);
      lines.push(`    Errors: ${tableStats.errorCount}`);
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Gets slow queries
   */
  getSlowQueries(limit = 20, shopId?: number): QueryMetric[] {
    let filtered = this.metrics.filter(m => m.durationMs > this.slowQueryThresholdMs);

    if (shopId !== undefined) {
      filtered = filtered.filter(m => m.shopId === shopId);
    }

    return filtered
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, limit);
  }

  /**
   * Compares performance between unified and tenant databases
   */
  comparePerformance(shopId: number): {
    unified: PerformanceStats;
    tenant: PerformanceStats;
    improvement: number;
  } {
    const unifiedMetrics = this.metrics.filter(m => m.shopId === shopId && m.source === 'unified');
    const tenantMetrics = this.metrics.filter(m => m.shopId === shopId && m.source === 'tenant');

    const unifiedStats = this.calculateStats(shopId, unifiedMetrics);
    const tenantStats = this.calculateStats(shopId, tenantMetrics);

    const improvement = unifiedStats.avgLatencyMs > 0
      ? ((unifiedStats.avgLatencyMs - tenantStats.avgLatencyMs) / unifiedStats.avgLatencyMs) * 100
      : 0;

    return {
      unified: unifiedStats,
      tenant: tenantStats,
      improvement
    };
  }

  /**
   * Helper to calculate stats from metrics array
   */
  private calculateStats(shopId: number, metrics: QueryMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        shopId,
        totalQueries: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        errorRate: 0,
        queriesPerSecond: 0,
        slowQueries: 0,
        byTable: new Map(),
        byType: new Map()
      };
    }

    const latencies = metrics.map(m => m.durationMs).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const errorCount = metrics.filter(m => !m.success).length;

    return {
      shopId,
      totalQueries: metrics.length,
      avgLatencyMs: avgLatency,
      p50LatencyMs: this.percentile(latencies, 50),
      p95LatencyMs: this.percentile(latencies, 95),
      p99LatencyMs: this.percentile(latencies, 99),
      errorRate: (errorCount / metrics.length) * 100,
      queriesPerSecond: 0,
      slowQueries: metrics.filter(m => m.durationMs > this.slowQueryThresholdMs).length,
      byTable: new Map(),
      byType: new Map()
    };
  }

  /**
   * Resets all metrics and alerts
   */
  reset(): void {
    this.metrics = [];
    this.alerts = [];
    console.log('🔄 Performance Monitor reset');
  }

  /**
   * Enables/disables monitoring
   */
  setMonitoring(enabled: boolean): void {
    this.monitoringEnabled = enabled;
    console.log(`📊 Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Factory function to create performance monitor
 */
export function createPerformanceMonitor(
  slowQueryThresholdMs?: number,
  maxMetricsRetention?: number
): PerformanceMonitor {
  return new PerformanceMonitor(slowQueryThresholdMs, maxMetricsRetention);
}
