#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs all database migrations in the correct order
 */

import { Pool } from 'pg';

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Import all migration functions
  const {
    addSecondSignatureColumns,
    addPricingPlanColumn,
    addCompanySloganVatColumns,
    addShopIdColumn,
    addFeatureOverridesColumn,
    addPackageTables,
    addDeviceIssuesFields,
    addHiddenDeviceTypesTable,
    addBrandIdToModels,
    addPrintTemplatesTable,
    addErrorCatalogEntriesTable,
    addGameconsoleToErrorCatalog,
    addEmailTemplateTypeColumn,
    addSupportAccessTable,
    addSupportRequestStatus,
    syncEmailTemplates
  } = await import('../server/migrations.js');

  try {
    console.log('📋 Running database schema migrations...');
    
    // Run all migrations in sequence
    await addSecondSignatureColumns();
    await addPricingPlanColumn();
    await addCompanySloganVatColumns();
    await addShopIdColumn();
    await addFeatureOverridesColumn();
    await addPackageTables();
    await addDeviceIssuesFields();
    await addHiddenDeviceTypesTable();
    await addBrandIdToModels();
    await addPrintTemplatesTable();
    await addErrorCatalogEntriesTable();
    await addGameconsoleToErrorCatalog();
    await addEmailTemplateTypeColumn();
    await addSupportAccessTable();
    await addSupportRequestStatus();
    
    console.log('📧 Synchronizing email templates...');
    await syncEmailTemplates();
    
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Migration interrupted');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('🛑 Migration interrupted');
  process.exit(1);
});

// Run migrations
runMigrations().catch(error => {
  console.error('💥 Unexpected error during migrations:', error);
  process.exit(1);
});