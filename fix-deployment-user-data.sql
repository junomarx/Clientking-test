-- Deployment-Fix: Benutzerdaten-Synchronisation
-- Behebt Probleme mit inaktiven Benutzern und leeren Unternehmensdaten im Deployment

-- 1. DIAGNOSE: Aktuelle Benutzerdaten analysieren
SELECT 'DIAGNOSE - Alle Benutzer:' as status;
SELECT 
    id,
    username,
    email,
    is_active,
    shop_id,
    company_name,
    owner_first_name,
    owner_last_name,
    street_address,
    city,
    zip_code
FROM users 
WHERE id > 10  -- Nicht-Superadmin-Benutzer
ORDER BY id;

-- 2. DIAGNOSE: Business Settings Zuordnung
SELECT 'DIAGNOSE - Business Settings:' as status;
SELECT 
    bs.id,
    bs.user_id,
    bs.shop_id,
    bs.business_name,
    bs.owner_first_name,
    bs.owner_last_name,
    u.username,
    u.is_active
FROM business_settings bs
LEFT JOIN users u ON bs.user_id = u.id
ORDER BY bs.user_id;

-- 3. FIX: Benutzer aktivieren, die Unternehmensdaten haben
UPDATE users 
SET is_active = true
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM business_settings 
    WHERE business_name IS NOT NULL 
    AND business_name != ''
)
AND is_active = false;

-- 4. FIX: Shop-IDs für aktive Benutzer ohne Shop-ID generieren
WITH max_shop AS (
    SELECT COALESCE(MAX(shop_id), 0) as max_id FROM users WHERE shop_id IS NOT NULL
)
UPDATE users 
SET shop_id = max_shop.max_id + ROW_NUMBER() OVER (ORDER BY id)
FROM max_shop
WHERE shop_id IS NULL 
AND is_active = true 
AND id > 10;  -- Nicht den Superadmin ändern

-- 5. FIX: Business Settings für Benutzer ohne Einstellungen erstellen
INSERT INTO business_settings (
    user_id,
    shop_id,
    business_name,
    owner_first_name,
    owner_last_name,
    street_address,
    city,
    zip_code,
    country,
    phone,
    email,
    tax_id,
    website,
    created_at,
    updated_at
)
SELECT 
    u.id,
    u.shop_id,
    COALESCE(u.company_name, u.username || ' Handyshop'),
    COALESCE(u.owner_first_name, 'Inhaber'),
    COALESCE(u.owner_last_name, u.username),
    COALESCE(u.street_address, 'Musterstraße 1'),
    COALESCE(u.city, 'Musterstadt'),
    COALESCE(u.zip_code, '12345'),
    COALESCE(u.country, 'Österreich'),
    COALESCE(u.company_phone, '+43 000 000000'),
    u.email,
    COALESCE(u.tax_id, 'ATU00000000'),
    COALESCE(u.website, 'https://' || u.username || '.at'),
    NOW(),
    NOW()
FROM users u
WHERE u.is_active = true 
AND u.id > 10
AND NOT EXISTS (
    SELECT 1 FROM business_settings bs WHERE bs.user_id = u.id
);

-- 6. FIX: Bestehende Business Settings aktualisieren falls leer
UPDATE business_settings
SET 
    business_name = CASE 
        WHEN business_name IS NULL OR business_name = '' 
        THEN (SELECT COALESCE(company_name, username || ' Handyshop') FROM users WHERE id = business_settings.user_id)
        ELSE business_name 
    END,
    owner_first_name = CASE 
        WHEN owner_first_name IS NULL OR owner_first_name = '' 
        THEN (SELECT COALESCE(owner_first_name, 'Inhaber') FROM users WHERE id = business_settings.user_id)
        ELSE owner_first_name 
    END,
    owner_last_name = CASE 
        WHEN owner_last_name IS NULL OR owner_last_name = '' 
        THEN (SELECT COALESCE(owner_last_name, username) FROM users WHERE id = business_settings.user_id)
        ELSE owner_last_name 
    END,
    street_address = CASE 
        WHEN street_address IS NULL OR street_address = '' 
        THEN (SELECT COALESCE(street_address, 'Musterstraße 1') FROM users WHERE id = business_settings.user_id)
        ELSE street_address 
    END,
    city = CASE 
        WHEN city IS NULL OR city = '' 
        THEN (SELECT COALESCE(city, 'Musterstadt') FROM users WHERE id = business_settings.user_id)
        ELSE city 
    END,
    zip_code = CASE 
        WHEN zip_code IS NULL OR zip_code = '' 
        THEN (SELECT COALESCE(zip_code, '12345') FROM users WHERE id = business_settings.user_id)
        ELSE zip_code 
    END,
    country = CASE 
        WHEN country IS NULL OR country = '' 
        THEN (SELECT COALESCE(country, 'Österreich') FROM users WHERE id = business_settings.user_id)
        ELSE country 
    END,
    phone = CASE 
        WHEN phone IS NULL OR phone = '' 
        THEN (SELECT COALESCE(company_phone, '+43 000 000000') FROM users WHERE id = business_settings.user_id)
        ELSE phone 
    END,
    email = CASE 
        WHEN email IS NULL OR email = '' 
        THEN (SELECT email FROM users WHERE id = business_settings.user_id)
        ELSE email 
    END,
    tax_id = CASE 
        WHEN tax_id IS NULL OR tax_id = '' 
        THEN (SELECT COALESCE(tax_id, 'ATU00000000') FROM users WHERE id = business_settings.user_id)
        ELSE tax_id 
    END,
    website = CASE 
        WHEN website IS NULL OR website = '' 
        THEN (SELECT COALESCE(website, 'https://' || username || '.at') FROM users WHERE id = business_settings.user_id)
        ELSE website 
    END,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM users WHERE is_active = true AND id > 10
);

-- 7. VERIFIKATION: Finale Überprüfung
SELECT 'NACH DER REPARATUR - Benutzer:' as status;
SELECT 
    u.id,
    u.username,
    u.email,
    u.is_active,
    u.shop_id,
    bs.business_name,
    bs.owner_first_name,
    bs.owner_last_name
FROM users u
LEFT JOIN business_settings bs ON u.id = bs.user_id
WHERE u.id > 10
ORDER BY u.id;

-- 8. STATISTIKEN
SELECT 'STATISTIKEN:' as status;
SELECT 
    'Aktive Benutzer' as typ,
    COUNT(*) as anzahl
FROM users 
WHERE is_active = true AND id > 10

UNION ALL

SELECT 
    'Business Settings' as typ,
    COUNT(*) as anzahl
FROM business_settings bs
JOIN users u ON bs.user_id = u.id
WHERE u.is_active = true AND u.id > 10

UNION ALL

SELECT 
    'Benutzer mit Shop-ID' as typ,
    COUNT(*) as anzahl
FROM users 
WHERE shop_id IS NOT NULL AND is_active = true AND id > 10;