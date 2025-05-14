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
import { eq, desc, isNull, or, and, SQL, count, sql } from 'drizzle-orm';
import { storage } from './storage';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

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
          // Ignoriere TLS-Zertifikatsfehler (nur für Entwicklungszwecke)
          tls: {
            rejectUnauthorized: false
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
   * Sendet eine Test-E-Mail mit den shop-spezifischen SMTP-Einstellungen
   * Diese Methode testet die Konfiguration für shop-spezifische E-Mails
   */
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      if (!this.smtpTransporter) {
        throw new Error('Kein shop-spezifischer SMTP-Transporter konfiguriert');
      }
      
      // Für World4You muss die Absender-E-Mail mit dem SMTP-Benutzer übereinstimmen
      const senderName = process.env.SMTP_SENDER_NAME || 'Handyshop Verwaltung';
      const senderEmail = process.env.SMTP_USER || 'no-reply@example.com';
      
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
    isSystemEmail = false
  ): Promise<boolean> {
    try {
      console.log(`Sende E-Mail mit Vorlage ID ${templateId} an ${recipientEmail}...`);
      
      // Benutzer-ID aus den Variablen extrahieren (wenn vorhanden) für Zugriffskontrolle
      const userId = variables.userId ? parseInt(variables.userId) : undefined;
      
      // E-Mail-Vorlage aus der Datenbank abrufen
      let template;
      try {
        // Zwei separate Abfragen, um Typprobleme zu vermeiden
        if (userId) {
          [template] = await db
            .select()
            .from(emailTemplates)
            .where(eq(emailTemplates.id, templateId))
            .where(eq(emailTemplates.userId, userId));
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
        forceUserId: userId // Verwende die Benutzer-ID für die SMTP-Einstellungen
      });
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail mit Vorlagen-ID:', error);
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
      // Ersetze Platzhalter in Betreff und Text mit den übergebenen Daten
      let processedSubject = subject;
      let processedBody = body;
      
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
      
      // Wähle den richtigen SMTP-Transporter basierend auf isSystemEmail
      // Default für Transporter ist immer der globale SMTP-Transporter
      // Kann aber in Spezialfällen überschrieben werden
      let transporter = this.smtpTransporter;
      let senderName: string;
      let senderEmail: string;
      
      if (isSystemEmail && this.superadminEmailConfig) {
        // Zentrale SMTP-Einstellungen verwenden (für System-E-Mails)
        senderName = this.superadminEmailConfig.smtpSenderName;
        senderEmail = this.superadminEmailConfig.smtpSenderEmail;
        
        console.log(`Sende System-E-Mail mit Vorlage "${templateName}" über zentrale SMTP-Konfiguration`);
      } else if (forceUserId) {
        // Versuche, die benutzer-spezifischen SMTP-Einstellungen zu verwenden
        try {
          // Hole die Geschäftseinstellungen des Benutzers
          const [businessSetting] = await db
            .select()
            .from(businessSettings)
            .where(eq(businessSettings.userId, forceUserId));
          
          // Wichtig: Die SMTP-Einstellungen müssen komplett sein, sonst keine E-Mail senden
          if (businessSetting && businessSetting.smtpHost && businessSetting.smtpUser && businessSetting.smtpPassword) {
            console.log(`Verwende benutzerspezifische SMTP-Einstellungen für Benutzer ${forceUserId}`);
            
            // Erstelle einen temporären Transporter für diesen Benutzer
            const userConfig = {
              host: businessSetting.smtpHost,
              port: businessSetting.smtpPort || 587,
              secure: (businessSetting.smtpPort || 587) === 465,
              auth: {
                user: businessSetting.smtpUser,
                pass: businessSetting.smtpPassword
              },
              debug: true,
              logger: true
            };
            
            transporter = nodemailer.createTransport(userConfig);
            senderName = businessSetting.businessName || businessSetting.smtpSenderName || 'Handyshop';
            senderEmail = businessSetting.smtpUser;
            
            console.log(`Sende Benutzer-E-Mail mit Vorlage "${templateName}" über Benutzer-SMTP (${senderEmail})`);
          } else {
            // KRITISCH: Keine E-Mail senden, wenn SMTP-Einstellungen fehlen
            console.error(`Benutzer ${forceUserId} hat keine vollständigen SMTP-Einstellungen konfiguriert!`);
            throw new Error(`Benutzer ${forceUserId} hat keine E-Mail-Einstellungen konfiguriert. E-Mail kann nicht gesendet werden.`);
          }
        } catch (error) {
          console.error(`Fehler beim Laden oder Prüfen der SMTP-Einstellungen für Benutzer ${forceUserId}:`, error);
          // Bei Benutzerprofil-E-Mails KEIN Fallback auf Standard-SMTP, 
          // da dies zu verwirrenden E-Mail-Absendern führen würde
          throw error;
        }
      } else {
        // Shop-spezifische SMTP-Einstellungen verwenden
        if (!this.smtpTransporter) {
          throw new Error("Shop-spezifischer SMTP-Transporter nicht konfiguriert");
        }
        
        if (!process.env.SMTP_USER) {
          throw new Error("SMTP_USER für Shop-Transporter nicht konfiguriert");
        }
        
        transporter = this.smtpTransporter;
        senderName = process.env.SMTP_SENDER_NAME || 'Handyshop Verwaltung';
        senderEmail = process.env.SMTP_USER;
        
        console.log(`Sende Kunden-E-Mail mit Vorlage "${templateName}" über shop-spezifische SMTP-Konfiguration`);
      }
      
      console.log(`Sende ${isSystemEmail ? 'System' : 'Kunden'}-E-Mail von: "${senderName}" <${senderEmail}> an: ${recipientEmail}`);
      
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
}

export const emailService = new EmailService();