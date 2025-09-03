#!/usr/bin/env node

/**
 * Einfacher, direkter Datenbankexport
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function exportData() {
  console.log('🚀 Starte Datenbankexport...');
  
  const timestamp = new Date().toISOString().slice(0,19).replace(/[:.]/g, '-');
  const exportDir = `db-export-${timestamp}`;
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  // Wichtigste Tabellen mit echten SQL-Abfragen
  const exports = [
    { name: 'shops', query: 'SELECT * FROM shops ORDER BY id' },
    { name: 'users', query: 'SELECT * FROM users ORDER BY id' },
    { name: 'customers', query: 'SELECT * FROM customers ORDER BY id' },
    { name: 'repairs', query: 'SELECT * FROM repairs ORDER BY id' },
    { name: 'spare_parts', query: 'SELECT * FROM spare_parts ORDER BY id' },
    { name: 'accessories', query: 'SELECT * FROM accessories ORDER BY id' },
    { name: 'business_settings', query: 'SELECT * FROM business_settings ORDER BY id' },
    { name: 'email_templates', query: 'SELECT * FROM email_templates ORDER BY id' },
    { name: 'print_templates', query: 'SELECT * FROM print_templates ORDER BY id' },
    { name: 'activity_logs', query: 'SELECT * FROM activity_logs ORDER BY id' },
    { name: 'device_issues', query: 'SELECT * FROM device_issues ORDER BY id' },
    { name: 'email_history', query: 'SELECT * FROM email_history ORDER BY id' }
  ];

  let totalRecords = 0;

  for (const exp of exports) {
    try {
      console.log(`📦 Exportiere ${exp.name}...`);
      
      const data = await sql.unsafe(exp.query);
      const count = data.length;
      totalRecords += count;
      
      if (count > 0) {
        // JSON Export
        fs.writeFileSync(
          `${exportDir}/${exp.name}.json`,
          JSON.stringify(data, null, 2)
        );
        
        // CSV Export
        const headers = Object.keys(data[0]);
        const csvLines = [headers.join(',')];
        
        data.forEach(row => {
          const values = headers.map(h => {
            let val = row[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') {
              val = val.replace(/"/g, '""');
              if (val.includes(',') || val.includes('\n')) val = `"${val}"`;
            }
            return val;
          });
          csvLines.push(values.join(','));
        });
        
        fs.writeFileSync(
          `${exportDir}/${exp.name}.csv`,
          csvLines.join('\n')
        );
        
        console.log(`   ✅ ${count} Datensätze`);
      } else {
        console.log(`   ⚠️  Leer`);
      }
      
    } catch (error) {
      console.error(`❌ Fehler bei ${exp.name}:`, error.message);
    }
  }

  // Zusammenfassung
  const summary = {
    exportDate: new Date().toISOString(),
    totalRecords,
    tables: exports.map(e => e.name)
  };
  
  fs.writeFileSync(
    `${exportDir}/summary.json`,
    JSON.stringify(summary, null, 2)
  );

  console.log(`\n🎉 Export abgeschlossen!`);
  console.log(`📁 Verzeichnis: ${exportDir}`);
  console.log(`📊 Gesamt: ${totalRecords} Datensätze`);
  
  return exportDir;
}

exportData().catch(console.error);