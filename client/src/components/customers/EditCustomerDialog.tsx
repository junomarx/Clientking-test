import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Customer } from '@/lib/types';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { apiRequest, queryClient } from '@/lib/queryClient';

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

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
}

export function EditCustomerDialog({ open, onOpenChange, customerId }: EditCustomerDialogProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Load customer data
  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: open && customerId > 0,
  });
  
  // Setup form
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      zipCode: '',
      city: '',
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
      if (!customer?.id) throw new Error("Kunden-ID fehlt");
      const response = await apiRequest('PATCH', `/api/customers/${customer.id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Kunde aktualisiert",
        description: "Die Kundendaten wurden erfolgreich aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Kunde konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id) throw new Error("Kunden-ID fehlt");
      await apiRequest('DELETE', `/api/customers/${customer.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Kunde gelöscht",
        description: "Der Kunde wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setShowDeleteDialog(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Kunde konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    },
  });

  function onSubmit(values: CustomerFormValues) {
    updateMutation.mutate(values);
  }

  if (!open) return null;
  
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Lade Kundendaten...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Kunde bearbeiten</DialogTitle>
          </DialogHeader>
          
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
              
              <div className="flex justify-between pt-4">
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                  >
                    Abbrechen
                  </Button>
                  
                  {/* Nur Shop-Owner können löschen, Mitarbeiter nicht */}
                  {user?.role !== 'employee' && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  )}
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
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteCustomerMutation.mutate()}
        title="Kunde löschen"
        description={`Möchten Sie wirklich den Kunden "${customer?.firstName} ${customer?.lastName}" löschen? Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Reparaturaufträge werden ebenfalls gelöscht.`}
        isDeleting={deleteCustomerMutation.isPending}
        itemName="Kunde"
      />
    </>
  );
}