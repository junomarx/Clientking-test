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
import { Trash2, Plus, Pencil, Search, Filter, AlertCircle, Smartphone, Tablet, Laptop, Watch, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import HerstellerBulkImport from "./HerstellerBulkImport";
import ModelleBulkImport from "./ModelleBulkImport";
import FehlerkatalogBulkImport from "./FehlerkatalogBulkImport";
import DeviceDataExportImport from "./DeviceDataExportImport";

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
  const { data: deviceIssues, isLoading: isLoadingIssues } = useQuery<DeviceIssue[]>({
    queryKey: ["/api/superadmin/device-issues"],
    enabled: true,
  });

  const { data: deviceTypes } = useQuery<string[]>({
    queryKey: ["/api/superadmin/device-types"],
    enabled: true,
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
  
  // State für Modellverwaltung
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  const [selectedModelDeviceType, setSelectedModelDeviceType] = useState<string | null>(null);
  const [selectedModelBrandId, setSelectedModelBrandId] = useState<number | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectAllModels, setSelectAllModels] = useState(false);
  
  // API-Abfrage: Alle Gerätetypen abrufen
  const { data: deviceTypesList, isLoading: isLoadingDeviceTypesList } = useQuery<string[]>({
    queryKey: ["/api/superadmin/device-types"],
    enabled: true,
  });
  
  // API-Abfrage: Alle Marken abrufen
  const { data: brandsData, isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ["/api/superadmin/brands"],
    enabled: true,
  });
  
  // Da wir auch die IDs der Gerätetypen benötigen, müssen wir sie direkt abfragen
  // Wir verwenden die URL ohne "-" für die API-Anfrage
  const { data: userDeviceTypes } = useQuery<UserDeviceType[]>({
    queryKey: ["/api/superadmin/device-types/all"],
    enabled: true,
  });
  
  // API-Abfrage: Alle Modelle abrufen
  const { data: modelsData, isLoading: isLoadingModels } = useQuery<Model[]>({
    queryKey: ["/api/superadmin/models"],
    enabled: true,
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
  
  // Handler für Marken-Management
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
          const typeMatches = !selectedBrandDeviceType || deviceTypeName === selectedBrandDeviceType;
          
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
  
  // Mutation zum Löschen mehrerer Fehlereinträge
  const deleteBulkIssuesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermmitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      console.log('Sende folgende Fehlereinträge-IDs zum Löschen:', numericIds);
      
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
      const filteredIssueIds = deviceIssues
        ?.filter(issue => {
          // Filterung nach Fehlertyp
          return !selectedDeviceType || issue.deviceType === selectedDeviceType;
        })
        .map(issue => issue.id) || [];
      
      setSelectedIssueIds(filteredIssueIds);
      setSelectAllIssues(true);
    }
  };
  
  // Handler für das Löschen ausgewählter Fehlereinträge
  const handleDeleteSelectedIssues = async () => {
    if (selectedIssueIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens einen Fehlereintrag aus."
      });
      return;
    }
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedIssueIds.length} ausgewählte Fehlereinträge löschen möchten?`)) {
      try {
        // Toast anzeigen, dass der Löschvorgang läuft
        toast({
          title: "Löschvorgang läuft",
          description: `${selectedIssueIds.length} Fehlereinträge werden gelöscht...`
        });
        
        // Bulk-Endpoint für das Löschen verwenden
        await deleteBulkIssuesMutation.mutateAsync(selectedIssueIds);
      } catch (error) {
        console.error("Fehler beim Löschen von Fehlereinträgen:", error);
        toast({
          title: "Fehler",
          description: "Beim Löschen der Fehlereinträge ist ein Fehler aufgetreten.",
          variant: "destructive"
        });
      }
    }
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
            typeMatches = deviceType?.name === selectedModelDeviceType;
          }
          
          // Filterung nach Marke, falls ausgewählt
          let brandMatches = true;
          if (selectedModelBrandId !== null) {
            brandMatches = model.brandId === selectedModelBrandId;
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
  
  // Gefilterte Gerätetypen basierend auf dem Suchbegriff
  const filteredDeviceTypes = deviceTypesList
    ? deviceTypesList.filter(type =>
        type.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase())
      )
    : [];
  
  // Hilfsfunktion zum Filtern von Marken basierend auf dem ausgewählten Gerätetyp
  const getFilteredBrands = (deviceType: string | null) => {
    if (!brandsData || !userDeviceTypes) return [];
    
    if (!deviceType) return brandsData;
    
    // Gerätetyp-ID ermitteln
    const deviceTypeObj = userDeviceTypes.find(dt => dt.name === deviceType);
    if (!deviceTypeObj) return [];
    
    // Marken nach Gerätetyp-ID filtern
    return brandsData.filter(brand => brand.deviceTypeId === deviceTypeObj.id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Geräteverwaltung</h1>
      
      {/* Export/Import-Komponente am Anfang der Seite platzieren */}
      <DeviceDataExportImport />
      
      <Tabs defaultValue="types" className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="types">Gerätetypen</TabsTrigger>
          <TabsTrigger value="brands">Marken</TabsTrigger>
          <TabsTrigger value="models">Modelle</TabsTrigger>
          <TabsTrigger value="issues">Fehlerkatalog</TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Gerätetypen</CardTitle>
                <CardDescription>
                  Verwalten Sie globale Gerätetypen, die von allen Shops verwendet werden können
                </CardDescription>
              </div>
              <Button onClick={handleCreateDeviceType}>
                <Plus className="mr-2 h-4 w-4" /> Gerätetyp hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
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
                                disabled={["Smartphone", "Tablet", "Laptop", "Watch"].includes(type)}
                                title={["Smartphone", "Tablet", "Laptop", "Watch"].includes(type) ? "Standardgerätetypen können nicht bearbeitet werden" : "Gerätetyp bearbeiten"}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteDeviceType(type)}
                                disabled={["Smartphone", "Tablet", "Laptop", "Watch"].includes(type)}
                                title={["Smartphone", "Tablet", "Laptop", "Watch"].includes(type) ? "Standardgerätetypen können nicht gelöscht werden" : "Gerätetyp löschen"}
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
            {/* Komponente für den Marken-Massenimport */}
            <HerstellerBulkImport deviceTypes={deviceTypes} />
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Marken</CardTitle>
                  <CardDescription>Hier werden alle vorhandenen Marken angezeigt</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
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
                        {deviceTypesList?.map((type) => (
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
            {/* Komponente für den Modell-Massenimport */}
            <ModelleBulkImport deviceTypes={deviceTypes || []} />
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Modelle</CardTitle>
                  <CardDescription>Hier werden alle vorhandenen Modelle angezeigt</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
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
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="modelBrandFilter" className="whitespace-nowrap">Marke:</Label>
                    <Select
                      value={selectedModelBrandId?.toString() || "all"}
                      onValueChange={(value) => setSelectedModelBrandId(value === "all" ? null : parseInt(value))}
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
                              typeMatches = model.deviceTypeName === selectedModelDeviceType;
                            }
                            
                            // Filterung nach Marke, falls ausgewählt
                            let brandMatches = true;
                            if (selectedModelBrandId !== null) {
                              brandMatches = model.brandId === selectedModelBrandId;
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
        
        {/* Fehlerkatalog Tab */}
        <TabsContent value="issues">
          {/* Komponente für den Fehlerkatalog-Massenimport */}
          <FehlerkatalogBulkImport deviceTypes={deviceTypes} />
          
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Fehlerkatalog</CardTitle>
                <CardDescription>
                  Verwalten Sie häufige Geräteprobleme und Lösungen
                </CardDescription>
              </div>
              <Button onClick={handleCreateIssue}>
                <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                {selectedIssueIds.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelectedIssues}
                    className="flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span>{selectedIssueIds.length} Eintrag{selectedIssueIds.length > 1 ? 'e' : ''} löschen</span>
                  </Button>
                )}
                
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Fehler suchen..." 
                    className="pl-8" 
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="issueDeviceTypeFilter" className="whitespace-nowrap">Gerätetyp:</Label>
                  <Select 
                    value={selectedDeviceType || "all"}
                    onValueChange={(value) => setSelectedDeviceType(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Alle Typen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Typen</SelectItem>
                      {deviceTypes?.map((type) => (
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
                
                {/* Nur anzeigen, wenn ein Filter aktiv ist */}
                {selectedDeviceType && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedDeviceType(null)}
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
              ) : deviceIssues && deviceIssues.length > 0 ? (
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
                        <TableHead>Gerätetyp</TableHead>
                        <TableHead>Titel</TableHead>
                        <TableHead>Schweregrad</TableHead>
                        <TableHead>Häufig</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviceIssues
                        .filter(issue => !selectedDeviceType || issue.deviceType === selectedDeviceType)
                        .map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell className="w-10">
                              <Checkbox
                                checked={selectedIssueIds.includes(issue.id)}
                                onCheckedChange={() => handleToggleIssueSelection(issue.id)}
                                aria-label={`Fehlereintrag ${issue.title} auswählen`}
                              />
                            </TableCell>
                            <TableCell>{issue.deviceType}</TableCell>
                            <TableCell>
                              <div className="font-medium">{issue.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {issue.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`
                                  ${issue.severity === 'low' ? 'bg-blue-100 text-blue-800' : ''}
                                  ${issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                  ${issue.severity === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                  ${issue.severity === 'critical' ? 'bg-red-100 text-red-800' : ''}
                                `}
                              >
                                {issue.severity === 'low' ? 'Niedrig' : ''}
                                {issue.severity === 'medium' ? 'Mittel' : ''}
                                {issue.severity === 'high' ? 'Hoch' : ''}
                                {issue.severity === 'critical' ? 'Kritisch' : ''}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {issue.isCommon ? (
                                <Badge variant="default" className="bg-green-500">
                                  Häufig
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  Selten
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditIssue(issue)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
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
                  <h3 className="mt-4 text-lg font-semibold">Keine Einträge gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    Es wurden keine Fehlereinträge gefunden. Fügen Sie neue Einträge hinzu, um den Katalog zu füllen.
                  </p>
                  <Button onClick={handleCreateIssue}>
                    <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Dialog zum Erstellen eines neuen Fehlereintrags */}
      <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Neuen Fehlereintrag erstellen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Eintrag zum Fehlerkatalog hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={issueForm.deviceType}
                onValueChange={(value) => setIssueForm({...issueForm, deviceType: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Titel
              </Label>
              <Input
                id="title"
                value={issueForm.title}
                onChange={(e) => setIssueForm({...issueForm, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="severity" className="text-right">
                Schweregrad
              </Label>
              <Select
                value={issueForm.severity}
                onValueChange={(value) => setIssueForm({...issueForm, severity: value as "low" | "medium" | "high" | "critical"})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isCommon" className="text-right">
                Häufig vorkommend
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <input
                  type="checkbox"
                  id="isCommon"
                  checked={issueForm.isCommon}
                  onChange={(e) => setIssueForm({...issueForm, isCommon: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Dieser Fehler tritt häufig auf</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Beschreibung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="description"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Beschreibung des Problems"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="solution" className="text-right pt-2">
                Lösung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="solution"
                  value={issueForm.solution}
                  onChange={(e) => setIssueForm({...issueForm, solution: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Lösungsvorschlag für das Problem"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateIssueOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => handleSubmitCreateIssue()} disabled={!issueForm.title || !issueForm.deviceType}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Bearbeiten eines Fehlereintrags */}
      <Dialog open={isEditIssueOpen} onOpenChange={setIsEditIssueOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Fehlereintrag bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen des Fehlereintrags.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={issueForm.deviceType}
                onValueChange={(value) => setIssueForm({...issueForm, deviceType: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Gerätetyp auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes?.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Titel
              </Label>
              <Input
                id="title"
                value={issueForm.title}
                onChange={(e) => setIssueForm({...issueForm, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="severity" className="text-right">
                Schweregrad
              </Label>
              <Select
                value={issueForm.severity}
                onValueChange={(value) => setIssueForm({...issueForm, severity: value as "low" | "medium" | "high" | "critical"})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isCommon" className="text-right">
                Häufig vorkommend
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <input
                  type="checkbox"
                  id="isCommon"
                  checked={issueForm.isCommon}
                  onChange={(e) => setIssueForm({...issueForm, isCommon: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Dieser Fehler tritt häufig auf</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Beschreibung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="description"
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({...issueForm, description: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Beschreibung des Problems"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="solution" className="text-right pt-2">
                Lösung
              </Label>
              <div className="col-span-3">
                <textarea
                  id="solution"
                  value={issueForm.solution}
                  onChange={(e) => setIssueForm({...issueForm, solution: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Lösungsvorschlag für das Problem"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIssueOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => handleSubmitEditIssue()} disabled={!issueForm.title || !issueForm.deviceType}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Erstellen eines neuen Gerätetyps */}
      <Dialog open={isCreateDeviceTypeOpen} onOpenChange={setIsCreateDeviceTypeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Neuen Gerätetyp erstellen</DialogTitle>
            <DialogDescription>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerätetyp bearbeiten</DialogTitle>
            <DialogDescription>
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
    </div>
  );
}


