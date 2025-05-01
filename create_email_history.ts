import { pool } from './server/db';

async function createEmailHistoryTable() {
  try {
    // Dies ist die SQL-Anweisung, die genau dem entspricht,
    // was das Schema erzeugen würde, aber ohne Drizzle's mapping
    await pool.query(`
      DROP TABLE IF EXISTS "email_history";
      CREATE TABLE "email_history" (
        "id" SERIAL PRIMARY KEY,
        "repairId" INTEGER NOT NULL REFERENCES "repairs"("id"),
        "emailTemplateId" INTEGER REFERENCES "email_templates"("id"),
        "subject" TEXT NOT NULL,
        "recipient" TEXT NOT NULL,
        "sentAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "status" TEXT NOT NULL,
        "userId" INTEGER REFERENCES "users"("id")
      );
    `);
    
    console.log('E-Mail-Verlauf-Tabelle erfolgreich erstellt!');
    process.exit(0);
  } catch (error) {
    console.error('Fehler beim Erstellen der E-Mail-Verlauf-Tabelle:', error);
    process.exit(1);
  }
}

createEmailHistoryTable();
