import * as SibApiV3Sdk from '@getbrevo/brevo';
import { SmsTemplate } from '@shared/schema';

/**
 * SMS-Service für das Senden von SMS-Nachrichten und die Verwaltung von SMS-Vorlagen
 * Verwendet Brevo (ehemals Sendinblue) als SMS-Provider
 */
export class SmsService {
  private apiInstance: SibApiV3Sdk.TransactionalSMSApi | null = null;
  private senderName: string = 'Handyshop';

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    
    if (apiKey) {
      const apiConfig = new SibApiV3Sdk.Configuration();
      apiConfig.apiKey = {
        'api-key': apiKey
      };
      this.apiInstance = new SibApiV3Sdk.TransactionalSMSApi(apiConfig);
    } else {
      console.warn('Brevo-API-Schlüssel fehlt - SMS-Versand wird simuliert');
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

      // Wenn Brevo nicht konfiguriert ist, simuliere den SMS-Versand
      if (!this.apiInstance) {
        console.log('SMS würde gesendet werden an:', to);
        console.log('SMS-Inhalt:', body);
        return true;
      }

      // Sende die SMS über Brevo
      const smsRequest = new SibApiV3Sdk.SendTransacSms();
      smsRequest.sender = this.senderName;
      smsRequest.recipient = to;
      smsRequest.content = body;
      
      const response = await this.apiInstance.sendTransacSms(smsRequest);
      console.log('SMS erfolgreich gesendet, Antwort:', response);
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der SMS:', error);
      return false;
    }
  }
}

export const smsService = new SmsService();