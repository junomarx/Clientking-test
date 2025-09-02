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
    
    // Fülle das Druckfenster mit Inhalten - Erweitert für drei Formate
    if (labelFormat === 'landscape') {
      // QUERFORMAT: Ihr neuer Code mit mathematisch präziserer Spaltenaufteilung
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etikett für Reparatur ${orderCode}</title>
            <meta charset="UTF-8">
            <style>
              @page { 
                size: 57mm 32mm; 
                margin: 0; 
              }
              html, body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }
              @media print {
                html, body { 
                  margin: 0; 
                  padding: 0; 
                }
                #label-57x32 { 
                  width: 57mm; 
                  height: 32mm; 
                  box-shadow: none; 
                  border: 0; 
                }
              }
              .label-container {
                width: 57mm;
                height: 32mm;
                padding: 2mm;
                background-color: white;
                box-sizing: border-box;
                display: flex;
              }
              .left-column {
                width: calc(57mm / 4);
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .repair-number {
                font-weight: bold;
                line-height: 1;
                margin-bottom: 1mm;
                font-size: 14px;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .qr-section {
                display: flex;
                align-items: flex-start;
              }
              .right-column {
                flex: 1;
                padding-left: 2mm;
                display: flex;
                flex-direction: column;
              }
              .customer-info {
                display: flex;
                justify-content: flex-end;
                text-align: right;
                line-height: 1.1;
              }
              .customer-name {
                font-weight: bold;
                font-size: 13px;
                line-height: 1;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .customer-phone {
                font-size: 11px;
                color: #6b7280;
                line-height: 1;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .device-code-section {
                display: flex;
                justify-content: center;
                padding: 1mm 0;
              }
              .device-code {
                display: inline-block;
                border: 1px solid #9ca3af;
                border-radius: 12px;
                padding: 1mm 2mm;
                font-weight: 600;
                font-size: 11px;
                line-height: 1;
              }
              .device-model {
                text-align: center;
                font-weight: bold;
                font-size: 13px;
                line-height: 1.1;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .issue-description {
                text-align: center;
                font-size: 11px;
                line-height: 1.1;
                white-space: pre-line;
              }
            </style>
          </head>
          <body>
            <div id="label-57x32" class="label-container">
              <!-- Linke Spalte: 1/4 der Gesamtbreite -->
              <div class="left-column">
                <div class="repair-number">${orderCode}</div>
                <div class="qr-section">
                  ${qrCode.replace(/width="60"/, 'width="52"').replace(/height="60"/, 'height="52"')}
                </div>
              </div>

              <!-- Rechte Spalte: 3/4 der Gesamtbreite -->
              <div class="right-column">
                <div class="customer-info">
                  <div>
                    <div class="customer-name">${firstName} ${lastName}</div>
                    ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
                  </div>
                </div>

                ${deviceCode ? `
                <div class="device-code-section">
                  <div class="device-code">${deviceCode}</div>
                </div>
                ` : ''}

                <div class="device-model">${model}</div>

                <div class="issue-description">${repairIssue || ""}</div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
    } else if (labelFormat === 'landscape_large') {
      // 62mm x 35mm QUERFORMAT: Ihr neuer Code
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etikett für Reparatur ${orderCode}</title>
            <meta charset="UTF-8">
            <style>
              @page { 
                size: 62mm 35mm; 
                margin: 0; 
              }
              html, body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }
              @media print {
                html, body { 
                  margin: 0; 
                  padding: 0; 
                }
                #label-62x35 { 
                  width: 62mm; 
                  height: 35mm; 
                  box-shadow: none; 
                  border: 0; 
                }
              }
              .label-container {
                width: 62mm;
                height: 35mm;
                padding: 2mm;
                background-color: white;
                box-sizing: border-box;
                display: flex;
              }
              .left-column {
                width: calc(62mm / 4);
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .repair-number {
                font-weight: bold;
                line-height: 1;
                margin-bottom: 1mm;
                font-size: 14px;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .qr-section {
                display: flex;
                align-items: flex-start;
              }
              .right-column {
                flex: 1;
                padding-left: 2mm;
                display: flex;
                flex-direction: column;
              }
              .customer-info {
                display: flex;
                justify-content: flex-end;
                text-align: right;
                line-height: 1.1;
              }
              .customer-name {
                font-weight: bold;
                font-size: 13px;
                line-height: 1;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .customer-phone {
                font-size: 11px;
                color: #6b7280;
                line-height: 1;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .device-code-section {
                display: flex;
                justify-content: center;
                padding: 1mm 0;
              }
              .device-code {
                display: inline-block;
                border: 1px solid #9ca3af;
                border-radius: 12px;
                padding: 1mm 2mm;
                font-weight: 600;
                font-size: 11px;
                line-height: 1;
              }
              .device-model {
                text-align: center;
                font-weight: bold;
                font-size: 13px;
                line-height: 1.1;
                text-overflow: ellipsis;
                overflow: hidden;
                white-space: nowrap;
              }
              .issue-description {
                text-align: center;
                font-size: 11px;
                line-height: 1.1;
                white-space: pre-line;
              }
            </style>
          </head>
          <body>
            <div id="label-62x35" class="label-container">
              <!-- Linke Spalte: 1/4 der Gesamtbreite -->
              <div class="left-column">
                <div class="repair-number">${orderCode}</div>
                <div class="qr-section">
                  ${qrCode.replace(/width="60"/, 'width="55"').replace(/height="60"/, 'height="55"')}
                </div>
              </div>

              <!-- Rechte Spalte: 3/4 der Gesamtbreite -->
              <div class="right-column">
                <div class="customer-info">
                  <div>
                    <div class="customer-name">${firstName} ${lastName}</div>
                    ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
                  </div>
                </div>

                ${deviceCode ? `
                <div class="device-code-section">
                  <div class="device-code">${deviceCode}</div>
                </div>
                ` : ''}

                <div class="device-model">${model}</div>

                <div class="issue-description">${repairIssue || ""}</div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
    } else {
      // HOCHFORMAT: Ursprünglicher Code bleibt unverändert
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
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
              }
              .print-area {
                width: ${labelWidth - 4}mm;
                height: ${labelHeight - 4}mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
              }
              .repair-number {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 0.2mm;
                text-align: center;
              }
              .customer-name {
                font-size: 10px;
                font-weight: bold;
                margin-bottom: 0.3mm;
                text-align: center;
              }
              .customer-phone {
                font-size: 8px;
                margin-bottom: 0.5mm;
                color: #333;
                text-align: center;
              }
              .qr-code {
                margin-bottom: 1.5mm;
                width: 17mm;
                height: 17mm;
              }
              .qr-code svg {
                width: 100%;
                height: 100%;
              }
              .device-code {
                font-size: 8px;
                margin-bottom: 1.5mm;
                font-weight: bold;
                color: #333;
                border: 1px solid #666;
                padding: 1mm;
                background-color: #f0f0f0;
                border-radius: 1mm;
                display: inline-block;
                text-align: center;
              }
              .model {
                font-size: 9px;
                font-weight: bold;
                margin-bottom: 1mm;
                text-align: center;
              }
              .issue {
                font-size: 8px;
                white-space: pre-wrap;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="print-area">
                <!-- Hochformat Layout: Vertikal gestapelt -->
                <div class="repair-number">${orderCode}</div>
                <div class="customer-name">${firstName} ${lastName}</div>
                ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
                <div class="qr-code">${qrCode}</div>
                ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : ''}
                <div class="model">${model}</div>
                <div class="issue">${repairIssue ? repairIssue.split(',').join('\\n') : ''}</div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
    }
    
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
                    const deviceLabel = repair?.model || '';
                    const qrValue = `${window.location.origin}/repairs/${repair?.orderCode || repair?.id}`;
                    
                    if (labelFormat === 'landscape') {
                      // 57mm x 32mm Querformat-Vorschau
                      return (
                        <div className="flex items-center justify-center">
                          {/* Print CSS inline für bessere Kompatibilität */}
                          <style>{`
                            @page { size: 57mm 32mm; margin: 0; }
                            @media print {
                              html, body { margin: 0; padding: 0; }
                              #label-57x32 { width: 57mm; height: 32mm; box-shadow: none; border: 0; }
                            }
                          `}</style>

                          {/* Ihr neuer verbesserter Code - Querformat-Vorschau */}
                          <div
                            id="label-57x32"
                            style={{ width: "57mm", height: "32mm", padding: "2mm" }}
                            className="bg-white border border-gray-300 rounded-md shadow-sm box-border flex"
                          >
                            {/* Linke Spalte: 1/4 der Gesamtbreite */}
                            <div style={{ width: "calc(57mm / 4)" }} className="flex flex-col items-center">
                              <div className="font-bold leading-none mb-[1mm] truncate" style={{ fontSize: 14 }}>
                                {repair?.orderCode || `#${repair?.id}`}
                              </div>
                              <QRCodeSVG value={qrValue} size={52} level="M" />
                            </div>

                            {/* Rechte Spalte: 3/4 der Gesamtbreite */}
                            <div style={{ paddingLeft: "2mm" }} className="flex-1 flex flex-col">
                              <div className="flex justify-end text-right leading-tight">
                                <div>
                                  <div className="font-bold text-[13px] leading-none truncate">
                                    {customer?.firstName || 'Kunde'} {customer?.lastName || ''}
                                  </div>
                                  <div className="text-[11px] text-gray-500 leading-none truncate">
                                    {customer?.phone || ""}
                                  </div>
                                </div>
                              </div>

                              {/* Gerätecode als Pill */}
                              {deviceCodeData && formatDeviceCodeForLabel(deviceCodeData) && (
                                <div style={{ paddingTop: "1mm", paddingBottom: "1mm" }} className="flex justify-center">
                                  <div className="inline-block border border-gray-400 rounded-2xl px-2 py-[1mm] font-semibold text-[11px] leading-none">
                                    {formatDeviceCodeForLabel(deviceCodeData)}
                                  </div>
                                </div>
                              )}

                              <div className="text-center font-bold text-[13px] leading-tight truncate">
                                {deviceLabel}
                              </div>

                              <div className="text-center text-[11px] leading-tight whitespace-pre-line">
                                {repair?.issue || ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    } else if (labelFormat === 'landscape_large') {
                      // 62mm x 35mm Querformat-Vorschau - Ihr neuer Code
                      return (
                        <div className="flex items-center justify-center">
                          <style>{`
                            @page { size: 62mm 35mm; margin: 0; }
                            @media print {
                              html, body { margin: 0; padding: 0; }
                              #label-62x35 { width: 62mm; height: 35mm; box-shadow: none; border: 0; }
                            }
                          `}</style>

                          <div
                            id="label-62x35"
                            style={{ width: "62mm", height: "35mm", padding: "2mm" }}
                            className="bg-white border border-gray-300 rounded-md shadow-sm box-border flex"
                          >
                            {/* Linke Spalte: 1/4 der Gesamtbreite */}
                            <div style={{ width: "calc(62mm / 4)" }} className="flex flex-col items-center">
                              <div className="font-bold leading-none mb-[1mm] truncate" style={{ fontSize: 14 }}>
                                {repair?.orderCode || `#${repair?.id}`}
                              </div>
                              <QRCodeSVG value={qrValue} size={55} level="M" />
                            </div>

                            {/* Rechte Spalte: 3/4 der Gesamtbreite */}
                            <div style={{ paddingLeft: "2mm" }} className="flex-1 flex flex-col">
                              <div className="flex justify-end text-right leading-tight">
                                <div>
                                  <div className="font-bold text-[13px] leading-none truncate">
                                    {customer?.firstName || 'Kunde'} {customer?.lastName || ''}
                                  </div>
                                  <div className="text-[11px] text-gray-500 leading-none truncate">
                                    {customer?.phone || ""}
                                  </div>
                                </div>
                              </div>

                              {/* Gerätecode als Pill */}
                              {deviceCodeData && formatDeviceCodeForLabel(deviceCodeData) && (
                                <div style={{ paddingTop: "1mm", paddingBottom: "1mm" }} className="flex justify-center">
                                  <div className="inline-block border border-gray-400 rounded-2xl px-2 py-[1mm] font-semibold text-[11px] leading-none">
                                    {formatDeviceCodeForLabel(deviceCodeData)}
                                  </div>
                                </div>
                              )}

                              <div className="text-center font-bold text-[13px] leading-tight truncate">
                                {deviceLabel}
                              </div>

                              <div className="text-center text-[11px] leading-tight whitespace-pre-line">
                                {repair?.issue || ""}
                              </div>
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