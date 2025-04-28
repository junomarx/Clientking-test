import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate, businessSettings } from '@shared/schema';
import { eq, desc, isNull, or } from 'drizzle-orm';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails
 * Verwendet Brevo (ehemals Sendinblue) als E-Mail-Provider über SMTP
 */
export class BrevoEmailService {
  private apiInstance: TransactionalEmailsApi | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;
  // Wir verwenden jetzt die Benutzer-SMTP-Einstellungen statt Brevo

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
  async getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
    // Wenn eine userId angegeben ist, filtern wir nach Vorlagen dieses Benutzers
    // und fügen zusätzlich Vorlagen ohne userId hinzu (Standard-Vorlagen)
    if (userId !== undefined) {
      const templates = await db.select().from(emailTemplates)
        .where(
          // Entweder die userId entspricht der übergebenen userId ODER die userId ist NULL
          // Das stellt sicher, dass wir sowohl benutzerspezifische als auch globale Vorlagen zurückgeben
          eq(emailTemplates.userId, userId)
        )
        .orderBy(desc(emailTemplates.createdAt));
      
      // Zusätzlich auch die globalen Vorlagen (ohne userId) abfragen
      const globalTemplates = await db.select().from(emailTemplates)
        .where(
          // SQL-Ausdruck für "userId IS NULL"
          eq(emailTemplates.userId, null as any)
        )
        .orderBy(desc(emailTemplates.createdAt));
      
      // Beide Ergebnisse kombinieren
      return [...templates, ...globalTemplates];
    }
    
    // Ohne userId Filterung geben wir alle Vorlagen zurück
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
      
      // Benutzer-ID aus den Variablen extrahieren (wenn vorhanden)
      const userId = variables.userId ? parseInt(variables.userId) : 0;
      
      // Geschäftsinformationen für das Absenderfeld des aktuellen Benutzers laden
      const [businessSetting] = await db.select().from(businessSettings)
        .where(eq(businessSettings.userId, userId));
      
      if (!businessSetting) {
        console.error(`Keine Geschäftseinstellungen für Benutzer ${userId} gefunden`);
        return false;
      }
      
      const senderEmail = businessSetting.email || 'no-reply@example.com';
      const senderName = businessSetting.businessName || 'Handyshop Verwaltung';
      
      // Zusätzliche Debug-Informationen
      console.log(`E-Mail-Versand für Benutzer ${userId}: ${businessSetting.businessName}`);
      console.log(`SMTP-Einstellungen: ${businessSetting.smtpHost}:${businessSetting.smtpPort}`);
      console.log(`Absender: "${senderName}" <${businessSetting.smtpUser}>`);
      console.log(`E-Mail wird gesendet an: ${to}, Betreff: ${subject}`);
      
      // Benutzer-spezifischen SMTP-Transporter erstellen
      if (!businessSetting.smtpHost || !businessSetting.smtpPort || !businessSetting.smtpUser || !businessSetting.smtpPassword) {
        console.error(`Fehlende SMTP-Einstellungen für Benutzer ${userId}`);
        return false;
      }
      
      // SMTP-Transporter für diesen Benutzer erstellen
      const smtpConfig: SMTPTransport.Options = {
        host: businessSetting.smtpHost,
        port: parseInt(businessSetting.smtpPort.toString()), // Stellen Sie sicher, dass es eine Zahl ist
        secure: parseInt(businessSetting.smtpPort.toString()) === 465, // true für 465, false für andere Ports
        auth: {
          user: businessSetting.smtpUser,
          pass: businessSetting.smtpPassword
        }
      };
      const userSmtpTransporter = nodemailer.createTransport(smtpConfig);
      
      try {
        console.log('Sende E-Mail über benutzerspezifischen SMTP-Server...');
        
        const mailOptions = {
          from: `"${senderName}" <${businessSetting.smtpUser}>`, // Benutzer-SMTP als Absender
          to: to,
          subject: subject,
          html: body,
          text: body.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
        };
        
        const info = await userSmtpTransporter.sendMail(mailOptions);
        console.log('E-Mail erfolgreich über benutzerspezifischen SMTP-Server gesendet:', info.messageId);
        return true;
      } catch (smtpError) {
        console.error('Fehler beim Senden der E-Mail über benutzerspezifischen SMTP-Server:', smtpError);
        
        // Bei Fehlern mit dem benutzerspezifischen Server verwenden wir den globalen SMTP-Server als Fallback
        if (this.smtpTransporter) {
          try {
            console.log('Versuche Fallback über globalen SMTP-Server...');
            
            const mailOptions = {
              from: `"${senderName}" <${process.env.SMTP_USER}>`, // Globalen SMTP-Login als Absender
              to: to,
              subject: subject,
              html: body,
              text: body.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
            };
            
            const info = await this.smtpTransporter.sendMail(mailOptions);
            console.log('E-Mail erfolgreich über globalen SMTP-Server gesendet:', info.messageId);
            return true;
          } catch (globalSmtpError) {
            console.error('Fehler beim Senden der E-Mail über globalen SMTP-Server:', globalSmtpError);
            return false;
          }
        } else {
          console.error('Kein globaler SMTP-Server als Fallback verfügbar');
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