import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';
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
import { Loader2, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { BonReceipt58mm } from './BonReceipt58mm';
import { BonReceipt80mm } from './BonReceipt80mm';

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
  isPreview?: boolean;
}

export function PrintRepairDialog({ open, onClose, repairId, isPreview = false }: PrintRepairDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings();
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
  const { data: businessSettings, isLoading: isLoadingSettings } = useQuery<BusinessSettings | null>({
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

  // Funktion zum Erstellen eines PDFs für den Kassenbon
  const handlePrint = async () => {
    // Bei Vorschau nicht drucken
    if (isPreview) return;
    
    if (!printRef.current) {
      console.error('Druckelement nicht gefunden');
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      // Erfasse den Inhalt des Druckbereichs
      const content = printRef.current;
      const canvas = await html2canvas(content, {
        scale: 2, // Höhere Qualität
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // Berechne das Seitenverhältnis für PDF
      // Für Bon-Format, verwenden wir ein schmales Format
      const bonWidthMM = settings?.receiptWidth === '58mm' ? 58 : 80;
      
      // PDF mit Bon-Maßen erstellen
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [bonWidthMM, (canvas.height * bonWidthMM) / canvas.width],
      });
      
      // Bildgröße berechnen, um im Bon-Format zu passen
      const imgWidth = bonWidthMM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      
      // PDF in neuem Tab öffnen und Druckdialog automatisch starten
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(blobUrl, '_blank');
      
      if (printWindow) {
        // Füge Skript hinzu, um den Druckdialog zu starten
        printWindow.addEventListener('load', function() {
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        });
        
        // Dialog schließen nach erfolgreicher PDF-Erstellung
        onClose();
        
        toast({
          title: "PDF bereit zum Drucken",
          description: "Das PDF wird in einem neuen Tab geöffnet und der Druckdialog gestartet.",
        });
      } else {
        toast({
          title: "PDF bereit",
          description: "Das PDF wurde erstellt. Bitte aktiviere Pop-ups, falls kein neues Fenster geöffnet wurde.",
        });
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des PDFs:', err);
      toast({
        title: "Fehler",
        description: "Beim Erstellen des PDFs ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" style={{ maxHeight: "500px", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle>{isPreview ? "Bon Vorschau" : "Reparaturauftrag drucken"}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="border rounded-md p-6 max-h-[350px] overflow-auto bg-gray-50 shadow-inner flex justify-center">
              <div ref={printRef} className="bg-white rounded-md shadow-sm" style={{ width: settings?.receiptWidth === '58mm' ? '58mm' : '80mm' }}>
                {settings?.receiptWidth === '58mm' ? (
                  <BonReceipt58mm 
                    firmenlogo={businessSettings?.logoImage || undefined}
                    firmenname={businessSettings?.businessName || "Handyshop Verwaltung"}
                    firmenadresse={businessSettings?.streetAddress || ""}
                    firmenplz={businessSettings?.zipCode || ""}
                    firmenort={businessSettings?.city || ""}
                    firmentelefon={businessSettings?.phone || ""}
                    auftragsnummer={repair?.orderCode || `#${repair?.id}`}
                    datum_dropoff={repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : ""}
                    kundenname={`${customer?.firstName || ""} ${customer?.lastName || ""}`}
                    kundentelefon={customer?.phone || undefined}
                    kundenemail={customer?.email || undefined}
                    hersteller={repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}
                    modell={repair?.model || undefined}
                    problem={repair?.issue ? repair.issue : ''}
                    preis={repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : undefined}
                    signatur_dropoff={repair?.dropoffSignature || undefined}
                    signatur_pickup={repair?.pickupSignature || undefined}
                    datum_pickup={repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : undefined}
                  />
                ) : (
                  <BonReceipt80mm 
                    firmenlogo={businessSettings?.logoImage || undefined}
                    firmenname={businessSettings?.businessName || "Handyshop Verwaltung"}
                    firmenadresse={businessSettings?.streetAddress || ""}
                    firmenplz={businessSettings?.zipCode || ""}
                    firmenort={businessSettings?.city || ""}
                    firmentelefon={businessSettings?.phone || ""}
                    auftragsnummer={repair?.orderCode || `#${repair?.id}`}
                    datum_dropoff={repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : ""}
                    kundenname={`${customer?.firstName || ""} ${customer?.lastName || ""}`}
                    kundentelefon={customer?.phone || undefined}
                    kundenemail={customer?.email || undefined}
                    hersteller={repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}
                    modell={repair?.model || undefined}
                    problem={repair?.issue ? repair.issue.split(',').map(issue => issue.trim()).join('\n') : ''}
                    preis={repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : undefined}
                    signatur_dropoff={repair?.dropoffSignature || undefined}
                    signatur_pickup={repair?.pickupSignature || undefined}
                    datum_pickup={repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : undefined}
                  />
                )}
              </div>
            </div>
            
            <DialogFooter className="flex justify-between mt-4">
              <Button variant="outline" onClick={onClose}>
                {isPreview ? "Schließen" : "Abbrechen"}
              </Button>
              {!isPreview && (
                <Button 
                  onClick={handlePrint} 
                  className="gap-2"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      PDF wird erstellt...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      PDF erstellen & drucken
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
