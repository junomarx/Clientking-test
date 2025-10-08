import type { IStorage } from '../storage.js';
import type { TenantRouter } from '../tenancy/tenantRouter.js';

// =============================================================================
// DATA VALIDATOR - Ensures data consistency between unified and tenant databases
// =============================================================================
// Validates data integrity during migration
// Detects discrepancies, missing records, and data corruption
// Provides detailed reports for troubleshooting
// =============================================================================

interface ValidationConfig {
  checkMissingRecords: boolean; // Check for records in one DB but not the other
  checkDataIntegrity: boolean; // Verify field-by-field data matches
  checkRelationships: boolean; // Validate foreign key relationships
  samplePercentage?: number; // Random sample instead of full validation (1-100)
  ignoreFields?: string[]; // Fields to ignore during comparison (e.g., updatedAt)
  strictMode: boolean; // Fail fast on first error vs collect all errors
}

interface ValidationResult {
  shopId: number;
  entity: string;
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  missingInTenant: number;
  missingInUnified: number;
  dataDiscrepancies: number;
  errors: ValidationError[];
  warnings: string[];
  validatedAt: Date;
}

interface ValidationError {
  type: 'missing' | 'mismatch' | 'relationship' | 'integrity';
  recordId: number;
  field?: string;
  unifiedValue?: any;
  tenantValue?: any;
  message: string;
}

interface SystemValidationReport {
  totalShops: number;
  validatedShops: number;
  totalRecords: number;
  validRecords: number;
  totalErrors: number;
  shopResults: ValidationResult[];
  summary: {
    missingRecords: number;
    dataDiscrepancies: number;
    relationshipIssues: number;
  };
  generatedAt: Date;
}

export class DataValidator {
  private unifiedStorage: IStorage;
  private tenantRouter: TenantRouter;
  private config: ValidationConfig;

  constructor(
    unifiedStorage: IStorage,
    tenantRouter: TenantRouter,
    config: Partial<ValidationConfig> = {}
  ) {
    this.unifiedStorage = unifiedStorage;
    this.tenantRouter = tenantRouter;
    this.config = {
      checkMissingRecords: config.checkMissingRecords ?? true,
      checkDataIntegrity: config.checkDataIntegrity ?? true,
      checkRelationships: config.checkRelationships ?? false,
      samplePercentage: config.samplePercentage,
      ignoreFields: config.ignoreFields ?? ['updatedAt', 'lastModified'],
      strictMode: config.strictMode ?? false
    };

    console.log('✅ Data validator initialized:', this.config);
  }

  // =============================================================================
  // FULL SYSTEM VALIDATION
  // =============================================================================

  /**
   * Validates all shops and entities
   */
  async validateAllData(): Promise<SystemValidationReport> {
    console.log('🔍 Starting full system validation...');
    const startTime = Date.now();

    try {
      const shops = await this.unifiedStorage.getAllShops();
      const shopResults: ValidationResult[] = [];

      for (const shop of shops) {
        try {
          const results = await this.validateShopData(shop.id);
          shopResults.push(...results);
        } catch (error) {
          console.error(`❌ Validation failed for shop ${shop.id}:`, error);
        }
      }

      // Aggregate results
      const totalRecords = shopResults.reduce((sum, r) => sum + r.totalRecords, 0);
      const validRecords = shopResults.reduce((sum, r) => sum + r.validRecords, 0);
      const totalErrors = shopResults.reduce((sum, r) => sum + r.errors.length, 0);
      const missingRecords = shopResults.reduce((sum, r) => 
        sum + r.missingInTenant + r.missingInUnified, 0);
      const dataDiscrepancies = shopResults.reduce((sum, r) => sum + r.dataDiscrepancies, 0);
      const relationshipIssues = shopResults.reduce((sum, r) => 
        sum + r.errors.filter(e => e.type === 'relationship').length, 0);

      const report: SystemValidationReport = {
        totalShops: shops.length,
        validatedShops: shopResults.length,
        totalRecords,
        validRecords,
        totalErrors,
        shopResults,
        summary: {
          missingRecords,
          dataDiscrepancies,
          relationshipIssues
        },
        generatedAt: new Date()
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Validation completed in ${duration}ms:`, {
        shops: shops.length,
        records: totalRecords,
        errors: totalErrors
      });

      return report;

    } catch (error) {
      console.error('❌ System validation failed:', error);
      throw error;
    }
  }

  /**
   * Validates all data for a specific shop
   */
  async validateShopData(shopId: number): Promise<ValidationResult[]> {
    console.log(`🔍 Validating shop ${shopId}...`);

    const results: ValidationResult[] = [];

    // Validate customers
    results.push(await this.validateEntity(
      shopId,
      'customers',
      async () => this.unifiedStorage.getCustomersByShop(shopId),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        return tenantDb.db.select().from(tenantDb.schema.customers);
      }
    ));

    // Validate repairs
    results.push(await this.validateEntity(
      shopId,
      'repairs',
      async () => this.unifiedStorage.getRepairsByShop(shopId),
      async () => {
        const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
        return tenantDb.db.select().from(tenantDb.schema.repairs);
      }
    ));

    console.log(`✅ Shop ${shopId} validation complete:`, {
      entities: results.length,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
    });

    return results;
  }

  /**
   * Validates a specific entity (table)
   */
  private async validateEntity<T extends { id: number }>(
    shopId: number,
    entityName: string,
    fetchUnified: () => Promise<T[]>,
    fetchTenant: () => Promise<T[]>
  ): Promise<ValidationResult> {
    console.log(`📋 Validating ${entityName} for shop ${shopId}...`);

    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Fetch data from both sources
      const [unifiedRecords, tenantRecords] = await Promise.all([
        fetchUnified(),
        fetchTenant()
      ]);

      // Apply sampling if configured
      const unifiedSample = this.applySampling(unifiedRecords);
      const tenantSample = this.applySampling(tenantRecords);

      // Create lookup maps
      const unifiedMap = new Map(unifiedSample.map(r => [r.id, r]));
      const tenantMap = new Map(tenantSample.map(r => [r.id, r]));

      let validRecords = 0;
      let missingInTenant = 0;
      let missingInUnified = 0;
      let dataDiscrepancies = 0;

      // Check for missing records in tenant
      if (this.config.checkMissingRecords) {
        for (const [id, unifiedRecord] of unifiedMap) {
          if (!tenantMap.has(id)) {
            missingInTenant++;
            errors.push({
              type: 'missing',
              recordId: id,
              message: `Record ${id} exists in unified DB but missing in tenant DB`,
              unifiedValue: unifiedRecord
            });

            if (this.config.strictMode) break;
          }
        }

        // Check for extra records in tenant (shouldn't happen in normal migration)
        for (const [id, tenantRecord] of tenantMap) {
          if (!unifiedMap.has(id)) {
            missingInUnified++;
            errors.push({
              type: 'missing',
              recordId: id,
              message: `Record ${id} exists in tenant DB but missing in unified DB`,
              tenantValue: tenantRecord
            });

            if (this.config.strictMode) break;
          }
        }
      }

      // Check data integrity
      if (this.config.checkDataIntegrity) {
        for (const [id, unifiedRecord] of unifiedMap) {
          const tenantRecord = tenantMap.get(id);
          
          if (tenantRecord) {
            const discrepancies = this.compareRecords(
              id,
              unifiedRecord,
              tenantRecord
            );

            if (discrepancies.length > 0) {
              dataDiscrepancies++;
              errors.push(...discrepancies);

              if (this.config.strictMode) break;
            } else {
              validRecords++;
            }
          }
        }
      } else {
        // If not checking integrity, just count matching IDs as valid
        validRecords = Math.min(unifiedMap.size, tenantMap.size) - missingInTenant - missingInUnified;
      }

      // Check relationships if enabled
      if (this.config.checkRelationships) {
        const relationshipErrors = await this.validateRelationships(
          shopId,
          entityName,
          Array.from(tenantMap.values())
        );
        errors.push(...relationshipErrors);
      }

      // Add sampling warning
      if (this.config.samplePercentage && this.config.samplePercentage < 100) {
        warnings.push(`Validation used ${this.config.samplePercentage}% sample of total records`);
      }

      const result: ValidationResult = {
        shopId,
        entity: entityName,
        isValid: errors.length === 0,
        totalRecords: unifiedRecords.length,
        validRecords,
        missingInTenant,
        missingInUnified,
        dataDiscrepancies,
        errors,
        warnings,
        validatedAt: new Date()
      };

      if (errors.length > 0) {
        console.warn(`⚠️ ${entityName} validation found ${errors.length} errors`);
      } else {
        console.log(`✅ ${entityName} validation passed`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Validation failed for ${entityName}:`, error);
      return {
        shopId,
        entity: entityName,
        isValid: false,
        totalRecords: 0,
        validRecords: 0,
        missingInTenant: 0,
        missingInUnified: 0,
        dataDiscrepancies: 0,
        errors: [{
          type: 'integrity',
          recordId: 0,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        warnings,
        validatedAt: new Date()
      };
    }
  }

  /**
   * Compares two records field-by-field
   */
  private compareRecords<T extends { id: number }>(
    id: number,
    unifiedRecord: T,
    tenantRecord: T
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const allKeys = new Set([
      ...Object.keys(unifiedRecord),
      ...Object.keys(tenantRecord)
    ]);

    for (const key of allKeys) {
      // Skip ignored fields
      if (this.config.ignoreFields?.includes(key)) {
        continue;
      }

      const unifiedValue = (unifiedRecord as any)[key];
      const tenantValue = (tenantRecord as any)[key];

      // Normalize values for comparison
      const normalizedUnified = this.normalizeValue(unifiedValue);
      const normalizedTenant = this.normalizeValue(tenantValue);

      if (normalizedUnified !== normalizedTenant) {
        errors.push({
          type: 'mismatch',
          recordId: id,
          field: key,
          unifiedValue,
          tenantValue,
          message: `Field '${key}' mismatch: unified='${unifiedValue}' vs tenant='${tenantValue}'`
        });
      }
    }

    return errors;
  }

  /**
   * Normalizes values for consistent comparison
   */
  private normalizeValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Applies sampling to records if configured
   */
  private applySampling<T>(records: T[]): T[] {
    if (!this.config.samplePercentage || this.config.samplePercentage >= 100) {
      return records;
    }

    const sampleSize = Math.ceil((records.length * this.config.samplePercentage) / 100);
    const sampled: T[] = [];

    // Deterministic sampling based on array indices
    const step = Math.floor(records.length / sampleSize);
    for (let i = 0; i < records.length && sampled.length < sampleSize; i += step) {
      sampled.push(records[i]);
    }

    return sampled;
  }

  /**
   * Validates foreign key relationships
   */
  private async validateRelationships(
    shopId: number,
    entityName: string,
    records: any[]
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Example: Validate repair -> customer relationship
    if (entityName === 'repairs') {
      const tenantDb = await this.tenantRouter.getTenantConnection(shopId);
      
      for (const repair of records) {
        if (repair.customerId) {
          const customer = await tenantDb.db.select()
            .from(tenantDb.schema.customers)
            .where(tenantDb.db.eq(tenantDb.schema.customers.id, repair.customerId))
            .limit(1);

          if (customer.length === 0) {
            errors.push({
              type: 'relationship',
              recordId: repair.id,
              field: 'customerId',
              message: `Repair ${repair.id} references non-existent customer ${repair.customerId}`
            });
          }
        }
      }
    }

    return errors;
  }

  // =============================================================================
  // REPORTING & UTILITIES
  // =============================================================================

  /**
   * Generates a human-readable validation report
   */
  generateReport(result: SystemValidationReport): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('DATA VALIDATION REPORT');
    lines.push('='.repeat(80));
    lines.push(`Generated: ${result.generatedAt.toISOString()}`);
    lines.push('');
    
    lines.push('SUMMARY:');
    lines.push(`  Total Shops: ${result.totalShops}`);
    lines.push(`  Total Records: ${result.totalRecords}`);
    lines.push(`  Valid Records: ${result.validRecords}`);
    lines.push(`  Total Errors: ${result.totalErrors}`);
    lines.push('');
    
    lines.push('ERROR BREAKDOWN:');
    lines.push(`  Missing Records: ${result.summary.missingRecords}`);
    lines.push(`  Data Discrepancies: ${result.summary.dataDiscrepancies}`);
    lines.push(`  Relationship Issues: ${result.summary.relationshipIssues}`);
    lines.push('');

    if (result.totalErrors > 0) {
      lines.push('SHOP DETAILS:');
      for (const shopResult of result.shopResults) {
        if (shopResult.errors.length > 0) {
          lines.push(`  Shop ${shopResult.shopId} - ${shopResult.entity}:`);
          lines.push(`    Errors: ${shopResult.errors.length}`);
          lines.push(`    Missing in Tenant: ${shopResult.missingInTenant}`);
          lines.push(`    Data Discrepancies: ${shopResult.dataDiscrepancies}`);
          
          // Show first few errors
          const errorSample = shopResult.errors.slice(0, 5);
          for (const error of errorSample) {
            lines.push(`      - ${error.message}`);
          }
          if (shopResult.errors.length > 5) {
            lines.push(`      ... and ${shopResult.errors.length - 5} more errors`);
          }
          lines.push('');
        }
      }
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Exports validation results to JSON
   */
  exportResults(result: SystemValidationReport): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Updates validation configuration
   */
  updateConfig(updates: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔄 Validation config updated:', this.config);
  }
}

/**
 * Factory function to create data validator
 */
export function createDataValidator(
  unifiedStorage: IStorage,
  tenantRouter: TenantRouter,
  config?: Partial<ValidationConfig>
): DataValidator {
  return new DataValidator(unifiedStorage, tenantRouter, config);
}