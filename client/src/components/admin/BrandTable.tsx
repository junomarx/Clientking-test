import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Trash, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Schnittstellendefinitionen
interface DeviceType {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
  deviceTypeId: number;
  createdAt: string;
  updatedAt: string;
}

// Definieren des Zod-Schemas für Brand-Formulare
const brandFormSchema = z.object({
  name: z.string().min(1, { message: "Name ist erforderlich" }),
  deviceTypeId: z.coerce.number().positive({ message: "Gerätetyp ist erforderlich" })
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

export function BrandTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  
  // Formular für das Hinzufügen einer neuen Marke
  const addForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: '',
      deviceTypeId: 0,
    },
  });
  
  // Formular für das Bearbeiten einer Marke
  const editForm = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: '',
      deviceTypeId: 0,
    },
  });
  
  // Query zum Abrufen aller Marken
  const { data: brands, isLoading: isBrandsLoading, error: brandsError } = useQuery<Brand[]>({
    queryKey: ['/api/admin/brands'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/brands');
      return res.json();
    },
  });
  
  // Query zum Abrufen aller Gerätearten (für die Dropdowns)
  const { data: deviceTypes, isLoading: isDeviceTypesLoading } = useQuery<DeviceType[]>({
    queryKey: ['/api/admin/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/device-types');
      return res.json();
    },
  });
  
  // Mutation zum Hinzufügen einer neuen Marke
  const addBrandMutation = useMutation({
    mutationFn: async (data: BrandFormValues) => {
      const res = await apiRequest('POST', '/api/admin/brands', data);
      return res.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      toast({
        title: 'Marke hinzugefügt',
        description: 'Die Marke wurde erfolgreich hinzugefügt.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Hinzufügen der Marke: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation zum Aktualisieren einer Marke
  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BrandFormValues }) => {
      const res = await apiRequest('PATCH', `/api/admin/brands/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      toast({
        title: 'Marke aktualisiert',
        description: 'Die Marke wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der Marke: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation zum Löschen einer Marke
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/brands'] });
      toast({
        title: 'Marke gelöscht',
        description: 'Die Marke wurde erfolgreich gelöscht.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen der Marke: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const handleAddSubmit = (data: BrandFormValues) => {
    addBrandMutation.mutate(data);
  };
  
  const handleEditSubmit = (data: BrandFormValues) => {
    if (!selectedBrand) return;
    updateBrandMutation.mutate({ id: selectedBrand.id, data });
  };
  
  const handleDelete = (brand: Brand) => {
    if (confirm(`Sind Sie sicher, dass Sie die Marke "${brand.name}" löschen möchten?`)) {
      deleteBrandMutation.mutate(brand.id);
    }
  };
  
  const handleEdit = (brand: Brand) => {
    setSelectedBrand(brand);
    editForm.reset({
      name: brand.name,
      deviceTypeId: brand.deviceTypeId,
    });
    setIsEditDialogOpen(true);
  };
  
  // Hilfsfunktion: Findet den Gerätetyp-Namen anhand der ID
  const getDeviceTypeName = (deviceTypeId: number): string => {
    const deviceType = deviceTypes?.find((type) => type.id === deviceTypeId);
    return deviceType?.name || 'Unbekannt';
  };
  
  const isLoading = isBrandsLoading || isDeviceTypesLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (brandsError) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Fehler beim Laden der Marken</AlertTitle>
        <AlertDescription>{(brandsError as Error).message}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Marken verwalten</CardTitle>
            <CardDescription>Hier können Sie Marken hinzufügen, bearbeiten und löschen.</CardDescription>
          </div>
          <Button
            className="ml-auto"
            onClick={() => {
              addForm.reset();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Marke hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Liste aller Marken</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gerätetyp</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead>Aktualisiert am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands?.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>{getDeviceTypeName(brand.deviceTypeId)}</TableCell>
                  <TableCell>{new Date(brand.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(brand.updatedAt).toLocaleDateString()}</TableCell>
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
              ))}
              {brands?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Keine Marken gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Dialog zum Hinzufügen einer neuen Marke */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Marke hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Marke zum System hinzu.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)}>
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Apple" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="deviceTypeId"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
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
              <DialogFooter className="mt-4">
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
                      Wird gespeichert...
                    </>
                  ) : (
                    'Hinzufügen'
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
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)}>
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
              <FormField
                control={editForm.control}
                name="deviceTypeId"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value ? field.value.toString() : undefined}
                      value={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen Sie einen Gerätetyp" />
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
              <DialogFooter className="mt-4">
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
                      Wird aktualisiert...
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
    </>
  );
}