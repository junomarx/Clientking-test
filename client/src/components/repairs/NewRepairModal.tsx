import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/lib/types';
import { getBrandsForDeviceType, saveBrand, saveModel } from '@/lib/localStorage';
import { clearAllBrands, clearAllModels, showAllStoredData } from './ClearCacheHelpers';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form schema
const repairFormSchema = z.object({
  customerId: z.number().min(1, { message: 'Bitte Kunden auswählen' }),
  deviceType: z.string().min(1, { message: 'Bitte Gerätetyp eingeben' }),
  brand: z.string().min(1, { message: 'Bitte Marke eingeben' }),
  model: z.string().min(1, { message: 'Bitte Modell eingeben' }),
  serialNumber: z.string().optional().nullable(),
  issue: z.string().min(5, { message: 'Bitte Fehlerbeschreibung eingeben' }),
  estimatedCost: z.string().nullable().optional(),
  depositAmount: z.string().nullable().optional(),
  status: z.enum(['eingegangen', 'in_reparatur', 'ausser_haus', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
  notes: z.string().nullable().optional(),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

interface NewRepairModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: number;
  customer?: Customer;
  showPrintOptions: (repairId: number) => void;
}

export function NewRepairModal({ 
  open, 
  onClose, 
  customerId, 
  customer, 
  showPrintOptions 
}: NewRepairModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State für die ausgewählte Geräteart und gespeicherte Marken
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");
  const [savedBrands, setSavedBrands] = useState<string[]>([]);
  
  // Lade gespeicherte Marken aus localStorage, wenn sich der Gerätetyp ändert
  useEffect(() => {
    if (selectedDeviceType) {
      const brands = getBrandsForDeviceType(selectedDeviceType);
      setSavedBrands(brands);
    } else {
      setSavedBrands([]);
    }
  }, [selectedDeviceType]);
  
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
      // Stelle sicher, dass depositAmount und estimatedCost korrekt übermittelt werden
      const cleanValues = {
        ...values,
        depositAmount: values.depositAmount === "" ? null : values.depositAmount,
        estimatedCost: values.estimatedCost === "" ? null : values.estimatedCost
      };
      
      console.log("Reparaturdaten werden gesendet:", cleanValues);
      
      const response = await apiRequest('POST', '/api/repairs', cleanValues);
      const result = await response.json();
      onClose(); // Dialog schließen
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg!",
        description: "Der Reparaturauftrag wurde erfolgreich erstellt.",
        duration: 2000,
      });
      
      // Invalidiere relevante Queries
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/repairs`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Speichere Marke und Modell in localStorage
      const formValues = form.getValues();
      if (formValues.brand && formValues.model && formValues.deviceType) {
        const { deviceType, brand, model } = formValues;
        
        // Speichere Marke für diesen Gerätetyp
        saveBrand(deviceType, brand);
        // Speichere Modell für diese Marke und Gerätetyp
        saveModel(deviceType, brand, model);
        console.log(`Marke gespeichert: ${deviceType} - ${brand}`);
        console.log(`Modell gespeichert: ${deviceType}:${brand} - ${model}`);
      }
      
      // Druckoptionen anzeigen
      showPrintOptions(data.id);
      
      // Formular zurücksetzen
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Der Reparaturauftrag konnte nicht erstellt werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });
  
  // Wird aufgerufen, wenn das Formular abgeschickt wird
  function onSubmit(data: RepairFormValues) {
    if (data.deviceType) {
      console.log("Formular wird abgeschickt:", data);
      createMutation.mutate(data);
    } else {
      toast({
        title: "Fehler!",
        description: "Bitte geben Sie einen Gerätetyp ein.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }
  
  // Wenn der Dialog nicht geöffnet ist, nichts rendern
  if (!open) return null;
  
  // Prüfen, ob die Kundeninformationen fehlen
  const isCustomerMissing = !customer && customerId;
  
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
              {/* Gerätetyp-Auswahl */}
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="z.B. Smartphone, Tablet, Laptop, Watch" 
                        list="device-type-options"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setSelectedDeviceType(e.target.value);
                          form.setValue("brand", "");
                        }}
                      />
                    </FormControl>
                    <datalist id="device-type-options">
                      <option value="Smartphone" />
                      <option value="Tablet" />
                      <option value="Laptop" />
                      <option value="Watch" />
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Marke und Modell */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marke</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="z.B. Apple, Samsung, Xiaomi" 
                            list="brand-options"
                            {...field}
                            disabled={!selectedDeviceType}
                          />
                          {savedBrands.length > 0 && (
                            <datalist id="brand-options">
                              {savedBrands.map((brand, index) => (
                                <option key={index} value={brand} />
                              ))}
                            </datalist>
                          )}
                        </div>
                      </FormControl>
                      {!selectedDeviceType && (
                        <FormDescription>
                          Bitte zuerst Gerätetyp wählen
                        </FormDescription>
                      )}
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
                        <Input placeholder="z.B. iPhone 13, S22 Ultra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Seriennummer */}
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
              
              {/* Problembeschreibung */}
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
              
              {/* Kostenvoranschlag und Anzahlung */}
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
                      <FormDescription>Eingezahlter Betrag in Euro</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Status */}
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
              
              {/* Notizen */}
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
              
              {/* Cache-Leeren Funktion */}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    clearAllBrands();
                    clearAllModels();
                    setSavedBrands([]);
                    toast({
                      title: "Cache geleert",
                      description: "Alle gespeicherten Marken und Gerätetypen wurden gelöscht.",
                      duration: 2000,
                    });
                  }}
                >
                  Cache leeren
                </Button>
                <span className="text-xs">Gerätetyp: <span className="font-mono">{selectedDeviceType || "keiner ausgewählt"}</span></span>
              </div>
              
              {/* Buttons */}
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