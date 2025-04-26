import React, { useState } from 'react';
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
  createdAt: string;
  updatedAt: string;
}

// Definieren des Zod-Schemas für DeviceType-Formulare
const deviceTypeFormSchema = z.object({
  name: z.string().min(1, { message: "Name ist erforderlich" })
});

type DeviceTypeFormValues = z.infer<typeof deviceTypeFormSchema>;

export function DeviceTypeTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);

  // Formular für das Hinzufügen einer neuen Geräteart
  const addForm = useForm<DeviceTypeFormValues>({
    resolver: zodResolver(deviceTypeFormSchema),
    defaultValues: {
      name: '',
    },
  });

  // Formular für das Bearbeiten einer Geräteart
  const editForm = useForm<DeviceTypeFormValues>({
    resolver: zodResolver(deviceTypeFormSchema),
    defaultValues: {
      name: '',
    },
  });

  // Query zum Abrufen aller Gerätearten
  const { data: deviceTypes, isLoading, error } = useQuery<DeviceType[]>({
    queryKey: ['/api/admin/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/device-types');
      return res.json();
    },
  });

  // Mutation zum Hinzufügen einer neuen Geräteart
  const addDeviceTypeMutation = useMutation({
    mutationFn: async (data: DeviceTypeFormValues) => {
      const res = await apiRequest('POST', '/api/admin/device-types', data);
      return res.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      addForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-types'] });
      toast({
        title: 'Geräteart hinzugefügt',
        description: 'Die Geräteart wurde erfolgreich hinzugefügt.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Hinzufügen der Geräteart: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation zum Aktualisieren einer Geräteart
  const updateDeviceTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DeviceTypeFormValues }) => {
      const res = await apiRequest('PATCH', `/api/admin/device-types/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-types'] });
      toast({
        title: 'Geräteart aktualisiert',
        description: 'Die Geräteart wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Aktualisieren der Geräteart: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation zum Löschen einer Geräteart
  const deleteDeviceTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/device-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/device-types'] });
      toast({
        title: 'Geräteart gelöscht',
        description: 'Die Geräteart wurde erfolgreich gelöscht.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: `Fehler beim Löschen der Geräteart: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleAddSubmit = (data: DeviceTypeFormValues) => {
    addDeviceTypeMutation.mutate(data);
  };

  const handleEditSubmit = (data: DeviceTypeFormValues) => {
    if (!selectedDeviceType) return;
    updateDeviceTypeMutation.mutate({ id: selectedDeviceType.id, data });
  };

  const handleDelete = (deviceType: DeviceType) => {
    if (confirm(`Sind Sie sicher, dass Sie die Geräteart "${deviceType.name}" löschen möchten?`)) {
      deleteDeviceTypeMutation.mutate(deviceType.id);
    }
  };

  const handleEdit = (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType);
    editForm.reset({
      name: deviceType.name,
    });
    setIsEditDialogOpen(true);
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
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Fehler beim Laden der Gerätearten</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerätearten verwalten</CardTitle>
            <CardDescription>Hier können Sie Gerätearten hinzufügen, bearbeiten und löschen.</CardDescription>
          </div>
          <Button
            className="ml-auto"
            onClick={() => {
              addForm.reset();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Geräteart hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Liste aller Gerätearten</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead>Aktualisiert am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceTypes?.map((deviceType) => (
                <TableRow key={deviceType.id}>
                  <TableCell className="font-medium">{deviceType.name}</TableCell>
                  <TableCell>{new Date(deviceType.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(deviceType.updatedAt).toLocaleDateString()}</TableCell>
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
              {deviceTypes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Keine Gerätearten gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog zum Hinzufügen einer neuen Geräteart */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Geräteart hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie eine neue Geräteart zum System hinzu.
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
                      <Input placeholder="z.B. Smartphone" {...field} />
                    </FormControl>
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
                <Button type="submit" disabled={addDeviceTypeMutation.isPending}>
                  {addDeviceTypeMutation.isPending ? (
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

      {/* Dialog zum Bearbeiten einer Geräteart */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Geräteart bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen für {selectedDeviceType?.name}.
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
              <DialogFooter className="mt-4">
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