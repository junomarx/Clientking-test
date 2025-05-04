import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { Loader2 } from 'lucide-react';
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
  const { settings: hookSettings } = useBusinessSettings();
  
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

  // Lade alle Daten auf einmal mit dem neuen API-Endpunkt
  const { data: printData, isLoading: isLoadingPrintData } = useQuery<{
    repair: Repair;
    customer: Customer;
    businessSettings: BusinessSettings;
  }>({
    queryKey: ['/api/print-data', repairId],
    queryFn: async () => {
      if (!repairId) return null;
      try {
        console.log(`Rufe /api/print-data/${repairId} auf...`);
        const response = await fetch(`/api/print-data/${repairId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Fehler beim Laden der Druckdaten (Status ${response.status}):`, errorText);
          throw new Error(`Druckdaten konnten nicht geladen werden: ${response.status} ${response.statusText}`);
        }
        
        // Überprüfen des Content-Types
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Unerwarteter Content-Type: ${contentType}`);
        }
        
        const data = await response.json();
        console.log('Geladene Druckdaten:', data);
        return data;
      } catch (err) {
        console.error("Fehler beim Laden der Druckdaten:", err);
        return null;
      }
    },
    enabled: !!repairId && open,
  });
  
  // Extrahiere die Daten aus dem Ergebnis
  const repair = printData?.repair;
  const customer = printData?.customer;
  const businessSettings = printData?.businessSettings;
  
  // Debug-Ausgabe für Fehlersuche
  useEffect(() => {
    if (repairId && open) {
      console.log(`Versuche Druckdaten für Reparatur #${repairId} zu laden`);
    }
    if (printData) {
      console.log('Druckdaten geladen:', printData);
      console.log('Extrahierte repair:', repair);
      console.log('Extrahierte customer:', customer);
      console.log('Extrahierte businessSettings:', businessSettings);
    }
  }, [repairId, open, printData, repair, customer, businessSettings]);

  const isLoading = isLoadingPrintData;

  // Vereinfachte Druckfunktion
  const handlePrint = () => {
    if (!repair || !customer || !businessSettings) {
      console.error('Keine Daten zum Drucken vorhanden');
      return;
    }
    
    console.log('handlePrint wurde aufgerufen mit Daten:', { repair, customer, businessSettings });
    
    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    if (!printWindow) {
      alert('Bitte erlauben Sie Popup-Fenster für diese Seite, um drucken zu können.');
      return;
    }

    onClose();
    
    // Einfaches HTML Template
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ausdruck Reparaturauftrag ${repair.orderCode}</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .section { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; }
          .section-title { font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${businessSettings.businessName}</h2>
          <p>${businessSettings.streetAddress}, ${businessSettings.zipCode} ${businessSettings.city}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Reparaturauftrag: ${repair.orderCode}</div>
          <p>Datum: ${format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Kundendaten</div>
          <p>Name: ${customer.firstName} ${customer.lastName}</p>
          <p>Telefon: ${customer.phone || ''}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Gerätedaten</div>
          <p>Hersteller: ${repair.brand || ''}</p>
          <p>Modell: ${repair.model || ''}</p>
          <p>Problem: ${repair.issue || ''}</p>
          <p>Preis: ${repair.estimatedCost ? `${repair.estimatedCost} €` : 'nach Aufwand'}</p>
        </div>
        
        <button onclick="window.print(); window.close();">Drucken</button>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
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
          <div className="p-4">
            <div className="mb-4 p-4 border rounded">
              <h3 className="font-semibold text-lg mb-2">Reparaturauftrag {repair?.orderCode}</h3>
              <p className="mb-2">Kunde: {customer?.firstName} {customer?.lastName}</p>
              <p>Gerät: {repair?.brand} {repair?.model}</p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!repair || !customer || !businessSettings}
              >
                Drucken
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}