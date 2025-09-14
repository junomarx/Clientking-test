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
  type SuperadminEmailSettings,
  newsletterLogos
} from '@shared/schema';
import { eq, desc, isNull, or, and, SQL, count, sql } from 'drizzle-orm';
import { storage } from './storage';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

// Debug-Konstante wurde entfernt, damit immer die tatsächlich konfigurierten Benutzereinstellungen verwendet werden
// Bei Problemen mit der E-Mail-Konfiguration hier NICHT eingreifen, stattdessen die Logs analysieren
// und die tatsächliche Konfiguration in der Datenbank korrigieren

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails über SMTP
 */
export class EmailService {
  private smtpTransporter: nodemailer.Transporter | null = null;
  private superadminEmailConfig: SuperadminEmailSettings | null = null;

  constructor() {
    // Initialisiere nur den Superadmin-SMTP-Transporter für alle App-E-Mails
    this.initSuperadminSmtpTransporter(); // Asynchron, aber kein await in constructor möglich
  }



  /**
   * Initialisiert den zentralen SMTP-Transporter mit den Einstellungen aus der Datenbank
   * Dieser wird für alle System-E-Mails verwendet (App-Benachrichtigungen, Registrierung, etc.)
   */
  private async initSuperadminSmtpTransporter() {
    try {
      // Lade die globalen E-Mail-Einstellungen aus der Datenbank
      const [settings] = await db
        .select()
        .from(superadminEmailSettings)
        .where(eq(superadminEmailSettings.isActive, true))
        .limit(1);
      
      if (!settings) {
        console.warn('Keine aktiven globalen E-Mail-Einstellungen in der Datenbank gefunden');
        console.warn('E-Mail-Versand ist deaktiviert, bis gültige SMTP-Einstellungen konfiguriert werden');
        return;
      }
      
      // Speichern der Konfiguration für spätere Verwendung
      this.superadminEmailConfig = settings;
      
      // Erstelle den Transporter mit den globalen Einstellungen für ALLE System-E-Mails
      let portNum = 587;
      try {
        portNum = typeof settings.smtpPort === 'string' 
          ? parseInt(settings.smtpPort) 
          : settings.smtpPort || 587;
      } catch (e) {
        console.warn(`Konnte SMTP-Port nicht parsen, verwende Standard-Port 587: ${e}`);
      }
      
      const config = {
        host: settings.smtpHost,
        port: portNum,
        secure: portNum === 465, // true für 465, false für andere Ports
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        },
        // Debug-Optionen aktivieren
        debug: true,
        logger: true
      };
      
      console.log('Zentrale SMTP-Konfiguration für System-E-Mails:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.auth.user, pass: '********' },
        sender: settings.smtpSenderEmail
      });
      
      // Verwende nur noch einen einzigen Transporter für alle System-E-Mails
      this.smtpTransporter = nodemailer.createTransport(config);
      
      console.log(`Zentraler SMTP-Transporter für System-E-Mails wurde initialisiert (Host: ${settings.smtpHost})`);
    } catch (error) {
      console.error('Fehler beim Initialisieren des zentralen SMTP-Transporters:', error);
      this.smtpTransporter = null;
    }
  }
  
  /**
   * Lädt die globale E-Mail-Konfiguration ohne SMTP-Test
   * Diese Methode dient dazu, die Konfiguration im Service zu aktualisieren,
   * ohne eine SMTP-Verbindung zu testen.
   */
  loadSuperadminEmailConfig(settings: Omit<SuperadminEmailSettings, 'id' | 'createdAt' | 'updatedAt'>) {
    console.log('Lade globale E-Mail-Konfiguration ohne Verbindungstest');
    
    // Speichere die Konfiguration im Service
    this.superadminEmailConfig = {
      id: 1, // Standard-ID, wenn keine bekannt ist
      ...settings,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Schließe bestehenden Transporter, falls vorhanden
    if (this.smtpTransporter) {
      this.smtpTransporter.close();
      this.smtpTransporter = null;
    }
    
    console.log('Globale E-Mail-Konfiguration erfolgreich geladen');
  }

  /**
   * Aktualisiert die zentralen SMTP-Einstellungen für alle System-E-Mails
   * und testet die SMTP-Verbindung
   */
  async updateSuperadminSmtpSettings(settings: Omit<SuperadminEmailSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Speichere zuerst die Konfiguration
      this.loadSuperadminEmailConfig(settings);
      
      try {
        // Transporter mit den neuen Einstellungen aktualisieren
        let portNum = 587;
        try {
          portNum = parseInt(settings.smtpPort);
        } catch (e) {
          console.warn(`Konnte SMTP-Port nicht parsen, verwende Standard-Port 587: ${e}`);
        }
        
        const config = {
          host: settings.smtpHost,
          port: Number(portNum),
          secure: Number(portNum) === 465,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPassword
          },
          // Eine angemessene Zeitüberschreitung festlegen
          connectionTimeout: 10000, // 10 Sekunden
          // Authentifizierungsmechanismen festlegen
          authMethod: 'PLAIN',
          // TLS-Sicherheit: Nur in Entwicklung deaktivieren, NIE in Produktion!
          tls: {
            rejectUnauthorized: process.env.NODE_ENV !== 'development'
          },
          // Debug-Optionen
          debug: true,
          logger: true
        };
        
        console.log('Teste SMTP-Verbindung mit den folgenden Einstellungen:', {
          host: settings.smtpHost,
          port: Number(portNum),
          secure: Number(portNum) === 465,
          user: settings.smtpUser,
          sender: settings.smtpSenderEmail
        });
        
        // Transporter erstellen und setzen
        this.smtpTransporter = nodemailer.createTransport(config);
        
        // Verbindung testen
        await this.smtpTransporter.verify();
        
        console.log(`SMTP-Verbindung zu ${settings.smtpHost} erfolgreich getestet`);
        return true;
      } catch (smtpError) {
        console.error('SMTP-Verbindungstest fehlgeschlagen:', smtpError);
        console.warn('SMTP-Verbindungstest fehlgeschlagen, aber Konfiguration wurde gespeichert.');
        return false;
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des SMTP-Transporters:', error);
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
   * Sendet eine Test-E-Mail mit den zentralen SMTP-Einstellungen
   * Diese Methode testet die Konfiguration für System-E-Mails
   */
  async sendSuperadminTestEmail(to: string): Promise<boolean> {
    try {
      console.log('Starte Versand einer Test-E-Mail an:', to);
      
      if (!this.smtpTransporter) {
        console.log('Kein SMTP-Transporter vorhanden, versuche Initialisierung...');
        // Versuche, den Transporter zu initialisieren, falls er noch nicht existiert
        await this.initSuperadminSmtpTransporter();
        
        if (!this.smtpTransporter) {
          console.error('Initialisierung des SMTP-Transporters fehlgeschlagen');
          throw new Error('Kein SMTP-Transporter konfiguriert');
        }
      }
      
      if (!this.superadminEmailConfig) {
        console.error('Keine E-Mail-Konfiguration verfügbar');
        throw new Error('Keine E-Mail-Konfiguration verfügbar');
      }
      
      const senderName = this.superadminEmailConfig.smtpSenderName;
      const senderEmail = this.superadminEmailConfig.smtpSenderEmail;
      
      console.log(`Sende zentrale System-Test-E-Mail von: "${senderName}" <${senderEmail}> an: ${to}`);
      
      // Der SMTP-Transporter wurde bereits initialisiert, verwende diesen
      // Es ist keine neue Verbindung erforderlich
      
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: to,
        subject: 'Zentrale SMTP-Konfiguration Test von Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5;">Zentrale SMTP-Konfiguration Test erfolgreich!</h2>
            </div>
            
            <p>Diese E-Mail bestätigt, dass Ihre zentrale SMTP-Konfiguration für System-E-Mails korrekt eingerichtet ist.</p>
            
            <p>Ihre Handyshop Verwaltung ist nun bereit, System-E-Mails über die zentrale SMTP-Konfiguration zu versenden.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht darauf.</p>
              <p>Gesendet: ${new Date().toLocaleString('de-DE')}</p>
            </div>
          </div>
        `,
        text: 'Zentrale SMTP-Konfiguration Test erfolgreich! Diese E-Mail bestätigt, dass Ihre zentrale SMTP-Konfiguration für System-E-Mails korrekt eingerichtet ist. Ihre Handyshop Verwaltung ist nun bereit, System-E-Mails über die zentrale SMTP-Konfiguration zu versenden.'
      };
      
      console.log('Sende zentrale System-Test-E-Mail...');
      const info = await this.smtpTransporter.sendMail(mailOptions);
      console.log('Zentrale System-Test-E-Mail erfolgreich gesendet:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der zentralen System-Test-E-Mail:', error);
      return false;
    }
  }
  
  /**
   * Sendet eine System-E-Mail über die globale SMTP-Konfiguration
   * @param options Die E-Mail-Optionen
   * @returns Promise<boolean> True wenn die E-Mail erfolgreich gesendet wurde, sonst false
   */
  async sendSystemEmail(options: {
    from?: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<any>;
  }): Promise<boolean> {
    try {
      if (!this.smtpTransporter) {
        console.error('❌ Kein SMTP-Transporter verfügbar für System-E-Mail');
        return false;
      }

      // Verwende die Superadmin-E-Mail-Konfiguration statt hardcodierter Umgebungsvariablen
      const senderEmail = this.superadminEmailConfig?.smtpSenderEmail || this.superadminEmailConfig?.smtpUser;
      const senderName = this.superadminEmailConfig?.smtpSenderName || 'Handyshop System';
      
      const mailOptions = {
        from: options.from || `"${senderName}" <${senderEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      };

      console.log('Sende System-E-Mail an:', options.to);
      const info = await this.smtpTransporter.sendMail(mailOptions);
      console.log('✅ System-E-Mail erfolgreich gesendet:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Senden der System-E-Mail:', error);
      return false;
    }
  }

  /**
   * Grundlegende Methode zum Senden einer E-Mail mit benutzer-spezifischen SMTP-Einstellungen
   * @param options Die E-Mail-Optionen
   * @param userId Benutzer-ID für die SMTP-Einstellungen
   * @returns Promise<boolean> True wenn die E-Mail erfolgreich gesendet wurde, sonst false
   */
  async sendEmail(options: {
    from?: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<any>;
  }, userId?: number): Promise<boolean> {
    try {
      console.log(`Sende E-Mail an ${options.to}${userId ? ` für Benutzer ${userId}` : ''}...`);
      
      // Wenn userId angegeben ist, verwende benutzer-spezifische SMTP-Einstellungen
      if (userId) {
        console.log(`Lade SMTP-Einstellungen für Benutzer ${userId}...`);
        
        const [businessSetting] = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.userId, userId))
          .orderBy(desc(businessSettings.id))
          .limit(1);
          
        if (!businessSetting || !businessSetting.smtpHost || !businessSetting.smtpUser || !businessSetting.smtpPassword) {
          console.error(`❌ Keine vollständigen SMTP-Einstellungen für Benutzer ${userId} gefunden`);
          throw new Error('Bitte konfigurieren Sie zuerst Ihre SMTP-Einstellungen in den Geschäftseinstellungen, um E-Mails versenden zu können.');
        }
        
        console.log(`✅ SMTP-Einstellungen gefunden: ${businessSetting.smtpHost} für ${businessSetting.smtpUser}`);
        
        // Erstelle benutzer-spezifischen Transporter
        const port = parseInt(businessSetting.smtpPort || '587');
        const userTransporter = nodemailer.createTransport({
          host: businessSetting.smtpHost,
          port: port,
          secure: port === 465,
          auth: {
            user: businessSetting.smtpUser,
            pass: businessSetting.smtpPassword
          },
          connectionTimeout: 10000,
          tls: {
            rejectUnauthorized: process.env.NODE_ENV !== 'development'
          }
        });
        
        const fromField = options.from || `"${businessSetting.smtpSenderName || businessSetting.businessName || 'Handyshop'}" <${businessSetting.smtpUser}>`;
        
        const mailOptions = {
          from: fromField,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
          attachments: options.attachments || []
        };
        
        const info = await userTransporter.sendMail(mailOptions);
        console.log('✅ E-Mail erfolgreich gesendet:', info.messageId);
        
        return true;
      } else {
        // Kein Fallback auf globale SMTP-Einstellungen mehr
        console.error('❌ Keine Benutzer-ID angegeben - E-Mail-Versand wird abgebrochen');
        throw new Error('Benutzer-ID erforderlich für E-Mail-Versand');
      }
    } catch (error) {
      console.error('❌ Fehler beim Senden der E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail mit Anhang
   * @param options Die E-Mail-Optionen mit Anhang
   * @param userId Benutzer-ID für shop-spezifische E-Mail-Einstellungen
   */
  async sendRawEmail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
  }, userId?: number): Promise<boolean> {
    try {
      console.log(`Sende E-Mail mit Anhang an ${options.to}${userId ? ` für Benutzer ${userId}` : ''}...`);
      
      // Wenn userId angegeben ist, verwende benutzer-spezifische SMTP-Einstellungen
      if (userId) {
        console.log(`Lade SMTP-Einstellungen für Benutzer ${userId}...`);
        
        const [businessSetting] = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.userId, userId))
          .orderBy(desc(businessSettings.id))
          .limit(1);
          
        if (!businessSetting || !businessSetting.smtpHost || !businessSetting.smtpUser || !businessSetting.smtpPassword) {
          console.error(`❌ Keine vollständigen SMTP-Einstellungen für Benutzer ${userId} gefunden`);
          throw new Error('Bitte konfigurieren Sie zuerst Ihre SMTP-Einstellungen in den Geschäftseinstellungen, um E-Mails versenden zu können.');
        }
        
        console.log(`✅ SMTP-Einstellungen gefunden: ${businessSetting.smtpHost} für ${businessSetting.smtpUser}`);
        
        // Erstelle benutzer-spezifischen Transporter
        const port = parseInt(businessSetting.smtpPort || '587');
        const userTransporter = nodemailer.createTransport({
          host: businessSetting.smtpHost,
          port: port,
          secure: port === 465,
          auth: {
            user: businessSetting.smtpUser,
            pass: businessSetting.smtpPassword
          },
          connectionTimeout: 10000,
          tls: {
            rejectUnauthorized: process.env.NODE_ENV !== 'development'
          }
        });
        
        // Verwende immer die konfigurierte SMTP-E-Mail-Adresse für den Absender
        const fromField = `"${businessSetting.smtpSenderName || businessSetting.businessName || 'Handyshop'}" <${businessSetting.smtpUser}>`;
        
        console.log(`Sende E-Mail von: ${fromField} an: ${options.to}`);
        
        const mailOptions: any = {
          from: fromField,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        };

        // Add attachments separately to ensure proper handling
        if (options.attachments && options.attachments.length > 0) {
          mailOptions.attachments = options.attachments.map(att => {
            // Ensure we have a proper Buffer for attachments
            let content = att.content;
            if (Buffer.isBuffer(content)) {
              // Already a buffer, use as is
            } else {
              // Fallback: convert to buffer
              content = Buffer.from(content);
            }
            
            console.log(`Preparing attachment: ${att.filename}, contentType: ${att.contentType}, size: ${content.length} bytes`);
            
            return {
              filename: att.filename,
              content: content,
              contentType: att.contentType || 'application/octet-stream',
              disposition: 'attachment'
            };
          });
        }
        
        console.log('Sende E-Mail mit folgenden Optionen:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          attachments: mailOptions.attachments ? mailOptions.attachments.map(a => a.filename) : []
        });
        
        const info = await userTransporter.sendMail(mailOptions);
        console.log('E-Mail erfolgreich gesendet:', info.messageId);
        
        return true;
      } else {
        // Kein Fallback auf globale SMTP-Einstellungen mehr
        console.error('❌ Keine Benutzer-ID angegeben - E-Mail-Versand wird abgebrochen');
        throw new Error('Benutzer-ID erforderlich für E-Mail-Versand');
      }
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail mit Anhang:', error);
      return false;
    }
  }

  /**
   * Sendet eine Test-E-Mail mit den shop-spezifischen SMTP-Einstellungen
   * Diese Methode testet die Konfiguration für shop-spezifische E-Mails
   */
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      if (!this.smtpTransporter) {
        throw new Error('Kein shop-spezifischer SMTP-Transporter konfiguriert');
      }
      
      // Verwende die Superadmin-E-Mail-Konfiguration für Test-E-Mails
      const senderName = this.superadminEmailConfig?.smtpSenderName || 'Handyshop Verwaltung';
      const senderEmail = this.superadminEmailConfig?.smtpSenderEmail || this.superadminEmailConfig?.smtpUser;
      
      console.log(`Sende shop-spezifische Test-E-Mail von: "${senderName}" <${senderEmail}> an: ${to}`);
      
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: to,
        subject: 'Shop-spezifische Test-E-Mail von Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5;">Shop-spezifische Test-E-Mail erfolgreich!</h2>
            </div>
            
            <p>Diese E-Mail bestätigt, dass Ihre shop-spezifischen SMTP-Einstellungen korrekt konfiguriert sind.</p>
            
            <p>Ihr Shop in der Handyshop Verwaltung ist nun bereit, E-Mails an Kunden zu versenden.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht darauf.</p>
            </div>
          </div>
        `,
        text: 'Shop-spezifische Test-E-Mail erfolgreich! Diese E-Mail bestätigt, dass Ihre shop-spezifischen SMTP-Einstellungen korrekt konfiguriert sind. Ihr Shop in der Handyshop Verwaltung ist nun bereit, E-Mails an Kunden zu versenden.'
      };
      
      const info = await this.smtpTransporter.sendMail(mailOptions);
      console.log('Shop-spezifische Kunden-Test-E-Mail erfolgreich gesendet:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der shop-spezifischen Kunden-Test-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail mit einer Vorlage, die aus der Datenbank geladen wird
   * @param templateId ID der E-Mail-Vorlage
   * @param recipientEmail E-Mail-Adresse des Empfängers
   * @param variables Variablen für die Ersetzung in der Vorlage
   * @param isSystemEmail Wenn true, wird die E-Mail über den Superadmin-SMTP-Transporter gesendet
   */
  async sendEmailWithTemplateById(
    templateId: number,
    recipientEmail: string,
    variables: Record<string, string>,
    isSystemEmail = false,
    userId?: number
  ): Promise<boolean> {
    try {
      console.log(`Sende E-Mail mit Vorlage ID ${templateId} an ${recipientEmail}...`);
      
      // Benutzer-ID als Parameter priorisieren, ansonsten aus Variablen extrahieren
      const actualUserId = userId || (variables.userId ? parseInt(variables.userId) : undefined);
      
      console.log(`🔍 KRITISCH: actualUserId = ${actualUserId}, userId Parameter = ${userId}, variables.userId = ${variables.userId}`);
      
      // E-Mail-Vorlage aus der Datenbank abrufen
      let template;
      try {
        // Zwei separate Abfragen, um Typprobleme zu vermeiden
        if (actualUserId) {
          [template] = await db
            .select()
            .from(emailTemplates)
            .where(eq(emailTemplates.id, templateId))
            .where(eq(emailTemplates.userId, actualUserId));
        } else {
          [template] = await db
            .select()
            .from(emailTemplates)
            .where(eq(emailTemplates.id, templateId));
        }
          
        if (!template) {
          // Wenn nicht gefunden, suche nach einer globalen Vorlage (userId = null)
          [template] = await db
            .select()
            .from(emailTemplates)
            .where(eq(emailTemplates.id, templateId));
        }
      } catch (dbError) {
        console.error('Fehler beim Abrufen der E-Mail-Vorlage:', dbError);
      }
      
      if (!template) {
        console.error(`E-Mail-Vorlage mit ID ${templateId} nicht gefunden`);
        return false;
      }
      
      console.log(`E-Mail-Vorlage gefunden: "${template.name}" mit Betreff: "${template.subject}"`);
      
      // Die sendEmailWithTemplate-Methode mit dem Options-Objekt aufrufen
      // Wichtig: forceUserId ermöglicht das Senden mit den SMTP-Einstellungen des Benutzers
      return await this.sendEmailWithTemplateInternal({
        templateName: template.name,
        recipientEmail,
        data: variables,
        subject: template.subject,
        body: template.body,
        isSystemEmail,
        forceUserId: actualUserId // Verwende die Benutzer-ID für die SMTP-Einstellungen
      });
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail mit Vorlagen-ID:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail mit einer Vorlage über den Namen
   */
  async sendEmailByTemplateName(
    templateName: string,
    recipientEmail: string,
    variables: Record<string, string>,
    userId?: number
  ): Promise<boolean> {
    try {
      console.log(`🔍 EMAIL-SERVICE: Searching for template "${templateName}" for user ${userId}...`);
      
      // KRITISCHER FIX: Spezielle Behandlung für Passwort-Reset-Templates  
      if (templateName === "Passwort zurücksetzen") {
        console.log(`✅ Using password reset template (ID=23)`);
        
        const resetTemplate = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, 23))
          .limit(1);
          
        if (resetTemplate.length > 0) {
          const template = resetTemplate[0];
          console.log(`✅ Password reset email template loaded: "${template.subject}"`);
          
          return await this.sendEmailWithTemplateInternal({
            templateName: template.name,
            recipientEmail,
            data: variables,
            subject: template.subject,
            body: template.body,
            isSystemEmail: false,
            forceUserId: userId
          });
        }
      }
      
      if (templateName === "Passwort erfolgreich geändert") {
        console.log(`✅ Using password confirmation template (ID=79)`);
        
        const confirmTemplate = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, 79))
          .limit(1);
          
        if (confirmTemplate.length > 0) {
          const template = confirmTemplate[0];
          console.log(`✅ Password confirmation email template loaded: "${template.subject}"`);
          
          return await this.sendEmailWithTemplateInternal({
            templateName: template.name,
            recipientEmail,
            data: variables,
            subject: template.subject,
            body: template.body,
            isSystemEmail: false,
            forceUserId: userId
          });
        }
      }
      
      // Fallback: Original template search
      console.log(`🔍 DEBUG: Suche E-Mail-Vorlage "${templateName}" für Benutzer ${userId}...`);
      
      // E-Mail-Vorlage nach Namen suchen - erst globale, dann benutzer-spezifische
      let template;
      try {
        // Erst nach globaler Vorlage suchen (user_id IS NULL)
        const globalTemplates = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.name, templateName))
          .where(sql`${emailTemplates.userId} IS NULL`);
        
        console.log(`🔍 DEBUG: Gefundene globale Vorlagen für "${templateName}":`, globalTemplates.length);
        globalTemplates.forEach((t, i) => {
          console.log(`🔍 DEBUG: Template ${i}: ID=${t.id}, Name="${t.name}", Subject="${t.subject}"`);
        });
        
        if (globalTemplates.length > 0) {
          template = globalTemplates[0];
          console.log(`✅ DEBUG: Verwende globale Vorlage: ID=${template.id}, Name="${template.name}", Subject="${template.subject}"`);
        }
          
        if (!template && userId) {
          // Falls keine globale gefunden, nach benutzer-spezifischer suchen
          const userTemplates = await db
            .select()
            .from(emailTemplates)
            .where(eq(emailTemplates.name, templateName))
            .where(eq(emailTemplates.userId, userId));
          
          console.log(`🔍 DEBUG: Gefundene benutzer-spezifische Vorlagen für "${templateName}":`, userTemplates.length);
          
          if (userTemplates.length > 0) {
            template = userTemplates[0];
            console.log(`✅ DEBUG: Verwende benutzer-spezifische Vorlage: ID=${template.id}, Name="${template.name}", Subject="${template.subject}"`);
          }
        }
      } catch (dbError) {
        console.error('❌ DEBUG: Fehler beim Abrufen der E-Mail-Vorlage:', dbError);
      }
      
      if (!template) {
        console.error(`❌ DEBUG: E-Mail-Vorlage "${templateName}" nicht gefunden`);
        return false;
      }
      
      console.log(`✅ DEBUG: E-Mail-Vorlage gefunden: "${template.name}" mit Betreff: "${template.subject}"`);
      console.log(`✅ DEBUG: Template-Body ersten 100 Zeichen:`, template.body.substring(0, 100));
      
      // Die interne Methode aufrufen
      return await this.sendEmailWithTemplateInternal({
        templateName: template.name,
        recipientEmail,
        data: variables,
        subject: template.subject,
        body: template.body,
        isSystemEmail: false,
        forceUserId: userId
      });
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail mit Vorlagen-Name:', error);
      return false;
    }
  }
  
  /**
   * Überladene Methode für Abwärtskompatibilität mit älteren API-Aufrufen
   */
  async sendEmailWithTemplate(
    templateIdOrOptions: number | {
      templateName: string,
      recipientEmail: string,
      data: Record<string, string>,
      subject: string,
      body: string
      isSystemEmail?: boolean
    },
    recipientEmail?: string,
    variables?: Record<string, string>
  ): Promise<boolean> {
    // Prüfen, ob es die neue oder alte Form des Aufrufs ist
    if (typeof templateIdOrOptions === 'number') {
      // Alter Aufruf: templateId, recipientEmail, variables
      return this.sendEmailWithTemplateById(templateIdOrOptions, recipientEmail!, variables || {});
    }
    
    // Neuer Aufruf mit Options-Objekt
    return this.sendEmailWithTemplateInternal(templateIdOrOptions);
  }
  
  /**
   * Interne Implementierung von sendEmailWithTemplate mit Options-Objekt
   */
  private async sendEmailWithTemplateInternal({
    templateName,
    recipientEmail,
    data,
    subject,
    body,
    isSystemEmail = false,
    forceUserId = undefined
  }: {
    templateName: string,
    recipientEmail: string,
    data: Record<string, string>,
    subject: string,
    body: string,
    isSystemEmail?: boolean,
    forceUserId?: number
  }): Promise<boolean> {
    try {
      console.log(`🔍 EMAIL-SERVICE: sendEmailWithTemplateInternal aufgerufen für ${templateName}, forceUserId: ${forceUserId}`);
      console.log(`🔍 EMAIL-SERVICE: data keys:`, Object.keys(data || {}));
      console.log(`🔍 EMAIL-SERVICE: aktuelle telefon/email Werte:`, { telefon: data?.telefon, email: data?.email });
      
      // Ersetze Platzhalter in Betreff und Text mit den übergebenen Daten
      let processedSubject = subject;
      let processedBody = body;
      
      // KRITISCH: Business-Settings für korrekte Variablen laden
      // UNIVERSELL: Prüfe alle E-Mail-Versendungen nach Zubehör eingetroffen
      if (data && typeof data === 'object' && (data.artikel || templateName.includes('Zubehör') || subject.includes('Zubehör'))) {
        try {
          // Ermittle userId aus verschiedenen Quellen
          const targetUserId = forceUserId || (data.userId ? parseInt(data.userId) : null);
          console.log(`🔍 FIXING: Ermittelte userId für Business-Settings: ${targetUserId}`);
          
          if (!targetUserId) {
            console.log(`⚠️ FIXING: Keine userId gefunden, kann Business-Settings nicht laden`);
            // WICHTIG: Hier nicht returnen, sondern weiter mit der E-Mail-Verarbeitung
          }
          
          // Hole die NEUESTEN Geschäftseinstellungen für korrekte E-Mail-Variablen
          const [businessSetting] = await db
            .select()
            .from(businessSettings)
            .where(eq(businessSettings.userId, targetUserId))
            .orderBy(desc(businessSettings.id))
            .limit(1);
          
          if (businessSetting) {
            console.log(`🔍 FIXING: Lade Business-Daten für E-Mail-Variablen (User ${forceUserId})`);
            
            // KRITISCH: Überschreibe telefon und email mit korrekten Business-Settings-Werten
            if (businessSetting.phone) {
              data.telefon = businessSetting.phone;
              console.log(`✅ telefon Variable korrigiert: ${data.telefon}`);
            }
            if (businessSetting.email) {
              data.email = businessSetting.email;
              console.log(`✅ email Variable korrigiert: ${data.email}`);
            }
            if (businessSetting.businessName) {
              data.geschaeftsname = businessSetting.businessName;
              console.log(`✅ geschaeftsname Variable korrigiert: ${data.geschaeftsname}`);
            }
            if (businessSetting.openingHours) {
              data.oeffnungszeiten = businessSetting.openingHours;
              console.log(`✅ oeffnungszeiten Variable korrigiert: ${data.oeffnungszeiten}`);
            }
          }
        } catch (error) {
          console.error(`❌ Fehler beim Laden der Business-Settings für E-Mail-Variablen:`, error);
        }
      }

      // WICHTIG: Öffnungszeiten direkt hinzufügen, falls nicht vorhanden
      if (data && typeof data === 'object') {
        if (!data.openingHours && !data.oeffnungszeiten) {
          data.openingHours = 'Mo - Fr: 10:00 - 18:00 Uhr; Sa geschlossen';
          data.oeffnungszeiten = 'Mo - Fr: 10:00 - 18:00 Uhr; Sa geschlossen';
          console.log(`✅ openingHours Variable hinzugefügt: ${data.openingHours}`);
        }
      }
      
      // Alle Variablen ersetzen, aber nur wenn data nicht null oder undefined ist
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            processedSubject = processedSubject.replace(placeholder, value.toString());
            processedBody = processedBody.replace(placeholder, value.toString());
          }
        });
      } else {
        console.log('Keine Ersetzungsdaten für E-Mail-Vorlage gefunden oder ungültiges Format');
      }
      
      // Wähle den richtigen SMTP-Transporter basierend auf isSystemEmail oder forceUserId
      let transporter: nodemailer.Transporter;
      let senderName: string;
      let senderEmail: string;
      
      // WICHTIG: Bei Statusänderungen wird immer forceUserId gesetzt,
      // daher sollten wir hier den Benutzer-spezifischen Transporter priorisieren
      if (forceUserId) {
        // Versuche, die benutzer-spezifischen SMTP-Einstellungen zu verwenden
        try {
          // Hole die NEUESTEN Geschäftseinstellungen des Benutzers mit ORDER BY id DESC
          console.log(`Suche die neuesten SMTP-Einstellungen für Benutzer ID ${forceUserId}`);
          
          // Holen wir uns zunächst ALLE Einstellungen zur Diagnose
          const allSettings = await db
            .select()
            .from(businessSettings)
            .where(eq(businessSettings.userId, forceUserId));
            
          console.log(`Gefundene SMTP-Einstellungen für Benutzer ${forceUserId}:`, 
            allSettings.map(s => ({
              id: s.id,
              user: s.smtpUser,
              host: s.smtpHost,
              // Wir zeigen nur die ersten Zeichen des Passworts aus Sicherheitsgründen
              pass: s.smtpPassword ? s.smtpPassword.substring(0, 3) + '***' : null
            }))
          );
          
          // Jetzt holen wir das neueste Setting mit ORDER BY und LIMIT
          const [businessSetting] = await db
            .select()
            .from(businessSettings)
            .where(eq(businessSettings.userId, forceUserId))
            .orderBy(desc(businessSettings.id))
            .limit(1);
            
          if (businessSetting) {
            console.log(`Ausgewählte Einstellung mit ID ${businessSetting.id} und SMTP-Benutzer ${businessSetting.smtpUser}`);
          }
          
          // Wichtig: Die SMTP-Einstellungen müssen komplett sein, sonst keine E-Mail senden
          if (businessSetting && businessSetting.smtpHost && businessSetting.smtpUser && businessSetting.smtpPassword) {
            console.log(`Verwende benutzerspezifische SMTP-Einstellungen für Benutzer ${forceUserId}`);
            
            // Erstelle einen temporären Transporter für diesen Benutzer
            const port = parseInt(businessSetting.smtpPort || '587');
            
            // Konfiguration für alle Benutzer basierend auf Datenbankeinstellungen
            const userConfig = {
              host: businessSetting.smtpHost,
              port: port,
              secure: port === 465,
              auth: {
                user: businessSetting.smtpUser,
                pass: businessSetting.smtpPassword
              },
              connectionTimeout: 10000,
              tls: {
                rejectUnauthorized: process.env.NODE_ENV !== 'development'
              },
              debug: true,
              logger: true
            };
            
            console.log(`Benutze individuelle SMTP-Einstellungen für Benutzer ${forceUserId}`);
            console.log(`SMTP-Benutzer: ${businessSetting.smtpUser}, Host: ${businessSetting.smtpHost}, Port: ${port}`);
            
            // Zeige immer die tatsächlich verwendeten Einstellungen
            console.log("Erstelle Transporter mit folgenden Einstellungen:", {
              host: userConfig.host,
              port: userConfig.port,
              secure: userConfig.secure,
              user: userConfig.auth.user
            });
            
            transporter = nodemailer.createTransport(userConfig);
            senderName = businessSetting.businessName || businessSetting.smtpSenderName || 'Handyshop';
            senderEmail = businessSetting.smtpUser;
            
            console.log(`Sende Benutzer-E-Mail mit Vorlage "${templateName}" über Benutzer-SMTP (${senderEmail})`);
          } else {
            // Fallback auf System-SMTP, wenn keine benutzer-spezifischen Einstellungen vorhanden sind
            console.warn(`Benutzer ${forceUserId} hat keine vollständigen SMTP-Einstellungen. Verwende System-Einstellungen.`);
            
            if (this.smtpTransporter && this.superadminEmailConfig) {
              transporter = this.smtpTransporter;
              senderName = this.superadminEmailConfig.smtpSenderName || 'Handyshop Verwaltung';
              senderEmail = this.superadminEmailConfig.smtpSenderEmail || this.superadminEmailConfig.smtpUser;
            } else if (this.superadminEmailConfig) {
              // Wenn kein Shop-Transporter vorhanden ist, versuche den Superadmin-Transporter
              transporter = this.smtpTransporter!;
              senderName = this.superadminEmailConfig.smtpSenderName || 'Handyshop System';
              senderEmail = this.superadminEmailConfig.smtpSenderEmail || this.superadminEmailConfig.smtpUser;
            } else {
              // Keine SMTP-Konfiguration vorhanden
              throw new Error(`Keine SMTP-Einstellungen verfügbar für Benutzer ${forceUserId}`);
            }
          }
        } catch (error) {
          console.error(`Fehler beim Laden oder Prüfen der SMTP-Einstellungen für Benutzer ${forceUserId}:`, error);
          // Wir versuchen trotzdem den System-SMTP zu verwenden
          if (this.smtpTransporter && this.superadminEmailConfig) {
            console.warn(`Fallback auf System-SMTP für Benutzer ${forceUserId}`);
            transporter = this.smtpTransporter;
            senderName = this.superadminEmailConfig.smtpSenderName || 'Handyshop Verwaltung';
            senderEmail = this.superadminEmailConfig.smtpSenderEmail || this.superadminEmailConfig.smtpUser;
          } else {
            throw new Error(`Keine SMTP-Einstellungen verfügbar für Benutzer ${forceUserId}`);
          }
        }
      } else if (isSystemEmail && this.superadminEmailConfig) {
        // Zentrale SMTP-Einstellungen verwenden (für System-E-Mails)
        if (!this.smtpTransporter) {
          throw new Error("Superadmin-SMTP-Transporter nicht konfiguriert");
        }
        
        transporter = this.smtpTransporter;
        senderName = this.superadminEmailConfig.smtpSenderName || 'Handyshop System';
        senderEmail = this.superadminEmailConfig.smtpSenderEmail || this.superadminEmailConfig.smtpUser;
        
        console.log(`Sende System-E-Mail mit Vorlage "${templateName}" über zentrale SMTP-Konfiguration`);
      } else {
        // Shop-spezifische SMTP-Einstellungen verwenden
        if (!this.smtpTransporter) {
          throw new Error("Shop-spezifischer SMTP-Transporter nicht konfiguriert");
        }
        
        if (!this.superadminEmailConfig) {
          throw new Error("Superadmin-E-Mail-Konfiguration für Shop-Transporter nicht konfiguriert");
        }
        
        transporter = this.smtpTransporter;
        senderName = this.superadminEmailConfig.smtpSenderName || 'Handyshop Verwaltung';
        senderEmail = this.superadminEmailConfig.smtpSenderEmail || this.superadminEmailConfig.smtpUser;
        
        console.log(`Sende Kunden-E-Mail mit Vorlage "${templateName}" über shop-spezifische SMTP-Konfiguration`);
      }
      
      console.log(`🔍 CRITICAL DEBUG: recipientEmail = "${recipientEmail}" (Typ: ${typeof recipientEmail})`);
      console.log(`Sende ${isSystemEmail ? 'System' : 'Kunden'}-E-Mail von: "${senderName}" <${senderEmail}> an: ${recipientEmail}`);
      
      // Erstelle E-Mail-Optionen mit den ausgewählten SMTP-Einstellungen
      
      // Verwende ausschließlich die in der Superadmin-Konfiguration festgelegte E-Mail-Adresse
      
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: processedSubject,
        html: processedBody,
        text: processedBody.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
      };
      
      // Sende die E-Mail über den ausgewählten SMTP-Transporter
      const info = await transporter.sendMail(mailOptions);
      console.log(`${isSystemEmail ? 'System' : 'Kunden'}-E-Mail mit Vorlage erfolgreich gesendet`, info.messageId);
      
      return true;
    } catch (error) {
      console.error(`Fehler beim Senden der ${isSystemEmail ? 'System' : 'Kunden'}-E-Mail mit Vorlage:`, error);
      return false;
    }
  }

  /**
   * Holt alle E-Mail-Vorlagen für einen bestimmten Benutzer (mit DSGVO-konformen Shop-Filter)
   */
  async getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
    try {
      // Basis-Query für E-Mail-Vorlagen
      let query = db.select().from(emailTemplates);
      
      // Wenn userId vorhanden ist, filtere nach denen des Benutzers und den globalen Vorlagen
      if (userId) {
        query = query.where(
          or(
            eq(emailTemplates.userId, userId),
            isNull(emailTemplates.userId)
          )
        );
      }
      
      // Sortiere nach ID absteigend (neueste zuerst)
      query = query.orderBy(desc(emailTemplates.id));
      
      const templates = await query;
      return templates;
    } catch (error) {
      console.error("Fehler beim Abrufen aller E-Mail-Vorlagen:", error);
      return [];
    }
  }

  /**
   * Holt eine bestimmte E-Mail-Vorlage anhand ihrer ID (mit DSGVO-konformen Shop-Filter)
   */
  async getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined> {
    try {
      // Basis-Query mit ID-Filter
      let query = db.select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      // Wenn userId vorhanden ist, erweitere Filter um Benutzer-Prüfung oder globale Vorlagen
      if (userId !== undefined) {
        query = query.where(
          or(
            eq(emailTemplates.userId, userId),
            isNull(emailTemplates.userId)
          )
        );
      }
      
      // Führe Query aus und hole erstes Ergebnis
      const [template] = await query;
      
      return template;
    } catch (error) {
      console.error(`Fehler beim Abrufen der E-Mail-Vorlage mit ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Erstellt eine neue E-Mail-Vorlage für einen Benutzer (mit DSGVO-konformen Shop-Filter)
   */
  async createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate> {
    try {
      // Sicherstellen, dass die Vorlage die richtige Benutzer-ID hat, wenn angegeben
      const templateWithUserId = {
        ...template,
        userId: userId
      };
      
      // Erstelle die E-Mail-Vorlage
      const [createdTemplate] = await db.insert(emailTemplates)
        .values(templateWithUserId)
        .returning();
      
      return createdTemplate;
    } catch (error) {
      console.error("Fehler beim Erstellen der E-Mail-Vorlage:", error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine bestehende E-Mail-Vorlage für einen Benutzer (mit DSGVO-konformen Shop-Filter)
   */
  async updateEmailTemplate(id: number, template: Partial<EmailTemplate>, userId?: number): Promise<EmailTemplate | undefined> {
    try {
      // Basis-Query mit ID-Filter
      let whereCondition = eq(emailTemplates.id, id);
      
      // Wenn userId vorhanden ist, erweitere Filter um Benutzer-Prüfung
      if (userId !== undefined) {
        // Benutzer darf nur seine eigenen Vorlagen oder globale Vorlagen bearbeiten, für die er Rechte hat
        whereCondition = and(
          whereCondition,
          or(
            eq(emailTemplates.userId, userId),
            isNull(emailTemplates.userId)
          )
        );
      }
      
      // Aktualisiere die Vorlage mit dem entsprechenden Filter
      const [updatedTemplate] = await db.update(emailTemplates)
        .set(template)
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
        
        // Wenn die Vorlage in der Historie verwendet wird, markiere sie als archiviert statt zu löschen
        const template = templateToDelete[0];
        
        // Archiviere die Vorlage durch Umbenennung und Deaktivierung
        await db.update(emailTemplates)
          .set({
            name: `[Archiviert] ${template.name}`,
            isArchived: true
          })
          .where(eq(emailTemplates.id, id));
        
        console.log(`E-Mail-Vorlage mit ID ${id} wurde archiviert.`);
        return true;
      }
      
      // Wenn die Vorlage nicht in der Historie verwendet wird, kann sie gelöscht werden
      // Erstelle Basis-Query mit ID-Filter
      let deleteQuery = db.delete(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      // Wenn userId vorhanden ist, erweitere Filter um Benutzer-Prüfung
      if (userId !== undefined) {
        deleteQuery = deleteQuery.where(
          or(
            eq(emailTemplates.userId, userId),
            and(
              isNull(emailTemplates.userId),
              eq(userId, 0) // Nur Superadmin (userId=0) darf globale Vorlagen löschen
            )
          )
        );
      }
      
      // Führe Lösch-Query aus
      await deleteQuery.execute();
      
      console.log(`E-Mail-Vorlage mit ID ${id} wurde gelöscht.`);
      return true;
    } catch (error) {
      console.error(`Fehler beim Löschen der E-Mail-Vorlage mit ID ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Verwaltet die redundanten E-Mail-Vorlagen (entfernt "Reparatur abgeschlossen" wenn "Reparatur abholbereit" existiert)
   * Diese Methode verhindert doppelte Vorlagen für den gleichen Zweck
   */
  async cleanupRedundantTemplates(userId?: number | null): Promise<void> {
    try {
      console.log('Start Bereinigung redundanter E-Mail-Vorlagen...');
      
      // Wenn keine Benutzer-ID angegeben ist, bereinige für alle Benutzer
      if (userId === undefined || userId === null) {
        // Hole alle Benutzer
        const allUsers = await db.select().from(users);
        console.log(`Gefunden: ${allUsers.length} Benutzer insgesamt.`);
        
        // Bereinige für jeden Benutzer einzeln
        for (const user of allUsers) {
          console.log(`Bearbeite Benutzer: ${user.username} (ID: ${user.id})`);
          await this.cleanupCompletedTemplateForUser(user.id);
        }
      } else {
        // Bereinige nur für einen bestimmten Benutzer
        console.log(`Bereinige E-Mail-Vorlagen für Benutzer mit ID ${userId}`);
        await this.cleanupCompletedTemplateForUser(userId);
      }
      
      console.log('Bereinigung redundanter E-Mail-Vorlagen abgeschlossen.');
    } catch (error) {
      console.error('Fehler bei der Bereinigung redundanter E-Mail-Vorlagen:', error);
    }
  }
  
  /**
   * Archiviert die "Reparatur abgeschlossen" Vorlage für einen bestimmten Benutzer
   */
  private async archiveCompletedTemplateForUser(userId: number): Promise<void> {
    try {
      // Suche nach der "Reparatur abgeschlossen" Vorlage
      const [completedTemplate] = await db.select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.userId, userId),
            or(
              sql`LOWER(${emailTemplates.name}) LIKE '%abgeschlossen%'`,
              sql`LOWER(${emailTemplates.name}) LIKE '%completed%'`
            )
          )
        );
      
      if (!completedTemplate) {
        console.log(`Keine "Reparatur abgeschlossen" Vorlage für Benutzer ${userId} gefunden.`);
        return;
      }
      
      // Vorlage archivieren
      await db.update(emailTemplates)
        .set({
          name: `[Archiviert] ${completedTemplate.name}`,
          isArchived: true
        })
        .where(eq(emailTemplates.id, completedTemplate.id));
        
      console.log(`Vorlage "${completedTemplate.name}" (ID: ${completedTemplate.id}) wurde archiviert.`);
    } catch (error) {
      console.error(`Fehler beim Archivieren der "Reparatur abgeschlossen" Vorlage für Benutzer ${userId}:`, error);
    }
  }
  
  /**
   * Spezielle Methode zur Bereinigung der "Reparatur abgeschlossen" Vorlage für einen Benutzer
   * Diese Methode behandelt spezifisch die Redundanz zwischen "Reparatur abgeschlossen" und "Reparatur abholbereit"
   */
  private async cleanupCompletedTemplateForUser(userId: number | null): Promise<void> {
    try {
      // Suche erst nach der "Reparatur abholbereit" Vorlage
      const [readyTemplate] = await db.select()
        .from(emailTemplates)
        .where(
          and(
            userId !== null ? eq(emailTemplates.userId, userId) : eq(1, 1),
            or(
              sql`LOWER(${emailTemplates.name}) LIKE '%abholbereit%'`,
              sql`LOWER(${emailTemplates.name}) LIKE '%abholen%'`,
              sql`LOWER(${emailTemplates.name}) LIKE '%ready%'`,
              sql`LOWER(${emailTemplates.name}) LIKE '%pickup%'`
            )
          )
        );
      
      if (!readyTemplate) {
        console.log(`Keine "Reparatur abholbereit" Vorlage für Benutzer ${userId} gefunden. Überspringen.`);
        return;
      }
      
      // Wenn "abholbereit" existiert, archiviere "abgeschlossen"
      if (userId !== null) {
        await this.archiveCompletedTemplateForUser(userId);
      }
    } catch (error) {
      console.error(`Fehler bei der Bereinigung der "Reparatur abgeschlossen" Vorlage für Benutzer ${userId}:`, error);
    }
  }

  /**
   * Holt alle globalen E-Mail-Templates aus dem Superadmin-Bereich
   * Diese Methode ersetzt die benutzerspezifischen Templates
   */
  async getGlobalEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const templates = await db.select()
        .from(emailTemplates)
        .where(and(
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0),
          eq(emailTemplates.type, 'customer')
        ))
        .orderBy(emailTemplates.name);
      
      console.log(`🌍 Gefundene globale Templates: ${templates.length}`);
      return templates;
    } catch (error) {
      console.error('Fehler beim Abrufen der globalen E-Mail-Templates:', error);
      return [];
    }
  }
  /**
   * Sendet eine E-Mail-Benachrichtigung für Reparatur-Statusänderungen
   * @param userId Benutzer-ID
   * @param repairId Reparatur-ID
   * @param templateType Template-Typ (z.B. 'fertig', 'ersatzteil_eingetroffen')
   * @param variables Template-Variablen
   */
  async sendRepairStatusEmail(userId: number, repairId: number, templateType: string, variables: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔍 DEBUG - sendRepairStatusEmail startet:`);
      console.log(`   - userId: ${userId}`);
      console.log(`   - repairId: ${repairId}`);
      console.log(`   - templateType: ${templateType}`);
      console.log(`   - variables:`, {
        hasCustomer: !!variables?.customer,
        hasRepair: !!variables?.repair,
        hasBusinessSettings: !!variables?.businessSettings,
        openingHours: variables?.businessSettings?.openingHours,
        customerEmail: variables?.customer?.email
      });
      
      // Hole die globalen E-Mail-Vorlagen aus dem Superadmin-Bereich
      console.log(`🔍 Hole globale E-Mail-Vorlagen aus Superadmin-Bereich...`);
      const templates = await this.getGlobalEmailTemplates();
      console.log(`🔍 Gefundene globale Vorlagen: ${templates.length}`);
      templates.forEach(t => console.log(`   - ${t.name} (Type: ${t.type})`));
      
      // Template-Mapping für verschiedene Status-Arten
      let template = templates.find(t => t.type === templateType);
      
      // Fallback-Suche nach Name, wenn kein Type-Match gefunden wurde
      if (!template) {
        if (templateType === 'fertig' || templateType === 'Reparatur erfolgreich abgeschlossen') {
          // Priorität für "Reparatur erfolgreich abgeschlossen" bei Status "fertig"
          template = templates.find(t => 
            t.name.toLowerCase().includes('erfolgreich abgeschlossen') ||
            t.name.toLowerCase().includes('erfolgreich') ||
            t.name.toLowerCase().includes('abholbereit') || 
            t.name.toLowerCase().includes('fertig') ||
            t.type === 'ready_for_pickup'
          );
        } else if (templateType === 'Reparatur nicht möglich') {
          template = templates.find(t => 
            t.name.toLowerCase().includes('nicht erfolgreich') ||
            t.name.toLowerCase().includes('nicht möglich') ||
            t.name.toLowerCase().includes('nicht reparierbar') ||
            t.name === 'Reparatur nicht möglich' ||
            t.name === 'Reparatur nicht erfolgreich'
          );
        } else if (templateType === 'Kunde hat Reparatur abgelehnt') {
          template = templates.find(t => 
            t.name.toLowerCase().includes('nicht akzeptiert') ||
            t.name.toLowerCase().includes('abgelehnt') ||
            t.name.toLowerCase().includes('kunde hat') ||
            t.name === 'Kunde hat Reparatur abgelehnt' ||
            t.name === 'Reparatur nicht akzeptiert'
          );
        } else if (templateType === 'ersatzteil_eingetroffen') {
          template = templates.find(t => 
            t.name.toLowerCase().includes('ersatzteil eingetroffen') ||
            t.name.toLowerCase().includes('gerät zur reparatur') ||
            t.name.toLowerCase().includes('reparatur bringen') ||
            t.name.toLowerCase().includes('ersatzteil') ||
            t.name === 'Ersatzteil eingetroffen' ||
            t.type === 'parts_arrived'
          );
        } else {
          // Generische Suche nach Namen - erst exakte Übereinstimmung, dann teilweise Übereinstimmung
          template = templates.find(t => t.name === templateType) ||
                    templates.find(t => t.name.toLowerCase() === templateType.toLowerCase()) ||
                    templates.find(t => t.name.toLowerCase().includes(templateType.toLowerCase()));
        }
      }
      
      if (!template) {
        console.error(`❌ Keine E-Mail-Vorlage für Template-Typ '${templateType}' gefunden`);
        console.log(`🔍 Verfügbare Template-Typen:`, templates.map(t => t.type || 'undefined'));
        console.log(`🔍 Verfügbare Template-Namen:`, templates.map(t => t.name));
        return { success: false, error: `Keine E-Mail-Vorlage für '${templateType}' gefunden` };
      }
      
      console.log(`✅ E-Mail-Vorlage gefunden: ${template.name} (ID: ${template.id}, Type: ${template.type})`);
      
      // Extrahiere Kundendaten und Reparaturdaten
      const customer = variables.customer;
      const repair = variables.repair;
      
      console.log(`🔍 Prüfe Kundendaten:`, {
        hasCustomer: !!customer,
        firstName: customer?.firstName,
        lastName: customer?.lastName,
        email: customer?.email
      });
      
      if (!customer || !customer.email) {
        console.error(`❌ Keine Kunden-E-Mail-Adresse verfügbar`);
        return { success: false, error: 'Keine Kunden-E-Mail-Adresse verfügbar' };
      }
      
      // Template-Variablen für die E-Mail-Vorlage
      const templateVars = {
        // Deutsche Variablennamen (neu)
        kundenname: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        hersteller: repair.brand || '',
        geraet: repair.model || '',
        geschaeftsname: variables.businessSettings?.businessName || 'Handyshop',
        telefon: variables.businessSettings?.phone || '',
        email: variables.businessSettings?.smtpUser || variables.businessSettings?.email || '',
        adresse: variables.businessSettings?.streetAddress || '',
        oeffnungszeiten: variables.businessSettings?.openingHours?.replace(/,\s*/g, ',<br>') || '',
        auftragsnummer: repair.orderCode || repair.id?.toString() || '',
        fehler: repair.issue || '',
        abholzeit: 'ab sofort',
        // NEUE VARIABLEN für Auftragsbestätigung
        kosten: repair.estimatedCost || '0',
        reparaturbedingungen: variables.businessSettings?.repairTerms?.replace(/\n/g, '<br>') || '',
        
        // Englische Variablennamen (für Kompatibilität)
        customerFirstName: customer.firstName || '',
        customerLastName: customer.lastName || '',
        customerFullName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        deviceType: repair.deviceType || '',
        brand: repair.brand || '',
        model: repair.model || '',
        orderCode: repair.orderCode || repair.id?.toString() || '',
        repairId: repair.id?.toString() || '',
        status: repair.status || templateType,
        businessName: variables.businessSettings?.businessName || 'Handyshop',
        businessPhone: variables.businessSettings?.phone || '',
        businessEmail: variables.businessSettings?.smtpUser || variables.businessSettings?.email || '',
        businessAddress: variables.businessSettings?.streetAddress || '',
        opening_hours: variables.businessSettings?.openingHours?.replace(/,\s*/g, ',<br>') || '',
        // Zusätzliche englische Varianten der neuen Variablen
        estimatedCost: repair.estimatedCost || '0',
        repairTerms: variables.businessSettings?.repairTerms?.replace(/\n/g, '<br>') || '',
        // Zusätzliche Variablen für Bewertungsvorlagen
        ...(variables.customVariables || {})
      };
      
      // FORCE opening_hours in die Logs
      console.log(`🔍 Template-Variablen:`, templateVars);
      console.log(`🔍 Business Settings opening_hours:`, variables.businessSettings?.opening_hours);
      console.log(`🔍 SPEZIFISCH opening_hours Variable:`, templateVars.opening_hours);
      console.log(`🔍 ALLE Template-Variablen Keys:`, Object.keys(templateVars));
      
      // Ersetze Platzhalter in Betreff und Inhalt
      let subject = template.subject || `Status-Update für Ihre Reparatur`;
      let content = template.body || `Hallo {{customerFirstName}}, der Status Ihrer Reparatur hat sich geändert.`;
      
      console.log(`🔍 Original Template:`, { subject, content: content.substring(0, 100) + '...' });
      
      // Ersetze Template-Variablen
      for (const [key, value] of Object.entries(templateVars)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
        content = content.replace(new RegExp(placeholder, 'g'), value || '');
      }
      
      console.log(`🔍 Nach Variable-Ersetzung:`, { 
        subject, 
        content: content.substring(0, 200) + '...',
        contentLength: content.length 
      });
      
      // SPEZIFISCHER Debug für openingHours
      if (content.includes('{{openingHours}}')) {
        console.log(`❌ FEHLER: {{openingHours}} wurde NICHT ersetzt!`);
        console.log(`🔍 Verfügbare templateVars:`, Object.keys(templateVars));
        console.log(`🔍 openingHours Wert:`, templateVars.openingHours);
      } else {
        console.log(`✅ SUCCESS: {{openingHours}} wurde erfolgreich ersetzt`);
      }
      
      console.log(`📧 Sende E-Mail an ${customer.email} mit Betreff: ${subject}`);
      
      // Sende die E-Mail mit shop-spezifischen SMTP-Einstellungen
      const fromAddress = variables.businessSettings?.smtpUser;
      const fromName = variables.businessSettings?.smtpSenderName || 
                      variables.businessSettings?.businessName || 
                      'Handyshop';
      
      console.log(`📧 Verwende Absender: "${fromName}" <${fromAddress}>`);
      
      const emailSent = await this.sendEmail({
        to: customer.email,
        subject: subject,
        html: content,
        text: content.replace(/<[^>]*>/g, '') // HTML-Tags entfernen für Text-Version
      }, userId);
      
      if (emailSent) {
        // Speichere E-Mail im Verlauf
        try {
          await this.saveEmailHistory({
            repairId: repairId,
            recipient: customer.email,
            subject: subject,
            status: 'sent',
            userId: userId,
            shopId: repair.shopId
          });
        } catch (historyError) {
          console.warn('Fehler beim Speichern des E-Mail-Verlaufs:', historyError);
        }
        
        console.log(`✅ Status-E-Mail erfolgreich gesendet an ${customer.email}`);
        return { success: true };
      } else {
        console.error(`❌ E-Mail-Versand fehlgeschlagen an ${customer.email}`);
        return { success: false, error: 'E-Mail-Versand fehlgeschlagen' };
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Senden der Status-E-Mail:', error);
      return { success: false, error: `Fehler beim E-Mail-Versand: ${error}` };
    }
  }

  /**
   * Speichert einen E-Mail-Eintrag im Verlauf
   */
  private async saveEmailHistory(data: {
    repairId: number;
    recipient: string;
    subject: string;
    status: string;
    userId?: number;
    shopId?: number;
  }): Promise<void> {
    try {
      console.log('💾 Speichere E-Mail-Historie:', data);
      
      const historyData = {
        repairId: data.repairId,
        recipient: data.recipient,
        subject: data.subject,
        status: data.status, // 'sent' oder 'failed'
        userId: data.userId || null,
        shopId: data.shopId || null,
        emailTemplateId: null
      };
      
      console.log('💾 Historie-Daten zum Speichern:', historyData);
      
      const result = await db.insert(emailHistory).values({
        repairId: historyData.repairId,
        recipient: historyData.recipient,
        subject: historyData.subject,
        status: historyData.status,
        userId: historyData.userId,
        shopId: historyData.shopId,
        emailTemplateId: historyData.emailTemplateId
      }).returning();
      console.log('✅ E-Mail-Historie erfolgreich gespeichert:', result);
    } catch (error) {
      console.error('Fehler beim Speichern der E-Mail-Historie:', error);
      throw error;
    }
  }

  /**
   * Sendet einen Newsletter mit professioneller HTML-Vorlage an alle abonnierten Benutzer
   * @param newsletter Newsletter-Daten (subject, content)
   * @param recipients Array von Empfänger-E-Mail-Adressen
   * @returns Promise<{ success: boolean; sentCount: number; failedCount: number; details: any[] }>
   */
  async sendNewsletter(newsletter: { subject: string; content: string }, recipients: { email: string; name?: string }[]): Promise<{ success: boolean; sentCount: number; failedCount: number; details: any[] }> {
    try {
      console.log(`📧 Starte Newsletter-Versand an ${recipients.length} Empfänger...`);
      
      if (!this.smtpTransporter || !this.superadminEmailConfig) {
        console.error('❌ Kein SMTP-Transporter oder -Konfiguration verfügbar für Newsletter-Versand');
        return { success: false, sentCount: 0, failedCount: recipients.length, details: [] };
      }

      let sentCount = 0;
      let failedCount = 0;
      const details: any[] = [];

      const senderEmail = this.superadminEmailConfig.smtpSenderEmail || this.superadminEmailConfig.smtpUser;
      const senderName = this.superadminEmailConfig.smtpSenderName || 'ClientKing Handyshop Verwaltung';

      // Versende Newsletter an jeden Empfänger einzeln
      for (const recipient of recipients) {
        try {
          // Personalisierte Unsubscribe-URL generieren
          const baseUrl = process.env.FRONTEND_URL || 
                         (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
          const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
          
          // ClientKing Logo als HTML img-Tag
          const logoHtml = `<img src="${baseUrl}/clientking-logo.png" alt="ClientKing Logo" style="height: 50px;" />`;
          
          // Newsletter Logo laden (aktuell aktives Logo)
          let newsletterLogoHtml = '';
          let logoAttachment = null;
          try {
            const [activeLogo] = await db
              .select()
              .from(newsletterLogos)
              .where(eq(newsletterLogos.isActive, true))
              .limit(1);
            
            if (activeLogo) {
              console.log(`📸 Newsletter-Logo gefunden: ${activeLogo.name} - wird als Base64 eingebettet`);
              
              // Logo als Base64 einbetten (funktioniert in allen E-Mail-Clients)
              const logoFileName = activeLogo.filepath.split('/').pop();
              const logoUrl = `${baseUrl}/public-objects/newsletter-logos/${logoFileName}`;
              
              try {
                // Logo als Base64 herunterladen und einbetten
                const response = await fetch(logoUrl);
                if (response.ok) {
                  const buffer = await response.buffer();
                  const base64Data = buffer.toString('base64');
                  const dataUrl = `data:image/png;base64,${base64Data}`;
                  
                  newsletterLogoHtml = `<img src="${dataUrl}" alt="${activeLogo.name}" style="max-height: 200px; max-width: 100%; height: auto; display:block; margin:0 auto;" />`;
                  console.log(`📸 Newsletter-Logo ${activeLogo.name} als Base64 eingebettet (${base64Data.length} bytes)`);
                } else {
                  console.error(`❌ Logo konnte nicht heruntergeladen werden: ${response.status}`);
                  // Fallback: zeige Platzhalter
                  newsletterLogoHtml = `<div style="text-align:center; padding:20px; background:#f0f0f0; border:2px dashed #ccc; margin:20px 0;"><strong>🖼️ ${activeLogo.name}</strong><br><small>(Logo konnte nicht geladen werden)</small></div>`;
                }
              } catch (downloadError) {
                console.error(`❌ Fehler beim Herunterladen des Logos:`, downloadError);
                // Fallback: zeige Platzhalter
                newsletterLogoHtml = `<div style="text-align:center; padding:20px; background:#f0f0f0; border:2px dashed #ccc; margin:20px 0;"><strong>🖼️ ${activeLogo.name}</strong><br><small>(Logo-Fehler)</small></div>`;
              }
            } else {
              console.log(`❌ Kein aktives Newsletter-Logo gefunden!`);
            }
          } catch (error) {
            console.warn('Fehler beim Laden des aktiven Newsletter-Logos:', error);
          }
          
          // Newsletter-Variablen definieren
          const newsletterVariables = {
            empfaengername: recipient.name || 'Geschätzte/r Kunde/in',
            shopowner_name: recipient.name || 'Geschätzte/r Kunde/in', // Gleich wie empfaengername für Klarheit
            empfaengeremail: recipient.email,
            firmenname: recipient.name || 'Ihr Shop', // Firmenname als separate Variable
            abmeldelink: unsubscribeUrl,
            clientking_logo: logoHtml,
            logoNewsletter: newsletterLogoHtml, // Neues Newsletter-Logo
            aktuellesjahr: new Date().getFullYear().toString()
          };
          
          // Ersetze alle Variablen im Newsletter-Content
          let personalizedContent = newsletter.content;
          console.log(`🔄 Ersetze Variablen für ${recipient.email}:`);
          console.log(`🔄 logoNewsletter Wert: "${newsletterVariables.logoNewsletter}"`);
          
          Object.entries(newsletterVariables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            const beforeReplace = personalizedContent;
            personalizedContent = personalizedContent.replace(regex, value);
            if (key === 'logoNewsletter' && beforeReplace !== personalizedContent) {
              console.log(`✅ Variable {{${key}}} wurde ersetzt!`);
            } else if (key === 'logoNewsletter') {
              console.log(`❌ Variable {{${key}}} wurde NICHT ersetzt!`);
            }
          });

          const mailOptions = {
            from: `"${senderName}" <${senderEmail}>`,
            to: recipient.email,
            subject: newsletter.subject,
            html: personalizedContent,
            // Base64-Logo braucht keine Anhänge
            // Füge Unsubscribe-Header hinzu (RFC 8058)
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          };

          console.log(`📤 Sende Newsletter an: ${recipient.email}...`);
          const info = await this.smtpTransporter.sendMail(mailOptions);
          
          sentCount++;
          details.push({
            email: recipient.email,
            status: 'sent',
            messageId: info.messageId
          });
          
          console.log(`✅ Newsletter erfolgreich an ${recipient.email} gesendet (ID: ${info.messageId})`);
          
          // Kleine Verzögerung zwischen E-Mails, um SMTP-Server nicht zu überlasten
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Fehler beim Senden an ${recipient.email}:`, error);
          failedCount++;
          details.push({
            email: recipient.email,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
        }
      }

      console.log(`📊 Newsletter-Versand abgeschlossen: ${sentCount} erfolgreich, ${failedCount} fehlgeschlagen`);
      
      return {
        success: sentCount > 0,
        sentCount,
        failedCount,
        details
      };
      
    } catch (error) {
      console.error('❌ Fehler beim Newsletter-Versand:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: recipients.length,
        details: [{ error: error instanceof Error ? error.message : 'Unbekannter Fehler' }]
      };
    }
  }

  /**
   * Erstellt eine professionelle HTML-Vorlage für Newsletter mit ClientKing Logo
   * @param subject Newsletter-Betreff
   * @param content Newsletter-Inhalt (als Plain Text oder HTML)
   * @returns HTML-String
   */
  private createNewsletterHtmlTemplate(subject: string, content: string): string {
    // Basis-URL für Assets
    const baseUrl = process.env.FRONTEND_URL || 
                   (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
    const logoUrl = `${baseUrl}/clientking-logo.png`;

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
            background-color: white;
            padding: 10px;
            border-radius: 8px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #4f46e5;
            font-weight: 500;
        }
        .message {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            white-space: pre-wrap;
        }
        .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: #6b7280;
        }
        .unsubscribe {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .unsubscribe a {
            color: #6b7280;
            text-decoration: none;
            font-size: 12px;
        }
        .unsubscribe a:hover {
            text-decoration: underline;
        }
        .brand-footer {
            margin-top: 15px;
            font-weight: 600;
            color: #3b82f6;
        }
        
        /* Responsive Design */
        @media only screen and (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 5px;
            }
            .header {
                padding: 20px 15px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 30px 20px;
            }
            .footer {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="ClientKing Logo" class="logo" />
            <h1>${subject}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hallo {{recipientName}},
            </div>
            
            <div class="message">
${content}
            </div>
        </div>
        
        <div class="footer">
            <div class="brand-footer">
                ClientKing Handyshop Verwaltung
            </div>
            <p>Die professionelle Lösung für Ihr Reparaturgeschäft</p>
            <p>Vielen Dank für Ihr Vertrauen in unsere Software!</p>
            
            <div class="unsubscribe">
                <p>Sie erhalten diese E-Mail, weil Sie Newsletter von ClientKing abonniert haben.</p>
                <a href="{{unsubscribeUrl}}">Hier abmelden</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

export const emailService = new EmailService();