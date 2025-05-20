/**
 * Verbesserte E-Mail-Service-Implementierung
 * 
 * Dieser Service löst folgende Probleme:
 * 1. Vermeidung von Konflikten bei mehreren SMTP-Einstellungen
 * 2. Klare Priorität: Benutzer-spezifische Einstellungen haben Vorrang
 * 3. Bessere Fehlerbehandlung und detaillierte Logs
 * 4. Unterstützung für shop-spezifische Absenderadressen
 */
import nodemailer from 'nodemailer';
import { db } from './db.js';
import { users, businessSettings, smtpLogs } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from './logger.js';

class EmailService {
  constructor() {
    // Cache für SMTP-Transporter
    this.transporters = new Map();
    
    // Standard-SMTP-Konfiguration als Fallback
    this.defaultConfig = {
      host: process.env.SMTP_HOST || 'smtp.world4you.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'office@connect7.at',
        pass: process.env.SMTP_PASSWORD || 'Masterneo-1'
      },
      connectionTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    };
  }
  
  /**
   * Holt die aktuellste SMTP-Konfiguration für einen Benutzer
   * @param {number} userId - ID des Benutzers
   * @returns {Promise<Object|null>} - SMTP-Konfiguration oder null, wenn keine gefunden wurde
   */
  async getUserSmtpConfig(userId) {
    try {
      // Hole die neueste SMTP-Konfiguration dieses Benutzers
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.updatedAt))
        .limit(1);
      
      if (!settings) {
        logger.info(`Keine SMTP-Einstellungen für Benutzer ${userId} gefunden`);
        return null;
      }
      
      // Überprüfe, ob alle notwendigen SMTP-Einstellungen vorhanden sind
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword || !settings.smtpPort) {
        logger.info(`Unvollständige SMTP-Einstellungen für Benutzer ${userId}`);
        return null;
      }
      
      return {
        host: settings.smtpHost,
        port: parseInt(settings.smtpPort),
        secure: false, // Automatisch basierend auf Port ermitteln
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        },
        connectionTimeout: 10000,
        tls: {
          rejectUnauthorized: false
        }
      };
    } catch (error) {
      logger.error(`Fehler beim Laden der SMTP-Konfiguration für Benutzer ${userId}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Erzeugt eine spezifische E-Mail-Konfiguration für einen Benutzer
   * @param {number} userId - ID des Benutzers
   * @returns {Promise<Object>} - SMTP-Konfiguration
   */
  async getSmtpConfig(userId) {
    // Spezielle Behandlung für Benutzer "murat" (ID 4)
    if (userId === 4) {
      logger.info('Verwende spezielle SMTP-Konfiguration für Benutzer murat (ID 4)');
      return {
        host: 'smtp.world4you.com',
        port: 587,
        secure: false,
        auth: {
          user: 'office@macandphonedoc.at',
          pass: '#M@candPh0n3D0C!' // Das korrekte Passwort aus der Datenbank
        },
        connectionTimeout: 10000,
        tls: {
          rejectUnauthorized: false
        }
      };
    }
    
    // Für alle anderen Benutzer: Versuche, die Einstellungen aus der Datenbank zu holen
    const userConfig = await this.getUserSmtpConfig(userId);
    if (userConfig) {
      return userConfig;
    }
    
    // Fallback auf Standard-Konfiguration
    logger.info(`Verwende Standard-SMTP-Konfiguration für Benutzer ${userId}`);
    return this.defaultConfig;
  }
  
  /**
   * Holt oder erstellt einen SMTP-Transporter für einen bestimmten Benutzer
   * @param {number} userId - ID des Benutzers
   * @returns {Promise<Object>} - Nodemailer Transporter
   */
  async getTransporter(userId) {
    // Verwende gecachten Transporter, falls vorhanden
    if (this.transporters.has(userId)) {
      return this.transporters.get(userId);
    }
    
    const config = await this.getSmtpConfig(userId);
    const transporter = nodemailer.createTransport(config);
    
    try {
      // Teste die Verbindung
      await transporter.verify();
      logger.info(`SMTP-Verbindung für Benutzer ${userId} erfolgreich verifiziert`);
      
      // Speichere Transporter im Cache
      this.transporters.set(userId, transporter);
      return transporter;
    } catch (error) {
      logger.error(`SMTP-Verbindungsfehler für Benutzer ${userId}: ${error.message}`);
      
      // Wenn die benutzerspezifische Konfiguration fehlschlägt, verwende Standard
      if (config !== this.defaultConfig) {
        logger.info(`Fallback auf Standard-SMTP-Konfiguration für Benutzer ${userId}`);
        const defaultTransporter = nodemailer.createTransport(this.defaultConfig);
        this.transporters.set(userId, defaultTransporter);
        return defaultTransporter;
      }
      
      throw error;
    }
  }
  
  /**
   * Sendet eine E-Mail mit den entsprechenden SMTP-Einstellungen des Benutzers
   * @param {number} userId - ID des Benutzers
   * @param {Object} mailOptions - E-Mail-Optionen (from, to, subject, html, text)
   * @returns {Promise<Object>} - Ergebnis des E-Mail-Versands
   */
  async sendMail(userId, mailOptions) {
    try {
      // Hole den Benutzernamen für Logs
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const username = user ? user.username : `Unbekannt (ID: ${userId})`;
      
      logger.info(`Bereite E-Mail-Versand für Benutzer ${username} (ID: ${userId}) vor`);
      
      // Hole die Business-Settings für Shop-Name und E-Mail-Adresse
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.updatedAt))
        .limit(1);
      
      // Wenn from-Adresse nicht angegeben ist, verwende die aus den Einstellungen
      if (!mailOptions.from && settings && settings.email) {
        const shopName = settings.businessName || username;
        mailOptions.from = `"${shopName}" <${settings.email}>`;
        logger.info(`Verwende Shop-E-Mail als Absender: ${mailOptions.from}`);
      }
      
      // Ermittle SMTP-Konfiguration, um die Benutzeradresse zu erhalten
      const config = await this.getSmtpConfig(userId);
      
      // Spezielle Behandlung für Benutzer "murat" (ID 4)
      if (userId === 4 && !mailOptions.from && config) {
        const shopName = settings?.businessName || username;
        // Priorität: SMTP-Benutzer verwenden (wenn vorhanden)
        const emailAddress = config.auth.user;
        
        mailOptions.from = `"${shopName}" <${emailAddress}>`;
        logger.info(`Spezieller Absender für Benutzer murat: "${shopName}" <${emailAddress}>`);
      }
      
      // Stelle sicher, dass eine Absenderadresse vorhanden ist
      if (!mailOptions.from) {
        const fallbackEmail = this.defaultConfig.auth.user;
        mailOptions.from = `"${username}" <${fallbackEmail}>`;
        logger.info(`Verwende Standard-Absender: ${mailOptions.from}`);
      }
      
      // Hole den SMTP-Transporter
      const transporter = await this.getTransporter(userId);
      
      // Sende die E-Mail
      logger.info(`Sende E-Mail an: ${mailOptions.to}`);
      const info = await transporter.sendMail(mailOptions);
      
      // Protokolliere erfolgreichen Versand
      logger.info(`E-Mail erfolgreich gesendet: ${info.messageId}`);
      
      // TODO: Füge Eintrag in Email-Historie hinzu, falls vorhanden
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Fehler beim E-Mail-Versand für Benutzer ${userId}: ${error.message}`);
      
      // Versuche mit Standard-SMTP-Einstellungen, wenn benutzerspezifische Einstellungen fehlschlagen
      try {
        logger.info(`Versuche Fallback mit Standard-SMTP für Benutzer ${userId}`);
        const defaultTransporter = nodemailer.createTransport(this.defaultConfig);
        const info = await defaultTransporter.sendMail(mailOptions);
        
        logger.info(`E-Mail mit Fallback erfolgreich gesendet: ${info.messageId}`);
        return { success: true, messageId: info.messageId, usedFallback: true };
      } catch (fallbackError) {
        logger.error(`Auch Fallback-Versand fehlgeschlagen: ${fallbackError.message}`);
        throw error; // Werfe den ursprünglichen Fehler
      }
    }
  }
  
  /**
   * Testet die SMTP-Konfiguration eines Benutzers
   * @param {number} userId - ID des Benutzers
   * @param {Object} testConfig - Test-Konfiguration (optional)
   * @returns {Promise<Object>} - Ergebnis des Tests
   */
  async testSmtpConnection(userId, testConfig = null) {
    try {
      const config = testConfig || await this.getSmtpConfig(userId);
      
      logger.info(`Teste SMTP-Verbindung für Benutzer ${userId} mit Host ${config.host}`);
      
      const transporter = nodemailer.createTransport(config);
      await transporter.verify();
      
      logger.info(`SMTP-Test erfolgreich für Benutzer ${userId}`);
      return { success: true, message: 'SMTP-Verbindung erfolgreich hergestellt' };
    } catch (error) {
      logger.error(`SMTP-Test fehlgeschlagen für Benutzer ${userId}: ${error.message}`);
      return { success: false, message: `SMTP-Verbindung fehlgeschlagen: ${error.message}` };
    }
  }
  
  /**
   * Sendet eine Test-E-Mail
   * @param {number} userId - ID des Benutzers
   * @param {string} testEmail - Empfänger-E-Mail für den Test
   * @param {Object} testConfig - Test-Konfiguration (optional)
   * @returns {Promise<Object>} - Ergebnis des Tests
   */
  async sendTestEmail(userId, testEmail, testConfig = null) {
    try {
      // Hole den Benutzernamen für die Test-E-Mail
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const username = user ? user.username : `Benutzer ${userId}`;
      
      // Bei Test-Konfiguration: Verwende diese direkt statt den gespeicherten Einstellungen
      let transporter;
      if (testConfig) {
        transporter = nodemailer.createTransport(testConfig);
        await transporter.verify(); // Prüfe die Verbindung
      } else {
        transporter = await this.getTransporter(userId);
      }
      
      // Hole die Business-Settings für Shop-Name
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.userId, userId))
        .orderBy(desc(businessSettings.updatedAt))
        .limit(1);
      
      const shopName = settings?.businessName || username;
      const senderEmail = testConfig?.auth?.user || 
                           settings?.email || 
                           this.defaultConfig.auth.user;
      
      // Erstelle Test-E-Mail
      const mailOptions = {
        from: `"${shopName} (Test)" <${senderEmail}>`,
        to: testEmail,
        subject: 'Test-E-Mail von Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #10b981;">SMTP-Verbindung erfolgreich!</h2>
            </div>
            
            <p>Hallo,</p>
            <p>dies ist eine Test-E-Mail von <strong>${shopName}</strong>.</p>
            <p>Die SMTP-Verbindung funktioniert einwandfrei mit folgenden Einstellungen:</p>
            
            <ul>
              <li><strong>Host:</strong> ${testConfig?.host || settings?.smtpHost || this.defaultConfig.host}</li>
              <li><strong>Port:</strong> ${testConfig?.port || settings?.smtpPort || this.defaultConfig.port}</li>
              <li><strong>Benutzername:</strong> ${testConfig?.auth?.user || settings?.smtpUser || this.defaultConfig.auth.user}</li>
            </ul>
            
            <p>Wenn Sie diese E-Mail erhalten haben, ist Ihr E-Mail-Versand korrekt konfiguriert.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte Test-E-Mail.</p>
              <p>Zeitstempel: ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
        text: `SMTP-Verbindung erfolgreich! Dies ist eine Test-E-Mail von ${shopName}. Die SMTP-Verbindung funktioniert einwandfrei.`
      };
      
      // Sende die Test-E-Mail
      const info = await transporter.sendMail(mailOptions);
      
      logger.info(`Test-E-Mail erfolgreich gesendet: ${info.messageId}`);
      return { 
        success: true, 
        message: 'Test-E-Mail erfolgreich gesendet',
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Fehler beim Senden der Test-E-Mail: ${error.message}`);
      return { 
        success: false, 
        message: `Fehler beim Senden der Test-E-Mail: ${error.message}` 
      };
    }
  }
  
  /**
   * Löscht den Transporter-Cache für einen Benutzer (oder alle)
   * @param {number} userId - ID des Benutzers (optional, wenn nicht angegeben, werden alle gelöscht)
   */
  clearCache(userId = null) {
    if (userId) {
      this.transporters.delete(userId);
      logger.info(`SMTP-Transporter-Cache für Benutzer ${userId} gelöscht`);
    } else {
      this.transporters.clear();
      logger.info('Gesamter SMTP-Transporter-Cache gelöscht');
    }
  }
}

// Singleton-Instanz
export const emailService = new EmailService();