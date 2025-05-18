import { generatePrintHtml, openPrintWindow } from "./PrintCostEstimate";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Interface für Props
interface PrintButtonsProps {
  estimate: any;
  items: any[];
  customer: any | null;
}

/**
 * Verbesserte Druckknöpfe für Kostenvoranschläge
 * Diese Komponente kann in die CostEstimateDetailsDialog eingebunden werden
 */
export const CostEstimatePrintButtons: React.FC<PrintButtonsProps> = ({ 
  estimate, 
  items, 
  customer 
}) => {
  const { toast } = useToast();
  
  // Geschäftseinstellungen abrufen für Firmenlogo und Details
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    staleTime: 60000 * 15, // 15 Minuten Cache
  });

  // Drucken-Button Handler
  const handlePrint = () => {
    // HTML generieren
    const html = generatePrintHtml(estimate, items, customer, businessSettings);
    
    // Druckfenster öffnen
    const printWindow = openPrintWindow(html, true);
    
    if (!printWindow) {
      toast({
        title: "Fehler",
        description: "Popup-Blocker verhindern das Öffnen des Druckfensters. Bitte erlauben Sie Popups für diese Seite.",
        variant: "destructive",
      });
    }
  };
  
  // PDF-Export Handler
  const handlePdfExport = () => {
    toast({
      title: "PDF-Export",
      description: "Wählen Sie 'Als PDF speichern' in den Druckoptionen, um den Kostenvoranschlag als PDF zu exportieren.",
    });
    
    // HTML generieren
    const html = generatePrintHtml(estimate, items, customer, businessSettings);
    
    // Druckfenster öffnen (ohne automatischen Druck)
    const printWindow = openPrintWindow(html, false);
    
    if (!printWindow) {
      toast({
        title: "Fehler",
        description: "Popup-Blocker verhindern das Öffnen des PDF-Fensters. Bitte erlauben Sie Popups für diese Seite.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4 mr-2" />
        Drucken
      </Button>
      
      <Button 
        variant="outline"
        onClick={handlePdfExport}
      >
        <FileText className="h-4 w-4 mr-2" />
        PDF-Export
      </Button>
    </>
  );
};