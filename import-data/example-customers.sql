-- Example customer data import
-- This file shows the structure for importing customer data

-- Example INSERT statements (replace with your actual data)
-- INSERT INTO customers (id, first_name, last_name, email, phone, address, shop_id, created_at) 
-- VALUES 
--   (1, 'Max', 'Mustermann', 'max@example.com', '+43 123 456789', 'Beispielstraße 1, 1010 Wien', 1, NOW()),
--   (2, 'Anna', 'Schmidt', 'anna@example.com', '+43 987 654321', 'Testgasse 5, 1020 Wien', 1, NOW());

-- For production data, replace this file with your actual customer export
-- Use pg_dump to create the export: pg_dump -t customers your_database > 001-customers.sql

SELECT 'Example customer import file - replace with your actual data' as status;