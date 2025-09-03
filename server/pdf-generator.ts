import { jsPDF } from 'jspdf';

interface AccessoryLabelData {
  accessory: {
    id: number;
    articleName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    downPayment?: string;
    status: string;
    createdAt: Date;
  };
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  } | null;
  shopInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export async function generateAccessoryLabelPDF(data: AccessoryLabelData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [32, 57], // Hochformat (32mm x 57mm) - entspricht den Druckeinstellungen
  });

  // Schrift-Setup
  doc.setFont('helvetica');
  
  let y = 8;

  // Kunden-Informationen oben (falls vorhanden)
  if (data.customer) {
    // Kundenname - groß und fett
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
    doc.text(customerName, 16, y, { align: 'center' });
    y += 8;
    
    // Telefonnummer - mittelgroß
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(data.customer.phone, 16, y, { align: 'center' });
    y += 5;
    
    // E-Mail (falls vorhanden) - mittelgroß
    if (data.customer.email) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const emailLines = doc.splitTextToSize(data.customer.email, 30);
      doc.text(emailLines, 16, y, { align: 'center' });
      y += 5 + (emailLines.length - 1) * 3;
    }
  } else {
    // Fallback für Lager-Artikel
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LAGER-ARTIKEL', 16, y, { align: 'center' });
    y += 8;
  }

  // Trennlinie
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(3, y, 29, y);
  y += 6;

  // Artikel Name - groß und fett, mehrzeilig
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const articleLines = doc.splitTextToSize(data.accessory.articleName, 28);
  doc.text(articleLines, 16, y, { align: 'center' });
  y += 6 + (articleLines.length - 1) * 4;

  // Menge x Preis - mittelgroß
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const formattedUnitPrice = data.accessory.unitPrice.replace(/\.00$/, '');
  doc.text(`${data.accessory.quantity}x ${formattedUnitPrice} €`, 16, y, { align: 'center' });
  y += 5;

  // Anzahlung - mittelgroß
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const formattedDownPayment = data.accessory.downPayment?.replace(/\.00$/, '') || '0';
  doc.text(`Anzahlung: ${formattedDownPayment} €`, 16, y, { align: 'center' });
  y += 8;

  // "Gesamt" - mittelgroß
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Gesamt', 16, y, { align: 'center' });
  y += 6;
  
  // Gesamtpreis - sehr groß und fett
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const formattedPrice = data.accessory.totalPrice.replace(/\.00$/, '');
  doc.text(`${formattedPrice} €`, 16, y, { align: 'center' });
  y += 10;

  // "Offen:" - mittelgroß mit Doppelpunkt
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Offen:', 16, y, { align: 'center' });
  y += 6;
  
  // Offener Betrag - sehr groß und fett
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const totalPrice = parseFloat(data.accessory.totalPrice || '0');
  const downPayment = parseFloat(data.accessory.downPayment || '0');
  const openAmount = totalPrice - downPayment;
  const formattedOpenAmount = openAmount.toFixed(2).replace(/\.00$/, '');
  doc.text(`${formattedOpenAmount} €`, 16, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}