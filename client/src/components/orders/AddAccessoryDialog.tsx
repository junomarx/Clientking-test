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
  // Kundendaten
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  phone: z.string().min(1, "Telefon ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  address: z.string().optional(),
  
  // Gerätedaten
  deviceType: z.string().min(1, "Gerätetyp ist erforderlich"),
  brand: z.string().min(1, "Marke ist erforderlich"),
  model: z.string().min(1, "Modell ist erforderlich"),
  
  // Zubehör
  accessoryType: z.string().min(1, "Zubehörtyp ist erforderlich"),
  accessoryDescription: z.string().min(1, "Beschreibung ist erforderlich"),
  price: z.number().min(0, "Preis muss positiv sein"),
  notes: z.string().optional(),
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
  const [step, setStep] = useState(1); // 1: Kunde, 2: Gerät, 3: Zubehör

  // Kundendaten abrufen für Autovervollständigung
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open,
  });

  // Gerätetypen abrufen
  const { data: deviceTypes = [] } = useQuery<string[]>({
    queryKey: ['/api/device-types'],
    enabled: open && step >= 2,
  });

  // Marken abrufen basierend auf Gerätetyp
  const deviceType = form.watch('deviceType');
  const { data: brands = [] } = useQuery<string[]>({
    queryKey: ['/api/brands', deviceType],
    enabled: open && step >= 2 && !!deviceType,
  });

  const form = useForm<AccessoryFormData>({
    resolver: zodResolver(accessoryFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      deviceType: "",
      brand: "",
      model: "",
      accessoryType: "",
      accessoryDescription: "",
      price: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      form.reset({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
        deviceType: "",
        brand: "",
        model: "",
        accessoryType: "",
        accessoryDescription: "",
        price: 0,
        notes: "",
      });
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AccessoryFormData) => {
      // Erst Kunde erstellen oder finden
      const customerResponse = await apiRequest("POST", "/api/customers", {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
      });
      
      if (!customerResponse.ok) {
        throw new Error("Fehler beim Erstellen des Kunden");
      }
      
      const customer = await customerResponse.json();
      
      // Dann Zubehör-Auftrag als spezielle Reparatur erstellen
      const repairData: InsertRepair = {
        customerId: customer.id,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        issue: `ZUBEHÖR: ${data.accessoryType} - ${data.accessoryDescription}`,
        estimatedCost: data.price,
        status: "eingegangen",
        notes: data.notes || undefined,
      };
      
      const repairResponse = await apiRequest("POST", "/api/repairs", repairData);
      if (!repairResponse.ok) {
        throw new Error("Fehler beim Erstellen des Zubehör-Auftrags");
      }
      
      return repairResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Zubehör-Auftrag erstellt",
        description: "Der Zubehör-Auftrag wurde erfolgreich erstellt.",
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
        return ['firstName', 'lastName', 'phone'];
      case 2:
        return ['deviceType', 'brand', 'model'];
      case 3:
        return ['accessoryType', 'accessoryDescription', 'price'];
      default:
        return [];
    }
  };

  // Kundenauswahl Handler
  const selectCustomer = (customer: Customer) => {
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone);
    form.setValue('email', customer.email || '');
    form.setValue('address', customer.address || '');
  };

  const accessoryTypes = [
    "Hülle/Case",
    "Schutzfolie/Panzerglas",
    "Ladegerät",
    "Kabel",
    "Kopfhörer",
    "Powerbank",
    "Halterung",
    "Reinigungsset",
    "Sonstiges"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Zubehör hinzufügen - Schritt {step} von 3
            {step === 1 && ": Kundendaten"}
            {step === 2 && ": Gerätedaten"}
            {step === 3 && ": Zubehör"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Schritt 1: Kundendaten */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Bestehende Kunden zur Auswahl */}
                {customers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Bestehender Kunde auswählen (optional)</label>
                    <Select onValueChange={(value) => {
                      const customer = customers.find(c => c.id === parseInt(value));
                      if (customer) selectCustomer(customer);
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Bestehenden Kunden auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.firstName} {customer.lastName} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
              </div>
            )}

            {/* Schritt 2: Gerätedaten */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gerätetyp *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Gerätetyp auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deviceTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marke *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Marke auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand} value={brand}>
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
                      <FormLabel>Modell *</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. iPhone 13, Galaxy S21" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Schritt 3: Zubehör */}
            {step === 3 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="accessoryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zubehörtyp *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Zubehörtyp auswählen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accessoryTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="accessoryDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschreibung *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="z.B. Transparente Silikonhülle, Panzerglas mit Blaulichtfilter..." 
                          {...field} 
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
                      <FormLabel>Preis (€) *</FormLabel>
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
                {step < 3 ? (
                  <Button type="button" onClick={nextStep}>
                    Weiter
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Erstelle..." : "Zubehör-Auftrag erstellen"}
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