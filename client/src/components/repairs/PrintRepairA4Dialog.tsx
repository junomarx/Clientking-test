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
import { Loader2, Printer, Mail, FileDown, X } from 'lucide-react';
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
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Daten für die Reparatur laden - gleiche Struktur wie in anderen Komponenten
  const { data: repair, isLoading, error } = useQuery<any>({
    queryKey: [`/api/repairs/${repairId}`],
    enabled: !!repairId && open,
  });

  // Daten für den Kunden laden
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<any>({
    queryKey: [`/api/customers/${repair?.customerId}`],
    enabled: !!repair?.customerId && open,
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
      setShowActionDialog(false);
      setGeneratedPdf(null);
      setPdfBase64('');
    }
  }, [open]);
  
  // Generiert das PDF und zeigt Aktionsoptionen
  const generatePDF = async () => {
    if (!document.getElementById('a4-print-content')) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const content = document.getElementById('a4-print-content');
      if (!content) throw new Error('Druckinhalt konnte nicht gefunden werden');
      
      // Optimierte Canvas-Einstellungen
      const canvas = await html2canvas(content, {
        scale: 1.2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 10000,
        removeContainer: true,
      });
      
      // JPEG mit optimierter Komprimierung
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // A4 Maße
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - (2 * margin);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Immer auf eine A4-Seite skalieren
      const maxHeight = pageHeight - (2 * margin);
      let finalImgWidth = imgWidth;
      let finalImgHeight = imgHeight;
      
      if (imgHeight > maxHeight) {
        finalImgHeight = maxHeight;
        finalImgWidth = (canvas.width * maxHeight) / canvas.height;
        
        if (finalImgWidth > imgWidth) {
          finalImgWidth = imgWidth;
          finalImgHeight = (canvas.height * imgWidth) / canvas.width;
        }
      }
      
      // Bild zentriert auf der Seite platzieren
      const xOffset = margin + (imgWidth - finalImgWidth) / 2;
      const yOffset = margin;
      
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalImgWidth, finalImgHeight);
      
      // PDF und Base64 speichern
      setGeneratedPdf(pdf);
      setPdfBase64(pdf.output('datauristring').split(',')[1]);
      setShowActionDialog(true);
      
      toast({
        title: "PDF erstellt",
        description: "Das PDF wurde erfolgreich erstellt. Wählen Sie nun eine Aktion.",
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

  // PDF herunterladen (bereits generiert)
  const handleDownloadPdf = () => {
    if (!generatedPdf) return;
    
    const orderCode = repair?.orderCode || repairId;
    const customerName = customer ? `${customer.lastName}_${customer.firstName}` : 'Kunde';
    const fileName = `Reparaturauftrag_${orderCode}_${customerName}.pdf`;
    
    generatedPdf.save(fileName);
    
    toast({
      title: "PDF heruntergeladen",
      description: "Das PDF wurde erfolgreich heruntergeladen.",
    });
    
    setShowActionDialog(false);
  };

  // PDF per E-Mail senden (bereits generiert)
  const handleSendPdfEmail = async () => {
    if (!customer?.email) {
      toast({
        title: "Fehler",
        description: "Keine E-Mail-Adresse für den Kunden hinterlegt.",
        variant: "destructive",
      });
      return;
    }
    
    if (!pdfBase64) {
      toast({
        title: "Fehler",
        description: "PDF wurde noch nicht generiert.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSendingEmail(true);
    
    try {
      const orderCode = repair?.orderCode || repairId;
      const customerName = customer ? `${customer.lastName}_${customer.firstName}` : 'Kunde';
      const filename = `Reparaturauftrag_${orderCode}_${customerName}.pdf`;
      
      const response = await fetch('/api/send-repair-pdf-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repairId,
          customerEmail: customer.email,
          customerName,
          pdfData: pdfBase64,
          orderCode,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "E-Mail gesendet",
          description: `Das PDF wurde erfolgreich an ${customer.email} gesendet.`,
        });
        setShowActionDialog(false);
        onClose(); // Dialog schließen nach erfolgreichem Versand
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'E-Mail konnte nicht gesendet werden');
      }
    } catch (err) {
      console.error('Fehler beim Senden der E-Mail:', err);
      toast({
        title: "Fehler",
        description: "Die E-Mail konnte nicht gesendet werden.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  // Hochqualitatives PDF-Generierung ohne Canvas für bessere Druckqualität
  const handlePrint = async () => {
    if (!repair || !customer || !businessSettings) return;
    
    setIsGeneratingPdf(true);
    
    try {
      // Erstelle PDF direkt mit Text und Vektoren für beste Qualität
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const margin = 15;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;
      
      // Header mit Firmendaten
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(businessSettings.businessName || 'Handyshop Verwaltung', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${businessSettings.streetAddress || 'Amerlingstraße 19'}`, margin, yPosition);
      yPosition += 4;
      pdf.text(`${businessSettings.zipCode || '1060'} ${businessSettings.city || 'Wien'}`, margin, yPosition);
      yPosition += 4;
      pdf.text(`Tel: ${businessSettings.phone || '+4314103511'}`, margin, yPosition);
      yPosition += 4;
      pdf.text(`E-Mail: ${businessSettings.email || 'office@macandphonedoc.at'}`, margin, yPosition);
      yPosition += 15;
      
      // Titel
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPARATURAUFTRAG', margin, yPosition);
      yPosition += 10;
      
      // Auftragsnummer
      pdf.setFontSize(12);
      pdf.text(`Auftragsnummer: ${repair.orderCode}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Datum: ${format(new Date(repair.createdAt), 'dd.MM.yyyy', { locale: de })}`, margin, yPosition);
      yPosition += 12;
      
      // Kundendaten
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('KUNDENDATEN', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${customer.firstName} ${customer.lastName}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Telefon: ${customer.phone}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`E-Mail: ${customer.email}`, margin, yPosition);
      yPosition += 5;
      if (customer.address) {
        pdf.text(`Adresse: ${customer.address}`, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 8;
      
      // Gerätedaten
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GERÄTEDATEN', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gerät: ${repair.deviceType || 'Nicht angegeben'}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Marke: ${repair.brand || 'Nicht angegeben'}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Modell: ${repair.model || 'Nicht angegeben'}`, margin, yPosition);
      yPosition += 5;
      if (repair.devicePassword) {
        pdf.text(`Gerätecode: ${repair.devicePassword}`, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 8;
      
      // Fehlerbeschreibung
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FEHLERBESCHREIBUNG', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const problemLines = pdf.splitTextToSize(repair.problemDescription || 'Keine Beschreibung angegeben', contentWidth);
      problemLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 8;
      
      // Status
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('STATUS', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Aktueller Status: ${repair.status}`, margin, yPosition);
      yPosition += 5;
      if (repair.estimatedCost) {
        pdf.text(`Geschätzte Kosten: €${repair.estimatedCost}`, margin, yPosition);
        yPosition += 5;
      }
      
      // PDF in neuem Fenster öffnen und drucken
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(blobUrl, '_blank');
      
      if (printWindow) {
        printWindow.addEventListener('load', function() {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
        
        toast({
          title: "Hochqualitäts-PDF bereit",
          description: "Das vektorbasierte PDF wird in einem neuen Tab geöffnet und der Druckdialog gestartet.",
        });
      }
      
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
  
  // Debug-Informationen und Zustandsverwaltung
  useEffect(() => {
    if (!open) return;
    
    console.log('A4 Dialog Debug:', {
      open,
      repairId,
      repair: !!repair,
      customer: !!customer,
      isLoading,
      isLoadingCustomer,
      error: error?.message,
      repairData: repair ? { id: repair.id, orderCode: repair.orderCode, customerId: repair.customerId } : null,
      customerData: customer ? { 
        id: customer.id, 
        firstName: customer.firstName, 
        lastName: customer.lastName,
        address: customer.address,
        zipCode: customer.zipCode,
        city: customer.city,
        phone: customer.phone,
        email: customer.email
      } : null
    });
    
    // Wenn alle Daten geladen sind, auf druckbereit setzen
    if (repair && customer && !isLoading && !isLoadingCustomer && !error) {
      console.log('A4-Vorschau bereit - alle Daten geladen');
      setPrintReady(true);
    }
  }, [open, repair, customer, isLoading, isLoadingCustomer, error, repairId]);
  
  // Zeigt eine Lade-Animation, wenn die Daten noch nicht bereit sind
  if (open && (!printReady || isLoading || isLoadingCustomer)) {
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
        
        {/* Direkte Druckfunktion ohne PDF-Erstellung */}
        <div className="print:hidden mb-4">
          <Button
            onClick={() => {
              // Direkter Druck wie bei Kostenvoranschlägen
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                toast({
                  title: "Fehler",
                  description: "Popup-Blocker verhindern das Öffnen des Druckfensters. Bitte erlauben Sie Popups für diese Seite.",
                  variant: "destructive",
                });
                return;
              }
              
              // HTML-Inhalt für direkten Druck generieren
              const content = document.getElementById('a4-print-content');
              if (!content) return;
              
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Reparaturauftrag ${repair?.orderCode || `#${repairId}`}</title>
                    <meta charset="UTF-8">
                    <style>
                      @media print {
                        body { margin: 0; padding: 0; }
                        @page { size: A4; margin: 1cm; }
                      }
                      body {
                        font-family: Arial, sans-serif;
                        line-height: 1.4;
                        color: #000;
                        background: white;
                      }
                      .print-content {
                        padding: 20px;
                        max-width: 100%;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="print-content">
                      ${content.innerHTML}
                    </div>
                    <script>
                      window.onload = function() {
                        setTimeout(function() {
                          window.print();
                          window.close();
                        }, 500);
                      };
                    </script>
                  </body>
                </html>
              `);
              
              printWindow.document.close();
              toast({
                title: "Druckdialog geöffnet",
                description: "Das Reparaturauftrag wird direkt gedruckt.",
              });
            }}
            className="mr-2"
            variant="default"
          >
            <Printer className="mr-2 h-4 w-4" />
            Direkt drucken
          </Button>
        </div>
        
        {printReady && repair && customer && (
          <>
            {/* Druckinhalt - Neue DIN A4 Vorlage */}
            <div id="a4-print-content" className="bg-white text-black p-8 sm:p-10 md:p-12 rounded-md">
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
              <div className="flex justify-between items-start mb-6">
                <div className="w-[200px] p-2 text-center h-[50px] flex items-center justify-center">
                  {businessSettings?.logoImage ? (
                    <img 
                      src={businessSettings.logoImage} 
                      alt={businessSettings.businessName}
                      className="max-h-[50px] max-w-[180px] object-contain"
                      onError={(e) => {
                        console.error('Fehler beim Laden des Logos in A4:', e);
                        // Bei Fehler Platzhaltertext anzeigen
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML = '<span class="text-gray-400 italic">Logo konnte nicht geladen werden</span>';
                        }
                      }}
                      loading="eager" // Prioritäres Laden
                    />
                  ) : (
                    <span className="text-transparent">Logo nicht verfügbar</span>
                  )}
                </div>
                
                <div className="text-right text-sm text-gray-600 leading-tight">
                  <p className="text-base font-bold text-gray-800 mb-0.5">{businessSettings?.businessName || 'Handyshop Verwaltung'}</p>
                  <p className="leading-tight">{businessSettings?.streetAddress || 'Amerlingstraße 19'}<br />
                  {businessSettings?.zipCode || '1060'} {businessSettings?.city || 'Wien'}<br />
                  {businessSettings?.phone || '+4314103511'}<br />
                  {businessSettings?.email || 'office@macandphonedoc.at'}</p>
                </div>
              </div>

              {/* Kundeninformationen */}
              <div className="mb-5">
                <div className="text-sm mb-1 font-bold">Kundeninformationen</div>
                <p className="text-base font-bold leading-tight">{customer.firstName} {customer.lastName}</p>
                <p className="leading-tight">{customer.address || ''}</p>
                <p className="leading-tight">{customer.zipCode || ''} {customer.city || ''}</p>
                <p className="leading-tight">Tel: {customer.phone || ''}</p>
                <p className="leading-tight">E-Mail: {customer.email || ''}</p>
              </div>
              
              {/* Dokumententitel und Auftragsnummer */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-1">Reparaturauftrag</h1>
                <div className="text-lg">{repair.orderCode}</div>
              </div>
              
              {/* Gerätedaten & Reparaturdetails Box */}
              <div className="border border-gray-300 rounded-lg bg-gray-50 p-4 mb-5 flex gap-8">
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
                    <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">REPARATURKOSTEN</div>
                    <div className="text-sm font-bold">
                      {repair.estimatedCost ? `${repair.estimatedCost.replace('.', ',')} €` : 'Auf Anfrage'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reparaturbedingungen */}
              <div className="border border-gray-300 rounded-lg bg-gray-50 p-3 mb-5">
                <div className="text-sm font-bold mb-2">Reparaturbedingungen</div>
                <p className="text-xs mb-1 leading-tight"><strong>1.</strong> Die Reparatur erfolgt nach bestem Wissen und mit geprüften Ersatzteilen. Originalteile können nicht in jedem Fall garantiert werden.</p>
                <p className="text-xs mb-1 leading-tight"><strong>2.</strong> Für etwaige Datenverluste wird keine Haftung übernommen. Der Kunde ist verpflichtet, vor Abgabe des Geräts eine vollständige Datensicherung vorzunehmen.</p>
                <p className="text-xs mb-1 leading-tight"><strong>3.</strong> Die Gewährleistung beträgt 6 Monate und bezieht sich ausschließlich auf die ausgeführten Arbeiten und eingesetzten Komponenten.</p>
                <p className="text-xs mb-1 leading-tight"><strong>4.</strong> Wird ein Kostenvoranschlag abgelehnt oder ist eine Reparatur nicht möglich, kann eine Überprüfungspauschale berechnet werden.</p>
                <p className="text-xs mb-1 leading-tight"><strong>5.</strong> Nicht abgeholte Geräte können nach 60 Tagen kostenpflichtig eingelagert oder entsorgt werden.</p>
                <p className="text-xs mb-1 leading-tight"><strong>6.</strong> Mit der Unterschrift bestätigt der Kunde die Beauftragung der Reparatur sowie die Anerkennung dieser Bedingungen.</p>
              </div>
              
              {/* Unterschriftsbereich mit Datum */}
              <div className="flex mt-8 gap-10">
                <div className="flex-1 text-center">
                  <p className="font-bold mb-2">Reparaturauftrag erteilt</p>
                  {repair.dropoffSignature ? (
                    <>
                      <div className="h-[40px] flex items-center justify-center">
                        <img 
                          src={repair.dropoffSignature} 
                          alt="Unterschrift bei Abgabe" 
                          className="max-h-[40px] object-contain"
                          onError={(e) => {
                            console.error('Fehler beim Laden der Abgabe-Unterschrift:', e);
                            e.currentTarget.style.display = 'none';
                          }}
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
                          onError={(e) => {
                            console.error('Fehler beim Laden der Abholungs-Unterschrift:', e);
                            e.currentTarget.style.display = 'none';
                          }}
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
          </>
        )}
      </DialogContent>

      {/* Aktions-Dialog nach PDF-Generierung */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>PDF erfolgreich erstellt</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Das PDF wurde erfolgreich erstellt. Was möchten Sie als nächstes tun?
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={handleDownloadPdf}
                className="w-full justify-start"
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF herunterladen
              </Button>
              
              <Button
                onClick={() => {
                  if (pdfBase64) {
                    // PDF in neuem Fenster öffnen und drucken
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Reparaturauftrag ${repair?.orderCode || `#${repairId}`}</title>
                            <style>
                              @media print {
                                body { margin: 0; padding: 0; }
                                iframe { border: none !important; margin: 0; padding: 0; }
                              }
                              body { margin: 0; padding: 0; }
                              iframe { width: 100%; height: 100vh; border: none; }
                            </style>
                          </head>
                          <body>
                            <iframe src="data:application/pdf;base64,${pdfBase64}"></iframe>
                            <script>
                              window.onload = function() {
                                setTimeout(function() {
                                  window.print();
                                }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }
                  setShowActionDialog(false);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <Printer className="mr-2 h-4 w-4" />
                PDF drucken
              </Button>
              
              {customer?.email && (
                <Button
                  onClick={handleSendPdfEmail}
                  disabled={isSendingEmail}
                  className="w-full justify-start"
                  variant="outline"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      PDF per E-Mail an {customer.email} senden
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={() => setShowActionDialog(false)}
                className="w-full justify-start"
                variant="ghost"
              >
                <X className="mr-2 h-4 w-4" />
                Später entscheiden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
