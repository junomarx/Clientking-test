import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Customer, deviceTypes, repairStatuses, insertRepairSchema } from '@shared/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { PrintOptionsDialog } from './PrintOptionsDialog';
import { PrintRepairDialog } from './PrintRepairDialog';

// Extended repair schema with validation
const repairFormSchema = insertRepairSchema.extend({
  deviceType: z.enum(["smartphone", "tablet", "laptop"], {
    required_error: "Gerätetyp auswählen",
  }),
  brand: z.string().min(2, "Marke muss mindestens 2 Zeichen lang sein"),
  model: z.string().min(1, "Modell muss angegeben werden"),
  issue: z.string().min(5, "Problembeschreibung muss mindestens 5 Zeichen lang sein"),
  estimatedCost: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  notes: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  serialNumber: z.string().optional()
    .transform(val => val === undefined || val === '' ? null : val),
  status: z.enum(["eingegangen", "in_reparatur", "fertig", "abgeholt"]),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

interface NewRepairModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: number | null;
}

export function NewRepairModal({ open, onClose, customerId }: NewRepairModalProps) {
  const { toast } = useToast();
  // Zustandsvariablen
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [createdRepairId, setCreatedRepairId] = useState<number | null>(null);
  const [showReceiptPrintDialog, setShowReceiptPrintDialog] = useState(false);
  const [showLabelPrintDialog, setShowLabelPrintDialog] = useState(false);
  
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
  
  // Setup form
  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      customerId: customerId || 0,
      deviceType: "smartphone",
      brand: "",
      model: "",
      issue: "",
      status: "eingegangen",
      serialNumber: "",
      estimatedCost: undefined,
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
      console.log("Sending repair data (submit):", values);
      const response = await apiRequest('POST', '/api/repairs', values);
      return response.json();
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
      
      // Wichtig: Reihenfolge beachten - erst ID setzen, dann Dialog anzeigen
      setCreatedRepairId(data.id);
      
      // Speichere Modell in localStorage wenn es neu ist
      const formValues = form.getValues(); // Korrekte Werte aus dem Formular erhalten
      if (formValues.brand && formValues.model && formValues.deviceType) {
        const modelKey = `${formValues.deviceType}:${formValues.brand}`;
        const existingModels = JSON.parse(localStorage.getItem('storedModels') || '{}');
        if (!existingModels[modelKey]) {
          existingModels[modelKey] = [];
        }
        if (!existingModels[modelKey].includes(formValues.model)) {
          existingModels[modelKey].push(formValues.model);
          localStorage.setItem('storedModels', JSON.stringify(existingModels));
        }
      }
      
      // Form zurücksetzen
      form.reset();
      
      // Dialog zur Druckoption anzeigen
      setTimeout(() => {
        setShowPrintOptions(true);
      }, 100);
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
  
  // Handler für Druckoptionen
  const handlePrintReceipt = () => {
    setShowPrintOptions(false);
    setShowReceiptPrintDialog(true);
  };
  
  const handlePrintLabel = () => {
    // Für das Etikett nutzen wir denselben Dialog mit einer anderen Ansicht (könnte später angepasst werden)
    setShowPrintOptions(false);
    setShowLabelPrintDialog(true);
  };
  
  function onSubmit(data: RepairFormValues) {
    createMutation.mutate(data);
  }
  
  if (!open) return null;
  
  return (
    <>
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
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Gerätetyp auswählen" />
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
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marke</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. Apple, Samsung, Huawei" {...field} />
                        </FormControl>
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
                </div>
                
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

      {/* Druckoptionen Dialog */}
      <PrintOptionsDialog 
        open={showPrintOptions}
        onClose={() => {
          setShowPrintOptions(false);
          onClose();
        }}
        onPrintReceipt={handlePrintReceipt}
        onPrintLabel={handlePrintLabel}
        repairId={createdRepairId}
      />
      
      {/* Bon Druck Dialog */}
      <PrintRepairDialog
        open={showReceiptPrintDialog}
        onClose={() => {
          setShowReceiptPrintDialog(false);
          onClose();
        }}
        repairId={createdRepairId}
      />
      
      {/* Etikett Druck Dialog - aktuell gleich dem Bon-Dialog */}
      <PrintRepairDialog
        open={showLabelPrintDialog}
        onClose={() => {
          setShowLabelPrintDialog(false);
          onClose();
        }}
        repairId={createdRepairId}
      />
    </>
  );
}