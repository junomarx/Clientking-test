#!/usr/bin/env node

/**
 * Kompletter Datenbankexport für Handyshop Verwaltung
 * Exportiert alle Tabellen als SQL-Dateien
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Alle Tabellen in der richtigen Reihenfolge (wegen Foreign Keys)
const tables = [
  'shops',
  'packages',
  'package_features',
  'users',
  'user_shop_access',
  'business_settings',
  'customers',
  'global_device_types',
  'hidden_standard_device_types',
  'global_device_brands',
  'global_device_models',
  'user_device_types',
  'user_brands',
  'user_model_series',
  'user_models',
  'repairs',
  'spare_parts',
  'accessories',
  'cost_estimates',
  'repair_status_history',
  'loaner_devices',
  'device_issues',
  'email_templates',
  'email_triggers',
  'email_history',
  'print_templates',
  'activity_logs',
  'session',
  'temp_signatures',
  'error_catalog_entries',
  'superadmin_email_settings',
  'multi_shop_permissions',
  'msa_profiles',
  'msa_pricing',
  'support_access_logs'
];

async function exportDatabase() {
  console.log('🚀 Starte kompletten Datenbankexport...');
  
  const exportDir = 'database-export';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullExportDir = `${exportDir}-${timestamp}`;
  
  // Erstelle Export-Verzeichnis
  if (!fs.existsSync(fullExportDir)) {
    fs.mkdirSync(fullExportDir, { recursive: true });
  }

  let fullSqlExport = '';
  let totalRecords = 0;

  // Schema-Information exportieren
  console.log('📋 Exportiere Schema-Information...');
  const schemaResult = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position
  `);
  const schema = schemaResult.rows;
  
  fs.writeFileSync(
    path.join(fullExportDir, 'schema.json'), 
    JSON.stringify(schema, null, 2)
  );

  // Jede Tabelle exportieren
  for (const table of tables) {
    try {
      console.log(`📦 Exportiere Tabelle: ${table}`);
      
      // Anzahl der Datensätze ermitteln
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = parseInt(countResult.rows[0].count);
      totalRecords += count;
      
      if (count === 0) {
        console.log(`   ⚠️  Tabelle ${table} ist leer`);
        continue;
      }
      
      // Alle Daten der Tabelle abrufen
      const dataResult = await pool.query(`SELECT * FROM "${table}"`);
      const data = dataResult.rows;
      
      // Als JSON exportieren
      fs.writeFileSync(
        path.join(fullExportDir, `${table}.json`), 
        JSON.stringify(data, null, 2)
      );
      
      // Als CSV exportieren (vereinfacht)
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const csvLines = [headers.join(',')];
        
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            if (value === null) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvLines.push(values.join(','));
        });
        
        fs.writeFileSync(
          path.join(fullExportDir, `${table}.csv`), 
          csvLines.join('\n')
        );
      }
      
      // SQL INSERT Statements generieren
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const insertStatements = [];
        
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (value instanceof Date) {
              return `'${value.toISOString()}'`;
            }
            return value;
          });
          
          insertStatements.push(
            `INSERT INTO ${table} (${headers.join(', ')}) VALUES (${values.join(', ')});`
          );
        });
        
        const sqlContent = insertStatements.join('\n');
        fs.writeFileSync(
          path.join(fullExportDir, `${table}.sql`), 
          sqlContent
        );
        
        fullSqlExport += `-- Tabelle: ${table} (${count} Datensätze)\n`;
        fullSqlExport += sqlContent + '\n\n';
      }
      
      console.log(`   ✅ ${count} Datensätze exportiert`);
      
    } catch (error) {
      console.error(`❌ Fehler beim Exportieren von ${table}:`, error.message);
    }
  }

  // Vollständige SQL-Datei erstellen
  const fullSqlHeader = `-- Handyshop Verwaltung - Kompletter Datenbankexport
-- Exportiert am: ${new Date().toISOString()}
-- Gesamt Datensätze: ${totalRecords}
-- Tabellen: ${tables.length}

-- Hinweis: Vor dem Import sollten die Tabellen in umgekehrter Reihenfolge geleert werden
-- wegen Foreign Key Constraints

SET session_replication_role = replica; -- Deaktiviert FK Checks temporär

`;

  const fullSqlFooter = `
SET session_replication_role = DEFAULT; -- Aktiviert FK Checks wieder
`;

  fs.writeFileSync(
    path.join(fullExportDir, 'complete-database-export.sql'), 
    fullSqlHeader + fullSqlExport + fullSqlFooter
  );

  // Export-Zusammenfassung
  const summary = {
    exportDate: new Date().toISOString(),
    totalTables: tables.length,
    totalRecords: totalRecords,
    exportDir: fullExportDir,
    files: {
      'complete-database-export.sql': 'Vollständiger SQL-Export für Import',
      'schema.json': 'Datenbankschema-Information',
      '*.json': 'Tabellendaten als JSON',
      '*.csv': 'Tabellendaten als CSV',
      '*.sql': 'Einzelne SQL-Dateien pro Tabelle'
    }
  };
  
  fs.writeFileSync(
    path.join(fullExportDir, 'export-summary.json'), 
    JSON.stringify(summary, null, 2)
  );

  console.log('\n🎉 Datenbankexport abgeschlossen!');
  console.log(`📁 Export-Verzeichnis: ${fullExportDir}`);
  console.log(`📊 Tabellen: ${tables.length}`);
  console.log(`📈 Gesamt Datensätze: ${totalRecords}`);
  console.log('\n📋 Exportierte Dateien:');
  console.log('   • complete-database-export.sql (Vollständiger SQL-Export)');
  console.log('   • schema.json (Datenbankschema)');
  console.log('   • *.json (JSON-Format pro Tabelle)');
  console.log('   • *.csv (CSV-Format pro Tabelle)');
  console.log('   • *.sql (SQL-INSERT Statements pro Tabelle)');
  console.log('   • export-summary.json (Export-Zusammenfassung)');
}

// Script ausführen
exportDatabase().catch(console.error);