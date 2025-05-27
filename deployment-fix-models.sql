-- Deployment-Fix: Gerätemodelle für alle Benutzer verfügbar machen
-- Löst das Problem der leeren Modell-Listen im Deployment

-- Überprüfung: Wie viele Modelle gibt es aktuell?
SELECT 'Aktuelle Modell-Anzahl:' as status, COUNT(*) as anzahl FROM user_models;

-- 1. Alle Gerätetypen vom Superadmin für alle neuen Benutzer kopieren
INSERT INTO user_device_types (name, user_id, created_at, updated_at)
SELECT DISTINCT 
    udt.name,
    u.id as user_id,
    NOW() as created_at,
    NOW() as updated_at
FROM user_device_types udt
CROSS JOIN (SELECT id FROM users WHERE is_superadmin = false AND is_active = true) u
WHERE udt.user_id = (SELECT id FROM users WHERE is_superadmin = true LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM user_device_types udt2 
    WHERE udt2.user_id = u.id AND udt2.name = udt.name
);

-- 2. Alle Marken vom Superadmin für alle neuen Benutzer kopieren
INSERT INTO user_brands (name, device_type_id, user_id, created_at, updated_at)
SELECT DISTINCT
    ub.name,
    -- Finde die entsprechende device_type_id für den Zielbenutzer
    (SELECT udt_target.id 
     FROM user_device_types udt_target 
     JOIN user_device_types udt_source ON udt_source.name = udt_target.name
     WHERE udt_source.id = ub.device_type_id 
     AND udt_target.user_id = u.id 
     LIMIT 1) as device_type_id,
    u.id as user_id,
    NOW() as created_at,
    NOW() as updated_at
FROM user_brands ub
CROSS JOIN (SELECT id FROM users WHERE is_superadmin = false AND is_active = true) u
WHERE ub.user_id = (SELECT id FROM users WHERE is_superadmin = true LIMIT 1)
AND EXISTS (
    -- Stelle sicher, dass der Gerätetyp für den Zielbenutzer existiert
    SELECT 1 FROM user_device_types udt_target 
    JOIN user_device_types udt_source ON udt_source.name = udt_target.name
    WHERE udt_source.id = ub.device_type_id AND udt_target.user_id = u.id
)
AND NOT EXISTS (
    SELECT 1 FROM user_brands ub2 
    WHERE ub2.user_id = u.id 
    AND ub2.name = ub.name 
    AND ub2.device_type_id = (
        SELECT udt_target.id 
        FROM user_device_types udt_target 
        JOIN user_device_types udt_source ON udt_source.name = udt_target.name
        WHERE udt_source.id = ub.device_type_id 
        AND udt_target.user_id = u.id 
        LIMIT 1
    )
);

-- 3. Alle Modelle vom Superadmin für alle neuen Benutzer kopieren
INSERT INTO user_models (name, brand_id, user_id, created_at, updated_at)
SELECT DISTINCT
    um.name,
    -- Finde die entsprechende brand_id für den Zielbenutzer
    (SELECT ub_target.id 
     FROM user_brands ub_target 
     JOIN user_brands ub_source ON ub_source.name = ub_target.name
     JOIN user_device_types udt_target ON udt_target.id = ub_target.device_type_id
     JOIN user_device_types udt_source ON udt_source.name = udt_target.name AND udt_source.id = ub_source.device_type_id
     WHERE ub_source.id = um.brand_id 
     AND ub_target.user_id = u.id 
     LIMIT 1) as brand_id,
    u.id as user_id,
    NOW() as created_at,
    NOW() as updated_at
FROM user_models um
CROSS JOIN (SELECT id FROM users WHERE is_superadmin = false AND is_active = true) u
WHERE um.user_id = (SELECT id FROM users WHERE is_superadmin = true LIMIT 1)
AND EXISTS (
    -- Stelle sicher, dass die Marke für den Zielbenutzer existiert
    SELECT 1 FROM user_brands ub_target 
    JOIN user_brands ub_source ON ub_source.name = ub_target.name
    JOIN user_device_types udt_target ON udt_target.id = ub_target.device_type_id
    JOIN user_device_types udt_source ON udt_source.name = udt_target.name AND udt_source.id = ub_source.device_type_id
    WHERE ub_source.id = um.brand_id AND ub_target.user_id = u.id
)
AND NOT EXISTS (
    SELECT 1 FROM user_models um2 
    WHERE um2.user_id = u.id 
    AND um2.name = um.name 
    AND um2.brand_id = (
        SELECT ub_target.id 
        FROM user_brands ub_target 
        JOIN user_brands ub_source ON ub_source.name = ub_target.name
        JOIN user_device_types udt_target ON udt_target.id = ub_target.device_type_id
        JOIN user_device_types udt_source ON udt_source.name = udt_target.name AND udt_source.id = ub_source.device_type_id
        WHERE ub_source.id = um.brand_id 
        AND ub_target.user_id = u.id 
        LIMIT 1
    )
);

-- Abschließende Überprüfung
SELECT 'Nach Migration - Gerätetypen pro Benutzer:' as status;
SELECT u.username, COUNT(udt.id) as geraetetypen_anzahl
FROM users u
LEFT JOIN user_device_types udt ON u.id = udt.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username
ORDER BY u.username;

SELECT 'Nach Migration - Marken pro Benutzer:' as status;
SELECT u.username, COUNT(ub.id) as marken_anzahl
FROM users u
LEFT JOIN user_brands ub ON u.id = ub.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username
ORDER BY u.username;

SELECT 'Nach Migration - Modelle pro Benutzer:' as status;
SELECT u.username, COUNT(um.id) as modelle_anzahl
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.is_active = true
GROUP BY u.id, u.username
ORDER BY u.username;