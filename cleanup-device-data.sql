-- BEREINIGUNG: Alle Gerätedaten außer Shop-ID 1682 löschen
-- und sicherstellen, dass alle Benutzer auf die globalen Daten zugreifen

-- SCHRITT 1: Diagnose - Zeige aktuelle Verteilung
SELECT 'VORHER - Gerätetypen pro Shop:' as info;
SELECT user_id, COUNT(*) as anzahl_typen 
FROM user_device_types 
GROUP BY user_id 
ORDER BY user_id;

SELECT 'VORHER - Marken pro Shop:' as info;
SELECT user_id, COUNT(*) as anzahl_marken 
FROM user_brands 
GROUP BY user_id 
ORDER BY user_id;

SELECT 'VORHER - Modelle pro Shop:' as info;
SELECT user_id, COUNT(*) as anzahl_modelle 
FROM user_models 
GROUP BY user_id 
ORDER BY user_id;

-- SCHRITT 2: Alle Modelle löschen, die NICHT von User-ID 10 (Shop 1682) sind
DELETE FROM user_models 
WHERE user_id != 10;

-- SCHRITT 3: Alle Marken löschen, die NICHT von User-ID 10 (Shop 1682) sind
DELETE FROM user_brands 
WHERE user_id != 10;

-- SCHRITT 4: Alle Gerätetypen löschen, die NICHT von User-ID 10 (Shop 1682) sind
DELETE FROM user_device_types 
WHERE user_id != 10;

-- SCHRITT 5: Bestätigung - Zeige Ergebnis nach der Bereinigung
SELECT 'NACHHER - Gerätetypen pro Shop:' as info;
SELECT user_id, COUNT(*) as anzahl_typen 
FROM user_device_types 
GROUP BY user_id 
ORDER BY user_id;

SELECT 'NACHHER - Marken pro Shop:' as info;
SELECT user_id, COUNT(*) as anzahl_marken 
FROM user_brands 
GROUP BY user_id 
ORDER BY user_id;

SELECT 'NACHHER - Modelle pro Shop:' as info;
SELECT user_id, COUNT(*) as anzahl_modelle 
FROM user_models 
GROUP BY user_id 
ORDER BY user_id;

-- SCHRITT 6: Bestätigung der globalen Verfügbarkeit
SELECT 'GLOBALE DATEN - Superadmin (User 10):' as info;
SELECT 
  (SELECT COUNT(*) FROM user_device_types WHERE user_id = 10) as geraetetypen,
  (SELECT COUNT(*) FROM user_brands WHERE user_id = 10) as marken,
  (SELECT COUNT(*) FROM user_models WHERE user_id = 10) as modelle;