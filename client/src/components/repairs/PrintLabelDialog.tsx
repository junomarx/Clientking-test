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
    
    // Dynamische Größen basierend auf Settings
    const labelFormat = settings?.labelFormat || 'portrait';
    const labelWidth = settings?.labelWidth || 32;
    const labelHeight = settings?.labelHeight || 57;
    
    // Fülle das Druckfenster mit Inhalten
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etikett für Reparatur ${orderCode || `#${repairId}`}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: ${labelWidth}mm ${labelHeight}mm;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: ${labelWidth}mm;
              height: ${labelHeight}mm;
              overflow: hidden;
              font-family: Arial, sans-serif;
            }
            .label {
              width: ${labelWidth}mm;
              height: ${labelHeight}mm;
              box-sizing: border-box;
              padding: 2mm;
              background-color: white;
              display: flex;
              flex-direction: ${labelFormat === 'landscape' ? 'row' : 'column'};
              align-items: center;
              justify-content: ${labelFormat === 'landscape' ? 'space-between' : 'flex-start'};
            }
            .print-area {
              width: ${labelWidth - 4}mm;
              height: ${labelHeight - 4}mm;
              display: flex;
              flex-direction: ${labelFormat === 'landscape' ? 'row' : 'column'};
              align-items: center;
              justify-content: ${labelFormat === 'landscape' ? 'space-between' : 'space-between'};
            }
            /* Format-spezifische Container */
            .left-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: ${labelFormat === 'landscape' ? 'space-between' : 'center'};
              width: ${labelFormat === 'landscape' ? '35%' : '100%'};
              height: 100%;
              ${labelFormat === 'landscape' ? 'padding: 1mm 0;' : ''}
            }
            .right-section {
              display: flex;
              flex-direction: column;
              justify-content: ${labelFormat === 'landscape' ? 'flex-start' : 'center'};
              width: ${labelFormat === 'landscape' ? '65%' : '100%'};
              height: 100%;
              ${labelFormat === 'landscape' ? 'padding: 1mm 0 1mm 2mm;' : ''}
              gap: ${labelFormat === 'landscape' ? '0.5mm' : '1mm'};
            }
            
            /* Element-Stile - formatabhängig */
            .repair-number {
              font-size: ${labelFormat === 'landscape' ? '11px' : '14px'};
              font-weight: bold;
              margin-bottom: ${labelFormat === 'landscape' ? '1mm' : '0.2mm'};
              line-height: 1;
            }
            .customer-name {
              font-size: ${labelFormat === 'landscape' ? '11px' : '10px'};
              font-weight: bold;
              margin-bottom: ${labelFormat === 'landscape' ? '0.2mm' : '0.3mm'};
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .customer-phone {
              font-size: ${labelFormat === 'landscape' ? '9px' : '8px'};
              margin-bottom: ${labelFormat === 'landscape' ? '0.2mm' : '0.5mm'};
              color: #333;
              line-height: 1;
            }
            .qr-code {
              margin-bottom: ${labelFormat === 'landscape' ? '0' : '1.5mm'};
              width: ${labelFormat === 'landscape' ? '12mm' : '17mm'};
              height: ${labelFormat === 'landscape' ? '12mm' : '17mm'};
            }
            .qr-code svg {
              width: 100%;
              height: 100%;
            }
            .device-code {
              font-size: ${labelFormat === 'landscape' ? '7px' : '8px'};
              margin-bottom: ${labelFormat === 'landscape' ? '0.2mm' : '1.5mm'};
              font-weight: bold;
              color: #333;
              border: 1px solid #666;
              padding: ${labelFormat === 'landscape' ? '0.5mm' : '1mm'};
              background-color: #f0f0f0;
              border-radius: 1mm;
              display: inline-block;
              line-height: 1;
            }
            .model {
              font-size: ${labelFormat === 'landscape' ? '10px' : '9px'};
              font-weight: bold;
              margin-bottom: ${labelFormat === 'landscape' ? '0.2mm' : '1mm'};
              line-height: 1.1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .issue {
              font-size: ${labelFormat === 'landscape' ? '8px' : '8px'};
              white-space: ${labelFormat === 'landscape' ? 'normal' : 'pre-wrap'};
              line-height: 1.1;
              ${labelFormat === 'landscape' ? 'overflow: hidden; text-overflow: ellipsis; max-height: 3.2em;' : ''}
            }
            
            /* Text-Ausrichtung basierend auf Layout */
            ${labelFormat === 'portrait' ? `
            .repair-number, .customer-name, .customer-phone, 
            .device-code, .model, .issue {
              text-align: center;
            }
            ` : `
            .left-section .repair-number {
              text-align: center;
            }
            .right-section .customer-name, 
            .right-section .customer-phone,
            .right-section .model, 
            .right-section .device-code,
            .right-section .issue {
              text-align: left;
            }
            `}
          </style>
        </head>
        <body>
          <div class="label">
            <div class="print-area">
              ${labelFormat === 'landscape' ? `
                <!-- Querformat Layout: Links QR + Order, Rechts Daten -->
                <div class="left-section">
                  <div class="repair-number">${orderCode}</div>
                  <div class="qr-code">${qrCode}</div>
                </div>
                <div class="right-section">
                  <div class="customer-name">${firstName} ${lastName}</div>
                  ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
                  <div class="model">${model}</div>
                  ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : ''}
                  <div class="issue">${repairIssue ? repairIssue.substring(0, 30) + (repairIssue.length > 30 ? '...' : '') : ''}</div>
                </div>
              ` : `
                <!-- Hochformat Layout: Vertikal gestapelt -->
                <div class="repair-number">${orderCode}</div>
                <div class="customer-name">${firstName} ${lastName}</div>
                ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
                <div class="qr-code">${qrCode}</div>
                ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : ''}
                <div class="model">${model}</div>
                <div class="issue">${repairIssue ? repairIssue.split(',').join('\\n') : ''}</div>
              `}
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
                  {/* Vorschau basierend auf den gewählten Einstellungen */}
                  {(() => {
                    const labelFormat = settings?.labelFormat || 'portrait';
                    const isLandscape = labelFormat === 'landscape';
                    
                    if (isLandscape) {
                      // Querformat-Vorschau
                      return (
                        <div style={{ 
                          width: '220px', 
                          height: '120px', 
                          margin: '0 auto', 
                          display: 'flex', 
                          flexDirection: 'row', 
                          alignItems: 'flex-start', 
                          gap: '12px',
                          border: '1px solid #e5e5e5',
                          padding: '8px',
                          backgroundColor: 'white'
                        }}>
                          {/* Linke Sektion: Auftragsnummer oben, QR-Code unten */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            width: '90px',
                            height: '100%',
                            justifyContent: 'space-between'
                          }}>
                            <div className="text-center" style={{ marginBottom: '4px' }}>
                              <p className="text-sm font-bold">{repair?.orderCode || `#${repair?.id}`}</p>
                            </div>
                            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                              <QRCodeSVG 
                                value={`${window.location.origin}/repairs/${repair?.orderCode || repair?.id}`} 
                                size={60} 
                                level="M"
                              />
                            </div>
                          </div>
                          
                          {/* Rechte Sektion: Kundendaten vertikal angeordnet */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            width: '120px',
                            height: '100%',
                            justifyContent: 'flex-start',
                            gap: '4px'
                          }}>
                            <div>
                              <p className="text-sm font-bold leading-tight">
                                {customer?.firstName || 'Kunde'} {customer?.lastName || ''}
                              </p>
                            </div>
                            
                            {customer?.phone && (
                              <div>
                                <p className="text-xs text-gray-600 leading-tight">{customer.phone}</p>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-sm font-bold leading-tight">{repair?.model}</p>
                            </div>
                            
                            {deviceCodeData && formatDeviceCodeForLabel(deviceCodeData) && (
                              <div style={{ marginTop: '2px' }}>
                                <div className="text-xs font-bold bg-gray-100 border border-gray-300 rounded px-2 py-1 inline-block">
                                  {formatDeviceCodeForLabel(deviceCodeData) as string}
                                </div>
                              </div>
                            )}
                            
                            <div style={{ marginTop: 'auto' }}>
                              <p className="text-xs leading-tight">
                                {repair?.issue ? (repair.issue.length > 35 ? repair.issue.substring(0, 35) + '...' : repair.issue) : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Hochformat-Vorschau (Standard)
                      return (
                        <div style={{ 
                          width: '26mm', 
                          margin: '0 auto', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '1mm',
                          border: '1px solid #e5e5e5',
                          padding: '2mm'
                        }}>
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
                      );
                    }
                  })()}
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