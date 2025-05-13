import { db } from './db';
import { emailTemplates, type EmailTemplate, type InsertEmailTemplate, businessSettings, emailHistory, type InsertEmailHistory } from '@shared/schema';
import { eq, desc, isNull, or, and, SQL, count } from 'drizzle-orm';
import { storage } from './storage';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * E-Mail-Service für die Verwaltung von E-Mail-Vorlagen und den Versand von E-Mails über SMTP
 */
export class EmailService {
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialisiere den globalen SMTP-Transporter mit den Umgebungsvariablen
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;
      
      // Prüfe, ob alle erforderlichen SMTP-Einstellungen vorhanden sind
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        console.warn('Eine oder mehrere globale SMTP-Einstellungen fehlen');
      } else {
        // Verwende die globalen SMTP-Einstellungen als Fallback
        this.smtpTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true für 465, false für andere Ports
          auth: {
            user: smtpUser,
            pass: smtpPassword
          }
        });
        
        console.log(`Globaler SMTP-Transporter für ${smtpHost} wurde initialisiert`);
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren des globalen SMTP-Transporters:', error);
      this.smtpTransporter = null;
    }
  }
  
  /**
   * Aktualisiert die SMTP-Einstellungen für den globalen Transporter
   */
  async updateSmtpTransporter(config: SMTPTransport.Options): Promise<boolean> {
    try {
      // Bestehenden Transporter schließen, wenn vorhanden
      if (this.smtpTransporter) {
        this.smtpTransporter.close();
      }
      
      // Neuen Transporter erstellen
      this.smtpTransporter = nodemailer.createTransport(config);
      
      // Verbindung testen
      await this.smtpTransporter.verify();
      
      console.log(`Globaler SMTP-Transporter für ${config.host} wurde aktualisiert`);
      return true;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des SMTP-Transporters:', error);
      return false;
    }
  }
  
  /**
   * Sendet eine Test-E-Mail mit den globalen SMTP-Einstellungen
   */
  async sendTestEmail(to: string): Promise<boolean> {
    try {
      if (!this.smtpTransporter) {
        throw new Error('Kein SMTP-Transporter konfiguriert');
      }
      
      const senderName = process.env.SMTP_SENDER_NAME || 'Handyshop Verwaltung';
      const senderEmail = process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@example.com';
      
      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: to,
        subject: 'Test-E-Mail von Handyshop Verwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5;">Test-E-Mail erfolgreich!</h2>
            </div>
            
            <p>Diese E-Mail bestätigt, dass Ihre SMTP-Einstellungen korrekt konfiguriert sind.</p>
            
            <p>Ihre Handyshop Verwaltung ist nun bereit, E-Mails zu versenden.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht darauf.</p>
            </div>
          </div>
        `,
        text: 'Test-E-Mail erfolgreich! Diese E-Mail bestätigt, dass Ihre SMTP-Einstellungen korrekt konfiguriert sind. Ihre Handyshop Verwaltung ist nun bereit, E-Mails zu versenden.'
      };
      
      const info = await this.smtpTransporter.sendMail(mailOptions);
      console.log('Test-E-Mail erfolgreich gesendet:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Test-E-Mail:', error);
      return false;
    }
  }

  // Die grundlegenden CRUD-Funktionen für E-Mail-Vorlagen
  async getAllEmailTemplates(userId?: number): Promise<EmailTemplate[]> {
    if (!userId) {
      // Ohne userId Filterung geben wir nur globale Vorlagen zurück
      return await db.select().from(emailTemplates)
        .where(eq(emailTemplates.userId, null as any))
        .orderBy(desc(emailTemplates.createdAt));
    }
    
    try {
      // Benutzer abrufen, um Shop-ID zu erhalten
      const user = await storage.getUser(userId);
      if (!user) {
        return []; // Benutzer nicht gefunden
      }
      
      // DSGVO-konform: Auch Admins sehen nur Vorlagen ihres eigenen Shops plus globale Vorlagen
      // Die isAdmin-Berechtigung wird hier entfernt, da Admins nicht übergreifend auf Daten anderer Shops zugreifen dürfen
      
      // Für normale Benutzer:
      // 1. Zeige alle Vorlagen, die zur Shop-ID des Benutzers gehören
      // 2. Zeige alle globalen Vorlagen (userId ist NULL)
      const shopId = user.shopId || 1;
      
      return await db.select().from(emailTemplates)
        .where(
          or(
            eq(emailTemplates.shopId, shopId),
            eq(emailTemplates.userId, null as any)
          )
        )
        .orderBy(desc(emailTemplates.createdAt));
    } catch (error) {
      console.error("Fehler beim Abrufen der E-Mail-Vorlagen:", error);
      return [];
    }
  }

  async getEmailTemplate(id: number, userId?: number): Promise<EmailTemplate | undefined> {
    if (!userId) {
      // Wenn keine Benutzer-ID angegeben ist, geben wir nur globale Vorlagen zurück
      const [template] = await db.select().from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.id, id),
            eq(emailTemplates.userId, null as any)
          )
        );
      return template;
    }
    
    try {
      // Benutzer abrufen, um Shop-ID zu erhalten
      const user = await storage.getUser(userId);
      if (!user) {
        return undefined; // Benutzer nicht gefunden
      }
      
      // DSGVO-konform: Alle Benutzer (inkl. Admins) dürfen nur Vorlagen ihres eigenen Shops sehen
      // plus globale Vorlagen (userId=null)
      const shopId = user.shopId || 1;
      
      const [template] = await db.select().from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.id, id),
            or(
              eq(emailTemplates.shopId, shopId),
              eq(emailTemplates.userId, null as any)
            )
          )
        );
      return template;
    } catch (error) {
      console.error("Fehler beim Abrufen der E-Mail-Vorlage:", error);
      return undefined;
    }
  }

  async createEmailTemplate(template: InsertEmailTemplate, userId?: number): Promise<EmailTemplate> {
    const now = new Date();
    
    // Wenn eine userId angegeben ist, holen wir den Benutzer, um die Shop-ID zu setzen
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          // Shop-ID des Benutzers zur Vorlage hinzufügen
          const shopId = user.shopId || 1;
          
          const [newTemplate] = await db.insert(emailTemplates).values({
            ...template,
            userId, // Benutzer-ID setzen
            shopId, // Shop-ID setzen
            createdAt: now,
            updatedAt: now
          }).returning();
          
          return newTemplate;
        }
      } catch (error) {
        console.error("Fehler beim Abrufen des Benutzers beim Erstellen der E-Mail-Vorlage:", error);
      }
    }
    
    // Ohne Benutzer (oder wenn der Benutzer nicht gefunden wurde) erstellen wir eine globale Vorlage
    const [newTemplate] = await db.insert(emailTemplates).values({
      ...template,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return newTemplate;
  }

  async updateEmailTemplate(
    id: number, 
    template: Partial<InsertEmailTemplate>,
    userId?: number
  ): Promise<EmailTemplate | undefined> {
    if (!userId) {
      // Ohne Benutzer-ID können nur globale Vorlagen aktualisiert werden
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(emailTemplates.id, id),
            eq(emailTemplates.userId, null as any)
          )
        )
        .returning();
      return updatedTemplate;
    }
    
    try {
      // Benutzer abrufen, um Shop-ID zu erhalten
      const user = await storage.getUser(userId);
      if (!user) return undefined;
      
      // SQL-Bedingung basierend auf Benutzerrechten erstellen
      let whereCondition: SQL<unknown>;
      
      // DSGVO-konform: Admins und normale Benutzer dürfen nur Vorlagen ihres eigenen Shops aktualisieren
      const shopId = user.shopId || 1;
      whereCondition = and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.shopId, shopId)
      ) as SQL<unknown>;
      
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set({
          ...template,
          updatedAt: new Date()
        })
        .where(whereCondition)
        .returning();
      
      return updatedTemplate;
    } catch (error) {
      console.error("Fehler beim Aktualisieren der E-Mail-Vorlage:", error);
      return undefined;
    }
  }

  async deleteEmailTemplate(id: number, userId?: number): Promise<boolean> {
    try {
      // Zuerst prüfen, ob die Vorlage in der E-Mail-Historie verwendet wird
      const emailHistoryEntries = await db.select()
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, id));
      
      const usageCount = emailHistoryEntries.length;
      
      if (usageCount > 0) {
        console.log(`E-Mail-Vorlage mit ID ${id} wird in ${usageCount} E-Mail-Historie-Einträgen verwendet und kann nicht gelöscht werden.`);
        
        // Duplizierte Vorlagen finden und Benutzer informieren
        let templateQuery = db.select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, id));
        
        const templateToDelete = await templateQuery.execute();
        
        if (templateToDelete.length === 0) {
          return false;
        }
        
        // Prüfen, ob es Duplikate gibt (Vorlagen mit gleichem Namen für den gleichen Benutzer)
        const template = templateToDelete[0];
        
        // Es handelt sich um eine Vorlage, die in der Historie verwendet wird
        // Daher archivieren wir sie, anstatt sie zu löschen
        await db.update(emailTemplates)
          .set({
            name: `[ARCHIVIERT] ${template.name}`,
            updatedAt: new Date()
          })
          .where(eq(emailTemplates.id, id));
        
        console.log(`E-Mail-Vorlage '${template.name}' wurde archiviert, da sie in der E-Mail-Historie verwendet wird.`);
        return true;
      }
      
      if (!userId) {
        // Ohne Benutzer-ID können nur globale Vorlagen gelöscht werden
        await db.delete(emailTemplates).where(
          and(
            eq(emailTemplates.id, id),
            eq(emailTemplates.userId, null as any)
          )
        );
        return true;
      }
      
      // Benutzer abrufen, um Shop-ID zu erhalten
      const user = await storage.getUser(userId);
      if (!user) return false;
      
      // SQL-Bedingung basierend auf Benutzerrechten erstellen
      let whereCondition: SQL<unknown>;
      
      // DSGVO-konform: Admins und normale Benutzer dürfen nur Vorlagen ihres eigenen Shops löschen
      const shopId = user.shopId || 1;
      whereCondition = and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.shopId, shopId)
      ) as SQL<unknown>;
      
      await db.delete(emailTemplates).where(whereCondition);
      return true;
    } catch (error) {
      console.error("Fehler beim Löschen der E-Mail-Vorlage:", error);
      return false;
    }
  }

  /**
   * Verwaltet die redundanten E-Mail-Vorlagen (entfernt "Reparatur abgeschlossen" wenn "Reparatur abholbereit" existiert)
   * Diese Methode verhindert doppelte Vorlagen für den gleichen Zweck
   */
  async cleanupRedundantTemplates(userId?: number | null): Promise<void> {
    try {
      console.log("Start Bereinigung redundanter E-Mail-Vorlagen...");
      
      // Explizit die bekannte redundante Vorlage für Benutzer 3 archivieren
      await this.archiveCompletedTemplateForUser(3);
      
      console.log("Bereinigung redundanter E-Mail-Vorlagen abgeschlossen.");
    } catch (error) {
      console.error("Fehler beim Bereinigen redundanter E-Mail-Vorlagen:", error);
    }
  }
  
  /**
   * Archiviert die "Reparatur abgeschlossen" Vorlage für einen bestimmten Benutzer
   */
  private async archiveCompletedTemplateForUser(userId: number): Promise<void> {
    try {
      // Die "Reparatur abgeschlossen" Vorlage für den Benutzer finden
      const templates = await db.select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.userId, userId),
            eq(emailTemplates.name, "Reparatur abgeschlossen")
          )
        );
      
      // Wenn die Vorlage gefunden wurde, archivieren
      if (templates.length > 0) {
        for (const template of templates) {
          await db.update(emailTemplates)
            .set({
              name: `[ARCHIVIERT] Reparatur abgeschlossen`,
              updatedAt: new Date()
            })
            .where(eq(emailTemplates.id, template.id));
          
          console.log(`E-Mail-Vorlage "Reparatur abgeschlossen" (ID: ${template.id}) für Benutzer ${userId} archiviert.`);
        }
      }
    } catch (error) {
      console.error(`Fehler beim Archivieren der "Reparatur abgeschlossen" Vorlage für Benutzer ${userId}:`, error);
    }
  }

  /**
   * Spezielle Methode zur Bereinigung der "Reparatur abgeschlossen" Vorlage für einen Benutzer
   * Diese Methode behandelt spezifisch die Redundanz zwischen "Reparatur abgeschlossen" und "Reparatur abholbereit"
   */
  private async cleanupCompletedTemplateForUser(userId: number | null): Promise<void> {
    try {
      // Benutzerbezeichnung für Log-Nachrichten
      const userTag = userId === null ? "globale Vorlagen" : `Benutzer ${userId}`;
      console.log(`Prüfe redundante Vorlagen für ${userTag}...`);
      
      // Suche nach der "Reparatur abgeschlossen" Vorlage
      let completedTemplateQuery = db.select().from(emailTemplates);
      
      if (userId === null) {
        completedTemplateQuery = completedTemplateQuery.where(
          and(
            eq(emailTemplates.name, "Reparatur abgeschlossen"),
            isNull(emailTemplates.userId)
          )
        );
      } else {
        completedTemplateQuery = completedTemplateQuery.where(
          and(
            eq(emailTemplates.name, "Reparatur abgeschlossen"),
            eq(emailTemplates.userId, userId)
          )
        );
      }
      
      const completedTemplates = await completedTemplateQuery;
      
      // Wenn keine "Reparatur abgeschlossen" Vorlage gefunden wurde, nichts tun
      if (completedTemplates.length === 0) {
        console.log(`Keine "Reparatur abgeschlossen" Vorlage für ${userTag} gefunden.`);
        return;
      }
      
      // Suche nach der "Reparatur abholbereit" Vorlage
      let readyTemplateQuery = db.select().from(emailTemplates);
      
      if (userId === null) {
        readyTemplateQuery = readyTemplateQuery.where(
          and(
            eq(emailTemplates.name, "Reparatur abholbereit"),
            isNull(emailTemplates.userId)
          )
        );
      } else {
        readyTemplateQuery = readyTemplateQuery.where(
          and(
            eq(emailTemplates.name, "Reparatur abholbereit"),
            eq(emailTemplates.userId, userId)
          )
        );
      }
      
      const readyTemplates = await readyTemplateQuery;
      
      // Wenn keine "Reparatur abholbereit" Vorlage gefunden wurde oder mehr als eine "Reparatur abgeschlossen" Vorlage existiert,
      // entsprechende Warnung ausgeben
      if (readyTemplates.length === 0) {
        console.log(`Keine "Reparatur abholbereit" Vorlage für ${userTag} gefunden.`);
        return;
      }
      
      // Wenn sowohl "Reparatur abgeschlossen" als auch "Reparatur abholbereit" existieren
      if (completedTemplates.length > 0 && readyTemplates.length > 0) {
        for (const completedTemplate of completedTemplates) {
          console.log(`Redundante E-Mail-Vorlage "Reparatur abgeschlossen" (ID: ${completedTemplate.id}) für ${userTag} gefunden.`);
          
          try {
            // Archiviere die Vorlage, da ein Löschen zu Fehlern führen kann
            await db.update(emailTemplates)
              .set({
                name: `[ARCHIVIERT] Reparatur abgeschlossen`,
                updatedAt: new Date()
              })
              .where(eq(emailTemplates.id, completedTemplate.id));
            
            console.log(`E-Mail-Vorlage "Reparatur abgeschlossen" (ID: ${completedTemplate.id}) für ${userTag} archiviert.`);
          } catch (error) {
            console.error(`Fehler beim Archivieren der redundanten Vorlage ${completedTemplate.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Fehler bei der Bereinigung der "Reparatur abgeschlossen" Vorlage:`, error);
    }
  }

  // E-Mail-Versand mit Vorlagenverarbeitung
  async sendEmailWithTemplate(
    templateId: number, 
    to: string, 
    variables: Record<string, string>
  ): Promise<boolean> {
    try {
      // Benutzer-ID aus den Variablen extrahieren (wenn vorhanden)
      const userId = variables.userId ? parseInt(variables.userId) : 0;
      
      // Lade die Vorlage unter Berücksichtigung der Shop-ID des Benutzers
      const template = await this.getEmailTemplate(templateId, userId);
      if (!template) {
        throw new Error("E-Mail-Vorlage nicht gefunden");
      }
      
      // Variablen in Betreff und Text ersetzen
      let subject = template.subject;
      let body = template.body;
      
      // Geschäftsinformationen für das Absenderfeld des aktuellen Benutzers laden
      const [businessSetting] = await db.select().from(businessSettings)
        .where(eq(businessSettings.userId, userId));
      
      if (!businessSetting) {
        console.error(`Keine Geschäftseinstellungen für Benutzer ${userId} gefunden`);
        return false;
      }
      
      // Füge das aktuelle Jahr als Variable hinzu
      variables["aktuellesJahr"] = new Date().getFullYear().toString();
      
      // Füge alle relevanten Geschäftsdaten als Variablen hinzu
      // Geschäftsname als Variable
      if (!variables["geschaeftsname"] && businessSetting.businessName) {
        variables["geschaeftsname"] = businessSetting.businessName;
      }
      
      // Adresse als Variable
      if (!variables["adresse"] && businessSetting.streetAddress) {
        variables["adresse"] = `${businessSetting.streetAddress}, ${businessSetting.zipCode} ${businessSetting.city}`;
      }
      
      // Telefonnummer als Variable
      if (!variables["telefon"] && businessSetting.phone) {
        variables["telefon"] = businessSetting.phone;
      }
      
      // E-Mail als Variable
      if (!variables["email"] && businessSetting.email) {
        variables["email"] = businessSetting.email;
      }
      
      // Website als Variable
      if (!variables["website"] && businessSetting.website) {
        variables["website"] = businessSetting.website;
      }
      
      // Bewertungslink als Variable
      if (!variables["bewertungslink"]) {
        if (businessSetting.reviewLink) {
          // Stelle sicher, dass der Bewertungslink vollständig ist (mit http/https)
          let reviewLink = businessSetting.reviewLink;
          if (reviewLink && !reviewLink.startsWith('http')) {
            reviewLink = 'https://' + reviewLink;
          }
          console.log(`Verwende Bewertungslink: ${reviewLink}`);
          variables["bewertungslink"] = reviewLink;
        } else {
          // Fallback
          variables["bewertungslink"] = "https://g.page/r/CVkTCKBnO_NqEBM/review";
          console.log("Verwende Fallback-Bewertungslink, da kein Link in den Einstellungen gefunden wurde.");
        }
      }

      // Debug-Ausgabe der Variablen vor der Ersetzung
      console.log("Variablen für die E-Mail:", JSON.stringify(variables, null, 2));
      
      // Ersetze Variablen im Format {{variableName}}
      Object.entries(variables).forEach(([key, value]) => {
        if (value !== undefined && value !== null) { // Überprüfe, ob der Wert existiert
          const placeholder = `{{${key}}}`;
          
          // Besondere Behandlung für den Bewertungslink
          if (key === 'bewertungslink') {
            console.log(`Ersetze Bewertungslink-Platzhalter: "${placeholder}" mit Wert: "${value}"`);
            
            // Stelle sicher, dass URLs sicher ersetzt werden
            let safeValue = value;
            if (!safeValue.startsWith('http')) {
              safeValue = 'https://' + safeValue;
            }
            
            subject = subject.replace(new RegExp(placeholder, 'g'), safeValue);
            body = body.replace(new RegExp(placeholder, 'g'), safeValue);
          } else {
            // Normale Variablenersetzung für alle anderen Variablen
            subject = subject.replace(new RegExp(placeholder, 'g'), value);
            body = body.replace(new RegExp(placeholder, 'g'), value);
          }
        } else {
          console.log(`Warnung: Variable ${key} hat keinen Wert und wird nicht ersetzt.`);
        }
      });
      
      const senderEmail = businessSetting.email || 'no-reply@example.com';
      const senderName = businessSetting.smtpSenderName || businessSetting.businessName || 'Handyshop Verwaltung';
      
      // Zusätzliche Debug-Informationen
      console.log(`E-Mail-Versand für Benutzer ${userId}: ${businessSetting.businessName}`);
      console.log(`SMTP-Einstellungen: ${businessSetting.smtpHost}:${businessSetting.smtpPort}`);
      console.log(`Absender: "${senderName}" <${businessSetting.smtpUser}>`);
      console.log(`E-Mail wird gesendet an: ${to}, Betreff: ${subject}`);
      
      // Benutzer-spezifischen SMTP-Transporter erstellen
      if (!businessSetting.smtpHost || !businessSetting.smtpPort || !businessSetting.smtpUser || !businessSetting.smtpPassword) {
        console.error(`Fehlende SMTP-Einstellungen für Benutzer ${userId}`);
        return false;
      }
      
      // SMTP-Transporter für diesen Benutzer erstellen
      const smtpConfig: SMTPTransport.Options = {
        host: businessSetting.smtpHost,
        port: parseInt(businessSetting.smtpPort.toString()), // Stellen Sie sicher, dass es eine Zahl ist
        secure: parseInt(businessSetting.smtpPort.toString()) === 465, // true für 465, false für andere Ports
        auth: {
          user: businessSetting.smtpUser,
          pass: businessSetting.smtpPassword
        }
      };
      const userSmtpTransporter = nodemailer.createTransport(smtpConfig);
      
      try {
        console.log('Sende E-Mail über benutzerspezifischen SMTP-Server...');
        
        const mailOptions = {
          from: `"${senderName}" <${businessSetting.smtpUser}>`, // Benutzer-SMTP als Absender
          to: to,
          subject: subject,
          html: body,
          text: body.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
        };
        
        const info = await userSmtpTransporter.sendMail(mailOptions);
        console.log('E-Mail erfolgreich über benutzerspezifischen SMTP-Server gesendet:', info.messageId);
        
        // Reparatur-ID aus den Variablen extrahieren, wenn vorhanden
        const repairId = variables.repairId ? parseInt(variables.repairId) : undefined;
        console.log(`Extrahierte Reparatur-ID aus Variablen: ${variables.repairId} -> ${repairId}`);
        
        // E-Mail-History-Eintrag erstellen, wenn eine Reparatur-ID vorhanden ist
        if (repairId) {
          try {
            const historyEntry: InsertEmailHistory = {
              repairId,
              emailTemplateId: templateId,
              subject,
              recipient: to,
              status: 'success',
              userId
            };
            
            console.log('Erstelle E-Mail-Verlaufseintrag:', historyEntry);
            await storage.createEmailHistoryEntry(historyEntry);
            console.log(`E-Mail-History-Eintrag für Reparatur ${repairId} erstellt`);
          } catch (historyError) {
            console.error('Fehler beim Erstellen des E-Mail-History-Eintrags:', historyError);
            // Wir geben trotzdem true zurück, da die E-Mail erfolgreich gesendet wurde
          }
        }
        
        return true;
      } catch (smtpError) {
        console.error('Fehler beim Senden der E-Mail über benutzerspezifischen SMTP-Server:', smtpError);
        
        // Bei Fehler trotzdem einen History-Eintrag erstellen
        const repairId = variables.repairId ? parseInt(variables.repairId) : undefined;
        console.log(`Extrahierte Reparatur-ID bei Fehler: ${variables.repairId} -> ${repairId}`);
        if (repairId) {
          try {
            const historyEntry: InsertEmailHistory = {
              repairId,
              emailTemplateId: templateId,
              subject,
              recipient: to,
              status: 'failed',
              userId
            };
            
            console.log('Erstelle E-Mail-Verlaufseintrag für fehlgeschlagene E-Mail:', historyEntry);
            await storage.createEmailHistoryEntry(historyEntry);
            console.log(`E-Mail-History-Eintrag für fehlgeschlagene E-Mail an Reparatur ${repairId} erstellt`);
          } catch (historyError) {
            console.error('Fehler beim Erstellen des E-Mail-History-Eintrags für fehlgeschlagene E-Mail:', historyError);
          }
        }
        
        // Bei Fehlern mit dem benutzerspezifischen Server verwenden wir den globalen SMTP-Server als Fallback
        if (this.smtpTransporter) {
          try {
            console.log('Versuche Fallback über globalen SMTP-Server...');
            
            const mailOptions = {
              from: `"${senderName}" <${process.env.SMTP_USER}>`, // Globalen SMTP-Login als Absender
              to: to,
              subject: subject,
              html: body,
              text: body.replace(/<[^>]*>/g, '') // Strip HTML für Plaintext
            };
            
            const info = await this.smtpTransporter.sendMail(mailOptions);
            console.log('E-Mail erfolgreich über globalen SMTP-Server gesendet:', info.messageId);
            
            // Reparatur-ID aus den Variablen extrahieren, wenn vorhanden
            const repairId = variables.repairId ? parseInt(variables.repairId) : undefined;
            console.log(`Extrahierte Reparatur-ID bei Fallback: ${variables.repairId} -> ${repairId}`);
            
            // E-Mail-History-Eintrag erstellen, wenn eine Reparatur-ID vorhanden ist
            if (repairId) {
              try {
                const historyEntry: InsertEmailHistory = {
                  repairId,
                  emailTemplateId: templateId,
                  subject,
                  recipient: to,
                  status: 'success',
                  userId
                };
                
                console.log('Erstelle E-Mail-Verlaufseintrag (Fallback):', historyEntry);
                await storage.createEmailHistoryEntry(historyEntry);
                console.log(`E-Mail-History-Eintrag für Reparatur ${repairId} erstellt (Fallback-Versand)`);
              } catch (historyError) {
                console.error('Fehler beim Erstellen des E-Mail-History-Eintrags (Fallback):', historyError);
                // Wir geben trotzdem true zurück, da die E-Mail erfolgreich gesendet wurde
              }
            }
            
            return true;
          } catch (globalSmtpError) {
            console.error('Fehler beim Senden der E-Mail über globalen SMTP-Server:', globalSmtpError);
            return false;
          }
        } else {
          console.error('Kein globaler SMTP-Server als Fallback verfügbar');
          return false;
        }
      }
    } catch (error) {
      console.error("Error sending email with template:", error);
      return false;
    }
  }
}

// Erstelle eine Singleton-Instanz des E-Mail-Services
export const emailService = new EmailService();
