import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, RefreshCcw, Building, MapPin, Phone, Mail } from "lucide-react";
import { Euro } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface ViewCostEstimateDetailsProps {
  estimateId: number;
}

// Status-Badge für verschiedene Status
const StatusBadge = ({ status }: { status: string }) => {
  switch (status?.toLowerCase()) {
    case 'offen':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">Offen</Badge>;
    case 'angenommen':
      return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Angenommen</Badge>;
    case 'abgelehnt':
      return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Abgelehnt</Badge>;
    case 'abgelaufen':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50 border-gray-200">Abgelaufen</Badge>;
    default:
      return <Badge variant="outline">{status || 'Unbekannt'}</Badge>;
  }
};

export default function ViewCostEstimateDetails({ estimateId }: ViewCostEstimateDetailsProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  
  // Kostenvoranschlag abrufen
  const { data: estimate, isLoading: isLoadingEstimate, isError: isErrorEstimate, refetch } = useQuery({
    queryKey: ['/api/cost-estimates', estimateId],
    queryFn: async () => {
      const response = await fetch(`/api/cost-estimates/${estimateId}`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Kostenvoranschlags');
      }
      return response.json();
    }
  });
  
  // Geschäftseinstellungen abrufen
  const { data: businessData, isLoading: isLoadingBusiness, isError: isErrorBusiness } = useQuery({
    queryKey: ['/api/business-settings'],
    queryFn: async () => {
      const response = await fetch('/api/business-settings');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Geschäftseinstellungen');
      }
      return response.json();
    }
  });
  
  // Setze Geschäftseinstellungen
  useEffect(() => {
    if (businessData) {
      setBusinessSettings(businessData);
    }
  }, [businessData]);
  
  // Funktion zum Ausdrucken des Kostenvoranschlags
  const handlePrint = () => {
    window.print();
  };
  
  // Funktion zum Herunterladen des Kostenvoranschlags als PDF
  const handleDownload = async () => {
    if (!contentRef.current || !estimate) return;
    
    toast({
      title: "PDF wird erstellt",
      description: "Bitte warten Sie einen Moment...",
    });
    
    try {
      const content = contentRef.current;
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Kostenvoranschlag-${estimate.referenceNumber}.pdf`);
      
      toast({
        title: "PDF erstellt",
        description: "Der Kostenvoranschlag wurde erfolgreich als PDF gespeichert.",
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des PDFs:', error);
      toast({
        title: "Fehler",
        description: "Beim Erstellen des PDFs ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };
  
  if (isLoadingEstimate || isLoadingBusiness) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }
  
  if (isErrorEstimate || !estimate || isErrorBusiness || !businessData) {
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-600 border border-red-200">
        <h3 className="font-semibold mb-2">Fehler beim Laden der Daten</h3>
        <p>Der Kostenvoranschlag konnte nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-2">
          <RefreshCcw className="w-4 h-4 mr-2" /> Erneut versuchen
        </Button>
      </div>
    );
  }
  
  // Berechne die tatsächlichen Preise für die Positionen
  const recalculateItem = (item: any) => {
    const quantity = parseFloat(String(item.quantity).replace(',', '.')) || 0;
    const unitPrice = parseFloat(item.unitPrice.replace('€', '').replace(',', '.').trim()) || 0;
    const totalPriceCalculated = (quantity * unitPrice).toFixed(2).replace('.', ',') + ' €';
    return {
      ...item,
      totalPrice: totalPriceCalculated
    };
  };
  
  // Berechne die Summen neu
  const recalculatedItems = estimate.items.map(recalculateItem);
  const subtotal = recalculatedItems.reduce((sum: number, item: any) => {
    const totalPrice = parseFloat(item.totalPrice.replace('€', '').replace(',', '.').trim()) || 0;
    return sum + totalPrice;
  }, 0);
  
  const subtotalFormatted = subtotal.toFixed(2).replace('.', ',') + ' €';
  const taxRate = parseFloat(estimate.taxRate) || 0;
  const taxAmount = (subtotal * taxRate / 100).toFixed(2).replace('.', ',') + ' €';
  const total = (subtotal + (subtotal * taxRate / 100)).toFixed(2).replace('.', ',') + ' €';
  
  // Berechne Datum-Strings
  const createdAtFormatted = format(new Date(estimate.createdAt), 'PPP', { locale: de });
  const validUntilFormatted = estimate.validUntil
    ? format(new Date(estimate.validUntil), 'PPP', { locale: de })
    : 'Kein Ablaufdatum';
  const acceptedAtFormatted = estimate.acceptedAt
    ? format(new Date(estimate.acceptedAt), 'PPP', { locale: de })
    : '-';
  
  return (
    <div className="space-y-6 py-4">
      {/* Aktions-Buttons für Druck und PDF-Export */}
      <div className="flex justify-end items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Drucken
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" /> PDF
        </Button>
      </div>
      
      {/* Inhaltsbereich für PDF-Export */}
      <div ref={contentRef} className="space-y-6 p-4">
        {/* Briefkopf mit Unternehmensdaten und Kundeninformationen */}
        <div className="flex justify-between items-start">
          {/* Linke Spalte: Logo und Kundeninformationen */}
          <div className="space-y-4">
            {/* Logo zuerst */}
            {businessData.logoImage && (
              <div className="mb-6">
                <img 
                  src={businessData.logoImage} 
                  alt="Unternehmenslogo" 
                  className="max-h-20 max-w-[200px] object-contain"
                />
              </div>
            )}
            
            {/* Kundeninformationen darunter */}
            <div className="mt-8 space-y-1">
              <h3 className="font-medium mb-2">Kundeninformationen</h3>
              <div>
                <p className="font-bold">{estimate.customer?.firstName} {estimate.customer?.lastName}</p>
                <p>{estimate.customer?.address}</p>
                <p>{estimate.customer?.zipCode} {estimate.customer?.city}</p>
              </div>
            </div>
          </div>
          
          {/* Unternehmensdaten - Rechts */}
          <div className="text-right">
            <h1 className="text-xl font-bold">{businessData.businessName}</h1>
            <p className="text-sm text-muted-foreground">{businessData.streetAddress}</p>
            <p className="text-sm text-muted-foreground">{businessData.zipCode} {businessData.city}</p>
            <p className="text-sm text-muted-foreground">{businessData.phone}</p>
            <p className="text-sm text-muted-foreground">{businessData.email}</p>
            <div className="mt-4">
              <p className="text-muted-foreground text-sm">Referenznummer: {estimate.referenceNumber}</p>
              <p className="text-muted-foreground text-sm">Datum: {createdAtFormatted}</p>
              <p className="text-muted-foreground text-sm screen-only">Status: {estimate.status}</p>
            </div>
          </div>
        </div>
        
        <div className="my-8 border-t border-b py-4">
          <h2 className="text-2xl font-bold text-center mb-2">Kostenvoranschlag</h2>
          <p className="text-center text-muted-foreground">Gültig bis: {validUntilFormatted}</p>
        </div>
        

        
        {/* Geräte-Informationen */}
        <div>
          <h3 className="font-medium mb-2">Gerätedetails</h3>
          
          <div className="border rounded-lg p-4 mb-4 print-no-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Gerätetyp</div>
                <div className="border border-input rounded-md py-2 px-3 text-sm print-no-border">{estimate.deviceType}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Marke</div>
                <div className="border border-input rounded-md py-2 px-3 text-sm print-no-border">{estimate.brand}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Modell</div>
                <div className="border border-input rounded-md py-2 px-3 text-sm print-no-border">{estimate.model}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Seriennummer</div>
                <div className="border border-input rounded-md py-2 px-3 text-sm print-no-border">{estimate.serialNumber || '–'}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Problem</div>
                <div className="border border-input rounded-md py-2 px-3 text-sm print-no-border">{estimate.issue || '–'}</div>
              </div>
            </div>
          </div>
        </div>
        

        
        {/* Beschreibungsfeld entfernt */}
        
        {/* Positionen */}
        <div className="mt-6">
          <h3 className="font-medium mb-4">Positionen</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Pos.</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-center w-[80px]">Menge</TableHead>
                <TableHead className="text-right w-[120px]">Einzelpreis</TableHead>
                <TableHead className="text-right w-[120px]">Gesamtpreis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recalculatedItems.map((item: any) => (
                <TableRow key={item.position}>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.unitPrice}</TableCell>
                  <TableCell className="text-right">{item.totalPrice}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Summen */}
          <div className="flex flex-col items-end mt-6 space-y-2">
            <div className="flex justify-between w-64 text-sm">
              <span>Zwischensumme:</span>
              <span>{subtotalFormatted}</span>
            </div>
            <div className="flex justify-between w-64 text-sm">
              <span>MwSt. ({estimate.taxRate}%):</span>
              <span>{taxAmount}</span>
            </div>
            <div className="flex justify-between w-64 font-bold">
              <span>Gesamtsumme:</span>
              <span>{total}</span>
            </div>
          </div>
        </div>
        
        {/* Notizen */}
        {estimate.notes && (
          <div className="mt-6">
            <h3 className="font-medium mb-2">Notizen</h3>
            <p className="whitespace-pre-line">{estimate.notes}</p>
          </div>
        )}
        
        {/* Unterschrift und Bedingungen */}
        <div className="mt-10 border-t pt-4">
          <p className="text-sm text-muted-foreground mt-2">
            Dieses Angebot wurde von {businessData.businessName} erstellt und ist gültig bis zum {validUntilFormatted}.
          </p>
        </div>
      </div>
    </div>
  );
}