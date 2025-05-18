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
  ShieldAlert,
  Trash2,
  Edit,
  AlertCircle,
  Loader2
} from "lucide-react";
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
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newItem, setNewItem] = useState<{
    description: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>({
    description: "",
    quantity: 1,
    unitPrice: "0,00",
    totalPrice: "0,00"
  });
  
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
  
  // Abfrage für den Kunden
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['/api/customers', estimate?.customerId || estimate?.customer_id],
    queryFn: async () => {
      const custId = estimate?.customerId || estimate?.customer_id;
      if (!custId) return null;
      const response = await apiRequest('GET', `/api/customers/${custId}`);
      return await response.json();
    },
    enabled: !!estimate && !!(estimate.customerId || estimate.customer_id) && open
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

  // Mutation für das Hinzufügen von Positionen
  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      if (!estimateId) throw new Error('Keine Kostenvoranschlags-ID vorhanden');
      const response = await apiRequest('POST', `/api/cost-estimates/${estimateId}/items`, itemData);
      return await response.json();
    },
    onSuccess: () => {
      // Abfragen für Items und Kostenvoranschlag invalidieren
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates', estimateId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates', estimateId] });
      
      // Formular zurücksetzen
      setNewItem({
        description: "",
        quantity: 1,
        unitPrice: "0,00",
        totalPrice: "0,00"
      });
      setShowAddItemForm(false);
      
      toast({
        title: "Position hinzugefügt",
        description: "Die Position wurde erfolgreich hinzugefügt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Hinzufügen der Position: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Funktion zum Berechnen des Gesamtpreises einer Position
  const calculateItemTotal = (quantity: number, unitPrice: string): string => {
    const price = parseFloat(unitPrice.replace(',', '.')) || 0;
    const total = (quantity * price).toFixed(2).replace('.', ',');
    return total;
  };

  // Funktion zum Hinzufügen einer Position
  const handleAddItem = () => {
    if (!estimateId) return;
    
    // Sicherstellen, dass der Gesamtpreis korrekt berechnet wurde
    const totalPrice = calculateItemTotal(newItem.quantity, newItem.unitPrice);
    
    // Formatierung für die API
    const itemToAdd = {
      description: newItem.description,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      totalPrice: totalPrice,
      position: items.length + 1
    };
    
    addItemMutation.mutate(itemToAdd);
  };

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
  
  // Mutation für das Löschen eines Kostenvoranschlags
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/cost-estimates/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      
      toast({
        title: "Kostenvoranschlag gelöscht",
        description: "Der Kostenvoranschlag wurde erfolgreich gelöscht.",
      });
      
      // Dialog schließen
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: `Der Kostenvoranschlag konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
      });
      setShowDeleteConfirm(false);
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
  const formatDate = (dateString: string | Date) => {
    try {
      if (!dateString) return "Kein Datum";
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return "Ungültiges Datum";
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      console.error("Fehler bei Datumsformatierung:", error, dateString);
      return "Ungültiges Datum";
    }
  };

  // Hilfsfunktion für relative Zeitformatierung
  const relativeTime = (dateString: string | Date) => {
    try {
      if (!dateString) return "Kein Datum";
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return "Ungültiges Datum";
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    } catch (error) {
      console.error("Fehler bei relativer Zeitformatierung:", error, dateString);
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
  
  // Funktion zum Löschen eines Kostenvoranschlags
  const handleDelete = () => {
    if (!estimateId) return;
    deleteMutation.mutate(estimateId);
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
    <div>
      {/* Löschbestätigungsdialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-600">
              <AlertCircle className="h-6 w-6 inline-block mr-2" /> 
              Kostenvoranschlag löschen
            </DialogTitle>
            <DialogDescription>
              Möchten Sie den Kostenvoranschlag "{estimate?.reference_number}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Löschen bestätigen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hauptdialog */}
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
                          {/* Versuche verschiedene mögliche Formate für Kundendaten */}
                          {customer ? `${customer.firstName || '-'} ${customer.lastName || '-'}` : 
                           (estimate.firstname && estimate.lastname) ? `${estimate.firstname} ${estimate.lastname}` : '-'}
                        </p>
                        <p className="text-sm">Email: {customer?.email || estimate.email || '-'}</p>
                        <p className="text-sm">Tel: {customer?.phone || estimate.phone || '-'}</p>
                        {customer?.streetAddress && (
                          <>
                            <p className="text-sm mt-2 text-muted-foreground">Adresse:</p>
                            <p className="text-sm">{customer.streetAddress}</p>
                            <p className="text-sm">{customer.zipCode} {customer.city}</p>
                          </>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Kunde ID: {estimate.customer_id || estimate.customerId || '-'}</p>
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

                  {/* Finanzdetails */}
                  {estimate.subtotal && estimate.total && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Finanzübersicht</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">Erstellt am</p>
                          <p className="font-medium">
                            {formatDate(estimate.created_at)}
                          </p>
                        </div>
                        
                        {estimate.validUntil && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground">Gültig bis</p>
                            <p className="font-medium">
                              {formatDate(estimate.validUntil)}
                            </p>
                          </div>
                        )}

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
                  )}

                  {/* Aktionen (zum Schluss) */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Aktionen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-2">
                        {estimate.status === 'offen' && (
                          <>
                            <Button 
                              onClick={handleAccept}
                              disabled={updateStatusMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Annehmen
                            </Button>
                            <Button 
                              onClick={handleReject}
                              disabled={updateStatusMutation.isPending}
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Ablehnen
                            </Button>
                          </>
                        )}
                        
                        {estimate.status === 'angenommen' && !estimate.convertedToRepair && (
                          <Button 
                            onClick={handleConvertToRepair}
                            disabled={convertToRepairMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <RotateCw className="h-4 w-4 mr-2" />
                            In Reparatur umwandeln
                          </Button>
                        )}
                        
                        {/* Druck- und Export-Optionen */}
                        <Button variant="outline">
                          <Printer className="h-4 w-4 mr-2" />
                          Drucken
                        </Button>
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Als PDF
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            // Kostenvoranschlag öffnen und bearbeiten - derzeit keine direkte Bearbeitungsseite
                            toast({
                              title: "Bearbeitung",
                              description: "Die Bearbeitungsfunktion ist in Arbeit und wird bald verfügbar sein.",
                            });
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Bearbeiten
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Löschen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Positionen</CardTitle>
                      <Button 
                        size="sm" 
                        onClick={() => setShowAddItemForm(true)}
                        disabled={showAddItemForm}
                      >
                        + Position hinzufügen
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isLoadingItems ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : items.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <p>Keine Positionen vorhanden</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Beschreibung</TableHead>
                                <TableHead className="text-right">Menge</TableHead>
                                <TableHead className="text-right">Einzelpreis</TableHead>
                                <TableHead className="text-right">Gesamtpreis</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items && items.map((item: CostEstimateItem, index: number) => (
                                <TableRow key={item.id}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{item.unitPrice} €</TableCell>
                                  <TableCell className="text-right">{item.totalPrice} €</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {showAddItemForm && (
                        <div className="mt-4 p-4 border rounded-md space-y-4">
                          <div>
                            <label className="text-sm font-medium">Beschreibung</label>
                            <input 
                              type="text"
                              className="w-full mt-1 p-2 border rounded-md"
                              value={newItem.description}
                              onChange={(e) => setNewItem({
                                ...newItem,
                                description: e.target.value
                              })}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium">Menge</label>
                              <input 
                                type="number"
                                className="w-full mt-1 p-2 border rounded-md"
                                min="1"
                                value={newItem.quantity}
                                onChange={(e) => {
                                  const quantity = parseInt(e.target.value) || 1;
                                  const totalPrice = calculateItemTotal(quantity, newItem.unitPrice);
                                  setNewItem({
                                    ...newItem,
                                    quantity,
                                    totalPrice
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Einzelpreis (€)</label>
                              <input 
                                type="text"
                                className="w-full mt-1 p-2 border rounded-md"
                                value={newItem.unitPrice}
                                onChange={(e) => {
                                  const unitPrice = e.target.value;
                                  const totalPrice = calculateItemTotal(newItem.quantity, unitPrice);
                                  setNewItem({
                                    ...newItem,
                                    unitPrice,
                                    totalPrice
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Gesamtpreis (€)</label>
                              <input 
                                type="text"
                                readOnly
                                className="w-full mt-1 p-2 border rounded-md bg-muted"
                                value={newItem.totalPrice}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowAddItemForm(false)}
                            >
                              Abbrechen
                            </Button>
                            <Button 
                              onClick={handleAddItem}
                              disabled={!newItem.description || addItemMutation.isPending}
                            >
                              {addItemMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Position hinzufügen
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CostEstimateDetailsDialog;