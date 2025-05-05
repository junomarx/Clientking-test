import { Request, Response } from "express";
import { Express } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate } from "@shared/schema";
import { eq, desc, isNull, or } from "drizzle-orm";
import nodemailer from "nodemailer";
import { emailService } from "./email-service";

/**
 * Standard E-Mail-Vorlagen für die App
 */
const defaultAppEmailTemplates = [
  {
    name: "Registrierungsbestätigung",
    subject: "Ihre Registrierung bei Handyshop Verwaltung",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">Vielen Dank für Ihre Registrierung!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{benutzername}},</p>
        
        <p>vielen Dank für Ihre Registrierung bei der Handyshop Verwaltung.</p>
        
        <p>Ihre Registrierung wird aktuell von unserem Team überprüft. 
        Sobald die Überprüfung abgeschlossen ist, erhalten Sie eine Benachrichtigung per E-Mail.</p>
        
        <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["benutzername"]
  },
  {
    name: "Konto freigeschaltet",
    subject: "Ihr Konto wurde freigeschaltet",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">Ihr Konto wurde freigeschaltet!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{benutzername}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihr Konto bei der Handyshop Verwaltung nun freigeschaltet wurde.</p>
        
        <p>Sie können sich ab sofort über folgenden Link anmelden:</p>
        
        <p style="text-align: center;">
          <a href="{{loginLink}}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Jetzt anmelden
          </a>
        </p>
        
        <p>Wir wünschen Ihnen viel Erfolg mit der Handyshop Verwaltung!</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["benutzername", "loginLink"]
  },
  {
    name: "Passwort zurücksetzen",
    subject: "Anleitung zum Zurücksetzen Ihres Passworts",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">Passwort zurücksetzen</h2>
        </div>
        
        <p>Sehr geehrte(r) {{benutzername}},</p>
        
        <p>wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto erhalten. 
        Um Ihr Passwort zurückzusetzen, klicken Sie bitte auf den folgenden Link:</p>
        
        <p style="text-align: center;">
          <a href="{{resetLink}}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Passwort zurücksetzen
          </a>
        </p>
        
        <p>Der Link ist 24 Stunden gültig. Falls Sie keine Anfrage zum Zurücksetzen Ihres Passworts gestellt haben, können Sie diese E-Mail ignorieren.</p>
        
        <p>Mit freundlichen Grüßen,<br>Ihr Handyshop Verwaltungs-Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.</p>
        </div>
      </div>
    `,
    variables: ["benutzername", "resetLink"]
  }
];

/**
 * Erstellt die Standard-App-E-Mail-Vorlagen
 */
async function createDefaultAppEmailTemplates(): Promise<boolean> {
  try {
    // Prüfen, welche Vorlagen bereits existieren, um Duplikate zu vermeiden
    const existingTemplates = await db.select({ name: emailTemplates.name })
      .from(emailTemplates)
      .where(isNull(emailTemplates.userId));
    
    const existingTemplateNames = existingTemplates.map(t => t.name);
    
    // Nur Vorlagen hinzufügen, die noch nicht existieren
    const templatesToAdd = defaultAppEmailTemplates.filter(
      template => !existingTemplateNames.includes(template.name)
    );
    
    if (templatesToAdd.length === 0) {
      console.log('Alle Standard-App-E-Mail-Vorlagen existieren bereits');
      return true;
    }
    
    const now = new Date();
    
    // Vorlagen als globale Vorlagen (userId = null) hinzufügen
    for (const template of templatesToAdd) {
      await db.insert(emailTemplates).values({
        name: template.name,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
        userId: null,
        shopId: 0, // Global für alle Shops
        createdAt: now,
        updatedAt: now
      });
      
      console.log(`Standard-E-Mail-Vorlage '${template.name}' wurde erstellt`);
    }
    
    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen der Standard-App-E-Mail-Vorlagen:', error);
    return false;
  }
}

/**
 * SMTP-Konfiguration
 */
interface SMTPConfig {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpSenderName: string;
  smtpSenderEmail: string;
}

/**
 * Environment-Variable in die .env-Datei schreiben
 */
async function updateEnvironmentVariable(key: string, value: string): Promise<boolean> {
  try {
    // Als Superadmin-Aktion ist es legitim, diese Werte in die Umgebungsvariablen zu setzen
    // Für den Produktivbetrieb müsste eine Lösung mit einer externen Konfigurationsdatei implementiert werden
    process.env[key] = value;
    return true;
  } catch (error) {
    console.error(`Fehler beim Setzen der Umgebungsvariable ${key}:`, error);
    return false;
  }
}

/**
 * Registriert alle Routen für die E-Mail-Verwaltung im Superadmin-Bereich
 */
export function registerSuperadminEmailRoutes(app: Express) {
  /**
   * Standard-App-E-Mail-Vorlagen erstellen
   */
  app.post("/api/superadmin/email/create-default-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const success = await createDefaultAppEmailTemplates();
      
      if (success) {
        res.status(200).json({ 
          success: true, 
          message: "Standard-App-E-Mail-Vorlagen wurden erfolgreich erstellt" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Fehler beim Erstellen der Standard-App-E-Mail-Vorlagen" 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Fehler beim Erstellen der Standard-App-E-Mail-Vorlagen: ${error.message}` 
      });
    }
  });
  
  /**
   * SMTP-Konfiguration abrufen
   */
  app.get("/api/superadmin/email/config", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // SMTP-Konfiguration aus den Umgebungsvariablen auslesen
      const config: SMTPConfig = {
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: process.env.SMTP_PORT || "587",
        smtpUser: process.env.SMTP_USER || "",
        smtpPassword: process.env.SMTP_PASSWORD || "",
        smtpSenderName: process.env.SMTP_SENDER_NAME || "",
        smtpSenderEmail: process.env.SMTP_SENDER_EMAIL || ""
      };
      
      res.status(200).json(config);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Abrufen der SMTP-Konfiguration: ${error.message}` });
    }
  });
  
  /**
   * SMTP-Konfiguration speichern/aktualisieren
   */
  app.post("/api/superadmin/email/config", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const config: SMTPConfig = req.body;
      
      // Validiere die SMTP-Konfiguration
      if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPassword) {
        return res.status(400).json({
          message: "Ungültige SMTP-Konfiguration. Host, Port, Benutzername und Passwort sind erforderlich."
        });
      }
      
      // Speichere die Konfiguration in den Umgebungsvariablen
      await updateEnvironmentVariable("SMTP_HOST", config.smtpHost);
      await updateEnvironmentVariable("SMTP_PORT", config.smtpPort);
      await updateEnvironmentVariable("SMTP_USER", config.smtpUser);
      await updateEnvironmentVariable("SMTP_PASSWORD", config.smtpPassword);
      await updateEnvironmentVariable("SMTP_SENDER_NAME", config.smtpSenderName);
      await updateEnvironmentVariable("SMTP_SENDER_EMAIL", config.smtpSenderEmail);
      
      // Aktualisiere den SMTP-Transporter
      await emailService.updateSmtpTransporter({
        host: config.smtpHost,
        port: parseInt(config.smtpPort),
        secure: parseInt(config.smtpPort) === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      });
      
      res.status(200).json({ success: true, message: "SMTP-Konfiguration erfolgreich gespeichert" });
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Speichern der SMTP-Konfiguration: ${error.message}` });
    }
  });
  
  /**
   * Test-E-Mail senden
   */
  app.post("/api/superadmin/email/test", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-Mail-Adresse ist erforderlich" });
      }
      
      // Test-E-Mail senden
      const success = await emailService.sendTestEmail(email);
      
      if (success) {
        res.status(200).json({ success: true, message: "Test-E-Mail erfolgreich gesendet" });
      } else {
        res.status(500).json({ message: "Fehler beim Senden der Test-E-Mail" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Senden der Test-E-Mail: ${error.message}` });
    }
  });
  
  /**
   * Alle E-Mail-Vorlagen abrufen (systemweit)
   */
  app.get("/api/superadmin/email/templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const templates = await db
        .select()
        .from(emailTemplates)
        .orderBy(desc(emailTemplates.updatedAt));
      
      res.status(200).json(templates);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Abrufen der E-Mail-Vorlagen: ${error.message}` });
    }
  });
  
  /**
   * E-Mail-Vorlage erstellen
   */
  app.post("/api/superadmin/email/templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const templateData = req.body;
      
      // Validiere die Vorlagendaten
      if (!templateData.name || !templateData.subject || !templateData.body) {
        return res.status(400).json({
          message: "Ungültige Vorlagendaten. Name, Betreff und Inhalt sind erforderlich."
        });
      }
      
      // Erstelle die Vorlage für systemweite Nutzung (userId = null, shopId = 0)
      const newTemplate: InsertEmailTemplate = {
        name: templateData.name,
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || [],
        userId: null, // Globale Vorlage
        shopId: 0 // Systemweit verfügbar
      };
      
      const [createdTemplate] = await db
        .insert(emailTemplates)
        .values(newTemplate)
        .returning();
      
      res.status(201).json(createdTemplate);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Erstellen der E-Mail-Vorlage: ${error.message}` });
    }
  });
  
  /**
   * E-Mail-Vorlage aktualisieren
   */
  app.patch("/api/superadmin/email/templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = req.body;
      
      // Validiere die ID
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Vorlagen-ID" });
      }
      
      // Prüfe, ob die Vorlage existiert
      const [existingTemplate] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "E-Mail-Vorlage nicht gefunden" });
      }
      
      // Aktualisiere die Vorlage
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set({
          name: templateData.name || existingTemplate.name,
          subject: templateData.subject || existingTemplate.subject,
          body: templateData.body || existingTemplate.body,
          variables: templateData.variables || existingTemplate.variables,
          updatedAt: new Date()
        })
        .where(eq(emailTemplates.id, id))
        .returning();
      
      res.status(200).json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Aktualisieren der E-Mail-Vorlage: ${error.message}` });
    }
  });
  
  /**
   * E-Mail-Vorlage löschen
   */
  app.delete("/api/superadmin/email/templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validiere die ID
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Vorlagen-ID" });
      }
      
      // Prüfe, ob die Vorlage existiert
      const [existingTemplate] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "E-Mail-Vorlage nicht gefunden" });
      }
      
      // Lösche die Vorlage
      await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Löschen der E-Mail-Vorlage: ${error.message}` });
    }
  });
}
