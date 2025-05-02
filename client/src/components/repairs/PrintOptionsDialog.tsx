import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Tag, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// API for checking permissions
const checkCanPrintLabels = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/can-print-labels');
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
  repairId: number | null;
}

export function PrintOptionsDialog({
  open,
  onClose,
  onPrintReceipt,
  onPrintLabel,
  repairId
}: PrintOptionsDialogProps) {
  // State für die Berechtigung zum Drucken von Etiketten
  const [canPrintLabels, setCanPrintLabels] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
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
          <DialogTitle className="text-xl font-semibold">Auftrag #{repairId} - Druckoptionen</DialogTitle>
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
        </div>
        
        <DialogFooter>
          <Button 
            onClick={onClose} 
            variant="ghost"
            className="w-full"
          >
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}