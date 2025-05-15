
-- Skript zur Korrektur duplizierter Shop-IDs
-- Dieses SQL-Skript:
-- 1. Findet alle Benutzer mit duplizierter Shop-ID
-- 2. Aktualisiert die Shop-IDs der betroffenen Benutzer (außer dem ersten)
-- 3. Fügt eine Einschränkung hinzu, um zukünftige Duplikate zu verhindern

-- 1. Finde duplizierte Shop-IDs
WITH duplicated_shops AS (
  
SELECT shop_id, array_agg(id) as user_ids, count(*) as user_count
FROM users
WHERE shop_id IS NOT NULL
GROUP BY shop_id
HAVING count(*) > 1
ORDER BY shop_id;

),
max_shop_id AS (
  
SELECT COALESCE(MAX(shop_id), 0) as max_shop_id FROM users WHERE shop_id IS NOT NULL;

),
-- 2. Bereite die Aktualisierungen vor
shop_updates AS (
  SELECT 
    id,
    shop_id as old_shop_id,
    -- Berechne neue Shop-ID, indem wir mit der maximalen Shop-ID beginnen und für jeden Benutzer hochzählen
    (SELECT max_shop_id FROM max_shop_id) + ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY id) as new_shop_id
  FROM users
  JOIN duplicated_shops ON users.shop_id = duplicated_shops.shop_id::int
  -- Überspringe den ersten Benutzer jeder Gruppe, damit er seine Original-ID behalten kann
  WHERE id != (string_to_array(duplicated_shops.user_ids, ',')::int[])[1]
)
-- Führe die Aktualisierungen durch
UPDATE users
SET shop_id = shop_updates.new_shop_id
FROM shop_updates
WHERE users.id = shop_updates.id;

-- 3. Füge eine Einschränkung hinzu, um zukünftige Duplikate zu verhindern,
-- wenn die Einschränkung noch nicht existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'users'
    AND constraint_name = 'users_shop_id_unique'
  ) THEN
    
ALTER TABLE users
ADD CONSTRAINT users_shop_id_unique UNIQUE (shop_id)
DEFERRABLE INITIALLY DEFERRED;

  END IF;
END $$;
