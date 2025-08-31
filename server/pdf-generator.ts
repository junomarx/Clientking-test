import { jsPDF } from 'jspdf';

interface AccessoryLabelData {
  accessory: {
    id: number;
    articleName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
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
  
  let y = 6;

  // Kunden-Informationen oben (falls vorhanden)
  if (data.customer) {
    // Kundenname
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
    doc.text(customerName, 16, y, { align: 'center' });
    y += 4;
    
    // Telefonnummer
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(data.customer.phone, 16, y, { align: 'center' });
    y += 3;
    
    // E-Mail (falls vorhanden)
    if (data.customer.email) {
      const emailLines = doc.splitTextToSize(data.customer.email, 30);
      doc.text(emailLines, 16, y, { align: 'center' });
      y += 3 + (emailLines.length - 1) * 2;
    }
  } else {
    // Fallback für Lager-Artikel
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LAGER-ARTIKEL', 16, y, { align: 'center' });
    y += 4;
  }

  // Trennlinie
  doc.setLineWidth(0.3);
  doc.line(2, y, 30, y);
  y += 4;

  // Artikel Name
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const articleLines = doc.splitTextToSize(data.accessory.articleName, 28);
  doc.text(articleLines, 16, y, { align: 'center' });
  y += 3 + (articleLines.length - 1) * 2;

  // Menge x Preis
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const formattedUnitPrice = data.accessory.unitPrice.replace(/\.00$/, '');
  doc.text(`${data.accessory.quantity}x ${formattedUnitPrice} €`, 16, y, { align: 'center' });
  y += 3;

  // Gesamtpreis - "Gesamt" und Preis untereinander
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Gesamt', 16, y, { align: 'center' });
  y += 3;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  // Preis formatieren: 30.00 -> 30€
  const formattedPrice = data.accessory.totalPrice.replace(/\.00$/, '');
  doc.text(`${formattedPrice} €`, 16, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}