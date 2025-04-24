import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Customer, InsertCustomer, Repair } from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Phone, Mail, User, Calendar } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

const customerSchema = z.object({
  firstName: z.string().min(2, "Vorname muss mindestens 2 Zeichen haben"),
  lastName: z.string().min(2, "Nachname muss mindestens 2 Zeichen haben"),
  phone: z.string().min(5, "Telefonnummer muss mindestens 5 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail").optional().or(z.literal('')).transform(e => e === '' ? null : e),
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
  const { toast } = useToast();
  
  // Load customer details
  const { 
    data: customer, 
    isLoading: isLoadingCustomer 
  } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    queryFn: async () => {
      if (!customerId) return null;
      const response = await fetch(`/api/customers/${customerId}`);
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
      const response = await fetch(`/api/customers/${customerId}/repairs`);
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
      });
      // Invalidate customer queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Kunde konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: CustomerFormValues) {
    updateMutation.mutate(values);
  }
  
  function handleNewOrder() {
    if (customerId && onNewOrder) {
      onNewOrder(customerId);
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
                
                <div className="flex justify-between pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                  >
                    Abbrechen
                  </Button>
                  
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
                  <div key={repair.id} className="border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{repair.brand} {repair.model}</h4>
                        <p className="text-sm text-muted-foreground">{repair.deviceType} | Nr. {repair.id}</p>
                      </div>
                      <div className="text-right">
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
      </DialogContent>
    </Dialog>
  );
}