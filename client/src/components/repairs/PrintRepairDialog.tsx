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

  // Funktion zum direkten Drucken über Browser-Druckfenster
  const handlePrint = async () => {
    // Bei Vorschau nicht drucken
    if (isPreview) return;
    
    if (!printRef.current) {
      console.error('Druckelement nicht gefunden');
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      // Erstelle ein neues Fenster für den Druck
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Pop-up-Blocker verhindert das Öffnen des Druckfensters');
      }
      
      // Hole den Inhalt des Bons
      const receiptContent = document.getElementById('receipt-for-pdf');
      if (!receiptContent) {
        throw new Error('Bon-Inhalt nicht gefunden');
      }
      
      // Bestimme die Bon-Breite
      const bonWidthMM = settings?.receiptWidth === '58mm' ? 58 : 80;
      
      // Erstelle HTML für das Druckfenster mit optimierten Druckstilen
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Kassenbon</title>
          <style>
            @page {
              size: ${bonWidthMM}mm auto;
              margin: 2mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 9pt;
              line-height: 1.2;
              width: ${bonWidthMM}mm;
              margin: 0;
              padding: 0;
              background: white;
            }
            
            .receipt-content {
              width: 100%;
              padding: 2mm;
            }
            
            /* Verstecke alle anderen Elemente beim Drucken */
            @media print {
              body * {
                visibility: hidden;
              }
              
              .receipt-content, .receipt-content * {
                visibility: visible;
              }
              
              .receipt-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-content">
            ${receiptContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      // Schreibe HTML in das neue Fenster
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      toast({
        title: "Druckfenster geöffnet",
        description: "Das Druckfenster wird automatisch geöffnet.",
      });
      
      // Dialog schließen
      onClose();
      
    } catch (error) {
      console.error('Fehler beim Drucken:', error);
      toast({
        title: "Druckfehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler beim Drucken",
        variant: "destructive",
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
