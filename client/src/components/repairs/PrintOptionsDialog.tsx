import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Tag, X } from 'lucide-react';

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
  // Dialog immer als Root-Element verwenden, nicht in andere Dialog-Komponenten verschachteln
  console.log("PrintOptionsDialog gerendert mit open:", open, "repairId:", repairId);
  
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
            
            <Button 
              onClick={onPrintLabel}
              className="h-24 flex flex-col items-center justify-center gap-2 text-lg"
              variant="outline"
            >
              <Tag className="h-8 w-8" />
              <span>Etikett drucken</span>
            </Button>
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