-- SQL-Skript zum vollständigen Löschen eines Benutzers mit allen verknüpften Daten
-- Schaltet temporär Fremdschlüsselprüfungen aus
-- Verwenden Sie dieses Skript mit Vorsicht!

-- Beginn der Transaktion
BEGIN;

-- Ziel-Benutzer ID
\set user_id 20

-- Temporär Fremdschlüsselprüfungen ausschalten
SET session_replication_role = 'replica';

-- Reparatur-abhängige Daten löschen
DELETE FROM email_history WHERE "repairId" IN (
  SELECT r.id 
  FROM repairs r 
  JOIN customers c ON r.customer_id = c.id 
  WHERE c.user_id = :user_id
);

DELETE FROM cost_estimates WHERE repair_id IN (
  SELECT r.id 
  FROM repairs r 
  JOIN customers c ON r.customer_id = c.id 
  WHERE c.user_id = :user_id
);

-- Reparaturen löschen
DELETE FROM repairs 
WHERE customer_id IN (
  SELECT id 
  FROM customers 
  WHERE user_id = :user_id
);

-- Kunden löschen
DELETE FROM customers WHERE user_id = :user_id;

-- Geschäftseinstellungen löschen
DELETE FROM business_settings WHERE user_id = :user_id;

-- E-Mail-Vorlagen löschen
DELETE FROM email_templates WHERE user_id = :user_id;

-- Gerätespezifische Daten
DELETE FROM user_device_types WHERE user_id = :user_id;
DELETE FROM user_brands WHERE user_id = :user_id;
DELETE FROM user_models WHERE user_id = :user_id;
DELETE FROM hidden_standard_device_types WHERE user_id = :user_id;

-- Den Benutzer selbst löschen
DELETE FROM users WHERE id = :user_id;

-- Fremdschlüsselprüfungen wiederherstellen
SET session_replication_role = 'origin';

-- Transaktion abschließen
COMMIT;