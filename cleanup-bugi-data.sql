-- Dieses Skript bereinigt alle von Benutzer "bugi" (ID 3) erstellten Daten in der Geräteverwaltung
-- Reihenfolge der Löschung:
-- 1. Modelle (user_models)
-- 2. Modellserien (user_model_series)
-- 3. Marken (user_brands)
-- 4. Nicht-Standard Gerätetypen (user_device_types)
-- 5. Konvertierung der Standard-Gerätetypen zu globalen Typen

BEGIN;

-- Alle Modelle von Bugi löschen
DELETE FROM user_models WHERE user_id = 3;

-- Alle Modellserien von Bugi löschen
DELETE FROM user_model_series WHERE user_id = 3;

-- Alle Marken von Bugi löschen
DELETE FROM user_brands WHERE user_id = 3;

-- Alle Nicht-Standard Gerätetypen von Bugi löschen
DELETE FROM user_device_types 
WHERE user_id = 3 
AND name NOT IN ('Smartphone', 'Tablet', 'Laptop', 'Watch');

-- Konvertiere Standard-Gerätetypen zum Superadmin-Benutzer (macnphone, ID 10, Shop 0)
UPDATE user_device_types
SET user_id = 10, shop_id = 0, updated_at = NOW()
WHERE user_id = 3
AND name IN ('Smartphone', 'Tablet', 'Laptop', 'Watch');

COMMIT;