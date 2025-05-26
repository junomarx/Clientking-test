import React, { useRef, useState, useEffect } from 'react';
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
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { BonReceipt58mm } from './BonReceipt58mm';
import { BonReceipt80mm } from './BonReceipt80mm';
import { applyTemplateVariables, fetchLatestPrintTemplate } from '@/lib/print-helper';

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
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateContent, setTemplateContent] = useState<string | null>(null);

  // Aktuelle Druckvorlage laden basierend auf der gewählten Breite
  const fetchPrintTemplate = async () => {
    setIsLoadingTemplate(true);
    try {
      const templateType = settings?.receiptWidth === '58mm' ? 'receipt_58mm' : 'receipt_80mm';
      const response = await fetch(`/api/print-templates/${templateType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Druckvorlage: ${response.status}`);
      }
      
      const template = await response.json();
      console.log(`Druckvorlage vom Typ '${templateType}' geladen:`, template.name);
      setTemplateContent(template.content);
    } catch (error) {
      console.error('Fehler beim Laden der Druckvorlage:', error);
      toast({
        title: "Warnung",
        description: "Die aktuelle Druckvorlage konnte nicht geladen werden. Es wird die Standard-Vorlage verwendet.",
        variant: "warning"
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };
  
  // Beim Öffnen des Dialogs die aktuelle Vorlage laden
  useEffect(() => {
    if (open) {
      fetchPrintTemplate();
    }
  }, [open, settings?.receiptWidth]);

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

  // Wir verwenden nur die Unternehmenseinstellungen aus dem useBusinessSettings Hook
  // und entfernen die redundante Abfrage, die zu inkonsistenten Daten führt
  const isLoadingSettings = false; // Wird bereits in useBusinessSettings geladen

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
      // Erstelle ein unsichtbares Element außerhalb des Viewports zum Rendern
      const fullContent = document.getElementById('receipt-for-pdf');
      if (!fullContent) {
        throw new Error('Receipt element not found');
      }
      
      // Clone den Inhalt in ein neues, unsichtbares Element
      const clonedContent = fullContent.cloneNode(true) as HTMLElement;
      clonedContent.style.position = 'absolute';
      clonedContent.style.left = '-9999px';
      clonedContent.style.top = '-9999px';
      clonedContent.style.width = fullContent.style.width; // Beibehalten der Breite
      clonedContent.style.maxHeight = 'none'; // Keine Höhengrenze
      clonedContent.style.overflow = 'visible';
      document.body.appendChild(clonedContent);
      
      // Erfasse den vollständigen Inhalt
      const canvas = await html2canvas(clonedContent, {
        scale: 2, // Höhere Qualität
        logging: true,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 2000, // Timeout für Bildladung erhöhen
      });
      
      // Entferne das temporäre Element nach dem Rendern
      document.body.removeChild(clonedContent);
      
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
      
      // Direktes Drucken wird über die print()-Methode des geöffneten Fensters realisiert
      // PDF im Browser öffnen
      const pdfOutput = pdf.output('dataurlstring');
      
      // Verwenden eines Blob-URLs für das PDF, um Content-Type korrekt zu setzen
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      
      // PDF direkt in einem neuen Tab öffnen
      const printWindow = window.open(blobUrl, "_blank");
      
      if (printWindow) {
        // Warte kurz und öffne dann den Druckdialog
        setTimeout(() => {
          printWindow.print();
        }, 1000); // Längere Verzögerung für das Laden des PDFs
        
        // Dialog schließen nach erfolgreicher PDF-Erstellung
        onClose();
      }
      
      if (printWindow) {
        toast({
          title: "Druckdialog wird geöffnet",
          description: "Der Druckdialog wird automatisch im Browser geöffnet.",
        });
      } else {
        toast({
          title: "Drucken fehlgeschlagen",
          description: "Bitte aktiviere Pop-ups, damit der Druckdialog geöffnet werden kann.",
          variant: "destructive"
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
              <div id="receipt-for-pdf" ref={printRef} className="bg-white rounded-md shadow-sm" style={{ width: settings?.receiptWidth === '58mm' ? '58mm' : '80mm' }}>
                {/* Wenn eine Vorlage geladen wurde, diese verwenden */}
                {templateContent ? (
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: applyTemplateVariables(templateContent, {
                        businessName: settings?.businessName || "Handyshop Verwaltung",
                        businessAddress: `${settings?.streetAddress || ""}, ${settings?.zipCode || ""} ${settings?.city || ""}`,
                        businessPhone: settings?.phone || "",
                        businessEmail: settings?.email || "",
                        businessLogo: settings?.logoImage || "",
                        businessSlogan: settings?.companySlogan || "",
                        vatNumber: settings?.vatNumber || "",
                        websiteUrl: settings?.website || "",
                        
                        // Reparatur-Platzhalter
                        repairId: repair?.orderCode || `#${repair?.id}`,
                        orderCode: repair?.orderCode || `#${repair?.id}`,
                        currentDate: repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : "",
                        creationDate: repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : "",
                        completionDate: repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : "",
                        
                        // Kunden-Platzhalter
                        customerName: `${customer?.firstName || ""} ${customer?.lastName || ""}`,
                        customerPhone: customer?.phone || "",
                        customerEmail: customer?.email || "",
                        customerSignature: repair?.dropoffSignature || "",
                        secondSignature: repair?.pickupSignature || "",
                        
                        // Geräte-Platzhalter
                        deviceType: repair?.deviceType || "",
                        deviceBrand: repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : '',
                        deviceModel: repair?.model || "",
                        deviceIssue: repair?.issue ? repair.issue : '',
                        deviceImei: repair?.serialNumber || "",
                        
                        // Preis-Platzhalter
                        estimatedPrice: repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : "",
                        finalPrice: "",
                        
                        // Zusätzliche Platzhalter für Kompatibilität
                        logoUrl: settings?.logoImage || ""
                      })
                    }}
                  />
                ) : settings?.receiptWidth === '58mm' ? (
                  <BonReceipt58mm 
                    firmenlogo={settings?.logoImage || ""}
                    firmenname={settings?.businessName || "Handyshop Verwaltung"}
                    firmenadresse={settings?.streetAddress || ""}
                    firmenplz={settings?.zipCode || ""}
                    firmenort={settings?.city || ""}
                    firmentelefon={settings?.phone || ""}
                    auftragsnummer={repair?.orderCode || `#${repair?.id}`}
                    datum_dropoff={repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : ""}
                    kundenname={`${customer?.firstName || ""} ${customer?.lastName || ""}`}
                    kundentelefon={customer?.phone || ""}
                    kundenemail={customer?.email || ""}
                    hersteller={repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}
                    modell={repair?.model || ""}
                    problem={repair?.issue ? repair.issue : ''}
                    preis={repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : ""}
                    imei={repair?.serialNumber || ""}
                    signatur_dropoff={repair?.dropoffSignature || ""}
                    signatur_pickup={repair?.pickupSignature || ""}
                    datum_pickup={repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : ""}
                  />
                ) : (
                  <BonReceipt80mm 
                    firmenlogo={settings?.logoImage || ""}
                    firmenname={settings?.businessName || "Handyshop Verwaltung"}
                    firmenadresse={settings?.streetAddress || ""}
                    firmenplz={settings?.zipCode || ""}
                    firmenort={settings?.city || ""}
                    firmentelefon={settings?.phone || ""}
                    auftragsnummer={repair?.orderCode || `#${repair?.id}`}
                    datum_dropoff={repair ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : ""}
                    kundenname={`${customer?.firstName || ""} ${customer?.lastName || ""}`}
                    kundentelefon={customer?.phone || ""}
                    kundenemail={customer?.email || ""}
                    hersteller={repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''}
                    modell={repair?.model || ""}
                    problem={repair?.issue ? repair.issue.split(',').map(issue => issue.trim()).join('\n') : ''}
                    preis={repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : ""}
                    imei={repair?.serialNumber || ""}
                    signatur_dropoff={repair?.dropoffSignature || ""}
                    signatur_pickup={repair?.pickupSignature || ""}
                    datum_pickup={repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : ""}
                  />
                )}
              </div>
            </div>
            
            <DialogFooter className="flex justify-between mt-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  {isPreview ? "Schließen" : "Abbrechen"}
                </Button>
                {!isPreview && (
                  <Button 
                    variant="outline"
                    onClick={fetchPrintTemplate}
                    className="gap-1 text-xs"
                    disabled={isLoadingTemplate}
                    title="Aktuellste Druckvorlage laden"
                  >
                    {isLoadingTemplate ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Vorlage neu laden
                  </Button>
                )}
              </div>
              {!isPreview && (
                <Button 
                  onClick={handlePrint} 
                  className="gap-2"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Druckvorschau wird erstellt...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4" />
                      Drucken
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
