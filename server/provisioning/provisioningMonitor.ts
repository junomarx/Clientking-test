import type { ProvisioningWorkflow } from './provisioningWorkflow.js';

// =============================================================================
// PROVISIONING MONITOR - Real-time monitoring and dashboard for provisioning
// =============================================================================
// Provides live status updates and metrics for tenant provisioning
// Integrates with provisioning workflow for progress tracking
// Offers dashboard data for frontend visualization
// =============================================================================

interface ProvisioningDashboard {
  status: {
    isRunning: boolean;
    phase: 'idle' | 'preparing' | 'provisioning' | 'validating' | 'completed' | 'failed';
    startedAt?: Date;
    estimatedCompletion?: Date;
  };
  progress: {
    totalShops: number;
    pendingShops: number;
    provisioningShops: number;
    completedShops: number;
    failedShops: number;
    percentComplete: number;
  };
  performance: {
    averageProvisioningTime: number;
    throughput: number; // Shops per minute
    estimatedTimeRemaining: number; // Milliseconds
  };
  recentActivity: Array<{
    shopId: number;
    shopName: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'error' | 'warning';
  }>;
  errors: Array<{
    shopId: number;
    shopName: string;
    error: string;
    timestamp: Date;
  }>;
  recommendations: string[];
}

interface MonitoringMetrics {
  totalProvisioningTime: number;
  successfulProvisions: number;
  failedProvisions: number;
  retryCount: number;
  averageProvisioningTime: number;
  lastActivityAt?: Date;
}

export class ProvisioningMonitor {
  private workflow: ProvisioningWorkflow;
  private metrics: MonitoringMetrics = {
    totalProvisioningTime: 0,
    successfulProvisions: 0,
    failedProvisions: 0,
    retryCount: 0,
    averageProvisioningTime: 0
  };
  private activityLog: Array<{
    shopId: number;
    shopName: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'error' | 'warning';
  }> = [];
  private maxActivityLogSize = 50;
  private provisioningStartTime?: Date;

  constructor(workflow: ProvisioningWorkflow) {
    this.workflow = workflow;
    console.log('📊 Provisioning monitor initialized');
  }

  // =============================================================================
  // DASHBOARD DATA
  // =============================================================================

  /**
   * Gets comprehensive dashboard data
   */
  getDashboard(): ProvisioningDashboard {
    const overallStatus = this.workflow.getOverallStatus();
    const allProgress = Array.isArray(this.workflow.getProgress()) 
      ? this.workflow.getProgress() as any[]
      : [this.workflow.getProgress()];

    // Calculate metrics
    const totalShops = overallStatus.total;
    const completedShops = overallStatus.completed;
    const percentComplete = totalShops > 0 ? (completedShops / totalShops) * 100 : 0;

    // Determine current phase
    let phase: ProvisioningDashboard['status']['phase'] = 'idle';
    if (overallStatus.provisioning > 0) {
      phase = 'provisioning';
    } else if (overallStatus.completed > 0 && overallStatus.pending === 0 && overallStatus.provisioning === 0) {
      phase = overallStatus.failed > 0 ? 'failed' : 'completed';
    } else if (overallStatus.pending > 0 && overallStatus.provisioning === 0 && overallStatus.completed === 0) {
      phase = 'preparing';
    }

    // Calculate performance metrics
    const avgTime = this.calculateAverageProvisioningTime(allProgress);
    const throughput = avgTime > 0 ? (60000 / avgTime) : 0; // Shops per minute
    const remainingShops = overallStatus.pending + overallStatus.provisioning;
    const estimatedTimeRemaining = avgTime * remainingShops;

    // Extract errors
    const errors = allProgress
      .filter((p: any) => p.error)
      .map((p: any) => ({
        shopId: p.shopId,
        shopName: p.shopName,
        error: p.error,
        timestamp: p.completedAt || new Date()
      }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallStatus,
      errors.length,
      avgTime
    );

    return {
      status: {
        isRunning: overallStatus.provisioning > 0,
        phase,
        startedAt: this.provisioningStartTime,
        estimatedCompletion: estimatedTimeRemaining > 0 
          ? new Date(Date.now() + estimatedTimeRemaining) 
          : undefined
      },
      progress: {
        totalShops,
        pendingShops: overallStatus.pending,
        provisioningShops: overallStatus.provisioning,
        completedShops: overallStatus.completed,
        failedShops: overallStatus.failed,
        percentComplete: Math.round(percentComplete)
      },
      performance: {
        averageProvisioningTime: Math.round(avgTime),
        throughput: Math.round(throughput * 10) / 10,
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining)
      },
      recentActivity: this.activityLog.slice(-20),
      errors,
      recommendations
    };
  }

  // =============================================================================
  // ACTIVITY TRACKING
  // =============================================================================

  /**
   * Logs a provisioning activity
   */
  logActivity(
    shopId: number,
    shopName: string,
    action: string,
    status: 'success' | 'error' | 'warning' = 'success'
  ): void {
    const activity = {
      shopId,
      shopName,
      action,
      timestamp: new Date(),
      status
    };

    this.activityLog.push(activity);

    // Keep log size manageable
    if (this.activityLog.length > this.maxActivityLogSize) {
      this.activityLog.shift();
    }

    this.metrics.lastActivityAt = new Date();

    // Update metrics based on activity
    if (status === 'success' && action.includes('completed')) {
      this.metrics.successfulProvisions++;
    } else if (status === 'error') {
      this.metrics.failedProvisions++;
    }
  }

  /**
   * Starts monitoring a provisioning run
   */
  startMonitoring(): void {
    this.provisioningStartTime = new Date();
    this.logActivity(0, 'System', 'Provisioning started', 'success');
    console.log('📊 Provisioning monitoring started');
  }

  /**
   * Stops monitoring
   */
  stopMonitoring(): void {
    this.logActivity(0, 'System', 'Provisioning completed', 'success');
    console.log('📊 Provisioning monitoring stopped');
  }

  // =============================================================================
  // METRICS & ANALYTICS
  // =============================================================================

  /**
   * Calculates average provisioning time per shop
   */
  private calculateAverageProvisioningTime(progress: any[]): number {
    const completed = progress.filter((p: any) => p.completedAt && p.startedAt);
    
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum: number, p: any) => {
      const duration = p.completedAt.getTime() - p.startedAt.getTime();
      return sum + duration;
    }, 0);

    return totalTime / completed.length;
  }

  /**
   * Generates recommendations based on current status
   */
  private generateRecommendations(
    status: any,
    errorCount: number,
    avgTime: number
  ): string[] {
    const recommendations: string[] = [];

    // Error rate recommendations
    if (errorCount > status.total * 0.1 && status.total > 0) {
      recommendations.push('High failure rate detected - review error logs and consider reducing concurrency');
    }

    // Performance recommendations
    if (avgTime > 60000) { // More than 1 minute per shop
      recommendations.push('Provisioning is slow - consider increasing database resources or network capacity');
    }

    // Progress recommendations
    if (status.pending > 0 && status.provisioning === 0) {
      recommendations.push('Provisioning appears stalled - check system status and restart if needed');
    }

    // Completion recommendations
    if (status.completed === status.total && status.total > 0) {
      if (status.failed === 0) {
        recommendations.push('All shops provisioned successfully - ready to proceed with data migration');
      } else {
        recommendations.push(`${status.failed} shops failed provisioning - retry failed shops before proceeding`);
      }
    }

    // Default recommendation
    if (recommendations.length === 0 && status.provisioning > 0) {
      recommendations.push('Provisioning in progress - monitor for errors and performance issues');
    }

    return recommendations;
  }

  /**
   * Gets current metrics
   */
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets metrics and activity log
   */
  resetMetrics(): void {
    this.metrics = {
      totalProvisioningTime: 0,
      successfulProvisions: 0,
      failedProvisions: 0,
      retryCount: 0,
      averageProvisioningTime: 0
    };
    this.activityLog = [];
    this.provisioningStartTime = undefined;
    console.log('📊 Provisioning metrics reset');
  }

  /**
   * Gets recent activity log
   */
  getActivityLog(limit = 50): typeof this.activityLog {
    return this.activityLog.slice(-limit);
  }

  /**
   * Exports dashboard data as JSON
   */
  exportDashboard(): string {
    return JSON.stringify(this.getDashboard(), null, 2);
  }

  /**
   * Generates a text-based status report
   */
  generateStatusReport(): string {
    const dashboard = this.getDashboard();
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('TENANT PROVISIONING STATUS');
    lines.push('='.repeat(80));
    lines.push(`Phase: ${dashboard.status.phase.toUpperCase()}`);
    lines.push(`Status: ${dashboard.status.isRunning ? 'RUNNING' : 'STOPPED'}`);
    
    if (dashboard.status.startedAt) {
      lines.push(`Started: ${dashboard.status.startedAt.toISOString()}`);
    }
    
    if (dashboard.status.estimatedCompletion) {
      lines.push(`Est. Completion: ${dashboard.status.estimatedCompletion.toISOString()}`);
    }
    
    lines.push('');
    
    lines.push('PROGRESS:');
    lines.push(`  Total Shops: ${dashboard.progress.totalShops}`);
    lines.push(`  Completed: ${dashboard.progress.completedShops} (${dashboard.progress.percentComplete}%)`);
    lines.push(`  Provisioning: ${dashboard.progress.provisioningShops}`);
    lines.push(`  Pending: ${dashboard.progress.pendingShops}`);
    lines.push(`  Failed: ${dashboard.progress.failedShops}`);
    lines.push('');
    
    lines.push('PERFORMANCE:');
    lines.push(`  Avg Time/Shop: ${(dashboard.performance.averageProvisioningTime / 1000).toFixed(2)}s`);
    lines.push(`  Throughput: ${dashboard.performance.throughput.toFixed(1)} shops/min`);
    
    if (dashboard.performance.estimatedTimeRemaining > 0) {
      const minutes = Math.ceil(dashboard.performance.estimatedTimeRemaining / 60000);
      lines.push(`  Est. Time Remaining: ${minutes} minutes`);
    }
    
    lines.push('');
    
    if (dashboard.errors.length > 0) {
      lines.push('RECENT ERRORS:');
      for (const error of dashboard.errors.slice(0, 5)) {
        lines.push(`  Shop ${error.shopId} (${error.shopName}): ${error.error}`);
      }
      
      if (dashboard.errors.length > 5) {
        lines.push(`  ... and ${dashboard.errors.length - 5} more errors`);
      }
      
      lines.push('');
    }
    
    if (dashboard.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      for (const rec of dashboard.recommendations) {
        lines.push(`  • ${rec}`);
      }
      lines.push('');
    }
    
    if (dashboard.recentActivity.length > 0) {
      lines.push('RECENT ACTIVITY:');
      for (const activity of dashboard.recentActivity.slice(-5).reverse()) {
        const icon = activity.status === 'success' ? '✅' : 
                     activity.status === 'error' ? '❌' : '⚠️';
        lines.push(`  ${icon} Shop ${activity.shopId}: ${activity.action}`);
      }
    }
    
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }
}

/**
 * Factory function to create provisioning monitor
 */
export function createProvisioningMonitor(workflow: ProvisioningWorkflow): ProvisioningMonitor {
  return new ProvisioningMonitor(workflow);
}