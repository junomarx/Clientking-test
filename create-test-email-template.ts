/**
 * Migrationsskript zur Erstellung der "Auftragsbestätigung" E-Mail-Vorlage
 * für Test-E-Mails direkt aus dem RepairDetailsDialog
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from "./shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function createTestEmailTemplate() {
  try {
    console.log('Erstelle Auftragsbestätigungs-E-Mail-Vorlage...');

    // Alle Benutzer abrufen
    const users = await db.select().from(schema.users);
    
    console.log(`Gefunden: ${users.length} Benutzer`);

    for (const user of users) {
      console.log(`Bearbeite Benutzer: ${user.username} (ID: ${user.id})`);
      
      // Prüfen, ob die Vorlage bereits existiert
      const existingTemplate = await db
        .select()
        .from(schema.emailTemplates)
        .where(
          and(
            eq(schema.emailTemplates.userId, user.id),
            eq(schema.emailTemplates.name, 'Auftragsbestätigung'),
            eq(schema.emailTemplates.type, 'auftragsbestaetigung')
          )
        );

      if (existingTemplate.length > 0) {
        console.log(`  Vorlage "Auftragsbestätigung" bereits vorhanden für Benutzer ${user.username}`);
        continue;
      }

      // Neue Vorlage erstellen
      const template = {
        userId: user.id,
        name: 'Auftragsbestätigung',
        subject: 'Auftragsbestätigung - Reparatur {{orderCode}}',
        type: 'auftragsbestaetigung' as const,
        body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Auftragsbestätigung</h2>
        </div>
        
        <p>Sehr geehrte(r) {{customerName}},</p>
        
        <p>vielen Dank für Ihr Vertrauen in unseren Service! Hiermit bestätigen wir die Aufnahme Ihres Reparaturauftrags.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{orderCode}}</p>
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{brand}} {{model}}</p>
          <p style="margin: 5px 0;"><strong>Problem:</strong> {{issue}}</p>
          <p style="margin: 5px 0;"><strong>Aufgenommen am:</strong> {{createdAt}}</p>
          <p style="margin: 5px 0;"><strong>Reparaturkosten:</strong> {{estimatedCost}} €</p>
        </div>
        
        <div style="background-color: #e6f7f1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0; font-weight: bold;">Nächste Schritte:</p>
          <p style="margin: 10px 0 0 0;">Wir werden Ihr Gerät sorgfältig prüfen und Sie über den Fortschritt der Reparatur informieren. Sie erhalten von uns eine E-Mail, sobald Ihr Gerät abholbereit ist.</p>
        </div>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{businessName}}</strong></p>
          <p style="margin: 5px 0;">{{businessAddress}}</p>
          <p style="margin: 5px 0;">{{businessZipCode}} {{businessCity}}</p>
          <p style="margin: 5px 0;">Telefon: {{businessPhone}}</p>
          <p style="margin: 5px 0;">E-Mail: {{businessEmail}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{businessName}} gesendet.</p>
        </div>
      </div>`
      };

      await db.insert(schema.emailTemplates).values(template);
      console.log(`  ✓ Vorlage "Auftragsbestätigung" für Benutzer ${user.username} erstellt`);
    }

    console.log('Auftragsbestätigungs-E-Mail-Vorlage erfolgreich erstellt für alle Benutzer!');

  } catch (error) {
    console.error('Fehler beim Erstellen der E-Mail-Vorlage:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  await createTestEmailTemplate();
}

// ESM-kompatible Ausführung
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createTestEmailTemplate };