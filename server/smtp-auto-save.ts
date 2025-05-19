import nodemailer from 'nodemailer';
import { storage } from './storage';

/**
 * Testet SMTP-Einstellungen und speichert sie bei Erfolg automatisch in den Geschäftseinstellungen
 * 
 * @param host SMTP-Server-Host
 * @param port SMTP-Server-Port
 * @param user SMTP-Benutzername
 * @param password SMTP-Passwort
 * @param sender Absender-Name
 * @param recipient Empfänger-E-Mail für den Test
 * @param userId ID des Benutzers, dessen Einstellungen aktualisiert werden sollen
 * @returns Ein Objekt mit Erfolgs- oder Fehlermeldung
 */
export async function testAndSaveSmtpSettings(
  host: string, 
  port: string, 
  user: string, 
  password: string, 
  sender: string, 
  recipient: string, 
  userId: number
) {
  try {
    console.log('SMTP-Test mit automatischem Speichern für Benutzer', userId);
    console.log(`Host: ${host}, Port: ${port}, Benutzer: ${user}`);
    
    // Erstelle einen temporären Transporter zum Testen
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: {
        user,
        pass: password
      },
      debug: true,
      logger: true
    });
    
    // Explizit die Verbindung testen
    console.log('SMTP-Verbindungstest wird gestartet...');
    await transporter.verify();
    console.log('SMTP-Verbindungstest erfolgreich');
    
    // Test-E-Mail senden
    const info = await transporter.sendMail({
      from: `"${sender}" <${user}>`,
      to: recipient,
      subject: 'SMTP-Test von Handyshop Verwaltung',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">SMTP-Test erfolgreich!</h2>
          <p>Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist und E-Mails versendet werden können.</p>
          <p>Details der Konfiguration:</p>
          <ul>
            <li>Host: ${host}</li>
            <li>Port: ${port}</li>
            <li>Benutzer: ${user}</li>
            <li>Absender: ${sender}</li>
          </ul>
          <p>Gesendet: ${new Date().toLocaleString('de-DE')}</p>
        </div>
      `,
      text: `SMTP-Test erfolgreich! Diese E-Mail bestätigt, dass Ihre SMTP-Konfiguration korrekt ist und E-Mails versendet werden können.`
    });
    
    console.log('Test-E-Mail erfolgreich gesendet:', info.messageId);
    
    // Erfolgreiche SMTP-Einstellungen in den Geschäftseinstellungen speichern
    try {
      // Aktuelle Geschäftseinstellungen des Benutzers holen
      const userSettings = await storage.getBusinessSettings(userId);
      if (!userSettings) {
        throw new Error('Geschäftseinstellungen nicht gefunden');
      }
      
      // SMTP-Einstellungen aktualisieren
      await storage.updateBusinessSettings({
        ...userSettings,
        smtpHost: host,
        smtpPort: port,
        smtpUser: user,
        smtpPassword: password,
        smtpSenderName: sender
      }, userId);
      
      console.log(`SMTP-Einstellungen für Benutzer ${userId} erfolgreich aktualisiert.`);
      
      return {
        success: true,
        message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet. Die SMTP-Einstellungen wurden automatisch in Ihren Geschäftseinstellungen gespeichert.',
        details: {
          messageId: info.messageId,
          response: info.response,
          settingsSaved: true
        }
      };
    } catch (saveError) {
      console.error('Fehler beim Speichern der SMTP-Einstellungen:', saveError);
      
      // Test war erfolgreich, aber Speichern der Einstellungen fehlgeschlagen
      return {
        success: true,
        message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet, aber die Einstellungen konnten nicht automatisch gespeichert werden: ' + (saveError as Error).message,
        details: {
          messageId: info.messageId,
          response: info.response,
          settingsSaved: false
        }
      };
    }
  } catch (error) {
    console.error('SMTP-Test fehlgeschlagen:', error);
    
    return {
      success: false,
      message: 'SMTP-Test fehlgeschlagen: ' + (error as Error).message
    };
  }
}