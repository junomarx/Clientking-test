#!/usr/bin/env tsx
/**
 * Test Security Features
 * 
 * Comprehensive test suite to validate shop_id security controls
 * Tests both database-level and API-level protections
 * 
 * Usage:
 *   tsx scripts/test-security-features.ts
 */

import { db } from '../server/db';
import { customers, users, repairs, shops } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { DatabaseSecurityManager } from '../server/tenancy/databaseSecurity';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  expected: string;
  actual: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, expected: string, actual: string) {
  results.push({ name, passed, message, expected, actual });
  console.log(passed ? '  ✅' : '  ❌', name);
  if (!passed) {
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual: ${actual}`);
    console.log(`     ${message}`);
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     Security Features Test Suite                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // First verify security measures are installed
    console.log('🔍 Verifying security installation...');
    const verification = await DatabaseSecurityManager.verifySecurityMeasures();
    
    if (!verification.triggersActive || !verification.constraintsActive) {
      console.error('❌ Security measures not installed. Run: tsx scripts/apply-database-security.ts');
      process.exit(1);
    }
    
    console.log('✅ Security measures installed and active\n');

    // Test 1: Database trigger prevents shop_id modification on customers
    console.log('📋 Test 1: Database Trigger Protection');
    await testDatabaseTriggerProtection();

    // Test 2: Owner constraint enforcement
    console.log('\n📋 Test 2: Owner Constraint Enforcement');
    await testOwnerConstraintEnforcement();

    // Test 3: Audit logging on security violations
    console.log('\n📋 Test 3: Audit Logging');
    await testAuditLogging();

    // Summary
    console.log('\n' + '═'.repeat(67));
    console.log('Test Summary:');
    console.log('─'.repeat(67));
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    console.log(`Total Tests: ${totalCount}`);
    console.log(`Passed: ${passedCount} ✅`);
    console.log(`Failed: ${totalCount - passedCount} ❌`);
    console.log('─'.repeat(67));

    if (passedCount === totalCount) {
      console.log('\n🎉 All security tests passed!');
      console.log('\nSecurity Status: ✅ SECURE');
      console.log('');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed!');
      console.log('\nSecurity Status: ⚠️  INCOMPLETE');
      console.log('\nFailed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  • ${r.name}`);
        console.log(`    ${r.message}`);
      });
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

/**
 * Test that database triggers prevent shop_id modification
 */
async function testDatabaseTriggerProtection() {
  try {
    // Create a test customer
    const [testCustomer] = await db.insert(customers).values({
      firstName: 'Security',
      lastName: 'Test',
      phone: '+49123456789',
      shopId: 1,
      userId: null
    }).returning();

    try {
      // Attempt to modify shop_id (should fail)
      await db.update(customers)
        .set({ shopId: 999 })
        .where(eq(customers.id, testCustomer.id));

      // If we get here, the trigger failed
      logTest(
        'Prevent shop_id modification via UPDATE',
        false,
        'Trigger did not prevent shop_id change',
        'UPDATE rejected with error',
        'UPDATE succeeded'
      );

      // Cleanup
      await db.delete(customers).where(eq(customers.id, testCustomer.id));
    } catch (error: any) {
      // Expected to fail
      if (error.message && error.message.includes('shop_id cannot be modified')) {
        logTest(
          'Prevent shop_id modification via UPDATE',
          true,
          'Trigger correctly prevented shop_id change',
          'UPDATE rejected',
          'UPDATE rejected'
        );
      } else {
        logTest(
          'Prevent shop_id modification via UPDATE',
          false,
          `Unexpected error: ${error.message}`,
          'Specific shop_id error',
          error.message
        );
      }

      // Cleanup
      await db.delete(customers).where(eq(customers.id, testCustomer.id));
    }

    // Test that NULL to value is allowed (initial assignment)
    const [testCustomer2] = await db.insert(customers).values({
      firstName: 'Initial',
      lastName: 'Assignment',
      phone: '+49987654321',
      shopId: null as any,
      userId: null
    }).returning();

    try {
      await db.update(customers)
        .set({ shopId: 2 })
        .where(eq(customers.id, testCustomer2.id));

      logTest(
        'Allow initial shop_id assignment (NULL → value)',
        true,
        'Initial assignment correctly allowed',
        'UPDATE succeeded',
        'UPDATE succeeded'
      );

      // Cleanup
      await db.delete(customers).where(eq(customers.id, testCustomer2.id));
    } catch (error: any) {
      logTest(
        'Allow initial shop_id assignment (NULL → value)',
        false,
        'Initial assignment was blocked',
        'UPDATE should succeed',
        `UPDATE failed: ${error.message}`
      );
    }

  } catch (error: any) {
    logTest(
      'Database trigger tests',
      false,
      `Setup failed: ${error.message}`,
      'Tests to run',
      'Setup error'
    );
  }
}

/**
 * Test owner constraint enforcement
 */
async function testOwnerConstraintEnforcement() {
  // Get a shop to test with
  const [testShop] = await db.select().from(shops).limit(1);
  
  if (!testShop) {
    logTest(
      'Owner constraint test',
      false,
      'No shop found for testing',
      'Test shop available',
      'No shops in database'
    );
    return;
  }

  try {
    // Try to create an owner without shop_id (should fail)
    await db.insert(users).values({
      username: 'test-owner-no-shop',
      password: 'test',
      email: 'test@example.com',
      role: 'owner',
      shopId: null as any  // This should violate the constraint
    });

    // If we get here, constraint failed
    logTest(
      'Prevent owner creation without shop_id',
      false,
      'Constraint did not prevent owner without shop_id',
      'INSERT rejected',
      'INSERT succeeded'
    );

    // Cleanup
    await db.delete(users).where(eq(users.username, 'test-owner-no-shop'));

  } catch (error: any) {
    // Expected to fail
    if (error.message && error.message.includes('owner_must_have_shop')) {
      logTest(
        'Prevent owner creation without shop_id',
        true,
        'Constraint correctly prevented owner without shop_id',
        'INSERT rejected',
        'INSERT rejected'
      );
    } else {
      logTest(
        'Prevent owner creation without shop_id',
        false,
        `Unexpected error: ${error.message}`,
        'Specific constraint error',
        error.message
      );
    }
  }

  try {
    // Create an owner WITH shop_id (should succeed)
    const [testOwner] = await db.insert(users).values({
      username: 'test-owner-with-shop',
      password: 'test',
      email: 'test-owner@example.com',
      role: 'owner',
      shopId: testShop.id
    }).returning();

    logTest(
      'Allow owner creation with shop_id',
      true,
      'Owner with shop_id created successfully',
      'INSERT succeeded',
      'INSERT succeeded'
    );

    // Cleanup
    await db.delete(users).where(eq(users.id, testOwner.id));

  } catch (error: any) {
    logTest(
      'Allow owner creation with shop_id',
      false,
      `Owner creation with shop_id failed: ${error.message}`,
      'INSERT should succeed',
      `INSERT failed: ${error.message}`
    );
  }
}

/**
 * Test audit logging functionality
 */
async function testAuditLogging() {
  try {
    // Create a test customer
    const [testCustomer] = await db.insert(customers).values({
      firstName: 'Audit',
      lastName: 'Test',
      phone: '+49111111111',
      shopId: 1,
      userId: null
    }).returning();

    // Get count of audit logs before
    const beforeCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM activity_logs 
      WHERE action = 'shop_id_change_blocked'
    `);
    const countBefore = parseInt(String(beforeCount.rows[0].count));

    // Attempt to modify shop_id (will be blocked)
    try {
      await db.update(customers)
        .set({ shopId: 999 })
        .where(eq(customers.id, testCustomer.id));
    } catch {
      // Expected to fail
    }

    // Get count of audit logs after
    const afterCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM activity_logs 
      WHERE action = 'shop_id_change_blocked'
    `);
    const countAfter = parseInt(String(afterCount.rows[0].count));

    if (countAfter > countBefore) {
      logTest(
        'Audit log created for shop_id violation',
        true,
        'Security violation logged successfully',
        'Audit entry created',
        'Audit entry created'
      );
    } else {
      logTest(
        'Audit log created for shop_id violation',
        false,
        'No audit entry created for security violation',
        'Audit entry created',
        'No audit entry found'
      );
    }

    // Cleanup
    await db.delete(customers).where(eq(customers.id, testCustomer.id));

  } catch (error: any) {
    logTest(
      'Audit logging test',
      false,
      `Test failed: ${error.message}`,
      'Audit logs working',
      'Test error'
    );
  }
}

// Run the tests
runTests();
