import { Request, Response } from "express";
import { Express } from "express";
import { isSuperadmin } from "./superadmin-middleware";
import { db } from "./db";
import { printTemplates, type PrintTemplate, type InsertPrintTemplate } from "@shared/schema";
import { eq, desc, isNull, or } from "drizzle-orm";

/**
 * Standard Druckvorlagen
 */
const defaultPrintTemplates = [
  {
    name: "Bondruck 58mm",
    type: "receipt_58mm",
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Abholschein 58mm</title>
  <style>
    @page {
      margin: 0;
      size: 58mm auto;
    }
    body {
      margin: 0;
      padding: 3mm;
      font-family: sans-serif;
      font-size: 9pt;
      line-height: 1.2;
    }
    .header {
      text-align: center;
      margin-bottom: 5mm;
    }
    .logo {
      max-width: 45mm;
      max-height: 20mm;
      margin-bottom: 3mm;
    }
    h1 {
      font-size: 10pt;
      margin: 0 0 1mm 0;
    }
    h2 {
      font-size: 9pt;
      margin: 0 0 1mm 0;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 3mm 0;
    }
    .contact-info {
      margin-bottom: 3mm;
      font-size: 8pt;
    }
    .repair-details {
      margin-bottom: 3mm;
    }
    .repair-details p {
      margin: 0 0 1mm 0;
    }
    .footer {
      margin-top: 3mm;
      text-align: center;
      font-size: 8pt;
    }
    table {
      width: 100%;
      margin: 0 0 3mm 0;
      border-collapse: collapse;
    }
    table td {
      padding: 1mm 0;
    }
    td.label {
      font-weight: bold;
      width: 40%;
    }
    .qr-code {
      text-align: center;
      margin: 2mm 0;
    }
    .qr-code svg {
      width: 20mm;
      height: 20mm;
    }
    .notice {
      font-size: 8pt;
      font-style: italic;
      text-align: center;
      margin: 3mm 0;
    }
    .date {
      text-align: right;
      font-size: 8pt;
      margin-bottom: 2mm;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    {{#if logoUrl}}
      <img src="{{logoUrl}}" class="logo" alt="Logo" />
    {{/if}}
    <h1>{{businessName}}</h1>
    <div class="contact-info">
      {{businessAddress}}<br>
      Tel: {{businessPhone}}
      {{#if businessEmail}}<br>{{businessEmail}}{{/if}}
      {{#if businessWebsite}}<br>{{businessWebsite}}{{/if}}
    </div>
  </div>

  <div class="divider"></div>

  <h2 style="text-align: center;">ABHOLSCHEIN</h2>
  <div class="date">
    {{formattedDate}}
  </div>

  <table>
    <tr>
      <td class="label">Auftragsnr.:</td>
      <td>{{orderCode}}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td class="label">Kunde:</td>
      <td>{{customerName}}</td>
    </tr>
    {{#if customerPhone}}
    <tr>
      <td class="label">Telefon:</td>
      <td>{{customerPhone}}</td>
    </tr>
    {{/if}}
  </table>

  <div class="divider"></div>

  <div class="repair-details">
    <table>
      <tr>
        <td class="label">Gerät:</td>
        <td>{{deviceType}} {{deviceBrand}} {{deviceModel}}</td>
      </tr>
      <tr>
        <td class="label">Status:</td>
        <td>{{status}}</td>
      </tr>
      {{#if repairPrice}}
      <tr>
        <td class="label">Preis:</td>
        <td>{{repairPrice}} €</td>
      </tr>
      {{/if}}
    </table>
  </div>

  {{#if showQrCode}}
  <div class="qr-code">
    {{qrCode}}
    <p>{{trackingUrl}}</p>
  </div>
  {{/if}}

  <div class="divider"></div>

  <div class="footer">
    <p>Vielen Dank für Ihren Auftrag!</p>
    <p>UID: {{vatNumber}}</p>
  </div>
</body>
</html>`,
    variables: [
      "logoUrl", "businessName", "businessAddress", "businessPhone", "businessEmail", 
      "businessWebsite", "formattedDate", "orderCode", "customerName", "customerPhone", 
      "deviceType", "deviceBrand", "deviceModel", "status", "repairPrice", "showQrCode", 
      "qrCode", "trackingUrl", "vatNumber"
    ]
  },
  {
    name: "Bondruck 80mm",
    type: "receipt_80mm",
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Abholschein</title>
  <style>
    @page {
      margin: 0;
      size: 80mm auto;
    }
    body {
      margin: 0;
      padding: 4mm;
      font-family: sans-serif;
      font-size: 10pt;
      line-height: 1.2;
    }
    .header {
      text-align: center;
      margin-bottom: 5mm;
    }
    .logo {
      max-width: 60mm;
      max-height: 25mm;
      margin-bottom: 3mm;
    }
    h1 {
      font-size: 12pt;
      margin: 0 0 1mm 0;
    }
    h2 {
      font-size: 11pt;
      margin: 0 0 1mm 0;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 3mm 0;
    }
    .contact-info {
      margin-bottom: 3mm;
      font-size: 9pt;
    }
    .repair-details {
      margin-bottom: 3mm;
    }
    .repair-details p {
      margin: 0 0 1mm 0;
    }
    .footer {
      margin-top: 3mm;
      text-align: center;
      font-size: 9pt;
    }
    table {
      width: 100%;
      margin: 0 0 3mm 0;
      border-collapse: collapse;
    }
    table td {
      padding: 1mm 0;
    }
    td.label {
      font-weight: bold;
      width: 40%;
    }
    .qr-code {
      text-align: center;
      margin: 3mm 0;
    }
    .qr-code svg {
      width: 25mm;
      height: 25mm;
    }
    .notice {
      font-size: 9pt;
      font-style: italic;
      text-align: center;
      margin: 3mm 0;
    }
    .date {
      text-align: right;
      font-size: 9pt;
      margin-bottom: 2mm;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    {{#if logoUrl}}
      <img src="{{logoUrl}}" class="logo" alt="Logo" />
    {{/if}}
    <h1>{{businessName}}</h1>
    <div class="contact-info">
      {{businessAddress}}<br>
      Tel: {{businessPhone}}
      {{#if businessEmail}}<br>{{businessEmail}}{{/if}}
      {{#if businessWebsite}}<br>{{businessWebsite}}{{/if}}
    </div>
  </div>

  <div class="divider"></div>

  <h2 style="text-align: center;">ABHOLSCHEIN</h2>
  <div class="date">
    {{formattedDate}}
  </div>

  <table>
    <tr>
      <td class="label">Auftragsnr.:</td>
      <td>{{orderCode}}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td class="label">Kunde:</td>
      <td>{{customerName}}</td>
    </tr>
    {{#if customerPhone}}
    <tr>
      <td class="label">Telefon:</td>
      <td>{{customerPhone}}</td>
    </tr>
    {{/if}}
    {{#if customerEmail}}
    <tr>
      <td class="label">E-Mail:</td>
      <td>{{customerEmail}}</td>
    </tr>
    {{/if}}
  </table>

  <div class="divider"></div>

  <div class="repair-details">
    <table>
      <tr>
        <td class="label">Gerät:</td>
        <td>{{deviceType}} {{deviceBrand}} {{deviceModel}}</td>
      </tr>
      {{#if deviceColor}}
      <tr>
        <td class="label">Farbe:</td>
        <td>{{deviceColor}}</td>
      </tr>
      {{/if}}
      {{#if deviceImei}}
      <tr>
        <td class="label">IMEI/SN:</td>
        <td>{{deviceImei}}</td>
      </tr>
      {{/if}}
      <tr>
        <td class="label">Status:</td>
        <td>{{status}}</td>
      </tr>
      {{#if repairPrice}}
      <tr>
        <td class="label">Preis:</td>
        <td>{{repairPrice}} €</td>
      </tr>
      {{/if}}
    </table>
  </div>

  {{#if showQrCode}}
  <div class="qr-code">
    {{qrCode}}
    <p>{{trackingUrl}}</p>
  </div>
  {{/if}}

  <div class="divider"></div>

  <div class="footer">
    <p>Vielen Dank für Ihren Auftrag!</p>
    <p>UID: {{vatNumber}}</p>
  </div>
</body>
</html>`,
    variables: [
      "logoUrl", "businessName", "businessAddress", "businessPhone", "businessEmail", 
      "businessWebsite", "formattedDate", "orderCode", "customerName", "customerPhone", 
      "customerEmail", "deviceType", "deviceBrand", "deviceModel", "deviceColor", "deviceImei", 
      "status", "repairPrice", "showQrCode", "qrCode", "trackingUrl", "vatNumber"
    ]
  },
  {
    name: "DIN A4 Ausdruck",
    type: "invoice_a4",
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Reparaturauftrag</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 15mm;
      color: #333;
      font-size: 11pt;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10mm;
    }
    .company-info {
      width: 60%;
    }
    .logo {
      max-width: 50mm;
      max-height: 25mm;
      margin-bottom: 5mm;
    }
    .document-title {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 5mm;
      border-bottom: 1px solid #333;
      padding-bottom: 2mm;
    }
    .customer-info {
      width: 35%;
      padding: 5mm;
      background-color: #f5f5f5;
      border-radius: 2mm;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      margin: 5mm 0 3mm 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
    }
    table, th, td {
      border: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      padding: 2mm;
      text-align: left;
    }
    td {
      padding: 2mm;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3mm;
    }
    .info-column {
      width: 48%;
    }
    .signature-section {
      margin-top: 15mm;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
      padding-top: 4mm;
      border-top: 1px solid #333;
      text-align: center;
    }
    .signature-image {
      max-width: 100%;
      max-height: 30mm;
      margin-bottom: 2mm;
    }
    .footer {
      margin-top: 15mm;
      padding-top: 3mm;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }
    .qr-code {
      text-align: right;
      margin-bottom: 5mm;
    }
    .qr-code svg {
      width: 25mm;
      height: 25mm;
    }
    .text-center {
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      {{#if logoUrl}}
        <img src="{{logoUrl}}" class="logo" alt="{{businessName}} Logo" />
      {{/if}}
      <h1>{{businessName}}</h1>
      <p>{{businessAddress}}<br>
         Tel: {{businessPhone}}
         {{#if businessEmail}}<br>{{businessEmail}}{{/if}}
         {{#if businessWebsite}}<br>{{businessWebsite}}{{/if}}</p>
    </div>
    <div class="customer-info">
      <strong>Kundendaten:</strong><br>
      {{customerName}}<br>
      {{#if customerAddress}}{{customerAddress}}<br>{{/if}}
      {{#if customerPhone}}Tel: {{customerPhone}}<br>{{/if}}
      {{#if customerEmail}}E-Mail: {{customerEmail}}{{/if}}
    </div>
  </div>

  <div class="document-title">REPARATURAUFTRAG</div>

  <div class="info-row">
    <div class="info-column">
      <table>
        <tr>
          <th colspan="2">Auftragsdaten</th>
        </tr>
        <tr>
          <td><strong>Auftragsnummer:</strong></td>
          <td>{{orderCode}}</td>
        </tr>
        <tr>
          <td><strong>Datum:</strong></td>
          <td>{{formattedDate}}</td>
        </tr>
      </table>
    </div>
    
    {{#if showQrCode}}
    <div class="qr-code">
      {{qrCode}}
      <p style="font-size: 8pt;">{{trackingUrl}}</p>
    </div>
    {{/if}}
  </div>

  <h2 class="section-title">Gerätedaten</h2>
  <table>
    <tr>
      <th style="width: 30%;">Gerätetyp</th>
      <th style="width: 35%;">Hersteller & Modell</th>
      <th style="width: 35%;">IMEI/Seriennummer</th>
    </tr>
    <tr>
      <td>{{deviceType}}</td>
      <td>{{deviceBrand}} {{deviceModel}}</td>
      <td>{{deviceImei}}</td>
    </tr>
  </table>

  {{#if deviceIssue}}
  <h2 class="section-title">Fehlerbeschreibung</h2>
  <table>
    <tr>
      <th>Beschreibung des Problems</th>
    </tr>
    <tr>
      <td>{{deviceIssue}}</td>
    </tr>
  </table>
  {{/if}}

  <h2 class="section-title">Reparaturdetails</h2>
  <table>
    <tr>
      <th style="width: 60%;">Beschreibung</th>
      <th style="width: 20%;">Status</th>
      <th style="width: 20%;">Preis</th>
    </tr>
    <tr>
      <td>{{repairDescription}}</td>
      <td>{{status}}</td>
      <td>{{#if repairPrice}}{{repairPrice}} €{{else}}Auf Anfrage{{/if}}</td>
    </tr>
  </table>

  <div class="signature-section">
    <div class="signature-box">
      {{#if customerSignatureUrl}}
      <img src="{{customerSignatureUrl}}" class="signature-image" alt="Kundenunterschrift" />
      {{/if}}
      <p>Unterschrift Kunde</p>
    </div>
    <div class="signature-box">
      {{#if technicianSignatureUrl}}
      <img src="{{technicianSignatureUrl}}" class="signature-image" alt="Technikerunterschrift" />
      {{/if}}
      <p>Unterschrift Techniker</p>
    </div>
  </div>

  <div class="footer">
    <p>{{businessName}} | {{businessAddress}} | Tel: {{businessPhone}} | UID: {{vatNumber}}</p>
    <p>{{companySlogan}}</p>
  </div>
</body>
</html>`,
    variables: [
      "logoUrl", "businessName", "businessAddress", "businessPhone", "businessEmail", 
      "businessWebsite", "customerName", "customerAddress", "customerPhone", "customerEmail", 
      "orderCode", "formattedDate", "showQrCode", "qrCode", "trackingUrl", "deviceType", 
      "deviceBrand", "deviceModel", "deviceImei", "deviceIssue", "repairDescription", 
      "status", "repairPrice", "customerSignatureUrl", "technicianSignatureUrl", 
      "vatNumber", "companySlogan"
    ]
  },
  {
    name: "Etikett",
    type: "label",
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reparaturetikett</title>
  <style>
    @page {
      size: 50mm 25mm;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 2mm;
      font-family: Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.2;
      width: 46mm;
      height: 21mm;
    }
    .container {
      display: flex;
      height: 100%;
    }
    .qr-section {
      width: 21mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .qr-code {
      width: 21mm;
      height: 21mm;
    }
    .info-section {
      width: 25mm;
      padding-left: 2mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .repair-id {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 1mm;
    }
    .customer {
      margin-bottom: 1mm;
    }
    .device {
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="qr-section">
      {{qrCode}}
    </div>
    <div class="info-section">
      <div class="repair-id">{{orderCode}}</div>
      <div class="customer">{{customerName}}</div>
      <div class="device">{{deviceType}}<br>{{deviceBrand}} {{deviceModel}}</div>
    </div>
  </div>
</body>
</html>`,
    variables: [
      "qrCode", "orderCode", "customerName", "deviceType", "deviceBrand", "deviceModel"
    ]
  }
];

/**
 * Erstellt die Standard-Druckvorlagen
 */
async function createDefaultPrintTemplates(): Promise<boolean> {
  try {
    // Prüfen, welche Vorlagen bereits existieren, um Duplikate zu vermeiden
    const existingTemplates = await db.select({ name: printTemplates.name })
      .from(printTemplates)
      .where(isNull(printTemplates.userId));
    
    const existingTemplateNames = existingTemplates.map(t => t.name);
    
    // Nur Vorlagen hinzufügen, die noch nicht existieren
    const templatesToAdd = defaultPrintTemplates.filter(
      template => !existingTemplateNames.includes(template.name)
    );
    
    if (templatesToAdd.length === 0) {
      console.log('Alle Standard-Druckvorlagen existieren bereits');
      return true;
    }
    
    const now = new Date();
    
    // Vorlagen als globale Vorlagen (userId = null) hinzufügen
    for (const template of templatesToAdd) {
      await db.insert(printTemplates).values({
        name: template.name,
        type: template.type,
        content: template.content,
        variables: template.variables,
        userId: null,
        shopId: 0, // Global für alle Shops
        createdAt: now,
        updatedAt: now
      });
      
      console.log(`Standard-Druckvorlage '${template.name}' wurde erstellt`);
    }
    
    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen der Standard-Druckvorlagen:', error);
    return false;
  }
}

/**
 * Registriert alle Routen für die Druckvorlagen-Verwaltung im Superadmin-Bereich
 */
export function registerSuperadminPrintTemplatesRoutes(app: Express) {
  /**
   * Standard-Druckvorlagen erstellen
   */
  app.post("/api/superadmin/print-templates/create-default-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const success = await createDefaultPrintTemplates();
      
      if (success) {
        res.status(200).json({ 
          success: true, 
          message: "Standard-Druckvorlagen wurden erfolgreich erstellt" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Fehler beim Erstellen der Standard-Druckvorlagen" 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: `Fehler beim Erstellen der Standard-Druckvorlagen: ${error.message}` 
      });
    }
  });
  
  /**
   * Alle Druckvorlagen abrufen (systemweit)
   */
  app.get("/api/superadmin/print-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const templates = await db
        .select()
        .from(printTemplates)
        .orderBy(desc(printTemplates.updatedAt));
      
      res.status(200).json(templates);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Abrufen der Druckvorlagen: ${error.message}` });
    }
  });
  
  /**
   * Druckvorlage erstellen
   */
  app.post("/api/superadmin/print-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const templateData = req.body;
      
      // Validiere die Vorlagendaten
      if (!templateData.name || !templateData.type || !templateData.content) {
        return res.status(400).json({
          message: "Ungültige Vorlagendaten. Name, Typ und Inhalt sind erforderlich."
        });
      }
      
      // Erstelle die Vorlage für systemweite Nutzung (userId = null, shopId = 0)
      const newTemplate: InsertPrintTemplate = {
        name: templateData.name,
        type: templateData.type,
        content: templateData.content,
        variables: templateData.variables || [],
        userId: null, // Globale Vorlage
        shopId: 0 // Systemweit verfügbar
      };
      
      const [createdTemplate] = await db
        .insert(printTemplates)
        .values(newTemplate)
        .returning();
      
      res.status(201).json(createdTemplate);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Erstellen der Druckvorlage: ${error.message}` });
    }
  });
  
  /**
   * Druckvorlage aktualisieren
   */
  app.patch("/api/superadmin/print-templates/:id", isSuperadmin, async (req: Request, res: Response) => {
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
        .from(printTemplates)
        .where(eq(printTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Druckvorlage nicht gefunden" });
      }
      
      // Aktualisiere die Vorlage
      const [updatedTemplate] = await db
        .update(printTemplates)
        .set({
          name: templateData.name || existingTemplate.name,
          type: templateData.type || existingTemplate.type,
          content: templateData.content || existingTemplate.content,
          variables: templateData.variables || existingTemplate.variables,
          updatedAt: new Date()
        })
        .where(eq(printTemplates.id, id))
        .returning();
      
      res.status(200).json(updatedTemplate);
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Aktualisieren der Druckvorlage: ${error.message}` });
    }
  });
  
  /**
   * Druckvorlage löschen
   */
  app.delete("/api/superadmin/print-templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validiere die ID
      if (isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Vorlagen-ID" });
      }
      
      // Prüfe, ob die Vorlage existiert
      const [existingTemplate] = await db
        .select()
        .from(printTemplates)
        .where(eq(printTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Druckvorlage nicht gefunden" });
      }
      
      // Lösche die Vorlage
      await db
        .delete(printTemplates)
        .where(eq(printTemplates.id, id));
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: `Fehler beim Löschen der Druckvorlage: ${error.message}` });
    }
  });
}
