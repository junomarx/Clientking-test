import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Search, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NewCostEstimateDialog } from "./NewCostEstimateDialog";
import { CostEstimateDetailsDialog } from "./CostEstimateDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { TableHeader, TableRow, TableHead, TableBody, TableCell, Table } from "@/components/ui/table";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { DebugCostEstimates } from '../../debug-costestimates';

// Interface für Kostenvoranschläge - angepasst an die Datenbankstruktur
interface CostEstimate {
  id: number;
  reference_number: string; // Angepasst an Datenbankfeldname
  customer_id: number; // Angepasst an Datenbankfeldname
  deviceType: string;
  brand: string; // Ersetzt manufacturer
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
  created_at: string; // Angepasst an Datenbankfeldname
  updated_at: string; // Angepasst an Datenbankfeldname
  // Zusätzliche Kundenfelder vom JOIN - Namen aus SQL-Abfrage
  firstname?: string; // Geändert: kleinbuchstaben wie im SQL-Alias
  lastname?: string; // Geändert: kleinbuchstaben wie im SQL-Alias
  email?: string;
  phone?: string;
}

// Interface für das Formular - angepasst an die Komponente NewCostEstimateDialog
interface CostEstimateFormData {
  customerId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber?: string;
  issueDescription: string;  // Entspricht "issue" im Backend
  workToBeDone?: string;     // Zusätzliches Feld im Formular
  totalPrice: string;        // Entspricht "estimatedCost" im Backend
  notes?: string;
}

// Funktion zum Formatieren des Status
function formatStatus(status: string) {
  switch (status) {
    case "offen":
      return { label: "Offen", color: "bg-blue-500" };
    case "angenommen":
      return { label: "Angenommen", color: "bg-green-500" };
    case "abgelehnt":
      return { label: "Abgelehnt", color: "bg-red-500" };
    default:
      return { label: status, color: "bg-gray-500" };
  }
}

// Typen für die Props
interface CostEstimatesTabProps {
  onNewCostEstimate?: () => void;
}

export function CostEstimatesTab({ onNewCostEstimate }: CostEstimatesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query für das Abrufen der Kostenvoranschläge
  const { data: costEstimates, isLoading, error } = useQuery<CostEstimate[]>({
    queryKey: ['/api/cost-estimates'],
    staleTime: 60000, // 1 Minute
    onSuccess: (data) => {
      // Debug-Ausgabe des ersten Elements
      if (data && data.length > 0) {
        console.log("API-Antwort für Kostenvoranschlag:", data[0]);
      }
    }
  });

  // Mutation für das Erstellen eines neuen Kostenvoranschlags
  const createCostEstimateMutation = useMutation({
    mutationFn: async (data: CostEstimateFormData) => {
      // Aus dem Formular die Daten für die API extrahieren
      const costEstimateData = {
        customerId: data.customerId,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        issue: data.issueDescription,
        total: data.totalPrice || "0",
        subtotal: data.subtotal || "0",
        tax_rate: data.taxRate || "20",
        tax_amount: data.taxAmount || "0",
        items: data.items || [],
        notes: data.notes || null,
        status: "offen", // Default-Status
        title: data.title || "Kostenvoranschlag",
        serial_number: data.serialNumber || null
      };
      
      console.log("Sende Daten an API:", costEstimateData);
      const response = await apiRequest('POST', '/api/cost-estimates', costEstimateData);
      return await response.json();
    },
    onSuccess: () => {
      // Cache invalidieren, damit die Liste aktualisiert wird
      queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Erstellen des Kostenvoranschlags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNewCostEstimate = () => {
    // Dialog öffnen statt Event-Handling
    setIsDialogOpen(true);
    
    if (onNewCostEstimate) {
      onNewCostEstimate();
    }
  };

  // Callback-Funktion für das Erstellen eines neuen Kostenvoranschlags
  const handleCreateCostEstimate = (data: CostEstimateFormData) => {
    console.log("Neuer Kostenvoranschlag wird erstellt:", data);
    
    // Mutation aufrufen, um den Kostenvoranschlag zu speichern
    createCostEstimateMutation.mutate(data);
    
    toast({
      title: "Kostenvoranschlag wird erstellt",
      description: `Für ${data.firstName} ${data.lastName} - ${data.brand} ${data.model}`,
    });
  };

  // Gefilterte Kostenvoranschläge basierend auf der Suche
  const filteredEstimates = costEstimates?.filter(estimate => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      estimate.reference_number?.toLowerCase().includes(searchTermLower) ||
      estimate.brand?.toLowerCase().includes(searchTermLower) ||
      estimate.model?.toLowerCase().includes(searchTermLower) ||
      estimate.deviceType?.toLowerCase().includes(searchTermLower) ||
      estimate.firstname?.toLowerCase().includes(searchTermLower) ||
      estimate.lastname?.toLowerCase().includes(searchTermLower) ||
      estimate.email?.toLowerCase().includes(searchTermLower) ||
      (estimate.firstname + " " + estimate.lastname)?.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Debug-Komponente zur Fehlersuche */}
      <DebugCostEstimates />
      {/* Kopfzeile mit Titel und Beschreibung */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kostenvoranschläge</h1>
          <p className="text-sm text-muted-foreground">
            Erstellen und verwalten Sie Kostenvoranschläge für Ihre Kunden
          </p>
        </div>
        
        <Button 
          onClick={handleNewCostEstimate}
          className="w-full md:w-auto bg-gradient-to-r from-primary to-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kostenvoranschlag
        </Button>
      </div>
      
      {/* Suchleiste */}
      <div className="relative w-full max-w-md mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Suchen nach Kunde, Auftragsnummer, Gerät..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9 w-full"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-transparent"
            onClick={() => setSearchTerm("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Ladezustand */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {/* Fehler */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center text-red-800">
              <p>Fehler beim Laden der Kostenvoranschläge</p>
              <p className="text-sm">Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Keine Kostenvoranschläge gefunden */}
      {!isLoading && !error && (!costEstimates || costEstimates.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Kostenvoranschläge</CardTitle>
            <CardDescription>
              Hier erscheinen Ihre erstellten Kostenvoranschläge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-muted-foreground">Keine Kostenvoranschläge vorhanden</p>
              <p className="text-sm text-muted-foreground mb-4">
                Erstellen Sie einen neuen Kostenvoranschlag, um loszulegen
              </p>
              <Button 
                onClick={handleNewCostEstimate}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neuer Kostenvoranschlag
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Kostenvoranschlags-Tabelle */}
      {!isLoading && !error && filteredEstimates && filteredEstimates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kostenvoranschläge</CardTitle>
            <CardDescription>
              {filteredEstimates.length} Kostenvoranschläge gefunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Gerät</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstimates.map((estimate) => {
                    // Status-Formatierung
                    const status = formatStatus(estimate.status);
                    // Sicherstellen, dass created_at ein gültiges Datum ist
                    const createdDate = estimate.created_at ? new Date(estimate.created_at) : new Date();
                    const isValidDate = !isNaN(createdDate.getTime());
                    const formattedDate = isValidDate ? formatDistanceToNow(createdDate, { 
                      addSuffix: true,
                      locale: de
                    }) : "Unbekanntes Datum";
                    
                    return (
                      <TableRow 
                        key={estimate.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedEstimateId(estimate.id)}
                      >
                        <TableCell className="font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>{estimate.reference_number}</TooltipTrigger>
                              <TooltipContent>
                                <p>Klicken Sie, um Details anzuzeigen</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                {formattedDate}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Erstellt am {createdDate.toLocaleDateString('de-DE')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {estimate.firstname} {estimate.lastname}
                          </div>
                          {estimate.email && (
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {estimate.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {estimate.brand} {estimate.model}
                          <div className="text-xs text-muted-foreground">
                            {estimate.deviceType}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {parseFloat(estimate.total || "0").toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR'
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Formular-Dialog für neuen Kostenvoranschlag */}
      <NewCostEstimateDialog 
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreateCostEstimate={handleCreateCostEstimate}
      />

      {/* Details-Dialog für Kostenvoranschläge */}
      <CostEstimateDetailsDialog
        open={selectedEstimateId !== null}
        onClose={() => setSelectedEstimateId(null)}
        estimateId={selectedEstimateId}
      />
    </div>
  );
}

export default CostEstimatesTab;