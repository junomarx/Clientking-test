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
import { format, addMonths } from 'date-fns';
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
  brand: z.string().min(1, "Marke ist erforderlich"),
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
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
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
      street: "",
      city: "",
      postalCode: "",
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
  
  // Standard-Gültigkeitsdatum (1 Monat ab heute)
  const defaultValidUntil = addMonths(new Date(), 1);
  
  // Formular mit Validierung initialisieren
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
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
      const response = await apiRequest("POST", "/api/cost-estimates", data);
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
      validUntil: data.validUntil ? formatDate(data.validUntil) : undefined,
      items,
      subtotal,
      taxAmount,
      total
    };
    
    createMutation.mutate(formattedData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        {/* Kundenauswahl */}
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kunde</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
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
          <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" type="button" className="flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                <span>Neu</span>
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
                          <FormLabel>Vorname *</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Nachname *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={customerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-8">
                      <FormField
                        control={customerForm.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Straße</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-4">
                      <FormField
                        control={customerForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PLZ</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-8 md:col-span-8">
                      <FormField
                        control={customerForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ort</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={customerForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notizen</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsNewCustomerDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={createCustomerMutation.isPending}>
                      {createCustomerMutation.isPending ? "Wird erstellt..." : "Kunde erstellen"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Titel und Beschreibung */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titel</FormLabel>
                <FormControl>
                  <Input placeholder="Titel des Kostenvoranschlags" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Gültig bis</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="flex justify-start text-left font-normal"
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
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Beschreibung des Kostenvoranschlags"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Gerätedetails */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-4">Gerätedetails</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gerätetyp</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
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
              
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marke</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Apple, Samsung" {...field} />
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
                      <Input placeholder="z.B. iPhone 13 Pro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seriennummer</FormLabel>
                    <FormControl>
                      <Input placeholder="Seriennummer (optional)" {...field} />
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
                    <FormLabel>Problem</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Displaybruch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Kostenvoranschlag-Positionen */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Positionen</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
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
            
            {/* Tabellenkopf */}
            <div className="border-b pb-2 mb-3 grid grid-cols-12 gap-2 font-medium text-sm">
              <div className="col-span-1 text-center">Pos.</div>
              <div className="col-span-4">Bezeichnung</div>
              <div className="col-span-1 text-center">Menge</div>
              <div className="col-span-1 text-center">Einheit</div>
              <div className="col-span-2 text-right pr-8">Einzelpreis</div>
              <div className="col-span-2 text-right pr-8">Gesamtpreis</div>
              <div className="col-span-1"></div>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-3 items-center">
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name={`items.${index}.position`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} readOnly className="text-center h-10" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="z.B. Displaytausch" {...field} className="h-10" />
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
                            className="text-center h-10" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1">
                  <Input value="Stück" readOnly className="text-center h-10 bg-gray-50" />
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
                              className="pr-6 text-right h-10" 
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
                
                <div className="col-span-2">
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
                              className="pr-6 text-right h-10 bg-gray-50" 
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
                    className="text-red-500 hover:text-red-700"
                    disabled={fields.length === 1}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* MwSt-Satz */}
            <div className="flex justify-end mt-4">
              <div className="w-1/3">
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MwSt-Satz (%)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="MwSt-Satz wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="13">13%</SelectItem>
                          <SelectItem value="0">0% (steuerfrei)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Notizen */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notizen</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Zusätzliche Notizen zum Kostenvoranschlag"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Absenden-Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Wird erstellt..." : "Kostenvoranschlag erstellen"}
          </Button>
        </div>
      </form>
    </Form>
  );
}