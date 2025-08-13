import { Button } from "@/components/ui/button";
import { Printer, FileDown, Mail, Zap } from "lucide-react";
import { printDocument, exportAsPdf, exportVectorPdf } from "./PrintHelper";
import { generatePrintHtml } from "./PrintTemplate";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrintButtonsProps {
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

export function PrintButtons({
  estimate,
  customer,
  items,
  businessName,
  businessAddress,
  businessZipCity,
  businessPhone,
  businessEmail,
  logoUrl
}: PrintButtonsProps) {
  const { toast } = useToast();
  
  // Generiere das HTML für den Druck
  const handlePrint = () => {
    const printContent = generatePrintHtml({
      estimate,
      customer,
      items,
      businessName,
      businessAddress,
      businessZipCity,
      businessPhone,
      businessEmail,
      logoUrl
    });
    printDocument(printContent);
  };
  
  // NEUE: Vektorbasierte PDF-Erstellung
  const handleExportVectorPdf = async () => {
    try {
      toast({
        title: "Vektor-PDF wird erstellt...",
        description: "Optimierte Qualität und kleinere Dateigröße.",
      });
      
      // Dateiname generieren
      const filename = `Kostenvoranschlag_${estimate.reference_number || 'Export'}`;
      
      // Direkte vektorbasierte PDF-Erstellung ohne HTML2Canvas
      await exportVectorPdf({
        estimate,
        customer,
        items,
        businessName,
        businessAddress,
        businessZipCity,
        businessPhone,
        businessEmail,
        logoUrl
      }, filename);
      
      toast({
        title: "Vektor-PDF erstellt",
        description: "Optimierte PDF mit besserer Qualität heruntergeladen.",
      });
    } catch (error) {
      console.error('Fehler bei Vektor-PDF:', error);
      toast({
        title: "Fehler",
        description: "Das Vektor-PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };

  // ALTE: Bild-basierte PDF-Erstellung (Fallback)
  const handleExportPdf = async () => {
    try {
      toast({
        title: "PDF wird erstellt...",
        description: "Bitte warten Sie einen Moment.",
      });
      
      const printContent = generatePrintHtml({
        estimate,
        customer,
        items,
        businessName,
        businessAddress,
        businessZipCity,
        businessPhone,
        businessEmail,
        logoUrl
      });
      
      // Dateiname generieren
      const filename = `Kostenvoranschlag_${estimate.reference_number || 'Export'}`;
      await exportAsPdf(printContent, filename);
      
      toast({
        title: "PDF erstellt",
        description: "Das PDF wurde erfolgreich heruntergeladen.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Das PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };
  
  // Per E-Mail senden - mit PDF-Anhang im gleichen Format
  const handleSendEmail = async () => {
    // Überprüfen, ob eine E-Mail-Adresse vorhanden ist
    const emailAddress = customer?.email || estimate?.email;
    
    if (!emailAddress) {
      toast({
        title: "Fehler beim Senden",
        description: "Keine E-Mail-Adresse für den Kunden hinterlegt",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "Sende E-Mail...",
        description: "Kostenvoranschlag wird erstellt und an den Kunden gesendet.",
      });
      
      // Generiere das HTML für die PDF-Erstellung (gleiche Methode wie beim Download)
      const fullHtmlContent = generatePrintHtml({
        estimate,
        customer,
        items,
        businessName,
        businessAddress,
        businessZipCity,
        businessPhone,
        businessEmail,
        logoUrl
      });
      
      // Extrahiere CSS-Styles und Body-Inhalt separat
      const styleMatch = fullHtmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const styles = styleMatch ? styleMatch[1] : '';
      const bodyMatch = fullHtmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : fullHtmlContent;
      
      // Erstelle PDF-Daten für E-Mail-Anhang mit korrekten Styles
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyContent;
      tempDiv.id = 'temp-email-content';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '794px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.color = '#333';
      
      // Füge die extrahierten CSS-Styles hinzu
      if (styles) {
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
      }
      
      document.body.appendChild(tempDiv);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(tempDiv, {
        scale: 1.8,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 10000,
        removeContainer: true,
        width: 794,
        // height entfernt für automatische Höhe basierend auf Inhalt
      });
      
      document.body.removeChild(tempDiv);
      
      // Erstelle PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.75); // Etwas niedrigere Qualität für E-Mail
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const maxHeight = pageHeight - (2 * margin);
      let finalImgWidth = imgWidth;
      let finalImgHeight = imgHeight;
      
      if (imgHeight > maxHeight) {
        finalImgHeight = maxHeight;
        finalImgWidth = (canvas.width * maxHeight) / canvas.height;
        
        if (finalImgWidth > imgWidth) {
          finalImgWidth = imgWidth;
          finalImgHeight = (canvas.height * imgWidth) / canvas.width;
        }
      }
      
      const xOffset = margin + (imgWidth - finalImgWidth) / 2;
      const yOffset = margin;
      
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalImgWidth, finalImgHeight);
      
      // PDF als Base64 für E-Mail-Anhang
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      // Cleanup der temporären Elemente
      if (tempDiv.parentNode) {
        document.body.removeChild(tempDiv);
      }
      if (styles) {
        // Entferne das temporäre Style-Element
        const addedStyles = document.head.querySelectorAll('style');
        addedStyles.forEach(style => {
          if (style.textContent === styles && style.parentNode) {
            document.head.removeChild(style);
          }
        });
      }
      
      // Sende den Kostenvoranschlag per E-Mail mit PDF-Anhang
      const response = await apiRequest('POST', `/api/cost-estimates/${estimate.id}/send-email`, {
        email: emailAddress,
        subject: `Kostenvoranschlag ${estimate.reference_number}`,
        pdfAttachment: pdfBase64,
        pdfFilename: `Kostenvoranschlag_${estimate.reference_number}.pdf`
      });
      
      if (response.ok) {
        toast({
          title: "E-Mail gesendet",
          description: `Kostenvoranschlag wurde mit PDF-Anhang an ${emailAddress} gesendet.`,
        });
      } else {
        const errorData = await response.json();
        // Spezielle Behandlung für SMTP-Konfigurationsfehler
        if (errorData.message && errorData.message.includes('SMTP-Einstellungen')) {
          throw new Error('Bitte konfigurieren Sie zuerst Ihre SMTP-Einstellungen in den Geschäftseinstellungen, um E-Mails versenden zu können.');
        }
        throw new Error(errorData.message || 'Fehler beim Senden der E-Mail');
      }
    } catch (error) {
      // Cleanup im Fehlerfall
      const tempElement = document.getElementById('temp-email-content');
      if (tempElement) {
        document.body.removeChild(tempElement);
      }
      
      toast({
        title: "Fehler beim Senden",
        description: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Senden der E-Mail',
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Drucken
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportVectorPdf}>
        <Zap className="h-4 w-4 mr-2" />
        Vektor-PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}>
        <FileDown className="h-4 w-4 mr-2" />
        Als PDF (Alt)
      </Button>
      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="h-4 w-4 mr-2" />
        Per E-Mail
      </Button>
    </div>
  );
}