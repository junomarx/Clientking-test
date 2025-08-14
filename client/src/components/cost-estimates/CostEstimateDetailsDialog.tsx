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
import { PrintButtons } from "./PrintButtons";
import { generatePrintHtml } from "./PrintTemplate";
import { NewCostEstimateDialog } from "./NewCostEstimateDialog";

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
  const [showEditDialog, setShowEditDialog] = useState(false);
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
  
  // Abfrage für die Geschäftseinstellungen mit Logo
  const { data: businessSettings, isLoading: isLoadingBusinessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/business-settings`);
      return await response.json();
    },
    enabled: open
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
      // Cache umfassend invalidieren
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      toast({
        title: "Kostenvoranschlag gelöscht",
        description: "Der Kostenvoranschlag wurde erfolgreich gelöscht.",
      });
      
      // Dialog schließen und State zurücksetzen
      setShowDeleteConfirm(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: `Der Kostenvoranschlag konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
      });
      // Dialog-State auch bei Fehler zurücksetzen
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

  // Debug-Ausgabe für das Datum
  useEffect(() => {
    if (estimate?.created_at) {
      console.log("Rohes Erstellungsdatum:", estimate.created_at);
      console.log("Datumstyp:", typeof estimate.created_at);
      try {
        const dateObj = new Date(estimate.created_at);
        console.log("Geparst als Date-Objekt:", dateObj);
        console.log("Ist gültiges Datum:", !isNaN(dateObj.getTime()));
        console.log("Formatiertes Datum:", format(dateObj, 'dd.MM.yyyy HH:mm', { locale: de }));
      } catch (e) {
        console.error("Fehler beim Parsen des Datums:", e);
      }
    } else {
      console.log("Kein Erstellungsdatum gefunden");
    }
  }, [estimate]);

  // Hilfsfunktion für die Formatierung von Datum/Zeit
  const formatDate = (dateString: string | Date) => {
    try {
      if (!dateString) return "Kein Datum verfügbar";
      
      // Stringwert parsen oder Date-Objekt direkt verwenden
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Validieren, dass es ein gültiges Datum ist
      if (isNaN(date.getTime())) {
        console.error("Ungültiges Datum:", dateString);
        return "Ungültiges Datum";
      }
      
      // Datum formatieren
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      console.error("Fehler bei Datumsformatierung:", error, dateString);
      return "Datum konnte nicht formatiert werden";
    }
  };

  // Hilfsfunktion für relative Zeitformatierung
  const relativeTime = (dateString: string | Date) => {
    try {
      if (!dateString) return "Kein Datum verfügbar";
      
      // Stringwert parsen oder Date-Objekt direkt verwenden
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Validieren, dass es ein gültiges Datum ist
      if (isNaN(date.getTime())) {
        console.error("Ungültiges Datum für relative Zeit:", dateString);
        return "Ungültiges Datum";
      }
      
      // Relative Zeit formatieren
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    } catch (error) {
      console.error("Fehler bei relativer Zeitformatierung:", error, dateString);
      return "Datum konnte nicht formatiert werden";
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

  // Funktion zum Bearbeiten eines Kostenvoranschlags
  const handleEdit = () => {
    setShowEditDialog(true);
  };

  // Mutation für Kostenvoranschlag-Aktualisierung
  const updateCostEstimateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Aktualisiere Kostenvoranschlag:", estimateId, data);
      const response = await apiRequest('PUT', `/api/cost-estimates/${estimateId}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Kostenvoranschlag erfolgreich aktualisiert:", data);
      toast({
        title: "Kostenvoranschlag aktualisiert",
        description: `Änderungen wurden erfolgreich gespeichert`,
      });
      // Cache aktualisieren
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates', estimateId] });
      setShowEditDialog(false);
    },
    onError: (error: any) => {
      console.error("Fehler beim Aktualisieren des Kostenvoranschlags:", error);
      toast({
        title: "Fehler",
        description: error.message || "Kostenvoranschlag konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  });

  const handleUpdateCostEstimate = (data: any) => {
    console.log("CostEstimateDetailsDialog: handleUpdateCostEstimate aufgerufen mit:", data);
    updateCostEstimateMutation.mutate(data);
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

              <div className="space-y-4">
                {/* Kundeninformationen */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Kundeninformationen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCustomer ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : customer ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold">Name:</p>
                          <p>{customer.firstName} {customer.lastName}</p>
                        </div>
                        <div>
                          <p className="font-semibold">E-Mail:</p>
                          <p>{customer.email || "Keine E-Mail hinterlegt"}</p>
                        </div>
                        <div>
                          <p className="font-semibold">Telefon:</p>
                          <p>{customer.phone || "Keine Telefonnummer hinterlegt"}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Keine Kundeninformationen verfügbar</p>
                    )}
                  </CardContent>
                </Card>

                {/* Tabs für Details und Positionen */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="mb-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="items">Positionen</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gerätedetails</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold">Gerätetyp:</p>
                            <p>{estimate.deviceType}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Marke:</p>
                            <p>{estimate.brand}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Modell:</p>
                            <p>{estimate.model}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Seriennummer:</p>
                            <p>{estimate.serial_number || "Nicht angegeben"}</p>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <p className="font-semibold">Problembeschreibung:</p>
                            <p>{estimate.description || estimate.issue || "Keine Beschreibung verfügbar"}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Erstellt am:</p>
                            <p>{formatDate(estimate.created_at)}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Status:</p>
                            <p>{getStatusBadge(estimate.status)}</p>
                          </div>
                          {estimate.convertedToRepair && (
                            <div className="col-span-1 md:col-span-2">
                              <Badge className="bg-blue-600">
                                In Reparaturauftrag umgewandelt
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="items">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Positionen</CardTitle>
                        {!showAddItemForm && (
                          <Button 
                            size="sm" 
                            onClick={() => setShowAddItemForm(true)}
                            disabled={estimate.status === 'abgelehnt' || estimate.convertedToRepair}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Position hinzufügen
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Formular zum Hinzufügen von Positionen */}
                        {showAddItemForm && (
                          <div className="mb-6 border rounded-md p-4 bg-muted/20">
                            <h4 className="font-medium mb-3">Neue Position hinzufügen</h4>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                              <div className="md:col-span-6">
                                <label className="text-sm font-medium mb-1 block">Beschreibung</label>
                                <input 
                                  type="text" 
                                  value={newItem.description}
                                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                  className="w-full p-2 border rounded-md"
                                  placeholder="z.B. Displaytausch"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Menge</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={newItem.quantity}
                                  onChange={(e) => {
                                    const quantity = parseInt(e.target.value);
                                    setNewItem({
                                      ...newItem, 
                                      quantity, 
                                      totalPrice: calculateItemTotal(quantity, newItem.unitPrice)
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Einzelpreis (€)</label>
                                <input 
                                  type="text" 
                                  value={newItem.unitPrice}
                                  onChange={(e) => {
                                    const unitPrice = e.target.value;
                                    setNewItem({
                                      ...newItem, 
                                      unitPrice, 
                                      totalPrice: calculateItemTotal(newItem.quantity, unitPrice)
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md"
                                  placeholder="0,00"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Gesamtpreis (€)</label>
                                <input 
                                  type="text" 
                                  value={newItem.totalPrice}
                                  readOnly
                                  className="w-full p-2 border rounded-md bg-gray-100"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end mt-3 space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setShowAddItemForm(false)}
                              >
                                Abbrechen
                              </Button>
                              <Button 
                                size="sm"
                                onClick={handleAddItem}
                                disabled={!newItem.description || newItem.quantity < 1 || addItemMutation.isPending}
                              >
                                {addItemMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                Hinzufügen
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Tabelle der Positionen */}
                        {isLoadingItems ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : items.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Beschreibung</TableHead>
                                  <TableHead className="text-right">Menge</TableHead>
                                  <TableHead className="text-right">Einzelpreis (€)</TableHead>
                                  <TableHead className="text-right">Gesamtpreis (€)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.unitPrice}</TableCell>
                                    <TableCell className="text-right">{item.totalPrice}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell colSpan={3} className="text-right font-semibold">
                                    Zwischensumme (netto):
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {estimate.subtotal || 0} €
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell colSpan={3} className="text-right font-semibold">
                                    MwSt. (20%):
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {estimate.tax_amount || 0} €
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell colSpan={3} className="text-right font-semibold">
                                    Gesamtbetrag (inkl. MwSt.):
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    {estimate.total || 0} €
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-40" />
                            <p>Keine Positionen vorhanden</p>
                            {!estimate.convertedToRepair && estimate.status !== 'abgelehnt' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2" 
                                onClick={() => setShowAddItemForm(true)}
                              >
                                Position hinzufügen
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
                
                {/* Aktionen */}
                <div className="flex justify-between items-center pt-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteMutation.isPending || estimate.convertedToRepair}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Bearbeiten Button - nur wenn nicht konvertiert und nicht abgelehnt */}
                    {!estimate.convertedToRepair && estimate.status !== 'abgelehnt' && (
                      <Button 
                        onClick={handleEdit}
                        variant="outline"
                        disabled={updateCostEstimateMutation.isPending}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </Button>
                    )}
                    
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
                    
                    {/* Druck-, Export- und E-Mail-Optionen */}
                    <PrintButtons
                      estimate={estimate}
                      customer={customer || {
                        firstName: estimate.firstname || "",
                        lastName: estimate.lastname || "",
                        email: estimate.email || "",
                        phone: estimate.phone || ""
                      }}
                      items={items}
                      businessName={businessSettings?.businessName || "Mac and PhoneDoc"}
                      businessAddress={businessSettings?.streetAddress || "Amerlingstraße 19"}
                      businessZipCity={`${businessSettings?.zipCode || "1060"} ${businessSettings?.city || "Wien"}`}
                      businessPhone={businessSettings?.phone || "+4314103511"}
                      businessEmail={businessSettings?.email || "office@macandphonedoc.at"}
                      logoUrl={businessSettings?.logoImage || null}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Cost Estimate Dialog */}
      {showEditDialog && estimate && (
        <NewCostEstimateDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onCreateCostEstimate={handleUpdateCostEstimate}
          preselectedCustomer={customer ? {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email || undefined,
            address: customer.address,
            postalCode: customer.zipCode,
            city: customer.city
          } : {
            id: estimate.customer_id || 0,
            firstName: estimate.firstname || "",
            lastName: estimate.lastname || "",
            phone: estimate.phone || "",
            email: estimate.email || undefined,
            address: "",
            postalCode: "",
            city: ""
          }}
          // Vorausgefüllte Daten für Bearbeitung
          editMode={{
            id: estimate.id,
            title: estimate.title || "Kostenvoranschlag",
            deviceType: estimate.deviceType,
            brand: estimate.brand,
            model: estimate.model,
            serialNumber: estimate.serial_number || "",
            issueDescription: estimate.issue || estimate.description || "",
            subtotal: estimate.subtotal || "0,00",
            taxRate: estimate.tax_rate || "20",
            taxAmount: estimate.tax_amount || "0,00",
            totalPrice: estimate.total || "0,00",
            items: items || []
          }}
        />
      )}
    </div>
  );
}