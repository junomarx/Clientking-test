import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Tag } from 'lucide-react';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { QRCodeSVG } from 'qrcode.react';
import { isProfessionalOrHigher } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { generateA4PrintContent } from '@/lib/a4-print-template';

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  repair: Repair | null;
  customer: Customer | null;
  businessSettings: BusinessSettings | null;
  qrCodeSettings: any;
  currentUser: any;
  canPrintLabels: boolean | null;
}

export function PrintOptionsDialog({
  open,
  onClose,
  repair,
  customer,
  businessSettings,
  qrCodeSettings,
  currentUser: userFromProps,
  canPrintLabels
}: PrintOptionsDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings();
  
  // Lade aktuellen Benutzer direkt über React Query zur Sicherheit
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 Minuten
  });
  
  // Print-Optionen
  const [selectedPrintOption, setSelectedPrintOption] = useState<
    'thermal' | 'a4' | 'label' | null
  >(null);

  // Admin-Benutzer oder Professional/Enterprise-Plan können A4 und Etiketten drucken
  const user = currentUser || userFromProps; // Benutze aktuelle Daten oder die übergebenen Werte
  const a4PrintEnabled = isProfessionalOrHigher(user);
  const labelPrintEnabled = isProfessionalOrHigher(user);
  
  // Für Debug-Zwecke
  console.log('User in PrintOptionsDialog:', user);
  console.log('User JSON:', JSON.stringify(user));
  console.log('User von Props:', userFromProps);
  console.log('User direkt geladen:', currentUser);
  console.log('isProfessionalOrHigher:', isProfessionalOrHigher(user));
  console.log('a4PrintEnabled:', a4PrintEnabled);
  console.log('labelPrintEnabled:', labelPrintEnabled);
  
  // Generiere Thermobon-Inhalt
  const renderThermalContent = () => {
    return (
      <div ref={printRef} className="bg-white p-6 rounded-md shadow-sm">
        {/* Logo und Unternehmensdaten */}
        <div className="print-header mb-4">
          <div className="flex flex-col items-center justify-center">
            {/* Logo anzeigen, wenn vorhanden */}
            {businessSettings?.logoImage && (
              <div className="mb-2">
                <img 
                  src={businessSettings.logoImage} 
                  alt={businessSettings.businessName || "Firmenlogo"}
                  className="max-h-16 max-w-[200px] object-contain"
                />
              </div>
            )}
            
            <h2>{businessSettings?.businessName || "Handyshop Verwaltung"}</h2>
            <p className="text-xs">
              {businessSettings ? (
                `${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}`
              ) : (
                "Adresse nicht verfügbar"
              )}
            </p>
            {businessSettings?.phone && <p className="text-xs">Tel: {businessSettings.phone}</p>}
            {businessSettings?.email && <p className="text-xs">E-Mail: {businessSettings.email}</p>}
            {businessSettings?.website && <p className="text-xs">{businessSettings.website}</p>}
          </div>
        </div>
        
        {/* Datum */}
        <div className="text-sm text-center mb-2">
          <p>
            <span className="font-medium">Datum:</span> 
            {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}
          </p>
        </div>
        
        {/* Reparaturauftrag Nummer */}
        <div className="print-section mb-3">
          <div className="flex items-center justify-center">
            <h3 className="font-semibold text-lg">Reparaturauftrag</h3>
            <span className="receipt-number">{repair?.orderCode || `#${repair?.id}`}</span>
          </div>
        </div>
        
        {/* Kundendaten */}
        <div className="print-section mb-3">
          <h3 className="font-semibold mb-1">Kundendaten</h3>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <p><span className="font-medium">Name:</span> {customer?.firstName} {customer?.lastName}</p>
            <p><span className="font-medium">Telefon:</span> {customer?.phone}</p>
            {customer?.email && <p><span className="font-medium">E-Mail:</span> {customer?.email}</p>}
            {(customer?.address || customer?.zipCode || customer?.city) && (
              <p>
                <span className="font-medium">Adresse:</span> 
                {customer?.address}{customer?.address && (customer?.zipCode || customer?.city) ? ', ' : ''}
                {customer?.zipCode} {customer?.city}
              </p>
            )}
          </div>
        </div>
        
        {/* Gerätedaten - ohne Typ */}
        <div className="print-section mb-3">
          <h3 className="font-semibold mb-1">Gerätedaten</h3>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <p><span className="font-medium">Hersteller:</span> {repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}</p>
            <p><span className="font-medium">Modell:</span> {repair?.model}</p>
            {repair?.serialNumber && <p><span className="font-medium">Seriennummer:</span> {repair.serialNumber}</p>}
          </div>
        </div>
        
        {/* Reparaturdetails */}
        <div className="print-section mb-3">
          <h3 className="font-semibold mb-1">Reparaturdetails</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="highlight-box">
              <p>
                <span className="font-medium">Problem:</span> 
                <span className="whitespace-pre-wrap">{repair?.issue ? repair.issue.split(',').join('\n') : ''}</span>
              </p>
            </div>
            
            {repair?.estimatedCost && (
              <div className="highlight-box">
                <p><span className="font-medium">Preis:</span> {repair.estimatedCost} €</p>
              </div>
            )}
            
            {repair?.depositAmount && (
              <div className="highlight-box" style={{borderWidth: '0.5mm'}}>
                <p className="font-bold" style={{textDecoration: 'underline'}}>WICHTIG: Gerät beim Kunden / bei Kundin!</p>
                <p><span className="font-medium">Anzahlung:</span> {repair.depositAmount} €</p>
              </div>
            )}
            
            {repair?.notes && (
              <div className="highlight-box">
                <p><span className="font-medium">Notizen:</span> {repair.notes}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Kundenunterschrift anzeigen, wenn vorhanden */}
        {repair?.dropoffSignature && (
          <div className="print-section mb-3 border-t">
            <h3 className="font-semibold mb-2 mt-2">Unterschrift bei Geräteabgabe</h3>
            <div className="border" style={{padding: '2mm'}}>
              <img 
                src={repair.dropoffSignature} 
                alt="Unterschrift bei Abgabe" 
                style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
              />
            </div>
            {repair.dropoffSignedAt && (
              <div className="text-center text-xs mt-2">
                Unterschrieben am {format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
              </div>
            )}
            <div className="text-xs mt-3 text-center">
              <p className="font-medium">Hiermit bestätige ich, {customer?.firstName} {customer?.lastName}, dass ich mit den Reparaturbedingungen einverstanden bin und die oben genannten Angaben zu meinem Gerät korrekt sind.</p>
            </div>
          </div>
        )}
        
        {/* QR-Code anzeigen, wenn aktiviert */}
        {qrCodeSettings?.qrCodeEnabled && (
          <div className="print-section mb-3 mt-8 text-center">
            <h3 className="font-semibold mb-1">Scannen Sie den QR-Code</h3>
            <div style={{ margin: '0 auto', width: '80px', height: '80px' }}>
              <QRCodeSVG
                value={`${qrCodeSettings.qrCodeBaseUrl || window.location.origin}/status/${repair?.id}`}
                size={80}
                level="M"
              />
            </div>
            <p className="text-xs mt-2">{qrCodeSettings.qrCodeText || 'Scannen Sie den QR-Code, um den Status Ihrer Reparatur zu überprüfen'}</p>
          </div>
        )}
        
        {/* Footer mit Abholbereich */}
        <div className="receipt-footer">
          {repair?.pickupSignature && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Unterschrift bei Abholung</h3>
              <div className="border" style={{padding: '2mm'}}>
                <img 
                  src={repair.pickupSignature} 
                  alt="Unterschrift bei Abholung" 
                  style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
                />
              </div>
              {repair.pickupSignedAt && (
                <div className="text-center text-xs mt-2">
                  Unterschrieben am {format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
                </div>
              )}
              <div className="text-xs mt-3 text-center">
                <p className="font-medium">Hiermit bestätige ich, {customer?.firstName} {customer?.lastName}, den Erhalt meines Geräts. Die Reparatur wurde zu meiner vollen Zufriedenheit durchgeführt.</p>
              </div>
            </div>
          )}
          
          <div>
            {businessSettings?.businessName || "Handyshop Verwaltung"} • 
            {businessSettings ? 
              `${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}` : 
              "Adresse nicht verfügbar"
            }
          </div>
          {businessSettings?.customFooterText && (
            <div className="mt-2">{businessSettings.customFooterText}</div>
          )}
        </div>
      </div>
    );
  };
  
  // Generiere A4-Inhalt (nur Vorschau)
  const renderA4Content = () => {
    // Verwenden der Funktion aus importierter a4-print-template.ts
    const a4Content = generateA4PrintContent({
      repair,
      customer,
      businessSettings,
      qrCodeSettings
    });
    
    return (
      <div className="bg-white p-6 rounded-md shadow-sm border-2 border-blue-500">
        <div className="flex justify-between border-b pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">{businessSettings?.businessName || "Handyshop Verwaltung"}</h2>
            <p className="text-sm">
              {businessSettings?.streetAddress}, {businessSettings?.zipCode} {businessSettings?.city}<br />
              Tel: {businessSettings?.phone}
            </p>
          </div>
          {businessSettings?.logoImage && (
            <img 
              src={businessSettings.logoImage} 
              alt="Logo" 
              className="h-16 object-contain"
            />
          )}
        </div>
        
        <div className="text-right mb-4">
          <p>Datum: {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</p>
        </div>
        
        <div className="flex items-center mb-6">
          <h2 className="text-xl font-bold">Reparaturauftrag</h2>
          <span className="ml-4 px-3 py-1 border border-black font-bold">{repair?.orderCode || `#${repair?.id}`}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border-b pb-2">
            <h3 className="font-bold mb-2">Kundendaten</h3>
            <p><span className="font-semibold">Name:</span> {customer?.firstName} {customer?.lastName}</p>
            <p><span className="font-semibold">Telefon:</span> {customer?.phone}</p>
            {customer?.email && <p><span className="font-semibold">E-Mail:</span> {customer?.email}</p>}
          </div>
          
          <div className="border-b pb-2">
            <h3 className="font-bold mb-2">Gerätedaten</h3>
            <p><span className="font-semibold">Hersteller:</span> {repair?.brand}</p>
            <p><span className="font-semibold">Modell:</span> {repair?.model}</p>
            {repair?.serialNumber && <p><span className="font-semibold">Seriennummer:</span> {repair.serialNumber}</p>}
          </div>
        </div>
        
        <div className="border-l-4 border-blue-500 p-3 mb-4 bg-gray-50">
          <h3 className="font-bold mb-2">Problem:</h3>
          <p>{repair?.issue}</p>
        </div>
        
        {repair?.estimatedCost && (
          <div className="border-l-4 border-green-500 p-3 mb-4 bg-gray-50">
            <p><span className="font-bold">Preis:</span> {repair.estimatedCost} €</p>
          </div>
        )}
        
        <p className="text-center text-sm my-6">
          [Professionelles A4-Layout im DIN A4-Format mit vollständigen Informationen und verbessertem Layout]
        </p>
      </div>
    );
  };
  
  // Generiere Etikett-Inhalt (nur Vorschau)
  const renderLabelContent = () => {
    return (
      <div className="bg-white p-4 rounded-md shadow-sm border-2 border-gray-300">
        <div className="mb-3 text-center">
          <h3 className="font-bold">{businessSettings?.businessName || "Handyshop Verwaltung"}</h3>
        </div>
        
        <div className="border p-2 mb-2 text-center">
          <span className="text-xl font-bold">{repair?.orderCode || `#${repair?.id}`}</span>
        </div>
        
        <div className="flex flex-col space-y-1 text-sm">
          <p><span className="font-semibold">Kunde:</span> {customer?.firstName} {customer?.lastName}</p>
          <p><span className="font-semibold">Tel:</span> {customer?.phone}</p>
          <p><span className="font-semibold">Gerät:</span> {repair?.brand} {repair?.model}</p>
          <p><span className="font-semibold">Datum:</span> {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</p>
        </div>
        
        <div className="border-t mt-2 pt-2 text-xs text-center">
          <p>[Etiketten-Layout für Reparaturaufträge]</p>
        </div>
      </div>
    );
  };
  
  // Druckfunktion
  const handlePrint = () => {
    if (!selectedPrintOption) {
      return;
    }
    
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
      return;
    }
    
    // Schließe den Dialog
    onClose();
    
    // CSS-Stile für verschiedene Druckoptionen
    let pageCSS = '';
    let printContents = '';
    
    // Bestimme den Inhalt und das CSS basierend auf der ausgewählten Druckoption
    if (selectedPrintOption === 'thermal') {
      // Wir verwenden hier den Thermobon-Inhalt
      printContents = printRef.current?.innerHTML || '';
      
      pageCSS = `
        @page {
          size: ${settings?.receiptWidth || '80mm'} auto; 
          margin: 0mm;
        }
        
        body {
          font-family: 'Courier New', monospace; 
          padding: 0; 
          margin: 0; 
          color: black; 
          font-size: ${settings?.receiptWidth === '58mm' ? '9pt' : '10pt'}; 
          width: ${settings?.receiptWidth || '80mm'};
        }
        
        .print-container {
          width: ${settings?.receiptWidth || '80mm'}; 
          max-width: ${settings?.receiptWidth || '80mm'}; 
          margin: 0 auto; 
          padding: 5mm 2mm; 
          padding-bottom: 15mm;
        }
      `;
    } else if (selectedPrintOption === 'a4') {
      // Wir verwenden die A4-Vorlage aus der a4-print-template.ts
      printContents = `<div style="padding: 0; margin: 0;">${
        generateA4PrintContent({
          repair,
          customer,
          businessSettings,
          qrCodeSettings
        })
      }</div>`;
      
      pageCSS = `
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 0;
          margin: 0;
          color: black;
          font-size: 11pt;
        }
        
        .print-container {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
        }
      `;
    } else if (selectedPrintOption === 'label') {
      // Etiketten-Inhalt
      printContents = renderLabelContent()?.props?.children || '';

      // Formatierung für Etiketten
      pageCSS = `
        @page {
          size: 100mm 50mm;
          margin: 2mm;
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 0;
          margin: 0;
          color: black;
          font-size: 10pt;
        }
        
        .print-container {
          width: 96mm;
          height: 46mm;
          margin: 0 auto;
          padding: 0;
        }
      `;
    }
    
    // Fülle das Druckfenster mit Inhalten und starte direkt den Druckvorgang
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reparaturauftrag ${repair?.orderCode || `#${repair?.id}`}</title>
          <meta charset="UTF-8">
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
          <style>
            @media print {
              ${pageCSS}
              
              .print-header {
                padding-bottom: 3mm;
                border-bottom: 0.5mm solid black;
                margin-bottom: 3mm;
                text-align: center;
              }
              
              .print-header h2 {
                font-size: 14pt;
                margin-bottom: 1mm;
                font-weight: bold;
              }
              
              .print-section {
                margin-bottom: 3mm;
                padding-bottom: 1mm;
              }
              
              .print-section h3 {
                font-size: 12pt;
                margin-bottom: 1mm;
                padding-bottom: 1mm;
                border-bottom: 0.2mm solid black;
                font-weight: bold;
              }
              
              .print-row {
                display: flex;
                margin-bottom: 1mm;
                flex-wrap: wrap;
              }
              
              .print-label {
                font-weight: bold;
                width: ${settings?.receiptWidth === '58mm' ? '20mm' : '25mm'};
                margin-right: 1mm;
              }
              
              .print-value {
                flex: 1;
                min-width: ${settings?.receiptWidth === '58mm' ? '30mm' : '45mm'};
              }
              
              .grid-cols-1, .grid-cols-2 {
                display: ${selectedPrintOption === 'a4' ? 'grid' : 'block'};
                ${selectedPrintOption === 'a4' ? 'grid-template-columns: 1fr 1fr; gap: 8px;' : ''}
              }
              
              .font-medium, .font-semibold, .font-bold {
                font-weight: bold;
                margin-right: 1mm;
              }
              
              .text-sm {
                font-size: 10pt;
              }
              
              .text-xs {
                font-size: 8pt;
              }
              
              .text-center {
                text-align: center;
              }
              
              .mb-1, .mb-2, .mb-3, .mb-4 {
                margin-bottom: 3mm;
              }
              
              .mt-2, .mt-3, .mt-4, .mt-8 {
                margin-top: 3mm;
              }
              
              .border-t {
                border-top: 0.3mm solid black;
                padding-top: 4mm;
              }
              
              .highlight-box {
                border: 0.3mm solid black; 
                padding: 2mm; 
                margin-top: 1mm; 
                margin-bottom: 1mm; 
                border-left-width: 1mm;
              }
              
              .receipt-number {
                display: inline-block;
                border: 0.3mm solid black;
                padding: 1mm 2mm;
                font-weight: bold;
                margin-left: 2mm;
                font-size: 12pt;
              }
              
              .receipt-footer {
                margin-top: 6mm;
                padding-top: 3mm;
                border-top: 0.3mm solid black;
                font-size: 8pt;
                text-align: center;
              }
              
              /* Bildstilisierung */
              img {
                max-width: ${selectedPrintOption === 'thermal' ? `${settings?.receiptWidth === '58mm' ? '45mm' : '60mm'}` : 
                  selectedPrintOption === 'a4' ? '200px' : '90mm'}; 
                max-height: ${selectedPrintOption === 'thermal' ? '15mm' : 
                  selectedPrintOption === 'a4' ? '60px' : '20mm'};
                margin: 0 auto;
                display: block;
              }
              
              .max-h-16 {
                max-height: 15mm;
              }
              
              .max-w-\[200px\] {
                max-width: ${settings?.receiptWidth === '58mm' ? '45mm' : '60mm'};
              }
              
              .object-contain {
                object-fit: contain;
              }
              
              .whitespace-pre-wrap {
                white-space: pre-wrap;
              }
              
              .no-print {
                display: none !important;
              }
              
              /* Unterstützung für flex-Elemente */
              .flex {
                display: ${selectedPrintOption === 'a4' ? 'flex' : 'block'};
                text-align: ${selectedPrintOption === 'a4' ? 'left' : 'center'};
              }
              
              .flex-col {
                display: ${selectedPrintOption === 'a4' ? 'flex' : 'block'};
                flex-direction: ${selectedPrintOption === 'a4' ? 'column' : 'none'};
              }
              
              .items-center {
                align-items: ${selectedPrintOption === 'a4' ? 'center' : 'none'};
                text-align: center;
              }
              
              .justify-center {
                justify-content: ${selectedPrintOption === 'a4' ? 'center' : 'none'};
                text-align: center;
              }
            }
            
            /* Nicht-Druck-Styles */
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              margin: 0;
              color: #333;
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
            
            .no-print {
              display: block;
            }
            
            @media print {
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">${printContents}</div>
          <div class="no-print">
            <button class="print-button" onClick="window.print(); window.close();">
              Drucken
            </button>
            <button class="close-button" onClick="window.close();">
              Schließen
            </button>
          </div>
          <script>
            window.addEventListener('afterprint', function() {
              // Fenster nach dem Drucken automatisch schließen
              window.close();
            });
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    try {
      printWindow.focus();
    } catch (error) {
      console.error('Fehler beim Fokussieren des Druckfensters:', error);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Druckoptionen</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          <p className="text-sm text-muted-foreground mb-4">Wählen Sie ein Druckformat für Reparaturauftrag {repair?.orderCode || `#${repair?.id}`}:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Thermobon Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${selectedPrintOption === 'thermal' ? 'border-primary bg-primary/10' : ''}`}
              onClick={() => setSelectedPrintOption('thermal')}
            >
              <div className="flex flex-col items-center text-center mb-3">
                <Printer className="h-8 w-8 mb-2" />
                <h3 className="font-medium text-sm">Thermobon</h3>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Standard-Druckformat für Thermodrucker (58mm oder 80mm).
              </p>
            </div>
            
            {/* DIN A4 Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${!a4PrintEnabled ? 'opacity-50 cursor-not-allowed' : ''} ${selectedPrintOption === 'a4' ? 'border-primary bg-primary/10' : ''}`}
              onClick={() => a4PrintEnabled && setSelectedPrintOption('a4')}
            >
              <div className="flex flex-col items-center text-center mb-3">
                <FileText className="h-8 w-8 mb-2" />
                <h3 className="font-medium text-sm">DIN A4</h3>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {a4PrintEnabled 
                  ? 'Professionelles Layout im DIN A4-Format.' 
                  : 'Nur verfügbar für Professional/Enterprise.'}
              </p>
            </div>
            
            {/* Etikett Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${!labelPrintEnabled ? 'opacity-50 cursor-not-allowed' : ''} ${selectedPrintOption === 'label' ? 'border-primary bg-primary/10' : ''}`}
              onClick={() => labelPrintEnabled && setSelectedPrintOption('label')}
            >
              <div className="flex flex-col items-center text-center mb-3">
                <Tag className="h-8 w-8 mb-2" />
                <h3 className="font-medium text-sm">Etikett</h3>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {labelPrintEnabled 
                  ? 'Etikettdruck für Gerätemarkierung.' 
                  : 'Nur verfügbar für Professional/Enterprise.'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Vorschau des ausgewählten Formats */}
        {selectedPrintOption && (
          <div className="border rounded-md p-4 max-h-[40vh] overflow-auto bg-gray-50 shadow-inner">
            {selectedPrintOption === 'thermal' && renderThermalContent()}
            {selectedPrintOption === 'a4' && renderA4Content()}
            {selectedPrintOption === 'label' && renderLabelContent()}
          </div>
        )}
        
        <div className="flex justify-end space-x-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={!selectedPrintOption}
          >
            Drucken
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}