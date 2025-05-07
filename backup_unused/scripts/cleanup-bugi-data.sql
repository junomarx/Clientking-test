-- Umfassendes SQL-Skript zum Löschen aller Daten von Benutzer "bugi" (id = 3)

-- 1. Bestimme die shop_id von Benutzer "bugi"
DO $$
DECLARE
    bugi_shop_id INT;
BEGIN
    -- Hole die shop_id von bugi
    SELECT shop_id INTO bugi_shop_id FROM users WHERE id = 3;
    
    -- Lösche abhängige Daten in der richtigen Reihenfolge
    
    -- 1. Lösche user_models
    DELETE FROM user_models WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte user_models: %', FOUND;
    
    -- 2. Lösche user_model_series
    DELETE FROM user_model_series WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte user_model_series: %', FOUND;
    
    -- 3. Lösche user_brands
    DELETE FROM user_brands WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte user_brands: %', FOUND;
    
    -- 4. Lösche user_device_types
    DELETE FROM user_device_types WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte user_device_types: %', FOUND;
    
    -- 5. Lösche device_issues
    DELETE FROM device_issues WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte device_issues: %', FOUND;
    
    -- 6. Lösche global_device_models
    DELETE FROM global_device_models WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte global_device_models: %', FOUND;
    
    -- 7. Lösche global_device_brands
    DELETE FROM global_device_brands WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte global_device_brands: %', FOUND;
    
    -- 8. Lösche global_device_types
    DELETE FROM global_device_types WHERE user_id = 3 OR shop_id = bugi_shop_id;
    RAISE NOTICE 'Gelöschte global_device_types: %', FOUND;
    
    -- Zusammenfassung
    RAISE NOTICE 'Bereinigung abgeschlossen. Alle von "bugi" (id = 3) erstellten Daten wurden gelöscht.';
END;
$$;