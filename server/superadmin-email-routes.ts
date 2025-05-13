import { Request, Response } from "express";
import { Express } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { emailTemplates, emailHistory, type EmailTemplate, type InsertEmailTemplate } from "@shared/schema";
import { eq, desc, isNull, or, and, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { emailService } from "./email-service";

// E-Mail-Vorlagen Typen
type EmailTemplateType = 'app' | 'customer';

interface DefaultEmailTemplate {
  name: string;
  subject: string;
  body: string;
  variables: string[];
  type: EmailTemplateType;
}

/**
 * Standard E-Mail-Vorlagen für die App (Systemvorlagen)
 */
export const defaultAppEmailTemplates: DefaultEmailTemplate[] = [
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
    variables: ["benutzername"],
    type: 'app'
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
    variables: ["benutzername", "loginLink"],
    type: 'app'
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
    variables: ["benutzername", "resetLink"],
    type: 'app'
  }
];

/**
 * Standard E-Mail-Vorlagen für Kundenkommunikation
 */
export const defaultCustomerEmailTemplates: DefaultEmailTemplate[] = [
  {
    name: "Bewertungen anfragen",
    subject: "Feedback zu Ihrer Reparatur",
    body: `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bewerten Sie unsere Reparaturleistung</title>
    <style>
        body, p, h1, h2, h3, h4, h5, h6, table, td, div, span {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        
        body {
            background-color: #f7f7f7;
            color: #333333;
        }
        
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .header {
            padding: 25px 20px;
            text-align: center;
            background-color: #f0f7ff;
        }
        
        .content {
            padding: 30px;
        }
        
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999999;
            background-color: #f5f5f5;
        }
        
        h1 {
            color: #2c5aa0;
            font-size: 22px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        p {
            margin-bottom: 15px;
            font-size: 15px;
            text-align: left;
        }
        
        .button-container {
            margin: 25px 0;
            text-align: center;
        }
        
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2c5aa0;
            color: white;
            text-decoration: none;
            font-weight: normal;
            font-size: 15px;
            border-radius: 4px;
        }
        
        .thank-you {
            margin-top: 30px;
            font-style: italic;
            color: #555;
            text-align: center;
        }
        
        .contact-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .logo {
            max-width: 150px;
            height: auto;
        }
        
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 25px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{logo}}" alt="{{geschaeftsname}}" class="logo">
        </div>
        
        <div class="content">
            <h1>Feedback zu Ihrer Reparatur</h1>
            
            <p>Sehr geehrte(r) {{kundenname}},</p>
            
            <p>wir hoffen, dass Ihr {{geraet}} von {{hersteller}} nach der Reparatur wieder einwandfrei funktioniert und Sie mit unserem Service zufrieden sind.</p>
            
            <p>Um unsere Leistungen kontinuierlich zu verbessern, würden wir uns sehr über Ihre Bewertung freuen. Ihre Meinung hilft uns und anderen Kunden.</p>
            
            <div class="button-container">
                <a href="{{bewertungslink}}" class="button">Bewertung abgeben</a>
            </div>
            
            <p>Sollten Sie Fragen oder Anregungen haben, können Sie uns jederzeit kontaktieren.</p>
            
            <div class="divider"></div>
            
            <div class="contact-info">
                <p><strong>{{geschaeftsname}}</strong><br>
                {{adresse}}<br>
                Telefon: <a href="tel:{{telefon}}">{{telefon}}</a><br>
                E-Mail: <a href="mailto:{{email}}">{{email}}</a><br>
                <a href="{{website}}">{{website}}</a></p>
            </div>
            
            <p class="thank-you">Vielen Dank für Ihr Vertrauen!</p>
        </div>
        
        <div class="footer">
            <p>Sie erhalten diese E-Mail, weil Sie unseren Service in Anspruch genommen haben.<br>
            © {{geschaeftsname}} {{aktuellesJahr}} | <a href="{{datenschutzlink}}">Datenschutz</a></p>
        </div>
    </div>
</body>
</html>
    `,
    variables: ["kundenname", "geraet", "hersteller", "bewertungslink", "geschaeftsname", "adresse", "telefon", "email", "website", "aktuellesJahr", "datenschutzlink", "logo"],
    type: 'customer'
  },
  {
    name: "Reparatur abholbereit",
    subject: "Ihre Reparatur ist abholbereit",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Ihre Reparatur ist abgeschlossen!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass die Reparatur Ihres Geräts erfolgreich abgeschlossen wurde.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Reparatur:</strong> {{reparaturarbeit}}</p>
        </div>
        
        <p>Sie können Ihr Gerät zu unseren Öffnungszeiten abholen:</p>
        <p style="text-align: center; font-weight: bold;">{{oeffnungszeiten}}</p>
        
        <p>Bitte bringen Sie zum Abholen Ihren Abholschein oder einen Ausweis mit.</p>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "reparaturarbeit", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  },
  {
    name: "Ersatzteil eingetroffen",
    subject: "Ersatzteil für Ihre Reparatur ist eingetroffen",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Gute Neuigkeiten!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass das bestellte Ersatzteil für Ihre Reparatur eingetroffen ist.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{fehler}}</p>
        </div>
        
        <p>Wir werden nun umgehend mit der Reparatur fortfahren und Sie informieren, sobald Ihr Gerät wieder abholbereit ist.</p>
        
        <p>Falls Sie Fragen haben, können Sie uns gerne kontaktieren.</p>
        
        <p>Mit freundlichen Grüßen,<br>
        Ihr Team von {{geschaeftsname}}</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "fehler", "geschaeftsname"],
    type: 'customer'
  },
  {
    name: "Ersatzteil eingetroffen - Gerät bringen",
    subject: "Ersatzteil für Ihre Reparatur ist eingetroffen - Bitte Gerät bringen",
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981;">Gute Neuigkeiten!</h2>
        </div>
        
        <p>Sehr geehrte(r) {{kundenname}},</p>
        
        <p>wir freuen uns, Ihnen mitteilen zu können, dass das bestellte Ersatzteil für die Reparatur Ihres Geräts eingetroffen ist.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Gerät:</strong> {{hersteller}} {{geraet}}</p>
          <p style="margin: 5px 0;"><strong>Auftragsnummer:</strong> {{auftragsnummer}}</p>
          <p style="margin: 5px 0;"><strong>Beschreibung:</strong> {{fehler}}</p>
        </div>
        
        <p><strong>Bitte bringen Sie Ihr Gerät jetzt in unser Geschäft, damit wir mit der Reparatur beginnen können.</strong></p>
        
        <p>Unsere Öffnungszeiten sind:</p>
        <p style="margin-left: 20px;">{{oeffnungszeiten}}</p>
        
        <p>Sobald Ihr Gerät repariert ist, werden wir Sie umgehend informieren.</p>
        
        <p>Falls Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren.</p>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;"><strong>{{geschaeftsname}}</strong></p>
          <p style="margin: 5px 0;">{{adresse}}</p>
          <p style="margin: 5px 0;">Telefon: {{telefon}}</p>
          <p style="margin: 5px 0;">E-Mail: {{email}}</p>
        </div>
        
        <p style="margin-top: 20px; font-style: italic; text-align: center;">Vielen Dank für Ihr Vertrauen!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Diese E-Mail wurde automatisch von {{geschaeftsname}} gesendet.</p>
        </div>
      </div>
    `,
    variables: ["kundenname", "hersteller", "geraet", "auftragsnummer", "fehler", "oeffnungszeiten", "geschaeftsname", "adresse", "telefon", "email"],
    type: 'customer'
  }
];

/**
 * Erstellt die Standard-App-E-Mail-Vorlagen
 */
/**
 * Erstellt Standard-E-Mail-Vorlagen basierend auf dem übergebenen Vorlagentyp
 * @param templates Die zu erstellenden Vorlagen
 * @param type Vorlagentyp (app oder customer)
 * @param userId Für Kundenvorlagen: Die Benutzer-ID; null für systemweite Vorlagen
 * @param shopId Für Kundenvorlagen: Die Shop-ID; 0 für systemweite Vorlagen
 */
async function createEmailTemplates(
  templates: DefaultEmailTemplate[],
  type: EmailTemplateType,
  userId: number | null = null,
  shopId: number = 0
): Promise<boolean> {
  try {
    // Bei userId=null die globalen Vorlagen suchen, sonst die des Benutzers
    const whereCondition = userId === null 
      ? isNull(emailTemplates.userId)
      : eq(emailTemplates.userId, userId);
    
    // Alle relevanten Vorlagen dieses Typs filtern
    const relevantTemplates = templates.filter(template => template.type === type);
    
    // Alle existierenden Vorlagen des Benutzers abrufen
    const existingTemplates = await db.select()
      .from(emailTemplates)
      .where(whereCondition);
    
    // Vorlagen in existierende und neue aufteilen
    const existingTemplateMap = new Map();
    existingTemplates.forEach(template => {
      existingTemplateMap.set(template.name, template);
    });
    
    const now = new Date();
    
    // Alle Vorlagen durchgehen, entweder aktualisieren oder neu erstellen
    let templatesProcessed = 0;
    for (const template of relevantTemplates) {
      const existingTemplate = existingTemplateMap.get(template.name);
      
      if (existingTemplate) {
        // Vorlage aktualisieren
        await db.update(emailTemplates)
          .set({
            subject: template.subject,
            body: template.body,
            variables: template.variables,
            type: type, // Typ der Vorlage (app oder customer)
            updatedAt: now
          })
          .where(eq(emailTemplates.id, existingTemplate.id));
        
        console.log(`E-Mail-Vorlage '${template.name}' (Typ: ${type}) wurde aktualisiert für ${userId === null ? 'System' : `Benutzer ${userId}`}`);
      } else {
        // Neue Vorlage erstellen
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          type: type, // Typ der Vorlage (app oder customer)
          userId,
          shopId,
          createdAt: now,
          updatedAt: now
        });
        
        console.log(`E-Mail-Vorlage '${template.name}' (Typ: ${type}) wurde erstellt für ${userId === null ? 'System' : `Benutzer ${userId}`}`);
      }
      templatesProcessed++;
    }
    
    console.log(`${templatesProcessed} ${type === 'app' ? 'System' : 'Kunden'}-E-Mail-Vorlagen wurden verarbeitet`);
    return templatesProcessed > 0;
  } catch (error) {
    console.error(`Fehler beim Erstellen der ${type}-E-Mail-Vorlagen:`, error);
    return false;
  }
}

/**
 * Erstellt die Standard-App-E-Mail-Vorlagen (Systemvorlagen)
 */
async function createDefaultAppEmailTemplates(): Promise<boolean> {
  return await createEmailTemplates(defaultAppEmailTemplates, 'app');
}

/**
 * Erstellt oder aktualisiert Standardvorlagen für Kundenkommunikation für einen bestimmten Benutzer
 * @param userId Benutzer-ID
 * @param shopId Shop-ID
 * @param forceUpdate Wenn true, werden alle Vorlagen aktualisiert, auch wenn sie bereits existieren
 */
async function createCustomerEmailTemplates(
  userId: number, 
  shopId: number | null = 0,
  forceUpdate: boolean = true
): Promise<boolean> {
  const shopIdNumber = typeof shopId === 'number' ? shopId : 0;
  
  try {
    const whereCondition = eq(emailTemplates.userId, userId);
    
    // Statt den statischen Templates aus dem Code, holen wir die systemweiten Vorlagen aus der DB
    // Diese wurden möglicherweise im Superadmin-Bereich bearbeitet
    const systemTemplates = await db.select()
      .from(emailTemplates)
      .where(and(
        isNull(emailTemplates.userId),
        eq(emailTemplates.shopId, 0),
        eq(emailTemplates.type, 'customer')
      ));
    
    // Wenn keine systemweiten Vorlagen existieren, fallen wir auf die Standardvorlagen zurück
    let relevantTemplates: any[] = [];
    if (systemTemplates.length > 0) {
      console.log(`${systemTemplates.length} globale Systemvorlagen gefunden, verwende diese.`);
      relevantTemplates = systemTemplates;
    } else {
      console.log(`Keine globalen Systemvorlagen gefunden, verwende Standardvorlagen aus dem Code.`);
      relevantTemplates = defaultCustomerEmailTemplates.filter(template => template.type === 'customer');
    }
    
    // Alle existierenden Vorlagen des Benutzers abrufen
    const existingTemplates = await db.select()
      .from(emailTemplates)
      .where(whereCondition);
    
    // Vorlagen in existierende und neue aufteilen
    const existingTemplateMap = new Map();
    existingTemplates.forEach(template => {
      existingTemplateMap.set(template.name, template);
    });
    
    const now = new Date();
    let templatesProcessed = 0;
    
    // Prüfen, ob "Reparatur abholbereit" vorhanden ist (oder ob archivierte "Reparatur abgeschlossen" existiert)
    const readyTemplateExists = existingTemplateMap.has("Reparatur abholbereit");
    
    // Prüfen, ob bereits eine archivierte "Reparatur abgeschlossen" Vorlage existiert
    let hasArchivedTemplate = false;
    
    // Alternative Implementierung, um TypeScript-Fehler zu vermeiden
    Object.keys(existingTemplateMap).forEach(name => {
      if (name.includes("[ARCHIVIERT]") && name.includes("Reparatur abgeschlossen")) {
        hasArchivedTemplate = true;
      }
    });
    
    // Alle Vorlagen durchgehen, entweder aktualisieren oder neu erstellen
    for (const template of relevantTemplates) {
      // Überspringe "Reparatur abgeschlossen", wenn "Reparatur abholbereit" bereits existiert
      // oder wenn bereits eine archivierte Version vorhanden ist
      if (template.name === "Reparatur abgeschlossen" && (readyTemplateExists || hasArchivedTemplate)) {
        console.log(`Überspringe '${template.name}' für Benutzer ${userId}, da 'Reparatur abholbereit' bereits vorhanden ist oder eine archivierte Version existiert.`);
        continue;
      }
      
      const existingTemplate = existingTemplateMap.get(template.name);
      
      if (existingTemplate) {
        // Wenn forceUpdate aktiviert ist, aktualisiere die Vorlage
        if (forceUpdate) {
          // Auch hier überprüfen, ob wir "Reparatur abgeschlossen" aktualisieren sollen
          if (template.name === "Reparatur abgeschlossen" && (readyTemplateExists || hasArchivedTemplate)) {
            console.log(`Überspringe Aktualisierung von '${template.name}' für Benutzer ${userId}, da 'Reparatur abholbereit' bereits vorhanden ist oder eine archivierte Version existiert.`);
            continue;
          }
          
          await db.update(emailTemplates)
            .set({
              subject: template.subject,
              body: template.body,
              variables: template.variables || [],
              updatedAt: now,
              type: template.type || 'customer' // Stellen sicher, dass der Typ übernommen wird
            })
            .where(eq(emailTemplates.id, existingTemplate.id));
          
          console.log(`E-Mail-Vorlage '${template.name}' wurde aktualisiert für Benutzer ${userId}`);
          templatesProcessed++;
        } else {
          console.log(`E-Mail-Vorlage '${template.name}' existiert bereits für Benutzer ${userId}`);
        }
      } else {
        // Überprüfen, ob "Reparatur abgeschlossen" neu erstellt werden soll
        if (template.name === "Reparatur abgeschlossen" && (readyTemplateExists || hasArchivedTemplate)) {
          console.log(`Überspringe Erstellung von '${template.name}' für Benutzer ${userId}, da 'Reparatur abholbereit' bereits vorhanden ist oder eine archivierte Version existiert.`);
          continue;
        }
        
        // Neue Vorlage erstellen
        await db.insert(emailTemplates).values({
          name: template.name,
          subject: template.subject,
          body: template.body,
          variables: template.variables || [],
          userId,
          shopId: shopIdNumber,
          createdAt: now,
          updatedAt: now,
          type: template.type || 'customer'
        });
        
        console.log(`E-Mail-Vorlage '${template.name}' wurde erstellt für Benutzer ${userId}`);
        templatesProcessed++;
      }
    }
    
    console.log(`${templatesProcessed} Kunden-E-Mail-Vorlagen wurden verarbeitet`);
    return templatesProcessed > 0;
  } catch (error) {
    console.error('Fehler beim Erstellen/Aktualisieren der Kunden-E-Mail-Vorlagen:', error);
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
   * Standard-Kundenvorlagen für einen Benutzer erstellen/wiederherstellen
   * (für reguläre Benutzer und Admins)
   */
  app.post("/api/email/restore-customer-templates", async (req: Request, res: Response) => {
    try {
      // Überprüfen, ob der Benutzer angemeldet ist
      if (!req.isAuthenticated()) {
        return res.status(401).json({ 
          success: false, 
          message: "Sie müssen angemeldet sein, um diese Aktion auszuführen" 
        });
      }
      
      const userId = req.user!.id;
      const shopId = req.user!.shopId || 0; // Falls shopId null ist, verwende 0
      
      // Wichtig: Immer force=true setzen, damit die Vorlagen aus der Datenbank
      // aktualisiert werden, auch wenn sie bereits existieren
      const success = await createCustomerEmailTemplates(userId, shopId, true);
      
      if (success) {
        // Lade alle Vorlagen neu, um sie zurückzugeben
        const templates = await db.select()
          .from(emailTemplates)
          .where(eq(emailTemplates.userId, userId))
          .orderBy(desc(emailTemplates.updatedAt));
          
        res.status(201).json({ 
          success: true, 
          message: "Standard-Kundenkommunikationsvorlagen wurden erfolgreich aktualisiert",
          templates
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Keine Vorlagen aktualisiert oder erstellt. Möglicherweise gibt es ein Problem mit den Systemvorlagen." 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Fehler beim Erstellen/Aktualisieren der Standard-Kundenkommunikationsvorlagen: ${error.message}` 
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
      const typeFilter = req.query.type as string | undefined;
      
      // Nur globale Vorlagen (userId = null, shopId = 0) plus Typ-Filter
      let queryBuilder = db
        .select()
        .from(emailTemplates)
        .where(and(
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0)
        ));
      
      // Filter-Optionen
      if (typeFilter) {
        // Nach Typ filtern (app oder customer)
        queryBuilder = db
          .select()
          .from(emailTemplates)
          .where(and(
            isNull(emailTemplates.userId),
            eq(emailTemplates.shopId, 0),
            eq(emailTemplates.type, typeFilter)
          ));
      }
      
      // Sortieren nach Update-Datum (neueste zuerst)
      const templates = await queryBuilder.orderBy(desc(emailTemplates.updatedAt));
      
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
      
      // Prüfe, ob eine Vorlage mit diesem Namen bereits existiert
      const existingTemplates = await db.select()
        .from(emailTemplates)
        .where(and(
          isNull(emailTemplates.userId),
          eq(emailTemplates.shopId, 0),
          eq(emailTemplates.name, templateData.name)
        ));
      
      if (existingTemplates.length > 0) {
        return res.status(400).json({
          message: `Eine Vorlage mit dem Namen '${templateData.name}' existiert bereits im System. Bitte wählen Sie einen anderen Namen.`
        });
      }
      
      // Erstelle die Vorlage für systemweite Nutzung (userId = null, shopId = 0)
      const newTemplate: InsertEmailTemplate = {
        name: templateData.name,
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || [],
        userId: null, // Globale Vorlage
        shopId: 0, // Systemweit verfügbar
        type: templateData.type || 'customer' // Standard-Typ ist 'customer', kann aber überschrieben werden
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
      
      // Besondere Behandlung für System-Vorlagen vom Typ 'customer'
      // Wenn ein Superadmin eine globale Kunden-Vorlage aktualisiert, sorgen wir für Synchronisierung
      if (existingTemplate.type === 'customer' && existingTemplate.userId === null && existingTemplate.shopId === 0) {
        console.log(`Globale Kunden-Vorlage "${updatedTemplate.name}" wurde aktualisiert.`);
      }
      
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
      
      // Prüfen, ob die Vorlage in der E-Mail-Historie verwendet wird
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(emailHistory)
        .where(eq(emailHistory.emailTemplateId, id)) as [{ count: number }];
      
      const usageCount = Number(count);
      
      if (usageCount > 0) {
        // Statt die Vorlage zu löschen, können wir den Inhalt mit einem Vermerk überschreiben
        // und optional einen "gelöscht"-Flag setzen
        const archiveName = `[ARCHIVIERT] ${existingTemplate.name}`;
        const archiveNote = `<p><strong>Diese Vorlage wurde archiviert, da sie nicht gelöscht werden kann.</strong></p>
<p>Sie wird von ${usageCount} E-Mail(s) in der Historie verwendet.</p>
<p>Originaler Inhalt:</p>
${existingTemplate.body}`;

        await db
          .update(emailTemplates)
          .set({ 
            name: archiveName,
            body: archiveNote,
            type: 'archived' // Spezielle Markierung für archivierte Vorlagen
          })
          .where(eq(emailTemplates.id, id));
        
        return res.status(200).json({ 
          message: `Die E-Mail-Vorlage wurde archiviert, da sie in ${usageCount} E-Mails verwendet wird und nicht gelöscht werden kann.`,
          archived: true
        });
      }
      
      // Lösche die Vorlage, wenn sie nicht verwendet wird
      await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Löschen der E-Mail-Vorlage: ${error.message}` });
    }
  });
}
