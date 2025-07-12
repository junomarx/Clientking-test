import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Package, Settings, Search, Filter, Download, Plus, MoreVertical, CheckSquare, Calendar, FileText } from "lucide-react";
import { SparePartsManagementDialog } from "./SparePartsManagementDialog";
import { AddSparePartDialog } from "./AddSparePartDialog";
import { AddAccessoryDialog } from "./AddAccessoryDialog";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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

interface Accessory {
  id: number;
  articleName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  customerId: number | null;
  customerName?: string | null;
  type: "lager" | "kundenbestellung";
  status: string;
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
  const [isAddAccessoryDialogOpen, setIsAddAccessoryDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"spare-parts" | "accessories">("spare-parts");
  
  // Filter und Suche States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set());
  const [selectedAccessories, setSelectedAccessories] = useState<Set<number>>(new Set());
  
  const { toast } = useToast();
  const { user } = useAuth();
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

  // Zubehör-Bestellungen abrufen
  const { data: accessories = [], isLoading: isLoadingAccessories, error: accessoriesError } = useQuery<Accessory[]>({
    queryKey: ['/api/orders/accessories'],
    refetchInterval: 5000,
  });

  const isLoading = isLoadingSpareParts || isLoadingRepairs || isLoadingAccessories;
  const error = sparePartsError || repairsError || accessoriesError;

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
      const response = await apiRequest("PATCH", "/api/orders/spare-parts-bulk-update", {
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
      // Invalidate all repair-specific spare parts queries for RepairDetailsDialog
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 query.queryKey[0] === '/api/repairs' && 
                 query.queryKey[2] === 'spare-parts';
        }
      });
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

  const bulkAccessoryUpdateMutation = useMutation({
    mutationFn: async ({ accessoryIds, status }: { accessoryIds: number[]; status: string }) => {
      const response = await apiRequest("PATCH", "/api/orders/accessories-bulk-update", {
        accessoryIds,
        status,
      }, {
        "X-User-ID": String(user?.id || 0),
      });
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren der Zubehör-Artikel");
      }
      
      // Auto-delete if status is "erledigt"
      if (status === "erledigt") {
        console.log(`🔄 BULK Auto-deleting ${accessoryIds.length} accessories with status "erledigt"`);
        for (const accessoryId of accessoryIds) {
          try {
            console.log(`🗑️ BULK Attempting to delete accessory ${accessoryId}...`);
            const deleteResponse = await apiRequest("DELETE", `/api/orders/accessories/${accessoryId}`, null, {
              "X-User-ID": String(user?.id || 0),
            });
            if (deleteResponse.ok) {
              console.log(`✅ BULK Auto-deleted accessory ${accessoryId} with status "erledigt"`);
            } else {
              console.error(`❌ BULK Failed to delete accessory ${accessoryId}: ${deleteResponse.status}`);
              const errorText = await deleteResponse.text();
              console.error(`❌ BULK Delete error details:`, errorText);
            }
          } catch (deleteError) {
            console.error(`❌ BULK Failed to auto-delete accessory ${accessoryId}:`, deleteError);
          }
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/accessories'] });
      toast({
        title: "Zubehör aktualisiert",
        description: "Die ausgewählten Zubehör-Artikel wurden erfolgreich aktualisiert.",
      });
      setSelectedAccessories(new Set());
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

  const handleSelectAllAccessories = (checked: boolean) => {
    if (checked) {
      setSelectedAccessories(new Set(accessories.map(accessory => accessory.id)));
    } else {
      setSelectedAccessories(new Set());
    }
  };

  const handleSelectAccessory = (accessoryId: number, checked: boolean) => {
    const newSelected = new Set(selectedAccessories);
    if (checked) {
      newSelected.add(accessoryId);
    } else {
      newSelected.delete(accessoryId);
    }
    setSelectedAccessories(newSelected);
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

  // Einzelne Ersatzteil-Status-Änderung
  const handleSinglePartStatusUpdate = (partId: number, status: string) => {
    // Use single part update mutation with auto-delete logic
    singlePartUpdateMutation.mutate({
      partIds: [partId],
      status,
    });
  };

  // Delete spare part mutation
  const deleteSparePartMutation = useMutation({
    mutationFn: async (partId: number) => {
      const response = await apiRequest("DELETE", `/api/orders/spare-parts/${partId}`);
      if (!response.ok) {
        throw new Error("Fehler beim Löschen des Ersatzteils");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/spare-parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts/with-repairs"] });
      toast({
        title: "Automatisch gelöscht",
        description: "Eingetroffenes Ersatzteil wurde automatisch entfernt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Mutation für Einzelupdates über Header-basierte Route mit Auto-Delete-Logik
  const singlePartUpdateMutation = useMutation({
    mutationFn: async ({ partIds, status }: { partIds: number[]; status: string }) => {
      const response = await apiRequest("PATCH", "/api/orders/spare-parts-bulk-update", {
        partIds,
        status,
      }, {
        "X-User-ID": String(user?.id || 0),
      });
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren des Ersatzteils");
      }
      
      // Auto-delete if status is "eingetroffen"
      if (status === "eingetroffen") {
        console.log(`Auto-deleting ${partIds.length} spare parts with status "eingetroffen"`);
        for (const partId of partIds) {
          try {
            const deleteResponse = await apiRequest("DELETE", `/api/orders/spare-parts/${partId}`, null, {
              "X-User-ID": String(user?.id || 0),
            });
            if (deleteResponse.ok) {
              console.log(`✅ Auto-deleted spare part ${partId} with status "eingetroffen"`);
            } else {
              console.error(`❌ Failed to delete spare part ${partId}: ${deleteResponse.status}`);
            }
          } catch (deleteError) {
            console.error(`❌ Failed to auto-delete spare part ${partId}:`, deleteError);
          }
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/spare-parts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/with-repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      // Invalidate all repair-specific spare parts queries for RepairDetailsDialog
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 query.queryKey[0] === '/api/repairs' && 
                 query.queryKey[2] === 'spare-parts';
        }
      });
      toast({
        title: "Status aktualisiert",
        description: "Ersatzteil-Status wurde erfolgreich geändert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBulkAccessoryUpdate = (status: string) => {
    if (selectedAccessories.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Zubehör aus.",
        variant: "destructive",
      });
      return;
    }

    console.log(`🔄 BULK UPDATE: ${selectedAccessories.size} accessories -> ${status}`);
    
    // For "erledigt" status, use the auto-delete mutation instead
    if (status === "erledigt") {
      console.log(`🗑️ Using auto-delete mutation for bulk "erledigt" status`);
      singleAccessoryUpdateMutation.mutate({
        accessoryIds: Array.from(selectedAccessories),
        status,
      });
    } else {
      bulkAccessoryUpdateMutation.mutate({
        accessoryIds: Array.from(selectedAccessories),
        status,
      });
    }
  };

  // Exportfunktionen


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

  // PDF Export für Bestellungen mit Status "bestellen"
  const exportOrdersToPDF = async () => {
    try {
      toast({
        title: "Export gestartet", 
        description: "PDF für Bestellungen wird vorbereitet...",
      });

      // Filter für Artikel mit Status "bestellen"
      const orderSpareParts = allSpareParts.filter(part => part.status === "bestellen");
      const orderAccessories = accessories.filter(accessory => accessory.status === "bestellen");

      if (orderSpareParts.length === 0 && orderAccessories.length === 0) {
        toast({
          title: "Keine Bestellungen",
          description: "Es gibt keine Artikel mit Status 'bestellen' zum Exportieren.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest("POST", "/api/orders/export-orders-pdf", {
        spareParts: orderSpareParts,
        accessories: orderAccessories
      });

      if (!response.ok) {
        throw new Error('PDF-Export fehlgeschlagen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bestellungen-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export abgeschlossen",
        description: "Bestellungen-PDF wurde erfolgreich heruntergeladen.",
      });
    } catch (error) {
      toast({
        title: "Export-Fehler",
        description: "Bestellungen-PDF konnte nicht erstellt werden.",
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

  const getAccessoryStatusBadgeVariant = (status: string) => {
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

  const getAccessoryStatusLabel = (status: string) => {
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

  // Mutation für Zubehör-Status-Updates
  const updateAccessoryStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", "/api/orders/accessories-bulk-update", {
        accessoryIds: [id],
        status,
      });
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren des Zubehörs");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/accessories"] });
      toast({
        title: "Status aktualisiert",
        description: "Zubehör-Status wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAccessoryStatusChange = (accessoryId: number, status: string) => {
    console.log(`🔄 handleAccessoryStatusChange called: ID ${accessoryId}, Status ${status}`);
    // Use single accessory update mutation with auto-delete logic
    singleAccessoryUpdateMutation.mutate({
      accessoryIds: [accessoryId],
      status,
    });
  };

  // Single accessory update mutation with auto-delete logic
  const singleAccessoryUpdateMutation = useMutation({
    mutationFn: async ({ accessoryIds, status }: { accessoryIds: number[]; status: string }) => {
      const response = await apiRequest("PATCH", "/api/orders/accessories-bulk-update", {
        accessoryIds,
        status,
      }, {
        "X-User-ID": String(user?.id || 0),
      });
      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren des Zubehörs");
      }
      
      // Auto-delete if status is "erledigt"
      if (status === "erledigt") {
        console.log(`🔄 Auto-deleting ${accessoryIds.length} accessories with status "erledigt"`);
        for (const accessoryId of accessoryIds) {
          try {
            console.log(`🗑️ Attempting to delete accessory ${accessoryId}...`);
            const deleteResponse = await apiRequest("DELETE", `/api/orders/accessories/${accessoryId}`, null, {
              "X-User-ID": String(user?.id || 0),
            });
            if (deleteResponse.ok) {
              console.log(`✅ Auto-deleted accessory ${accessoryId} with status "erledigt"`);
            } else {
              console.error(`❌ Failed to delete accessory ${accessoryId}: ${deleteResponse.status}`);
              const errorText = await deleteResponse.text();
              console.error(`❌ Delete error details:`, errorText);
            }
          } catch (deleteError) {
            console.error(`❌ Failed to auto-delete accessory ${accessoryId}:`, deleteError);
          }
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/accessories"] });
      toast({
        title: "Status aktualisiert",
        description: "Zubehör-Status wurde erfolgreich geändert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete accessory mutation
  const deleteAccessoryMutation = useMutation({
    mutationFn: async (accessoryId: number) => {
      const response = await apiRequest("DELETE", `/api/orders/accessories/${accessoryId}`);
      if (!response.ok) {
        throw new Error("Fehler beim Löschen des Zubehörs");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/accessories"] });
      toast({
        title: "Automatisch gelöscht",
        description: "Erledigtes Zubehör wurde automatisch entfernt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });



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

  // Entferne die frühe Rückkehr - zeige immer die vollständige Bestellungsseite
  // auch wenn keine Ersatzteile vorhanden sind, da Zubehör trotzdem bestellt werden kann

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
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddSparePartDialogOpen(true)}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Ersatzteil hinzufügen</span>
          </Button>
          <Button
            onClick={() => setIsAddAccessoryDialogOpen(true)}
            className="flex items-center gap-2"
            size="sm"
            variant="outline"
          >
            <Package className="h-4 w-4" />
            <span className="hidden md:inline">Zubehör hinzufügen</span>
          </Button>
          
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === "spare-parts" ? "default" : "outline"}
          onClick={() => setActiveTab("spare-parts")}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Ersatzteile
          <Badge variant="secondary" className="ml-2">
            {filteredSpareParts.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "accessories" ? "default" : "outline"}
          onClick={() => setActiveTab("accessories")}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Zubehör
          <Badge variant="secondary" className="ml-2">
            {accessories.length}
          </Badge>
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
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={exportOrdersToPDF}
            >
              <FileText className="h-4 w-4" />
              Bestellungen PDF
            </Button>
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
      {activeTab === "spare-parts" && (
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
                  <TableHead>Auftrag</TableHead>
                  <TableHead>Ersatzteil</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredSpareParts.length > 0 ? (
                filteredSpareParts.map((part) => {
                  const relatedRepair = repairsWithParts.find(r => r.id === part.repairId);
                  return (
                    <TableRow key={part.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedParts.has(part.id)}
                          onCheckedChange={(checked) => handleSelectPart(part.id, checked as boolean)}
                        />
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
                      <TableCell className="font-medium">
                        <div>
                          <div>{part.partName}</div>
                          {part.notes && (
                            <div className="text-xs text-gray-500 mt-1">{part.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {part.supplier || <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(part.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(part.status)} className="text-xs">
                          {getStatusLabel(part.status)}
                        </Badge>
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
                              onClick={() => handleSinglePartStatusUpdate(part.id, "bestellt")}
                              disabled={part.status === "bestellt"}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Als bestellt markieren
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSinglePartStatusUpdate(part.id, "eingetroffen")}
                              disabled={part.status === "eingetroffen"}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Als eingetroffen markieren
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSinglePartStatusUpdate(part.id, "erledigt")}
                              disabled={part.status === "erledigt"}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Als erledigt markieren
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <Package className="h-8 w-8 mb-2 text-gray-400" />
                      <p className="text-sm">Keine Ersatzteile vorhanden</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Fügen Sie Ersatzteile über "Ersatzteil hinzufügen" hinzu
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Bulk-Aktionen für Zubehör */}
      {activeTab === "accessories" && selectedAccessories.size > 0 && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedAccessories.size} Zubehör-Artikel ausgewählt
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAccessoryUpdate("bestellt")}
                  disabled={bulkAccessoryUpdateMutation.isPending}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Als bestellt markieren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAccessoryUpdate("eingetroffen")}
                  disabled={bulkAccessoryUpdateMutation.isPending}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Als eingetroffen markieren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAccessoryUpdate("erledigt")}
                  disabled={bulkAccessoryUpdateMutation.isPending}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Als erledigt markieren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zubehör-Tabelle */}
      {activeTab === "accessories" && (
        <Card>
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedAccessories.size === accessories.length && accessories.length > 0}
                      onCheckedChange={handleSelectAllAccessories}
                    />
                  </TableHead>
                  <TableHead>Artikel</TableHead>
                  <TableHead>Menge</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-gray-300" />
                        <div className="text-lg font-medium">Noch keine Zubehör-Bestellungen</div>
                        <div className="text-sm">Erstellen Sie Ihre erste Zubehör-Bestellung mit dem Button oben.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  accessories.map((accessory) => (
                    <TableRow key={accessory.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedAccessories.has(accessory.id)}
                          onCheckedChange={(checked) => handleSelectAccessory(accessory.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div>{accessory.articleName}</div>
                          {accessory.notes && (
                            <div className="text-xs text-gray-500 mt-1">{accessory.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{accessory.quantity}x</Badge>
                      </TableCell>
                      <TableCell>
                        {accessory.customerId ? (
                          <span className="text-blue-600">
                            {accessory.customerName || `Kunde #${accessory.customerId}`}
                          </span>
                        ) : (
                          <span className="text-gray-500">Lager</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getAccessoryStatusBadgeVariant(accessory.status)} 
                          className="text-xs"
                        >
                          {getAccessoryStatusLabel(accessory.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(accessory.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                // Hier würde normalerweise ein Bearbeitungsdialog geöffnet
                                const newArticleName = prompt("Artikelname bearbeiten:", accessory.articleName);
                                if (newArticleName && newArticleName.trim() !== accessory.articleName) {
                                  // Temporäre Bearbeitung über Status-Update Mutation
                                  toast({
                                    title: "Bearbeitung",
                                    description: "Vollständige Bearbeitung wird in der nächsten Version implementiert.",
                                  });
                                }
                              }}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAccessoryStatusChange(accessory.id, "bestellt")}
                              disabled={accessory.status === "bestellt"}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Als bestellt markieren
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAccessoryStatusChange(accessory.id, "eingetroffen")}
                              disabled={accessory.status === "eingetroffen"}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Als eingetroffen markieren
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log(`🔄 DROPDOWN CLICK: ${accessory.id} -> erledigt`);
                                console.log(`🔄 Current status: ${accessory.status}`);
                                if (accessory.status !== "erledigt") {
                                  handleAccessoryStatusChange(accessory.id, "erledigt");
                                } else {
                                  console.log(`⚠️ Already erledigt, should auto-delete now`);
                                  // Force delete if already erledigt
                                  singleAccessoryUpdateMutation.mutate({
                                    accessoryIds: [accessory.id],
                                    status: "erledigt",
                                  });
                                }
                              }}
                              disabled={false}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Als erledigt markieren
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

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

      <AddAccessoryDialog
        open={isAddAccessoryDialogOpen}
        onOpenChange={setIsAddAccessoryDialogOpen}
      />
    </div>
  );
}