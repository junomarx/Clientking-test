import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Hilfsfunktionen für den Druck von Kostenvoranschlägen
 */
export function printDocument(content: string, title: string = 'Kostenvoranschlag'): void {
  // Erstelle ein neues Fenster für den Druck
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um das Dokument zu drucken.');
    return;
  }
  
  // Füge Inhalt hinzu
  printWindow.document.write(content);
  printWindow.document.title = title;
  
  // Schließe das Dokument
  printWindow.document.close();
  
  // Warte bis alle Ressourcen geladen sind und drucke dann
  printWindow.onload = () => {
    printWindow.print();
    // Fenster schließen nach dem Druck (optional, könnte auf false gesetzt werden)
    // printWindow.onafterprint = () => printWindow.close();
  };
}

/**
 * Echte PDF-Erstellung mit HTML-to-Canvas für A4-Format
 * Optimiert für Dateigröße unter 5MB
 */
export async function exportAsPdf(content: string, filename: string = 'Kostenvoranschlag'): Promise<void> {
  try {
    // Erstelle temporäres div für HTML-Rendering
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    tempDiv.id = 'temp-print-content';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '794px'; // A4 Breite in Pixel (210mm)
    tempDiv.style.backgroundColor = '#ffffff';
    tempDiv.style.padding = '40px'; // Padding in Pixel
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '14px';
    tempDiv.style.lineHeight = '1.4';
    
    document.body.appendChild(tempDiv);
    
    // Warte kurz bis das Element im DOM ist
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Erstelle Canvas vom HTML-Inhalt
    const canvas = await html2canvas(tempDiv, {
      scale: 2.0, // Höhere Skalierung für bessere A4-Größe
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 10000,
      removeContainer: true,
      width: 794, // A4 Breite
      height: 1123, // A4 Höhe
    });
    
    // Entferne temporäres Element
    document.body.removeChild(tempDiv);
    
    // JPEG mit optimierter Komprimierung für kleinere Dateigröße
    const imgData = canvas.toDataURL('image/jpeg', 0.85); // 85% Qualität
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true // PDF-Komprimierung aktivieren
    });
    
    // A4 Maße
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const imgWidth = pageWidth - (2 * margin);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Immer auf eine A4-Seite skalieren - keine Aufteilung
    const maxHeight = pageHeight - (2 * margin);
    let finalImgWidth = imgWidth;
    let finalImgHeight = imgHeight;
    
    // Falls das Bild zu hoch ist, proportional skalieren
    if (imgHeight > maxHeight) {
      finalImgHeight = maxHeight;
      finalImgWidth = (canvas.width * maxHeight) / canvas.height;
      
      // Falls nach der Höhenskalierung die Breite zu groß ist, nochmal anpassen
      if (finalImgWidth > imgWidth) {
        finalImgWidth = imgWidth;
        finalImgHeight = (canvas.height * imgWidth) / canvas.width;
      }
    }
    
    // Bild zentriert auf der Seite platzieren
    const xOffset = margin + (imgWidth - finalImgWidth) / 2;
    const yOffset = margin;
    
    pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalImgWidth, finalImgHeight);
    
    // PDF speichern
    pdf.save(`${filename}.pdf`);
    
  } catch (error) {
    console.error('Fehler beim Erstellen der PDF:', error);
    // Fallback zur Browser-Druckfunktion
    printDocument(content, filename);
  }
}