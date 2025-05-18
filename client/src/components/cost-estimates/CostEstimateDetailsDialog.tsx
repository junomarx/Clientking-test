import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Trash2, Printer, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditCostEstimateDialog } from "./EditCostEstimateDialog";
import { DeleteCostEstimateDialog } from "./DeleteCostEstimateDialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface CostEstimateDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  estimateId: number | null;
}

interface CostEstimate {
  id: number;
  reference_number: string;
  customer_id?: number;
  customerId?: number; // In der Detailansicht wird camelCase verwendet
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  notes?: string;
  title?: string;
  description?: string;
  serial_number?: string;
  status: string;
  convertedToRepair: boolean;
  validUntil?: string;
  subtotal?: string;
  tax_rate?: string;
  tax_amount?: string;
  total?: string;
  created_at: string;
  updated_at: string;
  // Kundenfelder aus dem JOIN
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  // Kunde aus separatem API-Call
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
}

interface CostEstimateItem {
  id: number;
  costEstimateId: number;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export function CostEstimateDetailsDialog({ open, onClose, estimateId }: CostEstimateDetailsDialogProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  // Kostenvoranschlag abrufen
  const { data: estimate, isLoading } = useQuery<CostEstimate>({
    queryKey: ['/api/cost-estimates', estimateId],
    enabled: open && estimateId !== null,
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Laden des Kostenvoranschlags",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Kunde abrufen
  const { data: customer } = useQuery({
    queryKey: ['/api/customers', estimate?.customer_id || estimate?.customerId],
    enabled: open && (estimate?.customer_id !== undefined || estimate?.customerId !== undefined),
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Laden der Kundendaten",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Positionen aus dem items-Feld des Kostenvoranschlags parsen
  const parsedItems = (() => {
    if (!estimate?.items) return [];
    
    try {
      // Prüfen, ob es sich um ein gültiges JSON handelt
      if (typeof estimate.items === 'string') {
        return JSON.parse(estimate.items) || [];
      } else if (Array.isArray(estimate.items)) {
        return estimate.items;
      }
      return [];
    } catch (e) {
      console.error("Fehler beim Parsen der Items:", e);
      return [];
    }
  })();
  
  // Kundendaten richtig extrahieren
  const customerName = customer 
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() 
    : `${estimate.firstname || ''} ${estimate.lastname || ''}`.trim() || 'Kein Kunde zugewiesen';
  
  const customerEmail = customer?.email || estimate.email || '';
  const customerPhone = customer?.phone || estimate.phone || '';

  // Geschäftseinstellungen für das Logo abrufen
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    enabled: open,
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Laden der Geschäftseinstellungen",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (!open || !estimateId) return null;

  // Sicherstellen, dass alle Daten geladen sind
  if (isLoading || !estimate) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kostenvoranschlag wird geladen...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Statusfarbe basierend auf dem Status bestimmen
  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500';
    
    switch (status.toLowerCase()) {
      case 'offen':
        return 'bg-yellow-500';
      case 'angenommen':
        return 'bg-green-500';
      case 'abgelehnt':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de });
    } catch (error) {
      console.error('Fehler beim Formatieren des Datums:', error);
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      console.error('Fehler beim Formatieren des Datums und der Zeit:', error);
      return dateString;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kostenvoranschlag {estimate.reference_number}</DialogTitle>
          </DialogHeader>
          
          {/* Hauptinformationen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kundendaten */}
            <Card className="md:col-span-1">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">Kunde</div>
                <div className="font-medium">
                  {customer ? `${customer.firstName} ${customer.lastName}` : 
                   (estimate.firstname && estimate.lastname) ? `${estimate.firstname} ${estimate.lastname}` : 'Kein Kunde zugewiesen'}
                </div>
                {customer?.email && <div className="text-sm text-muted-foreground">{customer.email}</div>}
                {customer?.phone && <div className="text-sm text-muted-foreground">{customer.phone}</div>}
              </CardContent>
            </Card>
            
            {/* Gerätedaten */}
            <Card className="md:col-span-1">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">Gerät</div>
                <div className="font-medium">{estimate.brand} {estimate.model}</div>
                <div className="text-sm text-muted-foreground">{estimate.deviceType}</div>
                {estimate.serial_number && (
                  <div className="text-sm text-muted-foreground mt-1">
                    S/N: {estimate.serial_number}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Status */}
            <Card className="md:col-span-1">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(estimate.status)}>{estimate.status}</Badge>
                  {estimate.convertedToRepair && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            In Reparatur konvertiert
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Dieser Kostenvoranschlag wurde in einen Reparaturauftrag umgewandelt
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>Erstellt am {formatDateTime(estimate.created_at)}</span>
                </div>
                {estimate.validUntil && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Gültig bis: {format(new Date(estimate.validUntil), 'dd.MM.yyyy', { locale: de })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Separator className="my-2" />
          
          {/* Problemdetails */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Fehlerbeschreibung</h3>
              <p className="text-sm whitespace-pre-line">{estimate.issue}</p>
            </div>
            
            {estimate.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Notizen</h3>
                <p className="text-sm whitespace-pre-line">{estimate.notes}</p>
              </div>
            )}
          </div>
          
          <Separator className="my-2" />
          
          {/* Finanzübersicht mit Positionen */}
          <div>
            <h3 className="text-sm font-medium mb-2">Finanzübersicht</h3>
            
            {/* Positionen */}
            {parsedItems && parsedItems.length > 0 ? (
              <div className="rounded-md border mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-2 px-4 text-left font-medium">Beschreibung</th>
                      <th className="py-2 px-4 text-center font-medium">Menge</th>
                      <th className="py-2 px-4 text-right font-medium">Einzelpreis</th>
                      <th className="py-2 px-4 text-right font-medium">Gesamtpreis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-4">{item.description}</td>
                        <td className="py-2 px-4 text-center">{item.quantity}</td>
                        <td className="py-2 px-4 text-right">{item.unitPrice} €</td>
                        <td className="py-2 px-4 text-right">{item.totalPrice} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic mb-4">
                Keine Positionen gefunden
              </div>
            )}
            
            {/* Summen */}
            <div className="flex flex-col items-end space-y-1 mb-4">
              <div className="flex justify-between w-48">
                <span className="text-sm text-muted-foreground">Zwischensumme:</span>
                <span className="text-sm font-medium">{estimate.subtotal} €</span>
              </div>
              <div className="flex justify-between w-48">
                <span className="text-sm text-muted-foreground">MwSt ({estimate.tax_rate}%):</span>
                <span className="text-sm font-medium">{estimate.tax_amount} €</span>
              </div>
              <div className="flex justify-between w-48 border-t pt-1">
                <span className="font-medium">Gesamtbetrag:</span>
                <span className="font-medium">{estimate.total} €</span>
              </div>
            </div>
          </div>
          
          {/* Aktionsleiste */}
          <div className="flex justify-between mt-6">
            <div>
              {/* Druck- und Export-Optionen */}
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Druckfunktion über ein neues Fenster öffnen
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      toast({
                        title: "Fehler",
                        description: "Popup-Blocker verhindern das Öffnen des Druckfensters. Bitte erlauben Sie Popups für diese Seite.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Aktuelles Datum formatieren
                    const today = new Date();
                    const todayFormatted = formatDate(today.toISOString());
                    
                    // HTML für Druckansicht generieren
                    const html = `
                      <!DOCTYPE html>
                      <html lang="de">
                      <head>
                        <meta charset="UTF-8">
                        <title>Kostenvoranschlag ${estimate.reference_number}</title>
                        <style>
                          @page {
                              size: A4;
                              margin: 0;
                          }
                          
                          html, body {
                              margin: 0;
                              padding: 0;
                              width: 210mm;
                              height: 297mm;
                              box-sizing: border-box;
                              font-family: Arial, sans-serif;
                              font-size: 12px;
                              color: #333;
                              background-color: white;
                          }
                          
                          body {
                              padding: 20mm;
                          }
                          
                          .header {
                              display: flex;
                              justify-content: space-between;
                              margin-bottom: 40px;
                          }
                          
                          .logo-container {
                              width: 200px;
                              border: 1px dashed #ccc;
                              padding: 10px;
                              text-align: center;
                              height: 60px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              font-style: italic;
                              color: #999;
                          }
                          
                          .company-info {
                              text-align: right;
                              font-size: 12px;
                              color: #666;
                          }
                          
                          .company-name {
                              font-weight: bold;
                              font-size: 16px;
                              color: #333;
                              margin-bottom: 5px;
                          }
                          
                          .document-title {
                              text-align: center;
                              font-size: 24px;
                              font-weight: bold;
                              margin: 30px 0 10px 0;
                              color: #222;
                          }
                          
                          .auftragsnummer {
                              text-align: center;
                              font-size: 18px;
                              margin: 0 0 10px 0;
                              color: #222;
                          }
                          
                          .document-date {
                              text-align: center;
                              font-size: 14px;
                              margin: 0 0 40px 0;
                              color: #666;
                          }
                          
                          .section {
                              margin-bottom: 20px;
                          }
                          
                          .section-title {
                              font-weight: bold;
                              margin-bottom: 10px;
                              font-size: 14px;
                              color: #333;
                          }
                          
                          .customer-info {
                              margin-bottom: 30px;
                          }
                          
                          .customer-info p {
                              margin: 3px 0;
                          }
                          
                          .customer-name {
                              font-weight: bold;
                              font-size: 16px;
                          }
                          
                          .device-info-box {
                              display: flex;
                              justify-content: space-between;
                              gap: 40px;
                              margin-bottom: 30px;
                              padding: 20px;
                              border: 1px solid #ccc;
                              border-radius: 8px;
                          }
                          
                          .info-column {
                              flex: 1;
                          }
                          
                          .info-item {
                              margin-bottom: 15px;
                          }
                          
                          .info-label {
                              font-size: 11px;
                              color: #666;
                              text-transform: uppercase;
                              letter-spacing: 0.5px;
                              margin-bottom: 2px;
                          }
                          
                          .info-value {
                              font-size: 14px;
                              font-weight: bold;
                              color: #222;
                          }
                          
                          .box-content {
                              white-space: pre-line;
                              font-size: 13px;
                              color: #333;
                              margin-top: 5px;
                          }
                          
                          table {
                              width: 100%;
                              border-collapse: collapse;
                              margin-bottom: 20px;
                          }
                          
                          thead tr {
                              background-color: #f5f5f5;
                              border-bottom: 2px solid #ddd;
                          }
                          
                          th, td {
                              padding: 8px;
                              text-align: left;
                              font-size: 12px;
                          }
                          
                          th {
                              font-weight: bold;
                          }
                          
                          tbody tr {
                              border-bottom: 1px solid #ddd;
                          }
                          
                          .text-right {
                              text-align: right;
                          }
                          
                          .price-summary {
                              display: flex;
                              flex-direction: column;
                              align-items: flex-end;
                              margin-top: 20px;
                          }
                          
                          .price-row {
                              display: flex;
                              justify-content: space-between;
                              width: 200px;
                              margin-bottom: 5px;
                          }
                          
                          .price-label {
                              font-size: 12px;
                              color: #666;
                          }
                          
                          .price-value {
                              font-size: 12px;
                              font-weight: bold;
                          }
                          
                          .price-total {
                              display: flex;
                              justify-content: space-between;
                              width: 200px;
                              border-top: 1px solid #ddd;
                              padding-top: 5px;
                              margin-top: 5px;
                          }
                          
                          .price-total-label {
                              font-size: 14px;
                              font-weight: bold;
                          }
                          
                          .price-total-value {
                              font-size: 14px;
                              font-weight: bold;
                          }
                          
                          @media print {
                              html, body {
                                  width: 210mm;
                                  height: 297mm;
                              }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="logo-container">
                              ${businessSettings?.logoUrl ? 
                                `<img src="${businessSettings.logoUrl}" alt="Firmenlogo" style="max-width: 100%; max-height: 100%;">` : 
                                'Firmenlogo'}
                          </div>
                          <div class="company-info">
                              <p class="company-name">${businessSettings?.businessName || 'Mac and PhoneDoc'}</p>
                              <p>${businessSettings?.streetAddress || 'Amerlingstraße 19'}<br>
                              ${businessSettings?.zipCode || '1060'} ${businessSettings?.city || 'Wien'}<br>
                              ${businessSettings?.phone || '+4314103511'}<br>
                              ${businessSettings?.email || 'office@macandphonedoc.at'}</p>
                          </div>
                        </div>
                      
                        <div class="customer-info">
                          <div class="section-title">Kundeninformationen</div>
                          <p class="customer-name">${customer ? `${customer.firstName} ${customer.lastName}` : 
                            (estimate.firstname && estimate.lastname) ? `${estimate.firstname} ${estimate.lastname}` : 'Kunde'}</p>
                          <p>${customer?.streetAddress || ''}</p>
                          <p>${customer?.zipCode || ''} ${customer?.city || ''}</p>
                        </div>
                      
                        <div class="document-title">Kostenvoranschlag</div>
                        <div class="auftragsnummer">${estimate.reference_number}</div>
                        <div class="document-date">Erstellt am: ${todayFormatted}</div>
                      
                        <!-- Geräteinformationen -->
                        <div class="device-info-box">
                          <div class="info-column">
                              <div class="info-item">
                                  <div class="info-label">Hersteller</div>
                                  <div class="info-value">${estimate.brand}</div>
                              </div>
                          </div>
                          <div class="info-column">
                              <div class="info-item">
                                  <div class="info-label">Modell</div>
                                  <div class="info-value">${estimate.model}</div>
                              </div>
                          </div>
                          <div class="info-column">
                              <div class="info-item">
                                  <div class="info-label">Seriennummer</div>
                                  <div class="info-value">${estimate.serial_number || '-'}</div>
                              </div>
                          </div>
                        </div>
                      
                        <!-- Fehlerbeschreibung -->
                        <div class="section">
                          <div class="section-title">Fehlerbeschreibung</div>
                          <div class="box-content">${estimate.issue}</div>
                        </div>
                      
                        <!-- Positionen -->
                        <div class="section">
                          <div class="section-title">Positionen</div>
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Beschreibung</th>
                                <th class="text-right">Menge</th>
                                <th class="text-right">Einzelpreis</th>
                                <th class="text-right">Gesamtpreis</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${items && items.map((item, index) => `
                                <tr>
                                  <td>${index + 1}</td>
                                  <td>${item.description}</td>
                                  <td class="text-right">${item.quantity}</td>
                                  <td class="text-right">${item.unitPrice} €</td>
                                  <td class="text-right">${item.totalPrice} €</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                          
                          <div class="price-summary">
                            <div class="price-row">
                              <span class="price-label">Zwischensumme:</span>
                              <span class="price-value">${estimate.subtotal} €</span>
                            </div>
                            <div class="price-row">
                              <span class="price-label">MwSt (${estimate.tax_rate}%):</span>
                              <span class="price-value">${estimate.tax_amount} €</span>
                            </div>
                            <div class="price-total">
                              <span class="price-total-label">Gesamtbetrag:</span>
                              <span class="price-total-value">${estimate.total} €</span>
                            </div>
                          </div>
                        </div>
                      
                        <!-- Hinweise -->
                        <div class="section">
                          <div class="section-title">Hinweise zum Kostenvoranschlag</div>
                          <p><strong>1.</strong> Der Kostenvoranschlag basiert auf einer ersten Diagnose und kann sich bei tatsächlicher Durchführung ändern.</p>
                          <p><strong>2.</strong> Sollte sich während der Reparatur ein erweiterter Schaden zeigen, wird der Kunde vorab kontaktiert.</p>
                          <p><strong>3.</strong> Die im Kostenvoranschlag genannten Preise verstehen sich inkl. MwSt., sofern nicht anders angegeben.</p>
                          <p><strong>4.</strong> Eine Bearbeitungsgebühr kann fällig werden, falls keine Reparatur beauftragt wird.</p>
                          <p><strong>5.</strong> Dieser Kostenvoranschlag ist bis ${estimate.validUntil ? 
                            formatDate(estimate.validUntil) : 'unbegrenzt'} gültig.</p>
                        </div>
                      
                        ${estimate.notes ? `
                        <div class="section">
                          <div class="section-title">Zusätzliche Notizen</div>
                          <div class="box-content">${estimate.notes}</div>
                        </div>
                        ` : ''}
                      </body>
                      </html>
                    `;
                    
                    // HTML im neuen Fenster einfügen und drucken
                    printWindow.document.open();
                    printWindow.document.write(html);
                    printWindow.document.close();
                    
                    // Warten bis Ressourcen geladen sind, dann drucken
                    printWindow.onload = () => {
                      printWindow.print();
                    };
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "PDF-Export",
                      description: "Wählen Sie 'Als PDF speichern' in den Druckoptionen, um den Kostenvoranschlag als PDF zu exportieren.",
                    });
                    
                    // Die gleiche Funktion wie oben, aber ohne automatisches Drucken
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      toast({
                        title: "Fehler",
                        description: "Popup-Blocker verhindern das Öffnen des Druckfensters. Bitte erlauben Sie Popups für diese Seite.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Aktuelles Datum formatieren
                    const today = new Date();
                    const todayFormatted = formatDate(today.toISOString());
                    
                    // Das gleiche HTML wie oben generieren
                    const html = `
                      <!DOCTYPE html>
                      <html lang="de">
                      <head>
                        <meta charset="UTF-8">
                        <title>Kostenvoranschlag ${estimate.reference_number}</title>
                        <style>
                          @page {
                              size: A4;
                              margin: 0;
                          }
                          
                          html, body {
                              margin: 0;
                              padding: 0;
                              width: 210mm;
                              height: 297mm;
                              box-sizing: border-box;
                              font-family: Arial, sans-serif;
                              font-size: 12px;
                              color: #333;
                              background-color: white;
                          }
                          
                          body {
                              padding: 20mm;
                          }
                          
                          .header {
                              display: flex;
                              justify-content: space-between;
                              margin-bottom: 40px;
                          }
                          
                          .logo-container {
                              width: 200px;
                              border: 1px dashed #ccc;
                              padding: 10px;
                              text-align: center;
                              height: 60px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              font-style: italic;
                              color: #999;
                          }
                          
                          .company-info {
                              text-align: right;
                              font-size: 12px;
                              color: #666;
                          }
                          
                          .company-name {
                              font-weight: bold;
                              font-size: 16px;
                              color: #333;
                              margin-bottom: 5px;
                          }
                          
                          .document-title {
                              text-align: center;
                              font-size: 24px;
                              font-weight: bold;
                              margin: 30px 0 10px 0;
                              color: #222;
                          }
                          
                          .auftragsnummer {
                              text-align: center;
                              font-size: 18px;
                              margin: 0 0 10px 0;
                              color: #222;
                          }
                          
                          .document-date {
                              text-align: center;
                              font-size: 14px;
                              margin: 0 0 40px 0;
                              color: #666;
                          }
                          
                          .section {
                              margin-bottom: 20px;
                          }
                          
                          .section-title {
                              font-weight: bold;
                              margin-bottom: 10px;
                              font-size: 14px;
                              color: #333;
                          }
                          
                          .customer-info {
                              margin-bottom: 30px;
                          }
                          
                          .customer-info p {
                              margin: 3px 0;
                          }
                          
                          .customer-name {
                              font-weight: bold;
                              font-size: 16px;
                          }
                          
                          .device-info-box {
                              display: flex;
                              justify-content: space-between;
                              gap: 40px;
                              margin-bottom: 30px;
                              padding: 20px;
                              border: 1px solid #ccc;
                              border-radius: 8px;
                          }
                          
                          .info-column {
                              flex: 1;
                          }
                          
                          .info-item {
                              margin-bottom: 15px;
                          }
                          
                          .info-label {
                              font-size: 11px;
                              color: #666;
                              text-transform: uppercase;
                              letter-spacing: 0.5px;
                              margin-bottom: 2px;
                          }
                          
                          .info-value {
                              font-size: 14px;
                              font-weight: bold;
                              color: #222;
                          }
                          
                          .box-content {
                              white-space: pre-line;
                              font-size: 13px;
                              color: #333;
                              margin-top: 5px;
                          }
                          
                          table {
                              width: 100%;
                              border-collapse: collapse;
                              margin-bottom: 20px;
                          }
                          
                          thead tr {
                              background-color: #f5f5f5;
                              border-bottom: 2px solid #ddd;
                          }
                          
                          th, td {
                              padding: 8px;
                              text-align: left;
                              font-size: 12px;
                          }
                          
                          th {
                              font-weight: bold;
                          }
                          
                          tbody tr {
                              border-bottom: 1px solid #ddd;
                          }
                          
                          .text-right {
                              text-align: right;
                          }
                          
                          .price-summary {
                              display: flex;
                              flex-direction: column;
                              align-items: flex-end;
                              margin-top: 20px;
                          }
                          
                          .price-row {
                              display: flex;
                              justify-content: space-between;
                              width: 200px;
                              margin-bottom: 5px;
                          }
                          
                          .price-label {
                              font-size: 12px;
                              color: #666;
                          }
                          
                          .price-value {
                              font-size: 12px;
                              font-weight: bold;
                          }
                          
                          .price-total {
                              display: flex;
                              justify-content: space-between;
                              width: 200px;
                              border-top: 1px solid #ddd;
                              padding-top: 5px;
                              margin-top: 5px;
                          }
                          
                          .price-total-label {
                              font-size: 14px;
                              font-weight: bold;
                          }
                          
                          .price-total-value {
                              font-size: 14px;
                              font-weight: bold;
                          }
                          
                          @media print {
                              html, body {
                                  width: 210mm;
                                  height: 297mm;
                              }
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="logo-container">
                              ${businessSettings?.logoUrl ? 
                                `<img src="${businessSettings.logoUrl}" alt="Firmenlogo" style="max-width: 100%; max-height: 100%;">` : 
                                'Firmenlogo'}
                          </div>
                          <div class="company-info">
                              <p class="company-name">${businessSettings?.businessName || 'Mac and PhoneDoc'}</p>
                              <p>${businessSettings?.streetAddress || 'Amerlingstraße 19'}<br>
                              ${businessSettings?.zipCode || '1060'} ${businessSettings?.city || 'Wien'}<br>
                              ${businessSettings?.phone || '+4314103511'}<br>
                              ${businessSettings?.email || 'office@macandphonedoc.at'}</p>
                          </div>
                        </div>
                      
                        <div class="customer-info">
                          <div class="section-title">Kundeninformationen</div>
                          <p class="customer-name">${customer ? `${customer.firstName} ${customer.lastName}` : 
                            (estimate.firstname && estimate.lastname) ? `${estimate.firstname} ${estimate.lastname}` : 'Kunde'}</p>
                          <p>${customer?.streetAddress || ''}</p>
                          <p>${customer?.zipCode || ''} ${customer?.city || ''}</p>
                        </div>
                      
                        <div class="document-title">Kostenvoranschlag</div>
                        <div class="auftragsnummer">${estimate.reference_number}</div>
                        <div class="document-date">Erstellt am: ${todayFormatted}</div>
                      
                        <!-- Geräteinformationen -->
                        <div class="device-info-box">
                          <div class="info-column">
                              <div class="info-item">
                                  <div class="info-label">Hersteller</div>
                                  <div class="info-value">${estimate.brand}</div>
                              </div>
                          </div>
                          <div class="info-column">
                              <div class="info-item">
                                  <div class="info-label">Modell</div>
                                  <div class="info-value">${estimate.model}</div>
                              </div>
                          </div>
                          <div class="info-column">
                              <div class="info-item">
                                  <div class="info-label">Seriennummer</div>
                                  <div class="info-value">${estimate.serial_number || '-'}</div>
                              </div>
                          </div>
                        </div>
                      
                        <!-- Fehlerbeschreibung -->
                        <div class="section">
                          <div class="section-title">Fehlerbeschreibung</div>
                          <div class="box-content">${estimate.issue}</div>
                        </div>
                      
                        <!-- Positionen -->
                        <div class="section">
                          <div class="section-title">Positionen</div>
                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Beschreibung</th>
                                <th class="text-right">Menge</th>
                                <th class="text-right">Einzelpreis</th>
                                <th class="text-right">Gesamtpreis</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${items && items.map((item, index) => `
                                <tr>
                                  <td>${index + 1}</td>
                                  <td>${item.description}</td>
                                  <td class="text-right">${item.quantity}</td>
                                  <td class="text-right">${item.unitPrice} €</td>
                                  <td class="text-right">${item.totalPrice} €</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                          
                          <div class="price-summary">
                            <div class="price-row">
                              <span class="price-label">Zwischensumme:</span>
                              <span class="price-value">${estimate.subtotal} €</span>
                            </div>
                            <div class="price-row">
                              <span class="price-label">MwSt (${estimate.tax_rate}%):</span>
                              <span class="price-value">${estimate.tax_amount} €</span>
                            </div>
                            <div class="price-total">
                              <span class="price-total-label">Gesamtbetrag:</span>
                              <span class="price-total-value">${estimate.total} €</span>
                            </div>
                          </div>
                        </div>
                      
                        <!-- Hinweise -->
                        <div class="section">
                          <div class="section-title">Hinweise zum Kostenvoranschlag</div>
                          <p><strong>1.</strong> Der Kostenvoranschlag basiert auf einer ersten Diagnose und kann sich bei tatsächlicher Durchführung ändern.</p>
                          <p><strong>2.</strong> Sollte sich während der Reparatur ein erweiterter Schaden zeigen, wird der Kunde vorab kontaktiert.</p>
                          <p><strong>3.</strong> Die im Kostenvoranschlag genannten Preise verstehen sich inkl. MwSt., sofern nicht anders angegeben.</p>
                          <p><strong>4.</strong> Eine Bearbeitungsgebühr kann fällig werden, falls keine Reparatur beauftragt wird.</p>
                          <p><strong>5.</strong> Dieser Kostenvoranschlag ist bis ${estimate.validUntil ? 
                            formatDate(estimate.validUntil) : 'unbegrenzt'} gültig.</p>
                        </div>
                      
                        ${estimate.notes ? `
                        <div class="section">
                          <div class="section-title">Zusätzliche Notizen</div>
                          <div class="box-content">${estimate.notes}</div>
                        </div>
                        ` : ''}
                      </body>
                      </html>
                    `;
                    
                    // HTML im neuen Fenster einfügen und drucken
                    printWindow.document.open();
                    printWindow.document.write(html);
                    printWindow.document.close();
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF-Export
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowEditDialog(true)}
                disabled={estimate.convertedToRepair}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
              
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={estimate.convertedToRepair}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit-Dialog */}
      {showEditDialog && (
        <EditCostEstimateDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          estimateId={estimateId}
          afterSave={onClose}
        />
      )}
      
      {/* Delete-Dialog */}
      {showDeleteDialog && (
        <DeleteCostEstimateDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          estimateId={estimateId}
          reference={estimate.reference_number}
          afterDelete={onClose}
        />
      )}
    </>
  );
}