-- Migration: Add shop_id constraints for multitenant security
-- Purpose: Enforce one-to-one relationship between shop owners and shops
-- Date: 2025-09-30

-- 1. Create partial unique index: Only shop owners can have unique shop_id
-- Employees and other roles can share shop_id with their owner
CREATE UNIQUE INDEX IF NOT EXISTS users_shop_id_unique_for_owners 
ON users(shop_id) 
WHERE role = 'owner' AND shop_id IS NOT NULL;

-- 2. Create trigger function to prevent shop_id changes for owners only
-- Allows employee transfers between shops
CREATE OR REPLACE FUNCTION prevent_owner_shop_id_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only prevent shop_id changes for owner role users
  IF NEW.role = 'owner' AND OLD.shop_id IS DISTINCT FROM NEW.shop_id THEN
    RAISE EXCEPTION 'shop_id cannot be changed for owner role. Current value: %, Attempted value: %', 
      OLD.shop_id, NEW.shop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger on users table
DROP TRIGGER IF EXISTS prevent_owner_shop_id_update_trigger ON users;
CREATE TRIGGER prevent_owner_shop_id_update_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_owner_shop_id_update();

COMMENT ON INDEX users_shop_id_unique_for_owners IS 'Ensures each shop has exactly one owner - prevents duplicate shop ownership';
COMMENT ON FUNCTION prevent_owner_shop_id_update() IS 'Prevents shop_id from being changed for owner role users';
COMMENT ON TRIGGER prevent_owner_shop_id_update_trigger ON users IS 'Enforces write-once behavior on shop_id for owners only, allows employee transfers';
