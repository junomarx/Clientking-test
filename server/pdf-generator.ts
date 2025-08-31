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
  
  // Header - Shop Name (kleiner für das schmale Format)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(data.shopInfo.name, 16, 6, { align: 'center' });

  // Trennlinie
  doc.setLineWidth(0.3);
  doc.line(2, 9, 30, 9);

  // ZUBEHÖR ETIKETT Titel
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ZUBEHÖR', 16, 13, { align: 'center' });

  // Artikel-Informationen (kompakt für kleines Format)
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  let y = 16;
  
  // Artikel Name (sehr kompakt)
  const articleLines = doc.splitTextToSize(data.accessory.articleName, 28);
  doc.text(articleLines, 2, y);
  y += 2 + (articleLines.length - 1) * 2;

  y += 2;
  
  // Menge und Preise kompakt
  doc.setFontSize(5);
  doc.text(`${data.accessory.quantity}x à ${data.accessory.unitPrice}`, 2, y);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(`Gesamt: ${data.accessory.totalPrice}`, 2, y);
  doc.setFont('helvetica', 'normal');

  y += 4;

  // Kunden-Informationen (sehr kompakt)
  if (data.customer) {
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
    const nameLines = doc.splitTextToSize(customerName, 28);
    doc.text(nameLines, 2, y);
    y += 1 + (nameLines.length - 1) * 2;
    
    doc.setFont('helvetica', 'normal');
    doc.text(data.customer.phone, 2, y + 2);
    y += 4;
  }

  // ID unten
  doc.setFontSize(4);
  doc.text(`ID: ${data.accessory.id}`, 2, 54);

  // Shop-Kontakt unten rechts
  doc.setFontSize(4);
  doc.text(data.shopInfo.phone, 30, 54, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}