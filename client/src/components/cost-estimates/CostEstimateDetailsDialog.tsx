import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  Printer, 
  ArrowUpRight, 
  RotateCw,
  FileText,
  ShieldAlert
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { de } from "date-fns/locale";

interface CostEstimateDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  estimateId: number | null;
}

// Interface für einen Kostenvoranschlag
interface CostEstimate {
  id: number;
  reference_number: string;
  customer_id: number;
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
}

// Interface für Kostenvoranschlagsposten
interface CostEstimateItem {
  id: number;
  costEstimateId: number;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export function CostEstimateDetailsDialog({ open, onClose, estimateId }: CostEstimateDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Abfrage für den Kostenvoranschlag
  const { data: estimate, isLoading: isLoadingEstimate, error: estimateError } = useQuery({
    queryKey: ['/api/cost-estimates', estimateId],
    queryFn: async () => {
      if (!estimateId) return null;
      const response = await apiRequest('GET', `/api/cost-estimates/${estimateId}`);
      const data = await response.json();
      // Debug-Ausgabe
      console.log("API-Antwort für Detailansicht:", data);
      return data;
    },
    enabled: !!estimateId && open
  });

  // Abfrage für die Kostenvoranschlagsposten
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/cost-estimates', estimateId, 'items'],
    queryFn: async () => {
      if (!estimateId) return [];
      const response = await apiRequest('GET', `/api/cost-estimates/${estimateId}/items`);
      return await response.json();
    },
    enabled: !!estimateId && open
  });

  // Mutation für das Aktualisieren des Status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/cost-estimates/${id}/status`, { status });
      return await response.json();
    },
    onSuccess: () => {
      // Alle relevanten Abfragen invalidieren
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates', estimateId] });
      
      toast({
        title: "Status aktualisiert",
        description: "Der Status des Kostenvoranschlags wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Der Status konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation für das Konvertieren in eine Reparatur
  const convertToRepairMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/cost-estimates/${id}/convert-to-repair`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates', estimateId] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      
      toast({
        title: "Reparaturauftrag erstellt",
        description: `Der Kostenvoranschlag wurde erfolgreich in einen Reparaturauftrag umgewandelt.`,
      });
      
      // Optional: Dialog schließen oder zur Reparaturansicht wechseln
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Der Kostenvoranschlag konnte nicht umgewandelt werden: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Hilfsfunktion für die Formatierung von Datum/Zeit
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      return "Ungültiges Datum";
    }
  };

  // Hilfsfunktion für relative Zeitformatierung
  const relativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    } catch (error) {
      return "Ungültiges Datum";
    }
  };

  // Status-Funktionen
  const handleAccept = () => {
    if (!estimateId) return;
    updateStatusMutation.mutate({ id: estimateId, status: 'angenommen' });
  };

  const handleReject = () => {
    if (!estimateId) return;
    updateStatusMutation.mutate({ id: estimateId, status: 'abgelehnt' });
  };

  const handleConvertToRepair = () => {
    if (!estimateId) return;
    convertToRepairMutation.mutate(estimateId);
  };

  // Status-Anzeige formatieren
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'offen':
        return <Badge className="bg-blue-500">Offen</Badge>;
      case 'angenommen':
        return <Badge className="bg-green-500">Angenommen</Badge>;
      case 'abgelehnt':
        return <Badge className="bg-red-500">Abgelehnt</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Zurücksetzen des aktiven Tabs beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      setActiveTab("details");
    }
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoadingEstimate ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : estimateError ? (
          <div className="text-center py-8 text-red-600">
            <ShieldAlert className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Fehler beim Laden des Kostenvoranschlags</h3>
            <p>Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.</p>
          </div>
        ) : estimate ? (
          <>
            <DialogHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <DialogTitle className="text-xl">
                  Kostenvoranschlag {estimate.reference_number}
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(estimate.status)}
                  <span className="text-sm text-muted-foreground">
                    {relativeTime(estimate.created_at)}
                  </span>
                </div>
              </div>
              <DialogDescription>
                {estimate.brand} {estimate.model} - {estimate.issue}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 text-sm">
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                Debug: Kundendaten: {JSON.stringify({firstname: estimate.firstname, lastname: estimate.lastname, customer_id: estimate.customer_id, email: estimate.email, phone: estimate.phone})}
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Positionen</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {/* Kundeninformationen */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kundeninformationen</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">
                        {estimate.firstname || '-'} {estimate.lastname || '-'}
                      </p>
                      {estimate.email && <p className="text-sm">Email: {estimate.email}</p>}
                      {estimate.phone && <p className="text-sm">Tel: {estimate.phone}</p>}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Kunde ID: {estimate.customer_id}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Geräteinformationen */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Geräteinformationen</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Gerätetyp</p>
                      <p className="font-medium">{estimate.deviceType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Marke</p>
                      <p className="font-medium">{estimate.brand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modell</p>
                      <p className="font-medium">{estimate.model}</p>
                    </div>
                    {estimate.serial_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Seriennummer</p>
                        <p className="font-medium">{estimate.serial_number}</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Fehlerbeschreibung</p>
                      <p className="font-medium">{estimate.issue}</p>
                    </div>
                    {estimate.notes && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Notizen</p>
                        <p className="font-medium whitespace-pre-wrap">{estimate.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preisdetails */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preisdetails</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Zwischensumme</span>
                      <span>{estimate.subtotal}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">MwSt ({estimate.tax_rate}%)</span>
                      <span>{estimate.tax_amount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                      <span>Gesamtbetrag</span>
                      <span>{estimate.total}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Meta-Informationen */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Erstellt am</p>
                      <p className="font-medium">{formatDate(estimate.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gültig bis</p>
                      <p className="font-medium">
                        {estimate.validUntil ? formatDate(estimate.validUntil) : "Kein Ablaufdatum"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">{getStatusBadge(estimate.status)}</p>
                    </div>
                    {estimate.status === 'angenommen' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Angenommen am</p>
                        <p className="font-medium">
                          {estimate.accepted_at ? formatDate(estimate.accepted_at) : "Unbekannt"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Aktionen */}
                <div className="flex flex-col md:flex-row gap-2 justify-end mt-6">
                  <Button 
                    variant="outline" 
                    className="w-full md:w-auto"
                    onClick={() => onClose()}
                  >
                    Schließen
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full md:w-auto flex items-center gap-2"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Drucken
                  </Button>

                  {estimate.status === 'offen' && (
                    <>
                      <Button
                        variant="destructive"
                        className="w-full md:w-auto flex items-center gap-2"
                        onClick={handleReject}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Ablehnen
                      </Button>

                      <Button
                        variant="default"
                        className="w-full md:w-auto flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        onClick={handleAccept}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Annehmen
                      </Button>
                    </>
                  )}

                  {estimate.status === 'angenommen' && !estimate.convertedToRepair && (
                    <Button
                      variant="default"
                      className="w-full md:w-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={handleConvertToRepair}
                      disabled={convertToRepairMutation.isPending}
                    >
                      {convertToRepairMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                      In Reparatur umwandeln
                    </Button>
                  )}

                  {estimate.convertedToRepair && (
                    <Button
                      variant="outline"
                      className="w-full md:w-auto flex items-center gap-2"
                      disabled={true}
                    >
                      <FileText className="h-4 w-4" />
                      In Reparatur umgewandelt
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="items">
                {isLoadingItems ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : items.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Positionen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Pos.</TableHead>
                            <TableHead>Beschreibung</TableHead>
                            <TableHead className="text-center">Anzahl</TableHead>
                            <TableHead className="text-right">Einzelpreis</TableHead>
                            <TableHead className="text-right">Gesamtpreis</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={item.id || index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">{item.unitPrice}</TableCell>
                              <TableCell className="text-right">{item.totalPrice}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="flex flex-col items-end mt-6 space-y-2">
                        <div className="flex justify-between w-48">
                          <span className="text-muted-foreground">Zwischensumme</span>
                          <span>{estimate.subtotal}</span>
                        </div>
                        <div className="flex justify-between w-48">
                          <span className="text-muted-foreground">MwSt ({estimate.tax_rate}%)</span>
                          <span>{estimate.tax_amount}</span>
                        </div>
                        <div className="flex justify-between w-48 font-bold text-lg pt-2 border-t">
                          <span>Gesamt</span>
                          <span>{estimate.total}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-muted-foreground mb-2">Keine Positionen vorhanden</p>
                      <p className="text-sm text-muted-foreground">
                        Für diesen Kostenvoranschlag wurden keine detaillierten Positionen gefunden.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default CostEstimateDetailsDialog;