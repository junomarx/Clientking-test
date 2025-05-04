import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PrintRepairA4DialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairA4Dialog({ open, onClose, repairId }: PrintRepairA4DialogProps) {
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  
  // Daten für die Reparatur laden
  const { data: repair, isLoading, error } = useQuery({
    queryKey: ["/api/repairs", repairId],
    queryFn: async () => {
      if (!repairId) return null;
      const response = await fetch(`/api/repairs/${repairId}`);
      if (!response.ok) throw new Error('Reparaturdaten konnten nicht geladen werden');
      return response.json();
    },
    enabled: open && repairId !== null,
  });
  
  // Daten für den Kunden laden
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ["/api/customers", repair?.customerId],
    queryFn: async () => {
      if (!repair?.customerId) return null;
      const response = await fetch(`/api/customers/${repair.customerId}`);
      if (!response.ok) throw new Error('Kundendaten konnten nicht geladen werden');
      return response.json();
    },
    enabled: open && repair?.customerId !== undefined,
  });
  
  // Geschäftsdaten laden
  const { data: businessSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/business-settings"],
    queryFn: async () => {
      const response = await fetch('/api/business-settings');
      if (!response.ok) throw new Error('Geschäftsdaten konnten nicht geladen werden');
      return response.json();
    },
    enabled: open,
  });
  
  // Zurücksetzen beim Öffnen
  useEffect(() => {
    if (open) {
      setPrintReady(false);
      setIsGeneratingPdf(false);
    }
  }, [open]);
  
  // Generiert ein PDF zum Herunterladen
  const generatePDF = async () => {
    if (!document.getElementById('a4-print-content')) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const content = document.getElementById('a4-print-content');
      if (!content) throw new Error('Druckinhalt konnte nicht gefunden werden');
      
      const canvas = await html2canvas(content, {
        scale: 2, // Höhere Qualität
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // A4 Format: 210 x 297 mm
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Bildgröße berechnen, um im A4-Format zu passen
      const imgWidth = 210; // A4 Breite in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // PDF speichern mit aussagekräftigem Dateinamen
      const orderCode = repair?.orderCode || repairId;
      const customerName = customer ? `${customer.lastName}_${customer.firstName}` : 'Kunde';
      const fileName = `Reparaturauftrag_${orderCode}_${customerName}.pdf`;
      
      pdf.save(fileName);
      
      toast({
        title: "PDF erstellt",
        description: "Das PDF wurde erfolgreich erstellt und heruntergeladen.",
      });
    } catch (err) {
      console.error('Fehler beim Generieren des PDFs:', err);
      toast({
        title: "Fehler",
        description: "Das PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  // Einfachste Variante: Ein zusätzliches PDF-Download-Fenster anzeigen
  const handlePrint = async () => {
    if (!document.getElementById('a4-print-content')) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const content = document.getElementById('a4-print-content');
      if (!content) throw new Error('Druckinhalt konnte nicht gefunden werden');
      
      const canvas = await html2canvas(content, {
        scale: 2, // Höhere Qualität
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // A4 Format: 210 x 297 mm
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Bildgröße berechnen, um im A4-Format zu passen
      const imgWidth = 210; // A4 Breite in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Öffne das PDF in einem neuen Tab und starte den Druckdialog automatisch
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
      console.error('Fehler beim Vorbereiten des PDFs:', err);
      toast({
        title: "Fehler",
        description: "Das PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  // Formatiert das Datum schön
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd. MMMM yyyy', { locale: de });
    } catch (e) {
      return dateString || 'k.A.';
    }
  };
  
  // Formatiert die Uhrzeit
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: de }) + ' Uhr';
    } catch (e) {
      return 'k.A.';
    }
  };
  
  // Setzt das Dokument auf "druckbereit", wenn alle Daten geladen sind
  useEffect(() => {
    if (repair && customer && businessSettings && !isLoading && !isLoadingCustomer && !isLoadingSettings) {
      setPrintReady(true);
    }
  }, [repair, customer, businessSettings, isLoading, isLoadingCustomer, isLoadingSettings]);
  
  // Zeigt eine Lade-Animation, wenn die Daten noch nicht bereit sind
  if (open && (!printReady || isLoading || isLoadingCustomer || isLoadingSettings)) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Lade Daten...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Zeigt eine Fehlermeldung, wenn ein Fehler aufgetreten ist
  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Fehler</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p>Die Reparaturdaten konnten nicht geladen werden.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Zeigt den Druckinhalt an, wenn die Daten geladen wurden
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto print:shadow-none print:border-none print:p-0">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-xl font-semibold">DIN A4 Reparaturauftrag #{repairId}</DialogTitle>
        </DialogHeader>
        
        {printReady && repair && customer && businessSettings && (
          <>
            {/* Druckinhalt - Neue DIN A4 Vorlage */}
            <div id="a4-print-content" className="bg-white text-black p-4 rounded-md">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body {
                    padding: 0;
                  }
                  @page {
                    size: A4;
                    margin: 2cm;
                  }
                }
              `}} />
              
              {/* Header mit Logo und Firmendaten */}
              <div className="flex justify-between items-start mb-10">
                <div className="w-[200px] border border-dashed border-gray-300 p-3 text-center h-[60px] flex items-center justify-center">
                  {businessSettings.logoImage ? (
                    <img 
                      src={businessSettings.logoImage} 
                      alt={businessSettings.businessName}
                      className="max-h-[60px] max-w-[180px] object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 italic">Logo wird hier angezeigt</span>
                  )}
                </div>
                
                <div className="text-right text-sm text-gray-600">
                  <p className="text-base font-bold text-gray-800 mb-1">{businessSettings.businessName}</p>
                  <p>{businessSettings.streetAddress || 'Amerlingstraße 19'}<br />
                  {businessSettings.zipCode || '1060'} {businessSettings.city || 'Wien'}<br />
                  {businessSettings.phone || '+4314103511'}<br />
                  {businessSettings.email || 'office@macandphonedoc.at'}</p>
                </div>
              </div>

              {/* Kundeninformationen */}
              <div className="mb-8">
                <div className="text-sm mb-2 font-bold">Kundeninformationen</div>
                <p className="text-base font-bold">{customer.firstName} {customer.lastName}</p>
                <p>{customer.street || ''}</p>
                <p>{customer.zipCode || ''} {customer.city || ''}</p>
              </div>
              
              {/* Dokumententitel und Auftragsnummer */}
              <div className="text-center mb-10">
                <h1 className="text-2xl font-bold mb-2">Reparaturauftrag</h1>
                <div className="text-lg">{repair.orderCode}</div>
              </div>
              
              {/* Gerätedaten & Reparaturdetails Box */}
              <div className="border border-gray-300 rounded-lg bg-gray-50 p-5 mb-8 flex gap-10">
                <div className="flex-1">
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Hersteller</div>
                    <div className="text-sm font-bold">{repair.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : repair.manufacturer}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Modell</div>
                    <div className="text-sm font-bold">{repair.model}</div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Schaden / Fehler</div>
                    <div className="text-sm font-bold">
                      {repair.issue ? 
                        (() => {
                          const issues = repair.issue.split(',');
                          return issues.map((issue: string, index: number) => (
                            <div key={index}>{issue.trim()}</div>
                          ));
                        })() : 'Keine Angabe'}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Kosten</div>
                    <div className="text-sm font-bold">
                      {repair.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : 'Auf Anfrage'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reparaturbedingungen */}
              <div className="border border-gray-300 rounded-lg bg-gray-50 p-5 mb-8">
                <div className="text-sm font-bold mb-3">Reparaturbedingungen</div>
                <p className="text-sm mb-2"><strong>1.</strong> Die Reparatur erfolgt nach bestem Wissen und mit geprüften Ersatzteilen. Originalteile können nicht in jedem Fall garantiert werden.</p>
                <p className="text-sm mb-2"><strong>2.</strong> Für etwaige Datenverluste wird keine Haftung übernommen. Der Kunde ist verpflichtet, vor Abgabe des Geräts eine vollständige Datensicherung vorzunehmen.</p>
                <p className="text-sm mb-2"><strong>3.</strong> Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die ausgeführten Arbeiten und eingesetzten Komponenten.</p>
                <p className="text-sm mb-2"><strong>4.</strong> Wird ein Kostenvoranschlag abgelehnt oder ist eine Reparatur nicht möglich, kann eine Überprüfungspauschale berechnet werden.</p>
                <p className="text-sm mb-2"><strong>5.</strong> Nicht abgeholte Geräte können nach 60 Tagen kostenpflichtig eingelagert oder entsorgt werden.</p>
                <p className="text-sm mb-2"><strong>6.</strong> Mit der Unterschrift bestätigt der Kunde die Beauftragung der Reparatur sowie die Anerkennung dieser Bedingungen.</p>
              </div>
              
              {/* Unterschriftsbereich mit Datum */}
              <div className="flex mt-16 gap-10">
                <div className="flex-1 text-center">
                  <p className="font-bold mb-2">Reparaturauftrag erteilt</p>
                  {repair.dropoffSignature ? (
                    <>
                      <div className="h-[40px] flex items-center justify-center">
                        <img 
                          src={repair.dropoffSignature} 
                          alt="Unterschrift bei Abgabe" 
                          className="max-h-[40px] object-contain"
                        />
                      </div>
                      <div className="border-t border-gray-900 mt-1"></div>
                      <div className="text-sm mt-1">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {repair.dropoffSignedAt && formatDate(repair.dropoffSignedAt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-[40px] flex items-center justify-center text-gray-400 text-sm">
                        <span>Keine Unterschrift vorhanden</span>
                      </div>
                      <div className="border-t border-gray-900 mt-1"></div>
                      <div className="text-sm mt-1">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {formatDate(repair.createdAt)}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex-1 text-center">
                  <p className="font-bold mb-2">Gerät abgeholt</p>
                  {repair.pickupSignature ? (
                    <>
                      <div className="h-[40px] flex items-center justify-center">
                        <img 
                          src={repair.pickupSignature} 
                          alt="Unterschrift bei Abholung" 
                          className="max-h-[40px] object-contain"
                        />
                      </div>
                      <div className="border-t border-gray-900 mt-1"></div>
                      <div className="text-sm mt-1">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {repair.pickupSignedAt && formatDate(repair.pickupSignedAt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-[40px] flex items-center justify-center text-gray-400 text-sm">
                        <span>Keine Unterschrift vorhanden</span>
                      </div>
                      <div className="border-t border-gray-900 mt-1"></div>
                      <div className="text-sm mt-1">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-gray-600 mt-1"></div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Aktionsbuttons */}
            <div className="flex justify-between items-center mt-4 print:hidden">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Abbrechen
              </Button>
              
              <div className="flex space-x-2">
                <Button
                  onClick={generatePDF}
                  disabled={isGeneratingPdf}
                  variant="outline"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      PDF wird erstellt...
                    </>
                  ) : (
                    <>PDF herunterladen</>
                  )}
                </Button>
                
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  PDF erstellen & drucken
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
