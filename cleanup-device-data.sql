-- Bereinigungsskript für Gerätedaten
-- Behält nur Gerätetypen, Marken und Modelle, die vom Superadmin (Shop-ID 1682) erstellt wurden

-- 1. Lösche alle Modelle, die nicht zu Marken gehören, die vom Superadmin (Shop-ID 1682) stammen
DELETE FROM user_models 
WHERE brand_id NOT IN (
    SELECT id FROM user_brands 
    WHERE shop_id = 1682 OR user_id = 10
);

-- 2. Lösche alle Marken, die nicht vom Superadmin (Shop-ID 1682) stammen
DELETE FROM user_brands 
WHERE NOT (shop_id = 1682 OR user_id = 10);

-- 3. Lösche alle Gerätetypen, die nicht vom Superadmin (Shop-ID 1682) stammen
DELETE FROM user_device_types 
WHERE NOT (shop_id = 1682 OR user_id = 10);

-- 4. Lösche alle Modellserien, die nicht mehr zu existierenden Modellen gehören
DELETE FROM user_model_series 
WHERE model_id NOT IN (
    SELECT id FROM user_models
);

-- 5. Lösche alle versteckten Standard-Gerätetypen, die nicht mehr zu existierenden Gerätetypen gehören
DELETE FROM hidden_standard_device_types 
WHERE device_type_id NOT IN (
    SELECT id FROM user_device_types
);

-- 6. Lösche alle Gerätefehler, die nicht mehr zu existierenden Gerätetypen gehören
DELETE FROM device_issues 
WHERE device_type_id NOT IN (
    SELECT id FROM user_device_types
);

-- 7. Lösche alle Fehlerkatalogeintragungen, die nicht mehr zu existierenden Gerätefehlern gehören
DELETE FROM error_catalog_entries 
WHERE device_issue_id NOT IN (
    SELECT id FROM device_issues
);

-- Statusausgabe
SELECT 
    (SELECT COUNT(*) FROM user_device_types) as remaining_device_types,
    (SELECT COUNT(*) FROM user_brands) as remaining_brands,
    (SELECT COUNT(*) FROM user_models) as remaining_models,
    (SELECT COUNT(*) FROM user_model_series) as remaining_model_series,
    (SELECT COUNT(*) FROM device_issues) as remaining_device_issues,
    (SELECT COUNT(*) FROM error_catalog_entries) as remaining_error_catalog_entries;