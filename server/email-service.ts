import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate, businessSettings } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails
 * Jeder Benutzer kann seinen eigenen Mail-Server konfigurieren, mit Brevo als Fallback
 */
export class EmailService {
  private apiInstance: TransactionalEmailsApi | null = null;
  private globalSmtpTransporter: nodemailer.Transporter | null = null;
  private userTransporters: Map<number, nodemailer.Transporter> = new Map();

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

    // Initialisiere globalen SMTP-Transporter als Fallback
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;
      
      // Prüfe, ob alle erforderlichen SMTP-Einstellungen vorhanden sind
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        console.warn('Eine oder mehrere globale SMTP-Einstellungen fehlen, nur Benutzer-SMTP oder Brevo als Fallback verfügbar');
      } else {
        // Verwende die globalen SMTP-Einstellungen als Fallback
        this.globalSmtpTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true für 465, false für andere Ports
          auth: {
            user: smtpUser,
            pass: smtpPassword
          },
          tls: {
            // Deaktiviere die Zertifikatsprüfung im Entwicklungsmodus
            rejectUnauthorized: process.env.NODE_ENV !== 'development'
          }
        });
        
        console.log(`Globaler SMTP-Transporter für ${smtpHost} wurde initialisiert`);
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren des globalen SMTP-Transporters:', error);
      this.globalSmtpTransporter = null;
    }
  }
  
  /**
   * Erstellt einen SMTP-Transporter für den angegebenen Benutzer
   * @param userId Die ID des Benutzers
   * @returns Ein Promise mit dem SMTP-Transporter oder null, wenn die Erstellung fehlschlägt
   */
  private async createUserSmtpTransporter(userId: number): Promise<nodemailer.Transporter | null> {
    try {
      // Lade die SMTP-Einstellungen des Benutzers aus der Datenbank
      const [settings] = await db.select().from(businessSettings)
        .where(eq(businessSettings.userId, userId));
      
      if (!settings) {
        console.warn(`Keine Geschäftseinstellungen für Benutzer ${userId} gefunden`);
        return null;
      }
      
      // Prüfe, ob die erforderlichen SMTP-Einstellungen vorhanden sind
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword || !settings.smtpPort) {
        console.warn(`Unvollständige SMTP-Einstellungen für Benutzer ${userId}`);
        return null;
      }
      
      // Erstelle einen SMTP-Transporter mit den Benutzereinstellungen
      const smtpPort = parseInt(settings.smtpPort);
      
      // Erweiterte Konfigurationsoptionen basierend auf dem Port
      const isSecure = smtpPort === 465;
      
      // Erstelle einen SMTP-Transporter
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: smtpPort,
        secure: isSecure, // true für 465, false für andere Ports
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        },
        tls: {
          // Deaktiviere die Zertifikatsprüfung im Entwicklungsmodus
          rejectUnauthorized: process.env.NODE_ENV !== 'development'
        }
      });
      
      console.log(`SMTP-Transporter für Benutzer ${userId} (${settings.smtpHost}:${smtpPort}, secure=${isSecure}) erstellt`);
      
      // Verifiziere die Verbindung im Entwicklungsmodus
      if (process.env.NODE_ENV === 'development') {
        try {
          await transporter.verify();
          console.log(`SMTP-Verbindung für Benutzer ${userId} verifiziert`);
        } catch (verifyError) {
          console.error(`SMTP-Verbindungsfehler für Benutzer ${userId}:`, verifyError);
          // Versuche trotzdem, den Transporter zurückzugeben
        }
      }
      
      // Speichere den Transporter in der Map
      this.userTransporters.set(userId, transporter);
      
      return transporter;
    } catch (error) {
      console.error(`Fehler beim Erstellen des SMTP-Transporters für Benutzer ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Gibt den passenden SMTP-Transporter für den angegebenen Benutzer zurück
   * @param userId Die ID des Benutzers
   * @returns Ein Promise mit dem SMTP-Transporter oder null, wenn kein Transporter gefunden wurde
   */
  private async getUserSmtpTransporter(userId: number): Promise<nodemailer.Transporter | null> {
    // Prüfe, ob bereits ein Transporter für diesen Benutzer existiert
    if (this.userTransporters.has(userId)) {
      return this.userTransporters.get(userId) || null;
    }
    
    // Erstelle einen neuen Transporter für diesen Benutzer
    return await this.createUserSmtpTransporter(userId);
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
      
      // Füge das aktuelle Jahr als Variable hinzu
      variables["aktuellesJahr"] = new Date().getFullYear().toString();
      
      // Bestimme die aktuelle Benutzer-ID aus den Variablen
      const userId = variables.userId ? parseInt(variables.userId) : 0;
      
      // Geschäftsinformationen für das Absenderfeld des aktuellen Benutzers laden
      const businessSettingsTable = businessSettings;
      const settingsData = await db.select().from(businessSettingsTable)
        .where(eq(businessSettingsTable.userId, userId));
        
      const bizSettings = settingsData.length > 0 ? settingsData[0] : null;
      
      if (bizSettings) {
        // Füge alle relevanten Geschäftsdaten als Variablen hinzu
        // Geschäftsname als Variable
        if (!variables["geschaeftsname"] && bizSettings.businessName) {
          variables["geschaeftsname"] = bizSettings.businessName;
        }
        
        // Adresse als Variable
        if (!variables["adresse"] && bizSettings.streetAddress) {
          variables["adresse"] = `${bizSettings.streetAddress}, ${bizSettings.zipCode} ${bizSettings.city}`;
        }
        
        // Telefonnummer als Variable
        if (!variables["telefon"] && bizSettings.phone) {
          variables["telefon"] = bizSettings.phone;
        }
        
        // E-Mail als Variable
        if (!variables["email"] && bizSettings.email) {
          variables["email"] = bizSettings.email;
        }
        
        // Website als Variable
        if (!variables["website"] && bizSettings.website) {
          variables["website"] = bizSettings.website;
        }
        
        // Bewertungslink als Variable
        if (!variables["bewertungslink"]) {
          if (bizSettings.reviewLink) {
            // Stelle sicher, dass der Bewertungslink vollständig ist (mit http/https)
            let reviewLink = bizSettings.reviewLink;
            if (reviewLink && !reviewLink.startsWith('http')) {
              reviewLink = 'https://' + reviewLink;
            }
            console.log(`Verwende Bewertungslink: ${reviewLink}`);
            variables["bewertungslink"] = reviewLink;
          } else {
            // Fallback
            variables["bewertungslink"] = "https://g.page/r/CVkTCKBnO_NqEBM/review";
            console.log("Verwende Fallback-Bewertungslink, da kein Link in den Einstellungen gefunden wurde.");
          }
        }
      }
      
      // Debug-Ausgabe der Variablen vor der Ersetzung
      console.log("Variablen für die E-Mail:", JSON.stringify(variables, null, 2));
      
      // Ersetze Variablen im Format {{variableName}}
      Object.entries(variables).forEach(([key, value]) => {
        if (value !== undefined && value !== null) { // Überprüfe, ob der Wert existiert
          const placeholder = `{{${key}}}`;
          
          // Besondere Behandlung für den Bewertungslink
          if (key === 'bewertungslink') {
            console.log(`Ersetze Bewertungslink-Platzhalter: "${placeholder}" mit Wert: "${value}"`);
            
            // Stelle sicher, dass URLs sicher ersetzt werden
            let safeValue = value;
            if (!safeValue.startsWith('http')) {
              safeValue = 'https://' + safeValue;
            }
            
            subject = subject.replace(new RegExp(placeholder, 'g'), safeValue);
            body = body.replace(new RegExp(placeholder, 'g'), safeValue);
          } else {
            // Normale Variablenersetzung für alle anderen Variablen
            subject = subject.replace(new RegExp(placeholder, 'g'), value);
            body = body.replace(new RegExp(placeholder, 'g'), value);
          }
        } else {
          console.log(`Warnung: Variable ${key} hat keinen Wert und wird nicht ersetzt.`);
        }
      });
      
      if (!bizSettings) {
        console.error(`Keine Geschäftseinstellungen für Benutzer ${userId} gefunden`);
        return false;
      }
      
      // Verwende die SMTP-Einstellungen des Benutzers, falls vorhanden
      const senderEmail = bizSettings.email || 'no-reply@example.com';
      const senderName = bizSettings.smtpSenderName || bizSettings.businessName || 'Handyshop Verwaltung';
      
      // Entwicklungsmodus-Information, aber senden trotzdem
      if (process.env.NODE_ENV === 'development') {
        console.log(`E-Mail wird gesendet an: ${to}, Betreff: ${subject}, von: ${senderName} <${senderEmail}>`);
      }

      // 1. Versuch: Benutze den benutzerspezifischen SMTP-Transporter, falls vorhanden
      const userSmtpTransporter = await this.getUserSmtpTransporter(userId);
      if (userSmtpTransporter) {
        try {
          console.log(`Sende E-Mail über benutzerdefinierten SMTP-Server für Benutzer ${userId}...`);
          
          // Bei der Absender-E-Mail MUSS der SMTP-Login verwendet werden
          // Dies ist ein häufiger Fehler bei SMTP-Konfigurationen
          const fromEmail = bizSettings.smtpUser;
          
          // Sicherstellen, dass die From-Adresse eine gültige E-Mail-Struktur hat
          if (!fromEmail || !fromEmail.includes('@')) {
            console.error(`Ungültige Absender-E-Mail für Benutzer ${userId}: "${fromEmail}"`);
            throw new Error('Ungültige Absender-E-Mail-Adresse');
          }
          
          // Debug-Ausgabe für die Verbindung
          console.log(`SMTP-Verbindungsdaten: Host=${bizSettings.smtpHost}, Port=${bizSettings.smtpPort}, User=${fromEmail}`);
          
          // Erweiterte Mail-Optionen
          const mailOptions = {
            from: `"${senderName}" <${fromEmail}>`,
            to: to,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, ''), // Strip HTML für Plaintext
            // Weitere Optionen für robustere E-Mail-Zustellung
            headers: {
              // Wichtige Header für bessere Zustellbarkeit und weniger Spam-Einstufung
              'X-Priority': '3', // Normale Priorität (hohe Priorität kann Spam-Verdacht erhöhen)
              'Importance': 'normal',
              'X-MSMail-Priority': 'Normal',
              'X-Mailer': 'Handyshop Verwaltung (NodeJS/Nodemailer)',
              // Header für bessere Zustellbarkeit
              'Precedence': 'bulk',
              'Auto-Submitted': 'auto-generated',
              'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
              // Anti-Spam Header (beugen Spam-Verdacht vor)
              'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
              'X-Report-Abuse': `Bitte melden Sie Missbrauch an ${fromEmail}`
            },
            // In Entwicklungsumgebungen zurückverfolgen
            dsn: {
              id: true,
              return: 'headers',
              notify: ['failure', 'delay'],
              recipient: fromEmail
            },
            // Eine Antwort-Adresse hinzufügen
            replyTo: fromEmail
          };
          
          try {
            console.log('Versuche E-Mail zu senden mit Optionen:', JSON.stringify({
              ...mailOptions,
              html: '[HTML entfernt für Log]',
              text: '[Text entfernt für Log]'
            }, null, 2));
            
            const info = await userSmtpTransporter.sendMail(mailOptions);
            console.log(`E-Mail erfolgreich über benutzerdefinierten SMTP-Server für Benutzer ${userId} gesendet:`, info.messageId);
            
            // Ausgabe zusätzlicher Debug-Informationen
            if (process.env.NODE_ENV === 'development') {
              console.log('SMTP-Antwort:', info.response);
              if (info.envelope) {
                console.log('Envelope:', info.envelope);
              }
              console.log('Nachrichtenpfad:', info.messageId);
              console.log('Zustellungsbericht:', 'Preview URL: ' + nodemailer.getTestMessageUrl(info));
            }
            
            return true;
          } catch (sendError: any) {
            // Detaillierte Fehleranalyse
            console.error(`Fehler beim Senden der E-Mail über benutzerdefinierten SMTP-Server für Benutzer ${userId}:`, sendError?.message);
            console.error('Fehlercode:', sendError?.code);
            console.error('Fehlerkommando:', sendError?.command);
            console.error('SMTP-Antwort:', sendError?.response);
            
            // Neu erstellen des Transporters, falls der Fehler auf eine unterbrochene Verbindung hinweist
            if (sendError?.code === 'ECONNECTION' || sendError?.code === 'ETIMEDOUT' || sendError?.code === 'ESOCKET') {
              console.log('Verbindungsproblem erkannt, erstelle Transporter neu...');
              this.userTransporters.delete(userId);
              // Fallback zum nächsten Versuch
            }
            
            throw sendError; // Weiterleiten für Fallback
          }
        } catch (userSmtpError) {
          console.error(`E-Mail-Versand über benutzerdefinierten SMTP fehlgeschlagen, versuche Fallback...`);
          // Fallback zum nächsten Versuch
        }
      }

      // 2. Versuch: Benutze den globalen SMTP-Transporter, falls vorhanden
      if (this.globalSmtpTransporter) {
        try {
          console.log('Sende E-Mail über globalen SMTP-Server...');
          
          const fromEmail = process.env.SMTP_USER || '';
          
          const mailOptions = {
            from: `"${senderName}" <${fromEmail}>`, // Der SMTP-Login muss als Absender verwendet werden
            to: to,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, ''), // Strip HTML für Plaintext
            // Weitere Optionen für robustere E-Mail-Zustellung
            headers: {
              // Wichtige Header für bessere Zustellbarkeit und weniger Spam-Einstufung
              'X-Priority': '3', // Normale Priorität (hohe Priorität kann Spam-Verdacht erhöhen)
              'Importance': 'normal',
              'X-MSMail-Priority': 'Normal',
              'X-Mailer': 'Handyshop Verwaltung (NodeJS/Nodemailer)',
              // Header für bessere Zustellbarkeit
              'Precedence': 'bulk',
              'Auto-Submitted': 'auto-generated',
              'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
              // Anti-Spam Header (beugen Spam-Verdacht vor)
              'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
              'X-Report-Abuse': `Bitte melden Sie Missbrauch an ${fromEmail}`
            },
            // Eine Antwort-Adresse hinzufügen
            replyTo: fromEmail
          };
          
          const info = await this.globalSmtpTransporter.sendMail(mailOptions);
          console.log('E-Mail erfolgreich über globalen SMTP-Server gesendet:', info.messageId);
          return true;
        } catch (smtpError) {
          console.error('Fehler beim Senden der E-Mail über globalen SMTP-Server:', smtpError);
          
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

      // 3. Versuch (Fallback): Wenn SMTP fehlschlägt oder nicht konfiguriert ist, versuche die API
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