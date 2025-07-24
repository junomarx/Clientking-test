import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tablet, Plus, Edit, Trash2, CheckCircle, AlertCircle, Smartphone, Laptop, Watch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { RepairDetailsDialog } from '@/components/repairs/RepairDetailsDialog';

// Schema für Leihgeräte-Formulare
const loanerDeviceSchema = z.object({
  deviceType: z.enum(['smartphone', 'tablet', 'laptop', 'smartwatch']),
  brand: z.string().min(1, 'Hersteller ist erforderlich'),
  model: z.string().min(1, 'Modell ist erforderlich'),
  imei: z.string().optional(),
  condition: z.enum(['sehr_gut', 'gut', 'befriedigend', 'mangelhaft']),
  notes: z.string().optional(),
});

type LoanerDeviceFormData = z.infer<typeof loanerDeviceSchema>;

interface LoanerDevice {
  id: number;
  deviceType: string;
  brand: string;
  model: string;
  imei?: string;
  condition: string;
  status: 'verfügbar' | 'verliehen';
  notes?: string;
  shopId: number;
  createdAt: string;
  updatedAt: string;
  // Erweiterte Felder für Zuordnungsinformationen
  assignedRepairId?: number;
  assignedOrderCode?: string;
  assignedCustomerName?: string;
}

const deviceTypeLabels = {
  smartphone: 'Smartphone',
  tablet: 'Tablet',
  laptop: 'Laptop',
  smartwatch: 'Smartwatch'
};

const conditionLabels = {
  sehr_gut: 'Sehr gut',
  gut: 'Gut',
  befriedigend: 'Befriedigend',
  mangelhaft: 'Mangelhaft'
};

const statusLabels = {
  verfügbar: 'Verfügbar',
  verliehen: 'Verliehen'
};

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'smartphone': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    case 'laptop': return <Laptop className="h-4 w-4" />;
    case 'smartwatch': return <Watch className="h-4 w-4" />;
    default: return <Tablet className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verfügbar':
      return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verfügbar</Badge>;
    case 'verliehen':
      return <Badge variant="outline" className="text-orange-600 border-orange-600"><AlertCircle className="h-3 w-3 mr-1" />Verliehen</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getConditionBadge = (condition: string) => {
  const colorMap = {
    sehr_gut: 'text-green-600 border-green-600',
    gut: 'text-blue-600 border-blue-600',
    befriedigend: 'text-yellow-600 border-yellow-600',
    mangelhaft: 'text-red-600 border-red-600'
  };
  
  return (
    <Badge variant="outline" className={colorMap[condition as keyof typeof colorMap] || ''}>
      {conditionLabels[condition as keyof typeof conditionLabels] || condition}
    </Badge>
  );
};

export function LoanerDevicesTab() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<LoanerDevice | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'verfügbar' | 'verliehen'>('all');
  const [filterDeviceType, setFilterDeviceType] = useState<'all' | 'smartphone' | 'tablet' | 'laptop' | 'smartwatch'>('all');
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);

  // Leihgeräte abrufen
  const { data: loanerDevices = [], isLoading } = useQuery<LoanerDevice[]>({
    queryKey: ['/api/loaner-devices'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/loaner-devices');
      return response.json();
    },
  });

  // Create Form
  const createForm = useForm<LoanerDeviceFormData>({
    resolver: zodResolver(loanerDeviceSchema),
    defaultValues: {
      deviceType: 'smartphone',
      brand: '',
      model: '',
      imei: '',
      condition: 'gut',
      notes: '',
    },
  });

  // Edit Form
  const editForm = useForm<LoanerDeviceFormData>({
    resolver: zodResolver(loanerDeviceSchema),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: LoanerDeviceFormData) => {
      const response = await apiRequest('POST', '/api/loaner-devices', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: 'Erfolg',
        description: 'Leihgerät wurde erfolgreich erstellt.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LoanerDeviceFormData> }) => {
      const response = await apiRequest('PATCH', `/api/loaner-devices/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
      setEditingDevice(null);
      editForm.reset();
      toast({
        title: 'Erfolg',
        description: 'Leihgerät wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/loaner-devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loaner-devices'] });
      toast({
        title: 'Erfolg',
        description: 'Leihgerät wurde erfolgreich gelöscht.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreate = (data: LoanerDeviceFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (device: LoanerDevice) => {
    setEditingDevice(device);
    editForm.reset({
      deviceType: device.deviceType as any,
      brand: device.brand,
      model: device.model,
      imei: device.imei || '',
      condition: device.condition as any,
      notes: device.notes || '',
    });
  };

  const handleUpdate = (data: LoanerDeviceFormData) => {
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Sind Sie sicher, dass Sie dieses Leihgerät löschen möchten?')) {
      deleteMutation.mutate(id);
    }
  };

  // Gefilterte Geräte
  const filteredDevices = loanerDevices.filter(device => {
    const statusMatch = filterStatus === 'all' || device.status === filterStatus;
    const typeMatch = filterDeviceType === 'all' || device.deviceType === filterDeviceType;
    return statusMatch && typeMatch;
  });

  // Statistiken
  const availableDevices = loanerDevices.filter(d => d.status === 'verfügbar').length;
  const loanedDevices = loanerDevices.filter(d => d.status === 'verliehen').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leihgeräte-Verwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Leihgeräte für Kunden während der Reparatur</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              Neues Leihgerät
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Neues Leihgerät hinzufügen</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gerätetyp</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Gerätetyp auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="smartphone">Smartphone</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                          <SelectItem value="smartwatch">Smartwatch</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hersteller</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Samsung, Apple, Huawei" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modell</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Galaxy S21, iPhone 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="imei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMEI (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="IMEI-Nummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zustand</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Zustand auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sehr_gut">Sehr gut</SelectItem>
                          <SelectItem value="gut">Gut</SelectItem>
                          <SelectItem value="befriedigend">Befriedigend</SelectItem>
                          <SelectItem value="mangelhaft">Mangelhaft</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notizen (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Zusätzliche Informationen zum Gerät..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <Tablet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loanerDevices.length}</div>
            <p className="text-xs text-muted-foreground">Leihgeräte insgesamt</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verfügbar</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableDevices}</div>
            <p className="text-xs text-muted-foreground">Bereit für Verleih</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verliehen</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{loanedDevices}</div>
            <p className="text-xs text-muted-foreground">Bei Kunden</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'verfügbar' | 'verliehen')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="verfügbar">Verfügbar</SelectItem>
                  <SelectItem value="verliehen">Verliehen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Gerätetyp</label>
              <Select value={filterDeviceType} onValueChange={(value) => setFilterDeviceType(value as 'all' | 'smartphone' | 'tablet' | 'laptop' | 'smartwatch')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="smartphone">Smartphone</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="smartwatch">Smartwatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Leihgeräte ({filteredDevices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Lade Leihgeräte...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Leihgeräte gefunden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead>Hersteller</TableHead>
                    <TableHead>Modell</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Zustand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zugeordnet zu</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.deviceType)}
                          <span>{deviceTypeLabels[device.deviceType as keyof typeof deviceTypeLabels] || device.deviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{device.brand}</TableCell>
                      <TableCell>{device.model}</TableCell>
                      <TableCell className="font-mono text-sm">{device.imei || '-'}</TableCell>
                      <TableCell>{getConditionBadge(device.condition)}</TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell>
                        {device.assignedOrderCode ? (
                          <div className="space-y-1">
                            <div 
                              className="font-medium text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline"
                              onClick={() => setSelectedRepairId(device.assignedRepairId!)}
                            >
                              #{device.assignedOrderCode}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {device.assignedCustomerName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nicht zugeordnet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(device)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(device.id)}
                            disabled={device.status === 'verliehen'}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={() => setEditingDevice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leihgerät bearbeiten</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Gerätetyp auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="smartphone">Smartphone</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                        <SelectItem value="laptop">Laptop</SelectItem>
                        <SelectItem value="smartwatch">Smartwatch</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hersteller</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Samsung, Apple, Huawei" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modell</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Galaxy S21, iPhone 12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="imei"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMEI (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="IMEI-Nummer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zustand</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Zustand auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sehr_gut">Sehr gut</SelectItem>
                        <SelectItem value="gut">Gut</SelectItem>
                        <SelectItem value="befriedigend">Befriedigend</SelectItem>
                        <SelectItem value="mangelhaft">Mangelhaft</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notizen (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Zusätzliche Informationen zum Gerät..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingDevice(null)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Speichere...' : 'Speichern'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* RepairDetailsDialog für Auftrag-Links */}
      {selectedRepairId && (
        <RepairDetailsDialog
          repairId={selectedRepairId}
          open={!!selectedRepairId}
          onClose={() => setSelectedRepairId(null)}
        />
      )}
    </div>
  );
}