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
            @page {
              size: A4;
              margin: 10mm;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 0;
              margin: 0;
              color: #333;
            }
            
            .print-container {
              max-width: 100%;
              margin: 0 auto;
            }
            
            .print-header {
              text-align: center;
              padding-bottom: 15px;
              border-bottom: 2px solid #3b82f6;
              margin-bottom: 20px;
            }
            
            .print-header h2 {
              font-size: 24px;
              margin-bottom: 5px;
              color: #1e3a8a;
            }
            
            .print-section {
              margin-bottom: 20px;
              padding-bottom: 10px;
            }
            
            .print-section h3 {
              font-size: 16px;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #ddd;
              color: #1e3a8a;
            }
            
            .print-row {
              display: flex;
              margin-bottom: 5px;
            }
            
            .print-label {
              font-weight: 600;
              width: 150px;
              color: #4b5563;
            }
            
            .print-value {
              flex: 1;
            }
            
            .grid-cols-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            
            .grid-cols-1 {
              display: grid;
              grid-template-columns: 1fr;
              gap: 8px;
            }
            
            .font-medium {
              font-weight: 600;
              margin-right: 5px;
              color: #4b5563;
            }
            
            .font-semibold {
              font-weight: 700;
              color: #1e3a8a;
            }
            
            .text-sm {
              font-size: 14px;
            }
            
            .text-xs {
              font-size: 12px;
            }
            
            .text-center {
              text-align: center;
            }
            
            .mb-2 {
              margin-bottom: 10px;
            }
            
            .mb-4 {
              margin-bottom: 20px;
            }
            
            .mt-8 {
              margin-top: 40px;
            }
            
            .border-t {
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            
            .highlight-box {
              background-color: #f3f4f6;
              border-radius: 5px;
              padding: 15px;
              margin-top: 10px;
              margin-bottom: 10px;
              border-left: 4px solid #3b82f6;
            }
            
            .receipt-number {
              display: inline-block;
              background-color: #1e3a8a;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              font-weight: bold;
              margin-left: 10px;
              font-size: 14px;
            }
            
            .receipt-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #3b82f6;
              font-size: 12px;
              text-align: center;
              color: #4b5563;
            }
            
            .receipt-watermark {
              position: fixed;
              top: 50%;
              left: 0;
              width: 100%;
              text-align: center;
              opacity: 0.03;
              transform: rotate(-45deg);
              font-size: 80px;
              font-weight: bold;
              z-index: -1;
              color: #000;
            }
            
            .status-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            
            .status-eingegangen {
              background-color: #e5e7eb;
              color: #4b5563;
            }
            
            .status-in-reparatur {
              background-color: #fef3c7;
              color: #92400e;
            }
            
            .status-fertig {
              background-color: #d1fae5;
              color: #065f46;
            }
            
            .status-abgeholt {
              background-color: #dbeafe;
              color: #1e40af;
            }
            
            .status-ausser-haus {
              background-color: #e0e7ff;
              color: #4338ca;
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
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto bg-gray-50 shadow-inner">
              <div ref={printRef} className="bg-white p-6 rounded-md shadow-sm">
                {/* Wasserzeichen */}
                <div className="receipt-watermark">
                  REPARATURAUFTRAG
                </div>
                
                {/* Header */}
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
                
                {/* Auftragskopf */}
                <div className="print-section mb-4">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-lg">Reparaturauftrag</h3>
                    <span className="receipt-number">#{repair?.id}</span>
                  </div>
                  
                  <div className="highlight-box mt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <span className="font-medium">Datum:</span> 
                          {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>
                          <span className={`status-badge status-${repair?.status === 'in_reparatur' 
                              ? 'in-reparatur' 
                              : repair?.status === 'ausser_haus' 
                                ? 'ausser-haus' 
                                : repair?.status}`}>
                            {repair?.status === 'eingegangen' ? 'Eingegangen' : 
                             repair?.status === 'in_reparatur' ? 'In Reparatur' : 
                             repair?.status === 'fertig' ? 'Fertig' : 
                             repair?.status === 'abgeholt' ? 'Abgeholt' : 'Außer Haus'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p><span className="font-medium">Auftragsnummer:</span> {repair?.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Kundendaten */}
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Kundendaten</h3>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <p><span className="font-medium">Name:</span> {customer?.firstName} {customer?.lastName}</p>
                    <p><span className="font-medium">Telefon:</span> {customer?.phone}</p>
                    {customer?.email && <p><span className="font-medium">E-Mail:</span> {customer?.email}</p>}
                  </div>
                </div>
                
                {/* Gerätedaten */}
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Gerätedaten</h3>
                  <div className="highlight-box">
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <p><span className="font-medium">Typ:</span> {repair?.deviceType === 'smartphone' ? 'Smartphone' : 
                                            repair?.deviceType === 'tablet' ? 'Tablet' : 'Laptop'}</p>
                      <p><span className="font-medium">Marke:</span> {repair?.brand}</p>
                      <p><span className="font-medium">Modell:</span> {repair?.model}</p>
                      {repair?.serialNumber && <p><span className="font-medium">Seriennummer:</span> {repair.serialNumber}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Reparaturdetails */}
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Reparaturdetails</h3>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="highlight-box">
                      <p><span className="font-medium">Problem:</span> {repair?.issue}</p>
                    </div>
                    
                    {repair?.estimatedCost && (
                      <div className="highlight-box">
                        <p><span className="font-medium">Kostenvoranschlag:</span> {repair.estimatedCost} €</p>
                      </div>
                    )}
                    
                    {repair?.notes && (
                      <div>
                        <p><span className="font-medium">Notizen:</span></p>
                        <p className="mt-1 ml-4">{repair.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer */}
                <div className="receipt-footer">
                  <p>Vielen Dank für Ihren Auftrag.</p>
                  <p>Bitte bewahren Sie diesen Beleg auf. Er dient als Nachweis für die Abholung Ihres Geräts.</p>
                  <p className="mt-2">© {new Date().getFullYear()} {businessSettings?.businessName || "Handyshop Verwaltung"}</p>
                  {businessSettings?.taxId && <p>UID: {businessSettings.taxId}</p>}
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