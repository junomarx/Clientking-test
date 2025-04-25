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
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { QRCodeSVG } from 'qrcode.react';

interface PrintLabelDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintLabelDialog({ open, onClose, repairId }: PrintLabelDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings();

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

  // Funktion zum Drucken mit verbessertem Error-Handling
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const closeDialog = onClose;
      
      try {
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
          alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
          return;
        }
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Etikett für Reparatur #${repair?.id}</title>
              <style>
                @media print {
                  @page {
                    size: 57mm 32mm;
                    margin: 0;
                  }
                  body {
                    font-family: Arial, sans-serif;
                    padding: 0;
                    margin: 0;
                  }
                  .label-container {
                    width: 57mm;
                    height: 32mm;
                    padding: 1mm;
                    border: none;
                    page-break-inside: avoid;
                    overflow: hidden;
                  }
                  .label-header {
                    text-align: center;
                    font-size: 12px;
                    margin-bottom: 2mm;
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
                    font-size: 7px;
                  }
                  .text-sm {
                    font-size: 9px;
                  }
                  .text-lg {
                    font-size: 14px;
                  }
                  .text-xl {
                    font-size: 16px;
                    font-weight: bold;
                  }
                  .mb-1 {
                    margin-bottom: 1mm;
                  }
                  .mb-2 {
                    margin-bottom: 2mm;
                  }
                  
                  /* Zusätzliche Stile für Logo */
                  .flex {
                    display: flex;
                  }
                  
                  .justify-center {
                    justify-content: center;
                  }
                  
                  .max-h-12 {
                    max-height: 48px;
                  }
                  
                  .max-w-\\[150px\\] {
                    max-width: ${settings?.receiptWidth === '58mm' ? '50px' : '150px'};
                  }
                  
                  .object-contain {
                    object-fit: contain;
                  }
                  
                  img {
                    max-width: ${settings?.receiptWidth === '58mm' ? '40mm' : '100%'};
                    max-height: ${settings?.receiptWidth === '58mm' ? '10mm' : '20mm'};
                  }
                }
                
                /* Nicht-Druck-Styles */
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  background-color: #f5f5f5;
                }
                .label-container {
                  width: 300px;
                  padding: 10px;
                  border: 1px dotted #ccc;
                  background-color: white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                  margin: 0 auto 20px;
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
                .print-button {
                  background-color: #3b82f6;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  font-size: 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  margin: 20px auto;
                  display: block;
                }
                .close-button {
                  background-color: #e5e7eb;
                  color: #4b5563;
                  border: none;
                  padding: 10px 20px;
                  font-size: 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  margin: 0 auto;
                  display: block;
                }
              </style>
            </head>
            <body>
              <div>${printContents}</div>
              <button class="print-button" onClick="window.print(); window.close();">
                Drucken
              </button>
              <button class="close-button" onClick="window.close();">
                Schließen
              </button>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        closeDialog();
      } catch (error) {
        console.error('Fehler beim Drucken:', error);
        alert('Beim Drucken ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
        closeDialog();
      }
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
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto bg-gray-50 shadow-inner">
              <div ref={printRef} className="bg-white p-4 rounded-md shadow-sm">
                <div className="label-container border border-dashed border-gray-300 p-1">
                  {/* Auftragsnummer mittig und fett */}
                  <div className="text-center mb-1">
                    <p className="text-xl font-bold">#{repair?.id}</p>
                  </div>
                  
                  <div className="flex space-x-1">
                    {/* QR-Code auf der linken Seite */}
                    <div className="flex-shrink-0">
                      <QRCodeSVG 
                        value={`${window.location.origin}/repairs/${repair?.id}`} 
                        size={64} 
                        level="M"
                      />
                    </div>
                    
                    {/* Kundendaten und Reparaturinformationen auf der rechten Seite */}
                    <div className="flex-grow">
                      <div className="mb-1">
                        <p className="text-xs font-bold">{customer?.firstName} {customer?.lastName}</p>
                        <p className="text-xs">{customer?.phone}</p>
                      </div>
                      
                      <div className="mb-1">
                        <p className="text-xs">{repair?.brand} {repair?.model}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs">{repair?.issue}</p>
                      </div>
                    </div>
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