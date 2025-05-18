// Hilfsfunktionen für den Druck von Kostenvoranschlägen
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Typen für die Druckfunktionen
interface CostEstimateItem {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface PrintData {
  estimate: any;
  customer: any;
  items: CostEstimateItem[];
  todayFormatted?: string;
}

/**
 * Generiert HTML für den Druck eines Kostenvoranschlags
 */
export function generatePrintHtml(data: PrintData): string {
  const { estimate, customer, items } = data;
  
  // Aktuelles Datum formatieren, falls nicht übergeben
  const todayFormatted = data.todayFormatted || format(new Date(), 'dd.MM.yyyy', { locale: de });
  
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Kostenvoranschlag ${estimate.reference_number}</title>
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
        <p class="customer-name">${customer ? `${customer.firstName} ${customer.lastName}` : 
           (estimate.firstname && estimate.lastname) ? `${estimate.firstname} ${estimate.lastname}` : 'Kunde'}</p>
        <p>${customer?.streetAddress || ''}</p>
        <p>${customer?.zipCode || ''} ${customer?.city || ''}</p>
      </div>
    
      <div class="document-title">Kostenvoranschlag</div>
      <div class="auftragsnummer">${estimate.reference_number}</div>
      <div class="document-date">Erstellt am: ${todayFormatted}</div>
    
      <!-- Geräteinformationen -->
      <div class="device-info-box">
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Hersteller</div>
                <div class="info-value">${estimate.brand}</div>
            </div>
        </div>
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Modell</div>
                <div class="info-value">${estimate.model}</div>
            </div>
        </div>
        <div class="info-column">
            <div class="info-item">
                <div class="info-label">Seriennummer</div>
                <div class="info-value">${estimate.serial_number || '-'}</div>
            </div>
        </div>
      </div>
    
      <!-- Fehlerbeschreibung -->
      <div class="section">
        <div class="section-title">Fehlerbeschreibung</div>
        <div class="box-content">${estimate.issue}</div>
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
            ${items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${item.unitPrice} €</td>
                <td class="text-right">${item.totalPrice} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="price-summary">
          <div class="price-row">
            <span class="price-label">Zwischensumme:</span>
            <span class="price-value">${estimate.subtotal} €</span>
          </div>
          <div class="price-row">
            <span class="price-label">MwSt (${estimate.tax_rate}%):</span>
            <span class="price-value">${estimate.tax_amount} €</span>
          </div>
          <div class="price-total">
            <span class="price-total-label">Gesamtbetrag:</span>
            <span class="price-total-value">${estimate.total} €</span>
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
        <p><strong>5.</strong> Dieser Kostenvoranschlag ist bis ${estimate.validUntil ? 
          new Date(estimate.validUntil).toLocaleDateString('de-DE') : 'unbegrenzt'} gültig.</p>
      </div>
    
      ${estimate.notes ? `
      <div class="section">
        <div class="section-title">Zusätzliche Notizen</div>
        <div class="box-content">${estimate.notes}</div>
      </div>
      ` : ''}
    </body>
    </html>
  `;
}