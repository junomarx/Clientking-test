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
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessSettings } from '@/hooks/use-business-settings';

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairDialog({ open, onClose, repairId }: PrintRepairDialogProps) {
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
    const printContents = printRef.current.innerHTML;

    // Schließe den Dialog
    onClose();
    
    // Fülle das Druckfenster mit Inhalten und starte direkt den Druckvorgang
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Reparaturauftrag ${repair?.orderCode || `#${repair?.id}`}</title>
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
                size: ${settings?.receiptWidth || '80mm'} auto; /* Bonbreite aus Einstellungen */
                margin: 0mm;
              }
              
              body {
                font-family: Arial, sans-serif;
                font-size: ${settings?.receiptWidth === '58mm' ? '11px' : '10px'};
                width: ${settings?.receiptWidth || '80mm'}; /* Bonbreite aus Einstellungen */
                margin: 0;
                padding: 10px;
                color: #000;
              }
              
              .logo {
                text-align: center;
                margin-bottom: 5px;
              }
              
              .logo-img {
                max-width: ${settings?.receiptWidth === '58mm' ? '90%' : '80%'};
                height: auto;
              }
              
              .company,
              .top-info {
                text-align: center;
              }
              
              .company {
                margin-bottom: 10px;
              }
              
              .top-info {
                margin: 10px 0 15px;
              }
              
              .headline {
                font-weight: bold;
                font-size: ${settings?.receiptWidth === '58mm' ? '14px' : '15px'};
                margin-bottom: ${settings?.receiptWidth === '58mm' ? '2px' : '3px'};
              }
              
              .auftragsnummer {
                font-weight: bold;
                font-size: ${settings?.receiptWidth === '58mm' ? '12px' : '13px'};
              }
              
              .section {
                margin-bottom: ${settings?.receiptWidth === '58mm' ? '14px' : '16px'};
              }
              
              .field {
                margin-bottom: ${settings?.receiptWidth === '58mm' ? '3px' : '4px'};
              }
              
              .kundenname,
              .geraetinfo {
                font-size: ${settings?.receiptWidth === '58mm' ? '12px' : '13px'};
                font-weight: bold;
                margin-bottom: 2px;
              }
              
              .schaden-title {
                font-weight: bold;
                margin-top: ${settings?.receiptWidth === '58mm' ? '6px' : '8px'};
                margin-bottom: 2px;
              }
              
              .preis-label {
                font-weight: bold;
                font-size: 11px;
                margin-top: ${settings?.receiptWidth === '58mm' ? '8px' : '10px'};
                margin-bottom: 2px;
              }
              
              .signature-box {
                margin-top: ${settings?.receiptWidth === '58mm' ? '16px' : '20px'};
                text-align: center;
              }
              
              .signature-title {
                font-weight: bold;
                margin-bottom: ${settings?.receiptWidth === '58mm' ? '4px' : '6px'};
              }
              
              .signature-line {
                margin-top: ${settings?.receiptWidth === '58mm' ? '20px' : '25px'};
                border-top: 1px solid #000;
                width: 100%;
              }
              
              .terms-box {
                border: 1px solid #000;
                padding: ${settings?.receiptWidth === '58mm' ? '6px' : '8px'};
                font-size: 9px;
                line-height: ${settings?.receiptWidth === '58mm' ? '1.3' : '1.4'};
              }
              
              .terms-title {
                text-align: center;
                font-weight: bold;
                font-size: ${settings?.receiptWidth === '58mm' ? '10px' : '11px'};
                margin-bottom: ${settings?.receiptWidth === '58mm' ? '4px' : '6px'};
              }
              
              .print-container {
                width: ${settings?.receiptWidth || '80mm'}; /* Bonbreite aus Einstellungen */
                max-width: ${settings?.receiptWidth || '80mm'};
                margin: 0 auto;
                padding: 5px;
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
                display: block; /* Kein Grid für Thermodruck */
              }
              
              .grid-cols-1 {
                display: block; /* Kein Grid für Thermodruck */
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
                display: block; /* Für Thermodruck ist block-Layout besser */
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
                max-width: ${settings?.receiptWidth === '58mm' ? '45mm' : '60mm'}; /* Angepasst für Bonbreite */
                max-height: 15mm; /* Begrenzte Höhe */
                margin: 0 auto;
                display: block;
              }
              
              .max-h-16 {
                max-height: 15mm;
              }
              
              .max-w-\\[200px\\] {
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
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reparaturauftrag drucken</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto bg-gray-50 shadow-inner">
              <div ref={printRef} className="bg-white p-6 rounded-md shadow-sm">
                {/* Logo */}
                <div className="logo">
                  {businessSettings?.logoImage && (
                    <img 
                      src={businessSettings.logoImage} 
                      alt={businessSettings.businessName || "Firmenlogo"}
                      className="logo-img"
                    />
                  )}
                </div>

                {/* Firmeninfo */}
                <div className="company">
                  <strong>{businessSettings?.businessName || "Handyshop Verwaltung"}</strong><br />
                  {businessSettings?.streetAddress}, {businessSettings?.zipCode} {businessSettings?.city}<br />
                  {businessSettings?.phone}
                </div>

                {/* Abholschein + Auftragsnummer */}
                <div className="top-info">
                  <div className="headline">Abholschein</div>
                  <div className="auftragsnummer">{repair?.orderCode || `#${repair?.id}`}</div>
                  <div>{repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</div>
                </div>

                {/* Kunde */}
                <div className="section">
                  <div className="kundenname">{customer?.firstName} {customer?.lastName}</div>
                  <div className="field">{customer?.phone}</div>
                  <div className="field">{customer?.email}</div>
                </div>

                {/* Gerät */}
                <div className="section">
                  <div className="geraetinfo">{repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''} {repair?.model}</div>

                  <div className="schaden-title">Schaden/Fehler</div>
                  <div className="field">
                    {repair?.issue ? repair.issue.split(',').map((issue, index) => (
                      <div key={index}>{issue.trim()}</div>
                    )) : ''}
                  </div>

                  {repair?.estimatedCost && (
                    <>
                      <div className="preis-label">Preis</div>
                      <div className="field">{repair.estimatedCost} €</div>
                    </>
                  )}
                </div>

                {/* Reparaturbedingungen */}
                <div className="section">
                  <div className="terms-box">
                    <div className="terms-title">Reparaturbedingungen</div>
                    {settings?.receiptWidth === '58mm' ? (
                      <>
                        1. Keine Haftung für Datenverlust – Kunde ist verantwortlich.<br /><br />
                        2. Reparatur mit geprüften, ggf. nicht originalen Teilen.<br /><br />
                        3. 6 Monate Gewährleistung auf Reparaturleistung.<br /><br />
                        4. Zugriff auf Gerät zur Fehlerprüfung möglich.<br /><br />
                        5. Abholung innerhalb von 60 Tagen erforderlich.<br /><br />
                        6. Mit Unterschrift werden Bedingungen akzeptiert.
                      </>
                    ) : (
                      <>
                        1. Für Datenverlust wird keine Haftung übernommen. Der Kunde ist für Datensicherung selbst verantwortlich.<br /><br />
                        2. Die Reparatur erfolgt nach bestem Wissen mit geeigneten Ersatzteilen. Originalteile können nicht garantiert werden.<br /><br />
                        3. Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die Reparaturleistung.<br /><br />
                        4. Testzugriffe auf das Gerät können notwendig sein.<br /><br />
                        5. Geräte müssen innerhalb von 60 Tagen abgeholt werden. Danach kann das Gerät kostenpflichtig eingelagert oder entsorgt werden.<br /><br />
                        6. Mit Ihrer Unterschrift stimmen Sie diesen Bedingungen ausdrücklich zu.
                      </>
                    )}
                  </div>
                </div>

                {/* Unterschrift Abgabe */}
                {repair?.dropoffSignature && (
                  <div className="signature-box">
                    <div className="signature-title">Reparaturauftrag erteilt</div>
                    <div className="signature-line">
                      <img 
                        src={repair.dropoffSignature} 
                        alt="Unterschrift bei Abgabe" 
                        style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
                      />
                    </div>
                    {customer?.firstName} {customer?.lastName}<br />
                    {repair.dropoffSignedAt && format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy', { locale: de })}
                  </div>
                )}

                {/* Unterschrift Abholung */}
                {repair?.pickupSignature && (
                  <div className="signature-box">
                    <div className="signature-title">Gerät abgeholt</div>
                    <div className="signature-line">
                      <img 
                        src={repair.pickupSignature} 
                        alt="Unterschrift bei Abholung" 
                        style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
                      />
                    </div>
                    {customer?.firstName} {customer?.lastName}<br />
                    {repair.pickupSignedAt && format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de })}
                  </div>
                )}
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