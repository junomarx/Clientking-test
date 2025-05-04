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

interface PrintRepairDialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairDialog({ open, onClose, repairId }: PrintRepairDialogProps) {
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

  // Funktion zum Erstellen eines PDFs für den Kassenbon
  const handlePrint = async () => {
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
              <div ref={printRef} className="bg-white p-6 rounded-md shadow-sm" style={{width: settings?.receiptWidth === '58mm' ? '58mm' : '80mm'}}>
                {/* Logo */}
                <div className="logo">
                  {businessSettings?.logoImage && (
                    <img 
                      src={businessSettings.logoImage} 
                      alt={businessSettings.businessName || "Firmenlogo"}
                      className="logo-img"
                    />
                  )}
                </div>

                {/* Firmeninfo */}
                <div className="company">
                  <strong>{businessSettings?.businessName || "Handyshop Verwaltung"}</strong><br />
                  {businessSettings?.streetAddress}, {businessSettings?.zipCode} {businessSettings?.city}<br />
                  {businessSettings?.phone}
                </div>

                {/* Abholschein + Auftragsnummer */}
                <div className="top-info">
                  <div className="headline">Abholschein</div>
                  <div className="auftragsnummer">{repair?.orderCode || `#${repair?.id}`}</div>
                  <div>{repair && format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}</div>
                </div>

                {/* Kunde */}
                <div className="section">
                  <div className="kundenname">{customer?.firstName} {customer?.lastName}</div>
                  <div className="field">{customer?.phone}</div>
                  <div className="field">{customer?.email}</div>
                </div>

                {/* Gerät */}
                <div className="section">
                  <div className="geraetinfo">{repair?.brand ? repair.brand.charAt(0).toUpperCase() + repair.brand.slice(1) : ''} {repair?.model}</div>

                  <div className="schaden-title">Schaden/Fehler</div>
                  <div className="field">
                    {repair?.issue ? (
                      repair.issue.split(',').map((issue, index) => (
                        <div key={index}>{issue.trim()}</div>
                      ))
                    ) : 'Keine Angaben'}
                  </div>

                  {repair?.estimatedCost && (
                    <div>
                      <div className="preis-label">Preis</div>
                      <div className="field">{repair.estimatedCost.replace('.', ',')} €</div>
                    </div>
                  )}
                </div>

                {/* Reparaturbedingungen */}
                <div className="section">
                  <div className="terms-box">
                    <div className="terms-title">{settings?.receiptWidth === '58mm' ? 'AGB Auszug' : 'Reparaturbedingungen'}</div>
                    {settings?.receiptWidth === '58mm' ? (
                      /* Kürzere Version für 58mm Bon */
                      <div>
                        1. Für Datenverlust keine Haftung.<br />
                        2. Gewährleistung 6 Monate.<br />
                        3. Nicht abgeholte Geräte: Entsorgung nach 60 Tagen möglich.
                      </div>
                    ) : (
                      /* Vollständige Version für breiteren Bon */
                      <div>
                        1. Für Datenverlust wird keine Haftung übernommen. Der Kunde ist für Datensicherung selbst verantwortlich.<br /><br />
                        2. Die Reparatur erfolgt nach bestem Wissen mit geeigneten Ersatzteilen. Originalteile können nicht garantiert werden.<br /><br />
                        3. Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die Reparaturleistung.<br /><br />
                        4. Testzugriffe auf das Gerät können notwendig sein.<br /><br />
                        5. Geräte müssen innerhalb von 60 Tagen abgeholt werden. Danach kann das Gerät kostenpflichtig eingelagert oder entsorgt werden.<br /><br />
                        6. Mit Ihrer Unterschrift stimmen Sie diesen Bedingungen ausdrücklich zu.
                      </div>
                    )}
                  </div>
                </div>

                {/* Unterschrift Abgabe */}
                {repair?.dropoffSignature && (
                  <div className="signature-box">
                    <div className="signature-title">Reparaturauftrag erteilt</div>
                    <div className="signature-placeholder">
                      <img 
                        src={repair.dropoffSignature} 
                        alt="Unterschrift bei Abgabe" 
                        style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
                      />
                    </div>
                    <div className="signature-line"></div>
                    {customer?.firstName} {customer?.lastName}<br />
                    {repair.dropoffSignedAt && format(new Date(repair.dropoffSignedAt), 'dd.MM.yyyy', { locale: de })}
                  </div>
                )}

                {/* Unterschrift Abholung */}
                {repair?.pickupSignature && (
                  <div className="signature-box">
                    <div className="signature-title">Gerät abgeholt</div>
                    <div className="signature-placeholder">
                      <img 
                        src={repair.pickupSignature} 
                        alt="Unterschrift bei Abholung" 
                        style={{maxHeight: '20mm', margin: '0 auto', display: 'block'}}
                      />
                    </div>
                    <div className="signature-line"></div>
                    {customer?.firstName} {customer?.lastName}<br />
                    {repair.pickupSignedAt && format(new Date(repair.pickupSignedAt), 'dd.MM.yyyy', { locale: de })}
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex justify-between mt-4">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
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
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
