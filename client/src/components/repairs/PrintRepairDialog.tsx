import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Repair, Customer, BusinessSettings } from '@shared/schema';
import { isProfessionalOrHigher } from '@/lib/utils';
import { PrintOptionsDialog } from './PrintOptionsDialog';

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairDialog({ open, onClose, repairId }: PrintRepairDialogProps) {
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [canPrintLabels, setCanPrintLabels] = useState<boolean | null>(null);

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
  
  // Prüfe, ob der Benutzer Etiketten drucken kann
  useEffect(() => {
    if (currentUser) {
      console.log('Benutzer in PrintRepairDialog:', currentUser);
      console.log('isAdmin:', currentUser.isAdmin);
      console.log('pricingPlan:', currentUser.pricingPlan);
      
      // Nur erlauben, wenn der Benutzer Professional oder höher ist oder Admin
      const canPrint = isProfessionalOrHigher(currentUser);
      console.log('Kann Etiketten drucken:', canPrint);
      setCanPrintLabels(canPrint);
    }
  }, [currentUser]);

  // Funktion zum Öffnen des Druckoptionen-Dialogs
  const handleOpenPrintOptions = () => {
    setShowPrintOptions(true);
  };
  
  // Funktion zum Schließen des Druckoptionen-Dialogs
  const handleClosePrintOptions = () => {
    setShowPrintOptions(false);
  };
  
  // PrintOptionsDialog anzeigen, wenn die Daten geladen sind und showPrintOptions true ist
  if (open && !isLoading && showPrintOptions) {
    // Debug-Logs, um zu überprüfen, welche Daten übergeben werden
    console.log('RepairDialog übergibt folgende Daten an PrintOptionsDialog:', {
      repair: repair ? `Repair ID ${repair.id} geladen` : 'Keine Repair-Daten',
      customer: customer ? `Customer ID ${customer.id} geladen` : 'Keine Customer-Daten',
      businessSettings: businessSettings ? `BusinessSettings ID ${businessSettings.id} geladen` : 'Keine BusinessSettings',
      qrCodeSettings: qrCodeSettings ? 'QrCodeSettings geladen' : 'Keine QrCodeSettings',
      currentUser: currentUser ? `User ${currentUser.username} (${currentUser.id}) geladen` : 'Kein User geladen',
    });
    
    // Detailliertere Logs zu Repair und Customer
    if (repair) {
      console.log('Repair Daten Details:', JSON.stringify(repair, null, 2));
    }
    if (customer) {
      console.log('Customer Daten Details:', JSON.stringify(customer, null, 2));
    }
    
    return (
      <PrintOptionsDialog
        open={showPrintOptions}
        onClose={() => {
          handleClosePrintOptions();
          onClose();
        }}
        repair={repair ?? null}
        customer={customer ?? null}
        businessSettings={businessSettings ?? null}
        qrCodeSettings={qrCodeSettings}
        currentUser={currentUser}
        canPrintLabels={canPrintLabels}
      />
    );
  }

  // Hauptdialog nicht anzeigen, wenn nicht geöffnet
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
          <div className="p-6 text-center">
            <p className="mb-8">Wählen Sie ein Druckformat für den Reparaturauftrag {repair?.orderCode || `#${repair?.id}`}</p>
            
            <div className="flex justify-center space-x-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                onClick={handleOpenPrintOptions}
              >
                Druckoptionen anzeigen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}