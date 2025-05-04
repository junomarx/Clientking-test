import { useState, useMemo } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, PlusCircle, Smartphone, Briefcase, Book, AlertTriangle } from 'lucide-react';

interface DeviceType {
  id: number;
  name: string;
  isGlobal: boolean;
  createdAt: string;
}

interface DeviceBrand {
  id: number;
  name: string;
  deviceType: string;
  isGlobal: boolean;
  createdAt: string;
}

interface DeviceModel {
  id: number;
  name: string;
  brand: string;
  deviceType: string;
  isGlobal: boolean;
  createdAt: string;
}

interface DeviceIssue {
  id: number;
  description: string;
  deviceType: string;
  isGlobal: boolean;
  createdAt: string;
}

export default function SuperadminDevicesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'types' | 'brands' | 'models' | 'issues'>('types');
  
  // Device Type State
  const [isCreateTypeDialogOpen, setIsCreateTypeDialogOpen] = useState(false);
  const [isEditTypeDialogOpen, setIsEditTypeDialogOpen] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState({ name: '', isGlobal: true });
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  
  // Device Brand State
  const [isCreateBrandDialogOpen, setIsCreateBrandDialogOpen] = useState(false);
  const [isEditBrandDialogOpen, setIsEditBrandDialogOpen] = useState(false);
  const [newDeviceBrand, setNewDeviceBrand] = useState({ name: '', deviceType: '', isGlobal: true });
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null);
  
  // Device Model State
  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false);
  const [isEditModelDialogOpen, setIsEditModelDialogOpen] = useState(false);
  const [newDeviceModel, setNewDeviceModel] = useState({ name: '', brand: '', deviceType: '', isGlobal: true });
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);
  
  // Device Issue State
  const [isCreateIssueDialogOpen, setIsCreateIssueDialogOpen] = useState(false);
  const [isEditIssueDialogOpen, setIsEditIssueDialogOpen] = useState(false);
  const [newDeviceIssue, setNewDeviceIssue] = useState({ description: '', deviceType: '', isGlobal: true });
  const [selectedIssue, setSelectedIssue] = useState<DeviceIssue | null>(null);
  
  // Queries
  const typesQuery = useQuery({
    queryKey: ['/api/superadmin/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/superadmin/device-types');
      return await res.json() as DeviceType[];
    }
  });
  
  const brandsQuery = useQuery({
    queryKey: ['/api/superadmin/device-brands'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/superadmin/device-brands');
      return await res.json() as DeviceBrand[];
    }
  });
  
  const modelsQuery = useQuery({
    queryKey: ['/api/superadmin/device-models'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/superadmin/device-models');
      return await res.json() as DeviceModel[];
    }
  });
  
  const issuesQuery = useQuery({
    queryKey: ['/api/superadmin/device-issues'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/superadmin/device-issues');
      return await res.json() as DeviceIssue[];
    }
  });
  
  // Memoized filtered data to prevent unnecessary rerenders
  const filteredBrands = useMemo(() => {
    if (!newDeviceModel.deviceType) return [];
    return (brandsQuery.data || []).filter(
      (brand) => brand.deviceType === newDeviceModel.deviceType
    );
  }, [brandsQuery.data, newDeviceModel.deviceType]);
  
  const filteredBrandsForSelectedModel = useMemo(() => {
    if (!selectedModel) return [];
    return (brandsQuery.data || []).filter(
      (brand) => brand.deviceType === selectedModel.deviceType
    );
  }, [brandsQuery.data, selectedModel]);
  
  // Mutations for Device Types
  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string; isGlobal: boolean }) => {
      const res = await apiRequest('POST', '/api/superadmin/device-types', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-types'] });
      setIsCreateTypeDialogOpen(false);
      setNewDeviceType({ name: '', isGlobal: true });
      toast({
        title: "Gerätetyp erstellt",
        description: "Der Gerätetyp wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Erstellen des Gerätetyps: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; isGlobal: boolean } }) => {
      const res = await apiRequest('PATCH', `/api/superadmin/device-types/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-types'] });
      setIsEditTypeDialogOpen(false);
      setSelectedType(null);
      toast({
        title: "Gerätetyp aktualisiert",
        description: "Der Gerätetyp wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Aktualisieren des Gerätetyps: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/superadmin/device-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-types'] });
      toast({
        title: "Gerätetyp gelöscht",
        description: "Der Gerätetyp wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen des Gerätetyps: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutations for Device Brands
  const createBrandMutation = useMutation({
    mutationFn: async (data: { name: string; deviceType: string; isGlobal: boolean }) => {
      const res = await apiRequest('POST', '/api/superadmin/device-brands', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-brands'] });
      setIsCreateBrandDialogOpen(false);
      setNewDeviceBrand({ name: '', deviceType: '', isGlobal: true });
      toast({
        title: "Marke erstellt",
        description: "Die Marke wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Erstellen der Marke: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; deviceType: string; isGlobal: boolean } }) => {
      const res = await apiRequest('PATCH', `/api/superadmin/device-brands/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-brands'] });
      setIsEditBrandDialogOpen(false);
      setSelectedBrand(null);
      toast({
        title: "Marke aktualisiert",
        description: "Die Marke wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Aktualisieren der Marke: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/superadmin/device-brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-brands'] });
      toast({
        title: "Marke gelöscht",
        description: "Die Marke wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen der Marke: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutations for Device Models
  const createModelMutation = useMutation({
    mutationFn: async (data: { name: string; brand: string; deviceType: string; isGlobal: boolean }) => {
      const res = await apiRequest('POST', '/api/superadmin/device-models', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-models'] });
      setIsCreateModelDialogOpen(false);
      setNewDeviceModel({ name: '', brand: '', deviceType: '', isGlobal: true });
      toast({
        title: "Modell erstellt",
        description: "Das Modell wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Erstellen des Modells: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const updateModelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; brand: string; deviceType: string; isGlobal: boolean } }) => {
      const res = await apiRequest('PATCH', `/api/superadmin/device-models/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-models'] });
      setIsEditModelDialogOpen(false);
      setSelectedModel(null);
      toast({
        title: "Modell aktualisiert",
        description: "Das Modell wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Aktualisieren des Modells: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const deleteModelMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/superadmin/device-models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-models'] });
      toast({
        title: "Modell gelöscht",
        description: "Das Modell wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen des Modells: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutations for Device Issues
  const createIssueMutation = useMutation({
    mutationFn: async (data: { description: string; deviceType: string; isGlobal: boolean }) => {
      const res = await apiRequest('POST', '/api/superadmin/device-issues', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setIsCreateIssueDialogOpen(false);
      setNewDeviceIssue({ description: '', deviceType: '', isGlobal: true });
      toast({
        title: "Problembeschreibung erstellt",
        description: "Die Problembeschreibung wurde erfolgreich erstellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Erstellen der Problembeschreibung: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { description: string; deviceType: string; isGlobal: boolean } }) => {
      const res = await apiRequest('PATCH', `/api/superadmin/device-issues/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      setIsEditIssueDialogOpen(false);
      setSelectedIssue(null);
      toast({
        title: "Problembeschreibung aktualisiert",
        description: "Die Problembeschreibung wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Aktualisieren der Problembeschreibung: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/superadmin/device-issues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/device-issues'] });
      toast({
        title: "Problembeschreibung gelöscht",
        description: "Die Problembeschreibung wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen der Problembeschreibung: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Geräteverwaltung</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Globale Gerätedaten verwalten</CardTitle>
          <CardDescription>
            Hier können Sie Gerätetypen, Marken, Modelle und Fehlerbeschreibungen verwalten, die für alle Shops sichtbar sind.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              if (val !== activeTab) {
                setActiveTab(val as 'types' | 'brands' | 'models' | 'issues');
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="types" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Gerätetypen
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Marken
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                Modelle
              </TabsTrigger>
              <TabsTrigger value="issues" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Problembeschreibungen
              </TabsTrigger>
            </TabsList>
            
            {/* Gerätetypen Tab */}
            <TabsContent value="types">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateTypeDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Neuen Gerätetyp erstellen
                </Button>
              </div>
              
              {typesQuery.isLoading ? (
                <div className="text-center py-6">Lade Gerätetypen...</div>
              ) : typesQuery.isError ? (
                <div className="text-center py-6 text-red-500">Fehler beim Laden der Gerätetypen</div>
              ) : typesQuery.data && typesQuery.data.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">Keine Gerätetypen gefunden</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Global</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typesQuery.data?.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.isGlobal ? 'Ja' : 'Nein'}</TableCell>
                        <TableCell>{new Date(type.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedType(type);
                              setIsEditTypeDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm(`Sind Sie sicher, dass Sie den Gerätetyp "${type.name}" löschen möchten?`)) {
                                deleteTypeMutation.mutate(type.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            {/* Marken Tab */}
            <TabsContent value="brands">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateBrandDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Neue Marke erstellen
                </Button>
              </div>
              
              {brandsQuery.isLoading ? (
                <div className="text-center py-6">Lade Marken...</div>
              ) : brandsQuery.isError ? (
                <div className="text-center py-6 text-red-500">Fehler beim Laden der Marken</div>
              ) : brandsQuery.data && brandsQuery.data.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">Keine Marken gefunden</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Gerätetyp</TableHead>
                      <TableHead>Global</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brandsQuery.data?.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell>{brand.deviceType}</TableCell>
                        <TableCell>{brand.isGlobal ? 'Ja' : 'Nein'}</TableCell>
                        <TableCell>{new Date(brand.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBrand(brand);
                              setIsEditBrandDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm(`Sind Sie sicher, dass Sie die Marke "${brand.name}" löschen möchten?`)) {
                                deleteBrandMutation.mutate(brand.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            {/* Modelle Tab */}
            <TabsContent value="models">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateModelDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Neues Modell erstellen
                </Button>
              </div>
              
              {modelsQuery.isLoading ? (
                <div className="text-center py-6">Lade Modelle...</div>
              ) : modelsQuery.isError ? (
                <div className="text-center py-6 text-red-500">Fehler beim Laden der Modelle</div>
              ) : modelsQuery.data && modelsQuery.data.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">Keine Modelle gefunden</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Marke</TableHead>
                      <TableHead>Gerätetyp</TableHead>
                      <TableHead>Global</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelsQuery.data?.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>{model.brand}</TableCell>
                        <TableCell>{model.deviceType}</TableCell>
                        <TableCell>{model.isGlobal ? 'Ja' : 'Nein'}</TableCell>
                        <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedModel(model);
                              setIsEditModelDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm(`Sind Sie sicher, dass Sie das Modell "${model.name}" löschen möchten?`)) {
                                deleteModelMutation.mutate(model.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            {/* Problembeschreibungen Tab */}
            <TabsContent value="issues">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateIssueDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Neue Problembeschreibung erstellen
                </Button>
              </div>
              
              {issuesQuery.isLoading ? (
                <div className="text-center py-6">Lade Problembeschreibungen...</div>
              ) : issuesQuery.isError ? (
                <div className="text-center py-6 text-red-500">Fehler beim Laden der Problembeschreibungen</div>
              ) : issuesQuery.data && issuesQuery.data.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">Keine Problembeschreibungen gefunden</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Gerätetyp</TableHead>
                      <TableHead>Global</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuesQuery.data?.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">{issue.description}</TableCell>
                        <TableCell>{issue.deviceType}</TableCell>
                        <TableCell>{issue.isGlobal ? 'Ja' : 'Nein'}</TableCell>
                        <TableCell>{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedIssue(issue);
                              setIsEditIssueDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (window.confirm(`Sind Sie sicher, dass Sie die Problembeschreibung "${issue.description}" löschen möchten?`)) {
                                deleteIssueMutation.mutate(issue.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Dialogs for Device Types */}
      <Dialog open={isCreateTypeDialogOpen} onOpenChange={setIsCreateTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerätetyp erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen neuen Gerätetyp, der in allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="typeName" className="text-right">
                Name
              </Label>
              <Input
                id="typeName"
                value={newDeviceType.name}
                onChange={(e) => setNewDeviceType({ ...newDeviceType, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="typeGlobal" className="text-right">
                Global
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="typeGlobal"
                  checked={newDeviceType.isGlobal}
                  onCheckedChange={(checked) => setNewDeviceType({ ...newDeviceType, isGlobal: !!checked })}
                />
                <label
                  htmlFor="typeGlobal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Für alle Shops sichtbar
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTypeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => createTypeMutation.mutate(newDeviceType)} disabled={!newDeviceType.name.trim()}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditTypeDialogOpen} onOpenChange={setIsEditTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerätetyp bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen des ausgewählten Gerätetyps.
            </DialogDescription>
          </DialogHeader>
          {selectedType && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTypeName" className="text-right">
                  Name
                </Label>
                <Input
                  id="editTypeName"
                  value={selectedType.name}
                  onChange={(e) => setSelectedType({ ...selectedType, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editTypeGlobal" className="text-right">
                  Global
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox
                    id="editTypeGlobal"
                    checked={selectedType.isGlobal}
                    onCheckedChange={(checked) => setSelectedType({ ...selectedType, isGlobal: !!checked })}
                  />
                  <label
                    htmlFor="editTypeGlobal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Für alle Shops sichtbar
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTypeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => selectedType && updateTypeMutation.mutate({ id: selectedType.id, data: { name: selectedType.name, isGlobal: selectedType.isGlobal } })}
              disabled={!selectedType || !selectedType.name.trim()}
            >
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialogs for Device Brands */}
      <Dialog open={isCreateBrandDialogOpen} onOpenChange={setIsCreateBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marke erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Marke, die in allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brandName" className="text-right">
                Name
              </Label>
              <Input
                id="brandName"
                value={newDeviceBrand.name}
                onChange={(e) => setNewDeviceBrand({ ...newDeviceBrand, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brandDeviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={newDeviceBrand.deviceType}
                onValueChange={(value) => setNewDeviceBrand({ ...newDeviceBrand, deviceType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
                </SelectTrigger>
                <SelectContent>
                  {typesQuery.data?.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brandGlobal" className="text-right">
                Global
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="brandGlobal"
                  checked={newDeviceBrand.isGlobal}
                  onCheckedChange={(checked) => setNewDeviceBrand({ ...newDeviceBrand, isGlobal: !!checked })}
                />
                <label
                  htmlFor="brandGlobal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Für alle Shops sichtbar
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateBrandDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createBrandMutation.mutate(newDeviceBrand)}
              disabled={!newDeviceBrand.name.trim() || !newDeviceBrand.deviceType}
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditBrandDialogOpen} onOpenChange={setIsEditBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marke bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen der ausgewählten Marke.
            </DialogDescription>
          </DialogHeader>
          {selectedBrand && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editBrandName" className="text-right">
                  Name
                </Label>
                <Input
                  id="editBrandName"
                  value={selectedBrand?.name || ''}
                  onChange={(e) => selectedBrand && setSelectedBrand({ ...selectedBrand, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editBrandDeviceType" className="text-right">
                  Gerätetyp
                </Label>
                <Select
                  value={selectedBrand?.deviceType || ''}
                  onValueChange={(value) => selectedBrand && setSelectedBrand({ ...selectedBrand, deviceType: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesQuery.data?.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editBrandGlobal" className="text-right">
                  Global
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox
                    id="editBrandGlobal"
                    checked={selectedBrand?.isGlobal || false}
                    onCheckedChange={(checked) => selectedBrand && setSelectedBrand({ ...selectedBrand, isGlobal: !!checked })}
                  />
                  <label
                    htmlFor="editBrandGlobal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Für alle Shops sichtbar
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBrandDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() =>
                selectedBrand &&
                updateBrandMutation.mutate({
                  id: selectedBrand.id,
                  data: {
                    name: selectedBrand.name,
                    deviceType: selectedBrand.deviceType,
                    isGlobal: selectedBrand.isGlobal,
                  },
                })
              }
              disabled={!selectedBrand || !selectedBrand.name.trim() || !selectedBrand.deviceType}
            >
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialogs for Device Models */}
      <Dialog open={isCreateModelDialogOpen} onOpenChange={setIsCreateModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modell erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Modell, das in allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modelName" className="text-right">
                Name
              </Label>
              <Input
                id="modelName"
                value={newDeviceModel.name}
                onChange={(e) => setNewDeviceModel({ ...newDeviceModel, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modelDeviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={newDeviceModel.deviceType}
                onValueChange={(value) => setNewDeviceModel({ ...newDeviceModel, deviceType: value, brand: '' })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
                </SelectTrigger>
                <SelectContent>
                  {typesQuery.data?.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modelBrand" className="text-right">
                Marke
              </Label>
              <Select
                value={newDeviceModel.brand}
                onValueChange={(value) => setNewDeviceModel({ ...newDeviceModel, brand: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wählen Sie eine Marke" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBrands.map((brand: DeviceBrand) => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="modelGlobal" className="text-right">
                Global
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="modelGlobal"
                  checked={newDeviceModel.isGlobal}
                  onCheckedChange={(checked) => setNewDeviceModel({ ...newDeviceModel, isGlobal: !!checked })}
                />
                <label
                  htmlFor="modelGlobal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Für alle Shops sichtbar
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModelDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createModelMutation.mutate(newDeviceModel)}
              disabled={
                !newDeviceModel.name.trim() || !newDeviceModel.deviceType || !newDeviceModel.brand
              }
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditModelDialogOpen} onOpenChange={setIsEditModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modell bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen des ausgewählten Modells.
            </DialogDescription>
          </DialogHeader>
          {selectedModel && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editModelName" className="text-right">
                  Name
                </Label>
                <Input
                  id="editModelName"
                  value={selectedModel?.name || ''}
                  onChange={(e) => selectedModel && setSelectedModel({ ...selectedModel, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editModelDeviceType" className="text-right">
                  Gerätetyp
                </Label>
                <Select
                  value={selectedModel?.deviceType || ''}
                  onValueChange={(value) => {
                    if (selectedModel && value !== selectedModel.deviceType) {
                      // Wenn der Gerätetyp geändert wird, setze die Marke zurück
                      setSelectedModel({ ...selectedModel, deviceType: value, brand: '' });
                    } else if (selectedModel) {
                      setSelectedModel({ ...selectedModel, deviceType: value });
                    }
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesQuery.data?.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editModelBrand" className="text-right">
                  Marke
                </Label>
                <Select
                  value={selectedModel?.brand || ''}
                  onValueChange={(value) => selectedModel && setSelectedModel({ ...selectedModel, brand: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Wählen Sie eine Marke" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBrandsForSelectedModel.map((brand: DeviceBrand) => (
                        <SelectItem key={brand.id} value={brand.name}>
                          {brand.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editModelGlobal" className="text-right">
                  Global
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox
                    id="editModelGlobal"
                    checked={selectedModel?.isGlobal || false}
                    onCheckedChange={(checked) => selectedModel && setSelectedModel({ ...selectedModel, isGlobal: !!checked })}
                  />
                  <label
                    htmlFor="editModelGlobal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Für alle Shops sichtbar
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModelDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() =>
                selectedModel &&
                updateModelMutation.mutate({
                  id: selectedModel.id,
                  data: {
                    name: selectedModel.name,
                    brand: selectedModel.brand,
                    deviceType: selectedModel.deviceType,
                    isGlobal: selectedModel.isGlobal,
                  },
                })
              }
              disabled={
                !selectedModel ||
                !selectedModel.name.trim() ||
                !selectedModel.deviceType ||
                !selectedModel.brand
              }
            >
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialogs for Device Issues */}
      <Dialog open={isCreateIssueDialogOpen} onOpenChange={setIsCreateIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Problembeschreibung erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Problembeschreibung, die in allen Shops verwendet werden kann.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="issueDescription" className="text-right">
                Beschreibung
              </Label>
              <Input
                id="issueDescription"
                value={newDeviceIssue.description}
                onChange={(e) => setNewDeviceIssue({ ...newDeviceIssue, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="issueDeviceType" className="text-right">
                Gerätetyp
              </Label>
              <Select
                value={newDeviceIssue.deviceType}
                onValueChange={(value) => setNewDeviceIssue({ ...newDeviceIssue, deviceType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
                </SelectTrigger>
                <SelectContent>
                  {typesQuery.data?.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="issueGlobal" className="text-right">
                Global
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="issueGlobal"
                  checked={newDeviceIssue.isGlobal}
                  onCheckedChange={(checked) => setNewDeviceIssue({ ...newDeviceIssue, isGlobal: !!checked })}
                />
                <label
                  htmlFor="issueGlobal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Für alle Shops sichtbar
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateIssueDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createIssueMutation.mutate(newDeviceIssue)}
              disabled={!newDeviceIssue.description.trim() || !newDeviceIssue.deviceType}
            >
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditIssueDialogOpen} onOpenChange={setIsEditIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Problembeschreibung bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen der ausgewählten Problembeschreibung.
            </DialogDescription>
          </DialogHeader>
          {selectedIssue && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editIssueDescription" className="text-right">
                  Beschreibung
                </Label>
                <Input
                  id="editIssueDescription"
                  value={selectedIssue?.description || ''}
                  onChange={(e) => selectedIssue && setSelectedIssue({ ...selectedIssue, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editIssueDeviceType" className="text-right">
                  Gerätetyp
                </Label>
                <Select
                  value={selectedIssue?.deviceType || ''}
                  onValueChange={(value) => selectedIssue && setSelectedIssue({ ...selectedIssue, deviceType: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesQuery.data?.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editIssueGlobal" className="text-right">
                  Global
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox
                    id="editIssueGlobal"
                    checked={selectedIssue?.isGlobal || false}
                    onCheckedChange={(checked) => selectedIssue && setSelectedIssue({ ...selectedIssue, isGlobal: !!checked })}
                  />
                  <label
                    htmlFor="editIssueGlobal"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Für alle Shops sichtbar
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIssueDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() =>
                selectedIssue &&
                updateIssueMutation.mutate({
                  id: selectedIssue.id,
                  data: {
                    description: selectedIssue.description,
                    deviceType: selectedIssue.deviceType,
                    isGlobal: selectedIssue.isGlobal,
                  },
                })
              }
              disabled={!selectedIssue || !selectedIssue.description.trim() || !selectedIssue.deviceType}
            >
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
