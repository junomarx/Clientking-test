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

// Interfaces für den Fehlerkatalog
interface DeviceIssue {
  id: number;
  deviceType: string;
  title: string;
  description: string;
  solution: string;
  severity: "low" | "medium" | "high" | "critical";
  isCommon: boolean;
  createdAt: string;
  updatedAt: string;
}

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

  // State für den Fehlerkatalog
  const [selectedIssue, setSelectedIssue] = useState<DeviceIssue | null>(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isEditIssueOpen, setIsEditIssueOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<number[]>([]);
  const [selectAllIssues, setSelectAllIssues] = useState(false);
  
  // Formular-State für Fehler
  const [issueForm, setIssueForm] = useState({
    deviceType: "",
    title: "",
    description: "",
    solution: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
    isCommon: false
  });

  // Daten abfragen
  const { data: deviceIssues, isLoading: isLoadingIssues, refetch: refetchDeviceIssues } = useQuery<DeviceIssue[]>({
    queryKey: ["/api/superadmin/device-issues"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });

  const { data: deviceTypes, refetch: refetchDeviceTypes } = useQuery<string[]>({
    queryKey: ["/api/superadmin/device-types"],
    enabled: true,
    staleTime: 0, // Immer als veraltet betrachten, um aktuelle Daten zu garantieren
  });

  // Mutations für API-Anfragen
  const createIssueMutation = useMutation({
    mutationFn: async (data: typeof issueForm) => {
      const response = await apiRequest('POST', '/api/superadmin/device-issues', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Eintrags');
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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof issueForm }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/device-issues/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Eintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich aktualisiert.",
      });
      setIsEditIssueOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Eintrags');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich gelöscht.",
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

  // Dialog-Handler
  const handleCreateIssue = () => {
    setIssueForm({
      deviceType: "",
      title: "",
      description: "",
      solution: "",
      severity: "medium",
      isCommon: false
    });
    setIsCreateIssueOpen(true);
  };

  const handleEditIssue = (issue: DeviceIssue) => {
    setSelectedIssue(issue);
    setIssueForm({
      deviceType: issue.deviceType,
      title: issue.title,
      description: issue.description,
      solution: issue.solution,
      severity: issue.severity,
      isCommon: issue.isCommon
    });
    setIsEditIssueOpen(true);
  };
  
  const handleDeleteIssue = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie diesen Fehlereintrag löschen möchten?')) {
      deleteIssueMutation.mutate(id);
    }
  };
  
  const handleSubmitCreateIssue = () => {
    if (!issueForm.title || !issueForm.deviceType || !issueForm.description) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    createIssueMutation.mutate(issueForm);
  };
  
  const handleSubmitEditIssue = () => {
    if (!selectedIssue) return;
    
    if (!issueForm.title || !issueForm.deviceType || !issueForm.description) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }
    
    updateIssueMutation.mutate({ id: selectedIssue.id, data: issueForm });
  };

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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen ausgewählter Marken
  const deleteSelectedBrandsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sequentielles Löschen, um Probleme mit gleichzeitigen Anfragen zu vermeiden
      for (const id of ids) {
        const response = await apiRequest('DELETE', `/api/superadmin/brands/${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Fehler beim Löschen der Marke mit ID ${id}: ${errorData.message || 'Unbekannter Fehler'}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      toast({
        title: "Erfolg",
        description: `${selectedBrandIds.length} Marke(n) wurden erfolgreich gelöscht.`,
      });
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
  
  // Handler für Marken-Management
  const handleDeleteBrand = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie diese Marke löschen möchten? Alle zugehörigen Modelle werden ebenfalls gelöscht.')) {
      deleteBrandMutation.mutate(id);
    }
  };
  
  const handleDeleteSelectedBrands = () => {
    if (selectedBrandIds.length === 0) return;
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedBrandIds.length} ausgewählte Marke(n) löschen möchten? Alle zugehörigen Modelle werden ebenfalls gelöscht.`)) {
      deleteSelectedBrandsMutation.mutate(selectedBrandIds);
    }
  };
  
  // Mutation zum Erstellen einer neuen Marke
  const createBrandMutation = useMutation({
    mutationFn: async (data: { name: string; deviceTypeId: number }) => {
      const response = await apiRequest('POST', '/api/superadmin/brands', data);
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
    
    createBrandMutation.mutate(brandForm);
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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Löschen ausgewählter Modelle
  const deleteSelectedModelsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sequentielles Löschen, um Probleme mit gleichzeitigen Anfragen zu vermeiden
      for (const id of ids) {
        const response = await apiRequest('DELETE', `/api/superadmin/models/${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Fehler beim Löschen des Modells mit ID ${id}: ${errorData.message || 'Unbekannter Fehler'}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Erfolg",
        description: `${selectedModelIds.length} Modell(e) wurden erfolgreich gelöscht.`,
      });
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
  
  // Handler für Modell-Management
  const handleDeleteModel = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie dieses Modell löschen möchten?')) {
      deleteModelMutation.mutate(id);
    }
  };
  
  const handleDeleteSelectedModels = () => {
    if (selectedModelIds.length === 0) return;
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedModelIds.length} ausgewählte Modell(e) löschen möchten?`)) {
      deleteSelectedModelsMutation.mutate(selectedModelIds);
    }
  };
  
  // Mutation zum Erstellen eines neuen Modells
  const createModelMutation = useMutation({
    mutationFn: async (data: { name: string; brandId: number }) => {
      const response = await apiRequest('POST', '/api/superadmin/models', data);
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
    
    createModelMutation.mutate(modelForm);
  };
  
  // Hilfsfunktion zum Filtern der Marken nach Gerätetyp
  const getFilteredBrands = () => {
    if (!brandsData) return [];
    
    return brandsData
      .filter(brand => !selectedBrandDeviceType || userDeviceTypes?.find(dt => dt.id === brand.deviceTypeId)?.name === selectedBrandDeviceType)
      .filter(brand => !brandSearchTerm || brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase()));
  };
  
  // Hilfsfunktion zum Filtern der Modelle nach Gerätetyp und/oder Marke
  const getFilteredModels = () => {
    if (!modelsData || !brandsData) return [];
    
    return modelsData
      .filter(model => {
        if (selectedModelDeviceType) {
          const brand = brandsData.find(b => b.id === model.brandId);
          if (!brand) return false;
          
          const deviceType = userDeviceTypes?.find(dt => dt.id === brand.deviceTypeId);
          if (!deviceType) return false;
          
          if (deviceType.name !== selectedModelDeviceType) return false;
        }
        
        if (selectedModelBrandId && model.brandId !== selectedModelBrandId) return false;
        
        if (modelSearchTerm && !model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())) return false;
        
        return true;
      })
      .map(model => {
        const brand = brandsData.find(b => b.id === model.brandId);
        if (!brand) return model;
        
        const deviceType = userDeviceTypes?.find(dt => dt.id === brand.deviceTypeId);
        
        return {
          ...model,
          brandName: brand.name,
          deviceTypeName: deviceType?.name
        };
      });
  };
  
  // Hilfsfunktion zur Massenbearbeitung von Fehlern
  const handleDeleteSelectedIssues = () => {
    if (selectedIssueIds.length === 0) return;
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedIssueIds.length} ausgewählte Fehlereinträge löschen möchten?`)) {
      Promise.all(selectedIssueIds.map(id => deleteIssueMutation.mutateAsync(id)))
        .then(() => {
          toast({
            title: "Erfolg",
            description: `${selectedIssueIds.length} Fehlereinträge wurden erfolgreich gelöscht.`,
          });
          setSelectedIssueIds([]);
          setSelectAllIssues(false);
        })
        .catch((error) => {
          toast({
            title: "Fehler",
            description: `Fehler beim Löschen einiger Einträge: ${error.message}`,
            variant: "destructive",
          });
        });
    }
  };
  
  // Hilfsvariablen für Statusanzeigen und Filterung
  const filteredBrands = getFilteredBrands();
  const filteredModels = getFilteredModels();
  
  // Berechne, ob alle sichtbaren Einträge ausgewählt sind
  const isAllIssuesSelected = 
    deviceIssues &&
    deviceIssues
      .filter(issue => 
        (!selectedDeviceType || issue.deviceType === selectedDeviceType) &&
        (!issueSearchTerm || issue.title.toLowerCase().includes(issueSearchTerm.toLowerCase()))
      )
      .every(issue => selectedIssueIds.includes(issue.id)) &&
    deviceIssues
      .filter(issue => 
        (!selectedDeviceType || issue.deviceType === selectedDeviceType) &&
        (!issueSearchTerm || issue.title.toLowerCase().includes(issueSearchTerm.toLowerCase()))
      ).length > 0;
  
  // Suchfilter für Fehler
  const [issueSearchTerm, setIssueSearchTerm] = useState('');
  const [issueFilterDeviceType, setIssueFilterDeviceType] = useState<string | null>(null);
  const [issueFilterSeverity, setIssueFilterSeverity] = useState<"low" | "medium" | "high" | "critical" | null>(null);
  const [isDeleteMultipleIssuesDialogOpen, setIsDeleteMultipleIssuesDialogOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState("statistics");
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Geräte-Verwaltung</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Gerätetypen, Marken und Modelle im System
          </p>
        </div>
        <div className="hidden md:block">
          <select
            className="bg-background border-input h-10 rounded-md border px-3 py-2 text-sm"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="statistics">Gerätestatistik</option>
            <option value="device-types">Gerätearten</option>
            <option value="brands">Marken</option>
            <option value="models">Modelle</option>
            <option value="issues">Fehlerkatalog</option>
            <option value="csv">CSV Im-/Export</option>
          </select>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="md:hidden">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="statistics">Statistik</TabsTrigger>
            <TabsTrigger value="device-types">Gerätearten</TabsTrigger>
            <TabsTrigger value="brands">Marken</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="models">Modelle</TabsTrigger>
            <TabsTrigger value="issues">Fehlerkatalog</TabsTrigger>
            <TabsTrigger value="csv">CSV</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="hidden md:block">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="statistics">Statistik</TabsTrigger>
            <TabsTrigger value="device-types">Gerätearten</TabsTrigger>
            <TabsTrigger value="brands">Marken</TabsTrigger>
            <TabsTrigger value="models">Modelle</TabsTrigger>
            <TabsTrigger value="issues">Fehlerkatalog</TabsTrigger>
            <TabsTrigger value="csv">CSV Im-/Export</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Geräteübersicht</CardTitle>
              <CardDescription>
                Statistiken zu Gerätetypen, Marken und Modellen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatistics ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : deviceStatistics ? (
                <div className="space-y-8">
                  {/* Zusammenfassungskarten */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gerätetypen</CardTitle>
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{deviceStatistics.totalDeviceTypes}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Marken</CardTitle>
                        <Factory className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{deviceStatistics.totalBrands}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Modelle</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{deviceStatistics.totalModels}</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Detaillierte Statistiken nach Gerätetyp */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Details nach Gerätetyp</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deviceStatistics.deviceTypeStats.map(stat => (
                        <Card key={stat.name}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                              {getDeviceTypeIcon(stat.name)}
                              <span className="ml-2">{stat.name}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Marken:</span>
                                <span className="font-semibold">{stat.brandCount}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Modelle:</span>
                                <span className="font-semibold">{stat.modelCount}</span>
                              </div>
                              
                              {stat.brands.length > 0 && (
                                <div className="pt-2 mt-2 border-t">
                                  <p className="text-xs text-muted-foreground mb-1">Top Marken:</p>
                                  <div className="space-y-1">
                                    {stat.brands.slice(0, 5).map(brand => (
                                      <div key={brand.name} className="flex justify-between items-center">
                                        <span className="text-xs truncate max-w-[150px]">{brand.name}</span>
                                        <span className="text-xs font-medium">{brand.modelCount} Modelle</span>
                                      </div>
                                    ))}
                                    {stat.brands.length > 5 && (
                                      <div className="text-xs text-muted-foreground text-right">
                                        + {stat.brands.length - 5} weitere
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Statistikdaten verfügbar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="device-types">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
              <div>
                <CardTitle>Gerätetypen</CardTitle>
                <CardDescription>
                  Verwalten Sie die Gerätetypen im System
                </CardDescription>
              </div>
              <Button onClick={handleCreateDeviceType}>
                <Plus className="mr-2 h-4 w-4" /> Gerätetyp hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDeviceTypesList ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : deviceTypesList && deviceTypesList.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex mb-4">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Gerätetyp suchen..."
                        className="pl-8 pr-4"
                        value={deviceTypeSearchTerm}
                        onChange={(e) => setDeviceTypeSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Icon</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Marken</TableHead>
                          <TableHead>Modelle</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deviceTypesList
                          .filter(type => !deviceTypeSearchTerm || type.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase()))
                          .map(type => {
                            const stats = deviceStatistics?.deviceTypeStats.find(stat => stat.name === type);
                            
                            return (
                              <TableRow key={type}>
                                <TableCell>
                                  {getDeviceTypeIcon(type)}
                                </TableCell>
                                <TableCell className="font-medium">{type}</TableCell>
                                <TableCell>{stats ? stats.brandCount : 0}</TableCell>
                                <TableCell>{stats ? stats.modelCount : 0}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleEditDeviceType(type)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => handleDeleteDeviceType(type)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Gerätetypen vorhanden. Erstellen Sie Ihren ersten Gerätetyp.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="brands">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
              <div>
                <CardTitle>Marken</CardTitle>
                <CardDescription>
                  Verwalten Sie die Gerätemarken im System
                </CardDescription>
              </div>
              <Button onClick={handleCreateBrand}>
                <Plus className="mr-2 h-4 w-4" /> Marke hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingBrands ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : brandsData && brandsData.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Marke suchen..."
                        className="pl-8 pr-4"
                        value={brandSearchTerm}
                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select 
                      value={selectedBrandDeviceType || "all"} 
                      onValueChange={(value) => setSelectedBrandDeviceType(value === "all" ? null : value)}
                    >
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Alle Gerätetypen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Gerätetypen</SelectItem>
                        {deviceTypesList && deviceTypesList.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center ml-auto space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setBrandSearchTerm('');
                          setSelectedBrandDeviceType(null);
                          setSelectedBrandIds([]);
                          setSelectAllBrands(false);
                        }}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" /> Zurücksetzen
                      </Button>
                      
                      {selectedBrandIds.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteSelectedBrands}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {selectedBrandIds.length} löschen
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ width: 40 }}>
                            <Checkbox 
                              checked={
                                filteredBrands.length > 0 && 
                                filteredBrands.every(brand => selectedBrandIds.includes(brand.id))
                              } 
                              onCheckedChange={(checked) => {
                                setSelectAllBrands(!!checked);
                                if (checked) {
                                  setSelectedBrandIds(filteredBrands.map(brand => brand.id));
                                } else {
                                  setSelectedBrandIds([]);
                                }
                              }}
                              aria-label="Alle auswählen"
                            />
                          </TableHead>
                          <TableHead>Gerätetyp</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Modelle</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBrands.length > 0 ? (
                          filteredBrands.map(brand => {
                            const deviceType = userDeviceTypes?.find(dt => dt.id === brand.deviceTypeId);
                            const modelCount = modelsData?.filter(model => model.brandId === brand.id).length || 0;
                            
                            return (
                              <TableRow key={brand.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedBrandIds.includes(brand.id)} 
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedBrandIds([...selectedBrandIds, brand.id]);
                                      } else {
                                        setSelectedBrandIds(selectedBrandIds.filter(id => id !== brand.id));
                                        setSelectAllBrands(false);
                                      }
                                    }}
                                    aria-label={`${brand.name} auswählen`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    {deviceType && getDeviceTypeIcon(deviceType.name)}
                                    <span className="ml-2">{deviceType?.name || 'Unbekannt'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">{brand.name}</TableCell>
                                <TableCell>{modelCount}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => handleDeleteBrand(brand.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              {brandSearchTerm || selectedBrandDeviceType ? (
                                <div>Keine Marken für die aktuelle Suche gefunden.</div>
                              ) : (
                                <div>Keine Marken vorhanden.</div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Marken vorhanden. Erstellen Sie Ihre erste Marke.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="models">
          <div className="space-y-6">
            <div className="flex">
              <Button onClick={handleCreateModel} className="ml-auto">
                <Plus className="mr-2 h-4 w-4" /> Modell hinzufügen
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Modelle</CardTitle>
                <CardDescription>
                  Verwalten Sie die Gerätemodelle im System
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingModels ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                  </div>
                ) : modelsData && modelsData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Modell suchen..."
                          className="pl-8 pr-4"
                          value={modelSearchTerm}
                          onChange={(e) => setModelSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <Select 
                        value={selectedModelDeviceType || "all"} 
                        onValueChange={(value) => {
                          setSelectedModelDeviceType(value === "all" ? null : value);
                          setSelectedModelBrandId(null); // Reset brand when device type changes
                        }}
                      >
                        <SelectTrigger className="w-full md:w-[180px]">
                          <SelectValue placeholder="Alle Gerätetypen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Gerätetypen</SelectItem>
                          {deviceTypesList && deviceTypesList.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={selectedModelBrandId?.toString() || "all"} 
                        onValueChange={(value) => setSelectedModelBrandId(value === "all" ? null : parseInt(value, 10))}
                        disabled={!selectedModelDeviceType}
                      >
                        <SelectTrigger className="w-full md:w-[180px]">
                          <SelectValue placeholder="Alle Marken" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Marken</SelectItem>
                          {brandsData && userDeviceTypes && selectedModelDeviceType && brandsData
                            .filter(brand => {
                              const deviceType = userDeviceTypes.find(dt => dt.id === brand.deviceTypeId);
                              return deviceType && deviceType.name === selectedModelDeviceType;
                            })
                            .map(brand => (
                              <SelectItem key={brand.id} value={brand.id.toString()}>{brand.name}</SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center ml-auto space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setModelSearchTerm('');
                            setSelectedModelDeviceType(null);
                            setSelectedModelBrandId(null);
                            setSelectedModelIds([]);
                            setSelectAllModels(false);
                          }}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" /> Zurücksetzen
                        </Button>
                        
                        {selectedModelIds.length > 0 && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={handleDeleteSelectedModels}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {selectedModelIds.length} löschen
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead style={{ width: 40 }}>
                              <Checkbox 
                                checked={
                                  filteredModels.length > 0 && 
                                  filteredModels.every(model => selectedModelIds.includes(model.id))
                                } 
                                onCheckedChange={(checked) => {
                                  setSelectAllModels(!!checked);
                                  if (checked) {
                                    setSelectedModelIds(filteredModels.map(model => model.id));
                                  } else {
                                    setSelectedModelIds([]);
                                  }
                                }}
                                aria-label="Alle auswählen"
                              />
                            </TableHead>
                            <TableHead>Gerätetyp</TableHead>
                            <TableHead>Marke</TableHead>
                            <TableHead>Modell</TableHead>
                            <TableHead className="text-right">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredModels.length > 0 ? (
                            filteredModels.map(model => {
                              return (
                                <TableRow key={model.id}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={selectedModelIds.includes(model.id)} 
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedModelIds([...selectedModelIds, model.id]);
                                        } else {
                                          setSelectedModelIds(selectedModelIds.filter(id => id !== model.id));
                                          setSelectAllModels(false);
                                        }
                                      }}
                                      aria-label={`${model.name} auswählen`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      {model.deviceTypeName && getDeviceTypeIcon(model.deviceTypeName)}
                                      <span className="ml-2">{model.deviceTypeName || 'Unbekannt'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{model.brandName || 'Unbekannt'}</TableCell>
                                  <TableCell className="font-medium">{model.name}</TableCell>
                                  <TableCell className="text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => handleDeleteModel(model.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                {modelSearchTerm || selectedModelDeviceType || selectedModelBrandId ? (
                                  <div>Keine Modelle für die aktuelle Suche gefunden.</div>
                                ) : (
                                  <div>Keine Modelle vorhanden.</div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Modelle vorhanden. Erstellen Sie Ihr erstes Modell.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Fehlerkatalog Tab - ersetzt durch verbesserten Fehlerkatalog */}
        <TabsContent value="issues">
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg font-semibold">Fehlerkatalog</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Der Fehlerkatalog wurde durch eine neue, verbesserte Version mit Gerätetyp-Icons ersetzt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Hinweis: Verbesserte Version verfügbar</h3>
                  <p className="text-muted-foreground mb-4">
                    Der Fehlerkatalog wurde durch die "Fehler-Vorschau" ersetzt, die eine verbesserte Darstellung mit 
                    Gerätetyp-Icons statt Namen bietet und mehr Platz für Fehlerbeschreibungen lässt.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/superadmin?tab=error-preview'}
                  >
                    Zur neuen Fehler-Vorschau wechseln
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="csv">
          <DeviceDataCSVImportExport />
        </TabsContent>
        
        <TabsContent value="statistics">
          {/* Mobile-Ansicht für Statistik (dupliziert für einfacheren Zugriff) */}
        </TabsContent>
      </Tabs>
      
      {/* Gerätetyp-Dialoge */}
      <Dialog open={isCreateDeviceTypeOpen} onOpenChange={setIsCreateDeviceTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Gerätetyp erstellen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Gerätetyp zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deviceTypeName">Name</Label>
              <Input 
                id="deviceTypeName" 
                placeholder="z.B. Smartphone, Tablet, etc." 
                value={deviceTypeForm.name}
                onChange={(e) => setDeviceTypeForm({ ...deviceTypeForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDeviceTypeOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmitCreateDeviceType}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDeviceTypeOpen} onOpenChange={setIsEditDeviceTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerätetyp bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie den Namen des Gerätetyps.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editDeviceTypeName">Name</Label>
              <Input 
                id="editDeviceTypeName" 
                value={deviceTypeForm.name}
                onChange={(e) => setDeviceTypeForm({ ...deviceTypeForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDeviceTypeOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmitEditDeviceType}>Aktualisieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Marken-Dialoge */}
      <Dialog open={isCreateBrandOpen} onOpenChange={setIsCreateBrandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Marke erstellen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Gerätemarke zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="brandName">Name</Label>
              <Input 
                id="brandName" 
                placeholder="z.B. Apple, Samsung, etc." 
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandDeviceType">Gerätetyp</Label>
              <Select 
                value={brandForm.deviceTypeId ? brandForm.deviceTypeId.toString() : ""} 
                onValueChange={(value) => setBrandForm({ ...brandForm, deviceTypeId: parseInt(value, 10) })}
              >
                <SelectTrigger id="brandDeviceType">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {userDeviceTypes && userDeviceTypes.map(deviceType => (
                    <SelectItem key={deviceType.id} value={deviceType.id.toString()}>
                      {deviceType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateBrandOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmitCreateBrand}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modell-Dialoge */}
      <Dialog open={isCreateModelOpen} onOpenChange={setIsCreateModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Modell erstellen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Gerätemodell zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="modelName">Name</Label>
              <Input 
                id="modelName" 
                placeholder="z.B. iPhone 13, Galaxy S21, etc." 
                value={modelForm.name}
                onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelDeviceType">Gerätetyp</Label>
              <Select 
                value={selectedModelDeviceType || ""} 
                onValueChange={(value) => {
                  setSelectedModelDeviceType(value);
                  setModelForm({ ...modelForm, brandId: 0 }); // Reset brand when device type changes
                }}
              >
                <SelectTrigger id="modelDeviceType">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypesList && deviceTypesList.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelBrand">Marke</Label>
              <Select 
                value={modelForm.brandId ? modelForm.brandId.toString() : ""} 
                onValueChange={(value) => setModelForm({ ...modelForm, brandId: parseInt(value, 10) })}
                disabled={!selectedModelDeviceType}
              >
                <SelectTrigger id="modelBrand">
                  <SelectValue placeholder="Marke auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {brandsData && userDeviceTypes && selectedModelDeviceType && brandsData
                    .filter(brand => {
                      const deviceType = userDeviceTypes.find(dt => dt.id === brand.deviceTypeId);
                      return deviceType && deviceType.name === selectedModelDeviceType;
                    })
                    .map(brand => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>{brand.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModelOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmitCreateModel} disabled={!modelForm.brandId}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Fehlerkatalog-Dialoge */}
      <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Fehlereintrag erstellen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Eintrag zum Fehlerkatalog hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="issueDeviceType">Gerätetyp</Label>
              <Select 
                value={issueForm.deviceType || ""} 
                onValueChange={(value) => setIssueForm({ ...issueForm, deviceType: value })}
              >
                <SelectTrigger id="issueDeviceType">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes && deviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueTitle">Titel</Label>
              <Input 
                id="issueTitle" 
                placeholder="z.B. Displaybruch, Wasserschaden, etc." 
                value={issueForm.title}
                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDescription">Beschreibung</Label>
              <Textarea 
                id="issueDescription" 
                placeholder="Detaillierte Beschreibung des Problems" 
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueSolution">Lösung</Label>
              <Textarea 
                id="issueSolution" 
                placeholder="Mögliche Lösungsansätze" 
                value={issueForm.solution}
                onChange={(e) => setIssueForm({ ...issueForm, solution: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueSeverity">Schweregrad</Label>
              <Select 
                value={issueForm.severity} 
                onValueChange={(value) => setIssueForm({ ...issueForm, severity: value as "low" | "medium" | "high" | "critical" })}
              >
                <SelectTrigger id="issueSeverity">
                  <SelectValue placeholder="Schweregrad auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="issueIsCommon" 
                checked={issueForm.isCommon}
                onCheckedChange={(checked) => setIssueForm({ ...issueForm, isCommon: !!checked })}
              />
              <Label htmlFor="issueIsCommon">Häufiges Problem</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateIssueOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmitCreateIssue}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditIssueOpen} onOpenChange={setIsEditIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fehlereintrag bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie den Fehlereintrag im Katalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editIssueDeviceType">Gerätetyp</Label>
              <Select 
                value={issueForm.deviceType} 
                onValueChange={(value) => setIssueForm({ ...issueForm, deviceType: value })}
              >
                <SelectTrigger id="editIssueDeviceType">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes && deviceTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIssueTitle">Titel</Label>
              <Input 
                id="editIssueTitle" 
                value={issueForm.title}
                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIssueDescription">Beschreibung</Label>
              <Textarea 
                id="editIssueDescription" 
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIssueSolution">Lösung</Label>
              <Textarea 
                id="editIssueSolution" 
                value={issueForm.solution}
                onChange={(e) => setIssueForm({ ...issueForm, solution: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIssueSeverity">Schweregrad</Label>
              <Select 
                value={issueForm.severity} 
                onValueChange={(value) => setIssueForm({ ...issueForm, severity: value as "low" | "medium" | "high" | "critical" })}
              >
                <SelectTrigger id="editIssueSeverity">
                  <SelectValue placeholder="Schweregrad auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="editIssueIsCommon" 
                checked={issueForm.isCommon}
                onCheckedChange={(checked) => setIssueForm({ ...issueForm, isCommon: !!checked })}
              />
              <Label htmlFor="editIssueIsCommon">Häufiges Problem</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIssueOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSubmitEditIssue}>Aktualisieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteMultipleIssuesDialogOpen} onOpenChange={setIsDeleteMultipleIssuesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mehrere Fehlereinträge löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie wirklich {selectedIssueIds.length} Fehlereinträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteMultipleIssuesDialogOpen(false)}>Abbrechen</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                handleDeleteSelectedIssues();
                setIsDeleteMultipleIssuesDialogOpen(false);
              }}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}