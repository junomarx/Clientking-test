import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";
import { exportVectorPdf } from "./PrintHelper";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  
  // Vektorbasierte PDF-Erstellung
  const handleExportVectorPdf = async () => {
    try {
      toast({
        title: "PDF wird erstellt...",
        description: "Optimierte Qualität und kleinere Dateigröße.",
      });
      
      // Dateiname generieren
      const filename = `Kostenvoranschlag_${estimate.reference_number || 'Export'}`;
      
      // Direkte vektorbasierte PDF-Erstellung
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
        title: "PDF erstellt",
        description: "PDF wurde erfolgreich heruntergeladen.",
      });
    } catch (error) {
      console.error('Fehler bei PDF-Erstellung:', error);
      toast({
        title: "Fehler",
        description: "Das PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };
  
  // Per E-Mail senden - verwendet Vector-PDF für Anhang
  const handleSendEmail = async () => {
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
      
      // Verwende Vector-PDF für E-Mail-Anhang (konsistent mit Download)
      const { createVectorPdf } = await import('./VectorPdfHelper');
      const pdf = await createVectorPdf({
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
      
      // PDF als Base64 für E-Mail-Anhang
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      const response = await apiRequest('POST', `/api/cost-estimates/${estimate.id}/send-email`, {
        email: emailAddress,
        subject: `Kostenvoranschlag ${estimate.reference_number}`,
        pdfAttachment: pdfBase64,
        pdfFilename: `Kostenvoranschlag_${estimate.reference_number}.pdf`
      });
      
      if (response.ok) {
        toast({
          title: "E-Mail gesendet",
          description: `Kostenvoranschlag wurde an ${emailAddress} gesendet.`,
        });
      } else {
        const errorData = await response.json();
        if (errorData.message && errorData.message.includes('SMTP-Einstellungen')) {
          throw new Error('Bitte konfigurieren Sie zuerst Ihre SMTP-Einstellungen in den Geschäftseinstellungen, um E-Mails versenden zu können.');
        }
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
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handleExportVectorPdf}>
        <Download className="h-4 w-4 mr-2" />
        PDF erstellen
      </Button>
      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="h-4 w-4 mr-2" />
        Per E-Mail
      </Button>
    </div>
  );
}