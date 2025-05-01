// Dieses Modul dient als kompatibilitätsschicht und leitet alle Anfragen an den E-Mail-Service weiter
// Jetzt umgestellt auf den Brevo-basierten E-Mail-Service

import { emailService } from './brevo-email-service';
import type { EmailTemplate, InsertEmailTemplate } from '@shared/schema';

// Re-export der grundlegenden CRUD-Funktionen für E-Mail-Vorlagen
export async function getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
  return await emailService.getAllEmailTemplates(userId);
}

export async function getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
  return await emailService.getEmailTemplate(id);
}

export async function createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
  return await emailService.createEmailTemplate(template);
}

export async function updateEmailTemplate(
  id: number, 
  template: Partial<InsertEmailTemplate>
): Promise<EmailTemplate | undefined> {
  return await emailService.updateEmailTemplate(id, template);
}

export async function deleteEmailTemplate(id: number): Promise<boolean> {
  return await emailService.deleteEmailTemplate(id);
}

// E-Mail-Versand mit Vorlagenverarbeitung
export async function sendEmailWithTemplate(
  templateId: number, 
  to: string, 
  variables: Record<string, string>
): Promise<boolean> {
  return await emailService.sendEmailWithTemplate(templateId, to, variables);
}