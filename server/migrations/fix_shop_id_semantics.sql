-- Migration: Fix shop_id semantics and add atomic sequence-based ID allocation
-- Purpose: Separate FK relationship (users.shop_id → shops.id) from tenant isolation ID
-- Date: 2025-10-01

-- 1. Create PostgreSQL sequence for atomic tenant_shop_id generation
CREATE SEQUENCE IF NOT EXISTS tenant_shop_id_seq START 1;

-- 2. Add tenant_shop_id column to users (immutable sequential ID for tenant isolation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_shop_id INTEGER UNIQUE;

-- 3. Backfill tenant_shop_id for existing users (copy from current shop_id)
-- This preserves existing tenant isolation IDs
UPDATE users 
SET tenant_shop_id = shop_id 
WHERE shop_id IS NOT NULL AND tenant_shop_id IS NULL;

-- 4. Update sequence to start after max tenant_shop_id
SELECT setval('tenant_shop_id_seq', COALESCE((SELECT MAX(tenant_shop_id) FROM users), 0) + 1);

-- 5. Drop shops.shop_id column (no longer needed - users.tenant_shop_id is the source of truth)
ALTER TABLE shops DROP COLUMN IF EXISTS shop_id;

-- 6. Add immutability trigger for tenant_shop_id
CREATE OR REPLACE FUNCTION prevent_tenant_shop_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tenant_shop_id IS NOT NULL AND NEW.tenant_shop_id IS DISTINCT FROM OLD.tenant_shop_id THEN
    RAISE EXCEPTION 'Security violation: tenant_shop_id cannot be modified after assignment (attempted change from % to %)', 
      OLD.tenant_shop_id, NEW.tenant_shop_id
    USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_tenant_shop_id_change_trigger ON users;
CREATE TRIGGER prevent_tenant_shop_id_change_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_shop_id_change();

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_shop_id ON users(tenant_shop_id);
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON users(shop_id);

-- 8. Add comments for documentation
COMMENT ON COLUMN users.shop_id IS 'Foreign key to shops.id (database entity ID)';
COMMENT ON COLUMN users.tenant_shop_id IS 'Immutable sequential ID for tenant database isolation (generated from tenant_shop_id_seq)';
COMMENT ON SEQUENCE tenant_shop_id_seq IS 'Atomic counter for tenant_shop_id allocation';
