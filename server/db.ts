// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import * as schema from "@shared/schema";

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL
// });


// // Enable comprehensive query logging
// export const db = drizzle(pool, { 
//   schema,
//   logger: {
//     logQuery: (query: string, params: unknown[]) => {
//       console.log('🔍 [SQL QUERY]:', query);
//       if (params && params.length > 0) {
//         console.log('📝 [SQL PARAMS]:', params);
//       }
//       console.log('⏱️  [SQL TIMESTAMP]:', new Date().toISOString());
//       console.log('─'.repeat(80));
//     }
//   }
// });
//export const db = drizzle(pool, { schema });


// server/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';


// Schemas
import * as appSchema from '@shared/schema';
// If you have a separate schema for master tables (tenant_connections, shops, etc.)
// import that here. If not, you can reuse appSchema as long as it defines those tables.
import * as masterSchema from '@shared/masterSchema'; // <- change to '@shared/schema' if you keep them together

/* =========================
 *  App DB (legacy exports)
 * ========================= */
const appUrl = process.env.DATABASE_URL;
if (!appUrl) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Keep names to satisfy existing imports elsewhere
export const pool = new Pool({ connectionString: appUrl });

export const db = drizzle(pool, {
  schema: appSchema,
  logger: {
    logQuery: (query: string, params: unknown[]) => {
      console.log('🔍 [APP SQL]:', query);
      if (params && (params as unknown[]).length > 0) {
        console.log('📝 [PARAMS]:', params);
      }
      console.log('⏱️  [TS]:', new Date().toISOString());
      console.log('─'.repeat(80));
    },
  },
});

// Optional aliases (harmless)
export const appPool = pool;
export const appDb = db;

/* =========================
 *  Master DB (lazy getter)
 * ========================= */
const masterUrl = process.env.ADMIN_DATABASE_URL;

let _masterPool: Pool | null = null;
let _masterDb: ReturnType<typeof drizzle> | null = null;

/** Get a Drizzle client for the master DB (used by provisioner/migrator/registry). */
export function getMasterDb() {
  if (!masterUrl) {
    throw new Error('ADMIN_DATABASE_URL (or MASTER_DATABASE_URL) must be set for master DB access.');
  }
  if (!_masterPool) _masterPool = new Pool({ connectionString: masterUrl });
  if (!_masterDb) {
    _masterDb = drizzle(_masterPool, {
      schema: masterSchema,
      logger: {
        logQuery: (query: string, params: unknown[]) => {
          console.log('🔧 [MASTER SQL]:', query);
          if (params && (params as unknown[]).length > 0) {
            console.log('📝 [PARAMS]:', params);
          }
          console.log('⏱️  [TS]:', new Date().toISOString());
          console.log('─'.repeat(80));
        },
      },
    });
  }
  return _masterDb;
}


export function getRegistryDb() {
  const src = (process.env.REGISTRY_DB_SOURCE || 'master').toLowerCase();
  if (src === 'app') return db;            // handyshop (current location)
  return getMasterDb();                    // postgres (future location)
}