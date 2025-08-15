import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useBusinessSettings } from "@/hooks/use-business-settings";

interface PrintLabelDialogProps {
  open: boolean;
  onClose: () => void;
  repair: any;
  customer: any;
  deviceCodeData?: any;
  isLoading: boolean;
}

// Funktion zur Formatierung des Gerätecodes
const formatDeviceCodeForLabel = (deviceCode: any) => {
  if (!deviceCode) return null;
  
  if (typeof deviceCode === 'string') {
    return deviceCode;
  }
  
  if (typeof deviceCode === 'object') {
    return deviceCode.deviceCode || deviceCode.code || null;
  }
  
  return null;
};

export function PrintLabelDialog({
  open,
  onClose,
  repair,
  customer,
  deviceCodeData,
  isLoading
}: PrintLabelDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useBusinessSettings();
  
  const handlePrint = () => {
    if (!repair) return;

    const labelWidth = settings?.labelWidth || 62;
    const labelHeight = settings?.labelHeight || 29;
    
    const orderCode = repair.orderCode || `#${repair.id}`;
    const firstName = customer?.firstName || 'Kunde';
    const lastName = customer?.lastName || '';
    const customerPhone = customer?.phone;
    const model = repair.model || '';
    const repairIssue = repair.issue;
    const deviceCode = formatDeviceCodeForLabel(deviceCodeData);
    
    const qrCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <!-- QR-Code placeholder -->
      <rect width="100" height="100" fill="white"/>
      <text x="50" y="50" text-anchor="middle" font-size="8">QR</text>
    </svg>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etikett für Reparatur ${orderCode}</title>
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
              <div class="repair-number">${orderCode}</div>
              <div class="customer-name">${firstName} ${lastName}</div>
              ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
              <div class="qr-code">${qrCode}</div>
              ${deviceCode ? `<div class="device-code">${deviceCode}</div>` : ''}
              <div class="model">${model}</div>
              <div class="issue">${repairIssue ? repairIssue.split(',').join('\\n') : ''}</div>
            </div>
          </div>
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
                  {/* Standard Hochformat-Vorschau */}
                  <div style={{ 
                    width: '100px', 
                    margin: '0 auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '8px',
                    border: '1px solid #e5e5e5',
                    padding: '8px',
                    backgroundColor: 'white'
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
                    
                    {/* Telefonnummer */}
                    {customer?.phone && (
                      <div className="text-center w-full">
                        <p className="text-xs text-gray-600">
                          {customer.phone}
                        </p>
                      </div>
                    )}
                    
                    {/* QR-Code */}
                    <div className="mb-2">
                      <QRCodeSVG 
                        value={`${window.location.origin}/repairs/${repair?.orderCode || repair?.id}`} 
                        size={64} 
                        level="M"
                      />
                    </div>
                    
                    {/* Gerätecode */}
                    {deviceCodeData && formatDeviceCodeForLabel(deviceCodeData) && (
                      <div className="text-center mb-2">
                        <div className="text-xs font-bold bg-gray-100 border border-gray-300 rounded px-2 py-1 inline-block">
                          {formatDeviceCodeForLabel(deviceCodeData) as string}
                        </div>
                      </div>
                    )}
                    
                    {/* Modell */}
                    <div className="text-center w-full mb-2">
                      <p className="text-xs font-bold leading-tight">
                        {repair?.model}
                      </p>
                    </div>
                    
                    {/* Problem */}
                    <div className="text-center w-full">
                      <p className="text-xs leading-tight">
                        {repair?.issue}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handlePrint} className="w-full">
                <Printer className="w-4 h-4 mr-2" />
                Etikett drucken
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}