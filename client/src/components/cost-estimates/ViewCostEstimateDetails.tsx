import React, { useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, RefreshCcw } from "lucide-react";
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
  
  // Kostenvoranschlag abrufen
  const { data: estimate, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/cost-estimates', estimateId],
    queryFn: async () => {
      const response = await fetch(`/api/cost-estimates/${estimateId}`);
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Kostenvoranschlags');
      }
      return response.json();
    }
  });
  
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }
  
  if (isError || !estimate) {
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
      {/* Header mit Referenznummer und Status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{estimate.title}</h2>
          <p className="text-muted-foreground">Referenznummer: {estimate.referenceNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={estimate.status} />
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Drucken
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Allgemeine Informationen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Allgemeine Informationen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Erstellt am</p>
                <p>{createdAtFormatted}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gültig bis</p>
                <p>{validUntilFormatted}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p><StatusBadge status={estimate.status} /></p>
              </div>
              {estimate.status === 'angenommen' && (
                <div>
                  <p className="text-sm text-muted-foreground">Angenommen am</p>
                  <p>{acceptedAtFormatted}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Kundeninformationen</h3>
            <div>
              <p className="text-sm text-muted-foreground">Kunde</p>
              <p className="font-medium">{estimate.customerName}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Geräte-Informationen */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Gerätedetails</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Gerätetyp</p>
              <p>{estimate.deviceType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marke</p>
              <p>{estimate.brand}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Modell</p>
              <p>{estimate.model}</p>
            </div>
          </div>
          {(estimate.serialNumber || estimate.issue) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {estimate.serialNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Seriennummer</p>
                  <p>{estimate.serialNumber}</p>
                </div>
              )}
              {estimate.issue && (
                <div>
                  <p className="text-sm text-muted-foreground">Problem</p>
                  <p>{estimate.issue}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Beschreibung */}
      {estimate.description && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">Beschreibung</h3>
            <p className="whitespace-pre-line">{estimate.description}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Positionen */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-4">Positionen</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Pos.</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-center">Menge</TableHead>
                <TableHead className="text-right">Einzelpreis</TableHead>
                <TableHead className="text-right">Gesamtpreis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.items?.map((item: any) => (
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
              <span>{estimate.subtotal}</span>
            </div>
            <div className="flex justify-between w-64 text-sm">
              <span>MwSt. ({estimate.taxRate}%):</span>
              <span>{estimate.taxAmount}</span>
            </div>
            <div className="flex justify-between w-64 font-bold">
              <span>Gesamtsumme:</span>
              <span>{estimate.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Notizen */}
      {estimate.notes && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">Notizen</h3>
            <p className="whitespace-pre-line">{estimate.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}