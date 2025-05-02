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
  if (!repair || !customer) {
    return '<div>Keine Daten verfügbar</div>';
  }

  // Formatiere Datumsangaben
  let createdAtDate = "";
  if (repair.createdAt) {
    createdAtDate = format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de });
  }
  
  let dropoffSignatureDate = "";
  if (repair.dropoffSignedAt) {
    dropoffSignatureDate = format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy HH:mm', { locale: de });
  }
  
  // Formatiere den Markennamen mit Großbuchstaben am Anfang
  let brandName = "";
  if (repair.brand) {
    brandName = repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1);
  }
  
  // Erstelle Reparaturauftragsnummer
  const orderNumber = repair.orderCode || (repair.id ? `#${repair.id}` : "");
  
  // Formatiere Kundenname
  const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  
  // Formatiere Issue/Problem
  const formattedIssue = repair.issue ? repair.issue.split(',').join('<br />') : '';
  
  // Optionale Inhalte vorbereiten
  const dropoffSignatureBlock = repair.dropoffSignature ? `
    <div style="
      margin-top: 15mm;
      border-top: 1px solid #333;
      padding-top: 5mm
    ">
      <div style="
        font-size: 12pt; 
        font-weight: bold; 
        margin-bottom: 3mm
      ">
        Unterschrift bei Geräteabgabe
      </div>
      <div style="
        border: 1px solid #333;
        height: 20mm;
        margin-bottom: 3mm;
        position: relative
      ">
        <img
          src="${repair.dropoffSignature}"
          alt="Unterschrift bei Abgabe"
          style="
            position: absolute;
            max-height: 18mm;
            max-width: 80%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%)
          "
        />
      </div>
      ${dropoffSignatureDate ? `
        <div style="font-size: 9pt; text-align: center; margin-bottom: 3mm">
          Unterschrieben am ${dropoffSignatureDate} Uhr
        </div>
      ` : ''}
      <div style="font-size: 9pt; text-align: center">
        Hiermit bestätige ich, ${customerName}, dass ich mit den Reparaturbedingungen 
        einverstanden bin und die oben genannten Angaben zu meinem Gerät korrekt sind.
      </div>
    </div>
  ` : '';
  
  const estimatedCostBlock = repair.estimatedCost ? `
    <div style="
      border: 1px solid #333;
      border-left-width: 4px;
      padding: 3mm;
      margin-bottom: 4mm
    ">
      <div style="margin-bottom: 2mm">
        <span style="font-weight: bold; display: inline-block; min-width: 30mm">Preis:</span>
        ${repair.estimatedCost} €
      </div>
    </div>
  ` : '';
  
  const depositBlock = repair.depositAmount ? `
    <div style="
      border: 1px solid #333;
      border-left-width: 4px;
      padding: 3mm;
      margin-bottom: 4mm
    ">
      <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2mm">
        WICHTIG: Gerät beim Kunden / bei Kundin!
      </div>
      <div style="margin-bottom: 2mm">
        <span style="font-weight: bold; display: inline-block; min-width: 30mm">Anzahlung:</span>
        ${repair.depositAmount} €
      </div>
    </div>
  ` : '';
  
  const notesBlock = repair.notes ? `
    <div style="
      border: 1px solid #333;
      border-left-width: 4px;
      padding: 3mm;
      margin-bottom: 4mm
    ">
      <div style="margin-bottom: 2mm">
        <span style="font-weight: bold; display: inline-block; min-width: 30mm">Notizen:</span>
        ${repair.notes}
      </div>
    </div>
  ` : '';
  
  const serialNumberBlock = repair.serialNumber ? `
    <div style="margin-bottom: 2mm">
      <span style="font-weight: bold; display: inline-block; min-width: 30mm">Seriennummer:</span>
      ${repair.serialNumber}
    </div>
  ` : '';
  
  const imeiBlock = repair.imei ? `
    <div style="margin-bottom: 2mm">
      <span style="font-weight: bold; display: inline-block; min-width: 30mm">IMEI:</span>
      ${repair.imei}
    </div>
  ` : '';
  
  const vatNumberBlock = businessSettings?.vatNumber ? `
    <div>
      USt-IdNr: ${businessSettings.vatNumber} 
      ${businessSettings.companySlogan ? ` • ${businessSettings.companySlogan}` : ''}
    </div>
  ` : '';
  
  const customFooterBlock = businessSettings?.customFooter ? `
    <div>${businessSettings.customFooter}</div>
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
          ${imeiBlock}
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