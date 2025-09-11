#!/usr/bin/env node

/**
 * Manual Data Import Runner
 * Safely imports SQL files into the database with transaction safety
 */

const { Pool } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const IMPORT_DATA_DIR = '/app/import-data';
const IMPORT_LOG_TABLE = 'data_import_log';

class DataImporter {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });
    this.importMode = process.env.IMPORT_MODE || 'all';
    this.forceImport = process.env.FORCE_IMPORT === 'true';
    this.loggingEnabled = false;
  }

  async init() {
    console.log('🚀 Manual Data Importer Starting...');
    console.log(`📋 Import Mode: ${this.importMode}`);
    console.log(`⚡ Force Import: ${this.forceImport}`);
    
    // Validate DATABASE_URL and connection
    await this.validateConnection();
    
    // Create import log table if it doesn't exist
    await this.createLogTable();
  }

  async validateConnection() {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is required');
      console.error('📝 Example: postgres://user:pass@postgres:5432/dbname');
      process.exit(1);
    }
    
    console.log(`📛 Connecting to: ${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);
    
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✅ Database connection validated');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('📝 Check DATABASE_URL format and network connectivity');
      console.error('📝 For docker-compose: Use "postgres" as hostname, not "localhost"');
      process.exit(1);
    } finally {
      client.release();
    }
  }

  async createLogTable() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${IMPORT_LOG_TABLE} (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          imported_at TIMESTAMP DEFAULT NOW(),
          file_hash VARCHAR(64),
          status VARCHAR(20) DEFAULT 'completed'
        )
      `);
      console.log('✅ Import log table ready');
      this.loggingEnabled = true;
    } catch (error) {
      console.warn('⚠️ Could not create log table (continuing without logging):', error.message);
      this.loggingEnabled = false;
    } finally {
      client.release();
    }
  }

  async getImportFiles() {
    try {
      const files = await fs.readdir(IMPORT_DATA_DIR);
      const sqlFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Natural ordering
      
      console.log(`📁 Found ${sqlFiles.length} SQL files:`, sqlFiles);
      return sqlFiles;
    } catch (error) {
      console.error('❌ Error reading import directory:', error.message);
      return [];
    }
  }

  async isFileImported(filename) {
    if (this.forceImport || !this.loggingEnabled) return false;
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 1 FROM ${IMPORT_LOG_TABLE} WHERE filename = $1`,
        [filename]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.warn('⚠️ Could not check import status:', error.message);
      return false;
    } finally {
      client.release();
    }
  }

  async detectFileType(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Check for COPY FROM STDIN or psql meta-commands
    const hasCopyStdin = /COPY\s+\w+.*FROM\s+STDIN/i.test(content);
    const hasMetaCommands = /^\\\./m.test(content); // Lines starting with \.
    const hasPsqlCommands = /^\\\w+/m.test(content); // Other psql commands
    
    return hasCopyStdin || hasMetaCommands || hasPsqlCommands ? 'dump' : 'sql';
  }

  async importWithPsql(filename) {
    const filePath = path.join(IMPORT_DATA_DIR, filename);
    
    return new Promise((resolve, reject) => {
      console.log(`🔄 Importing with psql (dump format): ${filename}`);
      
      const psql = spawn('psql', [
        process.env.DATABASE_URL,
        '-v', 'ON_ERROR_STOP=1',  // Stop on first error
        '-1',  // Single transaction
        '-f', filePath
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      psql.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      psql.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      psql.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Imported successfully with psql: ${filename}`);
          if (output.trim()) {
            console.log(`   Output: ${output.trim().split('\n').pop()}`);
          }
          resolve({ success: true, method: 'psql' });
        } else {
          console.error(`❌ psql import failed: ${filename}`);
          console.error(`   Error: ${errorOutput}`);
          reject(new Error(`psql exited with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  async importSqlFile(filename) {
    console.log(`\n📥 Processing: ${filename}`);
    
    // Check if already imported
    if (await this.isFileImported(filename)) {
      console.log(`⏭️ Skipped (already imported): ${filename}`);
      return { success: true, skipped: true };
    }

    const filePath = path.join(IMPORT_DATA_DIR, filename);
    
    try {
      // Read SQL file
      const sqlContent = await fs.readFile(filePath, 'utf8');
      if (!sqlContent.trim()) {
        console.log(`⚠️ Empty file: ${filename}`);
        return { success: true, empty: true };
      }
      
      // Detect file type and use appropriate method
      const fileType = await this.detectFileType(filePath);
      console.log(`🔍 Detected format: ${fileType}`);
      
      let result;
      if (fileType === 'dump') {
        result = await this.importWithPsql(filename);
      } else {
        result = await this.importWithNodePg(filename, sqlContent);
      }
      
      // Log successful import (if logging enabled)
      if (this.loggingEnabled) {
        await this.logImport(filename, sqlContent, 'completed');
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Import failed: ${filename}`);
      console.error(`   Error: ${error.message}`);
      
      // Log failed import (if logging enabled)
      if (this.loggingEnabled) {
        await this.logImport(filename, null, 'failed');
      }
      
      return { success: false, error: error.message };
    }
  }

  async importWithNodePg(filename, sqlContent) {
    const client = await this.pool.connect();
    
    try {
      console.log(`🔄 Executing with node-postgres (${sqlContent.length} chars)...`);
      
      // Execute in transaction
      await client.query('BEGIN');
      const result = await client.query(sqlContent);
      await client.query('COMMIT');
      
      console.log(`✅ Imported successfully with node-postgres: ${filename}`);
      if (result.rowCount !== undefined) {
        console.log(`   📊 Rows affected: ${result.rowCount}`);
      }
      
      return { success: true, rowCount: result.rowCount, method: 'node-postgres' };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async logImport(filename, sqlContent, status) {
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO ${IMPORT_LOG_TABLE} (filename, file_hash, status) 
        VALUES ($1, $2, $3)
        ON CONFLICT (filename) DO UPDATE SET
          imported_at = NOW(),
          status = $3
      `, [filename, sqlContent ? this.simpleHash(sqlContent) : null, status]);
    } catch (error) {
      console.warn('⚠️ Could not log import:', error.message);
    } finally {
      client.release();
    }
  }

  async importAll() {
    const files = await this.getImportFiles();
    if (files.length === 0) {
      console.log('📭 No SQL files found to import');
      return;
    }

    const results = {
      total: files.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const filename of files) {
      // Skip if import mode doesn't match
      if (this.importMode !== 'all' && !filename.includes(this.importMode)) {
        console.log(`⏭️ Skipped (mode filter): ${filename}`);
        continue;
      }

      const result = await this.importSqlFile(filename);
      
      if (result.success) {
        if (result.skipped) {
          results.skipped++;
        } else {
          results.imported++;
        }
      } else {
        results.failed++;
        results.errors.push({ filename, error: result.error });
      }
    }

    // Summary
    console.log('\n📋 Import Summary:');
    console.log(`   📁 Total files: ${results.total}`);
    console.log(`   ✅ Imported: ${results.imported}`);
    console.log(`   ⏭️ Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Failed imports:');
      results.errors.forEach(({ filename, error }) => {
        console.log(`   • ${filename}: ${error}`);
      });
      process.exit(1);
    }

    console.log('\n🎉 Data import completed successfully!');
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async cleanup() {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const importer = new DataImporter();
  
  try {
    await importer.init();
    
    // Handle different commands
    const command = process.argv[2] || 'all';
    
    switch (command) {
      case 'all':
        await importer.importAll();
        break;
      case 'list':
        const files = await importer.getImportFiles();
        console.log('Available import files:', files);
        break;
      case 'status':
        console.log('Import status check - feature coming soon');
        break;
      default:
        console.log(`Unknown command: ${command}`);
        console.log('Available commands: all, list, status');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await importer.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Import interrupted by SIGTERM');
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('🛑 Import interrupted by SIGINT');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}