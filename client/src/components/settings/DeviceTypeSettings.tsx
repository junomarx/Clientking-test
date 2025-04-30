import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/use-auth';

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

  // Gerätetypen abrufen
  const { data: deviceTypes, isLoading: isLoadingDeviceTypes } = useQuery<DeviceType[]>({
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
        description: 'Der Gerätetyp wurde erfolgreich hinzugefügt.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Konnte Gerätetyp nicht hinzufügen: ${error.message}`,
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
        description: 'Der Gerätetyp wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Konnte Gerätetyp nicht aktualisieren: ${error.message}`,
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
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      toast({
        title: 'Gerätetyp gelöscht',
        description: 'Der Gerätetyp wurde erfolgreich gelöscht.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Konnte Gerätetyp nicht löschen: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleAddSubmit = (data: DeviceTypeFormValues) => {
    addDeviceTypeMutation.mutate(data);
  };

  const handleEditSubmit = (data: DeviceTypeFormValues) => {
    if (selectedDeviceType) {
      updateDeviceTypeMutation.mutate({ id: selectedDeviceType.id, data });
    }
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
    if (selectedDeviceType) {
      deleteDeviceTypeMutation.mutate(selectedDeviceType.id);
    }
  };
  
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Gerätetypen verwalten</h3>
          <p className="text-sm text-muted-foreground">
            Fügen Sie Gerätetypen hinzu, die von allen Benutzern verwendet werden können.
          </p>
        </div>
        <Button 
          onClick={() => {
            addForm.reset();
            setIsAddDialogOpen(true);
          }}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Hinzufügen
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Erstellt am</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingDeviceTypes ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-6">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : deviceTypes?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                Keine Gerätetypen gefunden
              </TableCell>
            </TableRow>
          ) : (
            deviceTypes?.map((deviceType) => (
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
            ))
          )}
        </TableBody>
      </Table>

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