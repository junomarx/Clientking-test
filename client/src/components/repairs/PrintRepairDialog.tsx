import React, { useRef, useEffect } from 'react';
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

  // Funktion zum Drucken mit verbessertem Error-Handling
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      
      // Eine Referenz auf das aktuelle onClose speichern, bevor wir den DOM verändern
      const closeDialog = onClose;
      
      try {
        // Eine neue print-window Funktion, die nach dem Drucken das Fenster wiederherstellt
        const printAndRestore = () => {
          const printWindow = window.open('', '_blank');
          
          if (!printWindow) {
            alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
            return;
          }
          
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Reparaturauftrag #${repair?.id}</title>
                <style>
                  @media print {
                    @page {
                      size: 80mm auto; /* Fixe Breite von 80mm für Thermodruck */
                      margin: 0mm;
                    }
                    
                    body {
                      font-family: 'Courier New', monospace; /* Bessere Schrift für Thermodruck */
                      padding: 0;
                      margin: 0;
                      color: black;
                      font-size: 10pt; /* Basis-Schriftgröße für Thermodruck */
                      width: 80mm; /* Fixe Breite von 80mm */
                    }
                    
                    .print-container {
                      width: 80mm; /* Fixe Breite von 80mm */
                      max-width: 80mm;
                      margin: 0 auto;
                      padding: 5mm 2mm;
                    }
                    
                    .print-header {
                      padding-bottom: 5mm;
                      border-bottom: 0.5mm solid black;
                      margin-bottom: 5mm;
                      text-align: center;
                    }
                    
                    .print-header h2 {
                      font-size: 14pt;
                      margin-bottom: 2mm;
                      font-weight: bold;
                    }
                    
                    .print-section {
                      margin-bottom: 5mm;
                      padding-bottom: 2mm;
                    }
                    
                    .print-section h3 {
                      font-size: 12pt;
                      margin-bottom: 2mm;
                      padding-bottom: 1mm;
                      border-bottom: 0.2mm solid black;
                      font-weight: bold;
                    }
                    
                    .print-row {
                      display: flex;
                      margin-bottom: 1.5mm;
                      flex-wrap: wrap; /* Erlaubt Umbrüche bei schmalen Breiten */
                    }
                    
                    .print-label {
                      font-weight: bold;
                      width: 25mm; /* Angepasst für 80mm Breite */
                      margin-right: 1mm;
                    }
                    
                    .print-value {
                      flex: 1;
                      min-width: 45mm; /* Stellt sicher, dass der Wert genug Platz hat */
                    }
                    
                    .grid-cols-2 {
                      display: block; /* Kein Grid für Thermodruck */
                    }
                    
                    .grid-cols-1 {
                      display: block; /* Kein Grid für Thermodruck */
                      margin-bottom: 2mm;
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
                      margin-top: 2mm;
                      margin-bottom: 2mm;
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
                    
                    .receipt-watermark {
                      display: none; /* Keine Wasserzeichen für Thermodruck */
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
                      max-width: 60mm; /* Angepasst für 80mm Breite */
                      max-height: 20mm; /* Begrenzte Höhe */
                      margin: 0 auto;
                      display: block;
                    }
                    
                    .max-h-16 {
                      max-height: 20mm;
                    }
                    
                    .max-w-\\[200px\\] {
                      max-width: 60mm;
                    }
                    
                    .object-contain {
                      object-fit: contain;
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
                <button class="print-button" onClick="window.print(); window.close();">
                  Drucken
                </button>
                <button class="close-button" onClick="window.close();">
                  Schließen
                </button>
                <script>
                  window.addEventListener('afterprint', function() {
                    // Optional: Fenster nach dem Drucken automatisch schließen
                    // window.close();
                  });
                </script>
              </body>
            </html>
          `);
          
          printWindow.document.close();
          
          // Dialog im Hauptfenster schließen
          closeDialog();
        };
        
        // Neue Methode nutzen, die keine DOM-Manipulation am Hauptfenster erfordert
        printAndRestore();
      } catch (error) {
        console.error('Fehler beim Drucken:', error);
        
        // Im Fehlerfall das Original-Layout wiederherstellen
        // Dies sollte eigentlich nicht passieren, da wir jetzt ein neues Fenster verwenden
        alert('Beim Drucken ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
        
        // Dialog trotzdem schließen
        closeDialog();
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
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="border rounded-md p-4 max-h-[60vh] overflow-auto bg-gray-50 shadow-inner">
              <div ref={printRef} className="bg-white p-6 rounded-md shadow-sm">
                {/* Wasserzeichen */}
                <div className="receipt-watermark">
                  REPARATURAUFTRAG
                </div>
                
                {/* Header mit Logo */}
                <div className="print-header mb-6">
                  <div className="flex flex-col items-center justify-center">
                    {/* Logo anzeigen, wenn vorhanden */}
                    {businessSettings?.logoImage && (
                      <div className="mb-3">
                        <img 
                          src={businessSettings.logoImage} 
                          alt={businessSettings.businessName || "Firmenlogo"}
                          className="max-h-16 max-w-[200px] object-contain"
                        />
                      </div>
                    )}
                    
                    <h2 className="text-xl font-bold">{businessSettings?.businessName || "Handyshop Verwaltung"}</h2>
                    {businessSettings?.phone && <p className="text-sm">Tel: {businessSettings.phone}</p>}
                    {businessSettings?.email && <p className="text-sm">E-Mail: {businessSettings.email}</p>}
                    <p className="text-xs">
                      {businessSettings ? (
                        `${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}`
                      ) : (
                        "Adresse nicht verfügbar"
                      )}
                    </p>
                    {businessSettings?.website && <p className="text-xs">{businessSettings.website}</p>}
                  </div>
                </div>
                
                {/* Auftragskopf */}
                <div className="print-section mb-4">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-lg">Reparaturauftrag</h3>
                    <span className="receipt-number">#{repair?.id}</span>
                  </div>
                  
                  <div className="highlight-box mt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <span className="font-medium">Datum:</span> 
                          {repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>
                          <span className={`status-badge status-${repair?.status === 'in_reparatur' 
                              ? 'in-reparatur' 
                              : repair?.status === 'ausser_haus' 
                                ? 'ausser-haus' 
                                : repair?.status}`}>
                            {repair?.status === 'eingegangen' ? 'Eingegangen' : 
                             repair?.status === 'in_reparatur' ? 'In Reparatur' : 
                             repair?.status === 'fertig' ? 'Fertig' : 
                             repair?.status === 'abgeholt' ? 'Abgeholt' : 'Außer Haus'}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p><span className="font-medium">Auftragsnummer:</span> {repair?.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Kundendaten */}
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Kundendaten</h3>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <p><span className="font-medium">Name:</span> {customer?.firstName} {customer?.lastName}</p>
                    <p><span className="font-medium">Telefon:</span> {customer?.phone}</p>
                    {customer?.email && <p><span className="font-medium">E-Mail:</span> {customer?.email}</p>}
                  </div>
                </div>
                
                {/* Gerätedaten */}
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Gerätedaten</h3>
                  <div className="highlight-box">
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <p><span className="font-medium">Typ:</span> {repair?.deviceType === 'smartphone' ? 'Smartphone' : 
                                            repair?.deviceType === 'tablet' ? 'Tablet' : 'Laptop'}</p>
                      <p><span className="font-medium">Marke:</span> {repair?.brand}</p>
                      <p><span className="font-medium">Modell:</span> {repair?.model}</p>
                      {repair?.serialNumber && <p><span className="font-medium">Seriennummer:</span> {repair.serialNumber}</p>}
                    </div>
                  </div>
                </div>
                
                {/* Reparaturdetails */}
                <div className="print-section mb-4">
                  <h3 className="font-semibold mb-2">Reparaturdetails</h3>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="highlight-box">
                      <p><span className="font-medium">Problem:</span> {repair?.issue}</p>
                    </div>
                    
                    {repair?.estimatedCost && (
                      <div className="highlight-box">
                        <p><span className="font-medium">Kostenvoranschlag:</span> {repair.estimatedCost} €</p>
                      </div>
                    )}
                    
                    {repair?.depositAmount && (
                      <div className="highlight-box" style={{borderWidth: '0.5mm'}}>
                        <p className="font-bold" style={{textDecoration: 'underline'}}>WICHTIG: Gerät beim Kunden / bei Kundin!</p>
                        <p><span className="font-medium">Anzahlung:</span> {repair.depositAmount} €</p>
                      </div>
                    )}
                    
                    {repair?.notes && (
                      <div>
                        <p><span className="font-medium">Notizen:</span></p>
                        <p className="mt-1 ml-4">{repair.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Footer */}
                <div className="receipt-footer">
                  <p>Vielen Dank für Ihren Auftrag.</p>
                  <p>Bitte bewahren Sie diesen Beleg auf. Er dient als Nachweis für die Abholung Ihres Geräts.</p>
                  <p className="mt-2">© {new Date().getFullYear()} {businessSettings?.businessName || "Handyshop Verwaltung"}</p>
                  {businessSettings?.taxId && <p>UID: {businessSettings.taxId}</p>}
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