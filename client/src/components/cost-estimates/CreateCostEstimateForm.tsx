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
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-[800px] mx-auto p-5 font-['Arial']">
        <h1 className="text-center text-2xl font-bold text-[#2c3e50] mb-8">Kostenvoranschlag Generator</h1>

        {/* Kundendaten */}
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm border border-[#ddd]">
          <h2 className="text-[18px] font-bold border-b border-[#ddd] pb-2.5 mb-5">Kundendaten</h2>
          
          <div className="flex flex-wrap mb-4 -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Vorname*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Nachname*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="mb-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel className="block font-bold mb-1 text-[14px]">Adresse*</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap mb-4 -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">PLZ*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Ort*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex flex-wrap mb-4 -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Telefonnummer*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">E-Mail*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="mb-0 hidden">
            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel className="block font-bold mb-1 text-[14px]">Gültig bis*</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="w-full h-[38px] justify-start text-left px-2 py-2 border border-[#ddd] rounded-md font-normal"
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
        </div>
        
        {/* Gerätedaten */}
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm border border-[#ddd]">
          <h2 className="text-[18px] font-bold text-[#2c3e50] border-b border-[#ddd] pb-2.5 mb-5">Gerätedaten</h2>
          
          <div className="flex flex-wrap -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Gerätetyp*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md">
                          <SelectValue placeholder="z.B. Smartphone, Laptop, Tablet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Smartphone">Smartphone</SelectItem>
                        <SelectItem value="Tablet">Tablet</SelectItem>
                        <SelectItem value="Laptop">Laptop</SelectItem>
                        <SelectItem value="Watch">Watch</SelectItem>
                        <SelectItem value="Spielekonsole">Spielekonsole</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Hersteller*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap -mx-2">
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Modell*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="w-1/2 px-2">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Seriennummer</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
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
        <div className="bg-[#f9f9f9] rounded-lg p-5 mb-6 shadow-sm border border-[#ddd]">
          <h2 className="text-[18px] font-bold text-[#2c3e50] border-b border-[#ddd] pb-2.5 mb-5">Fehlerbeschreibung und Arbeiten</h2>
          
          <div className="mb-4">
            <FormField
              control={form.control}
              name="issue"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel className="block font-bold mb-1 text-[14px]">Fehlerbeschreibung*</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="w-full min-h-[100px] px-2 py-2 border border-[#ddd] rounded-md resize-vertical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-4">
            <FormField
              control={form.control}
              name={`items.0.description`}
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel className="block font-bold mb-1 text-[14px]">Durchzuführende Arbeiten*</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="w-full min-h-[100px] px-2 py-2 border border-[#ddd] rounded-md resize-vertical"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex flex-wrap -mx-2">
            <div className="w-full px-2">
              <FormField
                control={form.control}
                name={`items.0.unitPrice`}
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="block font-bold mb-1 text-[14px]">Gesamtpreis (€)*</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="z.B. 150,00 €"
                        onBlur={(e) => {
                          field.onChange(formatPrice(e.target.value));
                          updateTotalPrice(0);
                        }}
                        className="w-full h-[38px] px-2 py-2 border border-[#ddd] rounded-md" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Absenden-Buttons */}
        <div className="text-center mt-8">
          <Button 
            type="reset" 
            className="mx-2 bg-[#e74c3c] hover:bg-[#c0392b] text-white border-none rounded-md px-5 py-2.5 text-[16px]"
            onClick={() => form.reset()}
          >
            Formular zurücksetzen
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending} 
            className="mx-2 bg-[#2ecc71] hover:bg-[#27ae60] text-white border-none rounded-md px-5 py-2.5 text-[16px]"
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