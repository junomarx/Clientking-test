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
  const loadPrintTemplate = async () => {
    setIsLoadingTemplate(true);
    try {
      const templateType = settings?.receiptWidth === '58mm' ? 'receipt_58mm' : 'receipt_80mm';
      const content = await fetchLatestPrintTemplate(templateType);
      if (content) {
        setTemplateContent(content);
      }
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
      loadPrintTemplate();
    }
  }, [open, settings?.receiptWidth]);

  // Lade Reparaturdaten direkt mit der userId aus dem localStorage
  const { data: repair, isLoading: isLoadingRepair } = useQuery<Repair>({
    queryKey: ['/api/repairs', repairId],
    queryFn: async () => {
      if (!repairId) return null;
      try {
        // Benutzer-ID aus localStorage holen für zusätzliche Authentifizierung
        const userId = localStorage.getItem('userId');
        
        // Verwende sowohl Credentials als auch den X-User-ID Header für robustere Authentifizierung
        const headers: Record<string, string> = {};
        // Nur in Development: X-User-ID Header hinzufügen
        if (userId && import.meta.env.DEV) {
          headers['X-User-ID'] = userId;
        }
        
        const response = await fetch(`/api/repairs/${repairId}`, {
          credentials: 'include',
          headers: headers
        });
        
        if (!response.ok) {
          console.error(`Fehler beim Laden der Reparatur ${repairId}: Status ${response.status}`);
          throw new Error("Reparaturauftrag konnte nicht geladen werden");
        }
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Reparaturdaten:", err);
        return null;
      }
    },
    enabled: !!repairId && open,
    // Deaktiviere Cache um sicherzustellen, dass wir immer frische Daten haben
    staleTime: 0,
  });

  // Lade Kundendaten wenn Reparatur geladen ist
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ['/api/customers', repair?.customerId],
    queryFn: async () => {
      if (!repair?.customerId) return null;
      try {
        // Benutzer-ID aus localStorage holen für zusätzliche Authentifizierung
        const userId = localStorage.getItem('userId');
        
        const headers: Record<string, string> = {};
        // Nur in Development: X-User-ID Header hinzufügen
        if (userId && import.meta.env.DEV) {
          headers['X-User-ID'] = userId;
        }
        
        const response = await fetch(`/api/customers/${repair.customerId}`, {
          credentials: 'include',
          headers: headers
        });
        
        if (!response.ok) {
          console.error(`Fehler beim Laden des Kunden ${repair.customerId}: Status ${response.status}`);
          throw new Error("Kundendaten konnten nicht geladen werden");
        }
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Kundendaten:", err);
        return null;
      }
    },
    enabled: !!repair?.customerId && open,
    staleTime: 0,
  });

  // Lade Unternehmenseinstellungen
  const { data: businessSettings, isLoading: isLoadingSettings } = useQuery<BusinessSettings | null>({
    queryKey: ['/api/business-settings'],
    queryFn: async () => {
      try {
        // Benutzer-ID aus localStorage holen für zusätzliche Authentifizierung
        const userId = localStorage.getItem('userId');
        
        const headers: Record<string, string> = {};
        // Nur in Development: X-User-ID Header hinzufügen
        if (userId && import.meta.env.DEV) {
          headers['X-User-ID'] = userId;
        }
        
        const response = await fetch('/api/business-settings', {
          credentials: 'include',
          headers: headers
        });
        
        if (!response.ok) {
          console.error(`Fehler beim Laden der Unternehmenseinstellungen: Status ${response.status}`);
          return null;
        }
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden der Unternehmenseinstellungen:", err);
        return null;
      }
    },
    enabled: open,
    staleTime: 0,
  });

  const isLoading = isLoadingRepair || isLoadingCustomer || isLoadingSettings;

  // Funktion zum direkten Drucken ohne PDF
  const handlePrint = async () => {
    // Bei Vorschau nicht drucken
    if (isPreview) return;
    
    if (!printRef.current) {
      console.error('Druckelement nicht gefunden');
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      // Erstelle ein Druckfenster mit dem Bon-Inhalt
      const fullContent = document.getElementById('receipt-for-pdf');
      if (!fullContent) {
        throw new Error('Receipt element not found');
      }
      
      // Erstelle ein neues Fenster für den Druck
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: "Drucken fehlgeschlagen",
          description: "Bitte aktiviere Pop-ups, damit der Druckdialog geöffnet werden kann.",
          variant: "destructive"
        });
        return;
      }
      
      // Schreibe den HTML-Inhalt ins neue Fenster
      const bonWidthMM = settings?.receiptWidth === '58mm' ? '58mm' : '80mm';
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Kassenbon</title>
          <style>
            @media print {
              body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Courier New', monospace;
                width: ${bonWidthMM};
              }
              @page { 
                size: ${bonWidthMM} auto; 
                margin: 0; 
              }
            }
            body {
              margin: 0;
              padding: 8px;
              font-family: 'Courier New', monospace;
              width: ${bonWidthMM};
              font-size: 9pt;
            }
            ${fullContent.querySelector('style')?.innerHTML || ''}
          </style>
        </head>
        <body>
          ${fullContent.innerHTML}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Warte kurz, dann öffne den Druckdialog
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Schließe das Druckfenster nach dem Drucken
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
      
      // Dialog schließen
      onClose();
      
      toast({
        title: "Druckdialog geöffnet",
        description: "Der Druckdialog wurde geöffnet.",
      });
      
    } catch (err) {
      console.error('Fehler beim Drucken:', err);
      toast({
        title: "Fehler",
        description: "Beim Drucken ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!open) return null;

  // Erstelle Template-Variablen für die Vorlage
  const templateVariables = {
    // Standard-Platzhalter
    businessName: businessSettings?.businessName || "Handyshop Verwaltung",
    businessAddress: `${businessSettings?.streetAddress || ""}, ${businessSettings?.zipCode || ""} ${businessSettings?.city || ""}`,
    businessPhone: businessSettings?.phone || "",
    businessEmail: businessSettings?.email || "",
    businessLogo: businessSettings?.logoImage || "",
    businessSlogan: businessSettings?.companySlogan || "",
    vatNumber: businessSettings?.vatNumber || "",
    websiteUrl: businessSettings?.website || "",
    
    // Reparatur-Platzhalter
    repairId: repair?.orderCode || `#${repair?.id}`,
    orderCode: repair?.orderCode || `#${repair?.id}`,
    currentDate: repair?.createdAt ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : "",
    creationDate: repair?.createdAt ? format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de }) : "",
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
    deviceImei: "", // IMEI ist derzeit kein Teil des Repair-Objekts
    
    // Preis-Platzhalter
    preis: repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : "",
    estimatedPrice: repair?.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : "",
    finalPrice: "", // finalPrice ist derzeit kein Teil des Repair-Objekts
    depositAmount: repair?.depositAmount ? `${repair.depositAmount.replace('.', ',')} €` : "",
    anzahlung: repair?.depositAmount ? `${repair.depositAmount.replace('.', ',')} €` : "",
    
    // Zusätzliche Platzhalter für Kompatibilität
    logoUrl: businessSettings?.logoImage || "",
    dropoffSignature: repair?.dropoffSignature || "",
    pickupSignature: repair?.pickupSignature || "",
    pickupDate: repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : ""
  };

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
                {templateContent ? (
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: applyTemplateVariables(templateContent, templateVariables)
                    }}
                  />
                ) : (
                  // Fallback auf die fest codierten Komponenten
                  settings?.receiptWidth === '58mm' ? (
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
                      anzahlung={repair?.depositAmount ? `${repair.depositAmount.replace('.', ',')} €` : undefined}
                      signatur_dropoff={repair?.dropoffSignature || undefined}
                      signatur_pickup={repair?.pickupSignature || undefined}
                      datum_pickup={repair?.pickupSignedAt ? format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de }) : undefined}
                    />
                  )
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
                    onClick={loadPrintTemplate}
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