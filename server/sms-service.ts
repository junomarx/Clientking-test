import twilio from 'twilio';
import { SmsTemplate } from '@shared/schema';

/**
 * SMS-Service für das Senden von SMS-Nachrichten und die Verwaltung von SMS-Vorlagen
 */
export class SmsService {
  private client: any | null = null;
  private fromPhoneNumber: string | null = null;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    this.fromPhoneNumber = phoneNumber || null;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      console.warn('Twilio-Zugangsdaten fehlen - SMS-Versand wird simuliert');
    }
  }

  /**
   * Sendet eine SMS mit einer bestimmten Vorlage
   * @param template Die SMS-Vorlage
   * @param to Die Empfänger-Telefonnummer
   * @param variables Die Variablen, die in der Vorlage ersetzt werden sollen
   * @returns True, wenn die SMS erfolgreich gesendet wurde
   */
  async sendSmsWithTemplate(
    template: SmsTemplate,
    to: string,
    variables: Record<string, string>
  ): Promise<boolean> {
    try {
      let body = template.body;

      // Ersetze alle Variablen im SMS-Text
      if (variables && template.variables) {
        const vars = Array.isArray(template.variables) 
          ? template.variables 
          : [];
        
        for (const variable of vars) {
          const varName = variable.trim();
          if (varName && variables[varName]) {
            body = body.replace(new RegExp(`{{${varName}}}`, 'g'), variables[varName]);
          }
        }
      }

      // Wenn Twilio nicht konfiguriert ist, simuliere den SMS-Versand
      if (!this.client || !this.fromPhoneNumber) {
        console.log('SMS würde gesendet werden an:', to);
        console.log('SMS-Inhalt:', body);
        return true;
      }

      // Sende die SMS über Twilio
      const message = await this.client.messages.create({
        body,
        from: this.fromPhoneNumber,
        to
      });

      console.log('SMS erfolgreich gesendet, SID:', message.sid);
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der SMS:', error);
      return false;
    }
  }
}

export const smsService = new SmsService();