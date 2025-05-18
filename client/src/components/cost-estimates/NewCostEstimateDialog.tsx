import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, User, UserPlus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GlobalDeviceSelector } from "@/components/GlobalDeviceSelector";

// Customer Interface kopiert aus der NewOrderModal.tsx
interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  zipCode?: string;
}

// Validierungsschema für das Formular
const costEstimateSchema = z.object({
  // Kundenreferenz-ID
  customerId: z.number().optional(),
  
  // Kundendaten
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  address: z.string().min(1, "Adresse ist erforderlich"),
  postalCode: z.string().min(1, "PLZ ist erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  
  // Gerätedaten
  deviceType: z.string().min(1, "Gerätetyp ist erforderlich"),
  brand: z.string().min(1, "Hersteller ist erforderlich"),
  model: z.string().min(1, "Modell ist erforderlich"),
  serialNumber: z.string().optional(),
  
  // Fehlerbeschreibung und Arbeiten
  issueDescription: z.string().min(1, "Fehlerbeschreibung ist erforderlich"),
  workToBeDone: z.string().min(1, "Durchzuführende Arbeiten ist erforderlich"),
  
  // Preisdaten
  totalPrice: z.string().min(1, "Gesamtpreis ist erforderlich")
});

type CostEstimateFormData = z.infer<typeof costEstimateSchema>;

interface NewCostEstimateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateCostEstimate?: (data: CostEstimateFormData) => void;
}

export function NewCostEstimateDialog({ 
  open, 
  onClose,
  onCreateCostEstimate 
}: NewCostEstimateDialogProps) {
  const { toast } = useToast();
  
  // Kundendaten-Stati
  const [filterText, setFilterText] = useState<string>("");
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  
  // Gerätedaten-Stati
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  
  const form = useForm<CostEstimateFormData>({
    resolver: zodResolver(costEstimateSchema),
    defaultValues: {
      customerId: undefined,
      firstName: "",
      lastName: "",
      address: "",
      postalCode: "",
      city: "",
      phone: "",
      email: "",
      deviceType: "",
      brand: "",
      model: "",
      serialNumber: "",
      issueDescription: "",
      workToBeDone: "",
      totalPrice: ""
    }
  });
  
  // Vereinfachter Ansatz für Kostenvoranschläge - ohne Kundendatenbank-Zugriff
  const checkForExistingCustomer = async (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return;
    
    try {
      // Versuch, mit der regulären API nach Kunden zu suchen
      const response = await apiRequest('GET', `/api/customers?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
      
      // Im Fehlerfall (403) - Superadmin ohne Shop-ID
      if (response.status === 403) {
        console.warn("Shop-Isolation verhindert Kundenzugriff - für Kostenvoranschlag keine Kundenverknüpfung notwendig");
        setMatchingCustomers([]);
        setShowCustomerDropdown(false);
        return;
      }
      
      const customers = await response.json();
      
      console.log(`Found ${customers.length} matching customers for ${firstName} ${lastName}`);
      
      // Kunden im State speichern für das Dropdown
      setMatchingCustomers(customers);
      
      // Dropdown anzeigen, wenn Kunden gefunden wurden
      setShowCustomerDropdown(customers.length > 0);
      
      // Ausgewählten Index zurücksetzen
      setSelectedCustomerIndex(-1);
    } catch (error) {
      console.error('Error searching for customers:', error);
      // Bei Fehlern die Kundenauswahl deaktivieren
      setMatchingCustomers([]);
      setShowCustomerDropdown(false);
    }
  };
  
  // Kundendaten in das Formular übernehmen
  const fillCustomerData = (customer: Customer) => {
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone || "");
    
    if (customer.email) {
      form.setValue('email', customer.email);
    }
    
    if (customer.address) {
      form.setValue('address', customer.address);
    }
    
    if (customer.postalCode || customer.zipCode) {
      form.setValue('postalCode', customer.postalCode || customer.zipCode || "");
    }
    
    if (customer.city) {
      form.setValue('city', customer.city);
    }
    
    // Ausgewählte Kunden-ID setzen UND im Formular speichern
    setSelectedCustomerId(customer.id);
    form.setValue('customerId', customer.id);
    
    // Dropdown schließen und Matching-Customers leeren
    setShowCustomerDropdown(false);
    setMatchingCustomers([]);
    
    // Fokus auf das nächste Feld setzen - zum Beispiel E-Mail oder Adresse
    // So wird verhindert, dass der Fokus weiterhin auf dem Namen bleibt
    const nextField = document.querySelector('input[name="email"]') as HTMLInputElement;
    if (nextField) {
      nextField.focus();
    }
  };
  
  // Reset Form beim Öffnen/Schließen des Dialogs
  useEffect(() => {
    if (open) {
      // Alle Status zurücksetzen
      setFilterText("");
      setMatchingCustomers([]);
      setSelectedCustomerId(null);
      setSelectedCustomerIndex(-1);
      setShowCustomerDropdown(false);
      
      // Formular zurücksetzen
      form.reset();
    }
  }, [open, form]);
  
  // Überwachung der Namensfelder für die Kundensuche
  const watchFirstName = form.watch('firstName');
  const watchLastName = form.watch('lastName');
  
  // Kundensuche starten, wenn beide Namensfelder ausgefüllt sind
  useEffect(() => {
    if (watchFirstName && watchLastName) {
      // Kundensuche mit Verzögerung starten, um zu viele API-Aufrufe zu vermeiden
      const timer = setTimeout(() => {
        checkForExistingCustomer(watchFirstName, watchLastName);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // Dropdown schließen und Suchergebnisse zurücksetzen, wenn Felder leer sind
      setShowCustomerDropdown(false);
      setMatchingCustomers([]);
    }
  }, [watchFirstName, watchLastName]);
  
  // Ein einfacher globaler Blur-Handler für alle Eingabefelder
  const handleBlur = () => {
    // Nach kurzer Verzögerung Dropdown schließen, um Fokus-Wechsel zu ermöglichen
    setTimeout(() => {
      setShowCustomerDropdown(false);
    }, 200);
  };
  
  // Handler für die Tastaturnavigation in der Kundenauswahl
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Nur im geöffneten Dropdown navigieren
    if (showCustomerDropdown && matchingCustomers.length > 0) {
      // Pfeiltaste nach unten
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCustomerIndex(prev => 
          Math.min(prev + 1, matchingCustomers.length - 1)
        );
      }
      
      // Pfeiltaste nach oben
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCustomerIndex(prev => Math.max(prev - 1, 0));
      }
      
      // Enter zum Auswählen
      else if (e.key === 'Enter' && selectedCustomerIndex >= 0) {
        e.preventDefault();
        fillCustomerData(matchingCustomers[selectedCustomerIndex]);
      }
      
      // Tab-Taste - wichtig für korrekte Navigation
      else if (e.key === 'Tab' && selectedCustomerIndex >= 0) {
        // Wichtig: Erst prüfen, dann preventDefault aufrufen, wenn ein Kunde ausgewählt ist
        e.preventDefault();
        const selectedCustomer = matchingCustomers[selectedCustomerIndex];
        if (selectedCustomer) {
          fillCustomerData(selectedCustomer);
          
          // Wichtig: Wechsel zum E-Mail-Feld nach Kundenauswahl
          setTimeout(() => {
            const nextField = document.querySelector('input[name="email"]') as HTMLInputElement;
            if (nextField) {
              nextField.focus();
            }
          }, 100);
        }
      }
      
      // ESC zum Schließen
      else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCustomerDropdown(false);
      }
    }
  };

  const onSubmit = (data: CostEstimateFormData) => {
    console.log("Formular-Daten:", data);
    
    // Kostenvoranschlag erstellen
    if (onCreateCostEstimate) {
      onCreateCostEstimate(data);
    }
    
    // Erfolgsmeldung anzeigen
    toast({
      title: "Kostenvoranschlag erstellt",
      description: `Für ${data.firstName} ${data.lastName} - ${data.brand} ${data.model}`,
    });
    
    // Dialog schließen und Formular zurücksetzen
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Kostenvoranschlag erstellen</DialogTitle>
          <DialogDescription>
            Geben Sie die Details für den neuen Kostenvoranschlag ein.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Kundendaten */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Kundendaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname*</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            onKeyDown={handleInputKeyDown}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nachname*</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            onKeyDown={handleInputKeyDown}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Dropdown für Kundenauswahl */}
                  {showCustomerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <div className="p-2 text-sm text-gray-500 border-b">
                        {matchingCustomers.length} Kunden gefunden
                      </div>
                      {matchingCustomers.map((customer, index) => (
                        <div
                          key={customer.id}
                          className={`p-2 cursor-pointer hover:bg-gray-100 ${selectedCustomerIndex === index ? 'bg-gray-100' : ''}`}
                          onClick={() => fillCustomerData(customer)}
                          onMouseEnter={() => setSelectedCustomerIndex(index)}
                        >
                          <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                          {customer.email && <div className="text-sm text-gray-500">{customer.email}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>Adresse*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PLZ*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ort*</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Telefonnummer*</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
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
                      <FormLabel>E-Mail*</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Gerätedaten */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Gerätedaten</h3>

              {/* Globale Geräteauswahl (gleiche Komponente wie beim Reparaturauftrag) */}
              <div className="border border-border rounded-md p-3 mb-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Gerätedetails aus dem globalen Katalog
                </div>
                <GlobalDeviceSelector
                  onDeviceTypeSelect={(deviceType, deviceTypeId) => {
                    form.setValue('deviceType', deviceType);
                    setSelectedDeviceTypeId(deviceTypeId);
                    // Zurücksetzen der abhängigen Felder bei Änderung
                    form.setValue('brand', '');
                    form.setValue('model', '');
                    setSelectedBrandId(null);
                    setSelectedModelId(null);
                  }}
                  onBrandSelect={(brand, brandId) => {
                    form.setValue('brand', brand);
                    setSelectedBrandId(brandId);
                    // Zurücksetzen des Modells bei Änderung
                    form.setValue('model', '');
                    setSelectedModelId(null);
                  }}
                  onModelSelect={(model, modelId) => {
                    form.setValue('model', model);
                    setSelectedModelId(modelId);
                  }}
                />
              </div>

              {/* Versteckte Formularfelder, die durch GlobalDeviceSelector befüllt werden */}
              <div className="hidden">
                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} />
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
                      <FormControl>
                        <Input {...field} />
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Nur Seriennummer sichtbar lassen */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seriennummer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Fehlerbeschreibung und Arbeiten */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Fehlerbeschreibung und Arbeiten</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="issueDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fehlerbeschreibung*</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="workToBeDone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durchzuführende Arbeiten*</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-[100px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem className="md:w-1/2">
                      <FormLabel>Gesamtpreis (€)*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="z.B. 150,00 €" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => {
                  form.reset();
                  onClose();
                }}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-primary to-blue-600"
              >
                Kostenvoranschlag erstellen
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default NewCostEstimateDialog;