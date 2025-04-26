import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate, businessSettings } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails
 * Kann sowohl den eigenen Mail-Server als auch Brevo als Fallback verwenden
 */
export class EmailService {
  private apiInstance: TransactionalEmailsApi | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    
    // Initialisiere API-Client (als Fallback)
    if (apiKey) {
      try {
        this.apiInstance = new TransactionalEmailsApi();
        // Bei Brevo wird der API-Key als Header-Parameter übergeben
        // Das wird bei jedem API-Aufruf direkt gemacht
      } catch (error) {
        console.error('Fehler beim Initialisieren der Brevo API:', error);
        this.apiInstance = null;
      }
    } else {
      console.warn('Brevo-API-Schlüssel fehlt - Brevo-Fallback nicht verfügbar');
    }

    // Initialisiere SMTP Transporter mit den Benutzer-SMTP-Einstellungen
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;
      
      // Prüfe, ob alle erforderlichen SMTP-Einstellungen vorhanden sind
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        console.warn('Eine oder mehrere SMTP-Einstellungen fehlen, verwende Brevo als Fallback');
      } else {
        // Verwende die Benutzer-SMTP-Einstellungen
        this.smtpTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true für 465, false für andere Ports
          auth: {
            user: smtpUser,
            pass: smtpPassword
          }
        });
        
        console.log(`SMTP-Transporter für ${smtpHost} wurde initialisiert`);
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren des SMTP-Transporters:', error);
      this.smtpTransporter = null;
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
      
      // Geschäftsinformationen für das Absenderfeld laden
      const [businessSetting] = await db.select().from(businessSettings);
      const senderEmail = businessSetting?.email || 'no-reply@example.com';
      const senderName = businessSetting?.businessName || 'Handyshop Verwaltung';
      
      // Entwicklungsmodus-Information, aber senden trotzdem
      if (process.env.NODE_ENV === 'development') {
        console.log(`E-Mail wird gesendet an: ${to}, Betreff: ${subject}`);
        // Wir simulieren nicht mehr, sondern senden tatsächlich
      }

      // Versuche, die E-Mail über SMTP zu senden (bevorzugte Methode)
      if (this.smtpTransporter) {
        try {
          console.log('Sende E-Mail über SMTP...');
          
          const mailOptions = {
            from: `"${senderName}" <${process.env.SMTP_USER}>`, // Der SMTP-Login muss als Absender verwendet werden
            to: to,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
          };
          
          const info = await this.smtpTransporter.sendMail(mailOptions);
          console.log('E-Mail erfolgreich über SMTP gesendet:', info.messageId);
          return true;
        } catch (smtpError) {
          console.error('Fehler beim Senden der E-Mail über SMTP:', smtpError);
          
          // Wenn SMTP fehlschlägt, versuchen wir immer die API als Fallback
          if (this.apiInstance) {
            console.log('Versuche Fallback über API...');
          } else {
            // Ohne API-Instanz melden wir einen Fehler
            console.error('SMTP fehlt und keine API-Konfiguration verfügbar');
            return false;
          }
        }
      }

      // Fallback: Wenn SMTP fehlschlägt oder nicht konfiguriert ist, versuche die API
      if (this.apiInstance) {
        try {
          console.log('Sende E-Mail über Brevo API...');
          // Sende die E-Mail über Brevo API
          const sendSmtpEmail = new SendSmtpEmail();
          
          // Absender-Informationen
          sendSmtpEmail.sender = {
            name: senderName,
            email: senderEmail
          };
          
          // Empfänger (kann auch mehrere enthalten)
          sendSmtpEmail.to = [{ email: to }];
          
          // Betreff und Inhalt
          sendSmtpEmail.subject = subject;
          sendSmtpEmail.htmlContent = body;  // HTML-Inhalt
          sendSmtpEmail.textContent = body.replace(/<[^>]*>/g, '');  // Plaintext-Inhalt
          
          // API-Key aus der Umgebungsvariable holen
          const apiKey = process.env.BREVO_API_KEY || '';
          
          // Die Brevo-API erfordert den API-Key im Header
          const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail, {
            headers: { 'api-key': apiKey }
          });
          
          console.log('E-Mail erfolgreich über API gesendet, Antwort:', response);
          return true;
        } catch (apiError) {
          console.error('Fehler beim Senden der E-Mail über Brevo API:', apiError);
          
          // Bei API-Fehlern geben wir immer einen Fehler zurück
          console.error('Fehler beim E-Mail-Versand über alle verfügbaren Methoden');
          return false;
        }
      } else {
        // Wenn weder SMTP noch API konfiguriert sind, geben wir einen Fehler zurück
        console.error('Keine gültige E-Mail-Konfiguration vorhanden');
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