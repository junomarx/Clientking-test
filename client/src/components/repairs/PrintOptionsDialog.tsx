import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Tag, AlertCircle, FileText } from 'lucide-react';
// Import für PrintOptionsManager entfernt, da nicht mehr benötigt
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PrintRepairA4Dialog } from "@/components/repairs/PrintRepairA4Dialog";

// API for checking permissions
const checkCanPrintLabels = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/can-print-labels', {
      credentials: 'include'
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.canPrintLabels;
  } catch (error) {
    console.error('Fehler bei der Prüfung der Etikett-Druckberechtigung:', error);
    return false;
  }
};

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onPrintReceipt: () => void;
  onPrintLabel: () => void;
  onPrintA4?: () => void; // Neuer Handler für DIN A4 Ausdruck
  repairId: number | null;
  repair?: {
    customerName: string;
    customerStreet?: string;
    customerCity?: string;
    manufacturer?: string;
    model?: string;
    problem?: string;
    totalPrice?: number;
    id: number | string;
    createdAt?: string;
  };
}

export function PrintOptionsDialog({
  open,
  onClose,
  onPrintReceipt,
  onPrintLabel,
  onPrintA4,
  repairId,
  repair
}: PrintOptionsDialogProps) {
  // printManager entfernt, da nicht mehr benötigt
  // State für die Berechtigung zum Drucken von Etiketten
  const [canPrintLabels, setCanPrintLabels] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showA4Preview, setShowA4Preview] = useState(false);
  
  // Abfrage der Berechtigung beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      checkCanPrintLabels()
        .then(canPrint => {
          setCanPrintLabels(canPrint);
          setIsLoading(false);
        })
        .catch(() => {
          setCanPrintLabels(false);
          setIsLoading(false);
        });
    }
  }, [open]);
  
  console.log("PrintOptionsDialog gerendert mit open:", open, "repairId:", repairId, "canPrintLabels:", canPrintLabels);
  
  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Druckoptionen</DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={onPrintReceipt}
              className="h-24 flex flex-col items-center justify-center gap-2 text-lg"
              variant="outline"
            >
              <Printer className="h-8 w-8" />
              <span>Bon drucken</span>
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative w-full">
                    <Button 
                      onClick={canPrintLabels ? onPrintLabel : undefined}
                      className="h-24 flex flex-col items-center justify-center gap-2 text-lg w-full"
                      variant="outline"
                      disabled={isLoading || !canPrintLabels}
                    >
                      {canPrintLabels === false && (
                        <div className="absolute top-2 right-2">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        </div>
                      )}
                      <Tag className="h-8 w-8" />
                      <span>Etikett drucken</span>
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canPrintLabels && (
                  <TooltipContent side="bottom">
                    <p>Diese Funktion ist nur im Professional- und Enterprise-Paket verfügbar</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* DIN A4 Druckoption wurde entfernt */}
          
          {/* A4 Vorschau-Button */}
          <div className="mt-4">
            <Button
              onClick={() => setShowA4Preview(true)}
              className="h-24 flex flex-col items-center justify-center gap-2 text-lg w-full"
              variant="outline"
            >
              <FileText className="h-8 w-8" />
              <span>A4 Vorschau</span>
            </Button>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col space-y-2 sm:space-y-0">
          <Button 
            onClick={onClose} 
            variant="ghost"
            className="w-full"
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* A4 Vorschau Dialog */}
      <PrintRepairA4Dialog
        open={showA4Preview}
        onClose={() => setShowA4Preview(false)}
        repairId={repairId}
      />
    </Dialog>
  );
}