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
import { createVectorRepairPdf } from './VectorRepairPdfHelper';
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
  const [generatedPdf, setGeneratedPdf] = useState<any | null>(null);

  // Daten für die Reparatur laden
  const { data: repair, isLoading, error } = useQuery<any>({
    queryKey: [`/api/repairs/${repairId}`],
    enabled: !!repairId && open,
  });

  // Kundendaten laden
  const { data: customer } = useQuery<any>({
    queryKey: [`/api/customers/${repair?.customerId}`],
    enabled: !!repair?.customerId,
  });

  // Geschäftseinstellungen laden
  const { data: businessSettings } = useQuery<any>({
    queryKey: ["/api/business-settings"],
    enabled: open,
  });

  // PDF mit Vector-Technologie erstellen - DIREKT HERUNTERLADEN
  const handleCreatePdf = async () => {
    if (!repair || !customer || !businessSettings) {
      toast({
        title: "Fehler",
        description: "Nicht alle Daten sind verfügbar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      const pdf = await createVectorRepairPdf({
        repair,
        customer,
        businessSettings,
        logoUrl: businessSettings.logoImage
      });
      
      // PDF DIREKT herunterladen ohne Dialog
      const filename = repair?.orderCode || `Reparaturauftrag_${repairId}`;
      pdf.save(`${filename}.pdf`);
      
      toast({
        title: "Vector-PDF erfolgreich erstellt!",
        description: "Das hochqualitative PDF wurde heruntergeladen.",
      });
      
      onClose();
      
    } catch (err) {
      console.error('Fehler beim Erstellen des Vector-PDFs:', err);
      toast({
        title: "Fehler",
        description: "Das Vector-PDF konnte nicht erstellt werden.",
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

  // E-Mail-Versand mit Vector PDF
  const handleSendEmail = async () => {
    if (!customer?.email) {
      toast({
        title: "E-Mail-Fehler",
        description: "Keine E-Mail-Adresse für diesen Kunden hinterlegt.",
        variant: "destructive",
      });
      return;
    }

    if (!generatedPdf) {
      toast({
        title: "E-Mail-Fehler", 
        description: "Bitte erstellen Sie zuerst ein PDF.",
        variant: "destructive",
      });
      return;
    }

    // Sofort Feedback geben
    toast({
      title: "E-Mail wird gesendet...",
      description: "Das Vector-PDF wird gerade an den Kunden gesendet.",
    });
    
    try {
      // PDF als Base64 für E-Mail-Versand
      const pdfBase64 = generatedPdf.output('datauristring').split(',')[1];
      
      const response = await fetch('/api/send-repair-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          repairId: repair.id,
          recipient: customer.email,
          pdfBase64,
          filename: `${repair.orderCode || `Reparaturauftrag_${repairId}`}.pdf`
        })
      });

      if (!response.ok) {
        throw new Error(`Server-Fehler: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "E-Mail erfolgreich gesendet!",
          description: `Das Reparaturauftrag-PDF wurde erfolgreich an ${customer.email} gesendet.`,
        });
      } else {
        throw new Error(result.message || 'E-Mail konnte nicht gesendet werden');
      }
      
    } catch (err: any) {
      console.error('Fehler beim E-Mail-Versand:', err);
      toast({
        title: "E-Mail-Fehler",
        description: `Fehler beim E-Mail-Versand: ${err.message}`,
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
            {/* Vorschau-Bereich (bleibt für Benutzer-Preview) */}
            <div className="bg-white text-black p-8 sm:p-10 md:p-12 rounded-md">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body {
                    padding: 0;
                  }
                  @page {
                    size: A4;
                    margin: 1cm;
                  }
                }
              `}} />
              
              {/* Header mit Logo und Firmendaten */}
              <div className="flex justify-between items-start mb-10">
                <div className="w-[200px] p-3 text-center h-[60px] flex items-center justify-center">
                  {businessSettings?.logoImage ? (
                    <img 
                      src={businessSettings.logoImage} 
                      alt={businessSettings.businessName}
                      className="max-h-[60px] max-w-[180px] object-contain"
                      onError={(e) => {
                        console.error('Fehler beim Laden des Logos in A4:', e);
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<span class="text-gray-400 italic">Logo konnte nicht geladen werden</span>';
                        }
                      }}
                      loading="eager"
                    />
                  ) : (
                    <span className="text-transparent">Logo nicht verfügbar</span>
                  )}
                </div>
                
                <div className="text-right text-sm text-gray-600">
                  <p className="text-base font-bold text-gray-800 mb-1">{businessSettings?.businessName || 'Handyshop Verwaltung'}</p>
                  <p>{businessSettings?.streetAddress || 'Amerlingstraße 19'}<br />
                  {businessSettings?.zipCode || '1060'} {businessSettings?.city || 'Wien'}<br />
                  {businessSettings?.phone || '+4314103511'}<br />
                  {businessSettings?.email || 'office@macandphonedoc.at'}</p>
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
                  <div className="text-sm font-bold mb-3">Gerätedaten</div>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Gerätetyp:</span> {repair.deviceType}</div>
                    <div><span className="font-medium">Marke:</span> {repair.brand}</div>
                    <div><span className="font-medium">Modell:</span> {repair.model}</div>
                    <div><span className="font-medium">Telefon:</span> {customer.phone || 'k.A.'}</div>
                    <div><span className="font-medium">E-Mail:</span> {customer.email || 'k.A.'}</div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-bold mb-3">Reparaturdetails</div>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Problem:</span> {repair.issue}</div>
                    <div><span className="font-medium">Status:</span> {repair.status}</div>
                    <div><span className="font-medium">Abgegeben am:</span> {formatDate(repair.createdAt)}</div>
                    {repair.estimatedCost && (
                      <div><span className="font-medium">Kostenvoranschlag:</span> €{repair.estimatedCost}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fehlerbeschreibung */}
              {repair.description && (
                <div className="mb-8">
                  <div className="text-sm font-bold mb-2">Fehlerbeschreibung</div>
                  <div className="border border-gray-300 rounded p-3 min-h-[80px] bg-white text-sm">
                    {repair.description}
                  </div>
                </div>
              )}

              {/* Reparaturbedingungen */}
              {businessSettings?.repairTerms && (
                <div className="mb-8">
                  <div className="text-sm font-bold mb-2">Reparaturbedingungen</div>
                  <div className="border border-gray-300 rounded p-3 min-h-[60px] bg-gray-50 text-xs leading-tight">
                    {businessSettings.repairTerms}
                  </div>
                  <div className="text-center mt-3 text-xs font-semibold">
                    Mit meiner Unterschrift bestätige ich, dass ich die Reparaturbedingungen gelesen und akzeptiert habe.
                  </div>
                </div>
              )}

              {/* Unterschriftenbereich */}
              <div className="border-t-2 border-gray-300 pt-8 mt-8">
                <div className="flex justify-between gap-16">
                  <div className="flex-1 text-center">
                    <p className="font-bold mb-4">Gerät abgegeben</p>
                    {repair.dropoffSignature ? (
                      <>
                        <div className="h-[60px] flex items-center justify-center mb-2">
                          <img 
                            src={repair.dropoffSignature} 
                            alt="Unterschrift bei Abgabe" 
                            className="max-h-[60px] object-contain"
                          />
                        </div>
                        <div className="border-t border-gray-900 mt-2"></div>
                        <div className="text-sm mt-2">{customer.firstName} {customer.lastName}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {repair.dropoffSignedAt && formatDate(repair.dropoffSignedAt)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-[60px] border-b border-gray-900 mb-2"></div>
                        <div className="text-sm mt-2">{customer.firstName} {customer.lastName}</div>
                        <div className="text-xs text-gray-600 mt-1">{formatDate(repair.createdAt)}</div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center">
                    <p className="font-bold mb-4">Gerät abgeholt</p>
                    {repair.pickupSignature ? (
                      <>
                        <div className="h-[60px] flex items-center justify-center mb-2">
                          <img 
                            src={repair.pickupSignature} 
                            alt="Unterschrift bei Abholung" 
                            className="max-h-[60px] object-contain"
                          />
                        </div>
                        <div className="border-t border-gray-900 mt-2"></div>
                        <div className="text-sm mt-2">{customer.firstName} {customer.lastName}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {repair.pickupSignedAt && formatDate(repair.pickupSignedAt)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-[60px] border-b border-gray-900 mb-2"></div>
                        <div className="text-sm mt-2">{customer.firstName} {customer.lastName}</div>
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
                    Vector-PDF wird erstellt...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Vector-PDF herunterladen
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