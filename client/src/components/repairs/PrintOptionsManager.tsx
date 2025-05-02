import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PrintRepairDialog } from './PrintRepairDialog';

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
  const [repairId, setRepairId] = useState<number | null>(null);
  
  // Druckoptionen anzeigen
  const handleShowPrintOptions = (id: number) => {
    console.log("Zeige Druckoptionen für Reparatur:", id);
    console.log("Setze repairId in PrintOptionsManager:", id);
    setRepairId(id);
    setShowPrintOptions(true);
    
    // Prüfung nach State-Update (wird asynchron sein)
    setTimeout(() => {
      console.log("RepairId nach State-Update:", repairId);
    }, 10);
  };
  
  // Wir verwenden keine separaten Handler mehr, da PrintRepairDialog
  // jetzt direkt die Druckoptionen verwaltet

  return (
    <PrintManagerContext.Provider value={{ showPrintOptions: handleShowPrintOptions }}>
      {children}
      
      {/* Druckoptionen Dialog - separater Dialog - Wir verwenden stattdessen den PrintRepairDialog */}
      <PrintRepairDialog
        open={showPrintOptions}
        onClose={() => setShowPrintOptions(false)}
        repairId={repairId}
      />
      
      {/* Wir haben die separaten Druck-Dialoge entfernt, da PrintRepairDialog jetzt alle Optionen abdeckt */}
    </PrintManagerContext.Provider>
  );
}