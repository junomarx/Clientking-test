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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Pencil, Search, Filter, AlertCircle, Smartphone, Tablet, Laptop, Watch, Gamepad2, X, Factory, Layers, RefreshCcw, Upload, FileUp, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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

  // State für die aktive Tab-Navigation
  const [activeTab, setActiveTab] = useState("types");

  // States für Gerätetypen
  const [deviceTypeSearchTerm, setDeviceTypeSearchTerm] = useState("");
  const [isCreateDeviceTypeOpen, setIsCreateDeviceTypeOpen] = useState(false);
  const [isEditDeviceTypeOpen, setIsEditDeviceTypeOpen] = useState(false);
  const [deviceTypeForm, setDeviceTypeForm] = useState({ name: "", oldName: "" });

  // States für Marken
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [selectedBrandDeviceType, setSelectedBrandDeviceType] = useState<string | null>(null);
  const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: "", deviceTypeId: 0 });
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>([]);
  const [selectAllBrands, setSelectAllBrands] = useState(false);

  // States für Modelle
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  const [selectedModelsBrandId, setSelectedModelsBrandId] = useState<number | null>(null);
  const [selectedModelDeviceType, setSelectedModelDeviceType] = useState<string | null>(null);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [modelForm, setModelForm] = useState({ name: "", brandId: 0 });
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectAllModels, setSelectAllModels] = useState(false);
  const [selectedBrandForBulk, setSelectedBrandForBulk] = useState<number | null>(null);
  const [bulkModelText, setBulkModelText] = useState("");
  const [isBulkImportModelsOpen, setIsBulkImportModelsOpen] = useState(false);

  // States für alten Fehlerkatalog (Issues)
  const [issueSearchTerm, setIssueSearchTerm] = useState("");
  const [selectedIssueDeviceType, setSelectedIssueDeviceType] = useState<string | null>(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({ 
    title: "", 
    description: "", 
    deviceType: "",
    solution: "",
    severity: "medium",
    isCommon: false 
  });
  const [selectedIssueIds, setSelectedIssueIds] = useState<number[]>([]);
  const [selectAllIssues, setSelectAllIssues] = useState(false);
  const [isBulkImportIssuesOpen, setIsBulkImportIssuesOpen] = useState(false);
  const [bulkIssueText, setBulkIssueText] = useState("");
  const [selectedDeviceTypeForBulkIssues, setSelectedDeviceTypeForBulkIssues] = useState("");

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
  const [selectAllErrorCatalog, setSelectAllErrorCatalog] = useState(false);
  const [isBulkImportErrorCatalogOpen, setIsBulkImportErrorCatalogOpen] = useState(false);
  const [bulkErrorCatalogText, setBulkErrorCatalogText] = useState("");

  // Abfragen
  const { data: deviceTypesList = [], isLoading: isLoadingDeviceTypesList } = useQuery({
    queryKey: ["/api/superadmin/device-types"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/device-types');
      const data = await response.json();
      return data;
    }
  });

  const { data: userDeviceTypes = [], isLoading: isLoadingUserDeviceTypes } = useQuery({
    queryKey: ["/api/superadmin/user-device-types"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/user-device-types');
      return response.json();
    }
  });

  const { data: brandsData = [], isLoading: isLoadingBrands } = useQuery({
    queryKey: ["/api/superadmin/brands"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/brands');
      return response.json();
    }
  });

  const { data: modelsData = [], isLoading: isLoadingModels } = useQuery({
    queryKey: ["/api/superadmin/models"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/models');
      return response.json();
    }
  });

  const { data: issuesData = [], isLoading: isLoadingIssues } = useQuery({
    queryKey: ["/api/superadmin/device-issues"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/device-issues');
      return response.json();
    }
  });

  const { data: errorCatalogData = [], isLoading: isLoadingErrorCatalog } = useQuery({
    queryKey: ["/api/superadmin/error-catalog"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/error-catalog');
      return response.json();
    }
  });

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

  const bulkImportModelsMutation = useMutation({
    mutationFn: async (data: { brandId: number; models: string[] }) => {
      // Modelldaten formatieren für das Backend
      const modelsToCreate = data.models.map(name => ({
        name,
        brandId: data.brandId
      }));
      
      const response = await apiRequest('POST', '/api/superadmin/device-models/bulk', {
        models: modelsToCreate
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
        description: `${data.success || 0} Modelle wurden erfolgreich importiert.`,
      });
      setIsBulkImportModelsOpen(false);
      setBulkModelText("");
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

  // Mutations für alten Fehlerkatalog (Issues)
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

  // Mutations für neuen Fehlerkatalog
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
        throw new Error(errorData.message || 'Fehler beim Erstellen des Fehlereintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich erstellt.",
      });
      setIsCreateErrorCatalogEntryOpen(false);
      setErrorCatalogEntryForm({
        errorText: "",
        forSmartphone: true,
        forTablet: true,
        forLaptop: true,
        forSmartwatch: true
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
        throw new Error(errorData.message || 'Fehler beim Löschen des Fehlereintrags');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich gelöscht.",
      });
      // Auswahl zurücksetzen
      setSelectedErrorCatalogIds([]);
      setSelectAllErrorCatalog(false);
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
      const { id, ...updateData } = data;
      const response = await apiRequest('PUT', `/api/superadmin/error-catalog/${id}`, updateData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Fehlereintrags');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: "Fehlereintrag wurde erfolgreich aktualisiert.",
      });
      setIsEditErrorCatalogEntryOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const bulkDeleteErrorCatalogEntriesMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sicherstellen, dass wir ein Array mit Zahlen übermitteln
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      const response = await apiRequest('POST', '/api/superadmin/error-catalog/bulk-delete', { 
        ids: numericIds 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: `${data.deletedCount || 0} Fehlereinträge wurden erfolgreich gelöscht.`,
      });
      // Auswahl zurücksetzen
      setSelectedErrorCatalogIds([]);
      setSelectAllErrorCatalog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkImportErrorCatalogMutation = useMutation({
    mutationFn: async (entries: string[]) => {
      // Einträge in ein Format bringen, das das Backend erwartet
      const formattedEntries = entries.map(errorText => ({
        errorText,
        forSmartphone: true,
        forTablet: true,
        forLaptop: true,
        forSmartwatch: true
      }));
      
      const response = await apiRequest('POST', '/api/superadmin/error-catalog/bulk', { 
        entries: formattedEntries 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Importieren der Fehlereinträge');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/error-catalog"] });
      toast({
        title: "Erfolg",
        description: `${data.success || 0} Fehlereinträge wurden erfolgreich importiert.`,
      });
      setIsBulkImportErrorCatalogOpen(false);
      setBulkErrorCatalogText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter und Sortierlogik
  const filteredDeviceTypes = deviceTypesList
    .filter((type) => type.toLowerCase().includes(deviceTypeSearchTerm.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  // Hilfsfunktion zum Filtern von Marken nach Gerätetyp
  const getFilteredBrands = (deviceTypeName: string | null) => {
    if (!brandsData) return [];
    
    // Alle Marken mit ihren Gerätetyp-Namen anreichern
    const brandsWithTypeNames = brandsData.map(brand => {
      const typeInfo = userDeviceTypes?.find(type => type.id === brand.deviceTypeId);
      return {
        ...brand,
        deviceTypeName: typeInfo?.name || 'Smartphone'
      };
    });
    
    // Filtern nach Gerätetyp-Name, wenn einer angegeben ist
    if (deviceTypeName) {
      return brandsWithTypeNames.filter(brand => brand.deviceTypeName === deviceTypeName);
    }
    
    return brandsWithTypeNames;
  };

  // Hilfsfunktion zum Icon-Anzeigen
  const getDeviceTypeIcon = (typeName: string) => {
    const iconProps = { className: "h-5 w-5 text-primary" };
    
    if (typeName.toLowerCase() === "smartphone") {
      return <Smartphone {...iconProps} />;
    } else if (typeName.toLowerCase() === "tablet") {
      return <Tablet {...iconProps} />;
    } else if (typeName.toLowerCase() === "laptop") {
      return <Laptop {...iconProps} />;
    } else if (typeName.toLowerCase() === "watch" || typeName.toLowerCase() === "smartwatch") {
      return <Watch {...iconProps} />;
    } else if (typeName.toLowerCase() === "spielekonsole" || typeName.toLowerCase() === "konsole" || typeName.toLowerCase() === "game console" || typeName.toLowerCase() === "gameconsole") {
      return <Gamepad2 {...iconProps} />;
    } else {
      return <Smartphone {...iconProps} />; // Default-Icon
    }
  };

  // Handler-Funktionen für Gerätetypen
  const handleCreateDeviceType = () => {
    setDeviceTypeForm({ name: "", oldName: "" });
    setIsCreateDeviceTypeOpen(true);
  };

  const handleSubmitCreateDeviceType = () => {
    if (!deviceTypeForm.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }
    createDeviceTypeMutation.mutate(deviceTypeForm.name);
  };

  const handleEditDeviceType = (name: string) => {
    setDeviceTypeForm({ name: name, oldName: name });
    setIsEditDeviceTypeOpen(true);
  };

  const handleSubmitEditDeviceType = () => {
    if (!deviceTypeForm.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }
    updateDeviceTypeMutation.mutate({
      oldName: deviceTypeForm.oldName,
      newName: deviceTypeForm.name,
    });
  };

  const handleDeleteDeviceType = (name: string) => {
    if (confirm(`Sind Sie sicher, dass Sie den Gerätetyp "${name}" löschen möchten?`)) {
      deleteDeviceTypeMutation.mutate(name);
    }
  };

  // Handler-Funktionen für Marken
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

  // Handler-Funktionen für Modelle
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

  const handleDeleteModel = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie dieses Modell löschen möchten?')) {
      deleteModelMutation.mutate(id);
    }
  };

  const handleToggleModelSelection = (id: number) => {
    setSelectedModelIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(modelId => modelId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleToggleSelectAllModels = () => {
    if (selectAllModels) {
      setSelectedModelIds([]);
      setSelectAllModels(false);
    } else {
      if (modelsData) {
        // Alle IDs der gefilterten Modelle auswählen
        const filteredModelIds = modelsData
          .filter(model => {
            const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
            
            // Markenfilterung
            const brandMatches = !selectedModelsBrandId || model.brandId === selectedModelsBrandId;
            
            // Gerätetypfilterung - wir müssen erst die Marke finden und dann den Gerätetyp
            let typeMatches = true;
            if (selectedModelDeviceType) {
              const brand = brandsData.find(b => b.id === model.brandId);
              if (brand) {
                const deviceType = userDeviceTypes.find(t => t.id === brand.deviceTypeId);
                typeMatches = deviceType?.name === selectedModelDeviceType;
              } else {
                typeMatches = false;
              }
            }
            
            return nameMatches && brandMatches && typeMatches;
          })
          .map(model => model.id);
        
        setSelectedModelIds(filteredModelIds);
        setSelectAllModels(true);
      }
    }
  };

  const handleDeleteSelectedModels = async () => {
    if (selectedModelIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens ein Modell aus."
      });
      return;
    }
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedModelIds.length} ausgewählte Modelle löschen möchten?`)) {
      try {
        toast({
          title: "Löschvorgang läuft",
          description: `${selectedModelIds.length} Modelle werden gelöscht...`
        });
        
        await deleteBulkModelsMutation.mutateAsync(selectedModelIds);
      } catch (error) {
        console.error("Fehler beim Löschen von Modellen:", error);
        toast({
          title: "Fehler",
          description: "Beim Löschen der Modelle ist ein Fehler aufgetreten.",
          variant: "destructive"
        });
      }
    }
  };

  const handleBulkImportModels = () => {
    setSelectedBrandForBulk(null);
    setSelectedModelDeviceType(null);
    setBulkModelText("");
    setIsBulkImportModelsOpen(true);
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
    
    if (!bulkModelText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens ein Modell ein.",
        variant: "destructive",
      });
      return;
    }
    
    // Zeilen in Array aufteilen und leere Zeilen entfernen
    const models = bulkModelText
      .split('\n')
      .map(model => model.trim())
      .filter(model => model.length > 0);
    
    if (models.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens ein gültiges Modell ein.",
        variant: "destructive",
      });
      return;
    }
    
    bulkImportModelsMutation.mutate({
      brandId: selectedBrandForBulk,
      models: models
    });
  };

  // Handler-Funktionen für alten Fehlerkatalog (Issues)
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
  
  const handleToggleSelectAllIssues = () => {
    if (selectAllIssues) {
      setSelectedIssueIds([]);
      setSelectAllIssues(false);
    } else {
      const filteredIds = issuesData
        .filter(issue => {
          // Filterung nach Titel
          const titleMatches = issue.title.toLowerCase().includes(issueSearchTerm.toLowerCase());
          
          // Filterung nach Gerätetyp
          const typeMatches = !selectedIssueDeviceType || issue.deviceType === selectedIssueDeviceType;
          
          return titleMatches && typeMatches;
        })
        .map(issue => issue.id);
      
      setSelectedIssueIds(filteredIds);
      setSelectAllIssues(true);
    }
  };
  
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
        toast({
          title: "Löschvorgang läuft",
          description: `${selectedIssueIds.length} Fehlereinträge werden gelöscht...`
        });
        
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
  
  const handleBulkImportIssues = () => {
    setBulkIssueText("");
    setSelectedDeviceTypeForBulkIssues("");
    setIsBulkImportIssuesOpen(true);
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
    
    // Zeilen in Array aufteilen und leere Zeilen entfernen
    const issues = bulkIssueText
      .split('\n')
      .map(issue => issue.trim())
      .filter(issue => issue.length > 0);
    
    if (issues.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens einen gültigen Fehlereintrag ein.",
        variant: "destructive",
      });
      return;
    }
    
    bulkImportIssuesMutation.mutate({
      deviceType: selectedDeviceTypeForBulkIssues,
      issues: issues
    });
  };

  // Handler-Funktionen für den neuen Fehlerkatalog
  const handleCreateErrorCatalogEntry = () => {
    setErrorCatalogEntryForm({
      id: 0,
      errorText: "",
      forSmartphone: true,
      forTablet: true,
      forLaptop: true,
      forSmartwatch: true,
      forGameconsole: true
    });
    setIsCreateErrorCatalogEntryOpen(true);
  };
  
  const handleDeleteErrorCatalogEntry = (id: number) => {
    if (confirm('Möchten Sie diesen Fehlereintrag wirklich löschen?')) {
      deleteErrorCatalogEntryMutation.mutate(id);
    }
  };
  
  const handleEditErrorCatalogEntry = (entry: any) => {
    setIsEditErrorCatalogEntryOpen(true);
    setErrorCatalogEntryForm({
      id: entry.id,
      errorText: entry.errorText,
      forSmartphone: entry.forSmartphone,
      forTablet: entry.forTablet,
      forLaptop: entry.forLaptop,
      forSmartwatch: entry.forSmartwatch,
      forGameconsole: entry.forGameconsole || false
    });
  };
  
  const handleToggleErrorCatalogSelection = (id: number) => {
    if (selectedErrorCatalogIds.includes(id)) {
      setSelectedErrorCatalogIds(selectedErrorCatalogIds.filter(entryId => entryId !== id));
    } else {
      setSelectedErrorCatalogIds([...selectedErrorCatalogIds, id]);
    }
  };
  
  const handleToggleSelectAllErrorCatalog = () => {
    if (selectAllErrorCatalog) {
      setSelectedErrorCatalogIds([]);
      setSelectAllErrorCatalog(false);
    } else {
      if (errorCatalogData && errorCatalogData.length > 0) {
        const filteredIds = errorCatalogData
          .filter(entry => entry.errorText.toLowerCase().includes(errorCatalogSearchTerm.toLowerCase()))
          .map(entry => entry.id);
        setSelectedErrorCatalogIds(filteredIds);
        setSelectAllErrorCatalog(true);
      }
    }
  };
  
  const handleDeleteSelectedErrorCatalogEntries = async () => {
    if (selectedErrorCatalogIds.length === 0) {
      toast({
        title: "Hinweis",
        description: "Bitte wählen Sie mindestens einen Fehlereintrag aus."
      });
      return;
    }
    
    if (confirm(`Sind Sie sicher, dass Sie ${selectedErrorCatalogIds.length} ausgewählte Fehlereinträge löschen möchten?`)) {
      try {
        toast({
          title: "Löschvorgang läuft",
          description: `${selectedErrorCatalogIds.length} Fehlereinträge werden gelöscht...`
        });
        
        await bulkDeleteErrorCatalogEntriesMutation.mutateAsync(selectedErrorCatalogIds);
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
  
  const handleBulkImportErrorCatalog = () => {
    setBulkErrorCatalogText("");
    setIsBulkImportErrorCatalogOpen(true);
  };
  
  const handleSubmitCreateErrorCatalogEntry = () => {
    if (!errorCatalogEntryForm.errorText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Fehlertext ein.",
        variant: "destructive"
      });
      return;
    }
    
    // Mindestens ein Gerätetyp muss ausgewählt sein
    if (!errorCatalogEntryForm.forSmartphone && 
        !errorCatalogEntryForm.forTablet && 
        !errorCatalogEntryForm.forLaptop && 
        !errorCatalogEntryForm.forSmartwatch &&
        !errorCatalogEntryForm.forGameconsole) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Gerätetyp aus.",
        variant: "destructive"
      });
      return;
    }
    
    createErrorCatalogEntryMutation.mutate(errorCatalogEntryForm);
  };
  
  const handleSubmitBulkImportErrorCatalog = () => {
    if (!bulkErrorCatalogText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens einen Fehlertext ein.",
        variant: "destructive"
      });
      return;
    }
    
    // Zeilen in Array aufteilen und leere Zeilen entfernen
    const entries = bulkErrorCatalogText
      .split('\n')
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0);
    
    if (entries.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie mindestens einen gültigen Fehlertext ein.",
        variant: "destructive"
      });
      return;
    }
    
    bulkImportErrorCatalogMutation.mutate(entries);
  };
  
  const handleSubmitUpdateErrorCatalogEntry = () => {
    if (!errorCatalogEntryForm.errorText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Fehlertext ein.",
        variant: "destructive"
      });
      return;
    }
    
    // Mindestens ein Gerätetyp muss ausgewählt sein
    if (!errorCatalogEntryForm.forSmartphone && 
        !errorCatalogEntryForm.forTablet && 
        !errorCatalogEntryForm.forLaptop && 
        !errorCatalogEntryForm.forSmartwatch &&
        !errorCatalogEntryForm.forGameconsole) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Gerätetyp aus.",
        variant: "destructive"
      });
      return;
    }
    
    updateErrorCatalogEntryMutation.mutate(errorCatalogEntryForm);
  };

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
          <option value="issues">Fehlerkatalog (Alt)</option>
          <option value="error-catalog">Fehlerkatalog (Neu)</option>
          <option value="csv">CSV Import/Export</option>
          <option value="statistics">Statistik</option>
        </select>
      </div>
      
      <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden md:grid grid-cols-7">
          <TabsTrigger value="types">Gerätetypen</TabsTrigger>
          <TabsTrigger value="brands">Marken</TabsTrigger>
          <TabsTrigger value="models">Modelle</TabsTrigger>
          <TabsTrigger value="issues">Fehlerkatalog (Alt)</TabsTrigger>
          <TabsTrigger value="error-catalog">Fehlerkatalog (Neu)</TabsTrigger>
          <TabsTrigger value="csv">CSV Import/Export</TabsTrigger>
          <TabsTrigger value="statistics">Statistik</TabsTrigger>
        </TabsList>

        {/* Gerätetypen Tab */}
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

        {/* Marken Tab */}
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
                              <TableCell>
                                <Checkbox
                                  checked={selectedBrandIds.includes(brand.id)}
                                  onCheckedChange={() => handleToggleBrandSelection(brand.id)}
                                  aria-label={`Marke ${brand.name} auswählen`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{brand.name}</TableCell>
                              <TableCell className="flex items-center space-x-2">
                                {getDeviceTypeIcon(brand.deviceTypeName || 'Smartphone')}
                                <span>{brand.deviceTypeName || 'Smartphone'}</span>
                              </TableCell>
                              <TableCell>{brand.shopId === 10 ? "macnphone" : brand.shopId === 3 ? "bugi" : brand.shopId}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteBrand(brand.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Keine Marken gefunden</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                      {brandSearchTerm || selectedBrandDeviceType ? 'Keine Ergebnisse für Ihre Suche.' : 'Es wurden keine Marken gefunden. Fügen Sie neue Marken hinzu.'}
                    </p>
                    <Button onClick={handleCreateBrand}>
                      <Plus className="mr-2 h-4 w-4" /> Marke hinzufügen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Modelle Tab */}
        <TabsContent value="models">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Modelle</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Hier werden alle vorhandenen Modelle angezeigt
                </CardDescription>
              </div>
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                <Button 
                  onClick={handleBulkImportModels} 
                  variant="outline"
                  className="text-xs md:text-sm h-8 md:h-10"
                >
                  <FileUp className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Modelle importieren
                </Button>
                <Button 
                  onClick={handleCreateModel}
                  className="text-xs md:text-sm h-8 md:h-10"
                >
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Modell hinzufügen
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
                      const newValue = value === "all" ? null : value;
                      setSelectedModelDeviceType(newValue);
                      setSelectedModelsBrandId(null); // Markenfilter zurücksetzen
                    }}
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
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="brandFilter" className="whitespace-nowrap">Marke:</Label>
                  <Select 
                    value={selectedModelsBrandId ? selectedModelsBrandId.toString() : "all"}
                    onValueChange={(value) => setSelectedModelsBrandId(value === "all" ? null : parseInt(value))}
                    disabled={!brandsData || brandsData.length === 0}
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
                
                {/* Filter zurücksetzen Button */}
                {(selectedModelDeviceType || selectedModelsBrandId || modelSearchTerm) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedModelDeviceType(null);
                      setSelectedModelsBrandId(null);
                      setModelSearchTerm("");
                    }}
                    className="flex items-center space-x-1"
                  >
                    <X className="h-4 w-4" />
                    <span>Filter zurücksetzen</span>
                  </Button>
                )}
              </div>
              
              {isLoadingModels || isLoadingBrands || isLoadingUserDeviceTypes ? (
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
                            onCheckedChange={handleToggleSelectAllModels}
                            aria-label="Alle Modelle auswählen"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Marke</TableHead>
                        <TableHead>Gerätetyp</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelsData
                        .map((model) => {
                          // Marke und Gerätetyp ermitteln
                          const brand = brandsData?.find((b) => b.id === model.brandId);
                          const deviceTypeId = brand?.deviceTypeId;
                          const deviceType = userDeviceTypes?.find((t) => t.id === deviceTypeId);
                          
                          return {
                            ...model,
                            brandName: brand?.name || 'Unbekannt',
                            deviceTypeName: deviceType?.name || 'Smartphone'
                          };
                        })
                        .filter((model) => {
                          // Filterung nach Modellnamen
                          const nameMatches = model.name.toLowerCase().includes(modelSearchTerm.toLowerCase());
                          
                          // Filterung nach Marke
                          const brandMatches = !selectedModelsBrandId || model.brandId === selectedModelsBrandId;
                          
                          // Filterung nach Gerätetyp
                          const typeMatches = !selectedModelDeviceType || model.deviceTypeName === selectedModelDeviceType;
                          
                          return nameMatches && brandMatches && typeMatches;
                        })
                        .map((model) => (
                          <TableRow key={model.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedModelIds.includes(model.id)}
                                onCheckedChange={() => handleToggleModelSelection(model.id)}
                                aria-label={`Modell ${model.name} auswählen`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{model.name}</TableCell>
                            <TableCell>{model.brandName}</TableCell>
                            <TableCell className="flex items-center space-x-2">
                              {getDeviceTypeIcon(model.deviceTypeName)}
                              <span>{model.deviceTypeName}</span>
                            </TableCell>
                            <TableCell>{model.shopId === 10 ? "macnphone" : model.shopId === 3 ? "bugi" : model.shopId}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteModel(model.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Keine Modelle gefunden</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {modelSearchTerm || selectedModelsBrandId || selectedModelDeviceType
                      ? 'Keine Ergebnisse für Ihre Suche.'
                      : 'Es wurden keine Modelle gefunden. Fügen Sie neue Modelle hinzu.'}
                  </p>
                  <div className="flex space-x-4">
                    <Button onClick={handleCreateModel}>
                      <Plus className="mr-2 h-4 w-4" /> Modell hinzufügen
                    </Button>
                    <Button onClick={handleBulkImportModels} variant="outline">
                      <FileUp className="mr-2 h-4 w-4" /> Modelle importieren
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fehlerkatalog (Alt) Tab */}
        <TabsContent value="issues">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Fehlerkatalog (Alt)</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Hier werden die Fehlereinträge im alten Format angezeigt. Bitte verwenden Sie das neue Format.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <div className="rounded-md border p-4 bg-yellow-50">
                <div className="flex flex-col items-center justify-center text-center">
                  <AlertCircle className="h-10 w-10 text-yellow-600" />
                  <h3 className="mt-4 text-lg font-semibold text-yellow-700">Diese Funktion wird nicht mehr unterstützt</h3>
                  <p className="mb-4 mt-2 text-sm text-yellow-600">
                    Bitte verwenden Sie den neuen Fehlerkatalog, der über alle Shops hinweg konsistent ist.
                    Die bestehenden Fehlereinträge werden nur noch zu Archivzwecken angezeigt.
                  </p>
                  <Button onClick={() => setActiveTab("error-catalog")} variant="outline" className="bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                    <Plus className="mr-2 h-4 w-4" /> Zum neuen Fehlerkatalog wechseln
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fehlerkatalog (Neu) Tab */}
        <TabsContent value="error-catalog">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 p-4 md:p-6 pb-2 md:pb-3">
              <div>
                <CardTitle className="text-base md:text-lg font-semibold">Fehlerkatalog (Neu)</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Verwalten Sie den neuen geräteübergreifenden Fehlerkatalog
                </CardDescription>
              </div>
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                <Button 
                  onClick={handleBulkImportErrorCatalog} 
                  variant="outline"
                  className="text-xs md:text-sm h-8 md:h-10"
                >
                  <FileUp className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Mehrere hinzufügen
                </Button>
                <Button 
                  onClick={handleCreateErrorCatalogEntry}
                  className="text-xs md:text-sm h-8 md:h-10"
                >
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Fehler hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
              <div className="mb-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Fehlereinträge suchen..." 
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
                    <span>{selectedErrorCatalogIds.length} Einträge löschen</span>
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
                            aria-label="Alle Fehlereinträge auswählen"
                          />
                        </TableHead>
                        <TableHead>Fehlertext</TableHead>
                        <TableHead>Gilt für Gerätetyp</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorCatalogData
                        .filter(entry => entry.errorText.toLowerCase().includes(errorCatalogSearchTerm.toLowerCase()))
                        .map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedErrorCatalogIds.includes(entry.id)}
                                onCheckedChange={() => handleToggleErrorCatalogSelection(entry.id)}
                                aria-label={`Fehlereintrag ${entry.id} auswählen`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{entry.errorText}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {entry.forSmartphone && <div title="Smartphone">{getDeviceTypeIcon("Smartphone")}</div>}
                                {entry.forTablet && <div title="Tablet">{getDeviceTypeIcon("Tablet")}</div>}
                                {entry.forLaptop && <div title="Laptop">{getDeviceTypeIcon("Laptop")}</div>}
                                {entry.forSmartwatch && <div title="Smartwatch">{getDeviceTypeIcon("Watch")}</div>}
                                {entry.forGameconsole && <div title="Spielekonsole">{getDeviceTypeIcon("GameConsole")}</div>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditErrorCatalogEntry(entry)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
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
                    {errorCatalogSearchTerm ? 'Keine Ergebnisse für Ihre Suche.' : 'Es wurden keine Fehlereinträge gefunden. Fügen Sie neue Fehlereinträge hinzu.'}
                  </p>
                  <div className="flex space-x-4">
                    <Button onClick={handleCreateErrorCatalogEntry}>
                      <Plus className="mr-2 h-4 w-4" /> Fehler hinzufügen
                    </Button>
                    <Button onClick={handleBulkImportErrorCatalog} variant="outline">
                      <FileUp className="mr-2 h-4 w-4" /> Mehrere hinzufügen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Import/Export Tab */}
        <TabsContent value="csv">
          <DeviceDataCSVImportExport />
        </TabsContent>

        {/* Statistik Tab */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg font-semibold">Gerätestatistik</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Übersicht über alle Geräte im System
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="text-lg font-semibold mb-2">Gerätetypen</h3>
                  <p className="text-3xl font-bold">{deviceTypesList?.length || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Typen im System</p>
                </div>
                
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="text-lg font-semibold mb-2">Marken</h3>
                  <p className="text-3xl font-bold">{brandsData?.length || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Marken im System</p>
                </div>
                
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="text-lg font-semibold mb-2">Modelle</h3>
                  <p className="text-3xl font-bold">{modelsData?.length || 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Modelle im System</p>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Verteilung nach Gerätetyp</h3>
                <div className="space-y-6">
                  {deviceTypesList?.map(deviceType => {
                    // Anzahl der Marken für diesen Gerätetyp
                    const brandCount = brandsData?.filter(brand => {
                      const typeInfo = userDeviceTypes?.find(type => type.id === brand.deviceTypeId);
                      return typeInfo?.name === deviceType;
                    }).length || 0;
                    
                    // Anzahl der Modelle für diesen Gerätetyp
                    const modelCount = modelsData?.filter(model => {
                      const brand = brandsData?.find(brand => brand.id === model.brandId);
                      if (!brand) return false;
                      
                      const typeInfo = userDeviceTypes?.find(type => type.id === brand.deviceTypeId);
                      return typeInfo?.name === deviceType;
                    }).length || 0;
                    
                    return (
                      <div key={deviceType} className="p-4 rounded-lg border">
                        <div className="flex items-center space-x-3 mb-3">
                          {getDeviceTypeIcon(deviceType)}
                          <h4 className="text-lg font-semibold">{deviceType}</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Marken</p>
                            <p className="text-xl font-semibold">{brandCount}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Modelle</p>
                            <p className="text-xl font-semibold">{modelCount}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialoge für Gerätetypen */}
      <Dialog open={isCreateDeviceTypeOpen} onOpenChange={setIsCreateDeviceTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Gerätetyp hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Gerätetyp für die Verwendung in allen Shops.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="md:text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="z.B. Spielekonsole"
                className="col-span-1 md:col-span-3"
                value={deviceTypeForm.name}
                onChange={(e) => setDeviceTypeForm({ ...deviceTypeForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDeviceTypeOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmitCreateDeviceType}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDeviceTypeOpen} onOpenChange={setIsEditDeviceTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerätetyp bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie den Namen des ausgewählten Gerätetyps.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="md:text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                className="col-span-1 md:col-span-3"
                value={deviceTypeForm.name}
                onChange={(e) => setDeviceTypeForm({ ...deviceTypeForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDeviceTypeOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmitEditDeviceType}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog für Brand erstellen */}
      <Dialog open={isCreateBrandOpen} onOpenChange={setIsCreateBrandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Marke hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Marke und ordnen Sie sie einem Gerätetyp zu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceType" className="md:text-right">
                Gerätetyp
              </Label>
              <div className="col-span-1 md:col-span-3">
                <Select 
                  value={brandForm.deviceTypeId ? brandForm.deviceTypeId.toString() : ""}
                  onValueChange={(value) => setBrandForm({...brandForm, deviceTypeId: parseInt(value)})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Gerätetyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDeviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-name" className="md:text-right">
                Markenname
              </Label>
              <Input
                id="brand-name"
                placeholder="z.B. Apple"
                className="col-span-1 md:col-span-3"
                value={brandForm.name}
                onChange={(e) => setBrandForm({...brandForm, name: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateBrandOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmitCreateBrand}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog für Model erstellen */}
      <Dialog open={isCreateModelOpen} onOpenChange={setIsCreateModelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Modell hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Modell und ordnen Sie es einer Marke zu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="device-type-select" className="md:text-right">
                Gerätetyp
              </Label>
              <div className="col-span-1 md:col-span-3">
                <Select 
                  value={selectedModelDeviceType || ""}
                  onValueChange={(value) => {
                    setSelectedModelDeviceType(value);
                    // Marke zurücksetzen, da die Marken nach Gerätetyp gefiltert werden
                    setModelForm({...modelForm, brandId: 0});
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Gerätetyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypesList?.filter(type => type && type.trim() !== "").map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-select" className="md:text-right">
                Marke
              </Label>
              <div className="col-span-1 md:col-span-3">
                <Select 
                  value={modelForm.brandId ? modelForm.brandId.toString() : ""}
                  onValueChange={(value) => setModelForm({...modelForm, brandId: parseInt(value)})}
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
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="model-name" className="md:text-right">
                Modellname
              </Label>
              <Input
                id="model-name"
                placeholder="z.B. iPhone 13"
                className="col-span-1 md:col-span-3"
                value={modelForm.name}
                onChange={(e) => setModelForm({...modelForm, name: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateModelOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmitCreateModel} disabled={!modelForm.brandId}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog für Bulk Import von Modellen */}
      <Dialog open={isBulkImportModelsOpen} onOpenChange={setIsBulkImportModelsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modelle importieren</DialogTitle>
            <DialogDescription>
              Importieren Sie mehrere Modelle für eine Marke auf einmal.
              Geben Sie jeden Modellnamen in einer neuen Zeile ein.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="device-type-select-bulk" className="md:text-right">
                Gerätetyp
              </Label>
              <div className="col-span-1 md:col-span-3">
                <Select 
                  value={selectedModelDeviceType || ""}
                  onValueChange={(value) => {
                    setSelectedModelDeviceType(value);
                    // Marke zurücksetzen, da die Marken nach Gerätetyp gefiltert werden
                    setSelectedBrandForBulk(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Gerätetyp auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypesList?.filter(type => type && type.trim() !== "").map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-select-bulk" className="md:text-right">
                Marke
              </Label>
              <div className="col-span-1 md:col-span-3">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Label htmlFor="bulk-models" className="md:text-right">
                Modelle
              </Label>
              <Textarea
                id="bulk-models"
                placeholder="iPhone 13&#10;iPhone 13 Pro&#10;iPhone 13 Pro Max"
                className="col-span-1 md:col-span-3"
                rows={8}
                value={bulkModelText}
                onChange={(e) => setBulkModelText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsBulkImportModelsOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSubmitBulkImportModels}
              disabled={!selectedBrandForBulk || !bulkModelText.trim()}
            >
              Importieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialoge für neuen Fehlerkatalog */}
      <Dialog open={isCreateErrorCatalogEntryOpen} onOpenChange={setIsCreateErrorCatalogEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Fehlereintrag hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Fehlereintrag für den Fehlerkatalog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <Label htmlFor="error-text" className="md:text-right">
                Fehlertext
              </Label>
              <Textarea
                id="error-text"
                placeholder="z.B. Display gebrochen"
                className="col-span-1 md:col-span-3"
                value={errorCatalogEntryForm.errorText}
                onChange={(e) => setErrorCatalogEntryForm({...errorCatalogEntryForm, errorText: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
              <Label className="md:text-right mt-1">Gilt für</Label>
              <div className="col-span-1 md:col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="smartphone"
                    checked={errorCatalogEntryForm.forSmartphone}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forSmartphone: checked === true
                      })
                    }
                  />
                  <Label htmlFor="smartphone" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Smartphone")}
                    <span>Smartphone</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tablet"
                    checked={errorCatalogEntryForm.forTablet}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forTablet: checked === true
                      })
                    }
                  />
                  <Label htmlFor="tablet" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Tablet")}
                    <span>Tablet</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="laptop"
                    checked={errorCatalogEntryForm.forLaptop}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forLaptop: checked === true
                      })
                    }
                  />
                  <Label htmlFor="laptop" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Laptop")}
                    <span>Laptop</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="smartwatch"
                    checked={errorCatalogEntryForm.forSmartwatch}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forSmartwatch: checked === true
                      })
                    }
                  />
                  <Label htmlFor="smartwatch" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Watch")}
                    <span>Smartwatch</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateErrorCatalogEntryOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmitCreateErrorCatalogEntry}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog für Bearbeitung eines Fehlereintrags */}
      <Dialog open={isEditErrorCatalogEntryOpen} onOpenChange={setIsEditErrorCatalogEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fehlereintrag bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie den ausgewählten Fehlereintrag.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-error-text" className="text-right">
                Fehlertext
              </Label>
              <Textarea
                id="edit-error-text"
                placeholder="z.B. Display gebrochen"
                className="col-span-3"
                value={errorCatalogEntryForm.errorText}
                onChange={(e) => setErrorCatalogEntryForm({...errorCatalogEntryForm, errorText: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gilt für</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-smartphone"
                    checked={errorCatalogEntryForm.forSmartphone}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forSmartphone: checked === true
                      })
                    }
                  />
                  <Label htmlFor="edit-smartphone" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Smartphone")}
                    <span>Smartphone</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-tablet"
                    checked={errorCatalogEntryForm.forTablet}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forTablet: checked === true
                      })
                    }
                  />
                  <Label htmlFor="edit-tablet" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Tablet")}
                    <span>Tablet</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-laptop"
                    checked={errorCatalogEntryForm.forLaptop}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forLaptop: checked === true
                      })
                    }
                  />
                  <Label htmlFor="edit-laptop" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Laptop")}
                    <span>Laptop</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-smartwatch"
                    checked={errorCatalogEntryForm.forSmartwatch}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forSmartwatch: checked === true
                      })
                    }
                  />
                  <Label htmlFor="edit-smartwatch" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("Watch")}
                    <span>Smartwatch</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-gameconsole"
                    checked={errorCatalogEntryForm.forGameconsole}
                    onCheckedChange={(checked) => 
                      setErrorCatalogEntryForm({
                        ...errorCatalogEntryForm, 
                        forGameconsole: checked === true
                      })
                    }
                  />
                  <Label htmlFor="edit-gameconsole" className="flex items-center space-x-2">
                    {getDeviceTypeIcon("GameConsole")}
                    <span>Spielekonsole</span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditErrorCatalogEntryOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleSubmitUpdateErrorCatalogEntry}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkImportErrorCatalogOpen} onOpenChange={setIsBulkImportErrorCatalogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fehlereinträge importieren</DialogTitle>
            <DialogDescription>
              Importieren Sie mehrere Fehlereinträge auf einmal.
              Geben Sie jeden Fehlertext in einer neuen Zeile ein.
              Standardmäßig werden die Einträge für alle Gerätetypen erstellt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <Label htmlFor="bulk-errors" className="text-right">
                Fehlereinträge
              </Label>
              <Textarea
                id="bulk-errors"
                placeholder="Display gebrochen&#10;Akku defekt&#10;Kamera funktioniert nicht"
                className="col-span-3"
                rows={8}
                value={bulkErrorCatalogText}
                onChange={(e) => setBulkErrorCatalogText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsBulkImportErrorCatalogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSubmitBulkImportErrorCatalog}
              disabled={!bulkErrorCatalogText.trim()}
            >
              Importieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}