import { Request, Response } from "express";
import { Express } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate } from "@shared/schema";
import { eq, desc, isNull, or } from "drizzle-orm";
import nodemailer from "nodemailer";
import { emailService } from "./email-service";

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
