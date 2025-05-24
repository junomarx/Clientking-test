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
import { Loader2, FileDown, Mail, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';

interface PrintRepairA4DialogProps {
  open: boolean;
  onClose: () => void;
  repairId: number | null;
}

export function PrintRepairA4Dialog({ open, onClose, repairId }: PrintRepairA4DialogProps) {
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);

  // Daten für die Reparatur laden
  const { data: repair, isLoading, error } = useQuery<any>({
    queryKey: ["/api/repairs", repairId],
    enabled: !!repairId && open,
  });

  // Kundendaten laden
  const { data: customer } = useQuery<any>({
    queryKey: ["/api/customers", repair?.customerId],
    enabled: !!repair?.customerId,
  });

  // Geschäftseinstellungen laden
  const { data: businessSettings } = useQuery<any>({
    queryKey: ["/api/business-settings"],
    enabled: open,
  });

  // PDF erstellen und Aktions-Dialog öffnen
  const handleCreatePdf = async () => {
    if (!document.getElementById('a4-print-content')) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const content = document.getElementById('a4-print-content');
      if (!content) throw new Error('Druckinhalt konnte nicht gefunden werden');
      
      const canvas = await html2canvas(content, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        height: content.scrollHeight,
        windowHeight: content.scrollHeight,
        onclone: (document, element) => {
          element.style.maxHeight = 'none';
          element.style.height = 'auto';
          element.style.overflow = 'visible';
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const margin = 10;
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      
      // PDF speichern und Aktions-Dialog öffnen
      setGeneratedPdf(pdf);
      setShowActionDialog(true);
      
    } catch (err) {
      console.error('Fehler beim Erstellen des PDFs:', err);
      toast({
        title: "Fehler",
        description: "Das PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // PDF herunterladen
  const handleDownloadPdf = () => {
    if (!generatedPdf) return;
    
    const filename = repair?.orderCode || `Reparaturauftrag_${repairId}`;
    generatedPdf.save(`${filename}.pdf`);
    
    toast({
      title: "PDF heruntergeladen",
      description: "Das Reparaturauftrag-PDF wurde erfolgreich heruntergeladen.",
    });
    
    setShowActionDialog(false);
    onClose();
  };

  // E-Mail-Versand mit optimierter PDF-Größe
  const handleSendEmail = async () => {
    if (!generatedPdf || !customer?.email) return;
    
    try {
      // Für E-Mail: PDF mit reduzierter Qualität neu erstellen
      const content = document.getElementById('a4-print-content');
      if (!content) throw new Error('Druckinhalt konnte nicht gefunden werden');
      
      const canvas = await html2canvas(content, {
        scale: 1, // Reduzierte Qualität für kleinere Dateigröße
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      // PDF mit JPEG-Komprimierung für E-Mail
      const imgData = canvas.toDataURL('image/jpeg', 0.7); // JPEG mit 70% Qualität
      const emailPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const margin = 10;
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      emailPdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      
      // PDF als Base64 für E-Mail-Versand
      const pdfBase64 = emailPdf.output('datauristring').split(',')[1];
      
      const response = await apiRequest('POST', '/api/send-repair-email', {
        repairId: repair.id,
        recipient: customer.email,
        pdfBase64,
        filename: `${repair.orderCode || `Reparaturauftrag_${repairId}`}.pdf`
      });

      if (response.ok) {
        toast({
          title: "E-Mail gesendet",
          description: `Das Reparaturauftrag-PDF wurde erfolgreich an ${customer.email} gesendet.`,
        });
      } else {
        throw new Error('E-Mail konnte nicht gesendet werden');
      }
      
    } catch (err) {
      console.error('Fehler beim E-Mail-Versand:', err);
      toast({
        title: "E-Mail-Fehler",
        description: "Die E-Mail konnte nicht gesendet werden.",
        variant: "destructive",
      });
    }
    
    setShowActionDialog(false);
    onClose();
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
    if (!open) return;
    
    const backupTimerId = setTimeout(() => {
      if (repair && customer) {
        setPrintReady(true);
      }
    }, 2000);

    if (repair && customer && businessSettings) {
      setPrintReady(true);
      clearTimeout(backupTimerId);
    }

    return () => clearTimeout(backupTimerId);
  }, [open, repair, customer, businessSettings]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Lade Reparaturdaten...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !repair || !customer) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="text-center p-8">
            <p className="text-red-600">Fehler beim Laden der Reparaturdaten.</p>
            <Button onClick={onClose} className="mt-4">Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Aktions-Dialog für PDF-Optionen
  if (showActionDialog && generatedPdf) {
    return (
      <Dialog open={showActionDialog} onOpenChange={() => setShowActionDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>PDF erstellt</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              Das PDF wurde erfolgreich erstellt. Was möchten Sie damit tun?
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleDownloadPdf}
                className="w-full"
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF herunterladen
              </Button>
              
              <Button 
                onClick={handleSendEmail}
                disabled={!customer?.email}
                className="w-full"
                variant="outline"
              >
                <Mail className="mr-2 h-4 w-4" />
                Per E-Mail senden
                {!customer?.email && (
                  <span className="ml-2 text-xs text-gray-500">(Keine E-Mail-Adresse)</span>
                )}
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowActionDialog(false);
                setGeneratedPdf(null);
              }}
            >
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle>A4 Reparaturauftrag drucken</DialogTitle>
        </DialogHeader>

        {printReady ? (
          <div className="space-y-4">
            {/* A4 Druckinhalt */}
            <div 
              id="a4-print-content" 
              className="bg-white p-8 border border-gray-200 rounded-lg mx-auto"
              style={{ 
                width: '210mm', 
                minHeight: '297mm',
                fontSize: '12px',
                lineHeight: '1.4',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {/* Header mit Logo und Geschäftsdaten */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-900">
                <div className="flex-1">
                  {businessSettings?.logoUrl && (
                    <img 
                      src={businessSettings.logoUrl} 
                      alt="Firmenlogo" 
                      className="mb-3"
                      style={{ maxHeight: '15mm', objectFit: 'contain' }}
                    />
                  )}
                  <div className="text-lg font-bold">{businessSettings?.businessName || 'Handyreparatur Service'}</div>
                  {businessSettings?.address && <div>{businessSettings.address}</div>}
                  {(businessSettings?.zipCode || businessSettings?.city) && (
                    <div>{businessSettings?.zipCode} {businessSettings?.city}</div>
                  )}
                  {businessSettings?.phone && <div>Tel: {businessSettings.phone}</div>}
                  {businessSettings?.email && <div>E-Mail: {businessSettings.email}</div>}
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold mb-2">REPARATURAUFTRAG</div>
                  <div className="text-lg font-semibold">Nr: {repair.orderCode}</div>
                  <div className="text-sm">Datum: {formatDate(repair.createdAt)}</div>
                </div>
              </div>

              {/* Kundendaten */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-2">Kundendaten</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Name:</strong> {customer.firstName} {customer.lastName}</div>
                    <div><strong>Telefon:</strong> {customer.phone || 'k.A.'}</div>
                    <div><strong>E-Mail:</strong> {customer.email || 'k.A.'}</div>
                  </div>
                  <div>
                    {customer.address && <div><strong>Adresse:</strong> {customer.address}</div>}
                    {(customer.zipCode || customer.city) && (
                      <div><strong>Ort:</strong> {customer.zipCode} {customer.city}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Geräteinformationen */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-2">Geräteinformationen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div><strong>Gerätetyp:</strong> {repair.deviceType}</div>
                    <div><strong>Marke:</strong> {repair.brand}</div>
                    <div><strong>Modell:</strong> {repair.model}</div>
                  </div>
                  <div>
                    <div><strong>Problem:</strong> {repair.issue}</div>
                    <div><strong>Status:</strong> {repair.status}</div>
                    {repair.estimatedCost && (
                      <div><strong>Kostenvoranschlag:</strong> {repair.estimatedCost}€</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Beschreibung */}
              {repair.description && (
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-2">Problembeschreibung</h3>
                  <div className="border border-gray-300 p-3 min-h-[60px] whitespace-pre-wrap">
                    {repair.description}
                  </div>
                </div>
              )}

              {/* Notizen */}
              {repair.notes && (
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-2">Interne Notizen</h3>
                  <div className="border border-gray-300 p-3 min-h-[60px] whitespace-pre-wrap">
                    {repair.notes}
                  </div>
                </div>
              )}

              {/* Unterschriftenbereich */}
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-4">Unterschriften</h3>
                <div className="flex justify-between gap-8">
                  <div className="flex-1 text-center">
                    <p className="font-bold mb-2">Gerät abgegeben</p>
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
            </div>
            
            {/* Aktionsbuttons */}
            <div className="flex justify-between items-center mt-4 print:hidden">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Abbrechen
              </Button>
              
              <Button
                onClick={handleCreatePdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    PDF wird erstellt...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF erstellen
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Bereite Dokument vor...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}