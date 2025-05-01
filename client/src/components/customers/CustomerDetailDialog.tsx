import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Customer as SchemaCustomer, InsertCustomer } from '@shared/schema';
import { Customer, Repair } from '@/lib/types';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Phone, Mail, User, Calendar, Pencil, Trash2 } from 'lucide-react';
import { EditRepairDialog } from '@/components/repairs/EditRepairDialog';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

const customerSchema = z.object({
  firstName: z.string().min(2, "Vorname muss mindestens 2 Zeichen haben"),
  lastName: z.string().min(2, "Nachname muss mindestens 2 Zeichen haben"),
  phone: z.string().min(5, "Telefonnummer muss mindestens 5 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail").optional().or(z.literal('')).transform(e => e === '' ? null : e),
  address: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDetailDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: number | null;
  onNewOrder?: (customerId: number) => void;
}

export function CustomerDetailDialog({ open, onClose, customerId, onNewOrder }: CustomerDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [editRepairId, setEditRepairId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [showDeleteRepairDialog, setShowDeleteRepairDialog] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Load customer details
  const { 
    data: customer, 
    isLoading: isLoadingCustomer 
  } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    queryFn: async () => {
      if (!customerId) return null;
      const response = await fetch(`/api/customers/${customerId}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Kunde konnte nicht geladen werden");
      return response.json();
    },
    enabled: !!customerId && open,
  });
  
  // Load customer repairs
  const { 
    data: repairs, 
    isLoading: isLoadingRepairs 
  } = useQuery<Repair[]>({
    queryKey: [`/api/customers/${customerId}/repairs`],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await fetch(`/api/customers/${customerId}/repairs`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error("Reparaturen konnten nicht geladen werden");
      return response.json();
    },
    enabled: !!customerId && open,
  });
  
  // Setup form
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    },
  });
  
  // Update form values when customer data is loaded
  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        zipCode: customer.zipCode || '',
        city: customer.city || '',
      });
    }
  }, [customer, form]);
  
  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      if (!customerId) throw new Error("Kunden-ID fehlt");
      const response = await apiRequest('PATCH', `/api/customers/${customerId}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Kunde aktualisiert",
        description: "Die Kundendaten wurden erfolgreich aktualisiert.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      // Invalidate customer queries to refresh data
      onClose(); // Dialog schließen
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Kunde konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
    },
  });
  
  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Kunden-ID fehlt");
      await apiRequest('DELETE', `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      toast({
        title: "Kunde gelöscht",
        description: "Der Kunde wurde erfolgreich gelöscht.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Kunde konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
    },
  });
  
  // Delete repair mutation
  const deleteRepairMutation = useMutation({
    mutationFn: async () => {
      if (!repairToDelete) throw new Error("Reparatur-ID fehlt");
      await apiRequest('DELETE', `/api/repairs/${repairToDelete}`);
    },
    onSuccess: () => {
      toast({
        title: "Reparatur gelöscht",
        description: "Die Reparatur wurde erfolgreich gelöscht.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/repairs`] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      setShowDeleteRepairDialog(false);
      setRepairToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Reparatur konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
    },
  });
  
  function onSubmit(values: CustomerFormValues) {
    updateMutation.mutate(values);
  }
  
  function handleNewOrder() {
    if (customer && onNewOrder) {
      console.log("CustomerDetailDialog: onNewOrder aufgerufen mit Kunde:", customer);
      
      // Statt nur die ID zu übergeben, übergeben wir das gesamte Kundenobjekt als String
      // Dies ist ein Workaround, da wir Probleme mit der ID-Übergabe haben
      const customerDataString = JSON.stringify(customer);
      localStorage.setItem('selectedCustomerData', customerDataString);
      
      onNewOrder(customer.id);
      onClose();
    }
  }
  
  const isLoading = isLoadingCustomer || isLoadingRepairs;
  
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                Kunde wird geladen...
              </span>
            ) : (
              <span>Kunde: {customer?.firstName} {customer?.lastName}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Kundendetails ansehen und bearbeiten
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="repairs">Reparaturen ({repairs?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input placeholder="Vorname" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input placeholder="Nachname" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefonnummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="E-Mail" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Straße und Hausnummer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PLZ (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Postleitzahl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ort (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Stadt" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose}
                    >
                      Abbrechen
                    </Button>
                    
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteCustomerDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      "Speichern"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="repairs" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Reparaturaufträge</h3>
              <Button onClick={handleNewOrder} className="flex items-center">
                <Plus className="mr-1 h-4 w-4" /> Neuer Auftrag
              </Button>
            </div>
            
            {isLoadingRepairs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : repairs && repairs.length > 0 ? (
              <div className="space-y-3">
                {repairs.map((repair) => (
                  <div key={repair.id} 
                    className="border rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all"
                    onClick={() => {
                      // Navigate to repairs page with orderCode filter
                      if (repair.orderCode) {
                        onClose(); // Close customer dialog first
                        setTimeout(() => {
                          navigate('/?tab=repairs&search=' + repair.orderCode);
                        }, 100); // Small delay to allow dialog to close
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{repair.brand} {repair.model}</h4>
                        <p className="text-sm text-muted-foreground">{repair.deviceType} | Nr. {repair.id}</p>
                      </div>
                      <div className="text-right flex items-center">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 mr-1 hover:bg-slate-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRepairToDelete(repair.id);
                            setShowDeleteRepairDialog(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 mr-2 hover:bg-slate-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditRepairId(repair.id);
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          repair.status === 'eingegangen' ? 'bg-blue-100 text-blue-800' :
                          repair.status === 'in_reparatur' ? 'bg-amber-100 text-amber-800' :
                          repair.status === 'fertig' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {repair.status === 'eingegangen' ? 'Eingegangen' :
                           repair.status === 'in_reparatur' ? 'In Reparatur' :
                           repair.status === 'fertig' ? 'Fertig' :
                           repair.status === 'abgeholt' ? 'Abgeholt' : repair.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="mt-2 text-sm">{repair.issue}</p>
                    
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(repair.createdAt), 'dd.MM.yyyy')}
                        </span>
                        <span className="flex items-center">
                          {repair.estimatedCost !== null && repair.estimatedCost !== '' && (
                            <>Kostenvoranschlag: {repair.estimatedCost}€</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg">
                <p className="text-muted-foreground">Keine Reparaturaufträge gefunden</p>
                <Button 
                  onClick={handleNewOrder} 
                  variant="outline" 
                  className="mt-2"
                >
                  Ersten Auftrag erstellen
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Repair Edit Dialog */}
        {showEditDialog && (
          <EditRepairDialog
            open={showEditDialog}
            onClose={() => setShowEditDialog(false)}
            repair={repairs?.find(r => r.id === editRepairId) || null}
          />
        )}

        {/* Customer Delete Confirmation */}
        <DeleteConfirmDialog
          open={showDeleteCustomerDialog}
          onClose={() => setShowDeleteCustomerDialog(false)}
          onConfirm={() => deleteCustomerMutation.mutate()}
          title="Kunde löschen"
          description={`Möchten Sie wirklich den Kunden "${customer?.firstName} ${customer?.lastName}" löschen? Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Reparaturaufträge werden ebenfalls gelöscht.`}
          isDeleting={deleteCustomerMutation.isPending}
          itemName="Kunde"
        />

        {/* Repair Delete Confirmation */}
        <DeleteConfirmDialog
          open={showDeleteRepairDialog}
          onClose={() => setShowDeleteRepairDialog(false)}
          onConfirm={() => deleteRepairMutation.mutate()}
          title="Reparatur löschen"
          description={`Möchten Sie wirklich die Reparatur #${repairToDelete} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
          isDeleting={deleteRepairMutation.isPending}
          itemName="Reparatur"
        />
      </DialogContent>
    </Dialog>
  );
}