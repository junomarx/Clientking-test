import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
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
  const queryClient = useQueryClient();

  // Nutze bereits gecachte Daten aus dem Query Client
  const repairs = queryClient.getQueryData<Repair[]>(['/api/repairs']);
  const customers = queryClient.getQueryData<Customer[]>(['/api/customers']);
  
  const repair = repairs?.find(r => r.id === repairId) || null;
  const customer: Customer | undefined = repair && customers ? customers.find(c => c.id === repair.customerId) : undefined;
  
  // Aktive Abfrage des Device-Codes, um sicherzustellen, dass die Daten verfügbar sind
  const { data: deviceCodeData } = useQuery({
    queryKey: ['/api/repairs', repairId, 'device-code'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/repairs/${repairId}/device-code`);
      if (!response.ok) {
        // Wenn kein Device-Code vorhanden ist, geben wir null zurück
        if (response.status === 404) {
          return null;
        }
        throw new Error('Fehler beim Laden des Device-Codes');
      }
      return await response.json();
    },
    enabled: !!repairId && open,
    staleTime: 5 * 60 * 1000, // 5 Minuten Cache
  });

  const isLoading = false;

  // Helper function to safely render customer name
  const getCustomerName = (): string => {
    if (!customer) return 'Kunde';
    const firstName = customer.firstName || 'Kunde';
    const lastName = customer.lastName || '';
    return `${firstName} ${lastName}`.trim();
  };


  // Hilfsfunktion um den Gerätecode für das Etikett zu formatieren
  const formatDeviceCodeForLabel = (deviceCodeData: any): string => {
    console.log('formatDeviceCodeForLabel called with:', deviceCodeData);
    
    if (!deviceCodeData || !deviceCodeData.deviceCode) {
      console.log('No device code data available');
      return '';
    }
    
    if (deviceCodeData.deviceCodeType === 'pattern') {
      // Pattern codes sind als "6-3-0-1-2-4-5-7-8" gespeichert (0-8 intern)
      // Für das Etikett zeigen wir sie als 1-9 (benutzerfreundlich)
      const patternNumbers = deviceCodeData.deviceCode.split('-').map((num: string) => {
        const digit = parseInt(num);
        return (digit + 1).toString(); // +1 für die Anzeige (0-8 wird zu 1-9)
      });
      const result = `Muster: ${patternNumbers.join(',')}`;
      console.log('Pattern code formatted:', result);
      return result;
    } else {
      // Behandle sowohl 'text' als auch undefined/null/andere als PIN-Code
      const result = `Code: ${deviceCodeData.deviceCode}`;
      console.log('Text code formatted:', result);
      return result;
    }
  };

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
    const repairIdValue = repair?.id || repairId || '';
    const orderCode = repair?.orderCode || `#${repairIdValue}`;
    const firstName = customer?.firstName || 'Kunde';
    const lastName = customer?.lastName || '';
    const customerPhone = customer?.phone || '';
    const model = repair?.model || '';
    const repairIssue = repair?.issue || '';
    const deviceCode = formatDeviceCodeForLabel(deviceCodeData);
    
    // Debug für Geräte-Code
    console.log('Device Code Debug:');
    console.log('deviceCodeData:', deviceCodeData);
    console.log('formatted deviceCode:', deviceCode);
    console.log('deviceCode length:', deviceCode?.length);
    console.log('deviceCode truthy:', !!deviceCode);
    console.log('repair?.deviceCodeType:', repair?.deviceCodeType);
    
    // Fülle das Druckfenster mit Inhalten
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etikett für Reparatur ${orderCode || `#${repairId}`}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 57mm 32mm;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 57mm;
              height: 32mm;
              overflow: hidden;
              font-family: Arial, sans-serif;
            }
            .label {
              width: 57mm;
              height: 32mm;
              box-sizing: border-box;
              padding: 2mm;
              background-color: white;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }
            .print-area {
              width: 53mm;
              height: 28mm;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            }
            .left-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding-right: 2mm;
            }
            .right-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .repair-number {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 1mm;
            }
            .customer-name {
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 0.5mm;
            }
            .customer-phone {
              font-size: 7px;
              margin-bottom: 0.5mm;
              color: #333;
            }
            .model {
              font-size: 8px;
              font-weight: bold;
              margin-bottom: 0.5mm;
            }
            .device-code {
              font-size: 7px;
              font-weight: bold;
              color: #333;
              border: 1px solid #666;
              padding: 0.5mm 1mm;
              background-color: #f0f0f0;
              border-radius: 1mm;
              display: inline-block;
              margin-bottom: 0.5mm;
            }
            .issue {
              font-size: 7px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 25mm;
            }
            .qr-code {
              width: 20mm;
              height: 20mm;
            }
            .qr-code svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="print-area">
              <div class="repair-number">${orderCode}</div>
              
              <div class="customer-name">${firstName} ${lastName}</div>
              
              ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
              
              <div class="qr-code">${qrCode}</div>
              
              ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : `<!-- Kein Device-Code: deviceCodeData=${JSON.stringify(deviceCodeData)}, deviceCode='${deviceCode}' -->`}
              
              <div class="model">${model}</div>
              
              <div class="issue">${repairIssue ? repairIssue.split(',').join('\n') : ''}</div>
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
                  <div style={{ width: '26mm', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
                    {/* Auftragsnummer */}
                    <div className="text-center">
                      <p className="text-lg font-bold">{repair?.orderCode || `#${repair?.id}`}</p>
                    </div>
                    
                    {/* Kundenname */}
                    <div className="text-center w-full">
                      <p className="text-xs font-bold">
                        {customer?.firstName || 'Kunde'} {customer?.lastName || ''}
                      </p>
                    </div>
                    
                    {/* Telefonnummer zwischen Name und QR-Code */}
                    <div className="text-center w-full mb-2">
                      <p className="text-xs text-gray-600">
                        {customer?.phone || ''}
                      </p>
                    </div>
                    
                    {/* QR-Code mittig */}
                    <div className="flex justify-center">
                      <QRCodeSVG 
                        value={`${window.location.origin}/repairs/${repair?.orderCode || repair?.id}`} 
                        size={64} 
                        level="M"
                      />
                    </div>
                    
                    {/* Geräte-Code (falls vorhanden) */}
                    {deviceCodeData && formatDeviceCodeForLabel(deviceCodeData) && (
                      <div className="text-center w-full mb-2">
                        <div className="text-xs font-bold bg-gray-100 border border-gray-300 rounded px-2 py-1 inline-block">
                          {formatDeviceCodeForLabel(deviceCodeData) as string}
                        </div>
                      </div>
                    )}
                    
                    {/* Modell */}
                    <div className="text-center w-full">
                      <p className="text-xs font-bold">{repair?.model}</p>
                    </div>
                    
                    {/* Fehler */}
                    <div className="text-center w-full">
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