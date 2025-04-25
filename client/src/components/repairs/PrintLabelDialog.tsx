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

  // Funktion zum Drucken mit neuem Fenster
  const handlePrint = () => {
    if (!printRef.current) {
      console.error('Druckelement nicht gefunden');
      return;
    }
    
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
      return;
    }
    
    // Extrahiere den Inhalt aus dem Referenzobjekt
    const qrCode = printRef.current.querySelector('svg')?.outerHTML || '';
    const repairId = repair?.id || '';
    const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`;
    const customerPhone = customer?.phone || '';
    const deviceInfo = `${repair?.brand || ''} ${repair?.model || ''}`;
    const repairIssue = repair?.issue || '';
    
    // Fülle das Druckfenster mit Inhalten
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etikett für Reparatur #${repairId}</title>
          <style>
            @page {
              size: 32mm 57mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .print-container {
              position: relative;
              width: 32mm;
              height: 57mm;
              transform: rotate(90deg);
              transform-origin: bottom left;
              position: absolute;
              left: 0;
              bottom: 57mm;
              padding: 1mm;
              box-sizing: border-box;
            }
            .repair-id {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 3mm;
            }
            .content-container {
              display: flex;
            }
            .qr-code {
              flex-shrink: 0;
              width: 64px;
            }
            .details {
              flex-grow: 1;
              margin-left: 3mm;
              font-size: 7px;
            }
            .customer-name {
              font-weight: bold;
            }
            .item {
              margin-bottom: 2mm;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="repair-id">#${repairId}</div>
            <div class="content-container">
              <div class="qr-code">${qrCode}</div>
              <div class="details">
                <div class="item">
                  <div class="customer-name">${customerName}</div>
                  <div>${customerPhone}</div>
                </div>
                <div class="item">${deviceInfo}</div>
                <div class="item">${repairIssue}</div>
              </div>
            </div>
          </div>
          <script>
            // Drucken nach vollständigem Laden
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    onClose();
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
              <div className="bg-white p-4 rounded-md shadow-sm">
                <div ref={printRef} className="label-container border border-dashed border-gray-300 p-1">
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