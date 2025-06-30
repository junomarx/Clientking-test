import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  };
}

export async function generateStatisticsPDF(data: StatisticsData, startDate: string, endDate: string) {
  // HTML-Template für PDF erstellen (gleiche Methode wie bei Kostenvoranschlägen)
  const htmlContent = createStatisticsHTML(data);
  
  // Temporäres Element erstellen
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.fontSize = '12px';
  tempDiv.style.lineHeight = '1.4';
  
  document.body.appendChild(tempDiv);
  
  try {
    // Canvas erstellen
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // PDF erstellen
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    
    const imgWidth = pageWidth - (2 * margin);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let yOffset = margin;
    
    if (imgHeight <= pageHeight - (2 * margin)) {
      // Bild passt auf eine Seite
      pdf.addImage(imgData, 'JPEG', margin, yOffset, imgWidth, imgHeight);
    } else {
      // Bild auf mehrere Seiten aufteilen
      const ratio = imgWidth / canvas.width;
      const pageHeightInPixels = (pageHeight - (2 * margin)) / ratio;
      
      let sourceY = 0;
      
      while (sourceY < canvas.height) {
        const sourceHeight = Math.min(pageHeightInPixels, canvas.height - sourceY);
        const targetHeight = sourceHeight * ratio;
        
        // Neuen Canvas für diesen Abschnitt erstellen
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );
          
          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          
          if (sourceY > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(pageImgData, 'JPEG', margin, margin, imgWidth, targetHeight);
        }
        
        sourceY += pageHeightInPixels;
      }
    }
    
    // PDF herunterladen
    pdf.save(`Statistik_${startDate}_${endDate}.pdf`);
    
  } finally {
    // Aufräumen
    if (tempDiv.parentNode) {
      document.body.removeChild(tempDiv);
    }
  }
}

function createStatisticsHTML(data: StatisticsData): string {
  const { period, businessName, data: stats } = data;
  
  return `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto; background: white;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #333; font-weight: bold;">Reparaturstatistik</h1>
        <h2 style="margin: 10px 0 0 0; font-size: 18px; color: #666; font-weight: normal;">${businessName}</h2>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #888;">
          Zeitraum: ${formatDate(period.start)} - ${formatDate(period.end)}
        </p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #aaa;">
          Erstellt am: ${formatDate(period.generated)}
        </p>
      </div>

      <!-- Statistiken nach Gerätetyp -->
      ${stats.deviceTypeStats.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Statistik nach Gerätetyp
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 70%;">Gerätetyp</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; width: 30%;">Anzahl</th>
            </tr>
          </thead>
          <tbody>
            ${stats.deviceTypeStats.map((stat, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                <td style="border: 1px solid #ddd; padding: 8px;">${stat.deviceType}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${stat.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Statistiken nach Marke -->
      ${stats.brandStats.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Statistik nach Gerätetyp und Marke
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 35%;">Gerätetyp</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 35%;">Marke</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; width: 30%;">Anzahl</th>
            </tr>
          </thead>
          <tbody>
            ${stats.brandStats.map((stat, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                <td style="border: 1px solid #ddd; padding: 8px;">${stat.deviceType}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${stat.brand}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${stat.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Statistiken nach Modell -->
      ${stats.modelStats.length > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          Statistik nach Gerätetyp, Marke und Modell
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 30px;">Gerätetyp</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 25px;">Marke</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; width: 105px;">Modell</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; width: 25px;">Anzahl</th>
            </tr>
          </thead>
          <tbody>
            ${stats.modelStats.map((stat, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${stat.deviceType}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${stat.brand}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${stat.model}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${stat.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 10px;">
        <p style="margin: 0;">Diese Statistik wurde automatisch generiert und enthält ausschließlich Strukturdaten ohne personenbezogene Informationen.</p>
        <p style="margin: 5px 0 0 0;">DSGVO-konform erstellt am ${formatDate(period.generated)}</p>
      </div>
    </div>
  `;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}