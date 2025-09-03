#!/bin/bash

# Erstelle Export-Verzeichnis mit Timestamp
EXPORT_DIR="database-export-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo "🚀 Erstelle Datenbankexport in $EXPORT_DIR"

# PostgreSQL Dump-Befehl (falls verfügbar)
if command -v pg_dump &> /dev/null; then
    echo "📦 Erstelle PostgreSQL Dump..."
    pg_dump "$DATABASE_URL" > "$EXPORT_DIR/complete_database.sql"
    echo "✅ PostgreSQL Dump erstellt: complete_database.sql"
fi

# CSV Exports über psql (falls verfügbar)  
if command -v psql &> /dev/null; then
    echo "📊 Erstelle CSV-Exports..."
    
    # Alle Tabellen als CSV exportieren
    TABLES="shops users customers repairs spare_parts accessories business_settings email_templates print_templates activity_logs"
    
    for table in $TABLES; do
        echo "   Exportiere $table..."
        psql "$DATABASE_URL" -c "COPY $table TO STDOUT WITH CSV HEADER;" > "$EXPORT_DIR/${table}.csv"
    done
    
    echo "✅ CSV-Exports abgeschlossen"
fi

echo "🎉 Export abgeschlossen in: $EXPORT_DIR"
ls -la "$EXPORT_DIR/"