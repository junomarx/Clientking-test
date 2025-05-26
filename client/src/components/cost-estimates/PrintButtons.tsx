import { Button } from "@/components/ui/button";
import { Printer, FileDown, Mail } from "lucide-react";
import { printDocument, exportAsPdf } from "./PrintHelper";
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
  
  // Generiere den PDF-Export
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
      
      // Erstelle PDF-Daten für E-Mail-Anhang
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = printContent;
      tempDiv.id = 'temp-email-content';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '794px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '40px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.4';
      
      document.body.appendChild(tempDiv);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2.0,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 10000,
        removeContainer: true,
        width: 794,
        height: 1123,
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
      
      // Sende den Kostenvoranschlag per E-Mail mit PDF-Anhang
      const response = await apiRequest('POST', `/api/cost-estimates/${estimate.id}/send-email`, {
        email: emailAddress,
        content: printContent,
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
        throw new Error(errorData.message || 'Fehler beim Senden der E-Mail');
      }
    } catch (error) {
      toast({
        title: "Fehler beim Senden",
        description: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Senden der E-Mail',
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-2" />
        Drucken
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}>
        <FileDown className="h-4 w-4 mr-2" />
        Als PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="h-4 w-4 mr-2" />
        Per E-Mail
      </Button>
    </div>
  );
}