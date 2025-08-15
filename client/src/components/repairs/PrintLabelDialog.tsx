import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Printer } from "lucide-react";
import { useBusinessSettings } from "@/hooks/use-business-settings";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

interface Repair {
  id: number;
  orderCode: string;
  model: string;
  issue: string;
  deviceCodeType?: string;
}

interface DeviceCodeData {
  deviceCode: string;
  deviceCodeType: 'text' | 'pattern';
}

interface PrintLabelDialogProps {
  open: boolean;
  onClose: () => void;
  repair: Repair | null;
  customer: Customer | null;
  repairId?: number | string;
  deviceCodeData?: DeviceCodeData | null;
}

export function PrintLabelDialog({ 
  open, 
  onClose, 
  repair, 
  customer, 
  repairId,
  deviceCodeData 
}: PrintLabelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useBusinessSettings();

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

  // Zurück zur ursprünglichen HTML-String Methode die funktioniert hat
  const handlePrint = () => {
    const labelFormat = settings?.labelFormat || 'portrait';
    const isLandscape = labelFormat === 'landscape';
    
    const orderCode = repair?.orderCode || `#${repair?.id || repairId}`;
    const customerName = `${customer?.firstName || 'Kunde'} ${customer?.lastName || ''}`;
    const phone = customer?.phone || '';
    const model = repair?.model || '';
    const issue = repair?.issue || '';
    const deviceCode = formatDeviceCodeForLabel(deviceCodeData);
    
    // QR-Code SVG generieren
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const qrSize = isLandscape ? 60 : 50;
    canvas.width = qrSize;
    canvas.height = qrSize;
    
    // QR Code als Data URL für Druck
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(`${window.location.origin}/repairs/${orderCode}`)}`;
    
    let printContent = '';
    
    if (isLandscape) {
      // Querformat HTML
      printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Etikett Druck</title>
          <style>
            @page { 
              size: 57mm 32mm; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 2mm; 
              font-family: Arial, sans-serif; 
              width: 53mm; 
              height: 28mm; 
              display: flex; 
              flex-direction: row; 
              align-items: flex-start; 
              gap: 2mm; 
              box-sizing: border-box;
            }
            .left { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: space-between; 
              width: 22mm; 
              height: 28mm; 
            }
            .right { 
              display: flex; 
              flex-direction: column; 
              justify-content: flex-start; 
              width: 31mm; 
              height: 28mm; 
              gap: 1mm; 
            }
            .order-code { 
              font-size: 9px; 
              font-weight: bold; 
              text-align: center; 
              margin: 0; 
              line-height: 1.1; 
            }
            .customer { 
              font-size: 8px; 
              font-weight: bold; 
              margin: 0; 
              line-height: 1.1; 
            }
            .phone { 
              font-size: 7px; 
              color: #666; 
              margin: 0; 
              line-height: 1.1; 
            }
            .model { 
              font-size: 8px; 
              font-weight: bold; 
              margin: 0; 
              line-height: 1.1; 
            }
            .issue { 
              font-size: 7px; 
              margin: 0; 
              line-height: 1.1; 
              margin-top: auto; 
            }
            img { 
              width: 15mm; 
              height: 15mm; 
            }
          </style>
        </head>
        <body>
          <div class="left">
            <div class="order-code">${orderCode}</div>
            <img src="${qrCodeUrl}" alt="QR Code">
          </div>
          <div class="right">
            <div class="customer">${customerName}</div>
            ${phone ? `<div class="phone">${phone}</div>` : ''}
            <div class="model">${model}</div>
            ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : ''}
            <div class="issue">${issue.length > 40 ? issue.substring(0, 40) + '...' : issue}</div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Hochformat HTML
      printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Etikett Druck</title>
          <style>
            @page { 
              size: 32mm 57mm; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 2mm; 
              font-family: Arial, sans-serif; 
              width: 28mm; 
              height: 53mm; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              gap: 2mm; 
              box-sizing: border-box;
            }
            .order-code { 
              font-size: 8px; 
              font-weight: bold; 
              text-align: center; 
              margin: 0; 
            }
            .customer { 
              font-size: 7px; 
              font-weight: bold; 
              text-align: center; 
              margin: 0; 
            }
            .phone { 
              font-size: 6px; 
              text-align: center; 
              margin: 0; 
            }
            .model { 
              font-size: 7px; 
              font-weight: bold; 
              text-align: center; 
              margin: 0; 
            }
            .issue { 
              font-size: 6px; 
              text-align: center; 
              margin: 0; 
              margin-top: auto; 
            }
            img { 
              width: 13mm; 
              height: 13mm; 
            }
          </style>
        </head>
        <body>
          <div class="order-code">${orderCode}</div>
          <div class="customer">${customerName}</div>
          ${phone ? `<div class="phone">${phone}</div>` : ''}
          <img src="${qrCodeUrl}" alt="QR Code">
          <div class="model">${model}</div>
          ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : ''}
          <div class="issue">${issue.length > 40 ? issue.substring(0, 40) + '...' : issue}</div>
        </body>
        </html>
      `;
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
    
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
                <div className="label-container border border-dashed border-gray-300 p-3">
                  {/* Vorschau basierend auf den gewählten Einstellungen */}
                  {(() => {
                    const labelFormat = settings?.labelFormat || 'portrait';
                    const isLandscape = labelFormat === 'landscape';
                    
                    if (isLandscape) {
                      // Querformat-Vorschau
                      return (
                        <div className="label-content" style={{ 
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
                              <p className="text-sm font-bold">{repair?.orderCode || `#${repair?.id || repairId}`}</p>
                            </div>
                            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                              <QRCodeSVG 
                                value={`${window.location.origin}/repairs/${repair?.orderCode || repair?.id || repairId}`} 
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
                        <div className="label-content" style={{ 
                          width: '26mm', 
                          margin: '0 auto', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '2px',
                          border: '1px solid #e5e5e5',
                          padding: '8px',
                          backgroundColor: 'white'
                        }}>
                          <div className="text-center">
                            <p className="text-sm font-bold">{repair?.orderCode || `#${repair?.id || repairId}`}</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-xs font-bold">
                              {customer?.firstName || 'Kunde'} {customer?.lastName || ''}
                            </p>
                          </div>
                          
                          {customer?.phone && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600">{customer.phone}</p>
                            </div>
                          )}
                          
                          <div style={{ marginBottom: '4px' }}>
                            <QRCodeSVG 
                              value={`${window.location.origin}/repairs/${repair?.orderCode || repair?.id || repairId}`} 
                              size={50} 
                              level="M"
                            />
                          </div>
                          
                          {deviceCodeData && formatDeviceCodeForLabel(deviceCodeData) && (
                            <div style={{ marginBottom: '2px' }}>
                              <div className="text-xs font-bold bg-gray-100 border border-gray-300 rounded px-1 py-0.5 inline-block">
                                {formatDeviceCodeForLabel(deviceCodeData) as string}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-center">
                            <p className="text-xs font-bold">{repair?.model}</p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-xs leading-tight">
                              {repair?.issue ? (repair.issue.length > 20 ? repair.issue.substring(0, 20) + '...' : repair.issue) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                Drucken
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}