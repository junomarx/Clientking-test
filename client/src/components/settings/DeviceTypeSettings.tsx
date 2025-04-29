import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash, Loader2, Smartphone, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { updateAppleModels } from '@/lib/updateAppleModels';

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

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Schnittstellen für Gerätetyp-Daten
interface DeviceType {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Schema zur Validierung des Formulars
const deviceTypeSchema = z.object({
  name: z.string().min(1, 'Gerätetyp-Name darf nicht leer sein')
});

type DeviceTypeFormValues = z.infer<typeof deviceTypeSchema>;

export function DeviceTypeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);

  // Formular für das Hinzufügen eines neuen Gerätetyps
  const addForm = useForm<DeviceTypeFormValues>({
    resolver: zodResolver(deviceTypeSchema),
    defaultValues: {
      name: ''
    }
  });

  // Formular für das Bearbeiten eines Gerätetyps
  const editForm = useForm<DeviceTypeFormValues>({
    resolver: zodResolver(deviceTypeSchema),
    defaultValues: {
      name: ''
    }
  });

  // Abfrage zum Abrufen aller Gerätetypen
  const { data: deviceTypes, isLoading, error } = useQuery<DeviceType[]>({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/device-types');
      return res.json();
    }
  });

  // Mutation zum Hinzufügen eines neuen Gerätetyps
  const addDeviceTypeMutation = useMutation({
    mutationFn: async (data: DeviceTypeFormValues) => {
      const res = await apiRequest('POST', '/api/device-types', data);
      return res.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      toast({
        title: 'Gerätetyp hinzugefügt',
        description: 'Der neue Gerätetyp wurde erfolgreich gespeichert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Hinzufügen des Gerätetyps: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation zum Aktualisieren eines Gerätetyps
  const updateDeviceTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DeviceTypeFormValues }) => {
      const res = await apiRequest('PATCH', `/api/device-types/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      toast({
        title: 'Gerätetyp aktualisiert',
        description: 'Der Gerätetyp wurde erfolgreich aktualisiert.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren des Gerätetyps: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Mutation zum Löschen eines Gerätetyps
  const deleteDeviceTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/device-types/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedDeviceType(null);
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      toast({
        title: 'Gerätetyp gelöscht',
        description: 'Der Gerätetyp wurde erfolgreich gelöscht.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen des Gerätetyps: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleAddSubmit = (data: DeviceTypeFormValues) => {
    addDeviceTypeMutation.mutate(data);
  };

  const handleEditSubmit = (data: DeviceTypeFormValues) => {
    if (!selectedDeviceType) return;
    updateDeviceTypeMutation.mutate({ id: selectedDeviceType.id, data });
  };

  const handleEdit = (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType);
    editForm.reset({
      name: deviceType.name
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedDeviceType) return;
    deleteDeviceTypeMutation.mutate(selectedDeviceType.id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
        <p>Fehler beim Laden der Gerätetypen: {(error as Error).message}</p>
      </div>
    );
  }

  // Funktion zum Aktualisieren der iPhone-Modelle
  const handleUpdateAppleModels = () => {
    try {
      const result = updateAppleModels();
      toast({
        title: 'iPhone-Modelle aktualisiert',
        description: `${result.oldCount} alte Modelle wurden durch ${result.newCount} aktuelle iPhone-Modelle ersetzt.`,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der iPhone-Modelle: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive'
      });
    }
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Modelle verwalten</CardTitle>
            <CardDescription>Aktualisieren Sie Gerätemarken und -modelle</CardDescription>
          </div>
          <Button
            variant="outline"
            className="ml-auto flex items-center gap-1"
            onClick={handleUpdateAppleModels}
          >
            <Smartphone className="mr-1 h-4 w-4" />
            <RefreshCw className="h-3 w-3" />
            iPhone-Modelle aktualisieren
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Durch Klicken auf den Button werden alle Apple iPhone-Modelle aktualisiert. 
            Dabei werden alle bestehenden iPhone-Modelle durch die aktualisierte Liste ersetzt.
          </p>
          <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded">
            Die Liste enthält alle iPhone-Modelle von iPhone 5 bis iPhone 16, inklusive aller Varianten (mini, Plus, Pro, Pro Max).
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerätetypen verwalten</CardTitle>
            <CardDescription>Hier können Sie Ihre Gerätetypen für Reparaturaufträge verwalten.</CardDescription>
          </div>
          <Button
            className="ml-auto"
            onClick={() => {
              addForm.reset();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Gerätetyp hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceTypes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    Keine Gerätetypen gefunden
                  </TableCell>
                </TableRow>
              )}
              {deviceTypes?.map((deviceType) => (
                <TableRow key={deviceType.id}>
                  <TableCell className="font-medium">{deviceType.name}</TableCell>
                  <TableCell>{new Date(deviceType.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(deviceType)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Bearbeiten</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(deviceType)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Löschen</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog zum Hinzufügen eines neuen Gerätetyps */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Gerätetyp hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie einen neuen Gerätetyp für Ihre Reparaturen hinzu.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Smartphone, Tablet, Laptop" {...field} />
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
                <Button type="submit" disabled={addDeviceTypeMutation.isPending}>
                  {addDeviceTypeMutation.isPending ? (
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

      {/* Dialog zum Bearbeiten eines Gerätetyps */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerätetyp bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen für {selectedDeviceType?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
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
                <Button type="submit" disabled={updateDeviceTypeMutation.isPending}>
                  {updateDeviceTypeMutation.isPending ? (
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

      {/* Bestätigungsdialog zum Löschen eines Gerätetyps */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerätetyp löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Gerätetyp "{selectedDeviceType?.name}" löschen möchten?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteDeviceTypeMutation.isPending}
            >
              {deleteDeviceTypeMutation.isPending ? (
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
