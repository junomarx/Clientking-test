/**
 * Migrationsskript zur Erstellung der "Auftragsbestätigung" E-Mail-Vorlage
 * für Test-E-Mails direkt aus dem RepairDetailsDialog
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and } from 'drizzle-orm';
import ws from "ws";
import * as schema from "./shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

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
        body: `Sehr geehrte(r) {{customerName}},

vielen Dank für Ihr Vertrauen in unseren Service!

Hiermit bestätigen wir die Aufnahme Ihres Reparaturauftrags mit folgenden Details:

**Auftragsnummer:** {{orderCode}}
**Gerät:** {{brand}} {{model}}
**Problem:** {{issue}}
**Aufgenommen am:** {{createdAt}}
**Reparaturkosten:** {{estimatedCost}} €

**Nächste Schritte:**
Wir werden Ihr Gerät sorgfältig prüfen und Sie über den Fortschritt der Reparatur informieren. Sie erhalten von uns eine E-Mail, sobald Ihr Gerät abholbereit ist.

**Haben Sie Fragen?**
Kontaktieren Sie uns gerne:
- Telefon: {{businessPhone}}
- E-Mail: {{businessEmail}}

Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen
Ihr {{businessName}} Team

---
{{businessName}}
{{businessAddress}}
{{businessZipCode}} {{businessCity}}
Tel: {{businessPhone}}
E-Mail: {{businessEmail}}

Diese E-Mail wurde automatisch generiert.`
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