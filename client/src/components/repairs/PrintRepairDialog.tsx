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
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
      return;
    }

    // Schließe den Dialog
    onClose();
    
    // Fülle das Druckfenster mit Inhalten und starte direkt den Druckvorgang
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>Abholschein ${repair?.orderCode || `#${repair?.id}`}</title>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
        <style>
          body {
            font-family: monospace, sans-serif;
            font-size: 10px;
            width: ${settings?.receiptWidth || '80mm'};
            margin: 0;
            padding: 10px;
            color: #000;
          }

          .logo,
          .company,
          .top-info {
            text-align: center;
          }

          .logo {
            margin-bottom: 5px;
          }

          .company {
            margin-bottom: 10px;
          }

          .top-info {
            margin: 10px 0;
          }

          .headline {
            font-weight: bold;
            font-size: 15px;
            margin-bottom: 3px;
          }

          .auftragsnummer {
            font-weight: bold;
            font-size: 13px;
          }

          .section {
            margin-bottom: 12px;
            border: 1px solid #ddd;
            padding: 8px;
            border-radius: 4px;
          }

          .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 5px;
            border-bottom: 1px dashed #999;
            padding-bottom: 2px;
          }

          .field {
            margin-bottom: 3px;
          }

          .field label {
            display: inline-block;
            min-width: 60px;
            color: #555;
          }

          .signature-box {
            margin-top: 16px;
            padding-top: 10px;
            border-top: 1px dashed #999;
            text-align: center;
          }

          .signature-title {
            font-weight: bold;
            margin-bottom: 5px;
          }

          .signature-line {
            margin-top: 20px;
            border-top: 1px solid #000;
            width: 100%;
          }

          .signature-img {
            max-height: 40px;
            margin: 5px auto;
            display: block;
          }

          .terms {
            font-size: 9px;
            margin-top: 8px;
            line-height: 1.3;
          }

          @media print {
            @page {
              size: ${settings?.receiptWidth || '80mm'} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 5px;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- Logo & Firma -->
        <div class="company">
          <strong>${businessSettings?.businessName || 'Handyshop Verwaltung'}</strong><br>
          ${businessSettings?.streetAddress || ''}<br>
          ${businessSettings?.zipCode || ''} ${businessSettings?.city || ''}<br>
          ${businessSettings?.phone || ''}
        </div>

        <!-- Abholschein / Auftragsnummer -->
        <div class="top-info">
          <div class="headline">Abholschein</div>
          <div class="auftragsnummer">${repair?.orderCode || `#${repair?.id}`}</div>
          <div>${repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : ''}</div>
        </div>

        <!-- Kunde -->
        <div class="section">
          <div class="section-title">Kunde</div>
          <div class="field">${customer?.firstName || ''} ${customer?.lastName || ''}</div>
          ${customer?.address ? `<div class="field">${customer.address}</div>` : ''}
          ${(customer?.zipCode || customer?.city) ? `<div class="field">${customer?.zipCode || ''} ${customer?.city || ''}</div>` : ''}
          <div class="field">${customer?.phone || ''}</div>
        </div>

        <!-- Gerätedaten -->
        <div class="section">
          <div class="section-title">Gerät</div>
          <div class="field"><label>Hersteller:</label>${repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}</div>
          <div class="field"><label>Modell:</label>${repair?.model || ''}</div>
          <div class="field"><label>Problem:</label>${repair?.issue || ''}</div>
          <div class="field"><label>Preis:</label>${repair?.estimatedCost ? `${repair.estimatedCost} €` : 'nach Aufwand'}</div>
        </div>

        <!-- Bedingungen -->
        <div class="section">
          <div class="section-title">Reparaturbedingungen</div>
          <div class="terms">
            1. Keine Haftung für Datenverlust. Der Kunde ist für die Sicherung verantwortlich.<br>
            2. Reparatur erfolgt nach bestem Wissen und mit geeigneten Teilen.<br>
            3. Originalteile können nicht garantiert werden.<br>
            4. 6 Monate Gewährleistung auf durchgeführte Reparatur.<br>
            5. Geräte müssen innerhalb von 60 Tagen abgeholt werden.<br>
            6. Mit Unterschrift werden diese Bedingungen akzeptiert.
          </div>
        </div>

        <!-- Unterschrift Abgabe - nur wenn vorhanden -->
        ${repair?.dropoffSignature ? `
        <div class="signature-box">
          <div class="signature-title">Reparaturauftrag erteilt</div>
          <img src="${repair.dropoffSignature}" alt="Unterschrift bei Abgabe" class="signature-img" />
          ${customer?.firstName || ''} ${customer?.lastName || ''}<br>
          ${repair?.dropoffSignedAt ? 
            format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy', { locale: de }) : 
            (repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : '')
          }
        </div>
        ` : ''}

        <!-- Unterschrift Abholung - nur wenn vorhanden -->
        ${repair?.pickupSignature ? `
        <div class="signature-box">
          <div class="signature-title">Gerät abgeholt</div>
          <img src="${repair.pickupSignature}" alt="Unterschrift bei Abholung" class="signature-img" />
          ${customer?.firstName || ''} ${customer?.lastName || ''}<br>
          ${repair?.pickupSignedAt ? 
            format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : 
            ''
          }
        </div>
        ` : ''}

        <div class="no-print">
          <button style="background-color: #3b82f6; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 4px; cursor: pointer; margin: 20px auto; display: block;" onClick="window.print(); window.close();">
            Drucken
          </button>
          <button style="background-color: #e5e7eb; color: #4b5563; border: none; padding: 10px 20px; font-size: 16px; border-radius: 4px; cursor: pointer; margin: 0 auto; display: block;" onClick="window.close();">
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
                {/* Logo und Unternehmensdaten */}
                <div className="print-header mb-4">
                  <div className="flex flex-col items-center justify-center">
                    {/* Logo-Funktionalität wurde entfernt */}
                    
                    <h2 className="text-xl font-bold">{businessSettings?.businessName || "Handyshop Verwaltung"}</h2>
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
                
                {/* Dankeschön und extra Platz am Ende */}
                <div className="text-center mt-8">
                  <p className="text-sm">Vielen Dank für Ihren Auftrag!</p>
                  <div style={{ height: '10mm' }}></div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" onClick={onClose} variant="outline">Abbrechen</Button>
              <Button type="button" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Drucken
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}