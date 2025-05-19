import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { storage } from './storage';

/**
 * Handler für die SMTP-Test API für normale Benutzer
 * Führt einen SMTP-Test durch und speichert bei Erfolg die Einstellungen automatisch
 */
export async function handleUserSmtpTest(req: Request, res: Response) {
  try {
    const { host, port, user, password, sender, recipient } = req.body;
    
    console.log('SMTP-Test von normalem Benutzer mit folgenden Parametern:');
    console.log(`Host: ${host}, Port: ${port}, Benutzer: ${user}`);
    
    if (!host || !port || !user || !password || !sender || !recipient) {
      return res.status(400).json({
        success: false,
        message: 'Alle SMTP-Parameter müssen angegeben werden'
      });
    }
    
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
    
    try {
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
      
      // Erfolgreiche SMTP-Einstellungen automatisch in den Geschäftseinstellungen speichern
      try {
        // Benutzer-ID aus der Anfrage holen
        const userId = req.user?.id;
        if (!userId) {
          throw new Error('Benutzer-ID nicht gefunden');
        }
        
        // Aktuelle Geschäftseinstellungen des Benutzers holen
        const userSettings = await storage.getBusinessSettings(userId);
        if (!userSettings) {
          throw new Error('Geschäftseinstellungen nicht gefunden');
        }
        
        // SMTP-Einstellungen aktualisieren
        await storage.updateBusinessSettings({
          ...userSettings,
          smtpHost: host,
          smtpPort: port.toString(),
          smtpUser: user,
          smtpPassword: password,
          smtpSenderName: sender
        }, userId);
        
        console.log(`SMTP-Einstellungen für Benutzer ${userId} erfolgreich aktualisiert.`);
        
        return res.json({
          success: true,
          message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet. Die SMTP-Einstellungen wurden automatisch in Ihren Geschäftseinstellungen gespeichert.',
          details: {
            messageId: info.messageId,
            response: info.response,
            settingsSaved: true
          }
        });
      } catch (saveError) {
        console.error('Fehler beim Speichern der SMTP-Einstellungen:', saveError);
        
        // Test war erfolgreich, aber Speichern der Einstellungen fehlgeschlagen
        return res.json({
          success: true,
          message: 'SMTP-Test erfolgreich! E-Mail wurde an ' + recipient + ' gesendet, aber die Einstellungen konnten nicht automatisch gespeichert werden: ' + (saveError as Error).message,
          details: {
            messageId: info.messageId,
            response: info.response,
            settingsSaved: false
          }
        });
      }
    } catch (error) {
      console.error('SMTP-Test fehlgeschlagen:', error);
      
      return res.status(500).json({
        success: false,
        message: 'SMTP-Test fehlgeschlagen: ' + (error as Error).message
      });
    }
  } catch (error) {
    console.error('Fehler bei SMTP-Test:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Interner Serverfehler bei SMTP-Test'
    });
  }
}