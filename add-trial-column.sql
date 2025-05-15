-- SQL-Skript zum Hinzufügen der trial_expires_at-Spalte zu users-Tabelle

-- Prüfen, ob die Spalte bereits existiert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'trial_expires_at'
    ) THEN
        -- Spalte hinzufügen, wenn sie nicht existiert
        ALTER TABLE users ADD COLUMN trial_expires_at TIMESTAMP;
        RAISE NOTICE 'Spalte trial_expires_at zur users-Tabelle hinzugefügt.';
    ELSE
        RAISE NOTICE 'Spalte trial_expires_at existiert bereits.';
    END IF;
END $$;