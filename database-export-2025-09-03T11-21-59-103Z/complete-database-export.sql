-- Handyshop Verwaltung - Kompletter Datenbankexport
-- Exportiert am: 2025-09-03T11:22:00.997Z
-- Gesamt Datensätze: 0
-- Tabellen: 35

-- Hinweis: Vor dem Import sollten die Tabellen in umgekehrter Reihenfolge geleert werden
-- wegen Foreign Key Constraints

SET session_replication_role = replica; -- Deaktiviert FK Checks temporär


SET session_replication_role = DEFAULT; -- Aktiviert FK Checks wieder
