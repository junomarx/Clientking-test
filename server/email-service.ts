import { db } from './db';
import { 
  emailTemplates, 
  type EmailTemplate, 
  type InsertEmailTemplate, 
  businessSettings, 
  emailHistory, 
  type InsertEmailHistory, 
  users,
  superadminEmailSettings,
  type SuperadminEmailSettings
} from '@shared/schema';
import { eq, desc, isNull, or, and, SQL, count } from 'drizzle-orm';
import { storage } from './storage';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails über SMTP
 */
export class EmailService {
  private smtpTransporter: nodemailer.Transporter | null = null;
  private superadminSmtpTransporter: nodemailer.Transporter | null = null;
  private superadminEmailConfig: SuperadminEmailSettings | null = null;

  constructor() {
    // Initialisiere die SMTP-Transporters
    this.initDefaultSmtpTransporter();
    this.initSuperadminSmtpTransporter(); // Asynchron, aber kein await in constructor möglich
  }

  /**
   * Initialisiert den Standard-SMTP-Transporter mit den Umgebungsvariablen
   */
  private initDefaultSmtpTransporter() {
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;
      
      // Prüfe, ob alle erforderlichen SMTP-Einstellungen vorhanden sind
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        console.warn('Eine oder mehrere globale SMTP-Einstellungen fehlen');
      } else {
        // Verwende die globalen SMTP-Einstellungen als Fallback
        const config = {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true für 465, false für andere Ports
          auth: {
            user: smtpUser,
            pass: smtpPassword
          },
          // Debug-Optionen aktivieren
          debug: true,
          logger: true
        };
        
        console.log('Standard SMTP-Konfiguration:', {
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: { user: config.auth.user, pass: '********' }
        });
        
        this.smtpTransporter = nodemailer.createTransport(config);
        
        console.log(`Standard SMTP-Transporter für ${smtpHost} wurde initialisiert`);
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren des Standard-SMTP-Transporters:', error);
      this.smtpTransporter = null;
    }
  }

  /**
   * Initialisiert den Superadmin-SMTP-Transporter mit den Einstellungen aus der Datenbank
   */
  private async initSuperadminSmtpTransporter() {
    try {
      // Lade die Superadmin-E-Mail-Einstellungen aus der Datenbank
      const [settings] = await db
        .select()
        .from(superadminEmailSettings)
        .where(eq(superadminEmailSettings.isActive, true))
        .limit(1);
      
      if (!settings) {
        console.warn('Keine aktiven Superadmin-E-Mail-Einstellungen in der Datenbank gefunden');
        return;
      }
      
      // Speichern der Konfiguration für spätere Verwendung
      this.superadminEmailConfig = settings;
      
      // Erstelle den Transporter mit den Superadmin-Einstellungen
      const config = {
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465, // true für 465, false für andere Ports
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        },
        // Debug-Optionen aktivieren
        debug: true,
        logger: true
      };
      
      console.log('Superadmin SMTP-Konfiguration:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.auth.user, pass: '********' },
        sender: settings.smtpSenderEmail
      });
      
      this.superadminSmtpTransporter = nodemailer.createTransport(config);
      
      console.log(`Superadmin SMTP-Transporter für ${settings.smtpHost} wurde initialisiert`);
    } catch (error) {
      console.error('Fehler beim Initialisieren des Superadmin-SMTP-Transporters:', error);
      this.superadminSmtpTransporter = null;
    }
  }
  
  /**
   * Aktualisiert die SMTP-Einstellungen für den Superadmin-Transporter
   */
  async updateSuperadminSmtpSettings(settings: Omit<SuperadminEmailSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Aktualisieren oder Einfügen der Einstellungen in die Datenbank
      let existingSettings;
      
      try {
        [existingSettings] = await db
          .select()
          .from(superadminEmailSettings)
          .limit(1);
      } catch (err) {
        console.error('Fehler beim Abrufen der vorhandenen Superadmin-E-Mail-Einstellungen:', err);
      }
      
      if (existingSettings) {
        // Aktualisieren der vorhandenen Einstellungen
        await db
          .update(superadminEmailSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(superadminEmailSettings.id, existingSettings.id));
        
        console.log(`Superadmin-E-Mail-Einstellungen mit ID ${existingSettings.id} aktualisiert`);
      } else {
        // Neue Einstellungen erstellen
        await db
          .insert(superadminEmailSettings)
          .values({
            ...settings,
            isActive: true
          });
        
        console.log('Neue Superadmin-E-Mail-Einstellungen erstellt');
      }
      
      // Transporter mit den neuen Einstellungen aktualisieren
      const config = {
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        },
        debug: true,
        logger: true
      };
      
      // Bestehenden Transporter schließen, wenn vorhanden
      if (this.superadminSmtpTransporter) {
        this.superadminSmtpTransporter.close();
      }
      
      // Neuen Transporter erstellen
      this.superadminSmtpTransporter = nodemailer.createTransport(config);
      
      // Verbindung testen
      await this.superadminSmtpTransporter.verify();
      
      // Konfiguration speichern
      this.superadminEmailConfig = {
        id: existingSettings ? existingSettings.id : 1,
        ...settings,
        isActive: true,
        createdAt: existingSettings ? existingSettings.createdAt : new Date(),
        updatedAt: new Date()
      };
      
      console.log(`Superadmin SMTP-Transporter für ${settings.smtpHost} wurde aktualisiert`);
      return true;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Superadmin-SMTP-Transporters:', error);
      return false;
    }
  }

  /**
   * Aktualisiert die SMTP-Einstellungen für den Standard-Transporter
   */
  async updateSmtpTransporter(config: SMTPTransport.Options): Promise<boolean> {
    try {
      // Bestehenden Transporter schließen, wenn vorhanden
      if (this.smtpTransporter) {
        this.smtpTransporter.close();
      }
      
      // Debug-Optionen hinzufügen
      const updatedConfig = {
        ...config,
        debug: true,
        logger: true
      };
      
      console.log('SMTP-Konfiguration wird aktualisiert:', {
        host: updatedConfig.host,
        port: updatedConfig.port,
        secure: updatedConfig.secure,
        auth: updatedConfig.auth ? { user: (updatedConfig.auth as any).user, pass: '********' } : undefined
      });
      
      // Neuen Transporter erstellen
      this.smtpTransporter = nodemailer.createTransport(updatedConfig);
      
      // Verbindung testen
      await this.smtpTransporter.verify();
      
      console.log(`Standard SMTP-Transporter für ${config.host} wurde aktualisiert`);
      return true;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Standard-SMTP-Transporters:', error);
      return false;
    }
  }
  
  /**
   * Sendet eine Test-E-Mail mit den Superadmin-SMTP-Einstellungen
   */
  async sendSuperadminTestEmail(to: string): Promise<boolean> {
    try {
      if (!this.superadminSmtpTransporter) {
        // Versuche, den Transporter zu initialisieren, falls er noch nicht existiert
        await this.initSuperadminSmtpTransporter();
        
        if (!this.superadminSmtpTransporter) {
          throw new Error('Kein Superadmin-SMTP-Transporter konfiguriert');
        }
      }
      
      if (!this.superadminEmailConfig) {
        throw new Error('Keine Superadmin-E-Mail-Konfiguration verfügbar');
      }
      
      const senderName = this.superadminEmailConfig.smtpSenderName;
      const senderEmail = this.superadminEmailConfig.smtpSenderEmail;
      
      console.log(`Sending superadmin test email with sender: "${senderName}" <${senderEmail}> to ${to}`);
      
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: to,
        subject: 'Superadmin-Test-E-Mail von Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5;">Superadmin-Test-E-Mail erfolgreich!</h2>
            </div>
            
            <p>Diese E-Mail bestätigt, dass Ihre Superadmin-SMTP-Einstellungen korrekt konfiguriert sind.</p>
            
            <p>Ihre Handyshop Verwaltung ist nun bereit, systemrelevante E-Mails über die Superadmin-E-Mail-Adresse zu versenden.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht darauf.</p>
            </div>
          </div>
        `,
        text: 'Superadmin-Test-E-Mail erfolgreich! Diese E-Mail bestätigt, dass Ihre Superadmin-SMTP-Einstellungen korrekt konfiguriert sind. Ihre Handyshop Verwaltung ist nun bereit, systemrelevante E-Mails zu versenden.'
      };
      
      const info = await this.superadminSmtpTransporter.sendMail(mailOptions);
      console.log('Superadmin-Test-E-Mail erfolgreich gesendet:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Superadmin-Test-E-Mail:', error);
      return false;
    }
  }
  
  /**
   * Sendet eine Test-E-Mail mit den Standard-SMTP-Einstellungen
   */
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      if (!this.smtpTransporter) {
        throw new Error('Kein SMTP-Transporter konfiguriert');
      }
      
      // Für World4You muss die Absender-E-Mail mit dem SMTP-Benutzer übereinstimmen
      const senderName = process.env.SMTP_SENDER_NAME || 'Handyshop Verwaltung';
      const senderEmail = process.env.SMTP_USER || 'no-reply@example.com';
      
      console.log(`Sending test email with sender: "${senderName}" <${senderEmail}> to ${to}`);
      
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: to,
        subject: 'Test-E-Mail von Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5;">Test-E-Mail erfolgreich!</h2>
            </div>
            
            <p>Diese E-Mail bestätigt, dass Ihre SMTP-Einstellungen korrekt konfiguriert sind.</p>
            
            <p>Ihre Handyshop Verwaltung ist nun bereit, E-Mails zu versenden.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht darauf.</p>
            </div>
          </div>
        `,
        text: 'Test-E-Mail erfolgreich! Diese E-Mail bestätigt, dass Ihre SMTP-Einstellungen korrekt konfiguriert sind. Ihre Handyshop Verwaltung ist nun bereit, E-Mails zu versenden.'
      };
      
      const info = await this.smtpTransporter.sendMail(mailOptions);
      console.log('Test-E-Mail erfolgreich gesendet:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Test-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail mit einer benutzerdefinierten Vorlage
   * @param isSystemEmail Wenn true, wird die E-Mail über den Superadmin-SMTP-Transporter gesendet
   */
  async sendEmailWithTemplate({
    templateName,
    recipientEmail,
    data,
    subject,
    body,
    isSystemEmail = false
  }: {
    templateName: string,
    recipientEmail: string,
    data: Record<string, string>,
    subject: string,
    body: string
    isSystemEmail?: boolean
  }): Promise<boolean> {
    try {
      // Ersetze Platzhalter in Betreff und Text mit den übergebenen Daten
      let processedSubject = subject;
      let processedBody = body;
      
      // Alle Variablen ersetzen
      Object.entries(data).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        processedSubject = processedSubject.replace(placeholder, value);
        processedBody = processedBody.replace(placeholder, value);
      });
      
      // Wähle den richtigen SMTP-Transporter basierend auf isSystemEmail
      let transporter: nodemailer.Transporter;
      let senderName: string;
      let senderEmail: string;
      
      if (isSystemEmail && this.superadminSmtpTransporter && this.superadminEmailConfig) {
        // Superadmin-SMTP-Einstellungen verwenden
        transporter = this.superadminSmtpTransporter;
        senderName = this.superadminEmailConfig.smtpSenderName;
        senderEmail = this.superadminEmailConfig.smtpSenderEmail;
        
        console.log(`Sende System-E-Mail mit Vorlage "${templateName}" über Superadmin-SMTP`);
      } else {
        // Standard-SMTP-Einstellungen verwenden
        if (!this.smtpTransporter) {
          throw new Error("Standard-SMTP-Transporter nicht konfiguriert");
        }
        
        if (!process.env.SMTP_USER) {
          throw new Error("SMTP_USER nicht konfiguriert");
        }
        
        transporter = this.smtpTransporter;
        senderName = process.env.SMTP_SENDER_NAME || 'Handyshop Verwaltung';
        senderEmail = process.env.SMTP_USER;
        
        console.log(`Sende Benutzer-E-Mail mit Vorlage "${templateName}" über Standard-SMTP`);
      }
      
      console.log(`Sending ${isSystemEmail ? 'system' : 'user'} email with sender: "${senderName}" <${senderEmail}> to ${recipientEmail}`);
      
      // Erstelle E-Mail-Optionen mit den ausgewählten SMTP-Einstellungen
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: processedSubject,
        html: processedBody,
        text: processedBody.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
      };
      
      // Sende die E-Mail über den ausgewählten SMTP-Transporter
      const info = await transporter.sendMail(mailOptions);
      console.log(`E-Mail mit Vorlage erfolgreich gesendet (${isSystemEmail ? 'System' : 'Benutzer'})`, info.messageId);
      
      return true;
    } catch (error) {
      console.error(`Fehler beim Senden der E-Mail mit Vorlage (${isSystemEmail ? 'System' : 'Benutzer'}):`, error);
      return false;
    }
  }
  
  /**
   * Sendet eine E-Mail mit einer Vorlage, die aus der Datenbank geladen wird
   * @param isSystemEmail Wenn true, wird die E-Mail über den Superadmin-SMTP-Transporter gesendet
   */
  async sendEmailWithTemplateById(
    templateId: number, 
    to: string, 
    variables: Record<string, string>,
    isSystemEmail = false
  ): Promise<boolean> {
    try {
      // Benutzer-ID aus den Variablen extrahieren (wenn vorhanden)
      const userId = variables.userId ? parseInt(variables.userId) : 0;
      
      // Lade die Vorlage unter Berücksichtigung der Shop-ID des Benutzers
      const template = await this.getEmailTemplate(templateId, userId);
      if (!template) {
        throw new Error("E-Mail-Vorlage nicht gefunden");
      }
      
      // Variablen in Betreff und Text ersetzen
      let subject = template.subject;
      let body = template.body;
      
      // Geschäftsinformationen für das Absenderfeld des aktuellen Benutzers laden
      let businessSetting;
      if (userId > 0) {
        [businessSetting] = await db.select().from(businessSettings)
          .where(eq(businessSettings.userId, userId));
        
        if (!businessSetting) {
          console.error(`Keine Geschäftseinstellungen für Benutzer ${userId} gefunden`);
        }
      }
      
      // Füge das aktuelle Jahr als Variable hinzu
      variables["aktuellesJahr"] = new Date().getFullYear().toString();
      
      // Füge alle relevanten Geschäftsdaten als Variablen hinzu, wenn Geschäftseinstellungen vorhanden sind
      if (businessSetting) {
        // Geschäftsname als Variable
        if (!variables["geschaeftsname"] && businessSetting.businessName) {
          variables["geschaeftsname"] = businessSetting.businessName;
        }
        
        // Adresse als Variable
        if (!variables["adresse"] && businessSetting.streetAddress) {
          variables["adresse"] = `${businessSetting.streetAddress}, ${businessSetting.zipCode} ${businessSetting.city}`;
        }
        
        // Telefonnummer als Variable
        if (!variables["telefon"] && businessSetting.phone) {
          variables["telefon"] = businessSetting.phone;
        }
        
        // E-Mail als Variable
        if (!variables["email"] && businessSetting.email) {
          variables["email"] = businessSetting.email;
        }
      }
      
      // E-Mail mit Vorlage senden
      const success = await this.sendEmailWithTemplate({
        templateName: template.name,
        recipientEmail: to,
        data: variables,
        subject: subject,
        body: body,
        isSystemEmail: isSystemEmail || template.type === 'app' // System-E-Mails oder App-Vorlagen immer über Superadmin senden
      });
      
      if (success) {
        // E-Mail-Verlauf nur speichern, wenn ein Benutzer angegeben ist und die E-Mail erfolgreich gesendet wurde
        if (userId > 0 && variables.repairId) {
          try {
            const repairId = parseInt(variables.repairId);
            
            // E-Mail-Verlauf speichern
            const historyEntry: InsertEmailHistory = {
              repairId: repairId,
              emailTemplateId: templateId,
              subject: subject,
              recipient: to,
              status: "success",
              userId: userId,
              shopId: template.shopId
            };
            
            await db.insert(emailHistory).values(historyEntry);
            console.log(`E-Mail-Verlauf für Reparatur ${repairId} gespeichert`);
          } catch (historyError) {
            console.error("Fehler beim Speichern des E-Mail-Verlaufs:", historyError);
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error("Fehler beim Senden der E-Mail mit Vorlage:", error);
      
      // Fehlerprotokollierung im E-Mail-Verlauf, wenn Reparatur-ID vorhanden ist
      if (variables.userId && variables.repairId) {
        try {
          const userId = parseInt(variables.userId);
          const repairId = parseInt(variables.repairId);
          
          // Speichere den fehlgeschlagenen Versuch im Verlauf
          const historyEntry: InsertEmailHistory = {
            repairId: repairId,
            emailTemplateId: templateId,
            subject: "Fehlgeschlagen",
            recipient: to,
            status: "failed",
            userId: userId,
            shopId: 1 // Standard-Shop-ID
          };
          
          await db.insert(emailHistory).values(historyEntry);
        } catch (historyError) {
          console.error("Fehler beim Speichern des fehlgeschlagenen E-Mail-Verlaufs:", historyError);
        }
      }
      
      return false;
    }
  }

  /**
   * Holt alle E-Mail-Vorlagen für einen bestimmten Benutzer (mit DSGVO-konformen Shop-Filter)
   */
  async getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
    try {
      // Superadmin kann alle globalen Vorlagen sehen
      if (userId === null) {
        const globalTemplates = await db.select().from(emailTemplates)
          .where(eq(emailTemplates.userId, null as any))
          .orderBy(desc(emailTemplates.updatedAt));
        
        return globalTemplates;
      }
      
      // Benutzer abrufen, um Shop-ID zu erhalten
      const user = await storage.getUser(userId || 0);
      if (!user) return [];
      
      // SQL-Bedingung basierend auf Benutzerrechten erstellen
      let whereCondition: SQL<unknown>;
      
      // DSGVO-konform: Benutzer dürfen nur Vorlagen ihres eigenen Shops sehen
      const shopId = user.shopId || 1;
      whereCondition = or(
        and(
          eq(emailTemplates.shopId, shopId),
          eq(emailTemplates.userId, userId)
        ),
        eq(emailTemplates.userId, null as any) // Globale Vorlagen sind für alle sichtbar
      ) as SQL<unknown>;
      
      // Vorlagen ohne [ARCHIVIERT] im Namen bevorzugen
      const allTemplates = await db.select().from(emailTemplates)
        .where(whereCondition)
        .orderBy(desc(emailTemplates.updatedAt));
      
      return allTemplates;
    } catch (error) {
      console.error("Fehler beim Abrufen der E-Mail-Vorlagen:", error);
      return [];
    }
  }

  /**
   * Holt eine bestimmte E-Mail-Vorlage anhand ihrer ID (mit DSGVO-konformen Shop-Filter)
   */
  async getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined> {
    try {
      // Superadmin-Fall: Globale Vorlagen abrufen
      if (userId === null) {
        const [template] = await db.select().from(emailTemplates)
          .where(eq(emailTemplates.id, id))
          .where(eq(emailTemplates.userId, null as any))
          .limit(1);
        
        return template;
      }
      
      // Benutzer abrufen, um Shop-ID zu erhalten
      const user = await storage.getUser(userId || 0);
      if (!user) return undefined;
      
      // SQL-Bedingung basierend auf Benutzerrechten erstellen
      let whereCondition: SQL<unknown>;
      
      // DSGVO-konform: Benutzer dürfen nur Vorlagen ihres eigenen Shops sehen
      // (außer globale Vorlagen, die für alle sichtbar sind)
      const shopId = user.shopId || 1;
      whereCondition = or(
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.shopId, shopId)
        ),
        and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.userId, null as any)
        )
      ) as SQL<unknown>;
      
      const [template] = await db.select().from(emailTemplates)
        .where(whereCondition)
        .limit(1);
      
      return template;
    } catch (error) {
      console.error("Fehler beim Abrufen der E-Mail-Vorlage:", error);
      return undefined;
    }
  }

  /**
   * Erstellt eine neue E-Mail-Vorlage für einen Benutzer (mit DSGVO-konformen Shop-Filter)
   */
  async createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate> {
    // Superadmin-Fall: Globale Vorlage erstellen
    if (userId === null) {
      const [createdTemplate] = await db.insert(emailTemplates).values({
        ...template,
        userId: null as any,
        shopId: 0
      }).returning();
      
      return createdTemplate;
    }
    
    // Benutzer abrufen, um Shop-ID zuzuweisen
    const user = await storage.getUser(userId || 0);
    if (!user) throw new Error("Benutzer nicht gefunden");
    
    // DSGVO-konform: Vorlagen werden immer dem Shop des Benutzers zugeordnet
    const shopId = user.shopId || 1;
    
    const [createdTemplate] = await db.insert(emailTemplates).values({
      ...template,
      userId,
      shopId
    }).returning();
    
    return createdTemplate;
  }

  /**
   * Aktualisiert eine bestehende E-Mail-Vorlage für einen Benutzer (mit DSGVO-konformen Shop-Filter)
   */
  async updateEmailTemplate(id: number, template: Partial<EmailTemplate>, userId?: number): Promise<EmailTemplate | undefined> {
    // Superadmin-Fall: Globale Vorlage aktualisieren
    if (userId === null) {
      const [updatedTemplate] = await db.update(emailTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(emailTemplates.id, id),
            eq(emailTemplates.userId, null as any)
          )
        )
        .returning();
      return updatedTemplate;
    }
    
    try {
      // Benutzer abrufen, um Shop-ID zu erhalten
      if (!userId) return undefined;
      const user = await storage.getUser(userId);
      if (!user) return undefined;
      
      // SQL-Bedingung basierend auf Benutzerrechten erstellen
      let whereCondition: SQL<unknown>;
      
      // DSGVO-konform: Admins und normale Benutzer dürfen nur Vorlagen ihres eigenen Shops aktualisieren
      const shopId = user.shopId || 1;
      whereCondition = and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.shopId, shopId)
      ) as SQL<unknown>;
      
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(whereCondition)
        .returning();
      
      return updatedTemplate;
    } catch (error) {
      console.error("Fehler beim Aktualisieren der E-Mail-Vorlage:", error);
      return undefined;
    }
  }

  /**
   * Löscht eine E-Mail-Vorlage (mit DSGVO-konformen Shop-Filter)
   * Wenn die Vorlage in der E-Mail-Historie verwendet wird, wird sie archiviert statt gelöscht
   */
  async deleteEmailTemplate(id: number, userId?: number): Promise<boolean> {
    try {
      // Zuerst prüfen, ob die Vorlage in der E-Mail-Historie verwendet wird
      const emailHistoryEntries = await db.select()
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, id));
      
      const usageCount = emailHistoryEntries.length;
      
      if (usageCount > 0) {
        console.log(`E-Mail-Vorlage mit ID ${id} wird in ${usageCount} E-Mail-Historie-Einträgen verwendet und kann nicht gelöscht werden.`);
        
        // Duplizierte Vorlagen finden und Benutzer informieren
        let templateQuery = db.select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, id));
        
        const templateToDelete = await templateQuery.execute();
        
        if (templateToDelete.length === 0) {
          return false;
        }
        
        const template = templateToDelete[0];
        
        // Vorlage umbenennen, um sie als archiviert zu kennzeichnen
        if (!template.name.startsWith('[ARCHIVIERT]')) {
          await db.update(emailTemplates)
            .set({
              name: `[ARCHIVIERT] ${template.name}`,
              updatedAt: new Date()
            })
            .where(eq(emailTemplates.id, id));
          
          console.log(`Vorlage "${template.name}" wurde als archiviert markiert, da sie in der E-Mail-Historie verwendet wird.`);
        }
        
        return true; // Erfolg, obwohl nicht gelöscht, sondern nur archiviert
      }
      
      // Sonst: Lösche die Vorlage, wenn sie nicht in der Historie verwendet wird
      
      // Unterscheiden zwischen Superadmin (globale Vorlagen) und normalen Benutzern
      let deleteCondition: SQL<unknown>;
      
      if (userId === null) {
        // Superadmin: Nur globale Vorlagen löschen
        deleteCondition = and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.userId, null as any)
        ) as SQL<unknown>;
      } else {
        // Normaler Benutzer: Shop-basierte Einschränkung
        if (!userId) return false;
        const user = await storage.getUser(userId);
        if (!user) return false;
        
        const shopId = user.shopId || 1;
        deleteCondition = and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.shopId, shopId)
        ) as SQL<unknown>;
      }
      
      const result = await db.delete(emailTemplates)
        .where(deleteCondition);
      
      return true;
    } catch (error) {
      console.error("Fehler beim Löschen der E-Mail-Vorlage:", error);
      return false;
    }
  }

  /**
   * Verwaltet die redundanten E-Mail-Vorlagen (entfernt "Reparatur abgeschlossen" wenn "Reparatur abholbereit" existiert)
   * Diese Methode verhindert doppelte Vorlagen für den gleichen Zweck
   */
  async cleanupRedundantTemplates(userId?: number | null): Promise<void> {
    console.log("Start Bereinigung redundanter E-Mail-Vorlagen...");
    
    if (userId !== null && userId !== undefined) {
      // Nur für einen bestimmten Benutzer bereinigen
      await this.cleanupCompletedTemplateForUser(userId);
    } else {
      // Für alle Benutzer bereinigen
      const allUsers = await db.select().from(users);
      console.log(`Gefunden: ${allUsers.length} Benutzer insgesamt.`);
      
      for (const user of allUsers) {
        console.log(`Bearbeite Benutzer: ${user.username} (ID: ${user.id})`);
        await this.cleanupCompletedTemplateForUser(user.id);
      }
    }
    
    console.log("Bereinigung redundanter E-Mail-Vorlagen abgeschlossen.");
  }

  /**
   * Archiviert die "Reparatur abgeschlossen" Vorlage für einen bestimmten Benutzer
   */
  private async archiveCompletedTemplateForUser(userId: number): Promise<void> {
    try {
      // "Reparatur abgeschlossen" Vorlage für den Benutzer finden
      const [completedTemplate] = await db.select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.userId, userId),
            eq(emailTemplates.name, "Reparatur abgeschlossen")
          )
        );
      
      if (!completedTemplate) {
        console.log(`Keine "Reparatur abgeschlossen" Vorlage für Benutzer ${userId} gefunden.`);
        return;
      }
      
      // Prüfen, ob die Vorlage in der E-Mail-Historie verwendet wird
      const historyEntries = await db.select()
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, completedTemplate.id));
      
      if (historyEntries.length > 0) {
        // Vorlage umbenennen, um sie als archiviert zu kennzeichnen
        await db.update(emailTemplates)
          .set({
            name: `[ARCHIVIERT] Reparatur abgeschlossen`,
            updatedAt: new Date()
          })
          .where(eq(emailTemplates.id, completedTemplate.id));
        
        console.log(`Vorlage "Reparatur abgeschlossen" für Benutzer ${userId} wurde als archiviert markiert, da sie in der E-Mail-Historie verwendet wird.`);
      } else {
        // Vorlage löschen, wenn sie nicht in der Historie verwendet wird
        await db.delete(emailTemplates)
          .where(eq(emailTemplates.id, completedTemplate.id));
        
        console.log(`Vorlage "Reparatur abgeschlossen" für Benutzer ${userId} wurde gelöscht.`);
      }
    } catch (error) {
      console.error(`Fehler beim Archivieren der "Reparatur abgeschlossen" Vorlage für Benutzer ${userId}:`, error);
    }
  }

  /**
   * Spezielle Methode zur Bereinigung der "Reparatur abgeschlossen" Vorlage für einen Benutzer
   * Diese Methode behandelt spezifisch die Redundanz zwischen "Reparatur abgeschlossen" und "Reparatur abholbereit"
   */
  private async cleanupCompletedTemplateForUser(userId: number | null): Promise<void> {
    if (userId === null) return;
    
    try {
      // "Reparatur abholbereit" Vorlage für den Benutzer finden
      const [readyTemplate] = await db.select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.userId, userId),
            eq(emailTemplates.name, "Reparatur abholbereit")
          )
        );
      
      if (!readyTemplate) {
        console.log(`Keine "Reparatur abholbereit" Vorlage für Benutzer ${userId} gefunden. Überspringen.`);
        return;
      }
      
      // "Reparatur abgeschlossen" Vorlage finden und ggf. archivieren oder löschen
      await this.archiveCompletedTemplateForUser(userId);
    } catch (error) {
      console.error(`Fehler bei der Bereinigung für Benutzer ${userId}:`, error);
    }
  }
}

export const emailService = new EmailService();