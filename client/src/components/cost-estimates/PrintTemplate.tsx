// Druckvorlage für Kostenvoranschläge
import React from 'react';

// Diese separate Komponente erlaubt uns, die Druckvorlage sauber zu definieren
// und vereinfacht spätere Änderungen

interface CostEstimateItem {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface PrintTemplateProps {
  // Dokumentendaten
  referenceNumber: string;
  created_at: string;
  validUntil?: string;
  
  // Kundendaten
  customerName: string;
  customerAddress?: string;
  customerZipCity?: string;
  
  // Gerätedaten
  brand: string;
  model: string;
  serialNumber?: string;
  issue: string;
  notes?: string;
  
  // Finanzdaten
  items: CostEstimateItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
}

export const generatePrintHtml = (props: PrintTemplateProps): string => {
  const {
    referenceNumber,
    created_at,
    validUntil,
    customerName,
    customerAddress,
    customerZipCity,
    brand,
    model,
    serialNumber,
    issue,
    notes,
    items,
    subtotal,
    taxRate,
    taxAmount,
    total
  } = props;
  
  // Formatiere das Datum
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'unbegrenzt';
    try {
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    } catch (error) {
      return 'ungültiges Datum';
    }
  };
  
  // Aktuelles Datum für die Erstellung
  const today = new Date();
  const todayFormatted = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
  
  // Generiere die Positionstabelle
  const itemsHtml = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.description}</td>
      <td class="text-right">${item.quantity}</td>
      <td class="text-right">${item.unitPrice} €</td>
      <td class="text-right">${item.totalPrice} €</td>
    </tr>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Kostenvoranschlag ${referenceNumber}</title>
      <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
            background-color: white;
        }
        
        body {
            padding: 20mm;
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
            margin: 0 0 10px 0;
            color: #222;
        }
        
        .document-date {
            text-align: center;
            font-size: 14px;
            margin: 0 0 40px 0;
            color: #666;
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
        
        .device-info-box {
            display: flex;
            justify-content: space-between;
            gap: 40px;
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 8px;
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
        
        .box-content {
            white-space: pre-line;
            font-size: 13px;
            color: #333;
            margin-top: 5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        thead tr {
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
        }
        
        th, td {
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }
        
        th {
            font-weight: bold;
        }
        
        tbody tr {
            border-bottom: 1px solid #ddd;
        }
        
        .text-right {
            text-align: right;
        }
        
        .price-summary {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            margin-top: 20px;
        }
        
        .price-row {
            display: flex;
            justify-content: space-between;
            width: 200px;
            margin-bottom: 5px;
        }
        
        .price-label {
            font-size: 12px;
            color: #666;
        }
        
        .price-value {
            font-size: 12px;
            font-weight: bold;
        }
        
        .price-total {
            display: flex;
            justify-content: space-between;
            width: 200px;
            border-top: 1px solid #ddd;
            padding-top: 5px;
            margin-top: 5px;
        }
        
        .price-total-label {
            font-size: 14px;
            font-weight: bold;
        }
        
        .price-total-value {
            font-size: 14px;
            font-weight: bold;
        }
        
        @media print {
            html, body {
                width: 210mm;
                height: 297mm;
            }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-container">
            Firmenlogo
        </div>
        <div class="company-info">
            <p class="company-name">Mac and PhoneDoc</p>
            <p>Amerlingstraße 19<br>
            1060 Wien<br>
            +4314103511<br>
            office@macandphonedoc.at</p>
        </div>
      </div>
    
      <div class="customer-info">
        <div class="section-title">Kundeninformationen</div>
        <p class="customer-name">${customerName}</p>
        <p>${customerAddress || ''}</p>
        <p>${customerZipCity || ''}</p>
      </div>
    
      <div class="document-title">Kostenvoranschlag</div>
      <div class="auftragsnummer">${referenceNumber}</div>
      <div class="document-date">Erstellt am: ${todayFormatted}</div>
    
      <!-- Geräteinformationen -->
      <div class="device-info-box">
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Hersteller</div>
                <div class="info-value">${brand}</div>
            </div>
        </div>
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Modell</div>
                <div class="info-value">${model}</div>
            </div>
        </div>
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Seriennummer</div>
                <div class="info-value">${serialNumber || '-'}</div>
            </div>
        </div>
      </div>
    
      <!-- Fehlerbeschreibung -->
      <div class="section">
        <div class="section-title">Fehlerbeschreibung</div>
        <div class="box-content">${issue}</div>
      </div>
    
      <!-- Positionen -->
      <div class="section">
        <div class="section-title">Positionen</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Beschreibung</th>
              <th class="text-right">Menge</th>
              <th class="text-right">Einzelpreis</th>
              <th class="text-right">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="price-summary">
          <div class="price-row">
            <span class="price-label">Zwischensumme:</span>
            <span class="price-value">${subtotal} €</span>
          </div>
          <div class="price-row">
            <span class="price-label">MwSt (${taxRate}%):</span>
            <span class="price-value">${taxAmount} €</span>
          </div>
          <div class="price-total">
            <span class="price-total-label">Gesamtbetrag:</span>
            <span class="price-total-value">${total} €</span>
          </div>
        </div>
      </div>
    
      <!-- Hinweise -->
      <div class="section">
        <div class="section-title">Hinweise zum Kostenvoranschlag</div>
        <p><strong>1.</strong> Der Kostenvoranschlag basiert auf einer ersten Diagnose und kann sich bei tatsächlicher Durchführung ändern.</p>
        <p><strong>2.</strong> Sollte sich während der Reparatur ein erweiterter Schaden zeigen, wird der Kunde vorab kontaktiert.</p>
        <p><strong>3.</strong> Die im Kostenvoranschlag genannten Preise verstehen sich inkl. MwSt., sofern nicht anders angegeben.</p>
        <p><strong>4.</strong> Eine Bearbeitungsgebühr kann fällig werden, falls keine Reparatur beauftragt wird.</p>
        <p><strong>5.</strong> Dieser Kostenvoranschlag ist bis ${validUntil ? formatDate(validUntil) : 'unbegrenzt'} gültig.</p>
      </div>
    
      ${notes ? `
      <div class="section">
        <div class="section-title">Zusätzliche Notizen</div>
        <div class="box-content">${notes}</div>
      </div>
      ` : ''}
    </body>
    </html>
  `;
};

export default generatePrintHtml;