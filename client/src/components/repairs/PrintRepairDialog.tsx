import React, { useRef, useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { QRCodeSVG } from 'qrcode.react';
import { isProfessionalOrHigher } from '@/lib/utils';
import { A4PrintTemplate } from './A4PrintTemplate';

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairDialog({ open, onClose, repairId }: PrintRepairDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings();
  const [useA4Format, setUseA4Format] = useState(false);

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
  
  // Lade QR-Code-Einstellungen
  const { data: qrCodeSettings, isLoading: isLoadingQrCode } = useQuery({
    queryKey: ['/api/business-settings/qr-code'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/business-settings/qr-code', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-User-ID': localStorage.getItem('userId') || '',
          }
        });
        if (!response.ok) return null;
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der QR-Code-Einstellungen:", err);
        return null;
      }
    },
    enabled: open,
  });

  const isLoading = isLoadingRepair || isLoadingCustomer || isLoadingSettings || isLoadingQrCode;
  
  // Hole Benutzerdaten für Preispaket-Überprüfung
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
  
  // Prüfen, ob der Benutzer Pro oder höher ist
  const canUseQrCodes = isProfessionalOrHigher(currentUser);
  
  // Laden der A4-Druckeinstellungen für DIN A4-Druck
  const { data: a4PrintSettings, isLoading: isLoadingA4Print } = useQuery({
    queryKey: ["/api/business-settings/a4-print"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/business-settings/a4-print', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!response.ok) return { printA4Enabled: false };
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der A4-Druckeinstellungen:", err);
        return { printA4Enabled: false };
      }
    },
    enabled: open,
  });
  
  // Wenn Einstellungen geladen wurden, aktualisiere die A4-Format Option
  useEffect(() => {
    if (a4PrintSettings && currentUser) {
      // Nur aktivieren, wenn der Benutzer Professional oder höher ist
      setUseA4Format(a4PrintSettings.printA4Enabled && isProfessionalOrHigher(currentUser));
    }
  }, [a4PrintSettings, currentUser]);

  // Funktion zum Drucken mit neuem Fenster
  const handlePrint = () => {
    // Für A4-Format, verwende die A4PrintTemplate-Komponente
    if (useA4Format) {
      // Render A4 template to string
      const a4Template = (
        <A4PrintTemplate
          repair={repair}
          customer={customer}
          businessSettings={businessSettings}
          qrCodeSettings={qrCodeSettings}
        />
      );
      
      // Create print window
      const printWindow = window.open('', '_blank', 'width=800,height=800');
      if (!printWindow) {
        alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
        return;
      }
      
      // Close dialog
      onClose();
      
      // Write content to print window
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
                
                /* A4 Layout Styles */
                .a4-print-container {
                  width: 100%;
                  max-width: 100%;
                  margin: 0;
                  padding: 0;
                }
                
                .a4-header {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 15mm;
                  border-bottom: 1px solid #333;
                  padding-bottom: 5mm;
                }
                
                .a4-company-info {
                  flex: 2;
                }
                
                .a4-logo-container {
                  flex: 1;
                  text-align: right;
                }
                
                .a4-company-name {
                  font-size: 18pt;
                  font-weight: bold;
                  margin-bottom: 3mm;
                }
                
                .a4-company-details {
                  font-size: 10pt;
                  line-height: 1.4;
                }
                
                .a4-logo {
                  max-height: 30mm;
                  max-width: 60mm;
                }
                
                .a4-document-info {
                  text-align: right;
                  margin-bottom: 10mm;
                }
                
                .a4-document-title {
                  font-size: 16pt;
                  font-weight: bold;
                  margin-bottom: 5mm;
                  display: flex;
                  align-items: center;
                }
                
                .a4-order-number {
                  display: inline-block;
                  border: 1px solid #333;
                  padding: 2mm 4mm;
                  font-weight: bold;
                  margin-left: 4mm;
                }
                
                .a4-section {
                  margin-bottom: 10mm;
                }
                
                .a4-section-title {
                  font-size: 12pt;
                  font-weight: bold;
                  margin-bottom: 3mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px solid #333;
                }
                
                .a4-info-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  grid-gap: 5mm;
                }
                
                .a4-info-item {
                  margin-bottom: 2mm;
                }
                
                .a4-info-label {
                  font-weight: bold;
                  display: inline-block;
                  min-width: 30mm;
                }
                
                .a4-highlight-box {
                  border: 1px solid #333;
                  border-left-width: 4px;
                  padding: 3mm;
                  margin-bottom: 4mm;
                }
                
                .a4-whitespace-pre-wrap {
                  white-space: pre-wrap;
                }
                
                .a4-important-text {
                  font-weight: bold;
                  text-decoration: underline;
                  margin-bottom: 2mm;
                }
                
                .a4-signature-section {
                  margin-top: 15mm;
                  border-top: 1px solid #333;
                  padding-top: 5mm;
                }
                
                .a4-signature-container {
                  border: 1px solid #333;
                  height: 20mm;
                  margin-bottom: 3mm;
                  position: relative;
                }
                
                .a4-signature-image {
                  position: absolute;
                  max-height: 18mm;
                  max-width: 80%;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                }
                
                .a4-signature-date {
                  font-size: 9pt;
                  text-align: center;
                  margin-bottom: 3mm;
                }
                
                .a4-signature-text {
                  font-size: 9pt;
                  text-align: center;
                }
                
                .a4-qr-code {
                  text-align: center;
                  margin-top: 10mm;
                }
                
                .a4-qr-code-image {
                  width: 25mm;
                  height: 25mm;
                  margin: 0 auto;
                }
                
                .a4-qr-code-text {
                  font-size: 9pt;
                  margin-top: 2mm;
                }
                
                .a4-footer {
                  margin-top: 15mm;
                  border-top: 1px solid #333;
                  padding-top: 3mm;
                  font-size: 9pt;
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
            ${renderToString(a4Template)}
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
    } else {
      // Für Thermobon, verwende das ursprüngliche Layout
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
      const printContents = printRef.current.innerHTML;

      // Schließe den Dialog
      onClose();
      
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
                  flex-wrap: wrap; /* Erlaubt Umbrüche bei schmalen Breiten */
                }
                
                .print-label {
                  font-weight: bold;
                  width: ${settings?.receiptWidth === '58mm' ? '20mm' : '25mm'}; /* Angepasst für Bonbreite */
                  margin-right: 1mm;
                }
                
                .print-value {
                  flex: 1;
                  min-width: ${settings?.receiptWidth === '58mm' ? '30mm' : '45mm'}; /* Angepasst für Bonbreite */
                }
                
                .grid-cols-2 {
                  display: block;
                }
                
                .grid-cols-1 {
                  display: block; 
                  margin-bottom: 1mm;
                }
              
                .font-medium {
                  font-weight: bold;
                  margin-right: 1mm;
                }
                
                .font-semibold {
                  font-weight: bold;
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
                
                .mb-2 {
                  margin-bottom: 2mm;
                }
                
                .mb-3 {
                  margin-bottom: 3mm;
                }
                
                .mb-4 {
                  margin-bottom: 4mm;
                }
                
                .mt-2 {
                  margin-top: 2mm;
                }
                
                .mt-8 {
                  margin-top: 8mm;
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
                
                .status-badge {
                  display: inline-block;
                  padding: 0.5mm 1mm;
                  border: 0.2mm solid black;
                  font-size: 9pt;
                  font-weight: bold;
                  text-transform: uppercase;
                  margin-left: 1mm;
                }
                
                /* Für alle Status-Varianten nur Umrandungen verwenden */
                .status-eingegangen,
                .status-in-reparatur,
                .status-fertig,
                .status-abgeholt,
                .status-ausser-haus {
                  border: 0.3mm solid black;
                }
                
                /* Flex-Layout für Firmenlogo und Informationen */
                .flex {
                  display: block; 
                  text-align: center;
                }
                
                .flex-col {
                  /* Keine besondere Stilisierung notwendig */
                }
                
                .items-center {
                  text-align: center;
                }
                
                .justify-center {
                  text-align: center;
                }
                
                /* Bildstilisierung für Logo */
                img {
                  max-width: ${settings?.receiptWidth === '58mm' ? '45mm' : '60mm'}; 
                  max-height: 15mm;
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
                
                .no-print {
                  display: none !important;
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
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reparaturauftrag drucken</DialogTitle>
        </DialogHeader>
        
        {/* DIN A4-Druck-Option, nur anzeigen wenn A4-Druck aktiviert ist und Benutzer Pro+ */}
        {isProfessionalOrHigher(currentUser) && a4PrintSettings?.printA4Enabled && (
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <h3 className="text-sm font-medium">DIN A4-Format verwenden</h3>
                <p className="text-sm text-muted-foreground">Statt Thermobon-Format</p>
              </div>
              <Switch 
                checked={useA4Format}
                onCheckedChange={setUseA4Format}
              />
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto bg-gray-50 shadow-inner">
              {useA4Format ? (
                <A4PrintTemplate
                  repair={repair}
                  customer={customer}
                  businessSettings={businessSettings}
                  qrCodeSettings={qrCodeSettings}
                />
              ) : (
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
                  
                  {/* Entfernt: Status wird nicht mehr angezeigt */}
                  
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
                          value={`${qrCodeSettings.qrCodeBaseUrl || window.location.origin}/status/${repair?.id}?code=${repair?.accessCode}`}
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
                    {businessSettings?.customFooter && (
                      <div className="mt-2">{businessSettings.customFooter}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
              >
                Drucken
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}