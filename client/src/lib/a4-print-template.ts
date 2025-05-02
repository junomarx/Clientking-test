/**
 * Template für DIN A4-Drucklayout
 */

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Repair, Customer, BusinessSettings } from '@shared/schema';

interface A4TemplateProps {
  repair: Repair | null;
  customer: Customer | null;
  businessSettings: BusinessSettings | null;
  qrCodeSettings: any;
}

/**
 * Generiert ein HTML-Layout für DIN A4 Druckvorlagen von Reparaturaufträgen
 */
export const generateA4PrintContent = ({
  repair,
  customer,
  businessSettings,
  qrCodeSettings
}: A4TemplateProps): string => {
  // Ausführliche Prüfung und Logging der übergebenen Daten
  console.log('generateA4PrintContent wurde aufgerufen mit:', {
    repair: repair ? `Repair ID ${repair.id} vorhanden` : 'Keine Repair-Daten',
    customer: customer ? `Customer ID ${customer.id} vorhanden` : 'Keine Customer-Daten',
    businessSettings: businessSettings ? `Business Settings ID ${businessSettings.id} vorhanden` : 'Keine Business-Settings',
    qrCodeSettings: qrCodeSettings ? 'QR-Code-Einstellungen vorhanden' : 'Keine QR-Code-Einstellungen'
  });
  
  // Sicherheitscheck für die wichtigsten Daten
  if (!repair || !customer) {
    console.error('Fehlende Daten für A4-Druck:', { repair, customer });
    return '<div>Keine Daten verfügbar. Repair oder Customer fehlt.</div>';
  }

  // Detailliertes Logging der wichtigen Objekte
  console.log('Repair-Objekt für A4-Druck:', JSON.stringify(repair, null, 2));
  console.log('Customer-Objekt für A4-Druck:', JSON.stringify(customer, null, 2));

  // Formatiere Datumsangaben
  let createdAtDate = "";
  try {
    if (repair.createdAt) {
      if (typeof repair.createdAt === 'string') {
        createdAtDate = format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de });
      } else {
        createdAtDate = format(repair.createdAt, 'dd.MM.yyyy', { locale: de });
      }
    }
  } catch (error) {
    console.error('Fehler beim Formatieren des Datums:', error);
    createdAtDate = "Datum unbekannt";
  }
  
  // Auftragsdetails formatieren
  const orderNumber = repair.orderCode || `#${repair.id}`;
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`;
  const brandName = repair.brand || "";
  const formattedIssue = repair.issue?.replace(/\n/g, '<br />') || "";
  
  // Optionale Blöcke vorbereiten - nur anzeigen, wenn Daten vorhanden sind
  const estimatedCostBlock = repair.estimatedCost ? `
    <div style="margin-bottom: 4mm; padding: 2mm; background-color: #f8f8f8; border-left: 4px solid #2e7d32">
      <span style="font-weight: bold; display: inline-block; min-width: 30mm">Kostenvoranschlag:</span>
      ${repair.estimatedCost} €
    </div>
  ` : '';
  
  const depositBlock = repair.depositAmount ? `
    <div style="margin-bottom: 4mm; padding: 2mm; background-color: #f8f8f8; border-left: 4px solid #1976d2">
      <span style="font-weight: bold; display: inline-block; min-width: 30mm">Anzahlung:</span>
      ${repair.depositAmount} €
    </div>
  ` : '';
  
  const dropoffSignatureBlock = repair.dropoffSignature ? `
    <div style="margin-bottom: 10mm">
      <div style="
        font-size: 12pt; 
        font-weight: bold; 
        margin-bottom: 3mm; 
        padding-bottom: 1mm; 
        border-bottom: 1px solid #333
      ">
        Unterschrift bei Abgabe
      </div>
      <div style="text-align: center; margin-bottom: 3mm">
        <img 
          src="${repair.dropoffSignature}" 
          alt="Unterschrift bei Abgabe" 
          style="max-height: 30mm; max-width: 100%"
        />
      </div>
      <div style="font-size: 9pt; text-align: center; margin-top: 2mm">
        Hiermit bestätige ich, ${customerName}, den Auftrag zur Reparatur meines Gerätes und 
        akzeptiere die allgemeinen Geschäftsbedingungen.
      </div>
    </div>
  ` : '';
  
  const notesBlock = repair.notes ? `
    <div style="margin-bottom: 4mm; padding: 2mm; border: 1px solid #ddd">
      <span style="font-weight: bold; display: inline-block; min-width: 30mm">Notizen:</span>
      <div style="white-space: pre-wrap">
        ${repair.notes}
      </div>
    </div>
  ` : '';
  
  // Seriennummer-Block - nur anzeigen, wenn Daten vorhanden sind
  const serialNumberBlock = repair.serialNumber ? `
    <div style="margin-bottom: 2mm">
      <span style="font-weight: bold; display: inline-block; min-width: 30mm">Seriennummer:</span>
      ${repair.serialNumber}
    </div>
  ` : '';
  
  const vatNumberBlock = businessSettings?.vatNumber ? `
    <div>
      USt-IdNr: ${businessSettings.vatNumber} 
      ${businessSettings.companySlogan ? ` • ${businessSettings.companySlogan}` : ''}
    </div>
  ` : '';
  
  // CustomFooterText verwenden
  const customFooterBlock = businessSettings?.customFooterText ? `
    <div>${businessSettings.customFooterText}</div>
  ` : '';

  // Erstelle das komplette HTML für die A4-Seite
  return `
    <div style="
      padding: 10mm; 
      margin: 0; 
      font-family: Arial, Helvetica, sans-serif;
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    ">
      <!-- Header mit Firmeninformationen -->
      <div style="
        display: flex;
        justify-content: space-between;
        margin-bottom: 15mm;
        border-bottom: 1px solid #333;
        padding-bottom: 5mm
      ">
        <div style="flex: 2">
          <div style="font-size: 18pt; font-weight: bold; margin-bottom: 3mm">
            ${businessSettings?.businessName || "Handyshop Verwaltung"}
          </div>
          <div style="font-size: 10pt; line-height: 1.4">
            ${businessSettings?.streetAddress || ""}<br />
            ${businessSettings?.zipCode || ""} ${businessSettings?.city || ""}<br />
            Tel: ${businessSettings?.phone || ""}<br />
            E-Mail: ${businessSettings?.email || ""}<br />
            ${businessSettings?.website || ""}
          </div>
        </div>
        <div style="flex: 1; text-align: right">
          ${businessSettings?.logoImage ? `
            <img
              src="${businessSettings.logoImage}"
              alt="${businessSettings.businessName || "Firmenlogo"}"
              style="max-height: 30mm; max-width: 60mm"
            />
          ` : ""}
        </div>
      </div>
      
      <!-- Dokumentinformationen -->
      <div style="text-align: right; margin-bottom: 10mm">
        <div>Datum: ${createdAtDate}</div>
      </div>
      
      <!-- Reparaturauftrag Titel -->
      <div style="font-size: 16pt; font-weight: bold; margin-bottom: 5mm; display: flex; align-items: center">
        Reparaturauftrag 
        <span style="
          display: inline-block;
          border: 1px solid #333;
          padding: 2mm 4mm;
          font-weight: bold;
          margin-left: 4mm
        ">
          ${orderNumber}
        </span>
      </div>
      
      <!-- Kundeninformationen -->
      <div style="margin-bottom: 10mm">
        <div style="
          font-size: 12pt; 
          font-weight: bold; 
          margin-bottom: 3mm; 
          padding-bottom: 1mm; 
          border-bottom: 1px solid #333
        ">
          Kundendaten
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; grid-gap: 5mm">
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">Name:</span>
            ${customerName}
          </div>
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">Telefon:</span>
            ${customer.phone || ""}
          </div>
          ${customer.email ? `
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">E-Mail:</span>
            ${customer.email}
          </div>
          ` : ""}
          ${(customer.address || customer.zipCode || customer.city) ? `
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">Adresse:</span>
            ${customer.address || ""}${customer.address && (customer.zipCode || customer.city) ? ", " : ""}
            ${customer.zipCode || ""} ${customer.city || ""}
          </div>
          ` : ""}
        </div>
      </div>
      
      <!-- Gerätedaten -->
      <div style="margin-bottom: 10mm">
        <div style="
          font-size: 12pt; 
          font-weight: bold; 
          margin-bottom: 3mm; 
          padding-bottom: 1mm; 
          border-bottom: 1px solid #333
        ">
          Gerätedaten
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; grid-gap: 5mm">
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">Hersteller:</span>
            ${brandName}
          </div>
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">Modell:</span>
            ${repair.model || ""}
          </div>
          ${serialNumberBlock}
        </div>
      </div>
      
      <!-- Reparaturdetails -->
      <div style="margin-bottom: 10mm">
        <div style="
          font-size: 12pt; 
          font-weight: bold; 
          margin-bottom: 3mm; 
          padding-bottom: 1mm; 
          border-bottom: 1px solid #333
        ">
          Reparaturdetails
        </div>
        
        <div style="
          border: 1px solid #333;
          border-left-width: 4px;
          padding: 3mm;
          margin-bottom: 4mm
        ">
          <div style="margin-bottom: 2mm">
            <span style="font-weight: bold; display: inline-block; min-width: 30mm">Problem:</span>
            <span style="white-space: pre-wrap">${formattedIssue}</span>
          </div>
        </div>
        
        ${estimatedCostBlock}
        ${depositBlock}
        ${notesBlock}
      </div>
      
      ${dropoffSignatureBlock}
      
      <!-- Footer -->
      <div style="
        margin-top: 15mm;
        border-top: 1px solid #333;
        padding-top: 3mm;
        font-size: 9pt;
        text-align: center
      ">
        <div>
          ${businessSettings?.businessName || ""} • ${businessSettings?.streetAddress || ""} • 
          ${businessSettings?.zipCode || ""} ${businessSettings?.city || ""}
        </div>
        ${vatNumberBlock}
        ${customFooterBlock}
      </div>
    </div>
  `;
}

/**
 * Erzeugt einen leeren String als Platzhalter für die Thermobondruck-Funktion.
 * Diese Funktion wurde überarbeitet, um JSX-Fehler zu vermeiden.
 */
export const generateThermoPrintContent = (_props: A4TemplateProps): string => {
  return '<div class="print-container">Thermobondruck wird geladen...</div>';
}