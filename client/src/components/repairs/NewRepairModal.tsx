import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { saveModel, getModelsForDeviceAndBrand, saveBrand, getBrandsForDeviceType } from '@/lib/localStorage';
import { usePrintManager } from '@/components/repairs/PrintOptionsManager';
import { Customer } from '@/lib/types';
import { UserDeviceType, UserBrand, insertRepairSchema } from '@shared/schema';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

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
  customerId?: number;
}

export function NewRepairModal({ open, onClose, customerId }: NewRepairModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showPrintOptions } = usePrintManager();
  
  // Lade Kundeninformationen, falls customerId vorhanden ist
  const { data: customer } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/customers/${customerId}`);
      return response.json();
    },
    enabled: !!customerId && open,
  });
  
  // Wir verwenden hier eine statische, fest codierte Liste für die Gerätetypen
  // Die IDs sind fest vergeben und repräsentieren gängige Werte aus der Datenbank
  
  // State für die ausgewählte Geräteart
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<string>("");
  const [savedBrands, setSavedBrands] = useState<string[]>([]);
  
  // Lade gespeicherte Marken aus localStorage, wenn sich der Gerätetyp ändert
  useEffect(() => {
    if (selectedDeviceTypeId) {
      // Mapping der IDs zu Namen
      const deviceTypeMap: Record<string, string> = {
        "7": "Laptop",
        "8": "Smartphone",
        "9": "Tablet",
        "10": "Watch"
      };
      
      const deviceTypeName = deviceTypeMap[selectedDeviceTypeId];
      if (deviceTypeName) {
        const brands = getBrandsForDeviceType(deviceTypeName);
        setSavedBrands(brands);
      }
    } else {
      setSavedBrands([]);
    }
  }, [selectedDeviceTypeId]);
  
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
      
      console.log("Bereinigte Reparaturdaten werden gesendet:", cleanValues);
      
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
      
      // Speichere Modell in localStorage
      const formValues = form.getValues();
      if (formValues.brand && formValues.model && formValues.deviceType) {
        const { deviceType: deviceTypeId, brand: brandId, model } = formValues;
        
        // Direkte Zuordnung der statischen Gerätetypen
        const deviceTypeMap: Record<string, string> = {
          "7": "Laptop",
          "8": "Smartphone",
          "9": "Tablet",
          "10": "Watch"
        };
        
        const deviceTypeName = deviceTypeMap[deviceTypeId];
        const selectedBrand = brands.find(b => b.id.toString() === brandId);
        
        if (deviceTypeName && selectedBrand) {
          saveModel(deviceTypeName, selectedBrand.name, model);
          console.log(`Modell gespeichert: ${deviceTypeName}:${selectedBrand.name} - ${model}`);
        }
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
    // IDs in Namen umwandeln für den Server
    const deviceTypeId = data.deviceType;
    const brandId = data.brand;
    
    // Direkte Zuordnung der statischen Gerätetypen
    const deviceTypeMap: Record<string, string> = {
      "7": "Laptop",
      "8": "Smartphone",
      "9": "Tablet",
      "10": "Watch"
    };
    
    // Marken über API-Daten ermitteln
    const selectedBrand = brands.find(brand => brand.id.toString() === brandId);
    
    if (deviceTypeMap[deviceTypeId] && selectedBrand) {
      const modifiedData = {
        ...data,
        deviceType: deviceTypeMap[deviceTypeId],
        brand: selectedBrand.name
      };
      
      console.log("Modifizierte Daten für Server:", modifiedData);
      createMutation.mutate(modifiedData);
    } else {
      toast({
        title: "Fehler!",
        description: "Gerätetyp oder Marke konnte nicht gefunden werden.",
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
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedDeviceTypeId(value);
                        form.setValue("brand", ""); // Marke zurücksetzen
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Gerätetyp auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* KOMPLETT STATISCHE LISTE - direkt codiert ohne API-Ladung */}
                        <SelectItem value="7">Laptop</SelectItem>
                        <SelectItem value="8">Smartphone</SelectItem>
                        <SelectItem value="9">Tablet</SelectItem>
                        <SelectItem value="10">Watch</SelectItem>
                      </SelectContent>
                    </Select>
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
                            {...field}
                            disabled={!selectedDeviceTypeId}
                            list="brand-options" 
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
                      {!selectedDeviceTypeId && (
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