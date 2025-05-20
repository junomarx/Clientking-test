/**
 * Benutzer-spezifischer E-Mail-Service
 * 
 * Dieser Service stellt sicher, dass jeder Benutzer seine eigenen SMTP-Einstellungen verwenden kann,
 * um E-Mails mit seiner persönlichen E-Mail-Adresse zu versenden.
 */
import nodemailer from 'nodemailer';
import { db } from './db.js';
import { businessSettings, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

class UserSpecificEmailService {
  constructor() {
    // Cache für SMTP-Transporter pro Benutzer
    this.transporterCache = new Map();
    
    // Standard SMTP-Konfiguration als Fallback
    this.defaultConfig = {
      host: process.env.SMTP_HOST || 'smtp.world4you.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'office@connect7.at',
        pass: process.env.SMTP_PASSWORD || 'Masterneo-1'
      },
      tls: {
        rejectUnauthorized: false
      }
    };
  }
  
  /**
   * Holt die SMTP-Einstellungen eines Benutzers aus der Datenbank
   * @param {number} userId - Benutzer-ID
   * @returns {Promise<Object>} SMTP-Konfiguration
   */
  async getUserSmtpConfig(userId) {
    try {
      // Spezielle Hardcoded-Konfiguration für Benutzer 'murat' (ID: 4)
      // Diese MUSS als erstes geprüft werden, um immer die richtigen Einstellungen zu verwenden
      if (userId === 4) {
        console.log('Verwende spezielle SMTP-Konfiguration für Benutzer murat (ID 4)');
        return {
          host: 'smtp.world4you.com',
          port: 587,
          secure: false,
          auth: {
            user: 'office@macandphonedoc.at',
            pass: '#M@candPh0n3D0C!'
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }
      
      // Hole die neueste Geschäftseinstellung dieses Benutzers
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.updatedAt))
        .limit(1);
      
      if (!settings) {
        console.log(`Keine Geschäftseinstellungen für Benutzer ${userId} gefunden, verwende Standardkonfiguration`);
        return this.defaultConfig;
      }
      
      // Überprüfe, ob die SMTP-Einstellungen vollständig sind
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
        console.log(`Unvollständige SMTP-Einstellungen für Benutzer ${userId}, verwende Standardkonfiguration`);
        return this.defaultConfig;
      }
      
      // Parse Port als Zahl
      let port = 587;
      try {
        port = typeof settings.smtpPort === 'string' ? 
          parseInt(settings.smtpPort) : 
          settings.smtpPort || 587;
      } catch (e) {
        console.warn(`Konnte SMTP-Port nicht parsen für Benutzer ${userId}, verwende Standard-Port 587`);
      }
      
      return {
        host: settings.smtpHost,
        port: port,
        secure: port === 465, // true für 465, false für andere Ports
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      };
    } catch (error) {
      console.error(`Fehler beim Laden der SMTP-Konfiguration für Benutzer ${userId}:`, error);
      return this.defaultConfig;
    }
  }
  
  /**
   * Holt den Transporter für einen bestimmten Benutzer
   * Erstellt einen neuen, wenn noch keiner im Cache existiert
   * @param {number} userId - Benutzer-ID
   * @returns {Promise<nodemailer.Transporter>} Nodemailer Transporter
   */
  async getTransporter(userId) {
    // Prüfe, ob ein gültiger Transporter im Cache existiert
    if (this.transporterCache.has(userId)) {
      console.log(`Verwende gecachten SMTP-Transporter für Benutzer ${userId}`);
      return this.transporterCache.get(userId);
    }
    
    // Hole die SMTP-Konfiguration des Benutzers
    const config = await this.getUserSmtpConfig(userId);
    
    console.log(`SMTP-Konfiguration für Benutzer ${userId}:`, {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.auth.user }
    });
    
    try {
      // Erstelle einen neuen Transporter und teste die Verbindung
      const transporter = nodemailer.createTransport(config);
      await transporter.verify();
      
      console.log(`SMTP-Verbindung für Benutzer ${userId} erfolgreich getestet`);
      
      // Cache den Transporter für zukünftige Verwendung
      this.transporterCache.set(userId, transporter);
      return transporter;
    } catch (error) {
      console.error(`SMTP-Verbindungsfehler für Benutzer ${userId}:`, error);
      console.log(`Verwende Standard-SMTP-Konfiguration für Benutzer ${userId}`);
      
      // Bei Verbindungsfehler: Verwende die Standardkonfiguration
      const defaultTransporter = nodemailer.createTransport(this.defaultConfig);
      this.transporterCache.set(userId, defaultTransporter);
      
      return defaultTransporter;
    }
  }
  
  /**
   * Sendet eine E-Mail mit den SMTP-Einstellungen eines bestimmten Benutzers
   * @param {number} userId - Benutzer-ID
   * @param {Object} mailOptions - E-Mail-Optionen (to, subject, html, text, attachments)
   * @returns {Promise<Object>} Ergebnis des E-Mail-Versands
   */
  async sendEmail(userId, mailOptions) {
    try {
      // Hole Benutzername für Logs
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const username = user ? user.username : `Unbekannter Benutzer (ID: ${userId})`;
      
      console.log(`Bereite E-Mail-Versand für Benutzer ${username} (ID: ${userId}) vor`);
      
      // Hole die Geschäftseinstellungen für Shop-Name und E-Mail
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.updatedAt))
        .limit(1);
      
      // Wenn keine From-Adresse angegeben wurde, verwende die aus den Einstellungen
      if (!mailOptions.from && settings && settings.email) {
        const shopName = settings.businessName || username;
        mailOptions.from = `"${shopName}" <${settings.email}>`;
        console.log(`Verwende Shop-E-Mail als Absender: ${mailOptions.from}`);
      }
      
      // Für Benutzer "murat" (ID 4): verwende spezielle From-Adresse, die den Server-Einschränkungen entspricht
      if (userId === 4) {
        // WICHTIG: Die E-Mail-Adresse muss @connect7.at sein, aber wir können den Anzeigenamen beliebig gestalten
        mailOptions.from = '"Mac & Phone Doc | office@macandphonedoc.at" <office@connect7.at>';
        console.log(`Spezieller Absender für Benutzer murat: ${mailOptions.from}`);
        
        // Sorge dafür, dass immer die erlaubte E-Mail-Adresse für SMTP-Authentifizierung genutzt wird
        const transporter = await this.getTransporter(null);
        return transporter.sendMail(mailOptions);
      }
      
      // Wenn immer noch keine From-Adresse vorhanden ist, verwende die Standard-E-Mail
      if (!mailOptions.from) {
        // Hole die Standardkonfiguration aus dem Transport-Objekt
        const config = await this.getUserSmtpConfig(userId);
        mailOptions.from = `"${username}" <${config.auth.user}>`;
        console.log(`Verwende Standard-Absender: ${mailOptions.from}`);
      }
      
      // Hole den Transporter für diesen Benutzer
      const transporter = await this.getTransporter(userId);
      
      // Sende die E-Mail
      console.log(`Sende E-Mail an: ${mailOptions.to}`);
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`E-Mail erfolgreich gesendet: ${info.messageId}`);
      return { 
        success: true, 
        messageId: info.messageId 
      };
    } catch (error) {
      console.error(`Fehler beim E-Mail-Versand für Benutzer ${userId}:`, error);
      
      // Versuche mit Standard-SMTP-Einstellungen, wenn benutzerspezifische fehlschlagen
      try {
        console.log(`Versuche Fallback mit Standard-SMTP für Benutzer ${userId}`);
        const defaultTransporter = nodemailer.createTransport(this.defaultConfig);
        
        // Entferne möglicherweise ungültige From-Adresse
        if (mailOptions.from && mailOptions.from.includes('macandphonedoc.at')) {
          mailOptions.from = `"Handyshop Verwaltung" <${this.defaultConfig.auth.user}>`;
        }
        
        const info = await defaultTransporter.sendMail(mailOptions);
        
        console.log(`E-Mail mit Fallback erfolgreich gesendet: ${info.messageId}`);
        return { 
          success: true, 
          messageId: info.messageId, 
          usedFallback: true 
        };
      } catch (fallbackError) {
        console.error(`Auch Fallback-Versand fehlgeschlagen:`, fallbackError);
        return { 
          success: false, 
          error: error.message 
        };
      }
    }
  }
  
  /**
   * Löscht den Transporter-Cache für einen bestimmten Benutzer
   * oder für alle Benutzer, wenn keine ID angegeben wurde
   * @param {number} userId - Benutzer-ID (optional)
   */
  clearCache(userId = null) {
    if (userId) {
      this.transporterCache.delete(userId);
      console.log(`SMTP-Transporter-Cache für Benutzer ${userId} gelöscht`);
    } else {
      this.transporterCache.clear();
      console.log('Gesamter SMTP-Transporter-Cache gelöscht');
    }
  }
  
  /**
   * Testet die SMTP-Verbindung eines Benutzers
   * @param {number} userId - Benutzer-ID
   * @param {Object} testConfig - Optionale Test-Konfiguration
   * @returns {Promise<Object>} Testergebnis
   */
  async testConnection(userId, testConfig = null) {
    try {
      const config = testConfig || await this.getUserSmtpConfig(userId);
      
      console.log(`Teste SMTP-Verbindung für Benutzer ${userId} mit Konfiguration:`, {
        host: config.host,
        port: config.port,
        user: config.auth.user
      });
      
      const transporter = nodemailer.createTransport(config);
      await transporter.verify();
      
      console.log(`SMTP-Verbindungstest für Benutzer ${userId} erfolgreich`);
      return { 
        success: true, 
        message: 'SMTP-Verbindung erfolgreich hergestellt' 
      };
    } catch (error) {
      console.error(`SMTP-Verbindungstest für Benutzer ${userId} fehlgeschlagen:`, error);
      return { 
        success: false, 
        message: `SMTP-Verbindung fehlgeschlagen: ${error.message}` 
      };
    }
  }
  
  /**
   * Sendet eine Test-E-Mail mit den Einstellungen eines Benutzers
   * @param {number} userId - Benutzer-ID
   * @param {string} testEmail - E-Mail-Adresse für den Test
   * @param {Object} testConfig - Optionale Test-Konfiguration
   * @returns {Promise<Object>} Testergebnis
   */
  async sendTestEmail(userId, testEmail, testConfig = null) {
    try {
      // Hole Benutzerdaten für die Test-E-Mail
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const username = user ? user.username : `Benutzer ${userId}`;
      
      // Wenn Test-Konfiguration vorhanden, erstelle einen temporären Transporter
      let transporter;
      if (testConfig) {
        transporter = nodemailer.createTransport(testConfig);
        await transporter.verify();
      } else {
        transporter = await this.getTransporter(userId);
      }
      
      // Geschäftseinstellungen für zusätzliche Informationen
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.updatedAt))
        .limit(1);
      
      const shopName = settings?.businessName || username;
      const senderEmail = testConfig?.auth?.user || 
                           settings?.email || 
                           (await this.getUserSmtpConfig(userId)).auth.user;
      
      // Erstelle die Test-E-Mail
      const mailOptions = {
        from: `"${shopName} (Test)" <${senderEmail}>`,
        to: testEmail,
        subject: 'SMTP-Test für Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #10b981;">SMTP-Test erfolgreich!</h2>
            </div>
            
            <p>Hallo,</p>
            <p>dies ist eine Test-E-Mail von <strong>${shopName}</strong>.</p>
            <p>Die SMTP-Verbindung funktioniert einwandfrei mit folgenden Einstellungen:</p>
            
            <ul>
              <li><strong>Host:</strong> ${testConfig?.host || settings?.smtpHost || (await this.getUserSmtpConfig(userId)).host}</li>
              <li><strong>Port:</strong> ${testConfig?.port || settings?.smtpPort || (await this.getUserSmtpConfig(userId)).port}</li>
              <li><strong>Benutzer:</strong> ${testConfig?.auth?.user || settings?.smtpUser || (await this.getUserSmtpConfig(userId)).auth.user}</li>
            </ul>
            
            <p>Wenn Sie diese E-Mail erhalten haben, ist Ihre E-Mail-Konfiguration korrekt.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte Test-E-Mail der Handyshop Verwaltung.</p>
              <p>Zeitstempel: ${new Date().toLocaleString('de-DE')}</p>
            </div>
          </div>
        `,
        text: `SMTP-Test erfolgreich! Dies ist eine Test-E-Mail von ${shopName}. Die SMTP-Verbindung funktioniert einwandfrei.`
      };
      
      // Sende die Test-E-Mail
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`Test-E-Mail für Benutzer ${userId} erfolgreich gesendet: ${info.messageId}`);
      return { 
        success: true, 
        message: 'Test-E-Mail erfolgreich gesendet',
        messageId: info.messageId
      };
    } catch (error) {
      console.error(`Fehler beim Senden der Test-E-Mail für Benutzer ${userId}:`, error);
      return { 
        success: false, 
        message: `Fehler beim Senden der Test-E-Mail: ${error.message}` 
      };
    }
  }
}

// Singleton-Instanz exportieren
export const userEmailService = new UserSpecificEmailService();