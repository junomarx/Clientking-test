import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePrintHtml } from "./PrintHelper";

interface PrintButtonsProps {
  estimate: any;
  customer: any;
  items: any[];
}

/**
 * Komponente mit Drucken- und PDF-Export-Buttons für Kostenvoranschläge
 */
export function PrintButtons({ estimate, customer, items }: PrintButtonsProps) {
  const { toast } = useToast();
  
  // Gemeinsame Funktion zum Öffnen des Druckfensters
  const openPrintWindow = (autoPrint: boolean = false) => {
    // Druckfenster öffnen
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Fehler",
        description: "Popup-Blocker verhindern das Öffnen des Druckfensters. Bitte erlauben Sie Popups für diese Seite.",
        variant: "destructive",
      });
      return;
    }
    
    // HTML für Druckansicht mit unserer sauberen Funktion generieren
    const html = generatePrintHtml({
      estimate,
      customer,
      items
    });
    
    // HTML im neuen Fenster einfügen
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Warten bis Ressourcen geladen sind
    printWindow.onload = () => {
      if (autoPrint) {
        printWindow.print();
      }
    };
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => openPrintWindow(true)}
      >
        <Printer className="h-4 w-4 mr-2" />
        Drucken
      </Button>
      
      <Button 
        variant="outline"
        onClick={() => {
          // Als PDF exportieren (gleiche Druckfunktion, nur ohne automatisches Drucken)
          toast({
            title: "PDF-Export",
            description: "Wählen Sie 'Als PDF speichern' in den Druckoptionen, um den Kostenvoranschlag als PDF zu exportieren.",
          });
          
          openPrintWindow(false);
        }}
      >
        <FileText className="h-4 w-4 mr-2" />
        Als PDF exportieren
      </Button>
    </>
  );
}