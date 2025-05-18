import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { CostEstimateImprovedPrint } from "./CostEstimateImprovedPrint";

interface CostEstimatePrintButtonsProps {
  estimate: any;
  items: any[];
  customer: any | null;
}

/**
 * Druckknöpfe für Kostenvoranschläge
 * Diese Komponente verwendet die verbesserte Drucklogik und zeigt die Buttons an
 */
export function CostEstimatePrintButtons({ 
  estimate, 
  items, 
  customer 
}: CostEstimatePrintButtonsProps) {
  // Wir verwenden die neue Drucklogik
  const printLogic = CostEstimateImprovedPrint({ estimate, items, customer });
  
  return (
    <div className="flex space-x-2 mt-4">
      <Button 
        variant="outline" 
        onClick={printLogic.printDocument}
      >
        <Printer className="h-4 w-4 mr-2" />
        Drucken
      </Button>
      
      <Button 
        variant="outline"
        onClick={printLogic.exportAsPDF}
      >
        <FileText className="h-4 w-4 mr-2" />
        PDF-Export
      </Button>
    </div>
  );
}