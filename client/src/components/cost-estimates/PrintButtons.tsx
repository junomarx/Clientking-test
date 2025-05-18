import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";
import { printDocument, exportAsPdf } from "./PrintHelper";
import { generatePrintHtml } from "./PrintTemplate";

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
    </div>
  );
}