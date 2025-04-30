import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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

// Schema zur Validierung des Formulars
const brandSchema = z.object({
  deviceTypeId: z.string().min(1, 'Gerätetyp muss ausgewählt sein'),
  name: z.string().min(1, 'Markenname darf nicht leer sein')
});

type BrandFormValues = z.infer<typeof brandSchema>;

export function BrandSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  
  // Prüfen, ob der aktuelle Benutzer Bugi (Admin) ist
  const isAdmin = user?.id === 3;

  // Gerätetypen abrufen
  const { data: deviceTypes } = useQuery<DeviceType[]>({
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
    }
  });

  // Formular für das Hinzufügen einer neuen Marke
  const addForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      deviceTypeId: '',
      name: ''
    }
  });

  // Formular für das Bearbeiten einer Marke
  const editForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      deviceTypeId: '',
      name: ''
    }
  });

  // Mutation zum Hinzufügen einer neuen Marke
  const addBrandMutation = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      const res = await apiRequest('POST', '/api/brands', {
        ...data,
        deviceTypeId: parseInt(data.deviceTypeId)
      });
      return res.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      toast({
        title: 'Marke hinzugefügt',
        description: 'Die Marke wurde erfolgreich hinzugefügt.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Konnte Marke nicht hinzufügen: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation zum Aktualisieren einer Marke
  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BrandFormValues }) => {
      const res = await apiRequest('PATCH', `/api/brands/${id}`, {
        ...data,
        deviceTypeId: parseInt(data.deviceTypeId)
      });
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      toast({
        title: 'Marke aktualisiert',
        description: 'Die Marke wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Konnte Marke nicht aktualisieren: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation zum Löschen einer Marke
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/brands/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      toast({
        title: 'Marke gelöscht',
        description: 'Die Marke wurde erfolgreich gelöscht.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Konnte Marke nicht löschen: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleAddSubmit = (data: BrandFormValues) => {
    addBrandMutation.mutate(data);
  };

  const handleEditSubmit = (data: BrandFormValues) => {
    if (selectedBrand) {
      updateBrandMutation.mutate({ id: selectedBrand.id, data });
    }
  };

  const handleEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    editForm.reset({
      deviceTypeId: brand.deviceTypeId.toString(),
      name: brand.name
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBrand) {
      deleteBrandMutation.mutate(selectedBrand.id);
    }
  };

  const handleDeviceTypeChange = (value: string) => {
    setSelectedDeviceType(value === 'all' ? null : value);
  };

  const getDeviceTypeName = (deviceTypeId: number): string => {
    const deviceType = deviceTypes?.find(dt => dt.id === deviceTypeId);
    return deviceType ? deviceType.name : 'Unbekannt';
  };

  if (!deviceTypes) {
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
            <h3 className="text-lg font-semibold">Marken verwalten</h3>
            <p className="text-sm text-muted-foreground">
              {isAdmin 
                ? "Als Administrator können Sie Marken hinzufügen, die von allen Benutzern verwendet werden können."
                : "Die Marken werden zentral verwaltet. Nur Administratoren können Änderungen vornehmen."
              }
            </p>
          </div>
          {isAdmin ? (
            <Button 
              size="sm"
              onClick={() => {
                addForm.reset();
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Hinzufügen
            </Button>
          ) : (
            <Button 
              variant="outline"
              size="sm"
              disabled
            >
              <Lock className="mr-2 h-4 w-4" /> Nur für Administratoren
            </Button>
          )}
        </div>
        
        <div className="mb-4">
          <div className="flex gap-2 items-center">
            <div className="w-64">
              <Select
                value={selectedDeviceType || 'all'}
                onValueChange={handleDeviceTypeChange}
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
            </div>
            {selectedDeviceType && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedDeviceType(null)}>
                Zurücksetzen
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gerätetyp</TableHead>
              <TableHead>Erstellt am</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingBrands ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : brands?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  {selectedDeviceType 
                    ? 'Keine Marken für diesen Gerätetyp gefunden' 
                    : 'Keine Marken gefunden'}
                </TableCell>
              </TableRow>
            ) : (
              brands?.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>{getDeviceTypeName(brand.deviceTypeId)}</TableCell>
                  <TableCell>{new Date(brand.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(brand)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Bearbeiten</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(brand)}
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

      {/* Dialog zum Hinzufügen einer neuen Marke */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Marke hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Marke für Ihre Reparaturen hinzu.
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Apple, Samsung, Xiaomi" {...field} />
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

      {/* Dialog zum Bearbeiten einer Marke */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marke bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen für {selectedBrand?.name}.
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
                <Button type="submit" disabled={updateBrandMutation.isPending}>
                  {updateBrandMutation.isPending ? (
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

      {/* Bestätigungsdialog zum Löschen einer Marke */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marke löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie die Marke "{selectedBrand?.name}" löschen möchten?
              Diese Aktion kann nicht rückgängig gemacht werden und entfernt auch alle zugehörigen Modellreihen und Modelle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteBrandMutation.isPending}
            >
              {deleteBrandMutation.isPending ? (
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