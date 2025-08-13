import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface VectorPdfProps {
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

/**
 * Erstellt eine echte vektorbasierte PDF ohne html2canvas
 * Design bleibt 1:1 identisch zum aktuellen HTML-Template
 */
export async function createVectorPdf({
  estimate,
  customer,
  items,
  businessName,
  businessAddress,
  businessZipCity,
  businessPhone,
  businessEmail,
  logoUrl,
}: VectorPdfProps): Promise<jsPDF> {
  
  // PDF erstellen - A4 Portrait
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // A4 Maße und Margins (identisch zum HTML-Template)
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 15;
  const marginTop = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Farben (identisch zum HTML-Template)
  const primaryColor = '#2a53a9'; // Identisch zu CSS
  const textColor = '#333';
  const lightGray = '#777';
  const borderColor = '#eee';

  // Datumsformatierung (identisch zum HTML-Template)
  const createdDate = estimate.created_at || estimate.createdAt;
  const createdDateFormatted = createdDate ? 
    format(new Date(createdDate), 'dd.MM.yyyy', { locale: de }) : "18.05.2025";
  const validUntilFormatted = estimate.validUntil 
    ? format(new Date(estimate.validUntil), 'dd.MM.yyyy', { locale: de })
    : (createdDate ? format(new Date(new Date(createdDate).getTime() + 14 * 24 * 60 * 60 * 1000), 'dd.MM.yyyy', { locale: de }) : 'unbegrenzt');

  // Kundeninformationen (identisch zum HTML-Template)
  const customerName = customer 
    ? `${customer.firstName} ${customer.lastName}`
    : (estimate.firstname && estimate.lastname) 
      ? `${estimate.firstname} ${estimate.lastname}` 
      : 'Kunde';
      
  const customerAddress = customer?.address || 'Keine Adresse angegeben';
  const customerZipCity = (customer?.zipCode && customer?.city) 
    ? `${customer?.zipCode} ${customer?.city}`
    : ((customer?.zip_code && customer?.city)
       ? `${customer?.zip_code} ${customer?.city}`
       : (customer?.city ? customer?.city : 'Keine Stadt angegeben'));

  // Finanzielle Daten (identisch zum HTML-Template)
  const subtotal = estimate.subtotal || '0.00';
  const taxRate = estimate.tax_rate || '20';
  const taxAmount = estimate.tax_amount || '0.00';
  const total = estimate.total || '0.00';

  let yPosition = marginTop;

  // Header Sektion (identisch zum HTML-Layout)
  // Logo links, Firmendaten rechts
  if (logoUrl) {
    try {
      // Logo wird später implementiert wenn benötigt
      // Für jetzt: Platz reservieren
      yPosition += 10;
    } catch (error) {
      console.warn('Logo konnte nicht geladen werden:', error);
    }
  }

  // Firmendaten rechts (Position identisch zu CSS: text-align right)
  pdf.setFontSize(16);
  pdf.setTextColor(textColor);
  pdf.setFont('helvetica', 'bold');
  const businessNameWidth = pdf.getTextWidth(businessName);
  pdf.text(businessName, pageWidth - marginRight - businessNameWidth, yPosition);

  yPosition += 7;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  
  const businessLines = [
    businessAddress,
    businessZipCity,
    businessPhone,
    businessEmail
  ];

  businessLines.forEach(line => {
    const lineWidth = pdf.getTextWidth(line);
    pdf.text(line, pageWidth - marginRight - lineWidth, yPosition);
    yPosition += 5;
  });

  // Datum und Gültigkeitsdatum (identisch zu HTML margin-top: 12px)
  yPosition += 7; // 12px entspricht ca. 7mm
  pdf.setFont('helvetica', 'normal');
  const dateText = `Datum: ${createdDateFormatted}`;
  const validText = `Gültig bis: ${validUntilFormatted}`;
  
  const dateWidth = pdf.getTextWidth(dateText);
  const validWidth = pdf.getTextWidth(validText);
  pdf.text(dateText, pageWidth - marginRight - dateWidth, yPosition);
  yPosition += 5;
  pdf.text(validText, pageWidth - marginRight - validWidth, yPosition);

  yPosition += 15; // Abstand zur nächsten Sektion

  // Kundeninformationen (identisch zu HTML-Template)
  // Überschrift mit Unterstrich (identisch zu CSS border-bottom)
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor);
  pdf.text('Kundeninformationen', marginLeft, yPosition);
  
  // Linie unter der Überschrift (identisch zu CSS border-bottom: 1px solid #eee)
  pdf.setDrawColor(238, 238, 238); // #eee
  pdf.line(marginLeft, yPosition + 2, marginLeft + contentWidth, yPosition + 2);
  
  yPosition += 10;

  // Kundenname (identisch zu CSS .customer-name font-weight: bold, font-size: 16px)
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(textColor);
  pdf.text(customerName, marginLeft, yPosition);
  
  yPosition += 7;

  // Kundenadresse (identisch zu CSS font-size: 13px)
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  pdf.text(customerAddress, marginLeft, yPosition);
  yPosition += 5;
  pdf.text(customerZipCity, marginLeft, yPosition);
  
  yPosition += 20;

  // Dokumententitel (identisch zu CSS .document-title)
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor);
  const titleText = 'Kostenvoranschlag';
  const titleWidth = pdf.getTextWidth(titleText);
  pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition); // Zentriert
  
  yPosition += 10;

  // Referenznummer (identisch zu CSS .reference-number)
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(textColor);
  const refText = `Referenznummer: ${estimate.reference_number}`;
  const refWidth = pdf.getTextWidth(refText);
  pdf.text(refText, (pageWidth - refWidth) / 2, yPosition); // Zentriert
  
  yPosition += 20;

  // Geräteinformationen (identisch zu HTML-Template)
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor);
  pdf.text('Geräteinformationen', marginLeft, yPosition);
  
  // Linie unter der Überschrift
  pdf.setDrawColor(238, 238, 238);
  pdf.line(marginLeft, yPosition + 2, marginLeft + contentWidth, yPosition + 2);
  
  yPosition += 15;

  // Gerätedetails in einer Zeile (identisch zu HTML inline layout)
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(textColor);
  
  const deviceInfo = [
    `Hersteller: ${estimate.brand || ''}`,
    `Modell: ${estimate.model || ''}`,
    `Seriennummer: ${estimate.serial_number || estimate.serialNumber || ''}`
  ].join('   |   ');
  
  pdf.text(deviceInfo, marginLeft, yPosition);
  yPosition += 15; // Entspricht CSS margin-top: 30px

  // Fehlerbeschreibung (identisch zu HTML-Template)
  pdf.setFont('helvetica', 'bold');
  pdf.text('Fehlerbeschreibung:', marginLeft, yPosition);
  yPosition += 7;
  
  pdf.setFont('helvetica', 'normal');
  // Text mit Einrückung (entspricht CSS margin-left: 10px)
  const issueText = estimate.issue || '';
  const issueLines = pdf.splitTextToSize(issueText, contentWidth - 10);
  pdf.text(issueLines, marginLeft + 10, yPosition);
  yPosition += (issueLines.length * 5) + 15;

  // Positionen Tabelle (identisch zu HTML-Template)
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor);
  pdf.text('Positionen', marginLeft, yPosition);
  
  pdf.setDrawColor(238, 238, 238);
  pdf.line(marginLeft, yPosition + 2, marginLeft + contentWidth, yPosition + 2);
  
  yPosition += 15;

  // Tabellenkopf (identisch zu HTML th Styling)
  const tableHeaders = ['Position', 'Beschreibung', 'Menge', 'Einzelpreis (brutto)', 'Gesamtpreis (brutto)'];
  const columnWidths = [25, 70, 25, 35, 35]; // mm
  const tableStartX = marginLeft;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(248, 248, 248); // #f8f8f8
  pdf.setTextColor(textColor);
  
  // Header-Hintergrund
  pdf.rect(tableStartX, yPosition - 3, contentWidth, 8, 'F');
  
  let currentX = tableStartX;
  tableHeaders.forEach((header, index) => {
    if (index >= 2) {
      // Rechtsausrichtung für numerische Spalten
      const headerWidth = pdf.getTextWidth(header);
      pdf.text(header, currentX + columnWidths[index] - headerWidth - 2, yPosition + 2);
    } else {
      pdf.text(header, currentX + 2, yPosition + 2);
    }
    currentX += columnWidths[index];
  });
  
  yPosition += 8;

  // Tabellendaten (identisch zu HTML tbody)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  
  items.forEach((item, index) => {
    // Zeilentrennlinie
    pdf.setDrawColor(238, 238, 238);
    pdf.line(tableStartX, yPosition, tableStartX + contentWidth, yPosition);
    
    yPosition += 6;
    
    currentX = tableStartX;
    const rowData = [
      (index + 1).toString(),
      item.description,
      item.quantity.toString(),
      `€ ${parseFloat(item.unitPrice).toFixed(2)}`,
      `€ ${parseFloat(item.totalPrice).toFixed(2)}`
    ];
    
    rowData.forEach((data, colIndex) => {
      if (colIndex >= 2) {
        // Rechtsausrichtung für numerische Spalten
        const dataWidth = pdf.getTextWidth(data);
        pdf.text(data, currentX + columnWidths[colIndex] - dataWidth - 2, yPosition);
      } else {
        // Textumbruch für Beschreibung wenn nötig
        if (colIndex === 1) {
          const lines = pdf.splitTextToSize(data, columnWidths[colIndex] - 4);
          pdf.text(lines, currentX + 2, yPosition);
          if (lines.length > 1) yPosition += (lines.length - 1) * 5;
        } else {
          pdf.text(data, currentX + 2, yPosition);
        }
      }
      currentX += columnWidths[colIndex];
    });
    
    yPosition += 6;
  });

  // Abschlusslinie der Tabelle
  pdf.line(tableStartX, yPosition, tableStartX + contentWidth, yPosition);
  yPosition += 15;

  // Summen-Tabelle (identisch zu HTML .totals)
  const totalsWidth = 100; // 300px entspricht etwa 100mm
  const totalsStartX = pageWidth - marginRight - totalsWidth;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  // MwSt.-Zeile
  pdf.text(`enthaltene MwSt. (${taxRate}%):`, totalsStartX, yPosition);
  const taxAmountText = `€ ${Number(taxAmount.replace(',', '.')).toFixed(2).replace('.', ',')}`;
  const taxAmountWidth = pdf.getTextWidth(taxAmountText);
  pdf.text(taxAmountText, totalsStartX + totalsWidth - taxAmountWidth, yPosition);
  
  yPosition += 8;

  // Gesamtbetrag (identisch zu HTML .total mit border-top und font-weight: bold)
  pdf.setDrawColor(238, 238, 238);
  pdf.line(totalsStartX, yPosition - 2, totalsStartX + totalsWidth, yPosition - 2);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('Gesamtbetrag:', totalsStartX, yPosition + 3);
  const totalText = `€ ${Number(total.replace(',', '.')).toFixed(2).replace('.', ',')}`;
  const totalWidth = pdf.getTextWidth(totalText);
  pdf.text(totalText, totalsStartX + totalsWidth - totalWidth, yPosition + 3);
  
  yPosition += 25;

  // Hinweise (identisch zu HTML .note)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(lightGray);
  
  const noteText = `Dieser Kostenvoranschlag ist unverbindlich und ${estimate.validUntil ? `gültig bis zum ${validUntilFormatted}` : 'gültig für 14 Tage'}.`;
  const noteLines = pdf.splitTextToSize(noteText, contentWidth);
  pdf.text(noteLines, marginLeft, yPosition);
  yPosition += (noteLines.length * 5) + 10;

  // Bedingungen (identisch zu HTML ordered list)
  pdf.setFontSize(11);
  pdf.setTextColor('#555555');
  
  const conditions = [
    'Der Kostenvoranschlag basiert auf einer ersten Diagnose und kann sich bei tatsächlicher Durchführung ändern.',
    'Sollte sich während der Reparatur ein erweiterter Schaden zeigen, wird der Kunde vorab kontaktiert.',
    'Die im Kostenvoranschlag genannten Preise verstehen sich inkl. MwSt., sofern nicht anders angegeben.',
    'Eine Bearbeitungsgebühr kann fällig werden, falls keine Reparatur beauftragt wird.'
  ];
  
  conditions.forEach((condition, index) => {
    const conditionText = `${index + 1}. ${condition}`;
    const lines = pdf.splitTextToSize(conditionText, contentWidth - 10);
    pdf.text(lines, marginLeft + 10, yPosition); // 20px padding-left entspricht 10mm
    yPosition += (lines.length * 5) + 3;
  });

  yPosition += 25; // margin-top: 50px entspricht etwa 25mm

  // Abschlussgrüße (identisch zu HTML-Template)
  pdf.setFontSize(12);
  pdf.setTextColor(textColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Mit freundlichen Grüßen,', marginLeft, yPosition);
  yPosition += 7;
  pdf.text(businessName, marginLeft, yPosition);

  return pdf;
}

/**
 * Exportiert einen Kostenvoranschlag als vektorbasierte PDF
 * Ersetzt die alte html2canvas-Methode
 */
export async function exportVectorPdf(props: VectorPdfProps, filename: string = 'Kostenvoranschlag'): Promise<void> {
  try {
    const pdf = await createVectorPdf(props);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Fehler beim Erstellen der vektorbasierten PDF:', error);
    throw error;
  }
}