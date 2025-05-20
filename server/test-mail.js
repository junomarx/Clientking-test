/**
 * Test-Skript zum direkten Versenden einer E-Mail mit nodemailer
 */
import nodemailer from 'nodemailer';

async function main() {
  try {
    console.log('Direkter E-Mail-Test für murat (macandphonedoc.at)');
    
    // Konfiguration für den SMTP-Transport
    const transportConfig = {
      host: 'smtp.world4you.com',
      port: 587,
      secure: false,
      auth: {
        user: 'office@macandphonedoc.at',
        pass: 'Lesve6m82' // Passwort aus den Datenbankeinstellungen
      },
      connectionTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    };
    
    console.log('Erstelle SMTP-Transporter mit folgenden Einstellungen:');
    console.log({
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure,
      user: transportConfig.auth.user
    });
    
    // Erstelle einen Transporter
    const transporter = nodemailer.createTransport(transportConfig);
    
    // Überprüfe die Verbindung
    console.log('Prüfe SMTP-Verbindung...');
    const isConnected = await transporter.verify();
    console.log('SMTP-Verbindung erfolgreich:', isConnected);
    
    // Sende eine Test-E-Mail
    const mailOptions = {
      from: '"murat Shop Test" <office@macandphonedoc.at>',
      to: 'bugi3000@gmail.com',
      subject: 'Test-E-Mail mit erzwungener Absenderadresse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #10b981;">Test-E-Mail mit erzwungener Absenderadresse</h2>
          </div>
          
          <p>Dies ist eine Test-E-Mail, die direkt mit Nodemailer gesendet wurde.</p>
          <p>Die E-Mail sollte mit der Absenderadresse office@macandphonedoc.at versendet werden.</p>
          <p>Zeitstempel: ${new Date().toISOString()}</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Dies ist eine automatisch generierte Test-E-Mail.</p>
          </div>
        </div>
      `,
      text: 'Dies ist eine Test-E-Mail, die direkt mit Nodemailer gesendet wurde.'
    };
    
    console.log('Sende Test-E-Mail...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Test-E-Mail erfolgreich gesendet:', info.messageId);
    console.log('Vorschau-URL:', nodemailer.getTestMessageUrl(info));
    
    return 'E-Mail erfolgreich gesendet!';
  } catch (error) {
    console.error('Fehler beim Senden der Test-E-Mail:', error);
    return `Fehler: ${error.message}`;
  }
}

main()
  .then(console.log)
  .catch(console.error);

// Node.js verlangt diese Funktion für die getTestMessageUrl
if (!nodemailer.getTestMessageUrl) {
  nodemailer.getTestMessageUrl = () => '';
}