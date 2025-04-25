import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate, businessSettings } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails
 */
export class EmailService {
  constructor() {
    // Wenn SENDGRID_API_KEY vorhanden ist, initialisiere SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('SendGrid wurde initialisiert');
    } else {
      console.log('SendGrid API-Schlüssel fehlt - E-Mail-Versand wird simuliert');
    }
  }

  // Die grundlegenden CRUD-Funktionen für E-Mail-Vorlagen
  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const now = new Date();
    const [newTemplate] = await db.insert(emailTemplates).values({
      ...template,
      createdAt: now,
      updatedAt: now
    }).returning();
    return newTemplate;
  }

  async updateEmailTemplate(
    id: number, 
    template: Partial<InsertEmailTemplate>
  ): Promise<EmailTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({
        ...template,
        updatedAt: new Date()
      })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    try {
      await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting email template:", error);
      return false;
    }
  }

  // E-Mail-Versand mit Vorlagenverarbeitung
  async sendEmailWithTemplate(
    templateId: number, 
    to: string, 
    variables: Record<string, string>
  ): Promise<boolean> {
    try {
      // Lade die Vorlage
      const template = await this.getEmailTemplate(templateId);
      if (!template) {
        throw new Error("E-Mail-Vorlage nicht gefunden");
      }
      
      // Variablen in Betreff und Text ersetzen
      let subject = template.subject;
      let body = template.body;
      
      // Ersetze Variablen im Format {{variableName}}
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
      });
      
      // Prüfe, ob der SendGrid API-Schlüssel vorhanden ist
      if (!process.env.SENDGRID_API_KEY) {
        console.log(`[SIMULIERT] E-Mail würde gesendet werden an: ${to}, Betreff: ${subject}`);
        console.log(`[SIMULIERT] Inhalt: ${body}`);
        return true;
      }
      
      // Geschäftsinformationen für das Absenderfeld laden
      const [businessSetting] = await db.select().from(businessSettings);
      const senderEmail = businessSetting?.email || 'no-reply@example.com';
      const senderName = businessSetting?.businessName || 'Handyshop Verwaltung';
      
      // SendGrid-E-Mail vorbereiten
      const msg = {
        to,
        from: {
          email: senderEmail,
          name: senderName
        },
        subject,
        text: body,
        html: body // Wenn HTML unterstützt werden soll
      };
      
      // E-Mail senden
      try {
        await sgMail.send(msg);
        console.log(`E-Mail erfolgreich gesendet an: ${to}`);
        return true;
      } catch (error: any) {
        console.error('SendGrid-Fehler:', error);
        if (error.response) {
          console.error(error.response.body);
        }
        return false;
      }
    } catch (error) {
      console.error("Error sending email with template:", error);
      return false;
    }
  }
}

// Erstelle eine Singleton-Instanz des E-Mail-Services
export const emailService = new EmailService();