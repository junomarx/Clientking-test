import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash, Loader2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  deviceTypeId: z.string().min(1, 'Gerätetyp muss ausgewählt sein'),
  brandId: z.string().min(1, 'Hersteller muss ausgewählt sein'),
  name: z.string().min(1, 'Name darf nicht leer sein')
});

type ModelSeriesFormValues = z.infer<typeof modelSeriesSchema>;

export function ModelSeriesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModelSeries, setSelectedModelSeries] = useState<ModelSeries | null>(null);

  // Gerätetypen abrufen
  const { data: deviceTypes, isLoading: isLoadingDeviceTypes } = useQuery<DeviceType[]>({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/device-types');
      return res.json();
    }
  });

  // Herstellern abrufen
  const { data: brands, isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ['/api/brands', selectedDeviceType],
    queryFn: async () => {
      const url = selectedDeviceType 
        ? `/api/brands?deviceTypeId=${selectedDeviceType}` 
        : '/api/brands';
      const res = await apiRequest('GET', url);
      return res.json();
    }
  });

  // Modellreihen abrufen
  const { data: modelSeries, isLoading: isLoadingModelSeries } = useQuery<ModelSeries[]>({
    queryKey: ['/api/model-series', selectedDeviceType, selectedBrand],
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
        url += `?${params.join('&')}`;
      }
      
      const res = await apiRequest('GET', url);
      return res.json();
    }
  });

  // Formular für das Hinzufügen einer neuen Modellreihe
  const addForm = useForm<ModelSeriesFormValues>({
    resolver: zodResolver(modelSeriesSchema),
    defaultValues: {
      deviceTypeId: '',
      brandId: '',
      name: ''
    }
  });

  // Wenn der Gerätetyp im Formular geändert wird, setze die Herstellern zurück
  useEffect(() => {
    const deviceTypeId = addForm.watch('deviceTypeId');
    
    if (deviceTypeId) {
      addForm.setValue('brandId', '');
    }
  }, [addForm.watch('deviceTypeId')]);

  // Formular für das Bearbeiten einer Modellreihe
  const editForm = useForm<ModelSeriesFormValues>({
    resolver: zodResolver(modelSeriesSchema),
    defaultValues: {
      deviceTypeId: '',
      brandId: '',
      name: ''
    }
  });

  // Wenn der Gerätetyp im Bearbeitungsformular geändert wird, setze die Herstellern zurück
  useEffect(() => {
    const deviceTypeId = editForm.watch('deviceTypeId');
    
    if (deviceTypeId) {
      editForm.setValue('brandId', '');
    }
  }, [editForm.watch('deviceTypeId')]);

  // Mutation zum Hinzufügen einer neuen Modellreihe
  const addModelSeriesMutation = useMutation({
    mutationFn: async (data: ModelSeriesFormValues) => {
      const res = await apiRequest('POST', '/api/model-series', {
        ...data,
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
        description: 'Die Modellreihe wurde erfolgreich hinzugefügt.'
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
        ...data,
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
    if (selectedModelSeries) {
      updateModelSeriesMutation.mutate({ id: selectedModelSeries.id, data });
    }
  };

  const handleEdit = (modelSeries: ModelSeries) => {
    setSelectedModelSeries(modelSeries);
    editForm.reset({
      deviceTypeId: modelSeries.deviceTypeId.toString(),
      brandId: modelSeries.brandId.toString(),
      name: modelSeries.name
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (modelSeries: ModelSeries) => {
    setSelectedModelSeries(modelSeries);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedModelSeries) {
      deleteModelSeriesMutation.mutate(selectedModelSeries.id);
    }
  };

  const getDeviceTypeName = (deviceTypeId: number): string => {
    const deviceType = deviceTypes?.find(dt => dt.id === deviceTypeId);
    return deviceType ? deviceType.name : 'Unbekannt';
  };

  const getBrandName = (brandId: number): string => {
    const brand = brands?.find(b => b.id === brandId);
    return brand ? brand.name : 'Unbekannt';
  };

  // Filtere Herstellern nach ausgewähltem Gerätetyp für das Formular
  const filteredBrands = (selectedDeviceTypeId: string) => {
    return brands?.filter(brand => brand.deviceTypeId === parseInt(selectedDeviceTypeId)) || [];
  };

  if (isLoadingDeviceTypes || isLoadingBrands) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Modellreihen verwalten</h3>
            <p className="text-sm text-muted-foreground">
              Fügen Sie Modellreihen hinzu, die von allen Benutzern verwendet werden können.
            </p>
          </div>
          <Button 
            size="sm"
            onClick={() => {
              addForm.reset();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Hinzufügen
          </Button>
        </div>
        
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Gerätetyp-Filter</label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedDeviceType || 'all'}
                onValueChange={(value) => {
                  setSelectedDeviceType(value === 'all' ? null : value);
                  setSelectedBrand(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nach Gerätetyp filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Gerätetypen</SelectItem>
                  {deviceTypes?.map((deviceType) => (
                    <SelectItem key={deviceType.id} value={deviceType.id.toString()}>
                      {deviceType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDeviceType && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedDeviceType(null);
                  setSelectedBrand(null);
                }}>
                  Zurücksetzen
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Herstellern-Filter</label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedBrand || 'all'}
                onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)}
                disabled={!selectedDeviceType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDeviceType ? "Nach Hersteller filtern" : "Erst Gerätetyp wählen"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Herstellern</SelectItem>
                  {brands?.filter(brand => 
                    !selectedDeviceType || brand.deviceTypeId === parseInt(selectedDeviceType)
                  ).map((brand) => (
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

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gerätetyp</TableHead>
              <TableHead>Hersteller</TableHead>
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
                  {selectedBrand 
                    ? 'Keine Modellreihen für diese Hersteller gefunden' 
                    : selectedDeviceType
                    ? 'Keine Modellreihen für diesen Gerätetyp gefunden'
                    : 'Keine Modellreihen gefunden'}
                </TableCell>
              </TableRow>
            ) : (
              modelSeries?.map((series) => (
                <TableRow key={series.id}>
                  <TableCell className="font-medium">{series.name}</TableCell>
                  <TableCell>{getDeviceTypeName(series.deviceTypeId)}</TableCell>
                  <TableCell>{getBrandName(series.brandId)}</TableCell>
                  <TableCell>{new Date(series.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(series)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Bearbeiten</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(series)}
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
      </div>

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
                    <FormLabel>Hersteller</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!addForm.watch('deviceTypeId')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            addForm.watch('deviceTypeId') 
                              ? "Hersteller auswählen" 
                              : "Erst Gerätetyp wählen"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredBrands(addForm.watch('deviceTypeId')).map((brand) => (
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
                      <Input placeholder="z.B. iPhone, Galaxy S, Mi" {...field} />
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
                    <FormLabel>Hersteller</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!editForm.watch('deviceTypeId')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Hersteller auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredBrands(editForm.watch('deviceTypeId')).map((brand) => (
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