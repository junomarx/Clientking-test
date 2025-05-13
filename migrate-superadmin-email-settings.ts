/**
 * Migrationsskript zur Erstellung der superadmin_email_settings-Tabelle
 * und Initialisierung mit den vorhandenen SMTP-Einstellungen aus den Umgebungsvariablen.
 */
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { superadminEmailSettings, users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function migrateSuperadminEmailSettings() {
  try {
    console.log('Starte Migration für Superadmin-E-Mail-Einstellungen...');

    // 1. Prüfen, ob die Tabelle existiert
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'superadmin_email_settings'
      ) as exists;
    `);
    
    if (!tableExists[0]?.exists) {
      console.log('Die superadmin_email_settings-Tabelle existiert nicht, erstelle sie...');
      
      // 2. Tabelle erstellen
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS superadmin_email_settings (
          id SERIAL PRIMARY KEY,
          smtp_sender_name TEXT NOT NULL DEFAULT 'Handyshop Verwaltung',
          smtp_sender_email TEXT NOT NULL DEFAULT 'noreply@phonerepair.at',
          smtp_host TEXT NOT NULL,
          smtp_user TEXT NOT NULL,
          smtp_password TEXT NOT NULL,
          smtp_port INTEGER NOT NULL DEFAULT 587,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('Tabelle superadmin_email_settings erfolgreich erstellt.');
    } else {
      console.log('Die superadmin_email_settings-Tabelle existiert bereits.');
    }

    // 3. Initialisieren mit vorhandenen Umgebungsvariablen
    const smtpSenderName = process.env.SMTP_SENDER_NAME || 'Handyshop Verwaltung';
    const smtpSenderEmail = process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER || 'noreply@phonerepair.at';
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.log('SMTP-Einstellungen in den Umgebungsvariablen sind unvollständig. Überspringe Initialisierung.');
      return;
    }

    // 4. Prüfen, ob bereits Einträge in der Tabelle existieren
    const existingSettings = await db.select().from(superadminEmailSettings);
    
    if (existingSettings.length === 0) {
      console.log('Keine vorhandenen E-Mail-Einstellungen gefunden, initialisiere mit Umgebungsvariablen...');
      
      await db.insert(superadminEmailSettings).values({
        smtpSenderName,
        smtpSenderEmail,
        smtpHost,
        smtpUser,
        smtpPassword,
        smtpPort,
        isActive: true
      });
      
      console.log('Superadmin-E-Mail-Einstellungen erfolgreich initialisiert.');
    } else {
      console.log('Es existieren bereits Superadmin-E-Mail-Einstellungen. Überspringe Initialisierung.');
    }

    console.log('Migration für Superadmin-E-Mail-Einstellungen abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Migration für Superadmin-E-Mail-Einstellungen:', error);
  }
}

async function main() {
  await migrateSuperadminEmailSettings();
  process.exit(0);
}

main();