import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate, businessSettings } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails
 * Verwendet Brevo (ehemals Sendinblue) als E-Mail-Provider über SMTP
 */
export class BrevoEmailService {
  private apiInstance: TransactionalEmailsApi | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private readonly smtpHost = 'smtp-relay.brevo.com';
  private readonly smtpPort = 587;
  private readonly smtpLogin = '8b7dba001@smtp-brevo.com';

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    
    // Initialisiere API-Client (als Fallback oder für zukünftige Verwendung)
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
      console.warn('Brevo-API-Schlüssel fehlt - E-Mail-Versand wird simuliert');
    }

    // Initialisiere SMTP Transporter (bevorzugte Methode)
    try {
      this.smtpTransporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: false, // true für 465, false für andere Ports
        auth: {
          user: this.smtpLogin,
          pass: apiKey || '' 
        }
      });
      
      console.log('SMTP-Transporter für Brevo wurde initialisiert');
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
      
      // Wenn wir im Entwicklungsmodus sind, simuliere den E-Mail-Versand
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SIMULIERT] E-Mail würde gesendet werden an: ${to}, Betreff: ${subject}`);
        console.log(`[SIMULIERT] Inhalt: ${body}`);
        return true;
      }

      // Versuche, die E-Mail über SMTP zu senden (bevorzugte Methode)
      if (this.smtpTransporter) {
        try {
          console.log('Sende E-Mail über SMTP...');
          
          const mailOptions = {
            from: `"${senderName}" <${this.smtpLogin}>`, // Der SMTP-Login muss als Absender verwendet werden
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
          
          // Bei SMTP-Fehler im Produktionsmodus versuchen wir die API als Fallback
          if (process.env.NODE_ENV === 'production' && this.apiInstance) {
            console.log('Versuche Fallback über API...');
          } else {
            // Im Entwicklungsmodus oder ohne API-Instanz simulieren wir
            console.log('[FALLBACK SIMULATION] E-Mail würde gesendet werden an:', to);
            console.log('[FALLBACK SIMULATION] E-Mail-Betreff:', subject);
            return true;
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
          
          // Bei Fehlern im Produktionsmodus schlagen wir fehl
          if (process.env.NODE_ENV === 'production') {
            return false;
          }
          
          // Im Entwicklungsmodus simulieren wir erfolgreiches Senden
          console.log('[FALLBACK SIMULATION] E-Mail würde gesendet werden an:', to);
          console.log('[FALLBACK SIMULATION] E-Mail-Betreff:', subject);
          return true;
        }
      } else {
        // Wenn weder SMTP noch API konfiguriert sind, simulieren wir im Entwicklungsmodus
        if (process.env.NODE_ENV === 'development') {
          console.log('[SIMULIERT] Keine E-Mail-Konfiguration verfügbar. E-Mail würde gesendet werden an:', to);
          return true;
        } else {
          console.error('Keine gültige E-Mail-Konfiguration vorhanden');
          return false;
        }
      }
    } catch (error) {
      console.error("Error sending email with template:", error);
      return false;
    }
  }
}

// Erstelle eine Singleton-Instanz des E-Mail-Services
export const brevoEmailService = new BrevoEmailService();