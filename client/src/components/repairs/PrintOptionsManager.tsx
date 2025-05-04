import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PrintOptionsDialog } from './PrintOptionsDialog';
import { PrintRepairDialog } from './PrintRepairDialog';
import { PrintLabelDialog } from './PrintLabelDialog';
import { PrintRepairA4Dialog } from './PrintRepairA4Dialog';

// Kontext für globale Druckoptionen
type PrintManagerContextType = {
  showPrintOptions: (repairId: number) => void;
};

const PrintManagerContext = createContext<PrintManagerContextType | undefined>(undefined);

export function usePrintManager() {
  const context = useContext(PrintManagerContext);
  if (!context) {
    throw new Error('usePrintManager muss innerhalb eines PrintManagerProviders verwendet werden');
  }
  return context;
}

// Provider Komponente
export function PrintManagerProvider({ children }: { children: ReactNode }) {
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showReceiptPrintDialog, setShowReceiptPrintDialog] = useState(false);
  const [showLabelPrintDialog, setShowLabelPrintDialog] = useState(false);
  const [showA4PrintDialog, setShowA4PrintDialog] = useState(false);
  const [repairId, setRepairId] = useState<number | null>(null);
  
  // Druckoptionen anzeigen
  const handleShowPrintOptions = (id: number) => {
    console.log("Zeige Druckoptionen für Reparatur:", id);
    setRepairId(id);
    setShowPrintOptions(true);
  };
  
  // Handler für Druckoptionen
  const handlePrintReceipt = () => {
    setShowPrintOptions(false);
    setShowReceiptPrintDialog(true);
  };
  
  const handlePrintLabel = () => {
    setShowPrintOptions(false);
    setShowLabelPrintDialog(true);
  };
  
  const handlePrintA4 = () => {
    setShowPrintOptions(false);
    setShowA4PrintDialog(true);
  };

  return (
    <PrintManagerContext.Provider value={{ showPrintOptions: handleShowPrintOptions }}>
      {children}
      
      {/* Druckoptionen Dialog - separater Dialog */}
      <PrintOptionsDialog 
        open={showPrintOptions}
        onClose={() => setShowPrintOptions(false)}
        onPrintReceipt={handlePrintReceipt}
        onPrintLabel={handlePrintLabel}
        onPrintA4={handlePrintA4}
        repairId={repairId}
      />
      
      {/* Bon Druck Dialog */}
      <PrintRepairDialog
        open={showReceiptPrintDialog}
        onClose={() => setShowReceiptPrintDialog(false)}
        repairId={repairId}
      />
      
      {/* Etikett Druck Dialog */}
      <PrintLabelDialog
        open={showLabelPrintDialog}
        onClose={() => setShowLabelPrintDialog(false)}
        repairId={repairId}
      />
      
      {/* DIN A4 Ausdruck Dialog */}
      <PrintRepairA4Dialog
        open={showA4PrintDialog}
        onClose={() => setShowA4PrintDialog(false)}
        repairId={repairId}
      />
    </PrintManagerContext.Provider>
  );
}