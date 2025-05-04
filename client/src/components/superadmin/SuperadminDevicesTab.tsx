import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Smartphone,
  Laptop,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Tag,
  AlertCircle,
  Building,
  BarChart4
} from 'lucide-react';

// Schnittstellen für die Gerätedaten
interface DeviceType {
  id: number;
  name: string;
  isGlobal: boolean;
  userId?: number | null;
  shopId?: number | null;
  createdAt: string;
}

interface DeviceBrand {
  id: number;
  name: string;
  deviceType: string;
  isGlobal: boolean;
  userId?: number | null;
  shopId?: number | null;
  createdAt: string;
}

interface DeviceModel {
  id: number;
  name: string;
  brand: string;
  deviceType: string;
  isGlobal: boolean;
  userId?: number | null;
  shopId?: number | null;
  createdAt: string;
}

interface DeviceIssue {
  id: number;
  description: string;
  deviceType: string;
  isGlobal: boolean;
  userId?: number | null;
  shopId?: number | null;
  createdAt: string;
}

export default function SuperadminDevicesTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("types");
  
  // State für Dialoge
  const [isCreateTypeDialogOpen, setIsCreateTypeDialogOpen] = useState(false);
  const [isEditTypeDialogOpen, setIsEditTypeDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  
  const [isCreateBrandDialogOpen, setIsCreateBrandDialogOpen] = useState(false);
  const [isEditBrandDialogOpen, setIsEditBrandDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null);
  
  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false);
  const [isEditModelDialogOpen, setIsEditModelDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);
  
  const [isCreateIssueDialogOpen, setIsCreateIssueDialogOpen] = useState(false);
  const [isEditIssueDialogOpen, setIsEditIssueDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<DeviceIssue | null>(null);
  
  // State für Formulare
  const [typeForm, setTypeForm] = useState({ name: '', isGlobal: true });
  const [brandForm, setBrandForm] = useState({ name: '', deviceType: '', isGlobal: true });
  const [modelForm, setModelForm] = useState({ name: '', brand: '', deviceType: '', isGlobal: true });
  const [issueForm, setIssueForm] = useState({ description: '', deviceType: '', isGlobal: true });
  
  // Gerätedaten abrufen
  const { data: deviceTypes, isLoading: isLoadingTypes, error: typesError } = useQuery<DeviceType[]>({ 
    queryKey: ["/api/superadmin/device-types"],
  });
  
  const { data: deviceBrands, isLoading: isLoadingBrands, error: brandsError } = useQuery<DeviceBrand[]>({ 
    queryKey: ["/api/superadmin/device-brands"],
  });
  
  const { data: deviceModels, isLoading: isLoadingModels, error: modelsError } = useQuery<DeviceModel[]>({ 
    queryKey: ["/api/superadmin/device-models"],
  });
  
  const { data: deviceIssues, isLoading: isLoadingIssues, error: issuesError } = useQuery<DeviceIssue[]>({ 
    queryKey: ["/api/superadmin/device-issues"],
  });
  
  // Mutations für Gerätetypen
  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string, isGlobal: boolean }) => {
      const response = await apiRequest("POST", "/api/superadmin/device-types", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      setIsCreateTypeDialogOpen(false);
      setTypeForm({ name: '', isGlobal: true });
      toast({
        title: "Gerätetyp erstellt",
        description: "Der Gerätetyp wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Gerätetyp konnte nicht erstellt werden: ${error.message}`,
      });
    },
  });
  
  const updateTypeMutation = useMutation({
    mutationFn: async ({ typeId, data }: { typeId: number; data: { name: string, isGlobal: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/device-types/${typeId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      setIsEditTypeDialogOpen(false);
      toast({
        title: "Gerätetyp aktualisiert",
        description: "Der Gerätetyp wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Gerätetyp konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });
  
  const deleteTypeMutation = useMutation({
    mutationFn: async (typeId: number) => {
      await apiRequest("DELETE", `/api/superadmin/device-types/${typeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-types"] });
      toast({
        title: "Gerätetyp gelöscht",
        description: "Der Gerätetyp wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Gerätetyp konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });
  
  // Mutations für Marken
  const createBrandMutation = useMutation({
    mutationFn: async (data: { name: string, deviceType: string, isGlobal: boolean }) => {
      const response = await apiRequest("POST", "/api/superadmin/device-brands", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-brands"] });
      setIsCreateBrandDialogOpen(false);
      setBrandForm({ name: '', deviceType: '', isGlobal: true });
      toast({
        title: "Marke erstellt",
        description: "Die Marke wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Marke konnte nicht erstellt werden: ${error.message}`,
      });
    },
  });
  
  const updateBrandMutation = useMutation({
    mutationFn: async ({ brandId, data }: { brandId: number; data: { name: string, deviceType: string, isGlobal: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/device-brands/${brandId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-brands"] });
      setIsEditBrandDialogOpen(false);
      toast({
        title: "Marke aktualisiert",
        description: "Die Marke wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Marke konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });
  
  const deleteBrandMutation = useMutation({
    mutationFn: async (brandId: number) => {
      await apiRequest("DELETE", `/api/superadmin/device-brands/${brandId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-brands"] });
      toast({
        title: "Marke gelöscht",
        description: "Die Marke wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Marke konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });
  
  // Mutations für Modelle
  const createModelMutation = useMutation({
    mutationFn: async (data: { name: string, brand: string, deviceType: string, isGlobal: boolean }) => {
      const response = await apiRequest("POST", "/api/superadmin/device-models", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-models"] });
      setIsCreateModelDialogOpen(false);
      setModelForm({ name: '', brand: '', deviceType: '', isGlobal: true });
      toast({
        title: "Modell erstellt",
        description: "Das Modell wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Modell konnte nicht erstellt werden: ${error.message}`,
      });
    },
  });
  
  const updateModelMutation = useMutation({
    mutationFn: async ({ modelId, data }: { modelId: number; data: { name: string, brand: string, deviceType: string, isGlobal: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/device-models/${modelId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-models"] });
      setIsEditModelDialogOpen(false);
      toast({
        title: "Modell aktualisiert",
        description: "Das Modell wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Modell konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });
  
  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: number) => {
      await apiRequest("DELETE", `/api/superadmin/device-models/${modelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-models"] });
      toast({
        title: "Modell gelöscht",
        description: "Das Modell wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Modell konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });
  
  // Mutations für Probleme/Fehler
  const createIssueMutation = useMutation({
    mutationFn: async (data: { description: string, deviceType: string, isGlobal: boolean }) => {
      const response = await apiRequest("POST", "/api/superadmin/device-issues", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      setIsCreateIssueDialogOpen(false);
      setIssueForm({ description: '', deviceType: '', isGlobal: true });
      toast({
        title: "Problem erstellt",
        description: "Das Problem wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Problem konnte nicht erstellt werden: ${error.message}`,
      });
    },
  });
  
  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, data }: { issueId: number; data: { description: string, deviceType: string, isGlobal: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/superadmin/device-issues/${issueId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      setIsEditIssueDialogOpen(false);
      toast({
        title: "Problem aktualisiert",
        description: "Das Problem wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Problem konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });
  
  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: number) => {
      await apiRequest("DELETE", `/api/superadmin/device-issues/${issueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/device-issues"] });
      toast({
        title: "Problem gelöscht",
        description: "Das Problem wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Problem konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });
  
  // Handler für Gerätetypen
  const handleEditType = (type: DeviceType) => {
    setSelectedType(type);
    setTypeForm({
      name: type.name,
      isGlobal: type.isGlobal
    });
    setIsEditTypeDialogOpen(true);
  };
  
  const handleDeleteType = (typeId: number) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Gerätetyp löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteTypeMutation.mutate(typeId);
    }
  };
  
  // Handler für Marken
  const handleEditBrand = (brand: DeviceBrand) => {
    setSelectedBrand(brand);
    setBrandForm({
      name: brand.name,
      deviceType: brand.deviceType,
      isGlobal: brand.isGlobal
    });
    setIsEditBrandDialogOpen(true);
  };
  
  const handleDeleteBrand = (brandId: number) => {
    if (confirm("Sind Sie sicher, dass Sie diese Marke löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteBrandMutation.mutate(brandId);
    }
  };
  
  // Handler für Modelle
  const handleEditModel = (model: DeviceModel) => {
    setSelectedModel(model);
    setModelForm({
      name: model.name,
      brand: model.brand,
      deviceType: model.deviceType,
      isGlobal: model.isGlobal
    });
    setIsEditModelDialogOpen(true);
  };
  
  const handleDeleteModel = (modelId: number) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Modell löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteModelMutation.mutate(modelId);
    }
  };
  
  // Handler für Probleme
  const handleEditIssue = (issue: DeviceIssue) => {
    setSelectedIssue(issue);
    setIssueForm({
      description: issue.description,
      deviceType: issue.deviceType,
      isGlobal: issue.isGlobal
    });
    setIsEditIssueDialogOpen(true);
  };
  
  const handleDeleteIssue = (issueId: number) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Problem löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteIssueMutation.mutate(issueId);
    }
  };
  
  if (typesError || brandsError || modelsError || issuesError) {
    toast({
      variant: "destructive",
      title: "Fehler beim Laden der Gerätedaten",
      description: "Es ist ein Fehler beim Laden der Daten aufgetreten.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geräteverwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie Gerätetypen, Marken, Modelle und Fehlerkatalog</p>
        </div>
      </div>
      
      <Tabs defaultValue="types" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="types">Gerätetypen</TabsTrigger>
            <TabsTrigger value="brands">Marken</TabsTrigger>
            <TabsTrigger value="models">Modelle</TabsTrigger>
            <TabsTrigger value="issues">Fehlerkatalog</TabsTrigger>
          </TabsList>
          
          {activeTab === "types" && (
            <Button onClick={() => setIsCreateTypeDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Neuen Gerätetyp erstellen
            </Button>
          )}
          
          {activeTab === "brands" && (
            <Button onClick={() => setIsCreateBrandDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Neue Marke erstellen
            </Button>
          )}
          
          {activeTab === "models" && (
            <Button onClick={() => setIsCreateModelDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Neues Modell erstellen
            </Button>
          )}
          
          {activeTab === "issues" && (
            <Button onClick={() => setIsCreateIssueDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Neuen Fehler erstellen
            </Button>
          )}
        </div>
        
        {/* Tab-Inhalte */}
        <TabsContent value="types" className="space-y-4">
          {isLoadingTypes ? (
            <Skeleton className="w-full h-96" />
          ) : deviceTypes?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Gerätetypen</CardTitle>
                <CardDescription>Verwalten Sie global verfügbare Gerätetypen</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell>{type.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {type.name === "Smartphone" || type.name === "Handy" ? (
                              <Smartphone className="h-4 w-4 mr-2" />
                            ) : type.name === "Laptop" || type.name === "Notebook" ? (
                              <Laptop className="h-4 w-4 mr-2" />
                            ) : (
                              <Settings className="h-4 w-4 mr-2" />
                            )}
                            {type.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {type.isGlobal ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Shop: {type.shopId}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(type.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditType(type)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteType(type.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Löschen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Keine Gerätetypen gefunden</CardTitle>
                <CardDescription>
                  Es wurden noch keine Gerätetypen erstellt. Klicken Sie auf "Neuen Gerätetyp erstellen", um zu beginnen.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="brands" className="space-y-4">
          {isLoadingBrands ? (
            <Skeleton className="w-full h-96" />
          ) : deviceBrands?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Gerätemarken</CardTitle>
                <CardDescription>Verwalten Sie global verfügbare Marken</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Gerätetyp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceBrands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>{brand.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 mr-2" />
                            {brand.name}
                          </div>
                        </TableCell>
                        <TableCell>{brand.deviceType}</TableCell>
                        <TableCell>
                          {brand.isGlobal ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Shop: {brand.shopId}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(brand.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditBrand(brand)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteBrand(brand.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Löschen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Keine Marken gefunden</CardTitle>
                <CardDescription>
                  Es wurden noch keine Marken erstellt. Klicken Sie auf "Neue Marke erstellen", um zu beginnen.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="models" className="space-y-4">
          {isLoadingModels ? (
            <Skeleton className="w-full h-96" />
          ) : deviceModels?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Gerätemodelle</CardTitle>
                <CardDescription>Verwalten Sie global verfügbare Modelle</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Marke</TableHead>
                      <TableHead>Gerätetyp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceModels.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>{model.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Settings className="h-4 w-4 mr-2" />
                            {model.name}
                          </div>
                        </TableCell>
                        <TableCell>{model.brand}</TableCell>
                        <TableCell>{model.deviceType}</TableCell>
                        <TableCell>
                          {model.isGlobal ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Shop: {model.shopId}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditModel(model)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Löschen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Keine Modelle gefunden</CardTitle>
                <CardDescription>
                  Es wurden noch keine Modelle erstellt. Klicken Sie auf "Neues Modell erstellen", um zu beginnen.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="issues" className="space-y-4">
          {isLoadingIssues ? (
            <Skeleton className="w-full h-96" />
          ) : deviceIssues?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Fehlerkatalog</CardTitle>
                <CardDescription>Verwalten Sie global verfügbare Problemkategorien</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Gerätetyp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>{issue.id}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {issue.description}
                          </div>
                        </TableCell>
                        <TableCell>{issue.deviceType}</TableCell>
                        <TableCell>
                          {issue.isGlobal ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Shop: {issue.shopId}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditIssue(issue)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteIssue(issue.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Löschen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Keine Probleme gefunden</CardTitle>
                <CardDescription>
                  Es wurden noch keine Probleme erstellt. Klicken Sie auf "Neuen Fehler erstellen", um zu beginnen.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialog zum Erstellen eines neuen Gerätetyps */}
      <Dialog open={isCreateTypeDialogOpen} onOpenChange={setIsCreateTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Gerätetyp erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen globalen Gerätetyp, der von allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="z.B. Smartphone, Laptop, Tablet"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTypeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => createTypeMutation.mutate(typeForm)}
              disabled={!typeForm.name}
            >
              Gerätetyp erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Bearbeiten eines Gerätetyps */}
      <Dialog open={isEditTypeDialogOpen} onOpenChange={setIsEditTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerätetyp bearbeiten: {selectedType?.name}</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen für diesen Gerätetyp.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="z.B. Smartphone, Laptop, Tablet"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTypeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => selectedType && updateTypeMutation.mutate({ typeId: selectedType.id, data: typeForm })}
              disabled={!typeForm.name}
            >
              Gerätetyp aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Erstellen einer neuen Marke */}
      <Dialog open={isCreateBrandDialogOpen} onOpenChange={setIsCreateBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Marke erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue globale Marke, die von allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                placeholder="z.B. Apple, Samsung, HP"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gerätetyp</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={brandForm.deviceType}
                onChange={(e) => setBrandForm({ ...brandForm, deviceType: e.target.value })}
              >
                <option value="">Bitte wählen Sie einen Gerätetyp</option>
                {deviceTypes?.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateBrandDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => createBrandMutation.mutate(brandForm)}
              disabled={!brandForm.name || !brandForm.deviceType}
            >
              Marke erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Bearbeiten einer Marke */}
      <Dialog open={isEditBrandDialogOpen} onOpenChange={setIsEditBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marke bearbeiten: {selectedBrand?.name}</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen für diese Marke.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                placeholder="z.B. Apple, Samsung, HP"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gerätetyp</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={brandForm.deviceType}
                onChange={(e) => setBrandForm({ ...brandForm, deviceType: e.target.value })}
              >
                <option value="">Bitte wählen Sie einen Gerätetyp</option>
                {deviceTypes?.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBrandDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => selectedBrand && updateBrandMutation.mutate({ brandId: selectedBrand.id, data: brandForm })}
              disabled={!brandForm.name || !brandForm.deviceType}
            >
              Marke aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Erstellen eines neuen Modells */}
      <Dialog open={isCreateModelDialogOpen} onOpenChange={setIsCreateModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Modell erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues globales Modell, das von allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={modelForm.name}
                onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                placeholder="z.B. iPhone 13, Galaxy S21, MacBook Pro"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gerätetyp</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={modelForm.deviceType}
                onChange={(e) => setModelForm({ ...modelForm, deviceType: e.target.value, brand: '' })}
              >
                <option value="">Bitte wählen Sie einen Gerätetyp</option>
                {deviceTypes?.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Marke</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={modelForm.brand}
                onChange={(e) => setModelForm({ ...modelForm, brand: e.target.value })}
                disabled={!modelForm.deviceType}
              >
                <option value="">Bitte wählen Sie eine Marke</option>
                {deviceBrands?.filter(brand => brand.deviceType === modelForm.deviceType).map((brand) => (
                  <option key={brand.id} value={brand.name}>{brand.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModelDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => createModelMutation.mutate(modelForm)}
              disabled={!modelForm.name || !modelForm.deviceType || !modelForm.brand}
            >
              Modell erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Bearbeiten eines Modells */}
      <Dialog open={isEditModelDialogOpen} onOpenChange={setIsEditModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modell bearbeiten: {selectedModel?.name}</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen für dieses Modell.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input 
                className="col-span-3"
                value={modelForm.name}
                onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                placeholder="z.B. iPhone 13, Galaxy S21, MacBook Pro"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gerätetyp</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={modelForm.deviceType}
                onChange={(e) => setModelForm({ ...modelForm, deviceType: e.target.value, brand: '' })}
              >
                <option value="">Bitte wählen Sie einen Gerätetyp</option>
                {deviceTypes?.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Marke</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={modelForm.brand}
                onChange={(e) => setModelForm({ ...modelForm, brand: e.target.value })}
                disabled={!modelForm.deviceType}
              >
                <option value="">Bitte wählen Sie eine Marke</option>
                {deviceBrands?.filter(brand => brand.deviceType === modelForm.deviceType).map((brand) => (
                  <option key={brand.id} value={brand.name}>{brand.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModelDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => selectedModel && updateModelMutation.mutate({ modelId: selectedModel.id, data: modelForm })}
              disabled={!modelForm.name || !modelForm.deviceType || !modelForm.brand}
            >
              Modell aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Erstellen eines neuen Problems */}
      <Dialog open={isCreateIssueDialogOpen} onOpenChange={setIsCreateIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Fehlereintrag erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen globalen Fehlereintrag, der von allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Beschreibung</Label>
              <Textarea 
                className="col-span-3"
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                placeholder="z.B. Displaybruch, Wasserschaden, Akku defekt"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gerätetyp</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={issueForm.deviceType}
                onChange={(e) => setIssueForm({ ...issueForm, deviceType: e.target.value })}
              >
                <option value="">Bitte wählen Sie einen Gerätetyp</option>
                {deviceTypes?.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateIssueDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => createIssueMutation.mutate(issueForm)}
              disabled={!issueForm.description || !issueForm.deviceType}
            >
              Fehlereintrag erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog zum Bearbeiten eines Problems */}
      <Dialog open={isEditIssueDialogOpen} onOpenChange={setIsEditIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fehlereintrag bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen für diesen Fehlereintrag.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Beschreibung</Label>
              <Textarea 
                className="col-span-3"
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                placeholder="z.B. Displaybruch, Wasserschaden, Akku defekt"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Gerätetyp</Label>
              <select 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={issueForm.deviceType}
                onChange={(e) => setIssueForm({ ...issueForm, deviceType: e.target.value })}
              >
                <option value="">Bitte wählen Sie einen Gerätetyp</option>
                {deviceTypes?.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIssueDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={() => selectedIssue && updateIssueMutation.mutate({ issueId: selectedIssue.id, data: issueForm })}
              disabled={!issueForm.description || !issueForm.deviceType}
            >
              Fehlereintrag aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
