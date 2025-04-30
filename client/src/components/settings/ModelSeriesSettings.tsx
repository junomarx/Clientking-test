import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Schnittstellen für die Daten
interface DeviceType {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface ModelSeries {
  id: number;
  name: string;
  brandId: number;
  deviceTypeId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Schema zur Validierung des Formulars
const modelSeriesSchema = z.object({
  name: z.string().min(1, 'Modellreihenname darf nicht leer sein'),
  deviceTypeId: z.string().min(1, 'Gerätetyp muss ausgewählt werden'),
  brandId: z.string().min(1, 'Marke muss ausgewählt werden')
});

type ModelSeriesFormValues = z.infer<typeof modelSeriesSchema>;

export function ModelSeriesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModelSeries, setSelectedModelSeries] = useState<ModelSeries | null>(null);
  
  // Filter-States
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  // Formulare initialisieren
  const addForm = useForm<ModelSeriesFormValues>({
    resolver: zodResolver(modelSeriesSchema),
    defaultValues: {
      name: '',
      deviceTypeId: '',
      brandId: ''
    }
  });

  const editForm = useForm<ModelSeriesFormValues>({
    resolver: zodResolver(modelSeriesSchema),
    defaultValues: {
      name: '',
      deviceTypeId: '',
      brandId: ''
    }
  });

  // Gerätetyp-Änderung im Formular überwachen
  const watchDeviceTypeAdd = addForm.watch('deviceTypeId');
  const watchDeviceTypeEdit = editForm.watch('deviceTypeId');

  // Abfrage zum Abrufen aller Gerätetypen
  const { data: deviceTypes, isLoading: isLoadingDeviceTypes } = useQuery<DeviceType[]>({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/device-types');
      return res.json();
    }
  });

  // Abfrage für Marken basierend auf Gerätetyp-Filter
  const { data: brands, isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ['/api/brands', { deviceTypeId: selectedDeviceType }],
    queryFn: async () => {
      const url = selectedDeviceType 
        ? `/api/brands?deviceTypeId=${selectedDeviceType}` 
        : '/api/brands';
      const res = await apiRequest('GET', url);
      return res.json();
    },
    enabled: true // Immer aktiv, auch ohne Filter
  });

  // Abfrage für Marken im Add-Formular
  const { data: brandsForAddForm } = useQuery<Brand[]>({
    queryKey: ['/api/brands', { deviceTypeId: watchDeviceTypeAdd }],
    queryFn: async () => {
      if (!watchDeviceTypeAdd) return [];
      const res = await apiRequest('GET', `/api/brands?deviceTypeId=${watchDeviceTypeAdd}`);
      return res.json();
    },
    enabled: !!watchDeviceTypeAdd
  });

  // Abfrage für Marken im Edit-Formular
  const { data: brandsForEditForm } = useQuery<Brand[]>({
    queryKey: ['/api/brands', { deviceTypeId: watchDeviceTypeEdit }],
    queryFn: async () => {
      if (!watchDeviceTypeEdit) return [];
      const res = await apiRequest('GET', `/api/brands?deviceTypeId=${watchDeviceTypeEdit}`);
      return res.json();
    },
    enabled: !!watchDeviceTypeEdit
  });

  // Abfrage zum Abrufen der Modellreihen mit Filtern
  const { data: modelSeries, isLoading: isLoadingModelSeries, refetch: refetchModelSeries } = useQuery<ModelSeries[]>({
    queryKey: ['/api/model-series', 
      { 
        deviceTypeId: selectedDeviceType, 
        brandId: selectedBrand 
      }
    ],
    queryFn: async () => {
      let url = '/api/model-series';
      const params = [];
      
      if (selectedDeviceType) {
        params.push(`deviceTypeId=${selectedDeviceType}`);
      }
      
      if (selectedBrand) {
        params.push(`brandId=${selectedBrand}`);
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&');
      }
      
      const res = await apiRequest('GET', url);
      return res.json();
    }
  });

  // Effekt zum Aktualisieren, wenn Filter sich ändern
  useEffect(() => {
    refetchModelSeries();
  }, [selectedDeviceType, selectedBrand, refetchModelSeries]);

  // Wenn sich Gerätetyp im Add-Formular ändert, Marke zurücksetzen
  useEffect(() => {
    if (watchDeviceTypeAdd) {
      addForm.setValue('brandId', '');
    }
  }, [watchDeviceTypeAdd, addForm]);

  // Wenn sich Gerätetyp im Edit-Formular ändert, Marke zurücksetzen
  useEffect(() => {
    if (watchDeviceTypeEdit) {
      editForm.setValue('brandId', '');
    }
  }, [watchDeviceTypeEdit, editForm]);

  // Mutation zum Hinzufügen einer neuen Modellreihe
  const addModelSeriesMutation = useMutation({
    mutationFn: async (data: ModelSeriesFormValues) => {
      const res = await apiRequest('POST', '/api/model-series', {
        name: data.name,
        deviceTypeId: parseInt(data.deviceTypeId),
        brandId: parseInt(data.brandId)
      });
      return res.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
      toast({
        title: 'Modellreihe hinzugefügt',
        description: 'Die neue Modellreihe wurde erfolgreich gespeichert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Hinzufügen der Modellreihe: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation zum Aktualisieren einer Modellreihe
  const updateModelSeriesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ModelSeriesFormValues }) => {
      const res = await apiRequest('PATCH', `/api/model-series/${id}`, {
        name: data.name,
        deviceTypeId: parseInt(data.deviceTypeId),
        brandId: parseInt(data.brandId)
      });
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
      toast({
        title: 'Modellreihe aktualisiert',
        description: 'Die Modellreihe wurde erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der Modellreihe: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation zum Löschen einer Modellreihe
  const deleteModelSeriesMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/model-series/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedModelSeries(null);
      queryClient.invalidateQueries({ queryKey: ['/api/model-series'] });
      toast({
        title: 'Modellreihe gelöscht',
        description: 'Die Modellreihe wurde erfolgreich gelöscht.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen der Modellreihe: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleAddSubmit = (data: ModelSeriesFormValues) => {
    addModelSeriesMutation.mutate(data);
  };

  const handleEditSubmit = (data: ModelSeriesFormValues) => {
    if (!selectedModelSeries) return;
    updateModelSeriesMutation.mutate({ id: selectedModelSeries.id, data });
  };

  const handleEdit = (ms: ModelSeries) => {
    setSelectedModelSeries(ms);
    editForm.reset({
      name: ms.name,
      deviceTypeId: ms.deviceTypeId.toString(),
      brandId: ms.brandId.toString()
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (ms: ModelSeries) => {
    setSelectedModelSeries(ms);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedModelSeries) return;
    deleteModelSeriesMutation.mutate(selectedModelSeries.id);
  };

  // Hilfsfunktion zum Abrufen des Gerätetyp-Namens anhand der ID
  const getDeviceTypeName = (deviceTypeId: number): string => {
    if (!deviceTypes) return 'Lädt...';
    const deviceType = deviceTypes.find(dt => dt.id === deviceTypeId);
    return deviceType ? deviceType.name : 'Unbekannt';
  };

  // Hilfsfunktion zum Abrufen des Markennamens anhand der ID
  const getBrandName = (brandId: number): string => {
    if (!brands) return 'Lädt...';
    const brand = brands.find(b => b.id === brandId);
    return brand ? brand.name : 'Unbekannt';
  };

  if (isLoadingDeviceTypes) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Modellreihen verwalten</CardTitle>
            <CardDescription>Hier können Sie Modellreihen für Ihre Reparaturaufträge verwalten.</CardDescription>
          </div>
          <Button
            className="ml-auto"
            onClick={() => {
              addForm.reset();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Modellreihe hinzufügen
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter-Bereich */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gerätetyp-Filter</label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedDeviceType || ''}
                  onValueChange={(value) => {
                    setSelectedDeviceType(value || null);
                    setSelectedBrand(null); // Markenfilter zurücksetzen
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nach Gerätetyp filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Gerätetypen</SelectItem>
                    {deviceTypes?.map((deviceType) => (
                      <SelectItem key={deviceType.id} value={deviceType.id.toString()}>
                        {deviceType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDeviceType && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDeviceType(null)}>
                    Zurücksetzen
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Marken-Filter</label>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedBrand || ''}
                  onValueChange={(value) => setSelectedBrand(value || null)}
                  disabled={!brands || brands.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      brands && brands.length > 0 
                        ? "Nach Marke filtern" 
                        : "Keine Marken verfügbar"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Marken</SelectItem>
                    {brands?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBrand && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)}>
                    Zurücksetzen
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Modellreihen-Tabelle */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gerätetyp</TableHead>
                <TableHead>Marke</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingModelSeries ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : modelSeries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {(selectedDeviceType || selectedBrand) 
                      ? 'Keine Modellreihen für die gewählten Filter gefunden' 
                      : 'Keine Modellreihen gefunden'}
                  </TableCell>
                </TableRow>
              ) : (
                modelSeries?.map((ms) => (
                  <TableRow key={ms.id}>
                    <TableCell className="font-medium">{ms.name}</TableCell>
                    <TableCell>{getDeviceTypeName(ms.deviceTypeId)}</TableCell>
                    <TableCell>{getBrandName(ms.brandId)}</TableCell>
                    <TableCell>{new Date(ms.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(ms)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Bearbeiten</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ms)}
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Löschen</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog zum Hinzufügen einer neuen Modellreihe */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Modellreihe hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Modellreihe für Ihre Reparaturen hinzu.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="deviceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Gerätetyp auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deviceTypes?.map((deviceType) => (
                          <SelectItem key={deviceType.id} value={deviceType.id.toString()}>
                            {deviceType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marke</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!watchDeviceTypeAdd}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !watchDeviceTypeAdd 
                              ? "Erst Gerätetyp auswählen" 
                              : brandsForAddForm && brandsForAddForm.length > 0 
                                ? "Marke auswählen"
                                : "Keine Marken verfügbar"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brandsForAddForm?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. iPhone 15, Galaxy S-Serie" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={addModelSeriesMutation.isPending}>
                  {addModelSeriesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog zum Bearbeiten einer Modellreihe */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modellreihe bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen für {selectedModelSeries?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="deviceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Gerätetyp auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deviceTypes?.map((deviceType) => (
                          <SelectItem key={deviceType.id} value={deviceType.id.toString()}>
                            {deviceType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marke</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!watchDeviceTypeEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Marke auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brandsForEditForm?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={updateModelSeriesMutation.isPending}>
                  {updateModelSeriesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aktualisieren...
                    </>
                  ) : (
                    'Aktualisieren'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bestätigungsdialog zum Löschen einer Modellreihe */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modellreihe löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie die Modellreihe "{selectedModelSeries?.name}" löschen möchten?
              Diese Aktion kann nicht rückgängig gemacht werden und entfernt auch alle zugehörigen Modelle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteModelSeriesMutation.isPending}
            >
              {deleteModelSeriesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Löschen...
                </>
              ) : (
                'Löschen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}