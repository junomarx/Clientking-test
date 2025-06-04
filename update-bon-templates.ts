/**
 * Migrationsskript zur Aktualisierung der Bon-Druckvorlagen (58mm und 80mm)
 * Entfernt die detaillierten Reparaturbedingungen und ersetzt sie durch 
 * einfachen Bestätigungstext für alle bestehenden Vorlagen in der Datenbank.
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function updateBonTemplates() {
  console.log('Starte Aktualisierung der Bon-Druckvorlagen...');

  try {
    // Aktualisiere alle 58mm Bon-Vorlagen
    const updated58mm = `<!DOCTYPE html>
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
</html>`;

    // Aktualisiere alle 80mm Bon-Vorlagen
    const updated80mm = `<!DOCTYPE html>
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
</html>`;

    // Aktualisiere alle 58mm Vorlagen in der Datenbank
    const result58mm = await db.execute(sql`
      UPDATE print_templates 
      SET content = ${updated58mm}, updated_at = NOW()
      WHERE type = 'receipt_58mm'
    `);

    console.log(`✅ ${result58mm.rowCount} 58mm Bon-Vorlagen aktualisiert`);

    // Aktualisiere alle 80mm Vorlagen in der Datenbank
    const result80mm = await db.execute(sql`
      UPDATE print_templates 
      SET content = ${updated80mm}, updated_at = NOW()
      WHERE type = 'receipt_80mm'
    `);

    console.log(`✅ ${result80mm.rowCount} 80mm Bon-Vorlagen aktualisiert`);

    console.log('✅ Alle Bon-Druckvorlagen erfolgreich aktualisiert!');
    console.log('Die Reparaturbedingungen wurden durch einfachen Bestätigungstext ersetzt.');

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Bon-Vorlagen:', error);
    throw error;
  }
}

// Hauptfunktion ausführen
async function main() {
  try {
    await updateBonTemplates();
    process.exit(0);
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
    process.exit(1);
  }
}

// ES Module ausführen
main();

export { updateBonTemplates };