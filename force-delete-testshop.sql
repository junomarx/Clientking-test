-- Skript zum garantierten Löschen des Benutzers "testshop" (ID 6)
-- mit allen abhängigen Daten

-- Beginn der Transaktion
BEGIN;

-- Temporär Fremdschlüsselprüfungen ausschalten
SET session_replication_role = 'replica';

-- Benutzer-ID für testshop
\set user_id 6

-- 1. E-Mail-Historie für Reparaturen der Kunden des Benutzers löschen
DELETE FROM email_history 
WHERE "repairId" IN (
  SELECT r.id 
  FROM repairs r 
  JOIN customers c ON r.customer_id = c.id 
  WHERE c.user_id = :user_id
);

-- 2. Kostenvoranschläge für Reparaturen der Kunden des Benutzers löschen
DELETE FROM cost_estimates 
WHERE repair_id IN (
  SELECT r.id 
  FROM repairs r 
  JOIN customers c ON r.customer_id = c.id 
  WHERE c.user_id = :user_id
);

-- 3. Feedback-Einträge für Reparaturen der Kunden des Benutzers löschen (falls Tabelle existiert)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'feedback'
  ) THEN
    EXECUTE 'DELETE FROM feedback WHERE repair_id IN (
      SELECT r.id 
      FROM repairs r 
      JOIN customers c ON r.customer_id = c.id 
      WHERE c.user_id = ' || :user_id || '
    )';
  END IF;
END $$;

-- 4. Alle Reparaturen der Kunden des Benutzers löschen
DELETE FROM repairs 
WHERE customer_id IN (
  SELECT id 
  FROM customers 
  WHERE user_id = :user_id
);

-- 5. Alle Kunden des Benutzers löschen
DELETE FROM customers WHERE user_id = :user_id;

-- 6. Geschäftseinstellungen löschen
DELETE FROM business_settings WHERE user_id = :user_id;

-- 7. E-Mail-Vorlagen löschen
DELETE FROM email_templates WHERE user_id = :user_id;

-- 8. Gerätespezifische Daten löschen (falls vorhanden)

-- Benutzer-Modelle löschen
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_models'
  ) THEN
    EXECUTE 'DELETE FROM user_models WHERE user_id = ' || :user_id;
  END IF;
END $$;

-- Benutzer-Marken löschen
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_brands'
  ) THEN
    EXECUTE 'DELETE FROM user_brands WHERE user_id = ' || :user_id;
  END IF;
END $$;

-- Benutzer-Gerätetypen löschen
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_device_types'
  ) THEN
    EXECUTE 'DELETE FROM user_device_types WHERE user_id = ' || :user_id;
  END IF;
END $$;

-- Ausgeblendete Standard-Gerätetypen löschen
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'hidden_standard_device_types'
  ) THEN
    EXECUTE 'DELETE FROM hidden_standard_device_types WHERE user_id = ' || :user_id;
  END IF;
END $$;

-- 9. Benutzer selbst löschen
DELETE FROM users WHERE id = :user_id;

-- Fremdschlüsselprüfungen wiederherstellen
SET session_replication_role = 'origin';

-- Transaktion abschließen
COMMIT;