import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash, Euro, UserPlus } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Schema für einen einzelnen Posten im Kostenvoranschlag
const estimateItemSchema = z.object({
  position: z.number().min(1, "Position muss mindestens 1 sein"),
  description: z.string().min(1, "Beschreibung ist erforderlich"),
  quantity: z.number().min(1, "Menge muss mindestens 1 sein"),
  unitPrice: z.string().min(1, "Einzelpreis ist erforderlich"),
  totalPrice: z.string().min(1, "Gesamtpreis ist erforderlich"),
});

// Schema für den gesamten Kostenvoranschlag
const formSchema = z.object({
  customerId: z.number({
    required_error: "Bitte wählen Sie einen Kunden aus",
  }),
  title: z.string().min(1, "Titel ist erforderlich"),
  description: z.string().optional(),
  deviceType: z.string().min(1, "Gerätetyp ist erforderlich"),
  brand: z.string().min(1, "Hersteller ist erforderlich"),
  model: z.string().min(1, "Modell ist erforderlich"),
  serialNumber: z.string().optional(),
  issue: z.string().optional(),
  taxRate: z.string().default("20"),
  validUntil: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(estimateItemSchema).min(1, "Mindestens ein Posten ist erforderlich"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCostEstimateFormProps {
  onSuccess?: () => void;
}

// Schema für einen neuen Kunden
const newCustomerSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail ein").optional().or(z.literal("")),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
  address: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export default function CreateCostEstimateForm({ onSuccess }: CreateCostEstimateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  
  // Query für Kunden
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Kunden');
      }
      return response.json();
    }
  });
  
  // Formular für neuen Kunden
  const customerForm = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      zipCode: "",
      city: "",
      notes: "",
    },
  });
  
  // Mutation zum Erstellen eines neuen Kunden
  const createCustomerMutation = useMutation({
    mutationFn: async (data: NewCustomerFormValues) => {
      const response = await apiRequest("POST", "/api/customers", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Erstellen des Kunden");
      }
      return response.json();
    },
    onSuccess: (newCustomer) => {
      toast({
        title: "Erfolg",
        description: "Kunde wurde erfolgreich erstellt"
      });
      customerForm.reset();
      setIsNewCustomerDialogOpen(false);
      
      // Kundenliste aktualisieren und dann den neuen Kunden auswählen
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] })
        .then(() => {
          // Warten bis die Abfrage abgeschlossen ist und dann den Kunden auswählen
          setTimeout(() => {
            form.setValue("customerId", newCustomer.id);
          }, 100);
        });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Standard-Gültigkeitsdatum (14 Tage ab heute)
  const defaultValidUntil = addDays(new Date(), 14);
  
  // Formular mit Validierung initialisieren
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "Kostenvoranschlag",
      description: "",
      deviceType: "",
      brand: "",
      model: "",
      serialNumber: "",
      issue: "",
      taxRate: "20",
      validUntil: defaultValidUntil,
      notes: "",
      items: [
        {
          position: 1,
          description: "Reparatur",
          quantity: 1,
          unitPrice: "0,00 €",
          totalPrice: "0,00 €",
        }
      ],
    },
  });
  
  // Field Array für Positionen im Kostenvoranschlag
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Hilfsfunktion zum Formatieren eines Preises
  const formatPrice = (price: string): string => {
    // Entferne alle Zeichen außer Zahlen und Kommas
    const cleanedPrice = price.replace(/[^\d,]/g, '');
    
    // Ersetze Komma durch Punkt für die Berechnung
    const numericPrice = parseFloat(cleanedPrice.replace(',', '.'));
    
    // Formatiere als Preis mit 2 Dezimalstellen und € Zeichen
    return isNaN(numericPrice) ? '0,00 €' : numericPrice.toFixed(2).replace('.', ',') + ' €';
  };
  
  // Berechne die Gesamtpreise automatisch, wenn sich die Menge oder der Einzelpreis ändert
  const updateTotalPrice = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    
    // Entferne alle Zeichen außer Zahlen und Kommas
    const unitPriceStr = item.unitPrice.replace(/[^\d,]/g, '');
    const unitPrice = parseFloat(unitPriceStr.replace(',', '.'));
    const quantity = item.quantity;
    
    if (!isNaN(unitPrice) && quantity) {
      const totalPrice = (unitPrice * quantity).toFixed(2).replace('.', ',') + ' €';
      form.setValue(`items.${index}.totalPrice`, totalPrice);
    }
  };
  
  // Datum als ISO-String formatieren für die API
  const formatDate = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    // Als ISO-String zurückgeben
    return date.toISOString();
  };
  
  // Mutation zum Erstellen eines Kostenvoranschlags
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Transformiere das validUntil-Feld zu einem String für die API
      const apiData = {
        ...data,
        validUntil: data.validUntil ? formatDate(data.validUntil) : undefined
      };
      
      const response = await apiRequest("POST", "/api/cost-estimates", apiData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Erstellen des Kostenvoranschlags");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Kostenvoranschlag wurde erfolgreich erstellt"
      });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Berechne alle Preise für den Kostenvoranschlag
  const calculateTotals = (data: FormValues) => {
    // Stelle sicher, dass alle Preise korrekt formatiert sind
    const items = data.items.map(item => ({
      ...item,
      unitPrice: formatPrice(item.unitPrice),
      totalPrice: formatPrice(item.totalPrice),
    }));
    
    // Extrahiere alle Preise aus den Positionen
    const itemPrices = items.map(item => {
      const priceStr = item.totalPrice.replace(/[^\d,]/g, '');
      return parseFloat(priceStr.replace(',', '.'));
    });
    
    // Berechne die Zwischensumme
    const subtotalValue = itemPrices.reduce((sum, price) => sum + (isNaN(price) ? 0 : price), 0);
    const subtotal = subtotalValue.toFixed(2).replace('.', ',') + ' €';
    
    // Berechne die MwSt
    const taxRateValue = parseFloat(data.taxRate);
    const taxAmountValue = subtotalValue * (taxRateValue / 100);
    const taxAmount = taxAmountValue.toFixed(2).replace('.', ',') + ' €';
    
    // Berechne die Gesamtsumme
    const totalValue = subtotalValue + taxAmountValue;
    const total = totalValue.toFixed(2).replace('.', ',') + ' €';
    
    return {
      items,
      subtotal,
      taxAmount,
      total
    };
  };
  
  // Formular absenden
  const onSubmit = (data: FormValues) => {
    // Berechne alle Preise
    const { items, subtotal, taxAmount, total } = calculateTotals(data);
    
    // Bereite die Daten für das Absenden vor
    const formattedData = {
      ...data,
      // Wir behalten das Date-Objekt, damit der Typ übereinstimmt
      items,
      subtotal,
      taxAmount,
      total
    };
    
    createMutation.mutate(formattedData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto p-5">
        <h1 className="text-center text-2xl font-bold text-[#2c3e50] mb-8">Kostenvoranschlag Generator</h1>

        {/* Kundendaten */}
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#2c3e50] border-b border-[#ddd] pb-2 mb-5">Kundendaten</h2>
          
          <div className="flex flex-row mb-4">
            <div className="flex-1 mr-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block font-bold mb-1 text-sm">Kunde*</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full rounded-md border-[#ddd] shadow-none">
                          <SelectValue placeholder="Kunden auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.firstName} {customer.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-end">
              <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default" 
                    className="bg-[#3498db] hover:bg-[#2980b9] rounded-md h-10"
                    type="button" 
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    <span>Neuer Kunde</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Neuen Kunden erstellen</DialogTitle>
                    <DialogDescription>
                      Geben Sie die Details des neuen Kunden ein. Felder mit * sind Pflichtfelder.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...customerForm}>
                    <form onSubmit={customerForm.handleSubmit((data) => createCustomerMutation.mutate(data))} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={customerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Vorname *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#ddd] rounded-md" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Nachname *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#ddd] rounded-md" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={customerForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">Adresse *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Musterstraße 10" className="border-[#ddd] rounded-md" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={customerForm.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">PLZ *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#ddd] rounded-md" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Ort *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#ddd] rounded-md" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={customerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Telefonnummer *</FormLabel>
                              <FormControl>
                                <Input {...field} className="border-[#ddd] rounded-md" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">E-Mail *</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" className="border-[#ddd] rounded-md" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          className="bg-[#e74c3c] hover:bg-[#c0392b]"
                          onClick={() => setIsNewCustomerDialogOpen(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createCustomerMutation.isPending}
                          className="bg-[#2ecc71] hover:bg-[#27ae60]"
                        >
                          {createCustomerMutation.isPending ? "Wird erstellt..." : "Kunde erstellen"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel className="block font-bold mb-1 text-sm">Gültig bis*</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="w-full flex justify-start text-left font-normal border-[#ddd] rounded-md"
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: de })
                        ) : (
                          <span>Datum wählen</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Gerätedaten */}
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#2c3e50] border-b border-[#ddd] pb-2 mb-5">Gerätedaten</h2>
          
          <div className="flex flex-wrap mb-4 gap-4">
            <div className="flex-1 min-w-[200px]">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block font-bold mb-1 text-sm">Gerätetyp*</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger className="border-[#ddd] rounded-md shadow-none">
                          <SelectValue placeholder="Gerätetyp wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Smartphone">Smartphone</SelectItem>
                          <SelectItem value="Tablet">Tablet</SelectItem>
                          <SelectItem value="Laptop">Laptop</SelectItem>
                          <SelectItem value="Watch">Watch</SelectItem>
                          <SelectItem value="Spielekonsole">Spielekonsole</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block font-bold mb-1 text-sm">Hersteller*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="z.B. Apple, Samsung" 
                        className="border-[#ddd] rounded-md shadow-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block font-bold mb-1 text-sm">Modell*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="z.B. iPhone 13 Pro" 
                        className="border-[#ddd] rounded-md shadow-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block font-bold mb-1 text-sm">Seriennummer</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Seriennummer (optional)" 
                        className="border-[#ddd] rounded-md shadow-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Fehlerbeschreibung und Arbeiten */}
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#2c3e50] border-b border-[#ddd] pb-2 mb-5">Fehlerbeschreibung und Arbeiten</h2>
          
          <div className="mb-4">
            <FormField
              control={form.control}
              name="issue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block font-bold mb-1 text-sm">Fehlerbeschreibung*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Beschreiben Sie das Problem mit dem Gerät"
                      className="resize-vertical border-[#ddd] rounded-md shadow-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-4">
            <div className="text-sm font-bold mb-3">Durchzuführende Arbeiten*</div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-3 items-center">
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name={`items.${index}.position`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            {...field} 
                            readOnly 
                            className="text-center h-10 border-[#ddd] rounded-md shadow-none" 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="z.B. Displaytausch" 
                            {...field} 
                            className="h-10 border-[#ddd] rounded-md shadow-none" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value));
                              updateTotalPrice(index);
                            }} 
                            className="text-center h-10 border-[#ddd] rounded-md shadow-none" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              onBlur={(e) => {
                                field.onChange(formatPrice(e.target.value));
                                updateTotalPrice(index);
                              }} 
                              className="pr-6 text-right h-10 border-[#ddd] rounded-md shadow-none" 
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                              <Euro className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name={`items.${index}.totalPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              readOnly 
                              className="pr-6 text-right h-10 border-[#ddd] rounded-md shadow-none bg-gray-50" 
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                              <Euro className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1 flex items-center justify-center">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => remove(index)}
                    className="text-red-500 hover:bg-transparent hover:text-red-700"
                    disabled={fields.length === 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="flex mt-4 mb-6">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="border-[#ddd] rounded-md shadow-none"
                onClick={() => append({
                  position: fields.length + 1,
                  description: "",
                  quantity: 1,
                  unitPrice: "0,00 €",
                  totalPrice: "0,00 €",
                })}
              >
                <Plus className="w-4 h-4 mr-2" /> Position hinzufügen
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="taxRate"
              render={({ field }) => (
                <FormItem className="flex justify-end">
                  <div className="w-1/3">
                    <FormLabel className="block font-bold mb-1 text-sm">Gesamtpreis (€)*</FormLabel>
                    <FormControl>
                      <Input 
                        value="0,00 €" 
                        readOnly
                        className="text-right border-[#ddd] rounded-md shadow-none"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Notizen */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="mb-6">
              <FormLabel className="block font-bold mb-1 text-sm">Zusätzliche Notizen</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Zusätzliche Notizen zum Kostenvoranschlag"
                  className="resize-vertical border-[#ddd] rounded-md shadow-none min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Absenden-Buttons */}
        <div className="text-center mt-8">
          <Button 
            type="reset" 
            variant="destructive" 
            className="mx-2 bg-[#e74c3c] hover:bg-[#c0392b]"
            onClick={() => form.reset()}
          >
            Formular zurücksetzen
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending} 
            className="mx-2 bg-[#2ecc71] hover:bg-[#27ae60]"
          >
            {createMutation.isPending ? 
              "Wird erstellt..." : 
              "Kostenvoranschlag erstellen"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}