import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PrintTemplateProps {
  estimate: any;
  customer: any;
  items: any[];
  businessName: string;
  businessAddress: string;
  businessZipCity: string;
  businessPhone: string;
  businessEmail: string;
  logoUrl?: string;
}

export function generatePrintHtml({
  estimate,
  customer,
  items,
  businessName,
  businessAddress,
  businessZipCity,
  businessPhone,
  businessEmail,
  logoUrl
}: PrintTemplateProps): string {
  // Formatiere die Datumsangaben
  const today = new Date();
  const todayFormatted = format(today, 'dd.MM.yyyy', { locale: de });
  const validUntilFormatted = estimate.validUntil 
    ? format(new Date(estimate.validUntil), 'dd.MM.yyyy', { locale: de })
    : format(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), 'dd.MM.yyyy', { locale: de });
  
  // Kundenanzeigename vorbereiten
  const customerName = customer 
    ? `${customer.firstName} ${customer.lastName}`
    : (estimate.firstname && estimate.lastname) 
      ? `${estimate.firstname} ${estimate.lastname}` 
      : 'Kunde';
  
  // Kundenadresse vorbereiten
  const customerAddress = customer?.address || 'Neubaugasse 7';
  // Hier stellen wir sicher, dass die Postleitzahl immer angezeigt wird
  const customerZipCity = (customer?.zip_code && customer?.city) 
    ? `${customer?.zip_code} ${customer?.city}`
    : ((!customer?.zip_code && customer?.city)
       ? `1070 ${customer?.city}`
       : '1070 Wien');

  // Subtotal, Steuer und Gesamtbetrag formatieren
  const subtotal = estimate.subtotal || '0.00';
  const taxRate = estimate.tax_rate || '20';
  const taxAmount = estimate.tax_amount || '0.00';
  const total = estimate.total || '0.00';

  // Erstelle das HTML für die Druckvorlage
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Kostenvoranschlag ${estimate.reference_number}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          font-size: 14px;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 30px;
          border: 1px solid #eee;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          background-color: #fff;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        
        .logo {
          max-width: 200px;
          max-height: 80px;
        }
        
        .company-info, .customer-info {
          margin-bottom: 30px;
        }
        
        .company-info p, .customer-info p {
          margin: 3px 0;
        }
        
        .company-name, .customer-name {
          font-weight: bold;
          font-size: 16px;
        }
        
        .document-info {
          margin-bottom: 30px;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
          padding: 10px 0;
        }
        
        .document-title {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 20px 0 10px 0;
          color: #2a53a9;
        }
        
        .reference-number {
          text-align: center;
          font-size: 14px;
          margin-bottom: 20px;
        }
        
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #2a53a9;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        table th, table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        table th {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        
        .text-right {
          text-align: right;
        }
        
        .totals {
          margin-top: 20px;
          margin-left: auto;
          width: 300px;
        }
        
        .totals table {
          width: 100%;
        }
        
        .totals table td, .totals table th {
          border: none;
          padding: 5px;
        }
        
        .totals table tr.total {
          font-weight: bold;
          font-size: 1.1em;
          border-top: 1px solid #eee;
        }
        
        .note {
          margin-top: 40px;
          font-size: 12px;
          color: #777;
        }
        
        .device-info {
          margin-bottom: 30px;
        }
        
        .device-info p {
          margin: 5px 0;
        }
        
        .device-details, .financial-details {
          display: flex;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .device-details div, .financial-details div {
          flex: 1;
          min-width: 200px;
          margin-bottom: 10px;
        }
        
        .label {
          font-weight: bold;
          display: inline-block;
          min-width: 120px;
        }
        
        .value {
          display: inline-block;
        }
        
        @media print {
          body {
            padding: 0;
            background-color: #fff;
          }
          
          .invoice-container {
            border: none;
            box-shadow: none;
            padding: 0;
            max-width: 100%;
          }
          
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <p class="company-name">${businessName}</p>
            <p>${businessAddress}<br>
            ${businessZipCity}<br>
            ${businessPhone}<br>
            ${businessEmail}</p>
          </div>
        </div>
        
        <div class="logo-container" style="text-align: center; margin: 20px 0;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : '<img src="https://macandphonedoc.at/wp-content/uploads/2023/10/Mac-and-Phonedoc.png" alt="Logo" class="logo" style="max-width: 200px;">'}
        </div>
      
        <div class="customer-info">
          <div class="section-title">Kundeninformationen</div>
          <p class="customer-name">${customerName}</p>
          <p>${customerAddress}</p>
          <p>${customerZipCity}</p>
        </div>
      
        <div class="document-title">Kostenvoranschlag</div>
        <div class="reference-number">Referenznummer: ${estimate.reference_number}</div>
        
        <div class="document-info">
          <p>Datum: ${todayFormatted} | Gültig bis: ${validUntilFormatted}</p>
        </div>
        
        <div class="device-info">
          <div class="section-title">Geräteinformationen</div>
          <div class="device-details">
            <div>
              <p><span class="label">Gerätetyp:</span> <span class="value">${estimate.deviceType || 'Smartphone'}</span></p>
              <p><span class="label">Hersteller:</span> <span class="value">${estimate.brand || ''}</span></p>
              <p><span class="label">Modell:</span> <span class="value">${estimate.model || ''}</span></p>
            </div>
            <div>
              <p><span class="label">Seriennummer:</span> <span class="value">${estimate.serial_number || ''}</span></p>
              <p><span class="label">Fehlerbeschreibung:</span> <span class="value">${estimate.issue || ''}</span></p>
            </div>
          </div>
        </div>
        
        <div class="section-title">Positionen</div>
        <table>
          <thead>
            <tr>
              <th>Position</th>
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
                <td class="text-right">€ ${parseFloat(item.unitPrice).toFixed(2)}</td>
                <td class="text-right">€ ${parseFloat(item.totalPrice).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <table>
            <tr>
              <td>Zwischensumme:</td>
              <td class="text-right">€ ${parseFloat(subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td>MwSt. (${taxRate}%):</td>
              <td class="text-right">€ ${parseFloat(taxAmount).toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Gesamtbetrag:</td>
              <td class="text-right">€ ${parseFloat(total).toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div class="note">
          <p>Dieser Kostenvoranschlag ist unverbindlich und ${estimate.validUntil ? `gültig bis zum ${validUntilFormatted}` : 'gültig für 14 Tage'}.</p>
          <p>Mit freundlichen Grüßen,<br>${businessName}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}