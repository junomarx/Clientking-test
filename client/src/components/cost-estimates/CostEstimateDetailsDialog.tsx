import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditCostEstimateDialog } from "./EditCostEstimateDialog";
import { DeleteCostEstimateDialog } from "./DeleteCostEstimateDialog";
import { CostEstimateFixedPrint } from "./CostEstimateFixedPrint";
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

  // Positionen abrufen
  const { data: items } = useQuery<CostEstimateItem[]>({
    queryKey: ['/api/cost-estimates', estimateId, 'items'],
    enabled: open && estimateId !== null,
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Laden der Positionen",
        description: error.message,
        variant: "destructive",
      });
    }
  });

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
            {items && items.length > 0 ? (
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
                    {items && items.map((item: CostEstimateItem, index: number) => (
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
              {items && (
                <CostEstimateFixedPrint 
                  estimate={estimate}
                  items={items}
                  customer={customer}
                />
              )}
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