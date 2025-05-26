import React, { useState, useEffect } from "react";
import { useMediaQuery } from '@/hooks/use-media-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Search, Filter, AlertCircle, Smartphone, Tablet, Laptop, Watch, Gamepad2, X, Factory, Layers, RefreshCcw, Upload, FileUp, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import OptimizedDevicesTable from "./OptimizedDevicesTable";
import CsvImportExportModal from "./CsvImportExportModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DeviceDataCSVImportExport from "./DeviceDataCSVImportExport";
import ErrorCatalogCSVImportExport from "./ErrorCatalogCSVImportExport";

// Interfaces für Geräte
interface DeviceType {
  id: number;
  name: string;
  userId: number;
  shopId: number;
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

interface ErrorCatalogEntry {
  id: number;
  errorText: string;
  forSmartphone: boolean;
  forTablet: boolean;
  forLaptop: boolean;
  forSmartwatch: boolean;
  forGameconsole: boolean;
  shopId: number;
  createdAt: string;
  updatedAt: string;
}

export default function ResponsiveSuperadminDevicesTab() {
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // State für die aktive Tab-Navigation
  const [activeTab, setActiveTab] = useState("types");

  // States für Gerätetypen
  const [deviceTypeSearchTerm, setDeviceTypeSearchTerm] = useState("");
  const [isCreateDeviceTypeOpen, setIsCreateDeviceTypeOpen] = useState(false);
  const [isEditDeviceTypeOpen, setIsEditDeviceTypeOpen] = useState(false);
  const [deviceTypeForm, setDeviceTypeForm] = useState({ name: "", oldName: "" });
  const [selectedDeviceTypeIds, setSelectedDeviceTypeIds] = useState<number[]>([]);

  // States für Marken
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [selectedBrandDeviceType, setSelectedBrandDeviceType] = useState<string | null>(null);
  const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: "", deviceTypeId: 0 });
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [isBulkImportBrandsOpen, setIsBulkImportBrandsOpen] = useState(false);
  const [bulkBrandText, setBulkBrandText] = useState("");
  const [selectedDeviceTypeForBulkBrands, setSelectedDeviceTypeForBulkBrands] = useState("");

  // States für Modelle
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  const [selectedModelsBrandId, setSelectedModelsBrandId] = useState<number | null>(null);
  const [selectedModelDeviceType, setSelectedModelDeviceType] = useState<string | null>(null);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ name: "", brandId: 0 });
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectedBrandForBulk, setSelectedBrandForBulk] = useState<number | null>(null);
  const [bulkModelText, setBulkModelText] = useState("");
  const [isBulkImportModelsOpen, setIsBulkImportModelsOpen] = useState(false);

  // States für neuen Fehlerkatalog
  const [errorCatalogSearchTerm, setErrorCatalogSearchTerm] = useState("");
  const [isCreateErrorCatalogEntryOpen, setIsCreateErrorCatalogEntryOpen] = useState(false);
  const [isEditErrorCatalogEntryOpen, setIsEditErrorCatalogEntryOpen] = useState(false);
  const [errorCatalogEntryForm, setErrorCatalogEntryForm] = useState({ 
    id: 0,
    errorText: "", 
    forSmartphone: true, 
    forTablet: true, 
    forLaptop: true, 
    forSmartwatch: true,
    forGameconsole: true
  });
  const [selectedErrorCatalogIds, setSelectedErrorCatalogIds] = useState<number[]>([]);
  
  // State für CSV Modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isBulkImportErrorCatalogOpen, setIsBulkImportErrorCatalogOpen] = useState(false);
  const [bulkErrorCatalogText, setBulkErrorCatalogText] = useState("");

  // Abfragen
  const { data: deviceTypesList = [], isLoading: isLoadingDeviceTypesList } = useQuery({
    queryKey: ["/api/superadmin/device-types"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/device-types');
      const data = await response.json();
      console.log("Geladene Gerätetypen:", data);
      return data;
    }
  });

  const { data: userDeviceTypes = [], isLoading: isLoadingUserDeviceTypes } = useQuery({
    queryKey: ["/api/superadmin/user-device-types"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/user-device-types');
      const data = await response.json();
      console.log("Geladene Benutzer-Gerätetypen:", data);
      return data;
    }
  });

  const { data: brandsData = [], isLoading: isLoadingBrands } = useQuery({
    queryKey: ["/api/superadmin/brands"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/brands');
      const data = await response.json();
      console.log("Geladene Marken:", data);
      console.log("Anzahl Marken:", data?.length || 0);
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: modelsData = [], isLoading: isLoadingModels } = useQuery({
    queryKey: ["/api/superadmin/models"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/models');
      const data = await response.json();
      console.log("Geladene Modelle:", data);
      return data;
    }
  });

  const { data: errorCatalogData = [], isLoading: isLoadingErrorCatalog } = useQuery({
    queryKey: ["/api/superadmin/error-catalog"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/error-catalog');
      return response.json();
    }
  });

  // Filtern der Daten basierend auf den Suchbegriffen und ausgewählten Filtern
  const filteredDeviceTypes = deviceTypesList.filter((type: DeviceType) => 
    type && type.name && type.name.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase())
  );

  const filteredBrands = brandsData.filter((brand: Brand) => {
    if (!brand || !brand.name) return false;
    const nameMatches = brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase());
    const typeMatches = !selectedBrandDeviceType || selectedBrandDeviceType === "all" || brand.deviceTypeName === selectedBrandDeviceType;
    
    // Debug-Ausgabe für die ersten paar Marken
    if (brandsData.indexOf(brand) < 3) {
      console.log(`Brand Filter Debug - Brand: ${brand.name}, DeviceType: ${brand.deviceTypeName}, Selected: ${selectedBrandDeviceType}, TypeMatches: ${typeMatches}, NameMatches: ${nameMatches}`);
    }
    
    return nameMatches && typeMatches;
  });

  const filteredModels = modelsData.filter((model: Model) => {
    if (!model || !model.name) return false;
    const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
    const typeMatches = !selectedModelDeviceType || model.deviceTypeName === selectedModelDeviceType;
    const brandMatches = !selectedModelsBrandId || selectedModelsBrandId === 0 || model.brandId === selectedModelsBrandId;
    
    // Debug-Ausgabe für die ersten paar Modelle
    if (modelsData.indexOf(model) < 3) {
      console.log(`Filter Debug - Model: ${model.name}, TypeMatches: ${typeMatches}, BrandMatches: ${brandMatches}, NameMatches: ${nameMatches}`);
    }
    
    return nameMatches && typeMatches && brandMatches;
  });

  const filteredErrorCatalog = errorCatalogData.filter((entry: ErrorCatalogEntry) => 
    entry && entry.errorText && entry.errorText.toLowerCase().includes(errorCatalogSearchTerm.toLowerCase())
  );

  // Mutations für Gerätetypen
  const createDeviceTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/superadmin/device-types', { name });
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
      setDeviceTypeForm({ name: "", oldName: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDeviceTypeMutation = useMutation({
    mutationFn: async (data: { oldName: string; newName: string }) => {
      const response = await apiRequest('PUT', `/api/superadmin/device-types/${data.oldName}`, {
        name: data.newName,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Gerätetyps');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/user-device-types"] });
      toast({
        title: "Erfolg",
        description: "Gerätetyp wurde erfolgreich aktualisiert.",
      });
      setIsEditDeviceTypeOpen(false);
      setDeviceTypeForm({ name: "", oldName: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDeviceTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('DELETE', `/api/superadmin/device-types/${name}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Gerätetyps');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/user-device-types"] });
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

  // Mutations für Marken
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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteBulkBrandsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermmitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const createBrandMutation = useMutation({
    mutationFn: async (data: { name: string, deviceTypeId: number }) => {
      const response = await apiRequest('POST', '/api/superadmin/create-brand', {
        name: data.name,
        deviceTypeId: data.deviceTypeId
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

  const importBulkBrandsMutation = useMutation({
    mutationFn: async (data: { brands: string[], deviceTypeId: number }) => {
      const brandsToImport = data.brands
        .filter(brand => brand.trim() !== '')
        .map(brand => ({ 
          name: brand.trim(), 
          deviceTypeId: data.deviceTypeId 
        }));
        
      if (brandsToImport.length === 0) {
        throw new Error('Keine gültigen Markennamen eingegeben.');
      }
      
      const response = await apiRequest('POST', '/api/superadmin/device-brands/bulk', {
        brands: brandsToImport
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Importieren der Marken');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/brands"] });
      toast({
        title: "Erfolg",
        description: `${data.addedCount} Marken wurden erfolgreich importiert.`,
      });
      setIsBulkImportBrandsOpen(false);
      setBulkBrandText('');
      setSelectedDeviceTypeForBulkBrands('');
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations für Modelle
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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBulkModelsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
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
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importBulkModelsMutation = useMutation({
    mutationFn: async (data: { models: string[], brandId: number }) => {
      const modelsToImport = data.models
        .filter(model => model.trim() !== '')
        .map(model => ({ 
          name: model.trim(), 
          brandId: data.brandId 
        }));
        
      if (modelsToImport.length === 0) {
        throw new Error('Keine gültigen Modellnamen eingegeben.');
      }
      
      const response = await apiRequest('POST', '/api/superadmin/device-models/bulk', {
        brandId: data.brandId,
        models: modelsToImport
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Importieren der Modelle');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/models"] });
      toast({
        title: "Erfolg",
        description: `${data.addedCount} Modelle wurden erfolgreich importiert.`,
      });
      setIsBulkImportModelsOpen(false);
      setBulkModelText('');
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

  // Mutations für Fehlerkatalog
  const createErrorCatalogEntryMutation = useMutation({
    mutationFn: async (data: {
      errorText: string;
      forSmartphone: boolean;
      forTablet: boolean;
      forLaptop: boolean;
      forSmartwatch: boolean;
      forGameconsole: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/superadmin/error-catalog', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Fehlerkatalog-Eintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlerkatalog-Eintrag wurde erfolgreich erstellt.",
      });
      setIsCreateErrorCatalogEntryOpen(false);
      setErrorCatalogEntryForm({
        id: 0,
        errorText: "",
        forSmartphone: true,
        forTablet: true,
        forLaptop: true,
        forSmartwatch: true,
        forGameconsole: true
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

  const updateErrorCatalogEntryMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      errorText: string;
      forSmartphone: boolean;
      forTablet: boolean;
      forLaptop: boolean;
      forSmartwatch: boolean;
      forGameconsole: boolean;
    }) => {
      const response = await apiRequest('PUT', `/api/superadmin/error-catalog/${data.id}`, {
        errorText: data.errorText,
        forSmartphone: data.forSmartphone,
        forTablet: data.forTablet,
        forLaptop: data.forLaptop,
        forSmartwatch: data.forSmartwatch,
        forGameconsole: data.forGameconsole
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Fehlerkatalog-Eintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlerkatalog-Eintrag wurde erfolgreich aktualisiert.",
      });
      setIsEditErrorCatalogEntryOpen(false);
      setErrorCatalogEntryForm({
        id: 0,
        errorText: "",
        forSmartphone: true,
        forTablet: true,
        forLaptop: true,
        forSmartwatch: true,
        forGameconsole: true
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

  const deleteErrorCatalogEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/error-catalog/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Fehlerkatalog-Eintrags');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlerkatalog-Eintrag wurde erfolgreich gelöscht.",
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

  const deleteBulkErrorCatalogMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      const response = await apiRequest('POST', '/api/superadmin/error-catalog/bulk-delete', { 
        ids: numericIds 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Fehlerkatalog-Einträge');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: `${data.deletedCount} Fehlerkatalog-Einträge wurden erfolgreich gelöscht.`,
      });
      // Auswahl zurücksetzen
      setSelectedErrorCatalogIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler-Funktionen für Gerätetypen
  const handleDeviceTypeSelect = (id: number) => {
    setSelectedDeviceTypeIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(typeId => typeId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeviceTypeSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedDeviceTypeIds(filteredDeviceTypes.map((type: any) => type.id));
    } else {
      setSelectedDeviceTypeIds([]);
    }
  };

  const handleCreateDeviceType = () => {
    if (!deviceTypeForm.name) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den Gerätetyp ein.",
        variant: "destructive",
      });
      return;
    }
    createDeviceTypeMutation.mutate(deviceTypeForm.name);
  };

  const handleUpdateDeviceType = () => {
    if (!deviceTypeForm.name || !deviceTypeForm.oldName) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen für den Gerätetyp ein.",
        variant: "destructive",
      });
      return;
    }
    updateDeviceTypeMutation.mutate({
      oldName: deviceTypeForm.oldName,
      newName: deviceTypeForm.name,
    });
  };
  
  const handleDeviceTypeDelete = (id: number) => {
    const deviceType = deviceTypesList.find((type: DeviceType) => type.id === id);
    if (deviceType) {
      deleteDeviceTypeMutation.mutate(deviceType.name);
    }
  };

  const handleDeviceTypeBulkDelete = () => {
    if (selectedDeviceTypeIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens einen Gerätetyp aus.",
      });
      return;
    }
    
    const deviceTypesToDelete = selectedDeviceTypeIds.map(id => {
      const deviceType = deviceTypesList.find((type: DeviceType) => type.id === id);
      return deviceType ? deviceType.name : null;
    }).filter(Boolean) as string[];
    
    deviceTypesToDelete.forEach(name => {
      if (name) deleteDeviceTypeMutation.mutate(name);
    });
  };

  // Handler-Funktionen für Marken
  const handleBrandSelect = (id: number) => {
    setSelectedBrandIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(brandId => brandId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleBrandSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedBrandIds(filteredBrands.map((brand: any) => brand.id));
    } else {
      setSelectedBrandIds([]);
    }
  };

  const handleCreateBrand = () => {
    if (!brandForm.name || !brandForm.deviceTypeId) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen und wählen Sie einen Gerätetyp für die Marke aus.",
        variant: "destructive",
      });
      return;
    }
    createBrandMutation.mutate({
      name: brandForm.name,
      deviceTypeId: brandForm.deviceTypeId,
    });
  };
  
  const handleBrandDelete = (id: number) => {
    deleteBrandMutation.mutate(id);
  };
  
  const handleBrandBulkDelete = () => {
    if (selectedBrandIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens eine Marke aus.",
      });
      return;
    }
    deleteBulkBrandsMutation.mutate(selectedBrandIds);
  };

  const handleBulkImportBrands = () => {
    if (!bulkBrandText || !selectedDeviceTypeForBulkBrands) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Markennamen ein und wählen Sie einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }
    
    const brands = bulkBrandText.split('\n');
    const deviceTypeId = parseInt(selectedDeviceTypeForBulkBrands);
    
    if (isNaN(deviceTypeId)) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen gültigen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }
    
    importBulkBrandsMutation.mutate({
      brands,
      deviceTypeId
    });
  };

  // Handler-Funktionen für Modelle
  const handleModelSelect = (id: number) => {
    setSelectedModelIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(modelId => modelId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleModelSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedModelIds(filteredModels.map((model: any) => model.id));
    } else {
      setSelectedModelIds([]);
    }
  };

  const handleCreateModel = () => {
    if (!modelForm.name || !modelForm.brandId) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen und wählen Sie einen Hersteller für das Modell aus.",
        variant: "destructive",
      });
      return;
    }
    createModelMutation.mutate({
      name: modelForm.name,
      brandId: modelForm.brandId,
    });
  };
  
  const handleModelDelete = (id: number) => {
    deleteModelMutation.mutate(id);
  };
  
  const handleModelBulkDelete = () => {
    if (selectedModelIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens ein Modell aus.",
      });
      return;
    }
    deleteBulkModelsMutation.mutate(selectedModelIds);
  };

  const handleBulkImportModels = () => {
    console.log("Bulk-Import-Versuch:", { bulkModelText, selectedBrandForBulk });
    
    if (!bulkModelText || !selectedBrandForBulk) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Modellnamen ein und wählen Sie einen Hersteller aus.",
        variant: "destructive",
      });
      return;
    }
    
    const modelNames = bulkModelText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    console.log("Bereite Import vor:", { modelNames, brandId: selectedBrandForBulk });
    
    importBulkModelsMutation.mutate({
      brandId: parseInt(selectedBrandForBulk.toString()),
      models: modelNames
    });
  };

  // Handler-Funktionen für Fehlerkatalog
  const handleErrorCatalogSelect = (id: number) => {
    setSelectedErrorCatalogIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(errorId => errorId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  const handleErrorCatalogSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedErrorCatalogIds(filteredErrorCatalog.map((error: any) => error.id));
    } else {
      setSelectedErrorCatalogIds([]);
    }
  };

  const handleCreateErrorCatalogEntry = () => {
    if (!errorCatalogEntryForm.errorText) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Text für den Fehlerkatalog-Eintrag ein.",
        variant: "destructive",
      });
      return;
    }
    
    // Stellen sicher, dass mindestens ein Gerätetyp ausgewählt ist
    if (
      !errorCatalogEntryForm.forSmartphone && 
      !errorCatalogEntryForm.forTablet && 
      !errorCatalogEntryForm.forLaptop && 
      !errorCatalogEntryForm.forSmartwatch &&
      !errorCatalogEntryForm.forGameconsole
    ) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }
    
    createErrorCatalogEntryMutation.mutate({
      errorText: errorCatalogEntryForm.errorText,
      forSmartphone: errorCatalogEntryForm.forSmartphone,
      forTablet: errorCatalogEntryForm.forTablet,
      forLaptop: errorCatalogEntryForm.forLaptop,
      forSmartwatch: errorCatalogEntryForm.forSmartwatch,
      forGameconsole: errorCatalogEntryForm.forGameconsole,
    });
  };

  const handleUpdateErrorCatalogEntry = () => {
    if (!errorCatalogEntryForm.errorText || !errorCatalogEntryForm.id) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Text für den Fehlerkatalog-Eintrag ein.",
        variant: "destructive",
      });
      return;
    }
    
    // Stellen sicher, dass mindestens ein Gerätetyp ausgewählt ist
    if (
      !errorCatalogEntryForm.forSmartphone && 
      !errorCatalogEntryForm.forTablet && 
      !errorCatalogEntryForm.forLaptop && 
      !errorCatalogEntryForm.forSmartwatch &&
      !errorCatalogEntryForm.forGameconsole
    ) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Gerätetyp aus.",
        variant: "destructive",
      });
      return;
    }
    
    updateErrorCatalogEntryMutation.mutate({
      id: errorCatalogEntryForm.id,
      errorText: errorCatalogEntryForm.errorText,
      forSmartphone: errorCatalogEntryForm.forSmartphone,
      forTablet: errorCatalogEntryForm.forTablet,
      forLaptop: errorCatalogEntryForm.forLaptop,
      forSmartwatch: errorCatalogEntryForm.forSmartwatch,
      forGameconsole: errorCatalogEntryForm.forGameconsole,
    });
  };
  
  const handleErrorCatalogDelete = (id: number) => {
    deleteErrorCatalogEntryMutation.mutate(id);
  };
  
  const handleErrorCatalogBulkDelete = () => {
    if (selectedErrorCatalogIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens einen Fehlerkatalog-Eintrag aus.",
      });
      return;
    }
    deleteBulkErrorCatalogMutation.mutate(selectedErrorCatalogIds);
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Geräteverwaltung</h1>
        <p className="text-sm text-gray-500">
          Verwalten Sie hier Gerätetypen, Hersteller, Modelle und den Fehlerkatalog
        </p>
      </div>
      
      {/* Mobile view: Select dropdown für Tabs */}
      <div className="block md:hidden mb-4">
        <Select 
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Bereich auswählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="types">Gerätetypen</SelectItem>
            <SelectItem value="brands">Hersteller</SelectItem>
            <SelectItem value="models">Modelle</SelectItem>
            <SelectItem value="error-catalog">Fehlerkatalog</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Desktop view: Tabs */}
      <div className="hidden md:block">
        <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="types">Gerätetypen</TabsTrigger>
            <TabsTrigger value="brands">Hersteller</TabsTrigger>
            <TabsTrigger value="models">Modelle</TabsTrigger>
            <TabsTrigger value="error-catalog">Fehlerkatalog</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {activeTab === "types" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Gerätetypen</h2>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm"
                onClick={() => setIsCreateDeviceTypeOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Hinzufügen
              </Button>
            </div>
          </div>
          
          {/* Debug: Anzahl der gefilterten Gerätetypen = {filteredDeviceTypes.length} */}
          <OptimizedDevicesTable
            data={Array.isArray(userDeviceTypes) ? userDeviceTypes : []}
            type="deviceType"
            selectedIds={selectedDeviceTypeIds}
            onSelect={handleDeviceTypeSelect}
            onSelectAll={handleDeviceTypeSelectAll}
            onDelete={handleDeviceTypeDelete}
            onBulkDelete={handleDeviceTypeBulkDelete}
            searchTerm={deviceTypeSearchTerm}
            onSearchChange={setDeviceTypeSearchTerm}
            onCsvImportExport={() => setShowCsvModal(true)}
          />
          
          {/* Dialog für neuen Gerätetyp */}
          <Dialog open={isCreateDeviceTypeOpen} onOpenChange={setIsCreateDeviceTypeOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Neuen Gerätetyp erstellen</DialogTitle>
                <DialogDescription>
                  Geben Sie hier den Namen des neuen Gerätetyps ein.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="device-type-name">Name</Label>
                  <Input
                    id="device-type-name"
                    value={deviceTypeForm.name}
                    onChange={(e) => setDeviceTypeForm({ ...deviceTypeForm, name: e.target.value })}
                    placeholder="z.B. Smartphone, Tablet, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDeviceTypeOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreateDeviceType}>
                  {createDeviceTypeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Erstellen"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog für Bearbeitung eines Gerätetyps */}
          <Dialog open={isEditDeviceTypeOpen} onOpenChange={setIsEditDeviceTypeOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Gerätetyp bearbeiten</DialogTitle>
                <DialogDescription>
                  Bearbeiten Sie hier den Namen des Gerätetyps.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-device-type-name">Name</Label>
                  <Input
                    id="edit-device-type-name"
                    value={deviceTypeForm.name}
                    onChange={(e) => setDeviceTypeForm({ ...deviceTypeForm, name: e.target.value })}
                    placeholder="z.B. Smartphone, Tablet, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDeviceTypeOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleUpdateDeviceType}>
                  {updateDeviceTypeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Aktualisieren"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {activeTab === "brands" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Hersteller</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setIsCreateBrandOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Hinzufügen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBulkImportBrandsOpen(true)}
              >
                <FileUp className="mr-2 h-4 w-4" /> Bulk Import
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCsvModal(true)}
              >
                <Upload className="mr-2 h-4 w-4" /> CSV Import/Export
              </Button>
            </div>
          </div>
          
          {/* Debug: Anzahl der gefilterten Marken = {filteredBrands.length} */}
          <OptimizedDevicesTable
            data={Array.isArray(brandsData) ? brandsData : []}
            type="brand"
            selectedIds={selectedBrandIds}
            onSelect={handleBrandSelect}
            onSelectAll={handleBrandSelectAll}
            onDelete={handleBrandDelete}
            onBulkDelete={handleBrandBulkDelete}
            deviceTypes={deviceTypesList}
            searchTerm={brandSearchTerm}
            onSearchChange={setBrandSearchTerm}
            selectedDeviceType={selectedBrandDeviceType}
            onDeviceTypeChange={setSelectedBrandDeviceType}
            onCsvImportExport={() => setShowCsvModal(true)}
          />
          
          {/* Dialog für neue Marke */}
          <Dialog open={isCreateBrandOpen} onOpenChange={setIsCreateBrandOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Neuen Hersteller erstellen</DialogTitle>
                <DialogDescription>
                  Geben Sie hier den Namen des neuen Herstellers ein und wählen Sie den zugehörigen Gerätetyp.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="brand-name">Name</Label>
                  <Input
                    id="brand-name"
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    placeholder="z.B. Apple, Samsung, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand-device-type">Gerätetyp</Label>
                  <Select
                    value={brandForm.deviceTypeId ? brandForm.deviceTypeId.toString() : undefined}
                    onValueChange={(value) => setBrandForm({ ...brandForm, deviceTypeId: parseInt(value) })}
                  >
                    <SelectTrigger id="brand-device-type">
                      <SelectValue placeholder="Bitte wählen Sie einen Gerätetyp" />
                    </SelectTrigger>
                    <SelectContent>
                      {userDeviceTypes
                        .filter(type => type && type.id !== undefined && type.name)
                        .map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateBrandOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreateBrand}>
                  {createBrandMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Erstellen"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog für Bulk-Import von Marken */}
          <Dialog open={isBulkImportBrandsOpen} onOpenChange={setIsBulkImportBrandsOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Mehrere Hersteller importieren</DialogTitle>
                <DialogDescription>
                  Geben Sie hier die Namen der Hersteller ein (einen pro Zeile) und wählen Sie den zugehörigen Gerätetyp.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="bulk-brand-device-type">Gerätetyp</Label>
                  <Select
                    value={selectedDeviceTypeForBulkBrands}
                    onValueChange={setSelectedDeviceTypeForBulkBrands}
                  >
                    <SelectTrigger id="bulk-brand-device-type">
                      <SelectValue placeholder="Bitte wählen Sie einen Gerätetyp" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypesList
                        .filter(type => type && type.id !== undefined && type.name && String(type.id) !== '')
                        .map((type: DeviceType) => (
                        <SelectItem key={type.id} value={String(type.id) || `type-${type.id}`}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bulk-brand-text">Herstellernamen (einen pro Zeile)</Label>
                  <Textarea
                    id="bulk-brand-text"
                    value={bulkBrandText}
                    onChange={(e) => setBulkBrandText(e.target.value)}
                    placeholder="Apple&#10;Samsung&#10;Huawei"
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsBulkImportBrandsOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleBulkImportBrands}>
                  {importBulkBrandsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Importieren"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {activeTab === "models" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Modelle</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setIsCreateModelOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Hinzufügen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBulkImportModelsOpen(true)}
              >
                <FileUp className="mr-2 h-4 w-4" /> Bulk Import
              </Button>
              <DeviceDataCSVImportExport type={"models"} />
            </div>
          </div>
          
          <OptimizedDevicesTable
            data={filteredModels}
            type="model"
            selectedIds={selectedModelIds}
            onSelect={handleModelSelect}
            onSelectAll={handleModelSelectAll}
            onDelete={handleModelDelete}
            onBulkDelete={handleModelBulkDelete}
            deviceTypes={deviceTypesList}
            brands={brandsData}
            searchTerm={modelSearchTerm}
            onSearchChange={setModelSearchTerm}
            selectedDeviceType={selectedModelDeviceType}
            onDeviceTypeChange={setSelectedModelDeviceType}
            selectedBrand={selectedModelsBrandId}
            onBrandChange={setSelectedModelsBrandId}
            onCsvImportExport={() => setShowCsvModal(true)}
          />
          
          {/* Dialog für neues Modell */}
          <Dialog open={isCreateModelOpen} onOpenChange={setIsCreateModelOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Neues Modell erstellen</DialogTitle>
                <DialogDescription>
                  Geben Sie hier den Namen des neuen Modells ein und wählen Sie den zugehörigen Hersteller.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="model-name">Name</Label>
                  <Input
                    id="model-name"
                    value={modelForm.name}
                    onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                    placeholder="z.B. iPhone 15, Galaxy S24, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model-brand">Hersteller</Label>
                  <Select
                    value={modelForm.brandId ? modelForm.brandId.toString() : undefined}
                    onValueChange={(value) => setModelForm({ ...modelForm, brandId: parseInt(value) })}
                  >
                    <SelectTrigger id="model-brand">
                      <SelectValue placeholder="Bitte wählen Sie einen Hersteller" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandsData.map((brand: Brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name} ({brand.deviceTypeName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateModelOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreateModel}>
                  {createModelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Erstellen"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog für Bulk-Import von Modellen */}
          <Dialog open={isBulkImportModelsOpen} onOpenChange={setIsBulkImportModelsOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Mehrere Modelle importieren</DialogTitle>
                <DialogDescription>
                  Geben Sie hier die Namen der Modelle ein (einen pro Zeile) und wählen Sie den zugehörigen Hersteller.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="bulk-model-device-type">Gerätetyp</Label>
                  <Select
                    value={selectedModelDeviceType || ""}
                    onValueChange={(value) => {
                      setSelectedModelDeviceType(value);
                      setSelectedBrandForBulk(null); // Reset brand when device type changes
                    }}
                  >
                    <SelectTrigger id="bulk-model-device-type">
                      <SelectValue placeholder="Bitte wählen Sie einen Gerätetyp" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        console.log("DeviceTypesList im Modell-Bulk-Import:", deviceTypesList);
                        
                        if (!deviceTypesList || deviceTypesList.length === 0) {
                          return (
                            <SelectItem value="no-types" disabled>
                              Keine Gerätetypen verfügbar
                            </SelectItem>
                          );
                        }
                        
                        return deviceTypesList
                          .filter(type => type && typeof type === 'string' && type.trim() !== "")
                          .map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bulk-model-brand">Hersteller</Label>
                  <Select
                    value={selectedBrandForBulk?.toString() || ""}
                    onValueChange={(value) => setSelectedBrandForBulk(parseInt(value))}
                    disabled={!selectedModelDeviceType}
                  >
                    <SelectTrigger id="bulk-model-brand">
                      <SelectValue placeholder="Bitte wählen Sie einen Hersteller" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        console.log("BrandsData im Bulk-Import:", brandsData);
                        console.log("Ausgewählter Gerätetyp:", selectedModelDeviceType);
                        
                        if (!brandsData || brandsData.length === 0) {
                          return (
                            <SelectItem value="no-brands" disabled>
                              Keine Hersteller verfügbar
                            </SelectItem>
                          );
                        }
                        
                        const filteredBrands = brandsData.filter((brand: Brand) => {
                          if (!selectedModelDeviceType) return true;
                          console.log(`Brand ${brand.name}: deviceTypeName=${brand.deviceTypeName}, selected=${selectedModelDeviceType}`);
                          return brand.deviceTypeName === selectedModelDeviceType;
                        });
                        
                        console.log("Gefilterte Marken:", filteredBrands);
                        
                        if (filteredBrands.length === 0) {
                          return (
                            <SelectItem value="no-match" disabled>
                              Keine Hersteller für {selectedModelDeviceType} gefunden
                            </SelectItem>
                          );
                        }
                        
                        return filteredBrands.map((brand: Brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name} ({brand.deviceTypeName || 'Unbekannt'})
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bulk-model-text">Modellnamen (einen pro Zeile)</Label>
                  <Textarea
                    id="bulk-model-text"
                    value={bulkModelText}
                    onChange={(e) => setBulkModelText(e.target.value)}
                    placeholder="iPhone 15&#10;iPhone 15 Pro&#10;iPhone 14"
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsBulkImportModelsOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleBulkImportModels}>
                  {importBulkModelsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Importieren"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {activeTab === "error-catalog" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Fehlerkatalog</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setIsCreateErrorCatalogEntryOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Hinzufügen
              </Button>
            </div>
          </div>
          
          {/* CSV Import/Export für Fehlerkatalog */}
          <ErrorCatalogCSVImportExport />
          
          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Fehlertext suchen..."
                    className="pl-8"
                    value={errorCatalogSearchTerm}
                    onChange={(e) => setErrorCatalogSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {selectedErrorCatalogIds.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {selectedErrorCatalogIds.length} ausgewählt
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setSelectedErrorCatalogIds([])}
                    >
                      <X className="h-4 w-4 mr-1" /> Auswahl aufheben
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={handleErrorCatalogBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Ausgewählte löschen
                  </Button>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap w-[40px]">
                        <Checkbox
                          checked={selectedErrorCatalogIds.length === filteredErrorCatalog.length && filteredErrorCatalog.length > 0}
                          onCheckedChange={(checked) => {
                            handleErrorCatalogSelectAll(!!checked);
                          }}
                          aria-label="Alle Fehlereinträge auswählen"
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap min-w-[200px]">Fehlertext</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[250px]">Für Gerätetypen</TableHead>
                      <TableHead className="text-right whitespace-nowrap w-[100px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredErrorCatalog.map((entry: ErrorCatalogEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedErrorCatalogIds.includes(entry.id)}
                            onCheckedChange={() => handleErrorCatalogSelect(entry.id)}
                            aria-label={`Fehlereintrag ${entry.errorText} auswählen`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entry.errorText}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {entry.forSmartphone && (
                              <Badge variant="outline" className="flex items-center">
                                <Smartphone className="h-3 w-3 mr-1" /> Smartphone
                              </Badge>
                            )}
                            {entry.forTablet && (
                              <Badge variant="outline" className="flex items-center">
                                <Tablet className="h-3 w-3 mr-1" /> Tablet
                              </Badge>
                            )}
                            {entry.forLaptop && (
                              <Badge variant="outline" className="flex items-center">
                                <Laptop className="h-3 w-3 mr-1" /> Laptop
                              </Badge>
                            )}
                            {entry.forSmartwatch && (
                              <Badge variant="outline" className="flex items-center">
                                <Watch className="h-3 w-3 mr-1" /> Smartwatch
                              </Badge>
                            )}
                            {entry.forGameconsole && (
                              <Badge variant="outline" className="flex items-center">
                                <Gamepad2 className="h-3 w-3 mr-1" /> Spielekonsole
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setErrorCatalogEntryForm({
                                  id: entry.id,
                                  errorText: entry.errorText,
                                  forSmartphone: entry.forSmartphone,
                                  forTablet: entry.forTablet,
                                  forLaptop: entry.forLaptop,
                                  forSmartwatch: entry.forSmartwatch,
                                  forGameconsole: entry.forGameconsole,
                                });
                                setIsEditErrorCatalogEntryOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleErrorCatalogDelete(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredErrorCatalog.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Filter className="h-10 w-10 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Keine Ergebnisse gefunden</h3>
                            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                              {errorCatalogSearchTerm
                                ? 'Keine Ergebnisse für Ihre Suche.'
                                : 'Es wurden keine Fehlereinträge gefunden.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Dialog für neuen Fehlerkatalog-Eintrag */}
          <Dialog open={isCreateErrorCatalogEntryOpen} onOpenChange={setIsCreateErrorCatalogEntryOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Neuen Fehlerkatalog-Eintrag erstellen</DialogTitle>
                <DialogDescription>
                  Geben Sie hier den Text für den neuen Fehlerkatalog-Eintrag ein und wählen Sie die zugehörigen Gerätetypen.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="error-text">Fehlertext</Label>
                  <Input
                    id="error-text"
                    value={errorCatalogEntryForm.errorText}
                    onChange={(e) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, errorText: e.target.value })}
                    placeholder="z.B. Display gebrochen, Akku defekt, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Für Gerätetypen</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-smartphone"
                        checked={errorCatalogEntryForm.forSmartphone}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forSmartphone: !!checked })}
                      />
                      <Label htmlFor="for-smartphone" className="flex items-center">
                        <Smartphone className="h-4 w-4 mr-2" /> Smartphone
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-tablet"
                        checked={errorCatalogEntryForm.forTablet}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forTablet: !!checked })}
                      />
                      <Label htmlFor="for-tablet" className="flex items-center">
                        <Tablet className="h-4 w-4 mr-2" /> Tablet
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-laptop"
                        checked={errorCatalogEntryForm.forLaptop}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forLaptop: !!checked })}
                      />
                      <Label htmlFor="for-laptop" className="flex items-center">
                        <Laptop className="h-4 w-4 mr-2" /> Laptop
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-smartwatch"
                        checked={errorCatalogEntryForm.forSmartwatch}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forSmartwatch: !!checked })}
                      />
                      <Label htmlFor="for-smartwatch" className="flex items-center">
                        <Watch className="h-4 w-4 mr-2" /> Smartwatch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="for-gameconsole"
                        checked={errorCatalogEntryForm.forGameconsole}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forGameconsole: !!checked })}
                      />
                      <Label htmlFor="for-gameconsole" className="flex items-center">
                        <Gamepad2 className="h-4 w-4 mr-2" /> Spielekonsole
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateErrorCatalogEntryOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreateErrorCatalogEntry}>
                  {createErrorCatalogEntryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Erstellen"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Dialog für Bearbeitung eines Fehlerkatalog-Eintrags */}
          <Dialog open={isEditErrorCatalogEntryOpen} onOpenChange={setIsEditErrorCatalogEntryOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Fehlerkatalog-Eintrag bearbeiten</DialogTitle>
                <DialogDescription>
                  Bearbeiten Sie hier den Text und die zugehörigen Gerätetypen.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-error-text">Fehlertext</Label>
                  <Input
                    id="edit-error-text"
                    value={errorCatalogEntryForm.errorText}
                    onChange={(e) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, errorText: e.target.value })}
                    placeholder="z.B. Display gebrochen, Akku defekt, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Für Gerätetypen</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-for-smartphone"
                        checked={errorCatalogEntryForm.forSmartphone}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forSmartphone: !!checked })}
                      />
                      <Label htmlFor="edit-for-smartphone" className="flex items-center">
                        <Smartphone className="h-4 w-4 mr-2" /> Smartphone
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-for-tablet"
                        checked={errorCatalogEntryForm.forTablet}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forTablet: !!checked })}
                      />
                      <Label htmlFor="edit-for-tablet" className="flex items-center">
                        <Tablet className="h-4 w-4 mr-2" /> Tablet
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-for-laptop"
                        checked={errorCatalogEntryForm.forLaptop}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forLaptop: !!checked })}
                      />
                      <Label htmlFor="edit-for-laptop" className="flex items-center">
                        <Laptop className="h-4 w-4 mr-2" /> Laptop
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-for-smartwatch"
                        checked={errorCatalogEntryForm.forSmartwatch}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forSmartwatch: !!checked })}
                      />
                      <Label htmlFor="edit-for-smartwatch" className="flex items-center">
                        <Watch className="h-4 w-4 mr-2" /> Smartwatch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-for-gameconsole"
                        checked={errorCatalogEntryForm.forGameconsole}
                        onCheckedChange={(checked) => setErrorCatalogEntryForm({ ...errorCatalogEntryForm, forGameconsole: !!checked })}
                      />
                      <Label htmlFor="edit-for-gameconsole" className="flex items-center">
                        <Gamepad2 className="h-4 w-4 mr-2" /> Spielekonsole
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditErrorCatalogEntryOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleUpdateErrorCatalogEntry}>
                  {updateErrorCatalogEntryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Aktualisieren"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* CSV Import/Export Modal */}
      <CsvImportExportModal
        open={showCsvModal}
        onOpenChange={setShowCsvModal}
        type={activeTab === 'types' ? 'deviceType' : activeTab === 'brands' ? 'brand' : 'model'}
        filteredData={
          activeTab === 'types' ? filteredDeviceTypes :
          activeTab === 'brands' ? filteredBrands :
          filteredModels
        }
        onImport={() => {}} // TODO: Implement CSV import
        onExport={() => {}} // TODO: Implement CSV export
        isImporting={false}
      />
      
      {/* CSV Import/Export Modal */}
      <CsvImportExportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        type={activeTab === "types" ? "deviceType" : activeTab === "brands" ? "brand" : "model"}
        data={
          activeTab === "types" ? deviceTypesList :
          activeTab === "brands" ? brandsData :
          modelsData
        }
        onImport={() => {}} // TODO: Implement CSV import
        onExport={() => {}} // TODO: Implement CSV export
        isImporting={false}
      />
    </div>
  );
}