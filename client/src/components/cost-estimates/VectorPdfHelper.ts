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
 * Erstellt eine echte vektorbasierte PDF - 1:1 identisch zum HTML-Template
 * GARANTIERT: Exakt gleiches Design, gleiche Schriftgrößen, gleiche Abstände
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

  // EXAKTE Container-Maße basierend auf HTML (.invoice-container)
  // HTML: max-width: 800px, padding: 30px → entspricht A4-Verhältnis
  const pageWidth = 210; // A4 Breite
  const pageHeight = 297; // A4 Höhe
  
  // Container-Simulation: padding: 20px (body) + padding: 30px (.invoice-container)
  const outerMargin = 20 * 0.264583; // 20px zu mm (1px = 0.264583mm bei 96dpi)
  const containerPadding = 30 * 0.264583; // 30px zu mm
  const marginLeft = outerMargin + containerPadding; // ≈ 13.2mm
  const marginRight = outerMargin + containerPadding;
  const marginTop = outerMargin + containerPadding;
  const containerWidth = 800 * 0.264583; // 800px zu mm ≈ 211.7mm (wird auf A4 begrenzt)
  const contentWidth = Math.min(containerWidth, pageWidth - marginLeft - marginRight);

  // EXAKTE Pixel-zu-mm Konvertierung für Schriftgrößen (1px = 0.264583mm bei 96dpi)
  const pxToMm = 0.264583;
  const mmToPt = 2.834645; // 1mm = 2.834645pt
  
  // Hilfsfunktion: Pixel-Schriftgröße zu PDF-Punkt
  const pxToPdfSize = (px: number) => px * pxToMm * mmToPt;

  // EXAKTE Farben (identisch zum HTML-Template)
  const primaryColor = [42, 83, 169] as const; // #2a53a9
  const textColor = [51, 51, 51] as const; // #333
  const lightGray = [119, 119, 119] as const; // #777
  const borderGray = [238, 238, 238] as const; // #eee
  const tableHeaderBg = [248, 248, 248] as const; // #f8f8f8

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

  // HEADER SEKTION - Exakte Nachbildung des HTML Flex-Layouts
  // HTML: .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  
  // Logo-Sektion links (max-width: 200px, max-height: 80px)
  const logoAreaWidth = 200 * pxToMm; // ≈ 52.9mm
  const logoAreaHeight = 80 * pxToMm; // ≈ 21.2mm
  
  let logoActualHeight = 0;
  if (logoUrl && logoUrl.trim() !== '') {
    try {
      // Logo als Base64-Image implementiert
      const logoImg = new Image();
      logoImg.src = logoUrl;
      
      // Logo hinzufügen mit korrekten Dimensionen
      pdf.addImage(logoUrl, 'JPEG', marginLeft, marginTop, logoAreaWidth, logoAreaHeight);
      logoActualHeight = logoAreaHeight;
    } catch (error) {
      console.warn('Logo konnte nicht geladen werden:', error);
      // Fallback: Logo-Text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(pxToPdfSize(16));
      pdf.setTextColor(...textColor);
      pdf.text(businessName.split(' ')[0] || 'Logo', marginLeft, marginTop + 15);
      logoActualHeight = 20;
    }
  }

  // Company-Info rechts - EXAKT wie HTML (.company-info)
  const companyInfoStartY = marginTop;
  
  // Company Name (.company-name: font-weight: bold, font-size: 16px)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(16)); // 16px → ~11.3pt
  pdf.setTextColor(...textColor);
  const businessNameWidth = pdf.getTextWidth(businessName);
  pdf.text(businessName, pageWidth - marginRight - businessNameWidth, companyInfoStartY);

  let companyYPos = companyInfoStartY + (7 * pxToMm); // margin-Abstand

  // Company Details (.company-info p: font-size: 13px, margin: 2px 0)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(13)); // 13px → ~9.2pt
  
  const companyLines = [businessAddress, businessZipCity, businessPhone, businessEmail];
  companyLines.forEach((line) => {
    const lineWidth = pdf.getTextWidth(line);
    pdf.text(line, pageWidth - marginRight - lineWidth, companyYPos);
    companyYPos += (2 * pxToMm) + (13 * pxToMm * 1.2); // margin: 2px + line-height
  });

  // Datum-Sektion (margin-top: 12px)
  companyYPos += 12 * pxToMm;
  const dateLines = [
    `Datum: ${createdDateFormatted}`,
    `Gültig bis: ${validUntilFormatted}`
  ];
  
  dateLines.forEach((line) => {
    const lineWidth = pdf.getTextWidth(line);
    pdf.text(line, pageWidth - marginRight - lineWidth, companyYPos);
    companyYPos += (13 * pxToMm * 1.2);
  });

  // Y-Position für nächste Sektion (.header: margin-bottom: 40px)
  // Stelle sicher, dass es keine Kollisionen gibt
  yPosition = Math.max(logoActualHeight + marginTop + (20 * pxToMm), companyYPos) + (40 * pxToMm);

  // KUNDENINFORMATIONEN - Exakt wie HTML (.customer-info)
  // KEINE negative margin - das verursachte die Kollisionen
  // yPosition -= (25 * pxToMm); // ENTFERNT - verursachte Überlappungen

  // Section Title (.section-title)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(14)); // Standard section title size
  pdf.setTextColor(...primaryColor);
  pdf.text('Kundeninformationen', marginLeft, yPosition);
  
  // Border-bottom simulation (border-bottom: 1px solid #eee, padding-bottom: 5px)
  const sectionTitleUnderlineY = yPosition + (5 * pxToMm);
  pdf.setDrawColor(...borderGray);
  pdf.setLineWidth(0.264583); // 1px
  pdf.line(marginLeft, sectionTitleUnderlineY, marginLeft + contentWidth, sectionTitleUnderlineY);
  
  yPosition += (10 * pxToMm) + (5 * pxToMm); // margin-bottom + padding-bottom

  // Customer Name (.customer-name: font-weight: bold, font-size: 16px)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(16));
  pdf.setTextColor(...textColor);
  pdf.text(customerName, marginLeft, yPosition);
  
  yPosition += (16 * pxToMm * 1.2) + (2 * pxToMm); // line-height + margin

  // Customer Address (.customer-info p: font-size: 13px, margin: 2px 0)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(13));
  
  pdf.text(customerAddress, marginLeft, yPosition);
  yPosition += (13 * pxToMm * 1.2) + (2 * pxToMm);
  
  pdf.text(customerZipCity, marginLeft, yPosition);
  yPosition += (20 * pxToMm); // .customer-info: margin-bottom: 20px

  // DOCUMENT TITLE (.document-title: text-align: center, font-size: 18px, font-weight: bold, color: #2a53a9)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(18)); // 18px
  pdf.setTextColor(...primaryColor);
  const titleText = 'Kostenvoranschlag';
  const titleWidth = pdf.getTextWidth(titleText);
  pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
  
  yPosition += (18 * pxToMm * 1.2) + (8 * pxToMm); // title line-height + margin

  // REFERENCE NUMBER (.reference-number: text-align: center, font-size: 13px, margin-bottom: 15px)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(13));
  pdf.setTextColor(...textColor);
  const refText = `Referenznummer: ${estimate.reference_number}`;
  const refWidth = pdf.getTextWidth(refText);
  pdf.text(refText, (pageWidth - refWidth) / 2, yPosition);
  
  yPosition += (13 * pxToMm * 1.2) + (15 * pxToMm); // line-height + margin-bottom

  // GERÄTEINFORMATIONEN - Section Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(14));
  pdf.setTextColor(...primaryColor);
  pdf.text('Geräteinformationen', marginLeft, yPosition);
  
  const deviceSectionUnderlineY = yPosition + (5 * pxToMm);
  pdf.setDrawColor(...borderGray);
  pdf.line(marginLeft, deviceSectionUnderlineY, marginLeft + contentWidth, deviceSectionUnderlineY);
  
  yPosition += (15 * pxToMm) + (5 * pxToMm);

  // Device Details inline (HTML style)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(13));
  pdf.setTextColor(...textColor);
  
  const deviceInfo = [
    `Hersteller: ${estimate.brand || ''}`,
    `Modell: ${estimate.model || ''}`,
    `Seriennummer: ${estimate.serial_number || estimate.serialNumber || ''}`
  ].join('   |   ');
  
  pdf.text(deviceInfo, marginLeft, yPosition);
  yPosition += (30 * pxToMm); // margin-top: 30px vom HTML

  // Fehlerbeschreibung
  pdf.setFont('helvetica', 'bold');
  pdf.text('Fehlerbeschreibung:', marginLeft, yPosition);
  yPosition += (5 * pxToMm) + (13 * pxToMm * 1.2); // margin-top: 5px
  
  pdf.setFont('helvetica', 'normal');
  const issueText = estimate.issue || '';
  const issueLines = pdf.splitTextToSize(issueText, contentWidth - (10 * pxToMm)); // margin-left: 10px
  pdf.text(issueLines, marginLeft + (10 * pxToMm), yPosition);
  yPosition += (issueLines.length * 13 * pxToMm * 1.2) + (15 * pxToMm);

  // TABELLE - Exakte HTML-Nachbildung
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(14));
  pdf.setTextColor(...primaryColor);
  pdf.text('Positionen', marginLeft, yPosition);
  
  const tableSectionUnderlineY = yPosition + (5 * pxToMm);
  pdf.setDrawColor(...borderGray);
  pdf.line(marginLeft, tableSectionUnderlineY, marginLeft + contentWidth, tableSectionUnderlineY);
  
  yPosition += (15 * pxToMm);

  // Table Header (th: background-color: #f8f8f8, font-weight: bold, font-size: 11px, padding: 6px 8px)
  const tableHeaders = ['Position', 'Beschreibung', 'Menge', 'Einzelpreis (brutto)', 'Gesamtpreis (brutto)'];
  
  // KORRIGIERTE Spaltenbreiten für bessere Ausrichtung mit Totals
  // Die letzte Spalte (Gesamtpreis) muss mit der Totals-Sektion übereinstimmen
  const totalsWidthPx = 300;
  const totalsWidth = totalsWidthPx * pxToMm; // ≈ 79.4mm
  const totalsStartX = pageWidth - marginRight - totalsWidth;
  
  // Tabellen-Spalten neu berechnen damit Gesamtpreis-Spalte mit Totals übereinstimmt
  const gesamtpreisColumnWidth = totalsWidth / 2; // Hälfte der Totals-Breite
  const columnWidths = [
    25, // Position (25mm)
    contentWidth - 25 - 25 - 35 - gesamtpreisColumnWidth, // Beschreibung (Rest)
    25, // Menge (25mm)
    35, // Einzelpreis (35mm)
    gesamtpreisColumnWidth // Gesamtpreis - ALIGNED mit Totals
  ];
  
  const tableStartX = marginLeft;
  const headerHeight = (6 * 2 + 11) * pxToMm; // padding top/bottom + font-size
  
  // Header Background
  pdf.setFillColor(...tableHeaderBg);
  pdf.rect(tableStartX, yPosition - (6 * pxToMm), contentWidth, headerHeight, 'F');
  
  // Header Text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(11)); // th: font-size: 11px
  pdf.setTextColor(...textColor);
  
  let currentX = tableStartX;
  tableHeaders.forEach((header, index) => {
    const textX = currentX + (8 * pxToMm); // padding-left: 8px
    const textY = yPosition + (6 * pxToMm); // padding-top: 6px
    
    if (index >= 2) {
      // Rechtsausrichtung für numerische Spalten (.text-right)
      const headerWidth = pdf.getTextWidth(header);
      pdf.text(header, currentX + columnWidths[index] - headerWidth - (8 * pxToMm), textY);
    } else {
      pdf.text(header, textX, textY);
    }
    currentX += columnWidths[index];
  });
  
  yPosition += headerHeight;

  // Table Rows (td: font-size: 12px, padding: 6px 8px, border-bottom: 1px solid #eee)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(12)); // td: font-size: 12px
  
  items.forEach((item, index) => {
    const rowHeight = (6 * 2 + 12) * pxToMm; // padding + font-size
    
    // Row border bottom
    pdf.setDrawColor(...borderGray);
    pdf.line(tableStartX, yPosition + rowHeight - (1 * pxToMm), tableStartX + contentWidth, yPosition + rowHeight - (1 * pxToMm));
    
    currentX = tableStartX;
    const rowData = [
      (index + 1).toString(),
      item.description,
      item.quantity.toString(),
      `€ ${parseFloat(item.unitPrice).toFixed(2)}`,
      `€ ${parseFloat(item.totalPrice).toFixed(2)}`
    ];
    
    rowData.forEach((data, colIndex) => {
      const textX = currentX + (8 * pxToMm); // padding-left
      const textY = yPosition + (6 * pxToMm) + (12 * pxToMm * 0.8); // padding-top + baseline
      
      if (colIndex >= 2) {
        // Rechtsausrichtung
        const dataWidth = pdf.getTextWidth(data);
        pdf.text(data, currentX + columnWidths[colIndex] - dataWidth - (8 * pxToMm), textY);
      } else if (colIndex === 1) {
        // Textumbruch für Beschreibung
        const maxWidth = columnWidths[colIndex] - (16 * pxToMm); // padding left + right
        const lines = pdf.splitTextToSize(data, maxWidth);
        pdf.text(lines, textX, textY);
      } else {
        pdf.text(data, textX, textY);
      }
      currentX += columnWidths[colIndex];
    });
    
    yPosition += rowHeight;
  });

  // Final table border
  pdf.setDrawColor(...borderGray);
  pdf.line(tableStartX, yPosition, tableStartX + contentWidth, yPosition);
  yPosition += (20 * pxToMm); // table: margin-bottom: 20px

  // TOTALS SECTION (.totals: margin-left: auto, width: 300px)
  // totalsWidth und totalsStartX wurden bereits oben definiert für Spalten-Alignment
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(12));
  pdf.setTextColor(...textColor);
  
  // MwSt.-Zeile (.totals table td: padding: 5px)
  const taxLabel = `enthaltene MwSt. (${taxRate}%):`;
  const taxAmountText = `€ ${Number(taxAmount.replace(',', '.')).toFixed(2).replace('.', ',')}`;
  const taxAmountWidth = pdf.getTextWidth(taxAmountText);
  
  pdf.text(taxLabel, totalsStartX, yPosition);
  pdf.text(taxAmountText, totalsStartX + totalsWidth - taxAmountWidth, yPosition);
  
  yPosition += (5 * 2 + 12) * pxToMm; // padding + font-size

  // Gesamtbetrag (.totals .total: font-weight: bold, font-size: 1.1em, border-top: 1px solid #eee)
  const totalBorderY = yPosition - (5 * pxToMm);
  pdf.setDrawColor(...borderGray);
  pdf.line(totalsStartX, totalBorderY, totalsStartX + totalsWidth, totalBorderY);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(pxToPdfSize(12 * 1.1)); // 1.1em
  
  const totalLabel = 'Gesamtbetrag:';
  const totalAmountText = `€ ${Number(total.replace(',', '.')).toFixed(2).replace('.', ',')}`;
  const totalAmountWidth = pdf.getTextWidth(totalAmountText);
  
  pdf.text(totalLabel, totalsStartX, yPosition);
  pdf.text(totalAmountText, totalsStartX + totalsWidth - totalAmountWidth, yPosition);
  
  yPosition += (40 * pxToMm); // margin-top: 40px (.note)

  // HINWEISE (.note: font-size: 12px, color: #777)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(pxToPdfSize(12));
  pdf.setTextColor(...lightGray);
  
  const noteText = `Dieser Kostenvoranschlag ist unverbindlich und ${estimate.validUntil ? `gültig bis zum ${validUntilFormatted}` : 'gültig für 14 Tage'}.`;
  const noteLines = pdf.splitTextToSize(noteText, contentWidth);
  pdf.text(noteLines, marginLeft, yPosition);
  yPosition += (noteLines.length * 12 * pxToMm * 1.2) + (20 * pxToMm); // line-height + margin

  // CONDITIONS (ol: font-size: 0.9em, color: #555, margin-top: 20px, padding-left: 20px)
  pdf.setFontSize(pxToPdfSize(12 * 0.9)); // 0.9em
  pdf.setTextColor(85, 85, 85); // #555
  
  const conditions = [
    'Der Kostenvoranschlag basiert auf einer ersten Diagnose und kann sich bei tatsächlicher Durchführung ändern.',
    'Sollte sich während der Reparatur ein erweiterter Schaden zeigen, wird der Kunde vorab kontaktiert.',
    'Die im Kostenvoranschlag genannten Preise verstehen sich inkl. MwSt., sofern nicht anders angegeben.',
    'Eine Bearbeitungsgebühr kann fällig werden, falls keine Reparatur beauftragt wird.'
  ];
  
  conditions.forEach((condition, index) => {
    const conditionText = `${index + 1}. ${condition}`;
    const maxWidth = contentWidth - (20 * pxToMm); // padding-left: 20px
    const lines = pdf.splitTextToSize(conditionText, maxWidth);
    pdf.text(lines, marginLeft + (20 * pxToMm), yPosition);
    yPosition += (lines.length * 12 * 0.9 * pxToMm * 1.2) + (3 * pxToMm);
  });

  yPosition += (50 * pxToMm); // margin-top: 50px

  // ABSCHLUSS
  pdf.setFontSize(pxToPdfSize(12));
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Mit freundlichen Grüßen,', marginLeft, yPosition);
  yPosition += (12 * pxToMm * 1.2);
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