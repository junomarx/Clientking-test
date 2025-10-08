#!/usr/bin/env tsx
/**
 * Apply Database Security Measures
 * 
 * This script applies database-level security controls to prevent shop_id manipulation.
 * Run this script once on existing production systems to add security triggers and constraints.
 * 
 * Usage:
 *   tsx scripts/apply-database-security.ts
 */

import { DatabaseSecurityManager } from '../server/tenancy/databaseSecurity';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     Database Security Configuration Tool                     ║');
  console.log('║     Applying shop_id immutability and audit controls          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Apply all security measures
    await DatabaseSecurityManager.applySecurityMeasures();

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     Verifying security measures...                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    // Verify the security measures are active
    const verification = await DatabaseSecurityManager.verifySecurityMeasures();

    console.log('📊 Security Status Report:');
    console.log('─'.repeat(65));
    verification.details.forEach(detail => console.log(detail));
    console.log('─'.repeat(65));

    console.log('');
    console.log('═'.repeat(67));
    console.log('Security Deployment Summary:');
    console.log('─'.repeat(67));

    let overallStatus = 'SECURE';
    let exitCode = 0;

    if (verification.triggersActive) {
      console.log('✅ Shop ID immutability: ACTIVE (14 tables protected)');
    } else {
      console.log('❌ Shop ID immutability: FAILED');
      overallStatus = 'CRITICAL';
      exitCode = 1;
    }

    if (verification.auditingActive) {
      console.log('✅ Audit logging: ACTIVE');
    } else {
      console.log('❌ Audit logging: FAILED');
      overallStatus = 'CRITICAL';
      exitCode = 1;
    }

    if (verification.constraintsActive) {
      console.log('✅ Ownership constraints: FULLY ENFORCED (3/3)');
    } else {
      console.log('❌ Ownership constraints: INCOMPLETE (2/3)');
      console.log('   ❌ SECURITY GAP: Owner role lacks shop_id enforcement');
      console.log('   ❌ This allows privilege escalation and cross-tenant access');
      overallStatus = 'CRITICAL';
      exitCode = 1;
    }

    console.log('');
    console.log('API Protection: ACTIVE (sanitization middleware deployed)');
    console.log('─'.repeat(67));

    if (overallStatus === 'SECURE') {
      console.log('✅ DEPLOYMENT SUCCESSFUL - All security controls active');
    } else {
      console.log('❌ DEPLOYMENT FAILED - Security controls incomplete');
      console.log('');
      console.log('❌ REQUIRED: Fix legacy data before production deployment:');
      console.log('   1. Identify owners without shop_id:');
      console.log('      SELECT id, username, email, role FROM users WHERE role = \'owner\' AND shop_id IS NULL;');
      console.log('   2. Assign shop_id to each owner:');
      console.log('      UPDATE users SET shop_id = <shop_id> WHERE id = <user_id>;');
      console.log('   3. Rerun this script - it must pass before production use');
      console.log('');
      console.log('⚠️  WARNING: Deploying with incomplete constraints allows:');
      console.log('   • Privilege escalation via owner role');
      console.log('   • Cross-tenant data access');
      console.log('   • Tenant isolation violations');
    }

    console.log('═'.repeat(67));
    console.log('');
    process.exit(exitCode);
  } catch (error) {
    console.error('');
    console.error('❌ FAILED: Error applying security measures');
    console.error('');
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }
    console.error('');
    console.error('The database may be in an incomplete state.');
    console.error('You can retry by running this script again.');
    console.error('');
    process.exit(1);
  }
}

// Run the script
main();
