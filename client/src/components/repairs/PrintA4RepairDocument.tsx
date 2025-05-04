import React, { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PrintA4RepairDocumentProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintA4RepairDocument({ open, onClose, repairId }: PrintA4RepairDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings();
  
  // Logo-Status
  const [logoExists, setLogoExists] = useState(false);
  
  // Überprüfe, ob das Logo existiert
  useEffect(() => {
    if (open && repairId) {
      // Überprüfe, ob das Logo existiert
      fetch('/api/business-settings/logo')
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setLogoExists(true);
          }
        })
        .catch(err => {
          console.error('Fehler beim Prüfen des Logos:', err);
          setLogoExists(false);
        });
    }
  }, [open, repairId]);

  // Lade Reparaturdaten
  const { data: repair, isLoading: isLoadingRepair } = useQuery<Repair>({
    queryKey: ['/api/repairs', repairId],
    queryFn: async () => {
      if (!repairId) return null;
      try {
        const response = await fetch(`/api/repairs/${repairId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        });
        if (!response.ok) throw new Error("Reparaturauftrag konnte nicht geladen werden");
        
        // Überprüfen des Content-Types
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Unerwarteter Content-Type: ${contentType}`);
        }
        
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Reparaturdaten:", err);
        return null;
      }
    },
    enabled: !!repairId && open,
  });
  
  // Debug-Ausgabe für Fehlersuche
  useEffect(() => {
    if (repairId && open) {
      console.log(`Versuche Reparatur #${repairId} für A4-Dokument zu laden`);
    }
    if (repair) {
      console.log(`Reparatur #${repairId} für A4-Dokument geladen:`, repair);
    }
  }, [repairId, open, repair]);

  // Lade Kundendaten
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['/api/customers', repair?.customerId],
    queryFn: async () => {
      if (!repair?.customerId) return null;
      try {
        const response = await fetch(`/api/customers/${repair.customerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        });
        if (!response.ok) throw new Error("Kundendaten konnten nicht geladen werden");
        
        // Überprüfen des Content-Types
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Unerwarteter Content-Type: ${contentType}`);
        }
        
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Kundendaten:", err);
        return null;
      }
    },
    enabled: !!repair?.customerId && open,
  });
  
  // Debug-Ausgabe für Fehlersuche
  useEffect(() => {
    if (repair?.customerId && open) {
      console.log(`Versuche Kunde #${repair.customerId} für A4-Dokument zu laden`);
    }
    if (customer) {
      console.log(`Kunde ${customer.firstName} ${customer.lastName} für A4-Dokument geladen:`, customer);
    }
  }, [repair?.customerId, open, customer]);

  // Funktion zum Drucken des Dokuments
  const handlePrint = () => {
    // Öffne ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite.');
      return;
    }
    
    // Schließe den Dialog
    onClose();
    
    // Formatiere Kundenadresse
    const formatAddress = (): string => {
      if (!customer) return '';
      
      let address = '';
      if (customer.address) address += customer.address;
      if (address && (customer.zipCode || customer.city)) address += '<br>';
      if (customer.zipCode) address += customer.zipCode;
      if (customer.zipCode && customer.city) address += ' ';
      if (customer.city) address += customer.city;
      
      return address;
    };

    // Formatiere Preisanzeige
    const formatPrice = (): string => {
      if (!repair) return '-';
      
      if (repair.estimatedCost) {
        // Wir gehen davon aus, dass estimatedCost ein String ist (wie in unserem Typ definiert)
        // Wir entfernen das Euro-Zeichen, falls vorhanden, für eine konsistente Formatierung
        const costValue = repair.estimatedCost.replace('€', '').trim();
        return `${costValue} €`;
      }
      
      return 'nach Aufwand';
    };

    // Hole Firmendaten aus den Settings
    const businessName = settings?.businessName || 'Mein Handyshop';
    const streetAddress = settings?.streetAddress || '';
    const zipAndCity = `${settings?.zipCode || ''} ${settings?.city || ''}`;
    const phone = settings?.phone || '';
    const email = settings?.email || '';
    
    // Logo-URL mit Cache-Busting für Druckdokument
    const logoUrl = '/uploads/firmenlogo.png';
    const logoUrlWithCache = `${logoUrl}?t=${new Date().getTime()}`;
    
    // Fülle das Druckfenster mit Inhalten 
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
                window.onafterprint = function() {
                  window.close();
                };
              }, 500);
            };
          </script>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                  font-size: 12px;
                  color: #333;
              }
              .header {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 40px;
              }
              .company-info {
                  text-align: right;
                  font-size: 12px;
                  color: #666;
              }
              .company-name {
                  font-weight: bold;
                  font-size: 16px;
                  color: #333;
                  margin-bottom: 5px;
              }
              .document-title {
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                  margin: 30px 0 10px 0;
                  color: #222;
              }
              .auftragsnummer {
                  text-align: center;
                  font-size: 18px;
                  margin: 0 0 40px 0;
                  color: #222;
              }
              .section {
                  margin-bottom: 20px;
              }
              .section-title {
                  font-weight: bold;
                  margin-bottom: 10px;
                  font-size: 14px;
                  color: #333;
              }
              .customer-info {
                  margin-bottom: 30px;
              }
              .customer-info p {
                  margin: 3px 0;
              }
              .customer-name {
                  font-weight: bold;
                  font-size: 16px;
              }

              .device-repair-box {
                  display: flex;
                  justify-content: space-between;
                  gap: 40px;
                  margin-bottom: 30px;
                  padding: 20px;
                  border: 1px solid #ccc;
                  border-radius: 8px;
                  background-color: #f9f9f9;
              }
              .info-column {
                  flex: 1;
              }
              .info-item {
                  margin-bottom: 15px;
              }
              .info-label {
                  font-size: 11px;
                  color: #666;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 2px;
              }
              .info-value {
                  font-size: 14px;
                  font-weight: bold;
                  color: #222;
              }

              .repair-terms-box {
                  border: 1px solid #ccc;
                  border-radius: 8px;
                  background-color: #f9f9f9;
                  padding: 20px;
                  margin-bottom: 30px;
              }
              .repair-terms-box p {
                  margin: 8px 0;
                  font-size: 12px;
                  color: #333;
                  line-height: 1.4;
              }

              .signature-section {
                  margin-top: 60px;
                  display: flex;
                  justify-content: space-between;
                  gap: 40px;
              }
              .signature-box {
                  flex: 1;
                  text-align: center;
              }
              .signature-line {
                  margin-top: 40px;
                  border-top: 1px solid #999;
                  height: 1px;
              }
              .signature-placeholder {
                  font-size: 10px;
                  color: #999;
                  margin-top: 5px;
              }
              .signature-date {
                  font-size: 11px;
                  color: #666;
                  margin-top: 5px;
              }
              .signature-img {
                  max-height: 50px;
                  margin: 10px auto;
                  display: block;
              }
              .confirm-text {
                  font-size: 10px;
                  color: #666;
                  margin-top: 10px;
                  text-align: center;
              }

              @media print {
                  body {
                      padding: 0;
                  }
                  @page {
                      size: A4;
                      margin: 2cm;
                  }
              }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="company-logo">
                  ${logoExists ? `<img src="${logoUrlWithCache}" alt="${businessName}" style="max-height: 80px; max-width: 200px;">` : ''}
              </div>
              <div class="company-info">
                  <p class="company-name">${businessName}</p>
                  <p>${streetAddress}<br>
                  ${zipAndCity}<br>
                  ${phone}<br>
                  ${email}</p>
              </div>
          </div>

          <div class="customer-info">
              <div class="section-title">Kundeninformationen</div>
              <p class="customer-name">${customer?.firstName || ''} ${customer?.lastName || ''}</p>
              <p>${formatAddress()}</p>
              <p>${customer?.phone || ''}</p>
              <p>${customer?.email || ''}</p>
          </div>

          <div class="document-title">Reparaturauftrag</div>
          <div class="auftragsnummer">${repair?.orderCode || `#${repair?.id}`}</div>

          <!-- Gerätedaten & Reparaturdetails -->
          <div class="device-repair-box">
              <div class="info-column">
                  <div class="info-item">
                      <div class="info-label">Hersteller</div>
                      <div class="info-value">${repair?.brand || ''}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">Modell</div>
                      <div class="info-value">${repair?.model || ''}</div>
                  </div>
                  ${repair?.serialNumber ? `
                  <div class="info-item">
                      <div class="info-label">Seriennummer</div>
                      <div class="info-value">${repair.serialNumber}</div>
                  </div>
                  ` : ''}
              </div>
              <div class="info-column">
                  <div class="info-item">
                      <div class="info-label">Problem</div>
                      <div class="info-value">${repair?.issue || ''}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">Preis</div>
                      <div class="info-value">${formatPrice()}</div>
                  </div>

              </div>
          </div>

          <!-- Reparaturbedingungen -->
          <div class="section repair-terms-box">
              <div class="section-title">Reparaturbedingungen</div>
              <p><strong>1.</strong> Die Reparatur erfolgt nach bestem Wissen und mit geprüften Ersatzteilen. Originalteile können nicht in jedem Fall garantiert werden.</p>
              <p><strong>2.</strong> Für etwaige Datenverluste wird keine Haftung übernommen. Der Kunde ist verpflichtet, vor Abgabe des Geräts eine vollständige Datensicherung vorzunehmen.</p>
              <p><strong>3.</strong> Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die ausgeführten Arbeiten und eingesetzten Komponenten.</p>
              <p><strong>4.</strong> Wird ein Kostenvoranschlag abgelehnt oder ist eine Reparatur nicht möglich, kann eine Überprüfungspauschale berechnet werden.</p>
              <p><strong>5.</strong> Nicht abgeholte Geräte können nach 60 Tagen kostenpflichtig eingelagert oder entsorgt werden.</p>
              <p><strong>6.</strong> Mit der Unterschrift bestätigt der Kunde die Beauftragung der Reparatur sowie die Anerkennung dieser Bedingungen.</p>
          </div>

          <!-- Unterschriftsbereich mit Datum -->
          <div class="signature-section">
              <div class="signature-box">
                  <p><strong>Reparaturauftrag erteilt</strong></p>
                  ${repair?.dropoffSignature ? 
                    `<img src="${repair.dropoffSignature}" alt="Unterschrift bei Abgabe" class="signature-img" />` : 
                    `<div class="signature-line"></div>`
                  }
                  <div class="signature-placeholder">${customer?.firstName || ''} ${customer?.lastName || ''}</div>
                  <div class="signature-date">${repair?.dropoffSignedAt ? 
                    format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy', { locale: de }) : 
                    format(new Date(), 'dd.MM.yyyy', { locale: de })
                  }</div>
                  ${repair?.dropoffSignature ? 
                    `<div class="confirm-text">Hiermit bestätige ich, dass ich mit den Reparaturbedingungen einverstanden bin.</div>` : 
                    ''
                  }
              </div>
              <div class="signature-box">
                  <p><strong>Gerät abgeholt</strong></p>
                  ${repair?.pickupSignature ? 
                    `<img src="${repair.pickupSignature}" alt="Unterschrift bei Abholung" class="signature-img" />` : 
                    `<div class="signature-line"></div>`
                  }
                  <div class="signature-placeholder">${customer?.firstName || ''} ${customer?.lastName || ''}</div>
                  <div class="signature-date">${repair?.pickupSignedAt ? 
                    format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : 
                    ''
                  }</div>
                  ${repair?.pickupSignature ? 
                    `<div class="confirm-text">Hiermit bestätige ich den Erhalt des reparierten Geräts.</div>` : 
                    ''
                  }
              </div>
          </div>
      </body>
      </html>
    `);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>A4 Reparaturauftrag drucken</DialogTitle>
        </DialogHeader>
        
        {(isLoadingRepair || isLoadingCustomer) ? (
          <div className="py-8 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Daten werden geladen...</p>
          </div>
        ) : (
          <div>
            <div className="py-6">
              <p className="text-sm text-center mb-4">
                Drucken Sie den Reparaturauftrag im A4-Format.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Das Dokument öffnet sich in einem neuen Fenster und wird direkt zum Druck gesendet.
              </p>
            </div>
            
            <DialogFooter className="flex justify-end">
              <Button variant="outline" onClick={onClose} className="mr-2">
                Abbrechen
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Drucken
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
