-- PRODUKTIONS-DEPLOYMENT-FIX
-- Dieses Skript behebt die Benutzerdaten-Probleme im Deployment

-- SCHRITT 1: Diagnose der aktuellen Situation
SELECT 'AKTUELLER STATUS - Alle Benutzer:' as info;
SELECT 
    id, username, email, is_active, shop_id, 
    company_name, owner_first_name, owner_last_name
FROM users 
WHERE id > 1 
ORDER BY id;

-- SCHRITT 2: Alle registrierten Benutzer aktivieren (außer explizit deaktivierte)
UPDATE users 
SET is_active = true
WHERE is_active = false 
AND id > 1  -- Nicht system-user ändern
AND (
    company_name IS NOT NULL 
    OR email LIKE '%@%'  -- Gültige E-Mail vorhanden
);

-- SCHRITT 3: Shop-IDs für Benutzer ohne Shop-ID generieren
WITH next_shop_id AS (
    SELECT COALESCE(MAX(shop_id), 0) + 1 as start_id 
    FROM users 
    WHERE shop_id IS NOT NULL
),
user_ranks AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 as rank_num
    FROM users 
    WHERE shop_id IS NULL AND is_active = true AND id > 1
)
UPDATE users 
SET shop_id = next_shop_id.start_id + user_ranks.rank_num
FROM next_shop_id, user_ranks
WHERE users.id = user_ranks.id;

-- SCHRITT 4: Business Settings für Benutzer ohne Einstellungen erstellen
INSERT INTO business_settings (
    user_id, shop_id, business_name, owner_first_name, owner_last_name,
    street_address, city, zip_code, country, phone, email, tax_id, website,
    created_at, updated_at
)
SELECT 
    u.id,
    u.shop_id,
    COALESCE(u.company_name, u.username || ' Shop'),
    COALESCE(u.owner_first_name, 'Inhaber'),
    COALESCE(u.owner_last_name, u.username),
    COALESCE(u.street_address, 'Geschäftsstraße 1'),
    COALESCE(u.city, 'Wien'),
    COALESCE(u.zip_code, '1010'),
    COALESCE(u.country, 'Österreich'),
    COALESCE(u.company_phone, '+43 1 000 0000'),
    u.email,
    COALESCE(u.tax_id, 'ATU12345678'),
    COALESCE(u.website, 'https://www.' || u.username || '.at'),
    NOW(),
    NOW()
FROM users u
WHERE u.is_active = true 
AND u.id > 1
AND u.shop_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM business_settings bs WHERE bs.user_id = u.id
);

-- SCHRITT 5: Leere Business Settings auffüllen
UPDATE business_settings bs
SET 
    business_name = CASE 
        WHEN business_name IS NULL OR TRIM(business_name) = '' 
        THEN (SELECT COALESCE(company_name, username || ' Shop') FROM users WHERE id = bs.user_id)
        ELSE business_name 
    END,
    owner_first_name = CASE 
        WHEN owner_first_name IS NULL OR TRIM(owner_first_name) = '' 
        THEN (SELECT COALESCE(owner_first_name, 'Inhaber') FROM users WHERE id = bs.user_id)
        ELSE owner_first_name 
    END,
    owner_last_name = CASE 
        WHEN owner_last_name IS NULL OR TRIM(owner_last_name) = '' 
        THEN (SELECT COALESCE(owner_last_name, username) FROM users WHERE id = bs.user_id)
        ELSE owner_last_name 
    END,
    street_address = CASE 
        WHEN street_address IS NULL OR TRIM(street_address) = '' 
        THEN 'Geschäftsstraße 1'
        ELSE street_address 
    END,
    city = CASE 
        WHEN city IS NULL OR TRIM(city) = '' 
        THEN 'Wien'
        ELSE city 
    END,
    zip_code = CASE 
        WHEN zip_code IS NULL OR TRIM(zip_code) = '' 
        THEN '1010'
        ELSE zip_code 
    END,
    country = CASE 
        WHEN country IS NULL OR TRIM(country) = '' 
        THEN 'Österreich'
        ELSE country 
    END,
    phone = CASE 
        WHEN phone IS NULL OR TRIM(phone) = '' 
        THEN '+43 1 000 0000'
        ELSE phone 
    END,
    tax_id = CASE 
        WHEN tax_id IS NULL OR TRIM(tax_id) = '' 
        THEN 'ATU12345678'
        ELSE tax_id 
    END,
    website = CASE 
        WHEN website IS NULL OR TRIM(website) = '' 
        THEN (SELECT 'https://www.' || username || '.at' FROM users WHERE id = bs.user_id)
        ELSE website 
    END,
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM users u WHERE u.id = bs.user_id AND u.is_active = true AND u.id > 1
);

-- FINAL: Überprüfung der Reparatur
SELECT 'NACH DER REPARATUR:' as info;
SELECT 
    u.id, u.username, u.is_active, u.shop_id,
    bs.business_name, bs.owner_first_name, bs.owner_last_name,
    CASE 
        WHEN bs.id IS NULL THEN 'FEHLT BUSINESS SETTINGS'
        WHEN bs.business_name IS NULL OR TRIM(bs.business_name) = '' THEN 'LEERE DATEN'
        ELSE 'OK'
    END as status
FROM users u
LEFT JOIN business_settings bs ON u.id = bs.user_id
WHERE u.id > 1
ORDER BY u.id;