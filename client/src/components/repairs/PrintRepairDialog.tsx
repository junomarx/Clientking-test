import React, { useRef, useEffect } from 'react';
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
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairDialog({ open, onClose, repairId }: PrintRepairDialogProps) {
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
              padding: 15px;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .print-section {
              margin-bottom: 15px;
            }
            .print-row {
              display: flex;
              margin-bottom: 5px;
            }
            .print-label {
              font-weight: bold;
              width: 150px;
            }
            .print-value {
              flex: 1;
            }
            .print-footer {
              margin-top: 30px;
              font-size: 12px;
              text-align: center;
            }
            .text-xs {
              font-size: 12px;
            }
          }
        </style>
        <div class="print-container">${printContents}</div>
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reparaturauftrag drucken</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto">
              <div ref={printRef}>
                <div className="print-header text-center mb-6">
                  <h2 className="text-xl font-bold">{businessSettings?.businessName || "Handyshop Verwaltung"}</h2>
                  {businessSettings?.phone && <p className="text-sm">Tel: {businessSettings.phone}</p>}
                  {businessSettings?.email && <p className="text-sm">E-Mail: {businessSettings.email}</p>}
                  <p className="text-xs">
                    {businessSettings ? (
                      `${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}`
                    ) : (
                      "Adresse nicht verfügbar"
                    )}
                  </p>
                  {businessSettings?.website && <p className="text-xs">{businessSettings.website}</p>}
                </div>
                
                <div className="print-section mb-4">
                  <h3 className="font-semibold text-lg mb-2">Reparaturauftrag #{repair?.id}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p><span className="font-medium">Datum:</span> {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</p>
                      <p><span className="font-medium">Status:</span> {repair?.status === 'eingegangen' ? 'Eingegangen' : 
                                                  repair?.status === 'in_reparatur' ? 'In Reparatur' : 
                                                  repair?.status === 'fertig' ? 'Fertig' : 
                                                  repair?.status === 'abgeholt' ? 'Abgeholt' : 'Außer Haus'}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Auftragsnummer:</span> {repair?.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Kundendaten</h3>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <p><span className="font-medium">Name:</span> {customer?.firstName} {customer?.lastName}</p>
                    <p><span className="font-medium">Telefon:</span> {customer?.phone}</p>
                    {customer?.email && <p><span className="font-medium">E-Mail:</span> {customer?.email}</p>}
                  </div>
                </div>
                
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Gerätedaten</h3>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <p><span className="font-medium">Typ:</span> {repair?.deviceType === 'smartphone' ? 'Smartphone' : 
                                            repair?.deviceType === 'tablet' ? 'Tablet' : 'Laptop'}</p>
                    <p><span className="font-medium">Marke:</span> {repair?.brand}</p>
                    <p><span className="font-medium">Modell:</span> {repair?.model}</p>
                    {repair?.serialNumber && <p><span className="font-medium">Seriennummer:</span> {repair.serialNumber}</p>}
                  </div>
                </div>
                
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Reparaturdetails</h3>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <p><span className="font-medium">Problem:</span> {repair?.issue}</p>
                    {repair?.estimatedCost && <p><span className="font-medium">Kostenvoranschlag:</span> {repair.estimatedCost} €</p>}
                    {repair?.notes && <p><span className="font-medium">Notizen:</span> {repair.notes}</p>}
                  </div>
                </div>
                
                <div className="print-section mt-8">
                  <div className="border-t pt-4 text-xs">
                    <p className="text-center">Vielen Dank für Ihren Auftrag.</p>
                    <p className="text-center">Bitte bewahren Sie diesen Beleg auf. Er dient als Nachweis für die Abholung Ihres Geräts.</p>
                    <p className="text-center mt-2">© {new Date().getFullYear()} {businessSettings?.businessName || "Handyshop Verwaltung"}</p>
                    {businessSettings?.taxId && (
                      <p className="text-center">UID: {businessSettings.taxId}</p>
                    )}
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