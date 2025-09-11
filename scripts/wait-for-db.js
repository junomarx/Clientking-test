#!/usr/bin/env node

/**
 * Database Health Check Script
 * Waits for PostgreSQL to be ready to accept connections and execute queries
 */

import { Pool } from 'pg';

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds

async function checkDatabaseHealth() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔍 Checking database health...');
  console.log(`📡 Connecting to: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Configure for health checking
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 1 // Only need one connection for health check
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Health check attempt ${attempt}/${MAX_RETRIES}...`);
      
      // Test basic connection
      const client = await pool.connect();
      
      // Test database readiness with a simple query
      const result = await client.query('SELECT 1 as health_check, version() as pg_version');
      
      // Test if we can create/access tables (readiness for migrations)
      await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 1
      `);
      
      client.release();
      
      console.log('✅ Database is healthy and ready!');
      console.log(`📊 PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[1]}`);
      
      await pool.end();
      process.exit(0);
      
    } catch (error) {
      console.log(`⚠️  Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === MAX_RETRIES) {
        console.error('❌ Database health check failed after maximum retries');
        console.error('💡 Please check:');
        console.error('   - Database server is running');
        console.error('   - DATABASE_URL is correct');
        console.error('   - Network connectivity');
        console.error('   - Database credentials');
        
        await pool.end();
        process.exit(1);
      }
      
      console.log(`⏳ Waiting ${RETRY_DELAY/1000}s before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Health check interrupted');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('🛑 Health check interrupted');
  process.exit(1);
});

// Run health check
checkDatabaseHealth().catch(error => {
  console.error('💥 Unexpected error during health check:', error);
  process.exit(1);
});