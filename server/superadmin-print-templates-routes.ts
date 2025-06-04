import { Express, Request, Response } from 'express';
import { db, pool } from './db';
import { eq, asc, sql } from 'drizzle-orm';
import { isSuperadmin } from './superadmin-middleware';

// Definition der Druckvorlagentypen
interface PrintTemplate {
  id: number;
  name: string;
  type: string;
  content: string;
  variables: string[];
  userId: number | null;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

interface InsertPrintTemplate {
  name: string;
  type: string;
  content: string;
  variables: string[];
  userId?: number | null;
  shopId?: number;
}

/**
 * Standard Druckvorlagen
 */
const defaultPrintTemplates = [
  {
    name: 'Standard Bondruck 58mm',
    type: 'receipt_58mm',
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Abholschein</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      margin: 0;
      padding: 3mm;
      width: 58mm;
      /* 10mm zusätzliche Länge durch Padding oben und unten */
      padding-top: 5mm;
      padding-bottom: 8mm;
    }
    .center { text-align: center; }
    .header { margin-bottom: 10px; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .bold { font-weight: bold; }
    .text-sm { font-size: 8pt; }
    .text-xs { font-size: 7pt; }
    .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .logo { max-width: 100%; height: auto; max-height: 15mm; }
  </style>
</head>
<body>
  <div class="header center">
    <img src="{{logoUrl}}" alt="{{businessName}}" class="logo">
    <div class="bold">{{businessName}}</div>
    <div class="text-sm">{{businessAddress}}</div>
    <div class="text-sm">Tel: {{businessPhone}}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="center bold">Abholschein Nr. {{repairId}}</div>
  <div class="center text-sm">{{currentDate}}</div>
  
  <div class="divider"></div>
  
  <div class="info-row">
    <span>Kunde:</span>
    <span>{{customerName}}</span>
  </div>
  <div class="info-row">
    <span>Telefon:</span>
    <span>{{customerPhone}}</span>
  </div>
  <div class="info-row">
    <span>Gerät:</span>
    <span>{{deviceType}} {{deviceBrand}}</span>
  </div>
  <div class="info-row">
    <span>Modell:</span>
    <span>{{deviceModel}}</span>
  </div>
  <div class="info-row">
    <span>Fehler:</span>
    <span>{{deviceIssue}}</span>
  </div>
  
  <div class="divider"></div>
  
  <div>
    <p class="text-xs">Mit der Unterschrift bestätigt der Kunde, dass er die Reparaturbedingungen gelesen und akzeptiert hat.</p>
    <div style="height: 40px;"></div>
    <div class="center">____________________________</div>
    <div class="center text-xs">Unterschrift Kunde</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="text-xs center">
    <p>{{businessName}} - {{businessSlogan}}</p>
    <p>USt-IdNr.: {{vatNumber}}</p>
    <p>{{websiteUrl}}</p>
  </div>
</body>
</html>`,
    variables: ['businessName', 'businessAddress', 'businessPhone', 'repairId', 'currentDate', 'customerName', 'customerPhone', 'deviceType', 'deviceBrand', 'deviceModel', 'deviceIssue', 'businessSlogan', 'vatNumber', 'websiteUrl', 'logoUrl']
  },
  {
    name: 'Standard Bondruck 80mm',
    type: 'receipt_80mm',
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Abholschein</title>
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      margin: 0;
      padding: 3mm;
      width: 80mm;
      /* 10mm zusätzliche Länge durch Padding oben und unten */
      padding-top: 5mm;
      padding-bottom: 8mm;
    }
    .center { text-align: center; }
    .header { margin-bottom: 10px; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .bold { font-weight: bold; }
    .text-sm { font-size: 9pt; }
    .text-xs { font-size: 8pt; }
    .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
    .logo { max-width: 100%; height: auto; max-height: 15mm; }
  </style>
</head>
<body>
  <div class="header center">
    <img src="{{logoUrl}}" alt="{{businessName}}" class="logo">
    <div class="bold">{{businessName}}</div>
    <div class="text-sm">{{businessAddress}}</div>
    <div class="text-sm">Tel: {{businessPhone}}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="center bold">Abholschein Nr. {{repairId}}</div>
  <div class="center text-sm">{{currentDate}}</div>
  
  <div class="divider"></div>
  
  <div class="info-row">
    <span>Kunde:</span>
    <span>{{customerName}}</span>
  </div>
  <div class="info-row">
    <span>Telefon:</span>
    <span>{{customerPhone}}</span>
  </div>
  <div class="info-row">
    <span>Gerät:</span>
    <span>{{deviceType}} {{deviceBrand}}</span>
  </div>
  <div class="info-row">
    <span>Modell:</span>
    <span>{{deviceModel}}</span>
  </div>
  <div class="info-row">
    <span>Fehler:</span>
    <span>{{deviceIssue}}</span>
  </div>
  
  <div class="divider"></div>
  
  <div>
    <p class="text-sm">Mit der Unterschrift bestätigt der Kunde, dass er die Reparaturbedingungen gelesen und akzeptiert hat.</p>
    <div style="height: 50px;"></div>
    <div class="center">____________________________</div>
    <div class="center text-xs">Unterschrift Kunde</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="text-xs center">
    <p>{{businessName}} - {{businessSlogan}}</p>
    <p>USt-IdNr.: {{vatNumber}}</p>
    <p>{{websiteUrl}}</p>
  </div>
</body>
</html>`,
    variables: ['businessName', 'businessAddress', 'businessPhone', 'repairId', 'currentDate', 'customerName', 'customerPhone', 'deviceType', 'deviceBrand', 'deviceModel', 'deviceIssue', 'businessSlogan', 'vatNumber', 'websiteUrl', 'logoUrl']
  },
  {
    name: 'Standard Reparaturauftrag A4',
    type: 'invoice_a4',
    content: `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Reparaturauftrag</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .logo-container {
            width: 200px;
            border: 1px dashed #ccc;
            padding: 10px;
            text-align: center;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-style: italic;
            color: #999;
        }
        .company-info {
            text-align: right;
            font-size: 12px;
            color: #666;
        }
        .company-name {
            font-weight: bold;
            font-size: 16px;
            color: #333;
            margin-bottom: 5px;
        }
        .document-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0 10px 0;
            color: #222;
        }
        .auftragsnummer {
            text-align: center;
            font-size: 18px;
            margin: 0 0 40px 0;
            color: #222;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 14px;
            color: #333;
        }
        .customer-info {
            margin-bottom: 30px;
        }
        .customer-info p {
            margin: 3px 0;
        }
        .customer-name {
            font-weight: bold;
            font-size: 16px;
        }
        .device-repair-box {
            display: flex;
            justify-content: space-between;
            gap: 40px;
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 8px;
            background-color: #f9f9f9;
        }
        .info-column {
            flex: 1;
        }
        .info-item {
            margin-bottom: 15px;
        }
        .info-label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .info-value {
            font-size: 14px;
            font-weight: bold;
            color: #222;
        }
        .repair-terms-box {
            border: 1px solid #ccc;
            border-radius: 8px;
            background-color: #f9f9f9;
            padding: 20px;
            margin-bottom: 30px;
        }
        .repair-terms-box p {
            margin: 8px 0;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
        }
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            gap: 40px;
        }
        .signature-box {
            flex: 1;
            text-align: center;
        }
        .signature-line {
            margin-top: 40px;
            border-top: 1px solid #999;
            height: 1px;
        }
        .signature-placeholder {
            font-size: 10px;
            color: #999;
            margin-top: 5px;
        }
        .signature-date {
            font-size: 11px;
            color: #666;
            margin-top: 5px;
        }
        @media print {
            body {
                padding: 0;
            }
            @page {
                size: A4;
                margin: 2cm;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-container">
            {{firmenlogo}}
        </div>
        <div class="company-info">
            <p class="company-name">{{businessName}}</p>
            <p>{{businessAddress}}<br>
            {{businessPhone}}<br>
            {{businessEmail}}</p>
        </div>
    </div>

    <div class="customer-info">
        <div class="section-title">Kundeninformationen</div>
        <p class="customer-name">{{kundenname}}</p>
        <p>{{kundenadresse1}}</p>
        <p>{{kundenadresse2}}</p>
    </div>

    <div class="document-title">Reparaturauftrag</div>
    <div class="auftragsnummer">{{auftragsnummer}}</div>

    <div class="device-repair-box">
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Hersteller</div>
                <div class="info-value">{{hersteller}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Modell</div>
                <div class="info-value">{{modell}}</div>
            </div>
        </div>
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Schaden / Fehler</div>
                <div class="info-value">{{problem}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Kosten</div>
                <div class="info-value">{{preis}}</div>
            </div>
        </div>
    </div>

    <div class="section repair-terms-box">
        <div class="section-title">Reparaturbedingungen</div>
        <p><strong>1.</strong> Die Reparatur erfolgt nach bestem Wissen und mit geprüften Ersatzteilen. Originalteile können nicht in jedem Fall garantiert werden.</p>
        <p><strong>2.</strong> Für etwaige Datenverluste wird keine Haftung übernommen. Der Kunde ist verpflichtet, vor Abgabe des Geräts eine vollständige Datensicherung vorzunehmen.</p>
        <p><strong>3.</strong> Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die ausgeführten Arbeiten und eingesetzten Komponenten.</p>
        <p><strong>4.</strong> Wird ein Kostenvoranschlag abgelehnt oder ist eine Reparatur nicht möglich, kann eine Überprüfungspauschale berechnet werden.</p>
        <p><strong>5.</strong> Nicht abgeholte Geräte können nach 60 Tagen kostenpflichtig eingelagert oder entsorgt werden.</p>
        <p><strong>6.</strong> Mit der Unterschrift bestätigt der Kunde die Beauftragung der Reparatur sowie die Anerkennung dieser Bedingungen.</p>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <p><strong>Reparaturauftrag erteilt</strong></p>
            <div class="signature-line">{{signatur_dropoff}}</div>
            <div class="signature-placeholder">{{kundenname}}</div>
            <div class="signature-date">{{datum_dropoff}}</div>
        </div>
        <div class="signature-box">
            <p><strong>Gerät abgeholt</strong></p>
            <div class="signature-line">{{signatur_pickup}}</div>
            <div class="signature-placeholder">{{kundenname}}</div>
            <div class="signature-date">{{datum_pickup}}</div>
        </div>
    </div>
</body>
</html>`,
    variables: ['firmenlogo','kundenname','kundenadresse1','kundenadresse2','auftragsnummer','hersteller','modell','problem','preis','signatur_dropoff','datum_dropoff','signatur_pickup','datum_pickup','businessName','businessAddress','businessPhone','businessEmail']
  },
  {
    name: 'Standard Kostenvoranschlag A4',
    type: 'estimate_a4',
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Kostenvoranschlag</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      margin: 0;
      padding: 20mm;
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10mm;
    }
    .logo {
      max-height: 30mm;
      max-width: 90mm;
    }
    .business-info {
      text-align: right;
      font-size: 10pt;
    }
    .document-title {
      font-size: 18pt;
      font-weight: bold;
      margin: 10mm 0;
      text-align: center;
    }
    .section {
      margin-bottom: 8mm;
    }
    .section-title {
      font-weight: bold;
      border-bottom: 1px solid #333;
      margin-bottom: 2mm;
      padding-bottom: 1mm;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table td {
      padding: 2mm;
      width: 40%;
      font-weight: bold;
    }
    .signature-section {
      margin-top: 15mm;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 15mm;
      padding-top: 2mm;
      text-align: center;
    }
    .footer {
      position: absolute;
      bottom: 20mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <img src="{{logoUrl}}" alt="{{businessName}}" class="logo">
    </div>
    <div class="business-info">
      <p><strong>{{businessName}}</strong></p>
      <p>{{businessAddress}}</p>
      <p>Tel: {{businessPhone}}</p>
      <p>E-Mail: {{businessEmail}}</p>
      <p>Web: {{websiteUrl}}</p>
    </div>
  </div>

  <div class="document-title">Reparaturauftrag Nr. {{repairId}}</div>

  <div class="section">
    <div class="section-title">Kundendaten</div>
    <table class="info-table">
      <tr>
        <td>Name:</td>
        <td>{{customerName}}</td>
      </tr>
      <tr>
        <td>Adresse:</td>
        <td>{{customerAddress}}</td>
      </tr>
      <tr>
        <td>Telefon:</td>
        <td>{{customerPhone}}</td>
      </tr>
      <tr>
        <td>E-Mail:</td>
        <td>{{customerEmail}}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Geräteinformationen</div>
    <table class="info-table">
      <tr>
        <td>Gerätetyp:</td>
        <td>{{deviceType}}</td>
      </tr>
      <tr>
        <td>Marke:</td>
        <td>{{deviceBrand}}</td>
      </tr>
      <tr>
        <td>Modell:</td>
        <td>{{deviceModel}}</td>
      </tr>
      <tr>
        <td>Seriennummer:</td>
        <td>{{deviceSerial}}</td>
      </tr>
      <tr>
        <td>IMEI:</td>
        <td>{{deviceImei}}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Fehlerbeschreibung</div>
    <p>{{deviceIssue}}</p>
    <p>{{additionalNotes}}</p>
  </div>

  <div class="section">
    <div class="section-title">Geschätzte Kosten und Dauer</div>
    <table class="info-table">
      <tr>
        <td>Geschätzte Kosten:</td>
        <td>{{estimatedCost}} €</td>
      </tr>
      <tr>
        <td>Geschätzte Fertigstellung:</td>
        <td>{{estimatedCompletionDate}}</td>
      </tr>
    </table>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Unterschrift Kunde</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Unterschrift {{businessName}}</div>
    </div>
  </div>

  <div class="footer">
    <p>{{businessName}} - {{businessSlogan}}</p>
    <p>USt-IdNr.: {{vatNumber}}</p>
  </div>
</body>
</html>`,
    variables: ['businessName', 'businessAddress', 'businessPhone', 'businessEmail', 'websiteUrl', 'repairId', 'customerName', 'customerAddress', 'customerPhone', 'customerEmail', 'deviceType', 'deviceBrand', 'deviceModel', 'deviceSerial', 'deviceImei', 'deviceIssue', 'additionalNotes', 'estimatedCost', 'estimatedCompletionDate', 'businessSlogan', 'vatNumber', 'logoUrl']
  },
  {
    name: 'Standard Etikett',
    type: 'label',
    content: `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Etikett</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      margin: 0;
      padding: 2mm;
      width: 62mm;
      height: 29mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .repair-id {
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 2mm;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
      font-size: 8pt;
    }
    .info-label {
      font-weight: bold;
    }
    .divider {
      border-top: 1px dashed #ccc;
      margin: 1mm 0;
    }
  </style>
</head>
<body>
  <div class="repair-id">Auftrag #{{repairId}}</div>
  
  <div class="info-row">
    <span class="info-label">Kunde:</span>
    <span>{{customerName}}</span>
  </div>
  
  <div class="info-row">
    <span class="info-label">Tel:</span>
    <span>{{customerPhone}}</span>
  </div>
  
  <div class="divider"></div>
  
  <div class="info-row">
    <span class="info-label">Gerät:</span>
    <span>{{deviceType}} {{deviceBrand}}</span>
  </div>
  
  <div class="info-row">
    <span class="info-label">Modell:</span>
    <span>{{deviceModel}}</span>
  </div>
  
  <div class="info-row">
    <span class="info-label">Fehler:</span>
    <span>{{deviceIssue}}</span>
  </div>
</body>
</html>`,
    variables: ['repairId', 'customerName', 'customerPhone', 'deviceType', 'deviceBrand', 'deviceModel', 'deviceIssue']
  }
];

/**
 * Erstellt die Standard-Druckvorlagen
 */
async function createDefaultPrintTemplates(): Promise<boolean> {
  try {
    // Prüfen, ob bereits Standard-Vorlagen existieren
    const existingTemplates = await db.execute(sql`
      SELECT COUNT(*) AS count FROM print_templates
    `);
    
    const count = parseInt(existingTemplates.rows[0].count as string, 10);
    
    // Wenn bereits Vorlagen existieren, nicht erneut erstellen
    if (count > 0) {
      return false;
    }
    
    // Standard-Vorlagen in die Datenbank einfügen
    for (const template of defaultPrintTemplates) {
      // Debug-Ausgabe
      console.log('Template-Variablen:', template.variables);
      console.log('JSON String:', JSON.stringify(template.variables));
      
      // Verwende Array-Literal-Syntax für PostgreSQL
      const variablesArray = "ARRAY[" + template.variables.map(v => `'${v}'`).join(',') + "]";
      console.log('SQL Array Syntax StandardTemplate:', variablesArray);
      
      await pool.query(
        `INSERT INTO print_templates (name, type, content, variables, user_id, shop_id, created_at, updated_at) 
         VALUES ($1, $2, $3, ${variablesArray}, NULL, 0, NOW(), NOW())`,
        [template.name, template.type, template.content]
      );
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
      const created = await createDefaultPrintTemplates();
      if (created) {
        res.status(201).json({ success: true, message: "Standard-Druckvorlagen wurden erstellt" });
      } else {
        res.status(200).json({ success: false, message: "Standard-Druckvorlagen existieren bereits" });
      }
    } catch (error) {
      console.error("Fehler beim Erstellen der Standard-Druckvorlagen:", error);
      res.status(500).json({ success: false, message: "Fehler beim Erstellen der Standard-Druckvorlagen" });
    }
  });
  
  /**
   * Alle Druckvorlagen abrufen (systemweit)
   */
  app.get("/api/superadmin/print-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      // Verwende direkte Pool-Abfrage
      const result = await pool.query(
        `SELECT 
          id, 
          name, 
          type, 
          content, 
          variables, 
          user_id as "userId", 
          shop_id as "shopId",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM 
          print_templates
        ORDER BY 
          id ASC`
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error("Fehler beim Abrufen der Druckvorlagen:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Druckvorlagen" });
    }
  });
  
  /**
   * Druckvorlage erstellen
   */
  app.post("/api/superadmin/print-templates", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const { name, type, content, variables } = req.body;
      
      if (!name || !type || !content) {
        return res.status(400).json({ message: "Name, Typ und Inhalt sind erforderlich" });
      }
      
      const newTemplate: InsertPrintTemplate = {
        name,
        type,
        content,
        variables: variables || [],
        userId: null,  // Globale Vorlage (kein Benutzer)
        shopId: 0      // Globale Vorlage (kein Shop)
      };
      
      // Debug-Ausgabe
      console.log('Neue Vorlage Variables:', newTemplate.variables);
      
      // Verwende Array-Literal-Syntax für PostgreSQL
      const variablesArray = "ARRAY[" + newTemplate.variables.map(v => `'${v}'`).join(',') + "]";
      console.log('SQL Array Syntax:', variablesArray);
      
      const result = await pool.query(
        `INSERT INTO print_templates 
          (name, type, content, variables, user_id, shop_id, created_at, updated_at) 
        VALUES 
          ($1, $2, $3, ${variablesArray}, NULL, 0, NOW(), NOW())
        RETURNING 
          id, 
          name, 
          type, 
          content, 
          variables, 
          user_id as "userId", 
          shop_id as "shopId",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        `, 
        [newTemplate.name, newTemplate.type, newTemplate.content]
      );
      
      const createdTemplate = result.rows[0];
      res.status(201).json(createdTemplate);
    } catch (error) {
      console.error("Fehler beim Erstellen der Druckvorlage:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Druckvorlage" });
    }
  });
  
  /**
   * Druckvorlage aktualisieren
   */
  app.patch("/api/superadmin/print-templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, type, content, variables } = req.body;
      
      if (!name || !type || !content) {
        return res.status(400).json({ message: "Name, Typ und Inhalt sind erforderlich" });
      }
      
      // Verwende Array-Literal-Syntax für PostgreSQL
      const variablesArray = "ARRAY[" + variables.map(v => `'${v}'`).join(',') + "]";
      console.log('SQL Array Syntax Update:', variablesArray);
      
      const result = await pool.query(
        `UPDATE print_templates
        SET 
          name = $1, 
          type = $2, 
          content = $3, 
          variables = ${variablesArray}, 
          updated_at = NOW()
        WHERE 
          id = $4
        RETURNING 
          id, 
          name, 
          type, 
          content, 
          variables, 
          user_id as "userId", 
          shop_id as "shopId",
          created_at as "createdAt", 
          updated_at as "updatedAt"
        `,
        [name, type, content, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Druckvorlage nicht gefunden" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Druckvorlage:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren der Druckvorlage" });
    }
  });
  
  /**
   * Druckvorlage löschen
   */
  app.delete("/api/superadmin/print-templates/:id", isSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verwende direkte Pool-Abfrage mit Parametern
      const result = await pool.query(
        `DELETE FROM print_templates
        WHERE id = $1
        RETURNING id`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Druckvorlage nicht gefunden" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Fehler beim Löschen der Druckvorlage:", error);
      res.status(500).json({ message: "Fehler beim Löschen der Druckvorlage" });
    }
  });
}