// Dieses Modul dient als kompatibilitätsschicht und leitet alle Anfragen an den E-Mail-Service weiter

import { emailService } from './email-service';
import type { EmailTemplate, InsertEmailTemplate } from '@shared/schema';

// Re-export der grundlegenden CRUD-Funktionen für E-Mail-Vorlagen
export async function getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
  return await emailService.getAllEmailTemplates(userId);
}

export async function getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined> {
  return await emailService.getEmailTemplate(id, userId);
}

export async function createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate> {
  return await emailService.createEmailTemplate(template, userId);
}

export async function updateEmailTemplate(
  id: number, 
  template: Partial<InsertEmailTemplate>,
  userId?: number
): Promise<EmailTemplate | undefined> {
  return await emailService.updateEmailTemplate(id, template, userId);
}

export async function deleteEmailTemplate(id: number, userId?: number): Promise<boolean> {
  return await emailService.deleteEmailTemplate(id, userId);
}

// E-Mail-Versand mit Vorlagenverarbeitung
export async function sendEmailWithTemplate(
  templateId: number, 
  to: string, 
  variables: Record<string, string>
): Promise<boolean> {
  return await emailService.sendEmailWithTemplate(templateId, to, variables);
}