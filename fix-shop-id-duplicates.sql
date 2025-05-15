-- Manuelles Fixes für die spezifischen Benutzer mit Shop-ID 1
-- Basierend auf dem Ergebnis der vorherigen Abfrage wissen wir, dass es 4 Benutzer gibt:
-- bugi (ID 3), VIPhone Smartphone Service (ID 11), Mumi (ID 13) und Mumi2 (ID 14)

-- Zeige die aktuellen Benutzer mit Shop-ID 1 an
SELECT id, username, email, shop_id 
FROM users 
WHERE shop_id = 1
ORDER BY id;

-- bugi behält die ID 1, die anderen bekommen neue IDs

-- Hole die höchste bestehende Shop-ID
SELECT COALESCE(MAX(shop_id), 0) as max_shop_id FROM users WHERE shop_id IS NOT NULL;

-- Aktualisiere VIPhone Smartphone Service auf neue Shop-ID (max_shop_id + 1)
UPDATE users SET shop_id = 
  (SELECT COALESCE(MAX(shop_id), 0) + 1 FROM users WHERE shop_id IS NOT NULL) 
WHERE id = 11;

-- Aktualisiere Mumi auf neue Shop-ID (max_shop_id + 2)
UPDATE users SET shop_id = 
  (SELECT COALESCE(MAX(shop_id), 0) + 2 FROM users WHERE shop_id IS NOT NULL) 
WHERE id = 13;

-- Aktualisiere Mumi2 auf neue Shop-ID (max_shop_id + 3)
UPDATE users SET shop_id = 
  (SELECT COALESCE(MAX(shop_id), 0) + 3 FROM users WHERE shop_id IS NOT NULL) 
WHERE id = 14;

-- Überprüfe die Änderungen
SELECT id, username, email, shop_id 
FROM users 
WHERE id IN (3, 11, 13, 14)
ORDER BY id;

-- Überprüfe, ob noch Duplikate existieren
SELECT shop_id, COUNT(*) 
FROM users 
WHERE shop_id IS NOT NULL 
GROUP BY shop_id 
HAVING COUNT(*) > 1;

-- Wenn keine Duplikate mehr vorhanden sind, füge den Unique-Constraint hinzu
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count FROM (
    SELECT shop_id, COUNT(*) 
    FROM users 
    WHERE shop_id IS NOT NULL 
    GROUP BY shop_id 
    HAVING COUNT(*) > 1
  ) AS duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Es gibt noch % duplizierte Shop-IDs. Unique-Constraint wird nicht erstellt.', duplicate_count;
  ELSE
    -- Überprüfen, ob der Constraint bereits existiert
    IF NOT EXISTS (
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
      AND constraint_name = 'users_shop_id_unique'
    ) THEN
      -- Einschränkung hinzufügen
      ALTER TABLE users
      ADD CONSTRAINT users_shop_id_unique UNIQUE (shop_id)
      DEFERRABLE INITIALLY DEFERRED;
      RAISE NOTICE 'Unique-Constraint für Shop-IDs wurde hinzugefügt.';
    ELSE
      RAISE NOTICE 'Unique-Constraint für Shop-IDs existiert bereits.';
    END IF;
  END IF;
END $$;