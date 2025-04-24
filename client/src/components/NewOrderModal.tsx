import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Device brands mapping
const deviceBrands: Record<string, string[]> = {
  smartphone: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Google', 'OnePlus', 'Sony'],
  tablet: ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Microsoft', 'Amazon'],
  laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft']
};

// Form schema
const orderFormSchema = z.object({
  // Customer info
  firstName: z.string().min(2, { message: 'Vorname muss mindestens 2 Zeichen lang sein' }),
  lastName: z.string().min(2, { message: 'Nachname muss mindestens 2 Zeichen lang sein' }),
  phone: z.string().min(5, { message: 'Telefonnummer eingeben' }),
  email: z.string().email({ message: 'Gültige E-Mail-Adresse eingeben' }).optional().or(z.literal('')),
  
  // Device info
  deviceType: z.enum(['smartphone', 'tablet', 'laptop'], {
    required_error: 'Bitte Geräteart auswählen',
  }),
  brand: z.string().min(1, { message: 'Bitte Marke auswählen' }),
  model: z.string().min(1, { message: 'Bitte Modell eingeben' }),
  serialNumber: z.string().optional(),
  
  // Issue info
  issue: z.string().min(5, { message: 'Bitte Fehlerbeschreibung eingeben' }),
  estimatedCost: z.coerce.number().optional(),
  status: z.enum(['eingegangen', 'in_reparatur', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewOrderModal({ open, onClose }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  
  // Form definition
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      deviceType: undefined,
      brand: '',
      model: '',
      serialNumber: '',
      issue: '',
      estimatedCost: undefined,
      status: 'eingegangen',
      notes: '',
    },
  });
  
  const watchDeviceType = form.watch('deviceType');
  
  // Update brands based on selected device type
  useEffect(() => {
    if (watchDeviceType) {
      setAvailableBrands(deviceBrands[watchDeviceType] || []);
      form.setValue('brand', '');
    } else {
      setAvailableBrands([]);
    }
  }, [watchDeviceType, form]);
  
  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: { 
      firstName: string; 
      lastName: string; 
      phone: string; 
      email?: string 
    }) => {
      const response = await apiRequest('POST', '/api/customers', data);
      return response.json();
    }
  });
  
  // Create repair mutation
  const createRepairMutation = useMutation({
    mutationFn: async (data: {
      customerId: number;
      deviceType: string;
      brand: string;
      model: string;
      serialNumber?: string;
      issue: string;
      estimatedCost?: number;
      status: string;
      notes?: string;
    }) => {
      const response = await apiRequest('POST', '/api/repairs', data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Close the modal
      handleClose();
      
      // Show success message
      toast({
        title: "Auftrag gespeichert",
        description: "Der Reparaturauftrag wurde erfolgreich angelegt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Speichern",
        description: "Der Auftrag konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      console.error("Error saving order:", error);
    }
  });
  
  const onSubmit = async (data: OrderFormValues) => {
    // First create the customer
    try {
      const customerData = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email
      };
      
      const customer = await createCustomerMutation.mutateAsync(customerData);
      
      // Then create the repair with the customer ID
      const repairData = {
        customerId: customer.id,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        issue: data.issue,
        estimatedCost: data.estimatedCost,
        status: data.status,
        notes: data.notes
      };
      
      await createRepairMutation.mutateAsync(repairData);
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };
  
  const handleClose = () => {
    form.reset();
    onClose();
  };
  
  // Determine if the form is submitting
  const isSubmitting = createCustomerMutation.isPending || createRepairMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">Neuen Auftrag erfassen</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Customer Information Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Kundeninformationen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Vorname" />
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
                        <Input {...field} placeholder="Nachname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Telefonnummer" />
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
                        <Input {...field} placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Device Information Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Geräteinformationen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geräteart</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="-- auswählen --" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="smartphone">Smartphone</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marke</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={availableBrands.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              watchDeviceType 
                                ? "-- Marke wählen --" 
                                : "-- erst Geräteart wählen --"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBrands.map((brand) => (
                            <SelectItem key={brand} value={brand.toLowerCase()}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modell</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="z.B. iPhone 13 Pro" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seriennummer (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Seriennummer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Problem Information Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Problembeschreibung</h3>
              
              <FormField
                control={form.control}
                name="issue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fehlerbeschreibung</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Beschreiben Sie das Problem"
                        className="resize-none min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kostenvoranschlag (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="eingegangen">Eingegangen</SelectItem>
                          <SelectItem value="in_reparatur">In Reparatur</SelectItem>
                          <SelectItem value="fertig">Fertig</SelectItem>
                          <SelectItem value="abgeholt">Abgeholt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notizen (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Interne Notizen"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Speichere...' : 'Auftrag speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
