import { Button } from "@/components/ui/button";
import { Printer, FileDown, Mail } from "lucide-react";
import { printDocument, exportAsPdf } from "./PrintHelper";
import { generatePrintHtml } from "./PrintTemplate";
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
  const handleExportPdf = () => {
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
    exportAsPdf(printContent, filename);
  };
  
  // Per E-Mail senden
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
        description: "Kostenvoranschlag wird an den Kunden gesendet.",
      });
      
      // Generiere den HTML-Inhalt für den Kostenvoranschlag
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
      
      // Sende den Kostenvoranschlag per E-Mail
      const response = await apiRequest('POST', `/api/cost-estimates/${estimate.id}/send-email`, {
        email: emailAddress,
        content: printContent,
        subject: `Kostenvoranschlag ${estimate.reference_number}`,
      });
      
      if (response.ok) {
        toast({
          title: "E-Mail gesendet",
          description: `Kostenvoranschlag wurde an ${emailAddress} gesendet.`,
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