// Fix Employee System Schema - Ensure all required columns exist
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixEmployeeSystemSchema() {
  console.log('🔧 Fixing Employee System Schema...');
  
  try {
    // 1. Ensure users table has required employee system columns
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
    `);

    // 2. Ensure customers table has correct created_by column (text instead of integer)
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Check if created_by is integer type and convert to text
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'customers' 
          AND column_name = 'created_by' 
          AND data_type = 'integer'
        ) THEN
          -- Drop the foreign key constraint first
          ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_created_by_users_id_fk;
          -- Convert column to text
          ALTER TABLE customers ALTER COLUMN created_by TYPE text USING COALESCE(created_by::text, 'SYSTEM');
        END IF;
      END $$;
    `);

    // 3. Ensure repairs table has correct created_by column (text instead of integer)
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Check if created_by is integer type and convert to text
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'repairs' 
          AND column_name = 'created_by' 
          AND data_type = 'integer'
        ) THEN
          -- Drop the foreign key constraint first
          ALTER TABLE repairs DROP CONSTRAINT IF EXISTS repairs_created_by_users_id_fk;
          -- Convert column to text
          ALTER TABLE repairs ALTER COLUMN created_by TYPE text USING COALESCE(created_by::text, 'SYSTEM');
        END IF;
      END $$;
    `);

    // 4. Ensure repair_status_history table has correct changed_by column (text instead of integer)
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Check if changed_by is integer type and convert to text
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'repair_status_history' 
          AND column_name = 'changed_by' 
          AND data_type = 'integer'
        ) THEN
          -- Drop the foreign key constraint first
          ALTER TABLE repair_status_history DROP CONSTRAINT IF EXISTS repair_status_history_changed_by_users_id_fk;
          -- Convert column to text
          ALTER TABLE repair_status_history ALTER COLUMN changed_by TYPE text USING COALESCE(changed_by::text, 'SYSTEM');
        END IF;
      END $$;
    `);

    // 5. Remove old createdBySource columns
    await db.execute(sql`ALTER TABLE customers DROP COLUMN IF EXISTS created_by_source;`);
    await db.execute(sql`ALTER TABLE repairs DROP COLUMN IF EXISTS created_by_source;`);
    await db.execute(sql`ALTER TABLE repair_status_history DROP COLUMN IF EXISTS changed_by_source;`);

    console.log('✅ Employee System Schema fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing Employee System Schema:', error);
    throw error;
  }
}

// Run the fix immediately
fixEmployeeSystemSchema()
  .then(() => {
    console.log('✅ Schema fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  });

export { fixEmployeeSystemSchema };