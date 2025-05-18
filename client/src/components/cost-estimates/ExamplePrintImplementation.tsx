// Beispiel für die Implementierung des Druckens mit generatePrintHtml

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { generatePrintHtml } from './PrintHelper';

interface PrintButtonProps {
  estimate: any;
  customer: any; 
  items: any[];
}

// Beispiel für einen Druckknopf, der generatePrintHtml verwendet
export function PrintButton({ estimate, customer, items }: PrintButtonProps) {
  const { toast } = useToast();
  
  const handlePrint = () => {
    // Druckfunktion über ein neues Fenster öffnen
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Fehler",
        description: "Popup-Blocker verhindern das Öffnen des Druckfensters. Bitte erlauben Sie Popups für diese Seite.",
        variant: "destructive",
      });
      return;
    }
    
    // Aktuelles Datum formatieren
    const today = new Date();
    const todayFormatted = format(today, 'dd.MM.yyyy', { locale: de });
    
    // generatePrintHtml aufrufen, um das HTML für die Druckansicht zu generieren
    const html = generatePrintHtml({
      estimate,
      customer,
      items,
      todayFormatted
    });
    
    // HTML im neuen Fenster einfügen und drucken
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Warten bis Ressourcen geladen sind, dann drucken
    printWindow.onload = () => {
      printWindow.print();
      // Optional: Fenster nach dem Drucken schließen
      // printWindow.close();
    };
  };
  
  return (
    <button 
      onClick={handlePrint}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Drucken
    </button>
  );
}

// Beispiel für einen PDF-Export-Button, der generatePrintHtml verwendet
export function PdfExportButton({ estimate, customer, items }: PrintButtonProps) {
  const { toast } = useToast();
  
  const handleExport = () => {
    // Als PDF exportieren (öffnet ebenfalls die Druckansicht, aber mit PDF-Option)
    toast({
      title: "PDF-Export",
      description: "Wählen Sie 'Als PDF speichern' in den Druckoptionen, um den Kostenvoranschlag als PDF zu exportieren.",
    });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Fehler",
        description: "Popup-Blocker verhindern das Öffnen des PDF-Fensters. Bitte erlauben Sie Popups für diese Seite.",
        variant: "destructive",
      });
      return;
    }
    
    // Aktuelles Datum formatieren
    const today = new Date();
    const todayFormatted = format(today, 'dd.MM.yyyy', { locale: de });
    
    // generatePrintHtml aufrufen, um das HTML für die PDF-Ansicht zu generieren
    const html = generatePrintHtml({
      estimate,
      customer,
      items,
      todayFormatted
    });
    
    // HTML im neuen Fenster einfügen
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Hier keine automatische Druck-Aktion, damit der Benutzer die PDF-Option wählen kann
  };
  
  return (
    <button 
      onClick={handleExport}
      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
    >
      Als PDF exportieren
    </button>
  );
}