import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface RepairData {
  id: number;
  orderCode: string;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  status: string;
  description?: string;
  estimatedCost?: string;
  createdAt: string;
  dropoffSignature?: string;
  pickupSignature?: string;
  dropoffQrCode?: string;
  pickupQrCode?: string;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  street?: string;
  zipCode?: string;
  city?: string;
}

interface BusinessSettings {
  businessName: string;
  streetAddress: string;
  zipCode: string;
  city: string;
  phone: string;
  email: string;
  logoImage?: string;
  repairTerms?: string;
}

interface RepairPdfProps {
  repair: RepairData;
  customer: CustomerData;
  businessSettings: BusinessSettings;
  logoUrl?: string;
}

// Logo zu Base64 konvertieren (gleiche Logik wie bei Kostenvoranschlägen)
async function convertImageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Fehler beim Konvertieren des Logos:', error);
    return null;
  }
}

// Datum formatieren
function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
  } catch (e) {
    return dateString || 'k.A.';
  }
}

// Haupt-PDF-Erstellungsfunktion
export async function createVectorRepairPdf(props: RepairPdfProps): Promise<jsPDF> {
  const { repair, customer, businessSettings } = props;
  
  // PDF initialisieren
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Schriftarten laden
  pdf.setFont('helvetica');
  
  // Seitenparameter
  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  
  let currentY = topMargin;

  // Logo verarbeiten (falls vorhanden)
  let logoBase64: string | null = null;
  if (businessSettings.logoImage) {
    logoBase64 = await convertImageToBase64(businessSettings.logoImage);
  }

  // Header: Logo links + Firmendaten rechts
  const headerHeight = 25;
  
  // Logo links (falls vorhanden)
  if (logoBase64) {
    try {
      const logoWidth = 50;
      const logoHeight = 20;
      pdf.addImage(logoBase64, 'PNG', leftMargin, currentY, logoWidth, logoHeight);
    } catch (error) {
      console.warn('Logo konnte nicht hinzugefügt werden:', error);
    }
  }
  
  // Firmendaten rechts
  const businessDataX = pageWidth - rightMargin;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(businessSettings.businessName || 'Handyshop Verwaltung', businessDataX, currentY + 4, { align: 'right' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  let businessY = currentY + 8;
  pdf.text(businessSettings.streetAddress || 'Amerlingstraße 19', businessDataX, businessY, { align: 'right' });
  businessY += 4;
  pdf.text(`${businessSettings.zipCode || '1060'} ${businessSettings.city || 'Wien'}`, businessDataX, businessY, { align: 'right' });
  businessY += 4;
  pdf.text(businessSettings.phone || '+4314103511', businessDataX, businessY, { align: 'right' });
  businessY += 4;
  pdf.text(businessSettings.email || 'office@macandphonedoc.at', businessDataX, businessY, { align: 'right' });
  
  currentY += headerHeight + 15;

  // Kundeninformationen
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Kundeninformationen', leftMargin, currentY);
  currentY += 6;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${customer.firstName} ${customer.lastName}`, leftMargin, currentY);
  currentY += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  if (customer.street) {
    pdf.text(customer.street, leftMargin, currentY);
    currentY += 4;
  }
  if (customer.zipCode || customer.city) {
    pdf.text(`${customer.zipCode || ''} ${customer.city || ''}`.trim(), leftMargin, currentY);
    currentY += 4;
  }
  
  currentY += 10;

  // Dokumententitel und Auftragsnummer (zentriert)
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Reparaturauftrag', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;
  
  pdf.setFontSize(14);
  pdf.text(repair.orderCode, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Gerätedaten & Reparaturdetails Box
  const boxY = currentY;
  const boxHeight = 35;
  const boxWidth = contentWidth;
  
  // Grauer Hintergrund
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(leftMargin, boxY, boxWidth, boxHeight, 2, 2, 'F');
  
  // Box-Rahmen
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(leftMargin, boxY, boxWidth, boxHeight, 2, 2, 'S');
  
  // Linke Spalte: Gerätedaten
  const leftColumnX = leftMargin + 8;
  let leftY = boxY + 8;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gerätedaten', leftColumnX, leftY);
  leftY += 6;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  const addDeviceDataLine = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold');
    const labelWidth = pdf.getTextWidth(label + ': ');
    pdf.text(label + ':', leftColumnX, leftY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, leftColumnX + labelWidth, leftY);
    leftY += 4;
  };
  
  addDeviceDataLine('Gerätetyp', repair.deviceType);
  addDeviceDataLine('Marke', repair.brand);
  addDeviceDataLine('Modell', repair.model);
  addDeviceDataLine('Telefon', customer.phone || 'k.A.');
  addDeviceDataLine('E-Mail', customer.email || 'k.A.');
  
  // Rechte Spalte: Reparaturdetails
  const rightColumnX = leftMargin + (boxWidth / 2) + 8;
  let rightY = boxY + 8;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Reparaturdetails', rightColumnX, rightY);
  rightY += 6;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  const addRepairDataLine = (label: string, value: string) => {
    pdf.setFont('helvetica', 'bold');
    const labelWidth = pdf.getTextWidth(label + ': ');
    pdf.text(label + ':', rightColumnX, rightY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, rightColumnX + labelWidth, rightY);
    rightY += 4;
  };
  
  addRepairDataLine('Problem', repair.issue);
  addRepairDataLine('Status', repair.status);
  addRepairDataLine('Abgegeben am', formatDate(repair.createdAt));
  if (repair.estimatedCost) {
    addRepairDataLine('Kostenvoranschlag', `€${repair.estimatedCost}`);
  }
  
  currentY = boxY + boxHeight + 12;

  // Fehlerbeschreibung (falls vorhanden)
  if (repair.description) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fehlerbeschreibung', leftMargin, currentY);
    currentY += 6;
    
    // Beschreibungs-Box
    const descHeight = 20;
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(leftMargin, currentY, contentWidth, descHeight, 1, 1, 'FD');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    
    // Text in der Box (mit Zeilenumbruch)
    const lines = pdf.splitTextToSize(repair.description, contentWidth - 6);
    pdf.text(lines, leftMargin + 3, currentY + 5);
    
    currentY += descHeight + 12;
  }

  // Reparaturbedingungen (falls vorhanden)
  if (businessSettings.repairTerms) {
    // Prüfen ob noch genug Platz auf der Seite ist, sonst neue Seite
    const remainingSpace = pageHeight - currentY - 80; // 80mm für Unterschriften reserviert
    const estimatedTermsHeight = businessSettings.repairTerms.length * 0.1; // Grobe Schätzung
    
    if (remainingSpace < Math.max(40, estimatedTermsHeight)) {
      pdf.addPage();
      currentY = topMargin;
    }
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Reparaturbedingungen', leftMargin, currentY);
    currentY += 6;
    
    // Reparaturbedingungen-Box
    const termsHeight = Math.max(25, Math.min(40, estimatedTermsHeight));
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(leftMargin, currentY, contentWidth, termsHeight, 1, 1, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    
    // Text in der Box (mit automatischem Zeilenumbruch)
    const termsLines = pdf.splitTextToSize(businessSettings.repairTerms, contentWidth - 6);
    pdf.text(termsLines, leftMargin + 3, currentY + 4);
    
    currentY += termsHeight + 8;
    
    // Bestätigungstext
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mit meiner Unterschrift bestätige ich, dass ich die Reparaturbedingungen gelesen und akzeptiert habe.', 
             pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  }

  // Unterschriftenbereich (am Ende der Seite)
  const signatureY = pageHeight - 70;
  
  // Trennlinie
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(1);
  pdf.line(leftMargin, signatureY, pageWidth - rightMargin, signatureY);
  
  let sigY = signatureY + 10;
  
  // Unterschriften nebeneinander
  const signatureWidth = contentWidth / 2 - 20;
  
  // Linke Unterschrift: Gerät abgegeben
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gerät abgegeben', leftMargin + signatureWidth / 2, sigY, { align: 'center' });
  sigY += 8;
  
  // Unterschrift-Bild oder Platzhalter
  if (repair.dropoffSignature) {
    try {
      pdf.addImage(repair.dropoffSignature, 'PNG', leftMargin + 10, sigY, signatureWidth - 20, 15);
    } catch (error) {
      console.warn('Abgabe-Unterschrift konnte nicht hinzugefügt werden:', error);
    }
  }
  
  // QR-Code für Abgabe (falls vorhanden)
  if (repair.dropoffQrCode) {
    try {
      pdf.addImage(repair.dropoffQrCode, 'PNG', leftMargin + signatureWidth - 20, sigY + 20, 15, 15);
    } catch (error) {
      console.warn('Abgabe-QR-Code konnte nicht hinzugefügt werden:', error);
    }
  }
  
  // Unterschriftslinie links
  const lineY = sigY + 20;
  pdf.setDrawColor(50, 50, 50);
  pdf.setLineWidth(0.5);
  pdf.line(leftMargin + 10, lineY, leftMargin + signatureWidth - 10, lineY);
  
  // Rechte Unterschrift: Gerät abgeholt
  const rightSigX = leftMargin + signatureWidth + 40;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gerät abgeholt', rightSigX + signatureWidth / 2, sigY - 8, { align: 'center' });
  
  // Unterschrift-Bild oder Platzhalter
  if (repair.pickupSignature) {
    try {
      pdf.addImage(repair.pickupSignature, 'PNG', rightSigX + 10, sigY, signatureWidth - 20, 15);
    } catch (error) {
      console.warn('Abholung-Unterschrift konnte nicht hinzugefügt werden:', error);
    }
  }
  
  // QR-Code für Abholung (falls vorhanden)
  if (repair.pickupQrCode) {
    try {
      pdf.addImage(repair.pickupQrCode, 'PNG', rightSigX + signatureWidth - 20, sigY + 20, 15, 15);
    } catch (error) {
      console.warn('Abholung-QR-Code konnte nicht hinzugefügt werden:', error);
    }
  }
  
  // Unterschriftslinie rechts
  pdf.line(rightSigX + 10, lineY, rightSigX + signatureWidth - 10, lineY);
  
  return pdf;
}