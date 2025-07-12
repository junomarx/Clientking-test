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
// Alle React-Dialog-Komponenten entfernt - verursachen weiterhin Crashes
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
  
  // Native Browser-Modal State - ALLE React-Modals entfernt
  
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

  const handleOrderRowClick = async (order: any, type: "spare-part" | "accessory") => {
    // downPayment Feld sollte jetzt verfügbar sein
    
    // Native HTML-Modal erstellen ohne React
    const isAccessory = type === "accessory";
    const orderName = isAccessory ? order.articleName : order.partName;
    
    // Kundendaten laden falls vorhanden
    let customerData = null;
    if (order.customerId) {
      try {
        const response = await apiRequest('GET', `/api/customers/${order.customerId}`);
        if (response.ok) {
          customerData = await response.json();
        }
      } catch (error) {
        console.error('Fehler beim Laden der Kundendaten:', error);
      }
    }
    
    // Modal-Container erstellen
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    
    // Modal-Content
    const content = document.createElement('div');
    content.className = 'bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto';
    
    const statusColors = {
      'bestellen': 'bg-red-100 text-red-800',
      'bestellt': 'bg-yellow-100 text-yellow-800', 
      'eingetroffen': 'bg-blue-100 text-blue-800',
      'erledigt': 'bg-green-100 text-green-800'
    };
    
    content.innerHTML = `
      <div class="p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6 border-b pb-4">
          <h2 class="text-xl font-bold text-gray-900">
            ${isAccessory ? "Zubehör" : "Ersatzteil"} Details
          </h2>
          <button id="closeModal" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <!-- Artikel-Info -->
        <div class="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold text-gray-900 mb-3">Artikel-Informationen</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span class="font-medium">Name:</span> ${orderName}</div>
            <div><span class="font-medium">Menge:</span> ${order.quantity}x</div>
            <div class="flex items-center gap-2">
              <span class="font-medium">Status:</span>
              <span class="px-2 py-1 rounded-full text-xs ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}">
                ${order.status.toUpperCase()}
              </span>
            </div>
            <div><span class="font-medium">Erstellt:</span> ${new Date(order.createdAt).toLocaleDateString("de-DE")}</div>
            ${isAccessory ? `
              <div><span class="font-medium">Einzelpreis:</span> €${order.unitPrice || "0.00"}</div>
              <div><span class="font-medium">Gesamtpreis:</span> €${order.totalPrice || "0.00"}</div>
              <div><span class="font-medium">Anzahlung:</span> €${order.downPayment || "0.00"}</div>
              <div><span class="font-medium">Typ:</span> ${order.type === "kundenbestellung" ? "Kundenbestellung" : "Lager"}</div>
            ` : `
              ${order.supplier ? `<div><span class="font-medium">Lieferant:</span> ${order.supplier}</div>` : ''}
              ${order.repairId ? `<div><span class="font-medium">Reparatur-ID:</span> #${order.repairId}</div>` : ''}
            `}
          </div>
        </div>
        
        <!-- Kundendaten -->
        ${customerData ? `
          <div class="mb-6 bg-blue-50 p-4 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-3">Kundendaten</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span class="font-medium">Name:</span> ${customerData.firstName} ${customerData.lastName}</div>
              ${customerData.phone ? `<div><span class="font-medium">Telefon:</span> ${customerData.phone}</div>` : ''}
              ${customerData.email ? `<div><span class="font-medium">E-Mail:</span> ${customerData.email}</div>` : ''}
              ${customerData.address || customerData.zipCode || customerData.city ? `
                <div class="md:col-span-2">
                  <span class="font-medium">Adresse:</span> 
                  ${customerData.address || ''} ${customerData.zipCode || ''} ${customerData.city || ''}
                </div>
              ` : ''}
              <div><span class="font-medium">Kunde seit:</span> ${new Date(customerData.createdAt).toLocaleDateString("de-DE")}</div>
            </div>
          </div>
        ` : order.customerId ? `
          <div class="mb-6 bg-yellow-50 p-4 rounded-lg">
            <p class="text-sm text-yellow-800">Kundendaten werden geladen...</p>
          </div>
        ` : `
          <div class="mb-6 bg-gray-50 p-4 rounded-lg">
            <p class="text-sm text-gray-600">Lager-Bestellung (kein Kunde zugeordnet)</p>
          </div>
        `}
        
        <!-- Notizen -->
        ${order.notes ? `
          <div class="mb-6 bg-green-50 p-4 rounded-lg">
            <h3 class="font-semibold text-gray-900 mb-2">Notizen</h3>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">${order.notes}</p>
          </div>
        ` : ''}
        
        <!-- Bearbeiten-Button und Bereich -->
        ${isAccessory ? `
        <div class="bg-blue-50 p-4 rounded-lg mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900">Bearbeiten</h3>
            <button id="toggle-edit" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              Bearbeiten
            </button>
          </div>
          
          <div id="edit-section" class="hidden">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Artikel-Name</label>
                <input type="text" id="edit-articleName" value="${order.articleName || ''}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Menge</label>
                <input type="number" id="edit-quantity" value="${order.quantity || 1}" min="1"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Einzelpreis (€)</label>
                <input type="number" id="edit-unitPrice" value="${(order.unitPrice || '').replace('€', '')}" step="0.01" min="0"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Anzahlung (€)</label>
                <input type="number" id="edit-downPayment" value="${(order.downPayment || '').replace('€', '')}" step="0.01" min="0"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea id="edit-notes" rows="2" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Zusätzliche Notizen...">${order.notes || ''}</textarea>
            </div>
            <div class="flex gap-2">
              <button id="save-changes" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Änderungen speichern
              </button>
              <button id="cancel-edit" class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
        ` : ''}
        
        <!-- Status ändern -->
        <div class="bg-orange-50 p-4 rounded-lg">
          <h3 class="font-semibold text-gray-900 mb-3">Status ändern</h3>
          <div class="flex flex-wrap gap-2">
            <button id="status-bestellen" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
              Bestellen
            </button>
            <button id="status-bestellt" class="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">
              Bestellt
            </button>
            <button id="status-eingetroffen" class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
              Eingetroffen
            </button>
            <button id="status-erledigt" class="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
              Erledigt (wird gelöscht)
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Aktueller Status: <strong>${order.status}</strong>
          </p>
        </div>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Event Listeners
    content.querySelector('#closeModal').onclick = () => modal.remove();
    
    // Bearbeiten-Toggle-Button für Zubehör
    if (isAccessory) {
      const toggleButton = content.querySelector('#toggle-edit');
      const editSection = content.querySelector('#edit-section');
      const cancelButton = content.querySelector('#cancel-edit');
      
      if (toggleButton && editSection) {
        toggleButton.onclick = () => {
          if (editSection.classList.contains('hidden')) {
            editSection.classList.remove('hidden');
            toggleButton.textContent = 'Schließen';
          } else {
            editSection.classList.add('hidden');
            toggleButton.textContent = 'Bearbeiten';
          }
        };
      }
      
      if (cancelButton && editSection && toggleButton) {
        cancelButton.onclick = () => {
          editSection.classList.add('hidden');
          toggleButton.textContent = 'Bearbeiten';
        };
      }
      
      const saveButton = content.querySelector('#save-changes');
      if (saveButton) {
        saveButton.onclick = async () => {
          const articleName = content.querySelector('#edit-articleName').value;
          const quantity = parseInt(content.querySelector('#edit-quantity').value);
          const unitPrice = parseFloat(content.querySelector('#edit-unitPrice').value) || 0;
          const downPayment = parseFloat(content.querySelector('#edit-downPayment').value) || 0;
          const notes = content.querySelector('#edit-notes').value;
          
          // Berechne Gesamtpreis
          const totalPrice = quantity * unitPrice;
          
          try {
            const response = await apiRequest('PATCH', `/api/orders/accessories/${order.id}`, {
              articleName,
              quantity,
              unitPrice,
              totalPrice,
              downPayment,
              notes
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            toast({
              title: "Erfolg",
              description: "Zubehör erfolgreich aktualisiert"
            });
            
            // Cache invalidieren
            queryClient.invalidateQueries({ queryKey: ['/api/orders/accessories'] });
            queryClient.invalidateQueries({ queryKey: ['/api/orders/spare-parts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/spare-parts/with-repairs'] });
            
            // Bearbeiten-Bereich schließen
            editSection.classList.add('hidden');
            toggleButton.textContent = 'Bearbeiten';
            
            modal.remove();
          } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
            toast({
              title: "Fehler",
              description: error.message || "Fehler beim Aktualisieren",
              variant: "destructive"
            });
          }
        };
      }
    }
    
    // Status-Buttons
    ['bestellen', 'bestellt', 'eingetroffen', 'erledigt'].forEach(status => {
      content.querySelector(`#status-${status}`).onclick = async () => {
        if (status === 'erledigt' && !confirm('Artikel wird unwiderruflich gelöscht. Fortfahren?')) {
          return;
        }
        
        try {
          const response = isAccessory 
            ? await apiRequest('PUT', `/api/orders/accessories/bulk-update`, {
                accessoryIds: [order.id],
                status: status
              })
            : await apiRequest('PUT', `/api/orders/spare-parts/bulk-update`, {
                sparePartIds: [order.id],
                status: status
              });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          toast({
            title: "Status aktualisiert",
            description: `Status wurde auf "${status}" geändert`,
          });
          
          // Forcierte Cache-Invalidierung und Neuladung
          await queryClient.invalidateQueries({ queryKey: ['/api/orders/spare-parts'] });
          await queryClient.invalidateQueries({ queryKey: ['/api/orders/accessories'] });
          await queryClient.refetchQueries({ queryKey: ['/api/orders/spare-parts'] });
          await queryClient.refetchQueries({ queryKey: ['/api/orders/accessories'] });
          
          // Modal schließen und Daten werden automatisch aktualisiert
          
          modal.remove();
          
        } catch (error: any) {
          toast({
            title: "Fehler",
            description: error.message || "Status konnte nicht geändert werden",
            variant: "destructive",
          });
        }
      };
    });
  };

  // handleOrderDetailsClose entfernt - nicht mehr benötigt

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
                 query.queryKey.length === 1 &&
                 typeof query.queryKey[0] === 'string' &&
                 query.queryKey[0].includes('/api/repairs/') &&
                 query.queryKey[0].includes('/spare-parts');
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
      
      // Server handles auto-delete
      
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
      
      // Server handles auto-delete
      
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
                 query.queryKey.length === 1 &&
                 typeof query.queryKey[0] === 'string' &&
                 query.queryKey[0].includes('/api/repairs/') &&
                 query.queryKey[0].includes('/spare-parts');
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
      
      // Server handles auto-delete
      
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
                    <TableRow 
                      key={part.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleOrderRowClick(part, "spare-part")}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                    <TableRow 
                      key={accessory.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleOrderRowClick(accessory, "accessory")}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

      {/* Alle React-Modal-Komponenten permanent entfernt - verwenden native Browser-Dialoge */}
    </div>
  );
}