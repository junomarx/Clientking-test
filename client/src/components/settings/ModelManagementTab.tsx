import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { RefreshCw, Loader2, Edit, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

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

interface Model {
  id: number;
  name: string;
  brandId: number;
  modelSeriesId: number | null;
  deviceTypeId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Schema für das Formular
const modelFormSchema = z.object({
  deviceTypeId: z.string().min(1, 'Gerätetyp muss ausgewählt sein'),
  brandId: z.string().min(1, 'Marke muss ausgewählt sein'),
  models: z.string().min(1, 'Bitte geben Sie mindestens ein Modell ein')
});

type ModelFormValues = z.infer<typeof modelFormSchema>;

// Schema für neue Marke
const newBrandSchema = z.object({
  deviceTypeId: z.string().min(1, 'Gerätetyp muss ausgewählt sein'),
  name: z.string().min(1, 'Markenname darf nicht leer sein')
});

type NewBrandFormValues = z.infer<typeof newBrandSchema>;

export function ModelManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);

  // Formular für die Modellverwaltung
  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      deviceTypeId: '',
      brandId: '',
      models: ''
    }
  });

  // Formular für neue Marke
  const brandForm = useForm<NewBrandFormValues>({
    resolver: zodResolver(newBrandSchema),
    defaultValues: {
      deviceTypeId: '',
      name: ''
    }
  });

  // Gerätetypen abrufen
  const { data: deviceTypes, isLoading: isLoadingDeviceTypes } = useQuery<DeviceType[]>({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/device-types');
      return res.json();
    }
  });

  // Marken abrufen
  const { data: brands, isLoading: isLoadingBrands } = useQuery<Brand[]>({
    queryKey: ['/api/brands', selectedDeviceType],
    queryFn: async () => {
      const url = selectedDeviceType 
        ? `/api/brands?deviceTypeId=${selectedDeviceType}` 
        : '/api/brands';
      const res = await apiRequest('GET', url);
      return res.json();
    },
    enabled: !!deviceTypes && deviceTypes.length > 0
  });

  // Modelle abrufen
  const { data: existingModels, isLoading: isLoadingModels, refetch: refetchModels } = useQuery<Model[]>({
    queryKey: ['/api/models', selectedDeviceType, selectedBrand],
    queryFn: async () => {
      if (!selectedDeviceType || !selectedBrand) return [];
      
      const url = `/api/models?deviceTypeId=${selectedDeviceType}&brandId=${selectedBrand}`;
      const res = await apiRequest('GET', url);
      return res.json();
    },
    enabled: !!selectedDeviceType && !!selectedBrand
  });

  // Wenn Gerätetyp oder Marke geändert wird, hole Modelle und aktualisiere Textfeld
  useEffect(() => {
    if (selectedDeviceType && selectedBrand && existingModels) {
      setModels(existingModels);
      
      // Fülle das Textfeld mit vorhandenen Modellen
      const modelNames = existingModels.map(model => model.name).join('\n');
      form.setValue('models', modelNames);
    } else {
      setModels([]);
      form.setValue('models', '');
    }
  }, [selectedDeviceType, selectedBrand, existingModels, form]);

  // Wenn sich der Gerätetyp im Formular ändert
  useEffect(() => {
    const deviceTypeId = form.watch('deviceTypeId');
    
    if (deviceTypeId) {
      setSelectedDeviceType(deviceTypeId);
      // Zurücksetzen der Marke
      form.setValue('brandId', '');
      setSelectedBrand(null);
    } else {
      setSelectedDeviceType(null);
    }
  }, [form.watch('deviceTypeId')]);

  // Wenn sich die Marke im Formular ändert
  useEffect(() => {
    const brandId = form.watch('brandId');
    
    if (brandId) {
      setSelectedBrand(brandId);
    } else {
      setSelectedBrand(null);
    }
  }, [form.watch('brandId')]);

  // Für das Hinzufügen einer neuen Marke
  const addBrandMutation = useMutation({
    mutationFn: async (data: NewBrandFormValues) => {
      const res = await apiRequest('POST', '/api/brands', {
        deviceTypeId: parseInt(data.deviceTypeId),
        name: data.name
      });
      return res.json();
    },
    onSuccess: (newBrand: Brand) => {
      setIsAddBrandDialogOpen(false);
      brandForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      
      // Automatisch die neue Marke auswählen
      form.setValue('brandId', newBrand.id.toString());
      setSelectedBrand(newBrand.id.toString());
      
      toast({
        title: 'Marke hinzugefügt',
        description: `Die Marke ${newBrand.name} wurde erfolgreich hinzugefügt.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Hinzufügen der Marke: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Für das Aktualisieren von Modellen
  const updateModelsMutation = useMutation({
    mutationFn: async ({ 
      deviceTypeId, 
      brandId, 
      modelLines 
    }: { 
      deviceTypeId: number, 
      brandId: number, 
      modelLines: string[] 
    }) => {
      const res = await apiRequest('POST', '/api/models/batch', {
        deviceTypeId,
        brandId,
        models: modelLines
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      refetchModels();
      
      toast({
        title: 'Modelle aktualisiert',
        description: 'Die Modelle wurden erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der Modelle: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleBrandFormSubmit = (data: NewBrandFormValues) => {
    addBrandMutation.mutate(data);
  };

  const handleUpdateModels = (data: ModelFormValues) => {
    if (!data.deviceTypeId || !data.brandId || !data.models) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie Gerätetyp und Marke aus und geben Sie mindestens ein Modell ein.',
        variant: 'destructive'
      });
      return;
    }

    // Zeilen aufteilen und leere Zeilen entfernen
    const modelLines = data.models
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (modelLines.length === 0) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie mindestens ein Modell ein.',
        variant: 'destructive'
      });
      return;
    }

    updateModelsMutation.mutate({
      deviceTypeId: parseInt(data.deviceTypeId),
      brandId: parseInt(data.brandId),
      modelLines
    });
  };

  // Wenn der ausgewählte Gerätetyp im Brand-Formular geändert wird,
  // nehme den Wert aus dem Hauptformular
  useEffect(() => {
    const deviceTypeId = form.watch('deviceTypeId');
    
    if (deviceTypeId) {
      brandForm.setValue('deviceTypeId', deviceTypeId);
    }
  }, [form.watch('deviceTypeId')]);

  if (isLoadingDeviceTypes) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelle verwalten</CardTitle>
          <CardDescription>
            Wählen Sie Gerätetyp und Marke aus, um Modelle zu verwalten. Geben Sie dann alle Modelle ein, eines pro Zeile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deviceTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gerätetyp</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
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

                <div>
                  <FormField
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marke</FormLabel>
                        <div className="flex gap-2">
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                            disabled={!selectedDeviceType}
                          >
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={selectedDeviceType ? "Marke auswählen" : "Erst Gerätetyp wählen"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brands?.filter(brand => 
                                !selectedDeviceType || brand.deviceTypeId === parseInt(selectedDeviceType)
                              ).map((brand) => (
                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                  {brand.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => setIsAddBrandDialogOpen(true)}
                            disabled={!selectedDeviceType}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="models"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Modelle (ein Modell pro Zeile)</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {isLoadingModels ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `${models.length || 0} Modelle`
                        )}
                      </span>
                    </div>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="z.B.\niPhone 13\niPhone 13 Pro\niPhone 13 Pro Max"
                        rows={10}
                        disabled={!selectedDeviceType || !selectedBrand}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="button"
                onClick={form.handleSubmit(handleUpdateModels)}
                disabled={updateModelsMutation.isPending || !selectedDeviceType || !selectedBrand}
                className="w-full md:w-auto"
              >
                {updateModelsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Modelle werden aktualisiert...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Modelle aktualisieren
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Dialog zum Hinzufügen einer neuen Marke */}
      <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Marke hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Marke für Ihre Geräte hinzu.
            </DialogDescription>
          </DialogHeader>
          <Form {...brandForm}>
            <form onSubmit={brandForm.handleSubmit(handleBrandFormSubmit)} className="space-y-4">
              <FormField
                control={brandForm.control}
                name="deviceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
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
                control={brandForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <input 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="z.B. Apple, Samsung, Xiaomi" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddBrandDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={addBrandMutation.isPending}>
                  {addBrandMutation.isPending ? (
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
    </div>
  );
}