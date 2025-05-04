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
  
  // Druckt den Inhalt direkt
  const handlePrint = () => {
    window.print();
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
            {/* Druckinhalt */}
            <div id="a4-print-content" className="bg-white text-black p-4 rounded-md">
              {/* Briefkopf */}
              <div className="flex justify-between items-start mb-8 border-b pb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{businessSettings.businessName}</h1>
                  {businessSettings.companySlogan && (
                    <p className="text-sm italic">{businessSettings.companySlogan}</p>
                  )}
                  <div className="mt-2 text-sm">
                    <p>{businessSettings.street}, {businessSettings.zipCode} {businessSettings.city}</p>
                    <p>Tel: {businessSettings.phone}</p>
                    <p>E-Mail: {businessSettings.email}</p>
                    {businessSettings.website && <p>Web: {businessSettings.website}</p>}
                  </div>
                </div>

                <div className="flex-1 text-right">
                  {businessSettings.logoUrl && (
                    <img 
                      src={businessSettings.logoUrl} 
                      alt="Firmenlogo" 
                      className="max-h-24 max-w-32 ml-auto mb-2"
                    />
                  )}
                  <p className="text-sm">
                    {businessSettings.vatNumber && (
                      <span className="block">USt-IdNr: {businessSettings.vatNumber}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Dokumententitel */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold border-b border-t py-2">Reparaturauftrag #{repair.orderCode}</h2>
              </div>

              {/* Kundeninformationen */}
              <div className="flex mb-6">
                <div className="flex-1">
                  <h3 className="font-bold mb-2">Kundeninformationen</h3>
                  <p>{customer.firstName} {customer.lastName}</p>
                  <p>{customer.street}</p>
                  <p>{customer.zipCode} {customer.city}</p>
                  <p>Tel: {customer.phone}</p>
                  <p>E-Mail: {customer.email}</p>
                </div>

                <div className="flex-1 text-right">
                  <p><span className="font-semibold">Auftragsnummer:</span> {repair.orderCode}</p>
                  <p><span className="font-semibold">Datum:</span> {formatDate(repair.createdAt)}</p>
                  <p><span className="font-semibold">Status:</span> {repair.status}</p>
                </div>
              </div>

              {/* Geräteinformationen */}
              <div className="mb-6">
                <h3 className="font-bold mb-2">Geräteinformationen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-semibold">Geräteart:</span> {repair.deviceType}</p>
                    <p><span className="font-semibold">Hersteller:</span> {repair.manufacturer}</p>
                    <p><span className="font-semibold">Modell:</span> {repair.model}</p>
                  </div>
                  <div>
                    <p><span className="font-semibold">IMEI/Seriennummer:</span> {repair.serialNumber || 'Nicht angegeben'}</p>
                    <p><span className="font-semibold">Zustand:</span> {repair.deviceCondition || 'Nicht angegeben'}</p>
                    <p><span className="font-semibold">Passcode:</span> {repair.passcode || 'Nicht angegeben'}</p>
                  </div>
                </div>
              </div>

              {/* Reparaturdetails */}
              <div className="mb-6">
                <h3 className="font-bold mb-2">Reparaturdetails</h3>
                <p><span className="font-semibold">Fehlerbeschreibung:</span></p>
                <p className="border p-2 rounded-md min-h-[40px]">{repair.issue || 'Keine Fehlerbeschreibung angegeben'}</p>
                
                {repair.customerNotes && (
                  <>
                    <p className="mt-2"><span className="font-semibold">Kundennotizen:</span></p>
                    <p className="border p-2 rounded-md min-h-[40px]">{repair.customerNotes}</p>
                  </>
                )}
                
                {repair.internalNotes && (
                  <>
                    <p className="mt-2"><span className="font-semibold">Interne Notizen:</span></p>
                    <p className="border p-2 rounded-md min-h-[40px]">{repair.internalNotes}</p>
                  </>
                )}
              </div>

              {/* Kosten */}
              <div className="mb-6">
                <h3 className="font-bold mb-2">Kostenübersicht</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">Beschreibung</th>
                        <th className="p-2 text-right">Preis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-2">{repair.repairDescription || 'Reparaturleistung'}</td>
                        <td className="p-2 text-right">{repair.price?.toFixed(2).replace('.', ',')} €</td>
                      </tr>
                      {repair.sparePartsCost > 0 && (
                        <tr className="border-t">
                          <td className="p-2">Ersatzteile</td>
                          <td className="p-2 text-right">{repair.sparePartsCost.toFixed(2).replace('.', ',')} €</td>
                        </tr>
                      )}
                      <tr className="border-t bg-gray-50 font-bold">
                        <td className="p-2">Gesamtbetrag</td>
                        <td className="p-2 text-right">
                          {((repair.price || 0) + (repair.sparePartsCost || 0)).toFixed(2).replace('.', ',')} €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm mt-1">Alle Preise inkl. gesetzl. MwSt.</p>
              </div>

              {/* Unterschriften */}
              <div className="mb-6">
                <h3 className="font-bold mb-2">Unterschriften</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Abgabe-Unterschrift */}
                  <div className="border rounded-md p-2">
                    <h4 className="font-semibold mb-1">Abgabe des Geräts</h4>
                    {repair.dropoffSignature ? (
                      <div className="mb-2">
                        <img 
                          src={repair.dropoffSignature} 
                          alt="Abgabe-Unterschrift" 
                          className="max-h-16 border-b border-gray-300 mb-1 pb-1"
                        />
                        <p className="text-xs">
                          Unterschrieben von {customer.firstName} {customer.lastName} am {formatDate(repair.dropoffSignatureDate || repair.createdAt)} um {formatTime(repair.dropoffSignatureDate || repair.createdAt)}
                        </p>
                        <p className="text-xs mt-1">
                          Mit der Unterschrift bestätige ich die Abgabe des Geräts und akzeptiere die AGB.
                        </p>
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center border-b">
                        <p className="text-gray-400">Keine Unterschrift vorhanden</p>
                      </div>
                    )}
                  </div>

                  {/* Abholungs-Unterschrift */}
                  <div className="border rounded-md p-2">
                    <h4 className="font-semibold mb-1">Abholung des Geräts</h4>
                    {repair.signature ? (
                      <div className="mb-2">
                        <img 
                          src={repair.signature} 
                          alt="Abholungs-Unterschrift" 
                          className="max-h-16 border-b border-gray-300 mb-1 pb-1"
                        />
                        <p className="text-xs">
                          Unterschrieben von {customer.firstName} {customer.lastName} am {formatDate(repair.signatureDate || repair.updatedAt)} um {formatTime(repair.signatureDate || repair.updatedAt)}
                        </p>
                        <p className="text-xs mt-1">
                          Mit der Unterschrift bestätige ich den Erhalt des reparierten Geräts und die ordnungsgemäße Durchführung der Reparatur.
                        </p>
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center border-b">
                        <p className="text-gray-400">Keine Unterschrift vorhanden</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fußzeile */}
              <div className="text-xs text-center mt-8 border-t pt-2">
                <p>&copy; {new Date().getFullYear()} {businessSettings.businessName} - Alle Rechte vorbehalten</p>
                <p className="mt-1">Dieses Dokument wurde elektronisch erstellt und ist auch ohne Unterschrift gültig.</p>
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
                  Drucken
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
