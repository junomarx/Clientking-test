import { db } from './server/db';
import { emailHistory } from './shared/schema';

async function main() {
  try {
    // Direkte SQL-Ausführung zur Erstellung der Tabelle email_history
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "email_history" (
        "id" SERIAL PRIMARY KEY,
        "repairId" INTEGER NOT NULL,
        "recipient" VARCHAR NOT NULL,
        "subject" VARCHAR NOT NULL,
        "templateId" INTEGER,
        "status" VARCHAR NOT NULL,
        "sentAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "userId" INTEGER NOT NULL
      );
    `);
    
    console.log('Email history table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating email history table:', error);
    process.exit(1);
  }
}

main();
