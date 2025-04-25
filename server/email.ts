import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

// Die grundlegenden CRUD-Funktionen für E-Mail-Vorlagen
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
}

export async function getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
  const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
  return template;
}

export async function createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
  const now = new Date();
  const [newTemplate] = await db.insert(emailTemplates).values({
    ...template,
    createdAt: now,
    updatedAt: now
  }).returning();
  return newTemplate;
}

export async function updateEmailTemplate(
  id: number, 
  template: Partial<InsertEmailTemplate>
): Promise<EmailTemplate | undefined> {
  const [updatedTemplate] = await db
    .update(emailTemplates)
    .set({
      ...template,
      updatedAt: new Date()
    })
    .where(eq(emailTemplates.id, id))
    .returning();
  return updatedTemplate;
}

export async function deleteEmailTemplate(id: number): Promise<boolean> {
  try {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting email template:", error);
    return false;
  }
}

// E-Mail-Versand mit Vorlagenverarbeitung
export async function sendEmailWithTemplate(
  templateId: number, 
  to: string, 
  variables: Record<string, string>
): Promise<boolean> {
  try {
    const template = await getEmailTemplate(templateId);
    if (!template) {
      throw new Error("E-Mail-Vorlage nicht gefunden");
    }
    
    // Variablen in Betreff und Text ersetzen
    let subject = template.subject;
    let body = template.body;
    
    // Ersetze Variablen im Format {{variableName}}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });
    
    // In einer echten Implementierung würde hier SendGrid verwendet werden
    console.log(`Sending email to ${to}, subject: ${subject}, body: ${body}`);
    
    // Hier würde die tatsächliche SendGrid-Implementation erfolgen
    // Beispiel:
    // const msg = {
    //   to,
    //   from: 'your-verified-sender@example.com',
    //   subject,
    //   text: body,
    //   html: body,
    // };
    // await sgMail.send(msg);
    
    return true;
  } catch (error) {
    console.error("Error sending email with template:", error);
    return false;
  }
}