import React, { useRef, useState, useEffect } from 'react';
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
  
  // Logo-Status
  const [logoExists, setLogoExists] = useState(false);
  
  // Überprüfe, ob das Logo existiert
  useEffect(() => {
    if (open && repairId) {
      // Überprüfe, ob das Logo existiert
      fetch('/api/business-settings/logo')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setLogoExists(true);
          }
        })
        .catch(err => {
          console.error('Fehler beim Prüfen des Logos:', err);
          setLogoExists(false);
        });
    }
  }, [open, repairId]);

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
    const qrCode = `<svg width="60" height="60"><foreignObject width="60" height="60"><div xmlns="http://www.w3.org/1999/xhtml"><div style="width:60px;height:60px;">${printRef.current.querySelector('svg')?.outerHTML || ''}</div></div></foreignObject></svg>`;
    const repairId = repair?.id || '';
    const orderCode = repair?.orderCode || '';
    const firstName = customer?.firstName || '';
    const lastName = customer?.lastName || '';
    const customerPhone = customer?.phone || '';
    const model = repair?.model || '';
    const repairIssue = repair?.issue || '';
    // Logo-Informationen
    const businessName = businessSettings?.businessName || 'Handyshop Verwaltung';
    
    // Fülle das Druckfenster mit Inhalten
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etikett für Reparatur ${orderCode || `#${repairId}`}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 32mm 57mm;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 32mm;
              height: 57mm;
              overflow: hidden;
              font-family: Arial, sans-serif;
            }
            .label {
              width: 32mm;
              height: 57mm;
              box-sizing: border-box;
              padding: 3mm;
              background-color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .print-area {
              width: 26mm;
              height: 51mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
            }
            .repair-number {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            .qr-code {
              margin-bottom: 2mm;
              width: 20mm;
              height: 20mm;
            }
            .qr-code svg {
              width: 100%;
              height: 100%;
            }
            .customer-info {
              text-align: center;
              width: 100%;
              margin-bottom: 2mm;
            }
            .first-name {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 1mm;
            }
            .last-name {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 1mm;
            }
            .phone {
              font-size: 10px;
              margin-bottom: 2mm;
            }
            .repair-info {
              text-align: center;
              width: 100%;
              font-size: 9px;
            }
            .model {
              margin-bottom: 1mm;
              font-weight: bold;
            }
            .issue {
              font-size: 9px;
              white-space: pre-wrap;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="print-area">
              ${logoExists ? `
              <div style="margin-bottom: 2mm; max-height: 8mm; overflow: hidden;">
                <img src="/uploads/firmenlogo.png?t=${new Date().getTime()}" alt="${businessName}" style="max-height: 8mm; max-width: 26mm;">
              </div>
              ` : ''}

              <div class="repair-number">${orderCode || `#${repairId}`}</div>
              
              <div class="qr-code">${qrCode}</div>
              
              <div class="customer-info">
                <div class="first-name">${firstName}</div>
                <div class="last-name">${lastName}</div>
                <div class="phone">${customerPhone}</div>
              </div>
              
              <div class="repair-info">
                <div class="model">${model}</div>
                <div class="issue">${repairIssue ? repairIssue.split(',').join('\n') : ''}</div>
              </div>
            </div>
          </div>
          <script>
            // Drucken nach vollständigem Laden
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close(); // Fenster direkt schließen, ohne auf onafterprint zu warten
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
                <div ref={printRef} className="label-container border border-dashed border-gray-300 p-3">
                  {/* Vorschau im gleichen Format wie das Drucklayout (Hochformat) */}
                  <div style={{ width: '26mm', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3mm' }}>
                    {/* Logo, wenn vorhanden */}
                    {logoExists && (
                      <div className="flex justify-center mb-1" style={{ maxHeight: '8mm', overflow: 'hidden' }}>
                        <img 
                          src={`/uploads/firmenlogo.png?t=${new Date().getTime()}`} 
                          alt={businessSettings?.businessName || "Handyshop Verwaltung"} 
                          style={{ maxHeight: '8mm', maxWidth: '26mm' }}
                        />
                      </div>
                    )}
                    
                    {/* Auftragsnummer */}
                    <div className="text-center">
                      <p className="text-xl font-bold">{repair?.orderCode || `#${repair?.id}`}</p>
                    </div>
                    
                    {/* QR-Code mittig */}
                    <div className="flex justify-center">
                      <QRCodeSVG 
                        value={`${window.location.origin}/repairs/${repair?.id}`} 
                        size={76} 
                        level="M"
                      />
                    </div>
                    
                    {/* Kundendaten */}
                    <div className="text-center w-full">
                      <p className="text-xs font-bold">{customer?.firstName}</p>
                      <p className="text-xs font-bold">{customer?.lastName}</p>
                      <p className="text-xs">{customer?.phone}</p>
                    </div>
                    
                    {/* Reparaturinformationen */}
                    <div className="text-center w-full">
                      <p className="text-xs font-bold">{repair?.model}</p>
                      <p className="text-xs whitespace-pre-wrap">{repair?.issue ? repair.issue.split(',').join('\n') : ''}</p>
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