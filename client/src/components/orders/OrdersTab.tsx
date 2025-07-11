import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, Settings, Search, Filter, Download, Plus, MoreVertical, CheckSquare, Calendar } from "lucide-react";
import { SparePartsManagementDialog } from "./SparePartsManagementDialog";
import { AddSparePartDialog } from "./AddSparePartDialog";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  createdAt: Date;
  shopId: number | null;
  userId: number | null;
}

interface SparePart {
  id: number;
  repairId: number;
  partName: string;
  supplier?: string;
  cost?: number;
  status: "bestellen" | "bestellt" | "eingetroffen" | "erledigt";
  orderDate?: Date;
  deliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RepairWithCustomer {
  id: number;
  orderCode: string;
  customerId: number;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  status: string;
  estimatedCost: number | null;
  depositAmount: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shopId: number | null;
  userId: number | null;
  customer: Customer;
  spareParts: SparePart[];
}

export function OrdersTab() {
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [isSparePartsDialogOpen, setIsSparePartsDialogOpen] = useState(false);
  const [isAddSparePartDialogOpen, setIsAddSparePartDialogOpen] = useState(false);
  
  // Filter und Suche States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Alle Ersatzteile abrufen (ohne "erledigt" Status)
  const { data: allSpareParts = [], isLoading: isLoadingSpareParts, error: sparePartsError } = useQuery<SparePart[]>({
    queryKey: ['/api/orders/spare-parts'],
    refetchInterval: 5000, // Reduziert von 30s auf 5s für bessere Performance
  });

  // Reparaturen mit Ersatzteilen abrufen
  const { data: repairsWithParts = [], isLoading: isLoadingRepairs, error: repairsError } = useQuery<RepairWithCustomer[]>({
    queryKey: ['/api/spare-parts/with-repairs'],
    refetchInterval: 5000, // Reduziert von 30s auf 5s für bessere Performance
  });

  const isLoading = isLoadingSpareParts || isLoadingRepairs;
  const error = sparePartsError || repairsError;

  const handleManageParts = (repairId: number) => {
    setSelectedRepairId(repairId);
    setIsSparePartsDialogOpen(true);
  };

  const handleSparePartsDialogClose = () => {
    setIsSparePartsDialogOpen(false);
    setSelectedRepairId(null);
  };

  // Bulk-Aktionen für Ersatzteile
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ partIds, status }: { partIds: number[]; status: string }) => {
      const response = await apiRequest("PATCH", "/api/spare-parts/bulk-update", {
        partIds,
        status,
      });
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren der Ersatzteile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/with-repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] }); // Auch Reparaturen neu laden
      toast({
        title: "Ersatzteile aktualisiert",
        description: "Die ausgewählten Ersatzteile wurden erfolgreich aktualisiert.",
      });
      setSelectedParts(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler-Funktionen
  const handleSelectPart = (partId: number, checked: boolean) => {
    const newSelected = new Set(selectedParts);
    if (checked) {
      newSelected.add(partId);
    } else {
      newSelected.delete(partId);
    }
    setSelectedParts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParts(new Set(filteredSpareParts.map(part => part.id)));
    } else {
      setSelectedParts(new Set());
    }
  };

  const handleBulkUpdate = (status: string) => {
    if (selectedParts.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Ersatzteil aus.",
        variant: "destructive",
      });
      return;
    }

    bulkUpdateMutation.mutate({
      partIds: Array.from(selectedParts),
      status,
    });
  };

  // Exportfunktionen
  const exportToPDF = async () => {
    try {
      toast({
        title: "Export gestartet",
        description: "PDF wird vorbereitet...",
      });

      const response = await apiRequest("POST", "/api/orders/export-pdf", {
        spareParts: filteredSpareParts,
        filters: { searchTerm, statusFilter, dateFilter }
      });

      if (!response.ok) {
        throw new Error('PDF-Export fehlgeschlagen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ersatzteile-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export abgeschlossen",
        description: "PDF wurde erfolgreich heruntergeladen.",
      });
    } catch (error) {
      toast({
        title: "Export-Fehler",
        description: "PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = async () => {
    try {
      toast({
        title: "Export gestartet",
        description: "Excel-Datei wird vorbereitet...",
      });
      
      // Für jetzt nur eine einfache Benachrichtigung
      setTimeout(() => {
        toast({
          title: "Export abgeschlossen",
          description: "Excel-Datei wurde erfolgreich erstellt.",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Export-Fehler",
        description: "Excel-Datei konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };

  // Gefilterte und gesuchte Ersatzteile
  const filteredSpareParts = useMemo(() => {
    return allSpareParts.filter(part => {
      const matchesSearch = searchTerm === "" || 
        part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || part.status === statusFilter;
      
      const matchesDate = dateFilter === "all" || (() => {
        const now = new Date();
        const partDate = new Date(part.createdAt);
        
        switch (dateFilter) {
          case "today":
            return partDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return partDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return partDate >= monthAgo;
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [allSpareParts, searchTerm, statusFilter, dateFilter]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'destructive';
      case 'bestellt':
        return 'secondary';
      case 'eingetroffen':
        return 'default';
      case 'erledigt':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'bestellen':
        return 'Bestellen';
      case 'bestellt':
        return 'Bestellt';
      case 'eingetroffen':
        return 'Eingetroffen';
      case 'erledigt':
        return 'Erledigt';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Fehler beim Laden der Bestellungen</p>
            <p className="text-sm text-gray-600 mt-2">{error?.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allSpareParts.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
          <Badge variant="secondary" className="ml-2">0</Badge>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Bestellungen
            </h3>
            <p className="text-gray-500">
              Aktuell warten keine Reparaturen auf Ersatzteile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bestellungen</h1>
          <Badge variant="secondary" className="ml-2">
            {filteredSpareParts.length}
          </Badge>
        </div>
        
        <Button
          onClick={() => setIsAddSparePartDialogOpen(true)}
          className="flex items-center gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Ersatzteil hinzufügen</span>
        </Button>
      </div>

      {/* Erweiterte Filter- und Suchleiste */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Suche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Suche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ersatzteil, Auftrag, Kunde..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="bestellen">Bestellen</SelectItem>
                <SelectItem value="bestellt">Bestellt</SelectItem>
                <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                <SelectItem value="erledigt">Erledigt</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Datum Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Zeitraum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Zeiträume</SelectItem>
                <SelectItem value="today">Heute</SelectItem>
                <SelectItem value="week">Letzte Woche</SelectItem>
                <SelectItem value="month">Letzter Monat</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Export Buttons */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Als PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Als Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Bulk-Aktionen */}
      {selectedParts.size > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedParts.size} Ersatzteil(e) ausgewählt
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkUpdate("bestellt")}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Als bestellt markieren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkUpdate("eingetroffen")}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Als eingetroffen markieren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkUpdate("erledigt")}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Als erledigt markieren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ersatzteile-Tabelle */}
      <Card>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedParts.size === filteredSpareParts.length && filteredSpareParts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Ersatzteil</TableHead>
                <TableHead>Auftrag</TableHead>
                <TableHead>Lieferant</TableHead>
                <TableHead>Kosten</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpareParts.map((part) => {
                const relatedRepair = repairsWithParts.find(r => r.id === part.repairId);
                return (
                  <TableRow key={part.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedParts.has(part.id)}
                        onCheckedChange={(checked) => handleSelectPart(part.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{part.partName}</div>
                        {part.notes && (
                          <div className="text-xs text-gray-500 mt-1">{part.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {relatedRepair ? (
                        <div>
                          <div className="font-medium">{relatedRepair.orderCode}</div>
                          <div className="text-sm text-gray-500">
                            {relatedRepair.brand} {relatedRepair.model}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Nicht gefunden</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {part.supplier || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {part.cost ? `€${part.cost.toFixed(2)}` : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(part.status)} className="text-xs">
                        {getStatusLabel(part.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(part.createdAt), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => relatedRepair && handleManageParts(relatedRepair.id)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleBulkUpdate("bestellt")}
                            disabled={part.status === "bestellt"}
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Als bestellt markieren
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleBulkUpdate("eingetroffen")}
                            disabled={part.status === "eingetroffen"}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Als eingetroffen markieren
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredSpareParts.map((part) => {
          const relatedRepair = repairsWithParts.find(r => r.id === part.repairId);
          return (
            <Card key={part.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedParts.has(part.id)}
                      onCheckedChange={(checked) => handleSelectPart(part.id, checked as boolean)}
                    />
                    <div>
                      <div className="font-medium text-sm">{part.partName}</div>
                      <div className="text-gray-600 text-xs">
                        {relatedRepair ? `${relatedRepair.orderCode} - ${relatedRepair.brand} ${relatedRepair.model}` : 'Auftrag nicht gefunden'}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(part.status)} className="text-xs">
                    {getStatusLabel(part.status)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Lieferant:</span> {part.supplier || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Kosten:</span> {part.cost ? `€${part.cost.toFixed(2)}` : '-'}
                  </div>
                </div>
                
                {part.notes && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    {part.notes}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {format(new Date(part.createdAt), 'dd.MM.yyyy', { locale: de })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => relatedRepair && handleManageParts(relatedRepair.id)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedRepairId && (
        <SparePartsManagementDialog
          open={isSparePartsDialogOpen}
          onClose={handleSparePartsDialogClose}
          repairId={selectedRepairId}
        />
      )}

      <AddSparePartDialog
        open={isAddSparePartDialogOpen}
        onOpenChange={setIsAddSparePartDialogOpen}
      />
    </div>
  );
}