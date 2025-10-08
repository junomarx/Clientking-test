import { Pool } from 'pg';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

/**
 * Database Security Module
 * 
 * Implements database-level security controls to prevent shop_id manipulation
 * and ensure tenant data isolation at the PostgreSQL level.
 */

export class DatabaseSecurityManager {
  /**
   * Apply all security measures to the unified (master) database
   * This includes triggers, constraints, and security policies
   */
  static async applySecurityMeasures(): Promise<void> {
    console.log('🔒 Applying database security measures...');
    
    try {
      await this.createShopIdImmutabilityTriggers();
      await this.createOwnershipConstraints();
      await this.createAuditTriggers();
      
      console.log('✅ All database security measures applied successfully');
    } catch (error) {
      console.error('❌ Failed to apply security measures:', error);
      throw error;
    }
  }

  /**
   * Create triggers to prevent shop_id modification after initial assignment
   * These triggers run on UPDATE operations to reject any shop_id changes
   */
  private static async createShopIdImmutabilityTriggers(): Promise<void> {
    console.log('  📌 Creating shop_id immutability triggers...');

    // Generic trigger function that prevents shop_id changes
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION prevent_shop_id_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.shop_id IS NOT NULL AND NEW.shop_id IS DISTINCT FROM OLD.shop_id THEN
          RAISE EXCEPTION 'Security violation: shop_id cannot be modified (attempted change from % to %)', 
            OLD.shop_id, NEW.shop_id
          USING ERRCODE = '23514'; -- check_violation
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Tables that have shop_id and need protection
    const potentialTables = [
      'customers',
      'repairs',
      'error_catalog_entries',
      'device_issues',
      'activity_logs',
      'spare_parts',
      'feedbacks',
      'email_templates',
      'email_log',
      'email_history',
      'device_types',
      'user_device_types',
      'user_brands',
      'model_lines',
      'user_models',
      'orders',
      'cost_estimates',
      'loaner_devices',
      'kiosk_devices',
      'kiosk_online_status',
      'password_reset_tokens'
    ];

    // Check which tables actually exist and have shop_id column
    const existingTables: string[] = [];
    
    for (const tableName of potentialTables) {
      try {
        const columnCheck = await db.execute(sql.raw(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
          AND column_name = 'shop_id'
        `));
        
        if (columnCheck.rows.length > 0) {
          existingTables.push(tableName);
        }
      } catch {
        // Table doesn't exist, skip it
      }
    }
    
    console.log(`    Found ${existingTables.length} tables with shop_id to protect`);

    for (const tableName of existingTables) {
      try {
        // Drop existing trigger if it exists
        await db.execute(sql.raw(`
          DROP TRIGGER IF EXISTS prevent_shop_id_change_trigger ON ${tableName}
        `));

        // Create trigger for each table
        await db.execute(sql.raw(`
          CREATE TRIGGER prevent_shop_id_change_trigger
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW
          EXECUTE FUNCTION prevent_shop_id_change()
        `));

        console.log(`    ✓ Protected ${tableName}`);
      } catch (error) {
        console.log(`    ⚠ Skipped ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('  ✅ Shop ID immutability triggers created');
  }

  /**
   * Create ownership and data integrity constraints
   */
  private static async createOwnershipConstraints(): Promise<void> {
    console.log('  📌 Creating ownership constraints...');

    // Check for existing violations before applying constraints
    const ownerViolations = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'owner' AND shop_id IS NULL
    `);
    const ownerViolationCount = parseInt(String(ownerViolations.rows[0].count));
    
    if (ownerViolationCount > 0) {
      console.log(`    ⚠ Found ${ownerViolationCount} owner(s) without shop_id - skipping owner constraint`);
      console.log(`      To enable: assign shop_id to all owners first`);
    } else {
      // Ensure users with 'owner' role have a shop_id
      try {
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'owner_must_have_shop'
            ) THEN
              ALTER TABLE users
              ADD CONSTRAINT owner_must_have_shop
              CHECK (role != 'owner' OR shop_id IS NOT NULL);
            END IF;
          END $$;
        `);
        console.log('    ✓ Owner shop_id requirement enforced');
      } catch (error) {
        console.log('    ⚠ Could not enforce owner constraint:', error instanceof Error ? error.message : String(error));
      }
    }

    // Check employee violations
    const employeeViolations = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'employee' AND shop_id IS NULL
    `);
    const employeeViolationCount = parseInt(String(employeeViolations.rows[0].count));
    
    if (employeeViolationCount > 0) {
      console.log(`    ⚠ Found ${employeeViolationCount} employee(s) without shop_id - skipping employee constraint`);
    } else {
      // Ensure employees have shop_id
      try {
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'employee_must_have_shop'
            ) THEN
              ALTER TABLE users
              ADD CONSTRAINT employee_must_have_shop
              CHECK (role != 'employee' OR shop_id IS NOT NULL);
            END IF;
          END $$;
        `);
        console.log('    ✓ Employee shop_id requirement enforced');
      } catch (error) {
        console.log('    ⚠ Could not enforce employee constraint:', error instanceof Error ? error.message : String(error));
      }
    }

    // Check kiosk violations
    const kioskViolations = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'kiosk' AND shop_id IS NULL
    `);
    const kioskViolationCount = parseInt(String(kioskViolations.rows[0].count));
    
    if (kioskViolationCount > 0) {
      console.log(`    ⚠ Found ${kioskViolationCount} kiosk user(s) without shop_id - skipping kiosk constraint`);
    } else {
      // Ensure kiosk users have shop_id
      try {
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'kiosk_must_have_shop'
            ) THEN
              ALTER TABLE users
              ADD CONSTRAINT kiosk_must_have_shop
              CHECK (role != 'kiosk' OR shop_id IS NOT NULL);
            END IF;
          END $$;
        `);
        console.log('    ✓ Kiosk shop_id requirement enforced');
      } catch (error) {
        console.log('    ⚠ Could not enforce kiosk constraint:', error instanceof Error ? error.message : String(error));
      }
    }

    console.log('  ✅ Ownership constraints processing complete');
  }

  /**
   * Create audit triggers to log shop_id manipulation attempts
   */
  private static async createAuditTriggers(): Promise<void> {
    console.log('  📌 Creating audit triggers...');

    // Audit logging trigger function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION audit_shop_id_attempt()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.shop_id IS NOT NULL AND NEW.shop_id IS DISTINCT FROM OLD.shop_id THEN
          -- Log the attempt in activity_logs
          INSERT INTO activity_logs (
            event_type,
            action,
            entity_type,
            entity_id,
            description,
            details,
            severity,
            created_at
          ) VALUES (
            'security',
            'shop_id_change_blocked',
            TG_TABLE_NAME,
            OLD.id,
            format('Blocked unauthorized shop_id change attempt on %s (id: %s)', TG_TABLE_NAME, OLD.id),
            jsonb_build_object(
              'old_shop_id', OLD.shop_id,
              'attempted_shop_id', NEW.shop_id,
              'table_name', TG_TABLE_NAME
            ),
            'critical',
            NOW()
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Apply audit trigger to critical tables
    const criticalTables = ['users', 'customers', 'repairs'];
    
    for (const tableName of criticalTables) {
      // Drop existing audit trigger if it exists
      await db.execute(sql.raw(`
        DROP TRIGGER IF EXISTS audit_shop_id_attempt_trigger ON ${tableName}
      `));

      // Create audit trigger (runs BEFORE the prevention trigger)
      await db.execute(sql.raw(`
        CREATE TRIGGER audit_shop_id_attempt_trigger
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION audit_shop_id_attempt()
      `));

      console.log(`    ✓ Audit logging enabled for ${tableName}`);
    }

    console.log('  ✅ Audit triggers created');
  }

  /**
   * Remove all security measures (for rollback/testing)
   */
  static async removeSecurityMeasures(): Promise<void> {
    console.log('🔓 Removing database security measures...');

    try {
      // Drop all triggers
      const tables = [
        'customers', 'repairs', 'error_catalog_entries', 'device_issues',
        'activity_logs', 'spare_parts', 'feedbacks', 'email_templates',
        'email_log', 'device_types', 'user_brands', 'model_lines',
        'user_models', 'orders', 'cost_estimates', 'loaner_devices',
        'kiosk_devices', 'kiosk_online_status', 'password_reset_tokens',
        'users'
      ];

      for (const table of tables) {
        await db.execute(sql.raw(`
          DROP TRIGGER IF EXISTS prevent_shop_id_change_trigger ON ${table};
          DROP TRIGGER IF EXISTS audit_shop_id_attempt_trigger ON ${table};
        `));
      }

      // Drop trigger functions
      await db.execute(sql`DROP FUNCTION IF EXISTS prevent_shop_id_change() CASCADE`);
      await db.execute(sql`DROP FUNCTION IF EXISTS audit_shop_id_attempt() CASCADE`);

      // Remove constraints
      await db.execute(sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS owner_must_have_shop`);
      await db.execute(sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS employee_must_have_shop`);
      await db.execute(sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS kiosk_must_have_shop`);

      console.log('✅ All security measures removed');
    } catch (error) {
      console.error('❌ Failed to remove security measures:', error);
      throw error;
    }
  }

  /**
   * Verify that security measures are active
   */
  static async verifySecurityMeasures(): Promise<{
    triggersActive: boolean;
    constraintsActive: boolean;
    auditingActive: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let triggersActive = true;
    let constraintsActive = true;
    let auditingActive = true;

    try {
      // Check for trigger function
      const triggerFunc = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM pg_proc 
        WHERE proname = 'prevent_shop_id_change'
      `);
      
      if (triggerFunc.rows[0].count === 0) {
        triggersActive = false;
        details.push('❌ Shop ID immutability trigger function not found');
      } else {
        details.push('✅ Shop ID immutability trigger function exists');
      }

      // Check for audit function
      const auditFunc = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM pg_proc 
        WHERE proname = 'audit_shop_id_attempt'
      `);
      
      if (auditFunc.rows[0].count === 0) {
        auditingActive = false;
        details.push('❌ Audit trigger function not found');
      } else {
        details.push('✅ Audit trigger function exists');
      }

      // Check for constraints
      const constraints = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM pg_constraint 
        WHERE conname IN ('owner_must_have_shop', 'employee_must_have_shop', 'kiosk_must_have_shop')
      `);
      
      const constraintCount = parseInt(String(constraints.rows[0].count));
      if (constraintCount === 0) {
        constraintsActive = false;
        details.push(`❌ No ownership constraints active (found ${constraintCount}/3)`);
      } else if (constraintCount < 3) {
        // Partial constraints = incomplete protection
        constraintsActive = false;
        details.push(`⚠️  INCOMPLETE: Only ${constraintCount}/3 ownership constraints active`);
        details.push(`   Missing constraints leave tenant isolation incomplete`);
      } else {
        details.push('✅ All ownership constraints active (3/3)');
      }

      // Count active triggers
      const triggers = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM pg_trigger 
        WHERE tgname LIKE '%shop_id%'
      `);
      
      details.push(`✅ ${triggers.rows[0].count} shop_id protection triggers active`);

      return {
        triggersActive,
        constraintsActive,
        auditingActive,
        details
      };
    } catch (error) {
      details.push(`❌ Error verifying security: ${error instanceof Error ? error.message : String(error)}`);
      return {
        triggersActive: false,
        constraintsActive: false,
        auditingActive: false,
        details
      };
    }
  }
}

/**
 * Standalone script execution support
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'apply':
          await DatabaseSecurityManager.applySecurityMeasures();
          break;
        case 'remove':
          await DatabaseSecurityManager.removeSecurityMeasures();
          break;
        case 'verify':
          const result = await DatabaseSecurityManager.verifySecurityMeasures();
          console.log('\n📊 Security Status:');
          result.details.forEach(detail => console.log(detail));
          console.log(`\n Overall Status: ${
            result.triggersActive && result.constraintsActive && result.auditingActive
              ? '✅ SECURE' 
              : '⚠️  INCOMPLETE'
          }`);
          break;
        default:
          console.log('Usage: tsx server/tenancy/databaseSecurity.ts [apply|remove|verify]');
          process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
