import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Search, Filter, AlertCircle, Smartphone, Tablet, Laptop, Watch, Gamepad2, X, Factory, Layers, RefreshCcw, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import DeviceDataCSVImportExport from "./DeviceDataCSVImportExport";

// Interfaces für Geräte

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
  // Virtuelle Eigenschaft für Gerätetyp-Name
  deviceTypeName?: string;
}

interface DeviceIssue {
  id: number;
  title: string;
  description: string;
  deviceType: string;
  solution?: string;
  severity: string;
  isCommon: boolean;
  isGlobal: boolean;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

interface ErrorCatalogEntry {
  id: number;
  errorText: string;
  forSmartphone: boolean;
  forTablet: boolean;
  forLaptop: boolean;
  forSmartwatch: boolean;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

interface Model {
  id: number;
  name: string;
  brandId: number;
  modelSeriesId?: number;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
  // Virtuelle Eigenschaften für Anzeigezwecke
  brandName?: string;
  deviceTypeName?: string;
}

interface UserDeviceType {
  id: number;
  name: string;
  userId: number;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

export default function SuperadminDevicesTab() {
  const { toast } = useToast();

  const { data: deviceTypes } = useQuery<string[]>({
    queryKey: ["/api/superadmin/device-types"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });

  // State für Gerätetypen-Verwaltung
  const [deviceTypeSearchTerm, setDeviceTypeSearchTerm] = useState("");
  const [isCreateDeviceTypeOpen, setIsCreateDeviceTypeOpen] = useState(false);
  const [isEditDeviceTypeOpen, setIsEditDeviceTypeOpen] = useState(false);
  const [deviceTypeForm, setDeviceTypeForm] = useState({ name: "" });
  
  // State für Markenverwaltung
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [selectedBrandDeviceType, setSelectedBrandDeviceType] = useState<string | null>(null);
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [selectAllBrands, setSelectAllBrands] = useState(false);
  const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: "", deviceTypeId: 0 });
  
  // State für Modellverwaltung
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  const [selectedModelDeviceType, setSelectedModelDeviceType] = useState<string | null>(null);
  const [selectedModelBrandId, setSelectedModelBrandId] = useState<number | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectAllModels, setSelectAllModels] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ name: "", brandId: 0 });
  
  // State für Fehlerkatalog-Verwaltung (Alt)
  const [issueSearchTerm, setIssueSearchTerm] = useState("");
  const [selectedIssueDeviceType, setSelectedIssueDeviceType] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<number[]>([]);
  const [selectAllIssues, setSelectAllIssues] = useState(false);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ 
    title: "", 
    description: "", 
    deviceType: "",
    solution: "",
    severity: "medium",
    isCommon: false 
  });
  const [isBulkImportIssuesOpen, setIsBulkImportIssuesOpen] = useState(false);
  const [selectedDeviceTypeForBulkIssues, setSelectedDeviceTypeForBulkIssues] = useState("");
  const [bulkIssueText, setBulkIssueText] = useState("");
  
  // State für den neuen Fehlerkatalog
  const [errorCatalogSearchTerm, setErrorCatalogSearchTerm] = useState("");
  const [selectedErrorCatalogIds, setSelectedErrorCatalogIds] = useState<number[]>([]);
  const [selectAllErrorCatalog, setSelectAllErrorCatalog] = useState(false);
  const [isCreateErrorCatalogEntryOpen, setIsCreateErrorCatalogEntryOpen] = useState(false);
  const [errorCatalogEntryForm, setErrorCatalogEntryForm] = useState({
    errorText: "",
    forSmartphone: false,
    forTablet: false,
    forLaptop: false,
    forSmartwatch: false
  });
  const [isBulkImportErrorCatalogOpen, setIsBulkImportErrorCatalogOpen] = useState(false);
  const [bulkErrorCatalogText, setBulkErrorCatalogText] = useState("");
  
  // API-Abfrage: Alle Gerätetypen abrufen
  const { data: deviceTypesList, isLoading: isLoadingDeviceTypesList, refetch: refetchDeviceTypesList } = useQuery<string[]>({
    queryKey: ["/api/superadmin/device-types"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });
  
  // API-Abfrage: Alle Marken abrufen
  const { data: brandsData, isLoading: isLoadingBrands, refetch: refetchBrands } = useQuery<Brand[]>({
    queryKey: ["/api/superadmin/brands"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });
  
  // Da wir auch die IDs der Gerätetypen benötigen, müssen wir sie direkt abfragen
  // Wir verwenden die URL ohne "-" für die API-Anfrage
  const { data: userDeviceTypes, refetch: refetchUserDeviceTypes } = useQuery<UserDeviceType[]>({
    queryKey: ["/api/superadmin/device-types/all"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });
  
  // API-Abfrage: Alle Modelle abrufen
  const { data: modelsData, isLoading: isLoadingModels, refetch: refetchModels } = useQuery<Model[]>({
    queryKey: ["/api/superadmin/models"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });
  
  // API-Abfrage: Alle Fehler im Fehlerkatalog abrufen
  const { data: issuesData, isLoading: isLoadingIssues, refetch: refetchIssues } = useQuery<DeviceIssue[]>({
    queryKey: ["/api/superadmin/device-issues"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });
  
  // API-Abfrage: Alle Einträge im NEUEN Fehlerkatalog abrufen
  const { data: errorCatalogData, isLoading: isLoadingErrorCatalog, refetch: refetchErrorCatalog } = useQuery<ErrorCatalogEntry[]>({
    queryKey: ["/api/superadmin/error-catalog"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });
  
  // API-Abfrage: Gerätestatistiken abrufen
  const { data: deviceStatistics, isLoading: isLoadingStatistics } = useQuery<{
    totalDeviceTypes: number;
    totalBrands: number;
    totalModels: number;
    deviceTypeStats: Array<{
      name: string;
      brandCount: number;
      modelCount: number;
      brands: Array<{
        name: string;
        modelCount: number;
      }>;
    }>;
  }>({
    queryKey: ["/api/superadmin/device-statistics"],
    enabled: true,
    staleTime: 0,
  });
  
  // Mutation zum Erstellen eines neuen Gerätetyps
  const createDeviceTypeMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-types', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Gerätetyps');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      toast({
        title: "Erfolg",
        description: "Gerätetyp wurde erfolgreich erstellt.",
      });
      setIsCreateDeviceTypeOpen(false);
      setDeviceTypeForm({ name: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Aktualisieren eines Gerätetyps
  const updateDeviceTypeMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/device-types/${encodeURIComponent(oldName)}`, { name: newName });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Gerätetyps');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      toast({
        title: "Erfolg",
        description: "Gerätetyp wurde erfolgreich aktualisiert.",
      });
      setIsEditDeviceTypeOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen eines Gerätetyps
  const deleteDeviceTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-types/${encodeURIComponent(name)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Gerätetyps');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      toast({
        title: "Erfolg",
        description: "Gerätetyp wurde erfolgreich gelöscht.",
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
  
  // Handler für Gerätetypen-Management
  const handleCreateDeviceType = () => {
    setDeviceTypeForm({ name: "" });
    setIsCreateDeviceTypeOpen(true);
  };
  
  const handleEditDeviceType = (name: string) => {
    setDeviceTypeForm({ name });
    setIsEditDeviceTypeOpen(true);
  };
  
  const handleDeleteDeviceType = (name: string) => {
    if (confirm(`Möchten Sie den Gerätetyp "${name}" wirklich löschen?`)) {
      deleteDeviceTypeMutation.mutate(name);
    }
  };
  
  const handleSubmitCreateDeviceType = () => {
    if (!deviceTypeForm.name) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den Gerätetyp ein.",
        variant: "destructive",
      });
      return;
    }
    createDeviceTypeMutation.mutate({ name: deviceTypeForm.name });
  };
  
  const handleSubmitEditDeviceType = () => {
    if (!deviceTypeForm.name) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den Gerätetyp ein.",
        variant: "destructive",
      });
      return;
    }
    
    updateDeviceTypeMutation.mutate({
      oldName: deviceTypeForm.name,
      newName: deviceTypeForm.name,
    });
  };
  
  // Icon-Funktion basierend auf dem Gerätetyp
  const getDeviceTypeIcon = (type: string) => {
    const iconProps = { className: "h-5 w-5" };
    const normalizedType = type.toLowerCase();
    
    if (normalizedType.includes("smartphone") || normalizedType.includes("handy") || normalizedType.includes("phone")) {
      return <Smartphone {...iconProps} />;
    } else if (normalizedType.includes("tablet") || normalizedType.includes("pad")) {
      return <Tablet {...iconProps} />;
    } else if (normalizedType.includes("laptop") || normalizedType.includes("computer") || normalizedType.includes("pc")) {
      return <Laptop {...iconProps} />;
    } else if (normalizedType.includes("watch") || normalizedType.includes("uhr")) {
      return <Watch {...iconProps} />;
    } else if (normalizedType.includes("spielekonsole") || normalizedType.includes("konsole") || normalizedType.includes("console") || normalizedType.includes("gaming") || normalizedType.includes("spielekonsole")) {
      return <Gamepad2 {...iconProps} />;
    } else {
      return <Smartphone {...iconProps} />; // Default-Icon
    }
  };
  
  // Mutation zum Löschen einer Marke
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/brands/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Marke');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      toast({
        title: "Erfolg",
        description: "Marke wurde erfolgreich gelöscht.",
      });
      // Auswahl zurücksetzen
      setSelectedBrandIds([]);
      setSelectAllBrands(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen mehrerer Marken
  const deleteBulkBrandsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermmitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      console.log('Sende folgende Marken-IDs zum Löschen:', numericIds);
      
      const response = await apiRequest('POST', '/api/superadmin/brands/bulk-delete', { 
        ids: numericIds 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Marken');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      toast({
        title: "Erfolg",
        description: `${data.deletedCount} Marken wurden erfolgreich gelöscht.`,
      });
      // Auswahl zurücksetzen
      setSelectedBrandIds([]);
      setSelectAllBrands(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Erstellen einer neuen Marke
  const createBrandMutation = useMutation({
    mutationFn: async (data: { name: string, deviceTypeId: number }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-brands/bulk', {
        brands: [{ name: data.name, deviceTypeId: data.deviceTypeId }]
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen der Marke');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      toast({
        title: "Erfolg",
        description: "Marke wurde erfolgreich erstellt.",
      });
      setIsCreateBrandOpen(false);
      setBrandForm({ name: "", deviceTypeId: 0 });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler für Marken-Management
  const handleCreateBrand = () => {
    setBrandForm({ name: "", deviceTypeId: 0 });
    setIsCreateBrandOpen(true);
  };

  const handleSubmitCreateBrand = () => {
    if (!brandForm.name || !brandForm.deviceTypeId) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    createBrandMutation.mutate({ name: brandForm.name, deviceTypeId: brandForm.deviceTypeId });
  };

  const handleDeleteBrand = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie diese Marke löschen möchten?')) {
      deleteBrandMutation.mutate(id);
    }
  };
  
  // Handler für Mehrfachauswahl von Marken
  const handleToggleBrandSelection = (id: number) => {
    setSelectedBrandIds(prev => {
      if (prev.includes(id)) {
        // Wenn ID bereits in der Auswahl ist, entfernen wir sie
        return prev.filter(brandId => brandId !== id);
      } else {
        // Wenn ID noch nicht in der Auswahl ist, fügen wir sie hinzu
        return [...prev, id];
      }
    });
  };
  
  // Handler für "Alle auswählen"-Checkbox bei Marken
  const handleToggleSelectAllBrands = () => {
    if (selectAllBrands) {
      // Wenn alle ausgewählt sind, Auswahl aufheben
      setSelectedBrandIds([]);
      setSelectAllBrands(false);
    } else {
      // Sonst alle auswählen (gefilterte Marken)
      const filteredBrandIds = brandsData
        ?.filter(brand => {
          // Filterung nach Markennamen
          const nameMatches = brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase());
          
          // Filterung nach Gerätetyp, falls ausgewählt
          const typeInfo = userDeviceTypes?.find(type => type.id === brand.deviceTypeId);
          const deviceTypeName = typeInfo?.name || 'Smartphone';
          // Case-insensitive Vergleich für Gerätetypen
          const typeMatches = !selectedBrandDeviceType || 
                             deviceTypeName.toLowerCase() === selectedBrandDeviceType.toLowerCase();
          
          return nameMatches && typeMatches;
        })
        .map(brand => brand.id) || [];
      
      setSelectedBrandIds(filteredBrandIds);
      setSelectAllBrands(true);
    }
  };
  
  // Handler für das Löschen ausgewählter Marken
  const handleDeleteSelectedBrands = async () => {
    if (selectedBrandIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens eine Marke aus."
      });
      return;
    }
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedBrandIds.length} ausgewählte Marken löschen möchten?`)) {
      try {
        // Toast anzeigen, dass der Löschvorgang läuft
        toast({
          title: "Löschvorgang läuft",
          description: `${selectedBrandIds.length} Marken werden gelöscht...`
        });
        
        // Statt einzelner Löschvorgänge verwenden wir den Bulk-Endpoint
        await deleteBulkBrandsMutation.mutateAsync(selectedBrandIds);
      } catch (error) {
        console.error("Fehler beim Löschen von Marken:", error);
        toast({
          title: "Fehler",
          description: "Beim Löschen der Marken ist ein Fehler aufgetreten.",
          variant: "destructive"
        });
      }
    }
  };
  
  // Mutation zum Erstellen eines Fehlereintrags
  const createIssueMutation = useMutation({
    mutationFn: async (data: { 
      title: string; 
      description: string; 
      deviceType: string;
      solution?: string;
      severity?: string;
      isCommon?: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Fehlereintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich erstellt.",
      });
      setIsCreateIssueOpen(false);
      setIssueForm({ 
        title: "", 
        description: "", 
        deviceType: "",
        solution: "",
        severity: "medium",
        isCommon: false
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
  
  // Mutation zum Löschen eines Fehlereintrags
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Fehlereintrags');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich gelöscht.",
      });
      // Auswahl zurücksetzen
      setSelectedIssueIds([]);
      setSelectAllIssues(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen mehrerer Fehlereinträge
  const deleteBulkIssuesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermmitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      const response = await apiRequest('POST', '/api/superadmin/device-issues/bulk-delete', { 
        ids: numericIds 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: `${data.deletedIds?.length || 0} Fehlereinträge wurden erfolgreich gelöscht.`,
      });
      // Auswahl zurücksetzen
      setSelectedIssueIds([]);
      setSelectAllIssues(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Bulk-Import von Fehlereinträgen
  const bulkImportIssuesMutation = useMutation({
    mutationFn: async (data: { deviceType: string; issues: string[] }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues/bulk', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Importieren der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: `${data.results?.success || 0} Fehlereinträge wurden erfolgreich importiert.`,
      });
      setIsBulkImportIssuesOpen(false);
      setBulkIssueText("");
      setSelectedDeviceTypeForBulkIssues("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handler-Funktionen für Fehlerkatalog
  const handleCreateIssue = () => {
    setIssueForm({ 
      title: "", 
      description: "", 
      deviceType: "",
      solution: "",
      severity: "medium",
      isCommon: false 
    });
    setIsCreateIssueOpen(true);
  };
  
  const handleDeleteIssue = (id: number) => {
    if (confirm("Möchten Sie diesen Fehlereintrag wirklich löschen?")) {
      deleteIssueMutation.mutate(id);
    }
  };
  
  const handleToggleIssueSelection = (id: number) => {
    setSelectedIssueIds(prevIds => {
      if (prevIds.includes(id)) {
        return prevIds.filter(item => item !== id);
      } else {
        return [...prevIds, id];
      }
    });
  };
  
  const handleToggleSelectAllIssues = (checked: boolean | "indeterminate") => {
    setSelectAllIssues(checked === true);
    if (checked === true && issuesData) {
      const filteredIssueIds = issuesData
        .filter(issue => {
          const textMatches = issue.title.toLowerCase().includes(issueSearchTerm.toLowerCase()) || 
                            issue.description.toLowerCase().includes(issueSearchTerm.toLowerCase());
          const typeMatches = !selectedIssueDeviceType || 
                             issue.deviceType.toLowerCase() === selectedIssueDeviceType.toLowerCase();
          return textMatches && typeMatches;
        })
        .map(issue => issue.id);
      setSelectedIssueIds(filteredIssueIds);
    } else {
      setSelectedIssueIds([]);
    }
  };
  
  const handleDeleteSelectedIssues = () => {
    if (selectedIssueIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens einen Fehlereintrag aus."
      });
      return;
    }
    
    if (confirm(`Möchten Sie die ausgewählten ${selectedIssueIds.length} Fehlereinträge wirklich löschen?`)) {
      deleteBulkIssuesMutation.mutate(selectedIssueIds);
    }
  };
  
  const handleBulkImportIssues = () => {
    setBulkIssueText("");
    setSelectedDeviceTypeForBulkIssues("");
    setIsBulkImportIssuesOpen(true);
  };
  
  const handleSubmitCreateIssue = () => {
    if (!issueForm.title || !issueForm.description || !issueForm.deviceType) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    
    createIssueMutation.mutate(issueForm);
  };
  
  const handleSubmitBulkImportIssues = () => {
    if (!selectedDeviceTypeForBulkIssues) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }
    
    if (!bulkIssueText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens einen Fehlereintrag ein.",
        variant: "destructive",
      });
      return;
    }
    
    // Text in Zeilen aufteilen und leere Zeilen filtern
    const issues = bulkIssueText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (issues.length === 0) {
      toast({
        title: "Fehler",
        description: "Keine gültigen Fehlereinträge gefunden.",
        variant: "destructive",
      });
      return;
    }
    
    bulkImportIssuesMutation.mutate({
      deviceType: selectedDeviceTypeForBulkIssues,
      issues
    });
  };
  
  // Mutation zum Löschen eines Modells
  const deleteModelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/models/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Modells');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Erfolg",
        description: "Modell wurde erfolgreich gelöscht.",
      });
      // Auswahl zurücksetzen
      setSelectedModelIds([]);
      setSelectAllModels(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen mehrerer Modelle
  const deleteBulkModelsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermmitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      console.log('Sende folgende Modell-IDs zum Löschen:', numericIds);
      
      const response = await apiRequest('POST', '/api/superadmin/models/bulk-delete', { 
        ids: numericIds 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Modelle');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Erfolg",
        description: `${data.deletedCount} Modelle wurden erfolgreich gelöscht.`,
      });
      // Auswahl zurücksetzen
      setSelectedModelIds([]);
      setSelectAllModels(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation zum Erstellen eines neuen Modells
  const createModelMutation = useMutation({
    mutationFn: async (data: { name: string, brandId: number }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-models/bulk', {
        models: [{ name: data.name, brandId: data.brandId }]
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Modells');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Erfolg",
        description: "Modell wurde erfolgreich erstellt.",
      });
      setIsCreateModelOpen(false);
      setModelForm({ name: "", brandId: 0 });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handler für Modell-Management
  const handleCreateModel = () => {
    setModelForm({ name: "", brandId: 0 });
    setIsCreateModelOpen(true);
  };

  const handleSubmitCreateModel = () => {
    if (!modelForm.name || !modelForm.brandId) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    createModelMutation.mutate({ name: modelForm.name, brandId: modelForm.brandId });
  };
  
  // Bulk-Import für Modelle
  const [isBulkImportModelsOpen, setIsBulkImportModelsOpen] = useState(false);
  const [bulkModelsText, setBulkModelsText] = useState("");
  const [selectedBrandForBulk, setSelectedBrandForBulk] = useState<number | null>(null);
  
  // Mutation für Bulk-Import von Modellen
  const bulkImportModelsMutation = useMutation({
    mutationFn: async (data: { models: { name: string; brandId: number }[] }) => {
      const response = await apiRequest("POST", "/api/superadmin/models/bulk-import", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Massenimport von Modellen');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Erfolg",
        description: data.message || `${data.importedCount} Modelle wurden erfolgreich importiert.`,
      });
      setIsBulkImportModelsOpen(false);
      setBulkModelsText("");
      setSelectedBrandForBulk(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleBulkImportModels = () => {
    setIsBulkImportModelsOpen(true);
    setSelectedBrandForBulk(null);
    setBulkModelsText("");
  };
  
  const handleSubmitBulkImportModels = () => {
    if (!selectedBrandForBulk) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Marke aus.",
        variant: "destructive",
      });
      return;
    }
    
    if (!bulkModelsText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens ein Modell ein.",
        variant: "destructive",
      });
      return;
    }
    
    // Modellnamen aus Text extrahieren (ein Modell pro Zeile)
    const modelNames = bulkModelsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (modelNames.length === 0) {
      toast({
        title: "Fehler",
        description: "Keine gültigen Modellnamen gefunden.",
        variant: "destructive",
      });
      return;
    }
    
    // Modelle für den Import vorbereiten
    const models = modelNames.map(name => ({
      name,
      brandId: selectedBrandForBulk
    }));
    
    // API-Aufruf durchführen
    bulkImportModelsMutation.mutate({ models });
  };
  
  // Handler für Modell-Management
  const handleDeleteModel = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie dieses Modell löschen möchten?')) {
      deleteModelMutation.mutate(id);
    }
  };
  
  // Handler für Mehrfachauswahl von Modellen
  const handleToggleModelSelection = (id: number) => {
    setSelectedModelIds(prev => {
      if (prev.includes(id)) {
        // Wenn ID bereits in der Auswahl ist, entfernen wir sie
        return prev.filter(modelId => modelId !== id);
      } else {
        // Wenn ID noch nicht in der Auswahl ist, fügen wir sie hinzu
        return [...prev, id];
      }
    });
  };
  
  // Handler für "Alle auswählen"-Checkbox
  const handleToggleSelectAll = () => {
    if (selectAllModels) {
      // Wenn alle ausgewählt sind, Auswahl aufheben
      setSelectedModelIds([]);
      setSelectAllModels(false);
    } else {
      // Sonst alle auswählen (gefilterte Modelle)
      const filteredModelIds = modelsData
        ?.filter(model => {
          // Filterung nach Modellnamen
          const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
          
          // Filterung nach Gerätetyp, falls ausgewählt
          let typeMatches = true;
          if (selectedModelDeviceType) {
            const brand = brandsData?.find(b => b.id === model.brandId);
            const deviceType = userDeviceTypes?.find(t => t.id === brand?.deviceTypeId);
            // Case-insensitive Vergleich für Gerätetypen
            typeMatches = deviceType?.name?.toLowerCase() === selectedModelDeviceType?.toLowerCase();
          }
          
          // Filterung nach Marke, falls ausgewählt
          let brandMatches = true;
          if (selectedModelBrandId !== null && selectedModelBrandId !== 0) {
            brandMatches = model.brandId === selectedModelBrandId;
            console.log(`Filterung nach Marke ${selectedModelBrandId}: Modell ${model.name} (brandId=${model.brandId}) -> Match: ${brandMatches}`);
          }
          
          return nameMatches && typeMatches && brandMatches;
        })
        .map(model => model.id) || [];
      
      setSelectedModelIds(filteredModelIds);
      setSelectAllModels(true);
    }
  };
  
  // Handler für das Löschen ausgewählter Modelle
  const handleDeleteSelectedModels = async () => {
    if (selectedModelIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens ein Modell aus."
      });
      return;
    }
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedModelIds.length} ausgewählte Modelle löschen möchten?`)) {
      // Statt des Bulk-Endpoints verwenden wir einzelne Löschvorgänge
      let successCount = 0;
      
      try {
        // Toast anzeigen, dass der Löschvorgang läuft
        toast({
          title: "Löschvorgang läuft",
          description: `${selectedModelIds.length} Modelle werden gelöscht...`
        });
        
        // Modelle nacheinander löschen
        for (const id of selectedModelIds) {
          try {
            const response = await apiRequest('DELETE', `/api/superadmin/models/${id}`);
            if (response.ok) {
              successCount++;
            }
          } catch (error) {
            console.error(`Fehler beim Löschen des Modells ${id}:`, error);
          }
        }
        
        // Daten aktualisieren
        queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
        
        // Erfolgs-Toast anzeigen
        toast({
          title: "Erfolg",
          description: `${successCount} von ${selectedModelIds.length} Modellen wurden erfolgreich gelöscht.`
        });
        
        // Auswahl zurücksetzen
        setSelectedModelIds([]);
        setSelectAllModels(false);
      } catch (error) {
        toast({
          title: "Fehler",
          description: 'Beim Löschen ist ein Fehler aufgetreten.',
          variant: "destructive"
        });
      }
    }
  };
  
  // Gefilterte Gerätetypen basierend auf dem Suchbegriff, leere Strings ausfiltern
  const filteredDeviceTypes = deviceTypesList
    ? deviceTypesList.filter(type =>
        type && type.trim() !== "" && type.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase())
      )
    : [];
  
  // Hilfsfunktion zum Filtern von Marken basierend auf dem ausgewählten Gerätetyp
  const getFilteredBrands = (deviceType: string | null) => {
    if (!brandsData || !userDeviceTypes) return [];
    
    if (!deviceType) return brandsData;
    
    // Gerätetyp-ID ermitteln - Groß-/Kleinschreibung ignorieren
    const deviceTypeObj = userDeviceTypes.find(dt => 
      dt.name.toLowerCase() === deviceType.toLowerCase()
    );
    
    if (!deviceTypeObj) {
      console.log(`Kein Gerätetyp gefunden für: "${deviceType}"`);
      console.log("Verfügbare Gerätetypen:", userDeviceTypes.map(dt => dt.name));
      return [];
    }
    
    console.log(`Gefilterte Marken für Gerätetyp: "${deviceType}" (ID: ${deviceTypeObj.id})`);
    
    // Marken nach Gerätetyp-ID filtern
    const filteredBrands = brandsData.filter(brand => brand.deviceTypeId === deviceTypeObj.id);
    
  // Mutation zum Erstellen eines neuen Fehlereintrags
  const createIssueMutation = useMutation({
    mutationFn: async (data: Omit<DeviceIssue, "id" | "userId" | "shopId" | "createdAt" | "updatedAt" | "isGlobal">) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues', {
        ...data,
        isGlobal: true
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Fehlereintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich erstellt.",
      });
      setIsCreateIssueOpen(false);
      setIssueForm({ 
        title: "", 
        description: "",
        deviceType: "",
        solution: "",
        severity: "medium",
        isCommon: false 
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
  
  // Mutation zum Löschen eines Fehlereintrags
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Fehlereintrags');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich gelöscht.",
      });
      // Auswahl zurücksetzen
      setSelectedIssueIds([]);
      setSelectAllIssues(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen mehrerer Fehlereinträge
  const deleteBulkIssuesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      console.log('Sende folgende Fehler-IDs zum Löschen:', numericIds);
      
      const response = await apiRequest('POST', '/api/superadmin/device-issues/bulk-delete', { 
        ids: numericIds 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: `${data.deletedCount} Fehlereinträge wurden erfolgreich gelöscht.`,
      });
      // Auswahl zurücksetzen
      setSelectedIssueIds([]);
      setSelectAllIssues(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Bulk-Import von Fehlereinträgen
  const [isBulkImportIssuesOpen, setIsBulkImportIssuesOpen] = useState(false);
  const [bulkIssueText, setBulkIssueText] = useState("");
  const [selectedDeviceTypeForBulkIssues, setSelectedDeviceTypeForBulkIssues] = useState("");
  
  const bulkImportIssuesMutation = useMutation({
    mutationFn: async (data: { deviceType: string, issues: { title: string, description: string }[] }) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues/bulk', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Importieren der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereinträge wurden erfolgreich importiert.",
      });
      setIsBulkImportIssuesOpen(false);
      setBulkIssueText("");
      setSelectedDeviceTypeForBulkIssues("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handler für Fehlerkatalog-Verwaltung
  const handleCreateIssue = () => {
    setIssueForm({ 
      title: "", 
      description: "",
      deviceType: "",
      solution: "",
      severity: "medium",
      isCommon: false 
    });
    setIsCreateIssueOpen(true);
  };
  
  const handleSubmitCreateIssue = () => {
    if (!issueForm.title || !issueForm.description || !issueForm.deviceType) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    createIssueMutation.mutate(issueForm);
  };
  
  const handleDeleteIssue = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie diesen Fehlereintrag löschen möchten?')) {
      deleteIssueMutation.mutate(id);
    }
  };
  
  // Handler für Mehrfachauswahl von Fehlereinträgen
  const handleToggleIssueSelection = (id: number) => {
    setSelectedIssueIds(prev => {
      if (prev.includes(id)) {
        // Wenn ID bereits in der Auswahl ist, entfernen wir sie
        return prev.filter(issueId => issueId !== id);
      } else {
        // Wenn ID noch nicht in der Auswahl ist, fügen wir sie hinzu
        return [...prev, id];
      }
    });
  };
  
  // Handler für "Alle auswählen"-Checkbox bei Fehlereinträgen
  const handleToggleSelectAllIssues = () => {
    if (selectAllIssues) {
      // Wenn alle ausgewählt sind, Auswahl aufheben
      setSelectedIssueIds([]);
      setSelectAllIssues(false);
    } else {
      // Sonst alle auswählen (gefilterte Fehlereinträge)
      const filteredIssueIds = issuesData
        ?.filter(issue => {
          // Filterung nach Titel oder Beschreibung
          const textMatches = 
            issue.title.toLowerCase().includes(issueSearchTerm.toLowerCase()) ||
            issue.description.toLowerCase().includes(issueSearchTerm.toLowerCase());
          
          // Filterung nach Gerätetyp, falls ausgewählt
          const typeMatches = !selectedIssueDeviceType || 
                            issue.deviceType.toLowerCase() === selectedIssueDeviceType.toLowerCase();
          
          return textMatches && typeMatches;
        })
        .map(issue => issue.id) || [];
      
      setSelectedIssueIds(filteredIssueIds);
      setSelectAllIssues(true);
    }
  };
  
  const handleDeleteSelectedIssues = () => {
    if (selectedIssueIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens einen Fehlereintrag aus.",
      });
      return;
    }
    
    if (confirm(`Möchten Sie wirklich ${selectedIssueIds.length} ausgewählte Fehlereinträge löschen?`)) {
      deleteBulkIssuesMutation.mutate(selectedIssueIds);
    }
  };
  
  const handleBulkImportIssues = () => {
    setBulkIssueText("");
    setSelectedDeviceTypeForBulkIssues("");
    setIsBulkImportIssuesOpen(true);
  };
  
  const handleSubmitBulkImportIssues = () => {
    // Prüfen, ob alle erforderlichen Felder ausgefüllt sind
    if (!bulkIssueText.trim() || !selectedDeviceTypeForBulkIssues) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    
    // Text in einzelne Zeilen aufteilen und leere Zeilen entfernen
    const lines = bulkIssueText.split('\n').filter(line => line.trim());
    
    // Fehlereinträge erstellen
    const issues = lines.map(line => ({
      title: line.trim(),
      description: line.trim() // Wir verwenden hier für Titel und Beschreibung denselben Text
    }));
    
    if (issues.length === 0) {
      toast({
        title: "Fehler",
        description: "Es wurden keine gültigen Fehlereinträge gefunden.",
        variant: "destructive",
      });
      return;
    }
    
    // API-Aufruf durchführen
    bulkImportIssuesMutation.mutate({ 
      deviceType: selectedDeviceTypeForBulkIssues,
      issues 
    });
  };
    console.log(`Gefunden: ${filteredBrands.length} Marken:`, filteredBrands.map(b => b.name));
    
    return filteredBrands;
  };
  
  // MUTATIONEN UND HANDLER FÜR DEN NEUEN FEHLERKATALOG
  
  // Mutation zum Erstellen eines Fehlereintrags
  const createErrorCatalogEntryMutation = useMutation({
    mutationFn: async (data: { 
      errorText: string;
      forSmartphone: boolean;
      forTablet: boolean;
      forLaptop: boolean;
      forSmartwatch: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/superadmin/error-catalog", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Fehlereintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      setIsCreateErrorCatalogEntryOpen(false);
      setErrorCatalogEntryForm({
        errorText: "",
        forSmartphone: false,
        forTablet: false,
        forLaptop: false,
        forSmartwatch: false
      });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Fehlereintrags.",
        variant: "destructive",
      });
    },
  });

  // Mutation zum Löschen eines Fehlereintrags
  const deleteErrorCatalogEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/superadmin/error-catalog/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Fehlereintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich gelöscht.",
      });
      // Auswahl zurücksetzen, falls der gelöschte Eintrag ausgewählt war
      setSelectedErrorCatalogIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Fehlereintrags.",
        variant: "destructive",
      });
    },
  });

  // Mutation für Bulk-Löschen von Fehlereinträgen
  const bulkDeleteErrorCatalogEntriesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await apiRequest("POST", "/api/superadmin/error-catalog/bulk-delete", { ids });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      setSelectedErrorCatalogIds([]);
      setSelectAllErrorCatalog(false);
      toast({
        title: "Erfolg",
        description: "Fehlereinträge wurden erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen der Fehlereinträge.",
        variant: "destructive",
      });
    },
  });

  // Mutation für Bulk-Import von Fehlereinträgen
  const bulkImportErrorCatalogMutation = useMutation({
    mutationFn: async (data: { entries: { errorText: string; forSmartphone: boolean; forTablet: boolean; forLaptop: boolean; forSmartwatch: boolean; }[] }) => {
      const response = await apiRequest("POST", "/api/superadmin/error-catalog/bulk", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Massenimport von Fehlereinträgen');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      setIsBulkImportErrorCatalogOpen(false);
      setBulkErrorCatalogText("");
      toast({
        title: "Erfolg",
        description: "Fehlereinträge wurden erfolgreich importiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Massenimport von Fehlereinträgen.",
        variant: "destructive",
      });
    },
  });

  // Handler-Funktionen für den neuen Fehlerkatalog
  
  // Fehlerkatalogeintrag hinzufügen
  const handleCreateErrorCatalogEntry = () => {
    setIsCreateErrorCatalogEntryOpen(true);
  };

  const handleSubmitCreateErrorCatalogEntry = () => {
    if (!errorCatalogEntryForm.errorText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Fehlertext ein.",
        variant: "destructive",
      });
      return;
    }
    
    // Wenn kein Gerätetyp ausgewählt wurde, wenigstens einen auswählen
    const anyDeviceSelected = 
      errorCatalogEntryForm.forSmartphone || 
      errorCatalogEntryForm.forTablet || 
      errorCatalogEntryForm.forLaptop || 
      errorCatalogEntryForm.forSmartwatch;
    
    if (!anyDeviceSelected) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }

    createErrorCatalogEntryMutation.mutate(errorCatalogEntryForm);
  };

  // Fehlerkatalogeintrag löschen
  const handleDeleteErrorCatalogEntry = (id: number) => {
    deleteErrorCatalogEntryMutation.mutate(id);
  };

  // Fehlerkatalogeintrag Auswahl umschalten
  const handleToggleErrorCatalogSelection = (id: number) => {
    setSelectedErrorCatalogIds(prevSelected => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter(selectedId => selectedId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // Alle Fehlerkatalogeintrag auswählen/abwählen
  const handleToggleSelectAllErrorCatalog = (checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") return;
    
    setSelectAllErrorCatalog(checked);
    
    if (checked && errorCatalogData) {
      // Alle IDs auswählen
      const allIds = errorCatalogData
        .filter(entry => entry.errorText.toLowerCase().includes(errorCatalogSearchTerm.toLowerCase()))
        .map(entry => entry.id);
      setSelectedErrorCatalogIds(allIds);
    } else {
      // Keine IDs auswählen
      setSelectedErrorCatalogIds([]);
    }
  };

  // Ausgewählte Fehlerkatalogeintrag löschen
  const handleDeleteSelectedErrorCatalogEntries = () => {
    if (selectedErrorCatalogIds.length === 0) return;
    
    bulkDeleteErrorCatalogEntriesMutation.mutate(selectedErrorCatalogIds);
  };

  // Fehlerkatalogeintrag per Bulk-Import hinzufügen
  const handleBulkImportErrorCatalog = () => {
    setIsBulkImportErrorCatalogOpen(true);
  };

  const handleSubmitBulkImportErrorCatalog = () => {
    if (!bulkErrorCatalogText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie mindestens einen Fehlereintrag hinzu.",
        variant: "destructive",
      });
      return;
    }

    const entries = bulkErrorCatalogText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line) // Leere Zeilen entfernen
      .map(errorText => ({ 
        errorText, 
        forSmartphone: true, 
        forTablet: true, 
        forLaptop: true, 
        forSmartwatch: true 
      }));

    if (entries.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie gültige Fehlereinträge hinzu.",
        variant: "destructive",
      });
      return;
    }

    bulkImportErrorCatalogMutation.mutate({ entries });
  };

  // State für die aktive Tab-Navigation
  const [activeTab, setActiveTab] = useState("types");

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Geräteverwaltung</h1>
      
      {/* Mobile view: Select dropdown für Tabs */}
      <div className="block md:hidden mb-4">
        <select 
          className="w-full p-2 border rounded-md text-sm" 
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          <option value="types">Gerätetypen</option>
          <option value="brands">Marken</option>
          <option value="models">Modelle</option>
          <option value="issues">Fehlerkatalog</option>
          <option value="csv">CSV Import/Export</option>
          <option value="statistics">Statistik</option>
        </select>
      </div>
      
      <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden md:grid grid-cols-6">
          <TabsTrigger value="types">Gerätetypen</TabsTrigger>
          <TabsTrigger value="brands">Marken</TabsTrigger>
          <TabsTrigger value="models">Modelle</TabsTrigger>
          <TabsTrigger value="issues">Fehlerkatalog (Alt)</TabsTrigger>
          <TabsTrigger value="error-catalog">Fehlerkatalog (Neu)</TabsTrigger>
          <TabsTrigger value="csv">CSV Import/Export</TabsTrigger>
          <TabsTrigger value="statistics">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Gerätetypen</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Verwalten Sie globale Gerätetypen für alle Shops
                </CardDescription>
              </div>
              <Button onClick={handleCreateDeviceType} className="text-xs md:text-sm h-8 md:h-10">
                <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Gerätetyp hinzufügen
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <div className="mb-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Gerätetypen suchen..." 
                    className="pl-8" 
                    value={deviceTypeSearchTerm}
                    onChange={(e) => setDeviceTypeSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {isLoadingDeviceTypesList ? (
                <div className="flex justify-center p-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredDeviceTypes.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeviceTypes.map((type) => (
                        <TableRow key={type}>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {getDeviceTypeIcon(type)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{type}</span>
                              {["Smartphone", "Tablet", "Laptop", "Watch"].includes(type) && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  Standard
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditDeviceType(type)}
                                disabled={["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"].includes(type)}
                                title={["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"].includes(type) ? "Standardgerätetypen können nicht bearbeitet werden" : "Gerätetyp bearbeiten"}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteDeviceType(type)}
                                disabled={["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"].includes(type)}
                                title={["Smartphone", "Tablet", "Laptop", "Watch", "Spielekonsole"].includes(type) ? "Standardgerätetypen können nicht gelöscht werden" : "Gerätetyp löschen"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Gerätetypen gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {deviceTypeSearchTerm ? 'Keine Ergebnisse für Ihre Suche.' : 'Es wurden keine Gerätetypen gefunden. Fügen Sie neue Gerätetypen hinzu.'}
                  </p>
                  <Button onClick={handleCreateDeviceType}>
                    <Plus className="mr-2 h-4 w-4" /> Gerätetyp hinzufügen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <div className="space-y-6">
            
            <Card>
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
                <div>
                  <CardTitle className="text-base md:text-lg font-semibold">Marken</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Hier werden alle vorhandenen Marken angezeigt</CardDescription>
                </div>
                <Button onClick={handleCreateBrand} className="text-xs md:text-sm h-8 md:h-10">
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Marke hinzufügen
                </Button>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Marken suchen..." 
                      className="pl-8" 
                      value={brandSearchTerm}
                      onChange={(e) => setBrandSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {selectedBrandIds.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelectedBrands}
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span>{selectedBrandIds.length} Marke{selectedBrandIds.length > 1 ? 'n' : ''} löschen</span>
                    </Button>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="deviceTypeFilter" className="whitespace-nowrap">Nach Gerätetyp filtern:</Label>
                    <Select 
                      value={selectedBrandDeviceType || "all"}
                      onValueChange={(value) => setSelectedBrandDeviceType(value === "all" ? null : value)}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Alle Typen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Typen</SelectItem>
                        {deviceTypesList?.filter(type => type && type.trim() !== "").map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Nur anzeigen, wenn mindestens ein Filter aktiv ist */}
                  {(selectedBrandDeviceType || brandSearchTerm) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedBrandDeviceType(null);
                        setBrandSearchTerm("");
                      }}
                      className="flex items-center space-x-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Filter zurücksetzen</span>
                    </Button>
                  )}
                </div>
                
                {isLoadingBrands ? (
                  <div className="flex justify-center p-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : brandsData && brandsData.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectAllBrands}
                              onCheckedChange={handleToggleSelectAllBrands}
                              aria-label="Alle Marken auswählen"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Gerätetyp</TableHead>
                          <TableHead>Shop</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brandsData
                          ?.map(brand => {
                            // Für jede Marke den entsprechenden Gerätetyp anhand der deviceTypeId ermitteln
                            const typeInfo = userDeviceTypes?.find(type => type.id === brand.deviceTypeId);
                            return {
                              ...brand,
                              deviceTypeName: typeInfo?.name || 'Smartphone' // Fallback auf Smartphone, wenn kein Match gefunden wird
                            };
                          })
                          .filter(brand => {
                            // Filterung nach Markennamen
                            const nameMatches = brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase());
                            
                            // Filterung nach Gerätetyp, falls ausgewählt
                            const typeMatches = !selectedBrandDeviceType || 
                                               brand.deviceTypeName === selectedBrandDeviceType;
                            
                            return nameMatches && typeMatches;
                          })
                          .map((brand) => (
                            <TableRow key={brand.id}>
                              <TableCell className="w-10">
                                <Checkbox
                                  checked={selectedBrandIds.includes(brand.id)}
                                  onCheckedChange={() => handleToggleBrandSelection(brand.id)}
                                  aria-label={`Marke ${brand.name} auswählen`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{brand.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getDeviceTypeIcon(brand.deviceTypeName || 'Smartphone')}
                                  <span>{brand.deviceTypeName || 'Smartphone'}</span>
                                </div>
                              </TableCell>
                              <TableCell>Shop {brand.shopId}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    title="Marke löschen"
                                    onClick={() => handleDeleteBrand(brand.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Keine Marken gefunden</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                      {selectedBrandDeviceType && brandSearchTerm
                        ? `Keine Ergebnisse für "${brandSearchTerm}" mit Gerätetyp "${selectedBrandDeviceType}".` 
                        : selectedBrandDeviceType 
                          ? `Keine Marken für Gerätetyp "${selectedBrandDeviceType}" gefunden.`
                          : brandSearchTerm 
                            ? `Keine Ergebnisse für "${brandSearchTerm}".` 
                            : 'Es wurden keine Marken gefunden. Importieren Sie Marken über den Massenimport.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <div className="space-y-6">
            
            <Card>
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
                <div>
                  <CardTitle className="text-base md:text-lg font-semibold">Modelle</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Hier werden alle vorhandenen Modelle angezeigt</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleCreateModel} className="text-xs md:text-sm h-8 md:h-10">
                    <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Modell hinzufügen
                  </Button>
                  <Button onClick={handleBulkImportModels} variant="outline" className="text-xs md:text-sm h-8 md:h-10">
                    <Upload className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Bulk-Import
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Modelle suchen..." 
                      className="pl-8" 
                      value={modelSearchTerm}
                      onChange={(e) => setModelSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {selectedModelIds.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelectedModels}
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span>{selectedModelIds.length} Modell{selectedModelIds.length > 1 ? 'e' : ''} löschen</span>
                    </Button>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="modelDeviceTypeFilter" className="whitespace-nowrap">Gerätetyp:</Label>
                    <Select 
                      value={selectedModelDeviceType || "all"}
                      onValueChange={(value) => {
                        setSelectedModelDeviceType(value === "all" ? null : value);
                        setSelectedModelBrandId(null); // Brand zurücksetzen bei Änderung des Gerätetyps
                      }}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Alle Typen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Typen</SelectItem>
                        {deviceTypesList?.filter(type => type && type.trim() !== "").map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {getDeviceTypeIcon(type)}
                              <span>{type}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="modelBrandFilter" className="whitespace-nowrap">Marke:</Label>
                    <Select
                      value={selectedModelBrandId?.toString() || "all"}
                      onValueChange={(value) => {
                        const brandId = value === "all" ? null : parseInt(value);
                        setSelectedModelBrandId(brandId);
                        console.log(`Markenfilter geändert zu: ${brandId} (${value})`);
                      }}
                      disabled={!selectedModelDeviceType}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Alle Marken" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Marken</SelectItem>
                        {getFilteredBrands(selectedModelDeviceType).map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Nur anzeigen, wenn mindestens ein Filter aktiv ist */}
                  {(selectedModelDeviceType || selectedModelBrandId || modelSearchTerm) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedModelDeviceType(null);
                        setSelectedModelBrandId(null);
                        setModelSearchTerm("");
                      }}
                      className="flex items-center space-x-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Filter zurücksetzen</span>
                    </Button>
                  )}
                </div>
                
                {isLoadingModels ? (
                  <div className="flex justify-center p-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : modelsData && modelsData.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox 
                              checked={selectAllModels} 
                              onCheckedChange={handleToggleSelectAll}
                              aria-label="Alle Modelle auswählen" 
                            />
                          </TableHead>
                          <TableHead>Modell</TableHead>
                          <TableHead>Marke</TableHead>
                          <TableHead>Gerätetyp</TableHead>
                          <TableHead>Shop</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modelsData
                          // Virtuelle Eigenschaften hinzufügen
                          .map(model => {
                            const brand = brandsData?.find(b => b.id === model.brandId);
                            const deviceType = userDeviceTypes?.find(t => t.id === brand?.deviceTypeId);
                            return {
                              ...model,
                              brandName: brand?.name || 'Unbekannt',
                              deviceTypeName: deviceType?.name || 'Smartphone'
                            };
                          })
                          // Filterfunktionen anwenden
                          .filter(model => {
                            // Filterung nach Modellnamen
                            const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
                            
                            // Filterung nach Gerätetyp, falls ausgewählt
                            let typeMatches = true;
                            if (selectedModelDeviceType) {
                              // Case-insensitive Vergleich für Gerätetypen
                              typeMatches = model.deviceTypeName?.toLowerCase() === selectedModelDeviceType?.toLowerCase();
                            }
                            
                            // Filterung nach Marke, falls ausgewählt
                            let brandMatches = true;
                            if (selectedModelBrandId !== null && selectedModelBrandId !== 0) {
                              brandMatches = model.brandId === selectedModelBrandId;
                              console.log(`Filterung nach Marke ${selectedModelBrandId}: Modell ${model.name} (brandId=${model.brandId}) -> Match: ${brandMatches}`);
                            }
                            
                            return nameMatches && typeMatches && brandMatches;
                          })
                          .map((model) => (
                            <TableRow key={model.id}>
                              <TableCell className="p-0 text-center">
                                <Checkbox 
                                  checked={selectedModelIds.includes(model.id)} 
                                  onCheckedChange={() => handleToggleModelSelection(model.id)}
                                  aria-label={`Modell ${model.name} auswählen`} 
                                />
                              </TableCell>
                              <TableCell className="font-medium">{model.name}</TableCell>
                              <TableCell>{model.brandName}</TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {getDeviceTypeIcon(model.deviceTypeName || 'Smartphone')}
                                  <span>{model.deviceTypeName}</span>
                                </div>
                              </TableCell>
                              <TableCell>Shop {model.shopId}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteModel(model.id)}
                                    title="Modell löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Keine Modelle gefunden</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                      {selectedModelDeviceType && selectedModelBrandId
                        ? `Keine Modelle für ${getFilteredBrands(selectedModelDeviceType).find(b => b.id === selectedModelBrandId)?.name || ''} (${selectedModelDeviceType}) gefunden.`
                        : selectedModelDeviceType
                          ? `Keine Modelle für Gerätetyp "${selectedModelDeviceType}" gefunden.`
                          : selectedModelBrandId
                            ? `Keine Modelle für die ausgewählte Marke gefunden.`
                            : modelSearchTerm
                              ? `Keine Ergebnisse für "${modelSearchTerm}".`
                              : 'Es wurden keine Modelle gefunden. Importieren Sie Modelle über den Massenimport.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Fehlerkatalog</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Verwalten Sie den globalen Fehlerkatalog für alle Gerätetypen
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBulkImportIssues} className="text-xs md:text-sm h-8 md:h-10">
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Fehler hinzufügen
                </Button>
                <Button onClick={handleCreateIssue} className="text-xs md:text-sm h-8 md:h-10">
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Einzelner Fehler
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Fehler suchen..." 
                    className="pl-8" 
                    value={issueSearchTerm}
                    onChange={(e) => setIssueSearchTerm(e.target.value)}
                  />
                </div>
                
                {selectedIssueIds.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelectedIssues}
                    className="flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span>{selectedIssueIds.length} Fehlereintrag{selectedIssueIds.length > 1 ? 'e' : ''} löschen</span>
                  </Button>
                )}
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="issueDeviceTypeFilter" className="whitespace-nowrap">Gerätetyp:</Label>
                  <Select 
                    value={selectedIssueDeviceType || "all"}
                    onValueChange={(value) => setSelectedIssueDeviceType(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Alle Typen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Typen</SelectItem>
                      {deviceTypesList?.filter(type => type && type.trim() !== "").map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getDeviceTypeIcon(type)}
                            <span>{type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filter zurücksetzen */}
                {(selectedIssueDeviceType || issueSearchTerm) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedIssueDeviceType(null);
                      setIssueSearchTerm("");
                    }}
                    className="flex items-center space-x-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Filter zurücksetzen</span>
                  </Button>
                )}
              </div>
              
              {isLoadingIssues ? (
                <div className="flex justify-center p-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : issuesData && issuesData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectAllIssues}
                            onCheckedChange={handleToggleSelectAllIssues}
                            aria-label="Alle Fehlereinträge auswählen"
                          />
                        </TableHead>
                        <TableHead className="w-12">Typ</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead className="hidden md:table-cell">Beschreibung</TableHead>
                        <TableHead className="hidden md:table-cell">Lösung</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuesData
                        ?.filter(issue => {
                          // Filterung nach Titel oder Beschreibung
                          const textMatches = 
                            issue.title.toLowerCase().includes(issueSearchTerm.toLowerCase()) ||
                            issue.description.toLowerCase().includes(issueSearchTerm.toLowerCase());
                          
                          // Filterung nach Gerätetyp, falls ausgewählt
                          const typeMatches = !selectedIssueDeviceType || 
                                            issue.deviceType.toLowerCase() === selectedIssueDeviceType.toLowerCase();
                          
                          return textMatches && typeMatches;
                        })
                        .map(issue => (
                          <TableRow key={issue.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIssueIds.includes(issue.id)}
                                onCheckedChange={() => handleToggleIssueSelection(issue.id)}
                                aria-label={`Fehlereintrag ${issue.title} auswählen`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
                                {getDeviceTypeIcon(issue.deviceType)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {issue.title}
                              {issue.isCommon && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200">
                                  Häufig
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-xs truncate">
                              {issue.description}
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-xs truncate">
                              {issue.solution || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteIssue(issue.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Fehlereinträge gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {issueSearchTerm || selectedIssueDeviceType ? 
                      'Keine Ergebnisse für diese Filtereinstellungen.' : 
                      'Es wurden keine Fehlereinträge gefunden. Fügen Sie neue Fehlereinträge hinzu.'}
                  </p>
                  <Button onClick={handleBulkImportIssues}>
                    <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Dialog für das Erstellen eines einzelnen Fehlereintrags */}
          <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Fehlereintrag erstellen</DialogTitle>
                <DialogDescription>
                  Fügen Sie einen neuen Fehlereintrag zum Katalog hinzu.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Titel</Label>
                  <Input 
                    id="title" 
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({...issueForm, title: e.target.value})}
                    placeholder="z.B. Display gebrochen"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Input 
                    id="description" 
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                    placeholder="Detaillierte Beschreibung des Fehlers"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deviceType">Gerätetyp</Label>
                  <Select
                    value={issueForm.deviceType}
                    onValueChange={(value) => setIssueForm({...issueForm, deviceType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Gerätetyp auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypesList?.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getDeviceTypeIcon(type)}
                            <span>{type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="solution">Lösung (optional)</Label>
                  <Input 
                    id="solution" 
                    value={issueForm.solution || ""}
                    onChange={(e) => setIssueForm({...issueForm, solution: e.target.value})}
                    placeholder="Mögliche Lösung für diesen Fehler"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isCommon" 
                    checked={issueForm.isCommon}
                    onCheckedChange={(checked) => 
                      setIssueForm({...issueForm, isCommon: checked === true})
                    }
                  />
                  <Label 
                    htmlFor="isCommon"
                    className="text-sm font-normal"
                  >
                    Als häufigen Fehler markieren
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateIssueOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleSubmitCreateIssue}
                  disabled={createIssueMutation.isPending}
                >
                  {createIssueMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Erstelle...
                    </>
                  ) : (
                    "Erstellen"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog für den Bulk-Import von Fehlereinträgen */}
          <Dialog open={isBulkImportIssuesOpen} onOpenChange={setIsBulkImportIssuesOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mehrere Fehlereinträge importieren</DialogTitle>
                <DialogDescription>
                  Fügen Sie mehrere Fehlereinträge gleichzeitig hinzu, einen pro Zeile.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="deviceTypeForBulk">Gerätetyp</Label>
                  <Select
                    value={selectedDeviceTypeForBulkIssues}
                    onValueChange={setSelectedDeviceTypeForBulkIssues}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Gerätetyp auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypesList?.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getDeviceTypeIcon(type)}
                            <span>{type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bulkIssues">Fehlereinträge (ein Eintrag pro Zeile)</Label>
                  <textarea
                    id="bulkIssues"
                    value={bulkIssueText}
                    onChange={(e) => setBulkIssueText(e.target.value)}
                    placeholder="Display gebrochen&#10;Akku defekt&#10;Lautsprecher funktioniert nicht"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkImportIssuesOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleSubmitBulkImportIssues}
                  disabled={bulkImportIssuesMutation.isPending}
                >
                  {bulkImportIssuesMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                      Importiere...
                    </>
                  ) : (
                    "Importieren"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="error-catalog">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Fehlerkatalog</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Verwalten Sie häufige Fehler für Gerätetypen
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setIsCreateErrorCatalogEntryOpen(true)} 
                  className="text-xs md:text-sm h-8 md:h-10"
                >
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Fehler hinzufügen
                </Button>
                <Button 
                  onClick={() => setIsBulkImportErrorCatalogOpen(true)} 
                  className="text-xs md:text-sm h-8 md:h-10" 
                  variant="outline"
                >
                  <Upload className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Import
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Fehler suchen..." 
                    className="pl-8" 
                    value={errorCatalogSearchTerm}
                    onChange={(e) => setErrorCatalogSearchTerm(e.target.value)}
                  />
                </div>
                
                {selectedErrorCatalogIds.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelectedErrorCatalogEntries}
                    className="flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span>{selectedErrorCatalogIds.length} Fehler{selectedErrorCatalogIds.length > 1 ? '' : ''} löschen</span>
                  </Button>
                )}
                
                {/* Nur anzeigen, wenn ein Filter aktiv ist */}
                {errorCatalogSearchTerm && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setErrorCatalogSearchTerm("");
                    }}
                    className="flex items-center space-x-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Filter zurücksetzen</span>
                  </Button>
                )}
              </div>
              
              {isLoadingErrorCatalog ? (
                <div className="flex justify-center p-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : errorCatalogData && errorCatalogData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectAllErrorCatalog}
                            onCheckedChange={handleToggleSelectAllErrorCatalog}
                            aria-label="Alle Fehler auswählen"
                          />
                        </TableHead>
                        <TableHead>Fehlertext</TableHead>
                        <TableHead className="text-center">Smartphone</TableHead>
                        <TableHead className="text-center">Tablet</TableHead>
                        <TableHead className="text-center">Laptop</TableHead>
                        <TableHead className="text-center">Smartwatch</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorCatalogData
                        ?.filter(entry => entry.errorText.toLowerCase().includes(errorCatalogSearchTerm.toLowerCase()))
                        .map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="py-2">
                              <Checkbox
                                checked={selectedErrorCatalogIds.includes(entry.id)}
                                onCheckedChange={() => handleToggleErrorCatalogSelection(entry.id)}
                              />
                            </TableCell>
                            <TableCell className="py-2 max-w-xl truncate">{entry.errorText}</TableCell>
                            <TableCell className="py-2 text-center">
                              {entry.forSmartphone ? <Smartphone className="h-4 w-4 mx-auto text-green-600" /> : <X className="h-4 w-4 mx-auto text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {entry.forTablet ? <Tablet className="h-4 w-4 mx-auto text-green-600" /> : <X className="h-4 w-4 mx-auto text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {entry.forLaptop ? <Laptop className="h-4 w-4 mx-auto text-green-600" /> : <X className="h-4 w-4 mx-auto text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {entry.forSmartwatch ? <Watch className="h-4 w-4 mx-auto text-green-600" /> : <X className="h-4 w-4 mx-auto text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteErrorCatalogEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Fehlereinträge gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {errorCatalogSearchTerm ? 'Keine Ergebnisse für Ihre Suche.' : 'Es wurden keine Fehlereinträge gefunden. Fügen Sie neue Fehler hinzu.'}
                  </p>
                  <Button onClick={() => setIsCreateErrorCatalogEntryOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv">
          <DeviceDataCSVImportExport />
        </TabsContent>
        
        <TabsContent value="statistics">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Gerätestatistiken</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Übersicht über alle Gerätetypen, Marken und Modelle im System
                </CardDescription>
              </div>
              <Button 
                variant="outline"
                className="text-xs md:text-sm h-8 md:h-10"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-statistics"] })}
              >
                <RefreshCcw className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Aktualisieren
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              {isLoadingStatistics ? (
                <div className="flex justify-center p-8">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : deviceStatistics ? (
                <div className="space-y-8">
                  {/* Zusammenfassung */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 dark:bg-blue-950">
                      <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium">Gerätetypen</p>
                            <h3 className="text-xl md:text-3xl font-bold">{deviceStatistics.totalDeviceTypes}</h3>
                          </div>
                          <Smartphone className="h-8 w-8 md:h-12 md:w-12 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50 dark:bg-green-950">
                      <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium">Marken</p>
                            <h3 className="text-xl md:text-3xl font-bold">{deviceStatistics.totalBrands}</h3>
                          </div>
                          <Factory className="h-8 w-8 md:h-12 md:w-12 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-purple-50 dark:bg-purple-950">
                      <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-medium">Modelle</p>
                            <h3 className="text-xl md:text-3xl font-bold">{deviceStatistics.totalModels}</h3>
                          </div>
                          <Layers className="h-8 w-8 md:h-12 md:w-12 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Details pro Gerätetyp */}
                  <div className="space-y-4">
                    <h3 className="text-base md:text-lg font-semibold">Details pro Gerätetyp</h3>
                    <div className="space-y-4">
                      {deviceStatistics.deviceTypeStats.map(stat => (
                        <Card key={stat.name} className="overflow-hidden">
                          <CardHeader className="bg-muted/50 p-3 md:p-4">
                            <div className="flex items-center">
                              {getDeviceTypeIcon(stat.name)}
                              <h4 className="ml-2 text-base md:text-lg font-medium">{stat.name}</h4>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 md:p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center p-3 rounded-md bg-muted/30">
                                <Factory className="h-5 w-5 mr-2 text-primary" />
                                <span className="text-sm font-medium">Marken: {stat.brandCount}</span>
                              </div>
                              <div className="flex items-center p-3 rounded-md bg-muted/30">
                                <Smartphone className="h-5 w-5 mr-2 text-primary" />
                                <span className="text-sm font-medium">Modelle: {stat.modelCount}</span>
                              </div>
                            </div>
                            
                            {/* Top-Marken anzeigen */}
                            {stat.brands.length > 0 && (
                              <div>
                                <h5 className="text-xs md:text-sm font-medium mb-2">Top Marken:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {stat.brands
                                    .sort((a, b) => b.modelCount - a.modelCount)
                                    .slice(0, 6)
                                    .map(brand => (
                                      <div 
                                        key={brand.name} 
                                        className="flex items-center justify-between p-2 rounded-md bg-muted/20"
                                      >
                                        <span className="text-xs md:text-sm font-medium">{brand.name}</span>
                                        <Badge variant="outline">{brand.modelCount}</Badge>
                                      </div>
                                    ))
                                  }
                                </div>
                                
                                {stat.brands.length > 6 && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    +{stat.brands.length - 6} weitere Marken
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Statistiken verfügbar</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    Es konnten keine Statistiken geladen werden.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-statistics"] })}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Erneut versuchen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      


      {/* Dialog zum Erstellen eines neuen Gerätetyps */}
      <Dialog open={isCreateDeviceTypeOpen} onOpenChange={setIsCreateDeviceTypeOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-auto md:max-w-[425px] p-4 md:p-6">
          <DialogHeader className="p-0 md:p-0 mb-4">
            <DialogTitle className="text-lg md:text-xl">Neuen Gerätetyp erstellen</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Fügen Sie einen neuen Gerätetyp zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceTypeName" className="text-right">
                Name
              </Label>
              <Input
                id="deviceTypeName"
                value={deviceTypeForm.name}
                onChange={(e) => setDeviceTypeForm({...deviceTypeForm, name: e.target.value})}
                className="col-span-3"
                placeholder="z.B. Smartphone, Tablet, Laptop"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDeviceTypeOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmitCreateDeviceType} disabled={!deviceTypeForm.name}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Bearbeiten eines Gerätetyps */}
      <Dialog open={isEditDeviceTypeOpen} onOpenChange={setIsEditDeviceTypeOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-auto md:max-w-[425px] p-4 md:p-6">
          <DialogHeader className="p-0 md:p-0 mb-4">
            <DialogTitle className="text-lg md:text-xl">Gerätetyp bearbeiten</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Ändern Sie den Namen des Gerätetyps.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editDeviceTypeName" className="text-right">
                Name
              </Label>
              <Input
                id="editDeviceTypeName"
                value={deviceTypeForm.name}
                onChange={(e) => setDeviceTypeForm({...deviceTypeForm, name: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDeviceTypeOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmitEditDeviceType} disabled={!deviceTypeForm.name}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Erstellen einer neuen Marke */}
      <Dialog open={isCreateBrandOpen} onOpenChange={setIsCreateBrandOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-auto md:max-w-[425px] p-4 md:p-6">
          <DialogHeader className="p-0 md:p-0 mb-4">
            <DialogTitle className="text-lg md:text-xl">Neue Marke erstellen</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Fügen Sie eine neue Marke zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brandName" className="text-right">
                Name
              </Label>
              <Input
                id="brandName"
                value={brandForm.name}
                onChange={(e) => setBrandForm({...brandForm, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brandDeviceType" className="text-right">
                Gerätetyp
              </Label>
              <div className="col-span-3">
                <Select
                  value={brandForm.deviceTypeId ? brandForm.deviceTypeId.toString() : ""}
                  onValueChange={(value) => setBrandForm({...brandForm, deviceTypeId: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gerätetyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDeviceTypes?.filter(type => type.name && type.name.trim() !== "").map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        <div className="flex items-center gap-2">
                          {getDeviceTypeIcon(type.name)}
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateBrandOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmitCreateBrand} disabled={!brandForm.name || !brandForm.deviceTypeId}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Erstellen eines neuen Modells */}
      <Dialog open={isCreateModelOpen} onOpenChange={setIsCreateModelOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-auto md:max-w-[425px] p-4 md:p-6">
          <DialogHeader className="p-0 md:p-0 mb-4">
            <DialogTitle className="text-lg md:text-xl">Neues Modell erstellen</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Fügen Sie ein neues Modell zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modelName" className="text-right">
                Name
              </Label>
              <Input
                id="modelName"
                value={modelForm.name}
                onChange={(e) => setModelForm({...modelForm, name: e.target.value})}
                className="col-span-3"
                placeholder="z.B. iPhone 14, Galaxy S23"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modelBrand" className="text-right">
                Marke
              </Label>
              <div className="col-span-3">
                <Select
                  value={modelForm.brandId ? modelForm.brandId.toString() : ""}
                  onValueChange={(value) => setModelForm({...modelForm, brandId: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Marke auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandsData?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        <div className="flex items-center gap-2">
                          {getDeviceTypeIcon(userDeviceTypes?.find(t => t.id === brand.deviceTypeId)?.name || 'Smartphone')}
                          <span>{brand.name} ({userDeviceTypes?.find(t => t.id === brand.deviceTypeId)?.name || 'Unbekannt'})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModelOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmitCreateModel} disabled={!modelForm.name || !modelForm.brandId}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modelle Dialog */}
      <Dialog open={isBulkImportModelsOpen} onOpenChange={setIsBulkImportModelsOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-auto md:max-w-[525px] p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Bulk-Import von Modellen</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Fügen Sie mehrere Modelle für eine bestimmte Marke hinzu, ein Modell pro Zeile
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="device-type-select-bulk" className="text-right">
                Gerätetyp
              </Label>
              <div className="col-span-3">
                <Select 
                  value={selectedModelDeviceType || ""}
                  onValueChange={(value) => {
                    setSelectedModelDeviceType(value || null);
                    setSelectedBrandForBulk(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Gerätetyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypesList?.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {getDeviceTypeIcon(type)}
                          <span>{type}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-select-bulk" className="text-right">
                Marke
              </Label>
              <div className="col-span-3">
                <Select 
                  value={selectedBrandForBulk ? selectedBrandForBulk.toString() : ""}
                  onValueChange={(value) => {
                    setSelectedBrandForBulk(parseInt(value));
                  }}
                  disabled={!selectedModelDeviceType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Marke auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredBrands(selectedModelDeviceType).map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Label htmlFor="bulk-models" className="text-right">
                Modelle
              </Label>
              <div className="col-span-3">
                <textarea
                  id="bulk-models"
                  className="w-full min-h-[150px] p-2 border rounded-md"
                  placeholder="iPhone SE 2020&#10;iPhone 13&#10;iPhone 13 Pro&#10;iPhone 14&#10;iPhone 14 Pro&#10;..."
                  value={bulkModelsText}
                  onChange={(e) => setBulkModelsText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Ein Modell pro Zeile eingeben</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkImportModelsOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmitBulkImportModels}
              disabled={bulkImportModelsMutation.isPending}
            >
              {bulkImportModelsMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Importiere...
                </>
              ) : (
                "Importieren"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


