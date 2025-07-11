import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertRepairSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { InsertRepair } from "@shared/schema";
import { z } from "zod";

const accessoryFormSchema = z.object({
  // Auf Lager Checkbox
  inStock: z.boolean(),
  
  // Kundendaten (nur wenn nicht auf Lager)
  customerSearch: z.string().optional(),
  selectedCustomerId: z.number().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  
  // Vereinfachte Artikeldaten
  articleName: z.string().min(1, "Artikel-Name ist erforderlich"),
  quantity: z.number().min(1, "Stückzahl muss mindestens 1 sein"),
  price: z.number().min(0, "Preis muss positiv sein"),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Nur Kundendaten validieren wenn nicht auf Lager
  if (!data.inStock) {
    if (!data.selectedCustomerId && (!data.firstName || !data.lastName || !data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wählen Sie einen Kunden aus oder geben Sie vollständige Kundendaten ein",
        path: ["firstName"],
      });
    }
  }
});

type AccessoryFormData = z.infer<typeof accessoryFormSchema>;

interface AddAccessoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
}

export function AddAccessoryDialog({
  open,
  onOpenChange,
}: AddAccessoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: Kunde/Lager, 2: Artikel
  const [customerSearch, setCustomerSearch] = useState("");

  // Kundendaten abrufen für Autovervollständigung
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open,
  });

  const form = useForm<AccessoryFormData>({
    resolver: zodResolver(accessoryFormSchema),
    defaultValues: {
      inStock: false,
      customerSearch: "",
      selectedCustomerId: undefined,
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      articleName: "",
      quantity: 1,
      price: 0,
      notes: "",
    },
  });

  const inStock = form.watch('inStock');
  const selectedCustomerId = form.watch('selectedCustomerId');

  // Gefilterte Kunden basierend auf Suche
  const filteredCustomers = customers.filter(customer =>
    customerSearch === "" || 
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  useEffect(() => {
    if (open) {
      setStep(1);
      setCustomerSearch("");
      form.reset({
        inStock: false,
        customerSearch: "",
        selectedCustomerId: undefined,
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        articleName: "",
        quantity: 1,
        price: 0,
        notes: "",
      });
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AccessoryFormData) => {
      let customerId: number | null = null;
      
      // Nur wenn nicht auf Lager - Kunde verarbeiten
      if (!data.inStock) {
        if (data.selectedCustomerId) {
          // Bestehender Kunde ausgewählt
          customerId = data.selectedCustomerId;
        } else {
          // Neuen Kunden erstellen
          const customerResponse = await apiRequest("POST", "/api/customers", {
            firstName: data.firstName!,
            lastName: data.lastName!,
            phone: data.phone!,
            email: data.email || undefined,
            address: data.address || undefined,
          });
          
          if (!customerResponse.ok) {
            throw new Error("Fehler beim Erstellen des Kunden");
          }
          
          const customer = await customerResponse.json();
          customerId = customer.id;
        }
      }
      
      // Artikel-Auftrag erstellen
      const issueText = data.inStock 
        ? `LAGER: ${data.articleName} (${data.quantity}x)`
        : `ZUBEHÖR: ${data.articleName} (${data.quantity}x)`;
      
      const repairData: InsertRepair = {
        customerId: customerId,
        deviceType: data.inStock ? "Lager" : "Zubehör",
        brand: "Sonstiges",
        model: data.articleName,
        issue: issueText,
        estimatedCost: data.price * data.quantity,
        status: "eingegangen",
        notes: data.notes || undefined,
      };
      
      const repairResponse = await apiRequest("POST", "/api/repairs", repairData);
      if (!repairResponse.ok) {
        throw new Error("Fehler beim Erstellen des Auftrags");
      }
      
      return repairResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Auftrag erstellt",
        description: form.getValues('inStock') 
          ? "Der Lager-Auftrag wurde erfolgreich erstellt."
          : "Der Zubehör-Auftrag wurde erfolgreich erstellt.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Erstellen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccessoryFormData) => {
    createMutation.mutate(data);
  };

  const nextStep = () => {
    const currentStepFields = getCurrentStepFields();
    form.trigger(currentStepFields).then((isValid) => {
      if (isValid) {
        setStep(step + 1);
      }
    });
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const getCurrentStepFields = (): (keyof AccessoryFormData)[] => {
    switch (step) {
      case 1:
        // Nur Kundendaten prüfen wenn nicht auf Lager
        if (form.getValues('inStock')) {
          return [];
        }
        return selectedCustomerId ? [] : ['firstName', 'lastName', 'phone'];
      case 2:
        return ['articleName', 'quantity', 'price'];
      default:
        return [];
    }
  };

  // Kundenauswahl Handler
  const selectCustomer = (customer: Customer) => {
    form.setValue('selectedCustomerId', customer.id);
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone);
    form.setValue('email', customer.email || '');
    form.setValue('address', customer.address || '');
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
  };

  // Kunde abwählen
  const clearCustomer = () => {
    form.setValue('selectedCustomerId', undefined);
    form.setValue('firstName', '');
    form.setValue('lastName', '');
    form.setValue('phone', '');
    form.setValue('email', '');
    form.setValue('address', '');
    setCustomerSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Auftrag erstellen - Schritt 1 von 2: Kunde / Lager"}
            {step === 2 && "Auftrag erstellen - Schritt 2 von 2: Artikel"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Schritt 1: Kunde/Lager */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Auf Lager Checkbox */}
                <FormField
                  control={form.control}
                  name="inStock"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Für Lager bestellen (kein Kunde erforderlich)</FormLabel>
                        <p className="text-sm text-gray-500">
                          Aktivieren Sie diese Option, um Artikel für das Geschäft zu bestellen
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Kundendaten nur wenn nicht auf Lager */}
                {!inStock && (
                  <>
                    {/* Kundensuche */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kunde suchen</label>
                      <div className="relative">
                        <Input
                          placeholder="Kunde suchen (Name oder Telefon)..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pr-10"
                        />
                        {selectedCustomerId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearCustomer}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      
                      {/* Suchergebnisse */}
                      {customerSearch && !selectedCustomerId && filteredCustomers.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border rounded-md bg-white">
                          {filteredCustomers.slice(0, 5).map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                              <div className="text-sm text-gray-500">{customer.phone}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manuelle Kundendaten-Eingabe */}
                    {!selectedCustomerId && (
                      <>
                        <div className="text-sm font-medium">Oder neue Kundendaten eingeben:</div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vorname *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Max" {...field} />
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
                                <FormLabel>Nachname *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Mustermann" {...field} />
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
                              <FormLabel>Telefon *</FormLabel>
                              <FormControl>
                                <Input placeholder="+43 123 456 789" {...field} />
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
                              <FormLabel>E-Mail</FormLabel>
                              <FormControl>
                                <Input placeholder="max@example.com" {...field} />
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
                              <FormLabel>Adresse</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Musterstraße 1, 1010 Wien" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Schritt 2: Artikel */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="articleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Artikel-Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="z.B. iPhone 8 Hülle schwarz, Samsung Galaxy S21 Panzerglas" 
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
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stückzahl *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="1" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preis pro Stück (€) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="19.99" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
                        </FormControl>
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
                      <FormLabel>Notizen</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Zusätzliche Informationen..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Zurück
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {step < 2 ? (
                  <Button type="button" onClick={nextStep}>
                    Weiter
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Erstelle..." : "Auftrag erstellen"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}