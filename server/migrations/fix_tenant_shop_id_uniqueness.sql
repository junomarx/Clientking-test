-- Migration: Fix tenant_shop_id uniqueness constraint  
-- Purpose: tenant_shop_id is NOT unique (multiple users share the same tenant)
-- Date: 2025-10-01

-- 1. Drop incorrect UNIQUE constraint on tenant_shop_id
-- Multiple users (owner + employees) share the same tenant_shop_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_shop_id_key;

-- 2. Ensure tenant_shop_id is properly backfilled (without unique violation)
UPDATE users 
SET tenant_shop_id = shop_id 
WHERE shop_id IS NOT NULL AND tenant_shop_id IS NULL;

-- 3. tenant_shop_id index already exists from previous migration (non-unique, good)

-- 4. Add partial unique constraint: Only shop owners can have unique tenant_shop_id
-- Employees and other roles can share tenant_shop_id with their owner
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_shop_id_unique_for_owners
ON users(tenant_shop_id)
WHERE role = 'owner' AND tenant_shop_id IS NOT NULL;

-- 5. Update comments
COMMENT ON COLUMN users.tenant_shop_id IS 'Immutable sequential ID for tenant database isolation (shared by all users in same tenant: owner + employees)';
COMMENT ON INDEX users_tenant_shop_id_unique_for_owners IS 'Ensures each tenant_shop_id has exactly one owner - employees can share with their owner';
