import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { Loader2, Printer } from 'lucide-react';

interface PrintLabelDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintLabelDialog({ open, onClose, repairId }: PrintLabelDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Lade Reparaturdaten
  const { data: repair, isLoading: isLoadingRepair } = useQuery<Repair>({
    queryKey: ['/api/repairs', repairId],
    queryFn: async () => {
      if (!repairId) return null;
      try {
        const response = await fetch(`/api/repairs/${repairId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!response.ok) throw new Error("Reparaturauftrag konnte nicht geladen werden");
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Reparaturdaten:", err);
        return null;
      }
    },
    enabled: !!repairId && open,
  });

  // Lade Kundendaten wenn Reparatur geladen ist
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ['/api/customers', repair?.customerId],
    queryFn: async () => {
      if (!repair?.customerId) return null;
      try {
        const response = await fetch(`/api/customers/${repair.customerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!response.ok) throw new Error("Kundendaten konnten nicht geladen werden");
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Kundendaten:", err);
        return null;
      }
    },
    enabled: !!repair?.customerId && open,
  });

  // Lade Unternehmenseinstellungen
  const { data: businessSettings, isLoading: isLoadingSettings } = useQuery<BusinessSettings>({
    queryKey: ['/api/business-settings'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/business-settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!response.ok) return null;
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Unternehmenseinstellungen:", err);
        return null;
      }
    },
    enabled: open,
  });

  const isLoading = isLoadingRepair || isLoadingCustomer || isLoadingSettings;

  // Funktion zum Drucken
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      
      document.body.innerHTML = `
        <style>
          @media print {
            body {
              font-family: Arial, sans-serif;
              padding: 5px;
              margin: 0;
            }
            .label-container {
              width: 300px;
              padding: 10px;
              border: 1px dotted #ccc;
              page-break-inside: avoid;
            }
            .label-header {
              text-align: center;
              font-size: 12px;
              margin-bottom: 8px;
            }
            .label-content {
              font-size: 10px;
            }
            .text-center {
              text-align: center;
            }
            .font-bold {
              font-weight: bold;
            }
            .text-xs {
              font-size: 10px;
            }
            .text-sm {
              font-size: 12px;
            }
            .text-lg {
              font-size: 16px;
            }
            .mb-1 {
              margin-bottom: 4px;
            }
            .mb-2 {
              margin-bottom: 8px;
            }
          }
        </style>
        <div>${printContents}</div>
      `;
      
      window.print();
      document.body.innerHTML = originalContents;
      // Nach dem Drucken Dialog schließen
      onClose();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Etikett drucken</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto">
              <div ref={printRef}>
                <div className="label-container">
                  <div className="label-header text-center mb-2">
                    <p className="font-bold text-sm">{businessSettings?.businessName || "Handyshop Verwaltung"}</p>
                  </div>
                  
                  <div className="label-content">
                    <p className="text-center text-lg font-bold mb-1">#{repair?.id}</p>
                    <p className="text-xs mb-1">Kunde: {customer?.firstName} {customer?.lastName}</p>
                    <p className="text-xs mb-1">Tel: {customer?.phone}</p>
                    
                    <p className="text-xs mb-1">Gerät: {repair?.deviceType === 'smartphone' ? 'Smartphone' : 
                                     repair?.deviceType === 'tablet' ? 'Tablet' : 'Laptop'}</p>
                    <p className="text-xs mb-1">Marke/Modell: {repair?.brand} {repair?.model}</p>
                    
                    {repair?.serialNumber && <p className="text-xs mb-1">S/N: {repair.serialNumber}</p>}
                    
                    <p className="text-xs mb-1">Problem: {repair?.issue}</p>
                    
                    <p className="text-xs mb-2">Status: {repair?.status === 'eingegangen' ? 'Eingegangen' : 
                               repair?.status === 'in_reparatur' ? 'In Reparatur' : 
                               repair?.status === 'fertig' ? 'Fertig' : 
                               repair?.status === 'abgeholt' ? 'Abgeholt' : 'Außer Haus'}</p>
                    
                    {repair?.estimatedCost && <p className="text-xs mb-2">Preis: {repair.estimatedCost} €</p>}
                    
                    <p className="text-xs text-center">
                      {businessSettings?.phone}
                      {businessSettings?.phone && businessSettings?.email && " | "}
                      {businessSettings?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Drucken
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}