import jsPDF from 'jspdf';

interface StatisticsData {
  period: {
    start: string;
    end: string;
    generated: string;
  };
  businessName: string;
  data: {
    deviceTypeStats: Array<{ deviceType: string; count: number }>;
    brandStats: Array<{ deviceType: string; brand: string; count: number }>;
    modelStats: Array<{ deviceType: string; brand: string; model: string; count: number }>;
    statusStats: Array<{ status: string; count: number }>;
  };
}

export async function generateStatisticsPDF(data: StatisticsData, startDate: string, endDate: string) {
  // Direkte PDF-Generierung ohne HTML-Konvertierung für beste Qualität
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  
  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Reparaturstatistik', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.businessName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  pdf.setFontSize(10);
  pdf.text(`Zeitraum: ${formatDate(data.period.start)} - ${formatDate(data.period.end)}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  
  pdf.text(`Erstellt am: ${formatDate(data.period.generated)}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Linie unter Header
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;
  
  // Tabelle 1: Gerätetyp-Statistik
  if (data.data.deviceTypeStats.length > 0) {
    yPos = addTableSection(pdf, 'Statistik nach Gerätetyp', 
      ['Gerätetyp', 'Anzahl'],
      data.data.deviceTypeStats.map(item => [item.deviceType, item.count.toString()]),
      yPos, pageWidth, margin
    );
  }
  
  // Neue Seite wenn nötig
  if (yPos > pageHeight - 80) {
    pdf.addPage();
    yPos = margin;
  }
  
  // Tabelle 2: Marken-Statistik
  if (data.data.brandStats.length > 0) {
    yPos = addTableSection(pdf, 'Statistik nach Gerätetyp und Marke',
      ['Gerätetyp', 'Marke', 'Anzahl'],
      data.data.brandStats.map(item => [item.deviceType, item.brand, item.count.toString()]),
      yPos, pageWidth, margin
    );
  }
  
  // Neue Seite wenn nötig
  if (yPos > pageHeight - 80) {
    pdf.addPage();
    yPos = margin;
  }
  
  // Tabelle 3: Modell-Statistik
  if (data.data.modelStats.length > 0) {
    yPos = addTableSection(pdf, 'Statistik nach Gerätetyp, Marke und Modell',
      ['Gerätetyp', 'Marke', 'Modell', 'Anzahl'],
      data.data.modelStats.map(item => [item.deviceType, item.brand, item.model, item.count.toString()]),
      yPos, pageWidth, margin
    );
  }

  // Neue Seite wenn nötig
  if (yPos > pageHeight - 80) {
    pdf.addPage();
    yPos = margin;
  }

  // Tabelle 4: Status-Statistik (einschließlich "Außer Haus")
  if (data.data.statusStats.length > 0) {
    yPos = addTableSection(pdf, 'Statistik nach Reparaturstatus',
      ['Status', 'Anzahl'],
      data.data.statusStats.map(item => [item.status, item.count.toString()]),
      yPos, pageWidth, margin
    );
  }
  
  // Footer
  const footerY = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Diese Statistik wurde automatisch generiert und enthält ausschließlich Strukturdaten ohne personenbezogene Informationen.', 
    pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`DSGVO-konform erstellt am ${formatDate(data.period.generated)}`, 
    pageWidth / 2, footerY + 4, { align: 'center' });
  
  // PDF herunterladen
  pdf.save(`Statistik_${startDate}_${endDate}.pdf`);
}

function addTableSection(
  pdf: jsPDF, 
  title: string, 
  headers: string[], 
  data: string[][], 
  startY: number, 
  pageWidth: number, 
  margin: number
): number {
  let yPos = startY;
  
  // Titel
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, margin, yPos);
  yPos += 10;
  
  // Tabelle vorbereiten
  const tableWidth = pageWidth - (2 * margin);
  let colWidths: number[];
  
  // Spaltenbreiten entsprechend den ursprünglichen Einstellungen
  if (headers.length === 2) {
    colWidths = [tableWidth * 0.7, tableWidth * 0.3]; // Gerätetyp, Anzahl
  } else if (headers.length === 3) {
    colWidths = [tableWidth * 0.4, tableWidth * 0.4, tableWidth * 0.2]; // Gerätetyp, Marke, Anzahl
  } else if (headers.length === 4) {
    // Originalbreiten: Gerätetyp 30px, Marke 25px, Modell 105px, Anzahl 25px
    const totalOriginal = 30 + 25 + 105 + 25; // 185px
    colWidths = [
      tableWidth * (30 / totalOriginal), // Gerätetyp
      tableWidth * (25 / totalOriginal), // Marke  
      tableWidth * (105 / totalOriginal), // Modell (erweitert)
      tableWidth * (25 / totalOriginal)  // Anzahl
    ];
  } else {
    colWidths = headers.map(() => tableWidth / headers.length);
  }
  
  // Header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  
  let xPos = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.rect(xPos, yPos, colWidths[i], 8);
    pdf.text(headers[i], xPos + 2, yPos + 6);
    xPos += colWidths[i];
  }
  yPos += 8;
  
  // Datenzeilen
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  for (const row of data) {
    // Neue Seite wenn nötig
    if (yPos > pdf.internal.pageSize.getHeight() - 30) {
      pdf.addPage();
      yPos = margin;
    }
    
    xPos = margin;
    for (let i = 0; i < row.length; i++) {
      pdf.rect(xPos, yPos, colWidths[i], 6);
      
      // Text vollständig anzeigen (keine Kürzung)
      let text = row[i];
      
      if (i === row.length - 1) {
        // Letzte Spalte (Anzahl) zentriert
        pdf.text(text, xPos + colWidths[i] / 2, yPos + 4, { align: 'center' });
      } else {
        pdf.text(text, xPos + 2, yPos + 4);
      }
      xPos += colWidths[i];
    }
    yPos += 6;
  }
  
  return yPos + 15; // Abstand zur nächsten Sektion
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}