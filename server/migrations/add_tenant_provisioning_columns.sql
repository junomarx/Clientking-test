-- Migration: Add tenant provisioning tracking and shop_id mapping columns
-- Purpose: Track tenant database provisioning status and create shop_id mapping for tenant isolation
-- Date: 2025-10-01

-- 1. Add shopId column to shops table for reserved sequential shop_id
-- This creates the mapping: shops.id (auto-increment) → shops.shop_id (reserved sequential)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shop_id INTEGER UNIQUE;

-- 2. Backfill shop_id for existing shops (match their DB id)
UPDATE shops SET shop_id = id WHERE shop_id IS NULL;

-- 3. Add tenant provisioning status columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_provisioned BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_provisioned_at TIMESTAMP;

-- 4. Add index on shop_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_shops_shop_id ON shops(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_provisioned ON users(tenant_provisioned) WHERE tenant_provisioned = false;

-- 5. Add comments for documentation
COMMENT ON COLUMN shops.shop_id IS 'Reserved sequential shop ID for tenant isolation (users.shop_id references this)';
COMMENT ON COLUMN users.tenant_provisioned IS 'Whether tenant database has been provisioned for this shop owner';
COMMENT ON COLUMN users.tenant_provisioned_at IS 'Timestamp when tenant database was successfully provisioned';
