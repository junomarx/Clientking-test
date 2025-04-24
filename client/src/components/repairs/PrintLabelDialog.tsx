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
                    size: 100mm 50mm;
                    margin: 3mm;
                  }
                  body {
                    font-family: Arial, sans-serif;
                    padding: 0;
                    margin: 0;
                  }
                  .label-container {
                    width: 94mm;
                    padding: 2mm;
                    border: 1px dotted #ccc;
                    page-break-inside: avoid;
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
                    font-size: 10px;
                  }
                  .text-sm {
                    font-size: 12px;
                  }
                  .text-lg {
                    font-size: 16px;
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
                    max-width: 150px;
                  }
                  
                  .object-contain {
                    object-fit: contain;
                  }
                  
                  img {
                    max-width: 100%;
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
                <div className="label-container border border-dashed border-gray-300 p-4 rounded-lg">
                  <div className="label-header text-center mb-3 border-b border-primary pb-2">
                    {businessSettings?.logoImage && (
                      <div className="mb-2 flex justify-center">
                        <img 
                          src={businessSettings.logoImage} 
                          alt={businessSettings.businessName || "Firmenlogo"}
                          className="max-h-12 max-w-[150px] object-contain"
                        />
                      </div>
                    )}
                    <p className="font-bold text-sm text-primary">{businessSettings?.businessName || "Handyshop Verwaltung"}</p>
                  </div>
                  
                  <div className="label-content">
                    <div className="bg-primary text-white text-center rounded py-1 px-2 mb-3">
                      <p className="text-lg font-bold">Reparatur #{repair?.id}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Kunde:</p>
                        <p className="text-xs">{customer?.firstName} {customer?.lastName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Telefon:</p>
                        <p className="text-xs">{customer?.phone}</p>
                      </div>
                    </div>
                    
                    <div className="border-t border-b border-gray-200 py-2 my-2">
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <p className="text-xs font-semibold text-gray-600">Gerät:</p>
                          <p className="text-xs">{repair?.deviceType === 'smartphone' ? 'Smartphone' : 
                                     repair?.deviceType === 'tablet' ? 'Tablet' : 'Laptop'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-600">Marke/Modell:</p>
                          <p className="text-xs">{repair?.brand} {repair?.model}</p>
                        </div>
                      </div>
                      
                      {repair?.serialNumber && (
                        <div className="mt-1">
                          <p className="text-xs font-semibold text-gray-600">S/N:</p>
                          <p className="text-xs">{repair.serialNumber}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-600">Problem:</p>
                      <p className="text-xs">{repair?.issue}</p>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Status:</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          repair?.status === 'eingegangen' ? 'bg-gray-100 text-gray-600' :
                          repair?.status === 'in_reparatur' ? 'bg-amber-100 text-amber-800' :
                          repair?.status === 'fertig' ? 'bg-green-100 text-green-800' :
                          repair?.status === 'abgeholt' ? 'bg-blue-100 text-blue-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {repair?.status === 'eingegangen' ? 'Eingegangen' : 
                           repair?.status === 'in_reparatur' ? 'In Reparatur' : 
                           repair?.status === 'fertig' ? 'Fertig' : 
                           repair?.status === 'abgeholt' ? 'Abgeholt' : 'Außer Haus'}
                        </span>
                      </div>
                      
                      {repair?.estimatedCost && (
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-600">Preis:</p>
                          <p className="text-xs font-semibold">{repair.estimatedCost} €</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-center text-gray-500">
                      {businessSettings?.phone}
                      {businessSettings?.phone && businessSettings?.email && " | "}
                      {businessSettings?.email}
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