import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Repair } from '@shared/schema';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';

interface PrintRepairA4DialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairA4Dialog({ open, onClose, repairId }: PrintRepairA4DialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings: businessSettings } = useBusinessSettings();

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

  // Lade Kundendaten, wenn Reparatur geladen wurde
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
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

  const isLoading = isLoadingRepair || isLoadingCustomer;

  const handlePrint = () => {
    // Öffne ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bitte erlauben Sie Pop-ups für diese Seite, um den Ausdruck anzuzeigen.');
      return;
    }
    
    // Formatiere Adressen für den Ausdruck
    const fullAddress = customer ? 
      [customer.address, `${customer.zipCode || ''} ${customer.city || ''}`].filter(Boolean).join(', ') : '';

    // Preis formatieren
    const formattedPrice = repair?.estimatedCost 
      ? parseFloat(repair.estimatedCost).toFixed(2).replace('.', ',') 
      : '-';

    // Datum für Unterschriften formatieren
    const dropoffDate = repair?.dropoffSignedAt 
      ? format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy', { locale: de }) 
      : '';
    const pickupDate = repair?.pickupSignedAt 
      ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) 
      : '';

    // Unterschriftsbilder einbinden
    const dropoffSignature = repair?.dropoffSignature 
      ? `<img src="${repair.dropoffSignature}" alt="Unterschrift bei Abgabe" style="max-height: 80px; max-width: 100%;">` 
      : '';
    const pickupSignature = repair?.pickupSignature 
      ? `<img src="${repair.pickupSignature}" alt="Unterschrift bei Abholung" style="max-height: 80px; max-width: 100%;">` 
      : '';

    // Logo einbinden
    const logoHTML = businessSettings?.logoImage 
      ? `<img src="${businessSettings.logoImage}" alt="${businessSettings.businessName || 'Firmenlogo'}" style="max-width: 100%; max-height: 80px;">` 
      : 'Firmenlogo';

    // Schließe den Dialog
    onClose();
    
    // Fülle das Druckfenster mit Inhalten und starte direkt den Druckvorgang
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
          <meta charset="UTF-8">
          <title>Reparaturauftrag | ${businessSettings?.businessName || 'Handyshop Verwaltung'}</title>
          <style>
              :root {
                  --primary: #2563eb;  /* Modernes Blau */
                  --secondary: #4b5563; /* Grau für Text */
                  --light-bg: #f8fafc;  /* Hellgrauer Hintergrund */
                  --border: #e2e8f0;    /* Dezentere Rahmen */
              }
              
              body {
                  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                  margin: 0;
                  padding: 40px;
                  font-size: 13px;
                  color: var(--secondary);
                  line-height: 1.5;
              }
              
              /* Header mit Logo */
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  margin-bottom: 30px;
                  padding-bottom: 20px;
                  border-bottom: 1px solid var(--border);
              }
              
              .logo-container {
                  width: 200px;
                  padding: 12px;
                  text-align: center;
              }
              
              .company-info {
                  text-align: right;
              }
              
              .company-name {
                  font-weight: 600;
                  font-size: 18px;
                  color: var(--primary);
                  margin-bottom: 8px;
              }
              
              .company-contact {
                  font-size: 12px;
                  color: var(--secondary);
              }
              
              /* Dokumententitel */
              .document-title {
                  text-align: center;
                  font-size: 28px;
                  font-weight: 600;
                  margin: 30px 0 15px;
                  color: var(--primary);
                  letter-spacing: -0.5px;
              }
              
              .auftragsnummer {
                  text-align: center;
                  font-size: 16px;
                  font-weight: 500;
                  margin: 0 0 40px;
                  color: var(--secondary);
              }
              
              /* Kundeninfo */
              .customer-info {
                  margin-bottom: 40px;
                  padding: 20px;
                  background: var(--light-bg);
                  border-radius: 12px;
              }
              
              .section-title {
                  font-weight: 600;
                  margin-bottom: 15px;
                  font-size: 15px;
                  color: var(--primary);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
              }
              
              .customer-name {
                  font-weight: 600;
                  font-size: 16px;
                  margin-bottom: 8px;
                  color: #111;
              }
              
              /* Geräteinformationen */
              .device-repair-box {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 30px;
                  margin-bottom: 30px;
                  padding: 25px;
                  border: 1px solid var(--border);
                  border-radius: 12px;
                  background: white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              }
              
              .info-item {
                  margin-bottom: 18px;
              }
              
              .info-label {
                  font-size: 11px;
                  color: var(--secondary);
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                  opacity: 0.8;
              }
              
              .info-value {
                  font-size: 15px;
                  font-weight: 500;
                  color: #111;
              }
              
              .price-value {
                  font-size: 18px;
                  font-weight: 600;
                  color: var(--primary);
              }
              
              /* Bedingungen */
              .repair-terms-box {
                  border: 1px solid var(--border);
                  border-radius: 12px;
                  background: white;
                  padding: 25px;
                  margin-bottom: 40px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              }
              
              .terms-list {
                  padding-left: 18px;
              }
              
              .terms-list li {
                  margin-bottom: 12px;
                  font-size: 13px;
                  color: var(--secondary);
              }
              
              /* Unterschriftsbereich */
              .signature-section {
                  margin-top: 60px;
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 40px;
              }
              
              .signature-box {
                  padding: 20px 0;
              }
              
              .signature-title {
                  font-weight: 600;
                  margin-bottom: 20px;
                  color: var(--primary);
              }
              
              .signature-line {
                  margin-top: 40px;
                  border-top: 1px solid var(--border);
                  height: 1px;
              }
              
              .signature-placeholder {
                  font-size: 11px;
                  color: var(--secondary);
                  margin-top: 8px;
                  opacity: 0.7;
              }
              
              .signature-date {
                  font-size: 12px;
                  color: var(--secondary);
                  margin-top: 8px;
              }
              
              .signature-image {
                  margin-top: 10px;
                  margin-bottom: 10px;
                  min-height: 30px;
              }
              
              @media print {
                  body {
                      padding: 0;
                  }
                  @page {
                      size: A4;
                      margin: 2cm;
                  }
                  .repair-terms-box, .device-repair-box {
                      box-shadow: none;
                  }
              }
          </style>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
      </head>
      <body>
          <div class="header">
              <div class="logo-container">
                  ${logoHTML}
              </div>
              <div class="company-info">
                  <div class="company-name">${businessSettings?.businessName || 'Handyshop Verwaltung'}</div>
                  <div class="company-contact">
                      ${businessSettings?.streetAddress || ''}, ${businessSettings?.zipCode || ''} ${businessSettings?.city || ''}<br>
                      ${businessSettings?.phone ? `${businessSettings.phone}<br>` : ''}
                      ${businessSettings?.email ? `${businessSettings.email}` : ''}
                  </div>
              </div>
          </div>

          <div class="customer-info">
              <div class="section-title">Kundeninformationen</div>
              <div class="customer-name">${customer?.firstName || ''} ${customer?.lastName || ''}</div>
              <div>${customer?.phone || ''}</div>
              <div>${customer?.email || ''}</div>
              <div>${fullAddress}</div>
          </div>

          <div class="document-title">Reparaturauftrag</div>
          <div class="auftragsnummer">Auftragsnummer: ${repair?.orderCode || `#${repair?.id}`}</div>

          <!-- Gerätedaten & Reparaturdetails -->
          <div class="device-repair-box">
              <div class="info-column">
                  <div class="info-item">
                      <div class="info-label">Hersteller</div>
                      <div class="info-value">${repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : '-'}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">Modell</div>
                      <div class="info-value">${repair?.model || '-'}</div>
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
                      <div class="info-label">Fehlerbeschreibung</div>
                      <div class="info-value">${repair?.issue ? repair.issue.replace(/,/g, '<br>') : '-'}</div>
                  </div>
                  <div class="info-item">
                      <div class="info-label">Kostenvoranschlag</div>
                      <div class="info-value price-value">${formattedPrice} €</div>
                  </div>
                  ${repair?.notes ? `
                  <div class="info-item">
                      <div class="info-label">Notizen</div>
                      <div class="info-value">${repair.notes}</div>
                  </div>
                  ` : ''}
              </div>
          </div>

          <!-- Reparaturbedingungen -->
          <div class="repair-terms-box">
              <div class="section-title">Reparaturbedingungen</div>
              <ul class="terms-list">
                  <li><strong>Datenverlust:</strong> Wir übernehmen keine Haftung für Datenverluste. Der Kunde ist für die Datensicherung verantwortlich.</li>
                  <li><strong>Ersatzteile:</strong> Die Reparatur erfolgt mit hochwertigen Komponenten. Originalteile werden nach Verfügbarkeit eingesetzt.</li>
                  <li><strong>Gewährleistung:</strong> 6 Monate auf ausgeführte Reparaturen und verwendete Komponenten.</li>
                  <li><strong>Abholfrist:</strong> Nicht abgeholte Geräte werden nach 60 Tagen kostenpflichtig eingelagert oder entsorgt.</li>
                  <li><strong>Auftragsbestätigung:</strong> Mit Unterschrift werden diese Bedingungen anerkannt.</li>
              </ul>
          </div>

          <!-- Unterschriftsbereich -->
          <div class="signature-section">
              <div class="signature-box">
                  <div class="signature-title">Reparaturauftrag erteilt</div>
                  <div class="signature-image">${dropoffSignature}</div>
                  ${!dropoffSignature ? `<div class="signature-line"></div>
                  <div class="signature-placeholder">Unterschrift Kunde</div>` : ''}
                  <div class="signature-date">${dropoffDate}</div>
              </div>
              <div class="signature-box">
                  <div class="signature-title">Gerät abgeholt</div>
                  <div class="signature-image">${pickupSignature}</div>
                  ${!pickupSignature ? `<div class="signature-line"></div>
                  <div class="signature-placeholder">Unterschrift Kunde</div>` : ''}
                  <div class="signature-date">${pickupDate}</div>
              </div>
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
          <DialogTitle>DIN A4 Reparaturauftrag drucken</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm">Diese Ansicht druckt einen DIN A4 Reparaturauftrag mit ansprechendem Layout:</p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>Professionelles Design im Hochformat</li>
                <li>Alle Reparatur- und Kundendaten übersichtlich dargestellt</li>
                <li>Unterschriftsbereiche für Auftragserteilung und Abholung</li>
                <li>Reparaturbedingungen vollständig aufgeführt</li>
              </ul>
            </div>
            
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                A4 Ausdruck erstellen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
