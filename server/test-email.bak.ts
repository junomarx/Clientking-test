import nodemailer from 'nodemailer';

async function sendTestEmail() {
  const smtpHost = 'smtp-relay.brevo.com';
  const smtpPort = 587;
  const smtpLogin = '8b7dba001@smtp-brevo.com';
  const apiKey = process.env.BREVO_API_KEY || '';
  const toEmail = 'bugi3000@gmail.com';
  
  console.log('Sende Test-E-Mail an', toEmail);
  console.log('SMTP-Konfiguration:', {
    host: smtpHost,
    port: smtpPort,
    user: smtpLogin,
    // Zeige nicht den vollständigen API-Key aus Sicherheitsgründen
    apiKey: apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'nicht gesetzt'
  });

  try {
    // Erstelle einen SMTP-Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true für 465, false für andere Ports
      auth: {
        user: smtpLogin,
        pass: apiKey
      }
    });

    // Sende eine Test-E-Mail
    const info = await transporter.sendMail({
      from: `"Handyshop Verwaltung" <${smtpLogin}>`,
      to: toEmail,
      subject: 'Test E-Mail von Handyshop Verwaltung',
      text: 'Dies ist eine Test-E-Mail aus der Handyshop Verwaltungsanwendung, um die SMTP-Konfiguration zu testen.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a6ee0; margin-bottom: 20px;">Test E-Mail</h2>
          <p>Dies ist eine Test-E-Mail aus der Handyshop Verwaltungsanwendung, um die SMTP-Konfiguration zu testen.</p>
          <p>Die E-Mail wurde erfolgreich über SMTP gesendet.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">
            Gesendet von Handyshop Verwaltung am ${new Date().toLocaleString('de-DE')}
          </p>
        </div>
      `
    });

    console.log('E-Mail erfolgreich gesendet!');
    console.log('Message ID:', info.messageId);
    console.log('Vorschau-URL:', nodemailer.getTestMessageUrl(info));
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error);
    return { success: false, error };
  }
}

// Führe die Funktion aus
sendTestEmail().then(result => {
  console.log('Ergebnis:', result);
  // Beende den Prozess nach dem Senden
  setTimeout(() => process.exit(0), 1000);
}).catch(error => {
  console.error('Unerwarteter Fehler:', error);
  process.exit(1);
});