import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Customer, 
  repairStatuses, 
  insertRepairSchema, 
  UserDeviceType, 
  UserBrand 
} from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { usePrintManager } from './PrintOptionsManager';
import { saveModel } from '@/lib/localStorage';

// Extended repair schema with validation
const repairFormSchema = insertRepairSchema.extend({
  deviceType: z.string({
    required_error: "Gerätetyp auswählen",
  }),
  brand: z.string().min(1, "Marke muss angegeben werden"),
  model: z.string().min(1, "Modell muss angegeben werden"),
  issue: z.string().min(5, "Problembeschreibung muss mindestens 5 Zeichen lang sein"),
  estimatedCost: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  depositAmount: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  notes: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  serialNumber: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  status: z.enum(["eingegangen", "in_reparatur", "fertig", "abgeholt", "ausser_haus"]),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

interface NewRepairModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: number | null;
}

export function NewRepairModal({ open, onClose, customerId }: NewRepairModalProps) {
  const { toast } = useToast();
  const { showPrintOptions } = usePrintManager();
  
  // Load customer details if customerId is provided
  const { 
    data: customer 
  } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      try {
        const response = await apiRequest('GET', `/api/customers/${customerId}`);
        return response.json();
      } catch (err) {
        console.error("Fehler beim Laden des Kunden:", err);
        return null;
      }
    },
    enabled: !!customerId && open,
  });
  
  // Lade benutzerspezifische Gerätearten
  const { data: deviceTypes = [], isLoading: isLoadingDeviceTypes } = useQuery<UserDeviceType[]>({
    queryKey: ['/api/device-types'],
    enabled: open,
  });
  
  // State für die ausgewählte Geräteart
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<string>("");
  
  // Lade Marken basierend auf dem ausgewählten Gerätetyp
  const { 
    data: brands = [], 
    isLoading: isLoadingBrands 
  } = useQuery<UserBrand[]>({
    queryKey: ['/api/brands', selectedDeviceTypeId ? { deviceTypeId: selectedDeviceTypeId } : undefined],
    queryFn: async () => {
      if (!selectedDeviceTypeId) return [];
      
      try {
        const response = await apiRequest('GET', `/api/brands?deviceTypeId=${selectedDeviceTypeId}`);
        return response.json();
      } catch (err) {
        console.error('Fehler beim Laden der Marken:', err);
        return [];
      }
    },
    enabled: open && !!selectedDeviceTypeId,
  });
  
  // Setup form
  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      customerId: customerId || 0,
      deviceType: "",
      brand: "",
      model: "",
      issue: "",
      status: "eingegangen",
      serialNumber: "",
      estimatedCost: "",
      depositAmount: "",
      notes: "",
    },
  });
  
  // Update customerId in form when it changes
  useEffect(() => {
    if (customerId) {
      form.setValue("customerId", customerId);
    }
  }, [customerId, form]);
  
  // Create repair mutation
  const createMutation = useMutation({
    mutationFn: async (values: RepairFormValues) => {
      // Für Debugging-Zwecke die Daten anzeigen
      console.log("Sending repair data (submit):", values);
      
      // Stelle sicher, dass depositAmount und estimatedCost korrekt übermittelt werden
      const cleanValues = {
        ...values,
        // Wenn depositAmount oder estimatedCost leer sind, setze sie auf null
        depositAmount: values.depositAmount === "" ? null : values.depositAmount,
        estimatedCost: values.estimatedCost === "" ? null : values.estimatedCost
      };
      
      console.log("Clean values being sent:", cleanValues);
      
      const response = await apiRequest('POST', '/api/repairs', cleanValues);
      const result = await response.json();
      // Hauptdialog schließen, damit der Druckdialog sichtbar wird
      onClose();
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Reparaturauftrag erstellt",
        description: "Der Reparaturauftrag wurde erfolgreich erstellt.",
      });
      // Invalidate customer repairs query
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/repairs`] });
      }
      // Invalidate repairs query
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      // Invalidate stats query
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      console.log("Erstellt mit ID:", data.id);
      
      // Speichere Modell in localStorage wenn es neu ist
      const formValues = form.getValues(); // Korrekte Werte aus dem Formular erhalten
      if (formValues.brand && formValues.model && formValues.deviceType) {
        const { deviceType: deviceTypeId, brand, model } = formValues;
        // Finde den Gerätetyp-Namen anhand der ID
        const selectedDeviceType = deviceTypes.find(type => type.id.toString() === deviceTypeId);
        if (selectedDeviceType) {
          // Speichere das Modell mit dem Namen des Gerätetyps statt der ID
          saveModel(selectedDeviceType.name, brand, model);
          console.log(`Modell gespeichert: ${selectedDeviceType.name}:${brand} - ${model}`);
        }
      }
      
      // Druckoptionen über den PrintManager anzeigen
      showPrintOptions(data.id);
      console.log("Druckoptionen über PrintManager angezeigt für ID:", data.id);
      
      // Form zurücksetzen
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: `Reparaturauftrag konnte nicht erstellt werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // If no customer is selected or loaded and customerId is required
  const isCustomerMissing = !customer && customerId;
  
  function onSubmit(data: RepairFormValues) {
    createMutation.mutate(data);
  }
  
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Neuer Reparaturauftrag</DialogTitle>
          <DialogDescription>
            {customer ? (
              <span>Neuen Reparaturauftrag für <strong>{customer.firstName} {customer.lastName}</strong> erstellen</span>
            ) : (
              "Details für den neuen Reparaturauftrag eingeben"
            )}
          </DialogDescription>
        </DialogHeader>
        
        {isCustomerMissing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedDeviceTypeId(value);
                        form.setValue("brand", ""); // Zurücksetzen der Marke bei Änderung der Geräteart
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Gerätetyp auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deviceTypes.length > 0 ? (
                          deviceTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>Keine Gerätearten verfügbar</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marke</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedDeviceTypeId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Marke auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.length > 0 ? (
                            brands.map((brand: UserBrand) => (
                              <SelectItem key={brand.id} value={brand.name}>
                                {brand.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              {!selectedDeviceTypeId ? "Bitte zuerst Gerätetyp wählen" : "Keine Marken verfügbar"}
                            </SelectItem>
                          )}
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
                        <Input placeholder="z.B. iPhone 13, Galaxy S21" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seriennummer (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Seriennummer oder IMEI" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="issue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problembeschreibung</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Beschreiben Sie das Problem mit dem Gerät" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kostenvoranschlag (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="z.B. 150 oder 150-180" 
                          {...field}
                          value={field.value === null || field.value === undefined ? '' : field.value}
                        />
                      </FormControl>
                      <FormDescription>Geschätzte Kosten in Euro</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anzahlung (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="z.B. 50" 
                          {...field}
                          value={field.value === null || field.value === undefined ? '' : field.value}
                        />
                      </FormControl>
                      <FormDescription>Gerät beim Kunden, wenn ausgefüllt</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                        <SelectItem value="ausser_haus">Außer Haus</SelectItem>
                        <SelectItem value="fertig">Fertig</SelectItem>
                        <SelectItem value="abgeholt">Abgeholt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notizen (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Interne Notizen zur Reparatur" 
                        className="min-h-[80px]"
                        {...field}
                        value={field.value || ''}
                      />
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
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Erstellen...
                    </>
                  ) : (
                    "Reparaturauftrag erstellen"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}