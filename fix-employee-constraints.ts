// Fix Employee System Constraints
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixEmployeeConstraints() {
  console.log('🔧 Fixing Employee System Constraints...');
  
  try {
    // Drop all foreign key constraints that reference users.id for audit fields
    const constraintsToDropQueries = [
      `ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_created_by_users_id_fk;`,
      `ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_created_by_fkey;`,
      `ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_created_by_users_id_fk;`,
      `ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_created_by_fkey;`,
      `ALTER TABLE repair_status_history DROP CONSTRAINT IF EXISTS repair_status_history_changed_by_users_id_fk;`,
      `ALTER TABLE repair_status_history DROP CONSTRAINT IF EXISTS repair_status_history_changed_by_fkey;`,
    ];

    for (const query of constraintsToDropQueries) {
      try {
        await db.execute(sql.raw(query));
        console.log(`✅ Dropped constraint: ${query}`);
      } catch (error) {
        console.log(`ℹ️ Constraint not found or already dropped: ${query}`);
      }
    }

    // Now safely convert columns to text
    const columnConversions = [
      `ALTER TABLE customers ALTER COLUMN created_by TYPE text USING COALESCE(created_by::text, 'SYSTEM');`,
      `ALTER TABLE repairs ALTER COLUMN created_by TYPE text USING COALESCE(created_by::text, 'SYSTEM');`,
      `ALTER TABLE repair_status_history ALTER COLUMN changed_by TYPE text USING COALESCE(changed_by::text, 'SYSTEM');`,
    ];

    for (const query of columnConversions) {
      try {
        await db.execute(sql.raw(query));
        console.log(`✅ Converted column: ${query}`);
      } catch (error) {
        console.log(`ℹ️ Column already correct type: ${query}`);
      }
    }

    // Drop old columns
    const columnsToDropQueries = [
      `ALTER TABLE customers DROP COLUMN IF EXISTS created_by_source;`,
      `ALTER TABLE repairs DROP COLUMN IF EXISTS created_by_source;`,
      `ALTER TABLE repair_status_history DROP COLUMN IF EXISTS changed_by_source;`,
    ];

    for (const query of columnsToDropQueries) {
      try {
        await db.execute(sql.raw(query));
        console.log(`✅ Dropped column: ${query}`);
      } catch (error) {
        console.log(`ℹ️ Column not found: ${query}`);
      }
    }

    console.log('✅ Employee System Constraints fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing Employee System Constraints:', error);
    throw error;
  }
}

// Run the fix immediately
fixEmployeeConstraints()
  .then(() => {
    console.log('✅ Constraint fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Constraint fix failed:', error);
    process.exit(1);
  });

export { fixEmployeeConstraints };