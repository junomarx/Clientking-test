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
    format: [74, 105], // Kleines Etikett-Format (etwa wie ein großes Adress-Etikett)
  });

  // Schrift-Setup
  doc.setFont('helvetica');
  
  // Header - Shop Name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.shopInfo.name, 37, 10, { align: 'center' });

  // Trennlinie
  doc.setLineWidth(0.5);
  doc.line(5, 15, 69, 15);

  // ZUBEHÖR ETIKETT Titel
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ZUBEHÖR ETIKETT', 37, 22, { align: 'center' });

  // Artikel-Informationen
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let y = 30;
  
  // Artikel Name (fett)
  doc.setFont('helvetica', 'bold');
  doc.text('Artikel:', 5, y);
  doc.setFont('helvetica', 'normal');
  
  // Artikel Name umbrechen falls zu lang
  const articleLines = doc.splitTextToSize(data.accessory.articleName, 45);
  doc.text(articleLines, 5, y + 4);
  y += 4 + (articleLines.length - 1) * 3;

  y += 6;
  
  // Menge und Preis
  doc.setFont('helvetica', 'bold');
  doc.text('Menge:', 5, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.accessory.quantity}x`, 20, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Einzelpreis:', 5, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(data.accessory.unitPrice, 25, y + 4);

  y += 12;

  // Kunden-Informationen (falls vorhanden)
  if (data.customer) {
    doc.setFontSize(10); // Größer für bessere Lesbarkeit
    doc.setFont('helvetica', 'bold');
    doc.text('KUNDE:', 5, y);
    
    doc.setFont('helvetica', 'bold'); // Kundenname auch fett
    const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
    const nameLines = doc.splitTextToSize(customerName, 60);
    doc.text(nameLines, 5, y + 4);
    y += 4 + (nameLines.length - 1) * 3; // Mehr Abstand für größere Schrift
    
    doc.text(`Tel: ${data.customer.phone}`, 5, y + 3);
    if (data.customer.email) {
      const emailLines = doc.splitTextToSize(data.customer.email, 60);
      doc.text(emailLines, 5, y + 6);
      y += 6 + (emailLines.length - 1) * 2.5;
    } else {
      y += 6;
    }
  } else {
    // Lager-Artikel
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LAGER-ARTIKEL', 37, y, { align: 'center' });
    y += 6;
  }

  // Datum und ID
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const date = new Date(data.accessory.createdAt).toLocaleDateString('de-DE');
  doc.text(`Erstellt: ${date}`, 5, y);
  doc.text(`ID: ${data.accessory.id}`, 50, y);

  // Trennlinie unten
  doc.setLineWidth(0.3);
  doc.line(5, y + 5, 69, y + 5);

  // Shop-Kontakt (klein unten)
  doc.setFontSize(6);
  doc.text(data.shopInfo.phone, 37, y + 10, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}