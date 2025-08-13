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
  
  // Kundenkontaktdaten
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  if (customer.phone) {
    pdf.text(`Telefon: ${customer.phone}`, leftMargin, currentY);
    currentY += 4;
  }
  if (customer.email) {
    pdf.text(`E-Mail: ${customer.email}`, leftMargin, currentY);
    currentY += 4;
  }
  if (customer.street) {
    pdf.text(`Adresse: ${customer.street}`, leftMargin, currentY);
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

  // Gerätedaten & Reparaturdetails Box - kompakter
  const boxY = currentY;
  const boxHeight = 28;
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
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Reparaturbedingungen', leftMargin, currentY);
    currentY += 6;
    
    // Reparaturbedingungen-Box - kompakter
    const termsHeight = 25; // Feste, kompakte Höhe
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(leftMargin, currentY, contentWidth, termsHeight, 1, 1, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    
    // Text in der Box (mit automatischem Zeilenumbruch)
    const termsLines = pdf.splitTextToSize(businessSettings.repairTerms, contentWidth - 6);
    pdf.text(termsLines, leftMargin + 3, currentY + 4);
    
    currentY += termsHeight + 6;
    
    // Bestätigungstext - kompakter
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mit meiner Unterschrift bestätige ich, dass ich die Reparaturbedingungen gelesen und akzeptiert habe.', 
             pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  // Unterschriftenbereich - mehr Abstand von Reparaturbedingungen
  currentY += 15; // Extra Abstand zu den Reparaturbedingungen
  
  // Unterschriften nebeneinander (OHNE Trennlinie oben)
  const signatureWidth = contentWidth / 2 - 10;
  
  // Linke Unterschrift: Gerät abgegeben
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gerät abgegeben', leftMargin + signatureWidth / 2, currentY, { align: 'center' });
  
  let leftSigY = currentY + 8;
  
  // Unterschrift-Bild oder Platzhalter links
  if (repair.dropoffSignature) {
    try {
      pdf.addImage(repair.dropoffSignature, 'PNG', leftMargin + 10, leftSigY, signatureWidth - 20, 15);
      leftSigY += 20;
    } catch (error) {
      console.warn('Abgabe-Unterschrift konnte nicht hinzugefügt werden:', error);
      leftSigY += 15; // Platz für fehlende Unterschrift
    }
  } else {
    leftSigY += 15; // Platz für fehlende Unterschrift
  }
  
  // Unterschriftslinie links
  pdf.setDrawColor(50, 50, 50);
  pdf.setLineWidth(0.5);
  pdf.line(leftMargin + 10, leftSigY, leftMargin + signatureWidth - 10, leftSigY);
  
  // Kundenname und Datum links
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${customer.firstName} ${customer.lastName}`, leftMargin + signatureWidth / 2, leftSigY + 5, { align: 'center' });
  pdf.setFontSize(7);
  pdf.text(formatDate(repair.createdAt), leftMargin + signatureWidth / 2, leftSigY + 9, { align: 'center' });
  
  // Rechte Unterschrift: Gerät abgeholt
  const rightSigX = leftMargin + signatureWidth + 20;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gerät abgeholt', rightSigX + signatureWidth / 2, currentY, { align: 'center' });
  
  let rightSigY = currentY + 8;
  
  // Unterschrift-Bild oder Platzhalter rechts
  if (repair.pickupSignature) {
    try {
      pdf.addImage(repair.pickupSignature, 'PNG', rightSigX + 10, rightSigY, signatureWidth - 20, 15);
      rightSigY += 20;
    } catch (error) {
      console.warn('Abholung-Unterschrift konnte nicht hinzugefügt werden:', error);
      rightSigY += 15; // Platz für fehlende Unterschrift
    }
  } else {
    rightSigY += 15; // Platz für fehlende Unterschrift
  }
  
  // Unterschriftslinie rechts
  pdf.line(rightSigX + 10, rightSigY, rightSigX + signatureWidth - 10, rightSigY);
  
  // Kundenname und Datum rechts
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${customer.firstName} ${customer.lastName}`, rightSigX + signatureWidth / 2, rightSigY + 5, { align: 'center' });
  pdf.setFontSize(7);
  pdf.text('', rightSigX + signatureWidth / 2, rightSigY + 9, { align: 'center' }); // Leeres Datum für Abholung
  
  return pdf;
}