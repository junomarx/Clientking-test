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

// Interface für Kostenvoranschlagsposten
interface CostEstimateItem {
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

// Validierungsschema für das Formular
const costEstimateSchema = z.object({
  // Kundenreferenz-ID - optional, wird automatisch generiert wenn nicht vorhanden
  customerId: z.number().optional(),
  
  // Titel und Beschreibung
  title: z.string().default("Kostenvoranschlag"),
  
  // Kundendaten
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  address: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  phone: z.string().min(1, "Telefonnummer ist erforderlich"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich").optional().or(z.literal('').transform(() => undefined)),
  
  // Gerätedaten
  deviceType: z.string().min(1, "Gerätetyp ist erforderlich"),
  brand: z.string().min(1, "Hersteller ist erforderlich"),
  model: z.string().min(1, "Modell ist erforderlich"),
  serialNumber: z.string().optional(),
  
  // Fehlerbeschreibung
  issueDescription: z.string().min(1, "Fehlerbeschreibung ist erforderlich"),
  
  // Preisdaten
  subtotal: z.string().min(1, "Zwischensumme ist erforderlich"),
  taxRate: z.string().default("20"),
  taxAmount: z.string().min(1, "MwSt-Betrag ist erforderlich"),
  totalPrice: z.string().min(1, "Gesamtpreis ist erforderlich")
});

type CostEstimateFormData = z.infer<typeof costEstimateSchema>;

interface NewCostEstimateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateCostEstimate?: (data: CostEstimateFormData) => void;
  preselectedCustomer?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  };
  editMode?: {
    id: number;
    title: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber?: string;
    issueDescription: string;
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    totalPrice: string;
    items: any[];
  };
}

export function NewCostEstimateDialog({ 
  open, 
  onClose,
  onCreateCostEstimate,
  preselectedCustomer,
  editMode
}: NewCostEstimateDialogProps) {
  const { toast } = useToast();
  
  // Kundendaten-Stati
  const [filterText, setFilterText] = useState<string>("");
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  
  // Gerätedaten-Stati für freie Eingabe mit Autocomplete
  const [availableDeviceTypes, setAvailableDeviceTypes] = useState<{id: number, name: string}[]>([]);
  const [availableBrands, setAvailableBrands] = useState<{id: number, name: string}[]>([]);
  const [availableModels, setAvailableModels] = useState<{id: number, name: string}[]>([]);
  const [showDeviceTypeDropdown, setShowDeviceTypeDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedDeviceTypeIndex, setSelectedDeviceTypeIndex] = useState(-1);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(-1);
  const [selectedModelIndex, setSelectedModelIndex] = useState(-1);
  
  // Positionen-Stati - mit EditMode-Unterstützung
  const [items, setItems] = useState<CostEstimateItem[]>(editMode?.items || []);
  const [showAddItemForm, setShowAddItemForm] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<CostEstimateItem>({
    description: "",
    quantity: 1,
    unitPrice: "0,00",
    totalPrice: "0,00"
  });
  
  const form = useForm<CostEstimateFormData>({
    resolver: zodResolver(costEstimateSchema),
    defaultValues: {
      customerId: undefined,
      title: "Kostenvoranschlag",
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
      subtotal: "0,00",
      taxRate: "20",
      taxAmount: "0,00",
      totalPrice: "0,00"
    }
  });

  // Debug: Watch form values in real-time
  const watchedValues = form.watch();
  console.log('🔍 REALTIME FORM VALUES:', {
    firstName: watchedValues.firstName,
    lastName: watchedValues.lastName,
    phone: watchedValues.phone,
    email: watchedValues.email,
    address: watchedValues.address,
    postalCode: watchedValues.postalCode,
    city: watchedValues.city
  });
  
  // useEffect to populate form with preselected customer data AND editMode data
  useEffect(() => {
    if ((preselectedCustomer || editMode) && open) {
      console.log('Setting preselected customer data:', preselectedCustomer);
      console.log('Setting editMode data:', editMode);
      
      // Reset form with new default values including customer data AND edit data
      const resetValues = {
        customerId: preselectedCustomer?.id || editMode?.customerId,
        title: editMode?.title || 'Kostenvoranschlag',
        firstName: preselectedCustomer?.firstName || editMode?.firstName || "",
        lastName: preselectedCustomer?.lastName || editMode?.lastName || "",
        phone: preselectedCustomer?.phone || editMode?.phone || "",
        email: preselectedCustomer?.email || editMode?.email || '',
        address: preselectedCustomer?.address || editMode?.address || '',
        postalCode: preselectedCustomer?.postalCode || editMode?.postalCode || '',
        city: preselectedCustomer?.city || editMode?.city || '',
        deviceType: editMode?.deviceType || '',
        brand: editMode?.brand || '',
        model: editMode?.model || '',
        serialNumber: editMode?.serial_number || '',
        issueDescription: editMode?.issue || '',
        subtotal: editMode?.subtotal || '0,00',
        taxRate: editMode?.taxRate || '20',
        taxAmount: editMode?.taxAmount || '0,00',
        totalPrice: editMode?.totalPrice || '0,00'
      };
      
      console.log('Resetting form with values:', resetValues);
      form.reset(resetValues);
      
      // Set customer ID for future reference
      setSelectedCustomerId(preselectedCustomer?.id || editMode?.customerId || null);
      
      // Force re-render by triggering form validation
      setTimeout(() => {
        console.log('Form values after reset:', form.getValues());
      }, 100);
    } else if (open && !preselectedCustomer && !editMode) {
      // Reset form when opening without preselected customer or editMode
      form.reset();
      setSelectedCustomerId(null);
    }
  }, [preselectedCustomer, editMode, open, form]);
  
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

  // Gerätedaten-Funktionen für freie Eingabe mit Autocomplete
  const loadDeviceTypes = async () => {
    try {
      const response = await apiRequest('GET', '/api/global/device-types');
      const deviceTypes = await response.json();
      setAvailableDeviceTypes(deviceTypes);
    } catch (error) {
      console.error('Fehler beim Laden der Gerätetypen:', error);
    }
  };

  const loadBrands = async () => {
    const deviceType = form.getValues('deviceType');
    if (deviceType) {
      try {
        const selectedDeviceType = availableDeviceTypes.find(dt => dt.name === deviceType);
        if (selectedDeviceType) {
          const response = await apiRequest('GET', `/api/global/brands?deviceTypeId=${selectedDeviceType.id}`);
          const brands = await response.json();
          setAvailableBrands(brands);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Marken:', error);
      }
    }
  };

  const loadModels = async () => {
    const brand = form.getValues('brand');
    const deviceType = form.getValues('deviceType');
    if (brand && deviceType) {
      try {
        const selectedDeviceType = availableDeviceTypes.find(dt => dt.name === deviceType);
        const selectedBrand = availableBrands.find(b => b.name === brand);
        if (selectedDeviceType && selectedBrand) {
          const response = await apiRequest('GET', `/api/global/models?brandId=${selectedBrand.id}&deviceTypeId=${selectedDeviceType.id}`);
          const models = await response.json();
          setAvailableModels(models);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Modelle:', error);
      }
    }
  };

  // Handler für Gerätetyp-Eingabe
  const handleDeviceTypeInput = (value: string) => {
    if (value) {
      const filtered = availableDeviceTypes.filter(deviceType => 
        deviceType.name.toLowerCase().includes(value.toLowerCase())
      );
      setAvailableDeviceTypes(filtered);
      setShowDeviceTypeDropdown(true);
    } else {
      setShowDeviceTypeDropdown(false);
    }
  };

  // Handler für Marken-Eingabe
  const handleBrandInput = (value: string) => {
    if (value) {
      const filtered = availableBrands.filter(brand => 
        brand.name.toLowerCase().includes(value.toLowerCase())
      );
      setAvailableBrands(filtered);
      setShowBrandDropdown(true);
    } else {
      setShowBrandDropdown(false);
    }
  };

  // Handler für Modell-Eingabe
  const handleModelInput = (value: string) => {
    if (value) {
      const filtered = availableModels.filter(model => 
        model.name.toLowerCase().includes(value.toLowerCase())
      );
      setAvailableModels(filtered);
      setShowModelDropdown(true);
    } else {
      setShowModelDropdown(false);
    }
  };

  // Auswahl-Handler
  const selectDeviceType = (deviceType: {id: number, name: string}) => {
    form.setValue('deviceType', deviceType.name);
    setShowDeviceTypeDropdown(false);
    setSelectedDeviceTypeIndex(-1);
    // Marken und Modelle zurücksetzen
    form.setValue('brand', '');
    form.setValue('model', '');
    setAvailableBrands([]);
    setAvailableModels([]);
  };

  const selectBrand = (brand: {id: number, name: string}) => {
    form.setValue('brand', brand.name);
    setShowBrandDropdown(false);
    setSelectedBrandIndex(-1);
    // Modelle zurücksetzen
    form.setValue('model', '');
    setAvailableModels([]);
  };

  const selectModel = (model: {id: number, name: string}) => {
    form.setValue('model', model.name);
    setShowModelDropdown(false);
    setSelectedModelIndex(-1);
  };

  // Tastatur-Navigation für Geräteeingabe
  const handleDeviceTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDeviceTypeDropdown && availableDeviceTypes.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedDeviceTypeIndex(prev => Math.min(prev + 1, availableDeviceTypes.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedDeviceTypeIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedDeviceTypeIndex >= 0) {
        e.preventDefault();
        selectDeviceType(availableDeviceTypes[selectedDeviceTypeIndex]);
      } else if (e.key === 'Tab' && selectedDeviceTypeIndex >= 0) {
        e.preventDefault();
        selectDeviceType(availableDeviceTypes[selectedDeviceTypeIndex]);
        // Fokus auf das nächste Feld setzen
        setTimeout(() => {
          const nextField = document.querySelector('input[name="brand"]') as HTMLInputElement;
          if (nextField) {
            nextField.focus();
          }
        }, 100);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeviceTypeDropdown(false);
      }
    }
  };

  const handleBrandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showBrandDropdown && availableBrands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedBrandIndex(prev => Math.min(prev + 1, availableBrands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedBrandIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedBrandIndex >= 0) {
        e.preventDefault();
        selectBrand(availableBrands[selectedBrandIndex]);
      } else if (e.key === 'Tab' && selectedBrandIndex >= 0) {
        e.preventDefault();
        selectBrand(availableBrands[selectedBrandIndex]);
        // Fokus auf das nächste Feld setzen
        setTimeout(() => {
          const nextField = document.querySelector('input[name="model"]') as HTMLInputElement;
          if (nextField) {
            nextField.focus();
          }
        }, 100);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowBrandDropdown(false);
      }
    }
  };

  const handleModelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showModelDropdown && availableModels.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedModelIndex(prev => Math.min(prev + 1, availableModels.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedModelIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedModelIndex >= 0) {
        e.preventDefault();
        selectModel(availableModels[selectedModelIndex]);
      } else if (e.key === 'Tab' && selectedModelIndex >= 0) {
        e.preventDefault();
        selectModel(availableModels[selectedModelIndex]);
        // Fokus auf das nächste Feld setzen
        setTimeout(() => {
          const nextField = document.querySelector('input[name="serialNumber"]') as HTMLInputElement;
          if (nextField) {
            nextField.focus();
          }
        }, 100);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowModelDropdown(false);
      }
    }
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

  // Position hinzufügen
  const handleAddItem = () => {
    // Neue Position zur Liste der Positionen hinzufügen
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    
    // Formular zurücksetzen
    setNewItem({
      description: "",
      quantity: 1,
      unitPrice: "0,00",
      totalPrice: "0,00"
    });
    
    // Formular schließen
    setShowAddItemForm(false);
    
    // Summen aktualisieren
    updateTotals(updatedItems);
  };
  
  // Position entfernen
  const removeItem = (indexToRemove: number) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    setItems(updatedItems);
    
    // Summen aktualisieren
    updateTotals(updatedItems);
  };
  
  // Summen berechnen
  const updateTotals = (currentItems: CostEstimateItem[]) => {
    // Brutto-Gesamtsumme berechnen (da Positionen bereits Bruttopreise sind)
    const total = currentItems.reduce((sum, item) => {
      return sum + parseFloat(item.totalPrice.replace(',', '.'));
    }, 0);
    
    // MwSt-Satz aus dem Formular holen
    const taxRate = parseFloat(form.getValues('taxRate'));
    
    // Netto-Betrag berechnen (Brutto / (1 + taxRate/100))
    const subtotal = total / (1 + taxRate/100);
    
    // MwSt-Betrag berechnen (Brutto - Netto)
    const taxAmount = total - subtotal;
    
    // Werte im Formular aktualisieren
    form.setValue('subtotal', subtotal.toFixed(2).replace('.', ','));
    form.setValue('taxAmount', taxAmount.toFixed(2).replace('.', ','));
    form.setValue('totalPrice', total.toFixed(2).replace('.', ','));
  };

  const onSubmit = (data: CostEstimateFormData) => {
    console.log("=== KOSTENVORANSCHLAG FORMULAR SUBMIT ===");
    console.log("Eingabe-Daten:", data);
    console.log("Items:", items);
    console.log("Form State:", form.formState);
    console.log("Form Errors:", form.formState.errors);
    
    // Validierung: Mindestens ein Item muss vorhanden sein
    if (items.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie mindestens eine Position hinzu",
        variant: "destructive",
      });
      return;
    }
    
    // Positionen zum Datensatz hinzufügen
    const formData = {
      ...data,
      items: items,
      issue: data.issueDescription, // Umbenennung für API-Konformität
      total: data.totalPrice, // Umbenennung für API-Konformität
      tax_rate: "20", // Explizit 20% MwSt für Österreich
      tax_amount: data.taxAmount
    };
    
    console.log("Finale Formular-Daten für API:", formData);
    
    // EditMode: Kostenvoranschlag aktualisieren
    if (editMode && editMode.id) {
      try {
        // PUT-Request für Update - alle Felder explizit übertragen
        const updateData = {
          ...formData,
          serial_number: data.serialNumber || null, // Backend erwartet snake_case
          deviceType: data.deviceType,
          brand: data.brand,
          model: data.model,
          issue: data.issueDescription // Mapping von issueDescription zu issue
        };
        
        console.log("UPDATE-Daten für EditMode:", updateData);
        
        // API-Request für Update
        apiRequest('PUT', `/api/cost-estimates/${editMode.id}`, updateData)
          .then(() => {
            toast({
              title: "Kostenvoranschlag aktualisiert",
              description: `Änderungen gespeichert für ${data.firstName} ${data.lastName}`,
            });
            
            // Dialog schließen
            onClose();
            
            // Cache invalidieren, damit die Änderungen sichtbar werden
            import('@/lib/queryClient').then(({ queryClient }) => {
              queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates'] });
              queryClient.invalidateQueries({ queryKey: ['/api/cost-estimates', editMode.id] });
            });
          })
          .catch((error) => {
            console.error("Fehler beim Aktualisieren:", error);
            toast({
              title: "Fehler beim Aktualisieren",
              description: "Der Kostenvoranschlag konnte nicht aktualisiert werden",
              variant: "destructive",
            });
          });
      } catch (error) {
        console.error("Fehler beim Aktualisieren des Kostenvoranschlags:", error);
        toast({
          title: "Fehler beim Aktualisieren",
          description: "Der Kostenvoranschlag konnte nicht aktualisiert werden",
          variant: "destructive",
        });
      }
    }
    // Erstellen: Kostenvoranschlag neu erstellen
    else if (onCreateCostEstimate) {
      try {
        onCreateCostEstimate(formData);
        
        // Erfolgsmeldung anzeigen
        toast({
          title: "Kostenvoranschlag erstellt",
          description: `Für ${data.firstName} ${data.lastName} - ${data.brand} ${data.model}`,
        });
        
        // Dialog schließen und Formular zurücksetzen
        form.reset();
        setItems([]);
        onClose();
      } catch (error) {
        console.error("Fehler beim Erstellen des Kostenvoranschlags:", error);
        toast({
          title: "Fehler beim Erstellen",
          description: "Der Kostenvoranschlag konnte nicht erstellt werden",
          variant: "destructive",
        });
      }
    } else {
      console.error("onCreateCostEstimate Callback nicht verfügbar");
      toast({
        title: "Konfigurationsfehler",
        description: "Formular nicht korrekt konfiguriert",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editMode ? "Kostenvoranschlag bearbeiten" : "Kostenvoranschlag erstellen"}
          </DialogTitle>
          <DialogDescription>
            {editMode 
              ? "Bearbeiten Sie die Details des Kostenvoranschlags." 
              : "Geben Sie die Details für den neuen Kostenvoranschlag ein."
            }
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
                    render={({ field }) => {
                      console.log('🔍 DEBUG firstName field:', field.value, 'form state:', form.getValues('firstName'));
                      return (
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
                      );
                    }}
                  />
                </div>
                
                <div className="relative">
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => {
                      console.log('🔍 DEBUG lastName field:', field.value, 'form state:', form.getValues('lastName'));
                      return (
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
                      );
                    }}
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
                  render={({ field }) => {
                    console.log('🔍 DEBUG phone field:', field.value, 'form state:', form.getValues('phone'));
                    return (
                      <FormItem>
                        <FormLabel>Telefonnummer*</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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

              {/* Freie Geräteeingabe mit Autocomplete wie bei Neuer Auftrag */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel>Gerätetyp</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="z.B. Smartphone, Tablet..." 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleDeviceTypeInput(e.target.value);
                          }}
                          onFocus={() => loadDeviceTypes()}
                          onKeyDown={(e) => handleDeviceTypeKeyDown(e)}
                        />
                      </FormControl>
                      {showDeviceTypeDropdown && availableDeviceTypes.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {availableDeviceTypes.map((deviceType, index) => (
                            <div
                              key={deviceType.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedDeviceTypeIndex ? 'bg-gray-100' : ''}`}
                              onClick={() => selectDeviceType(deviceType)}
                            >
                              {deviceType.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel>Hersteller</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="z.B. Apple, Samsung..." 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleBrandInput(e.target.value);
                          }}
                          onFocus={() => loadBrands()}
                          onKeyDown={(e) => handleBrandKeyDown(e)}
                        />
                      </FormControl>
                      {showBrandDropdown && availableBrands.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {availableBrands.map((brand, index) => (
                            <div
                              key={brand.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedBrandIndex ? 'bg-gray-100' : ''}`}
                              onClick={() => selectBrand(brand)}
                            >
                              {brand.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel>Modell</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="z.B. iPhone 15, Galaxy S24..." 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleModelInput(e.target.value);
                          }}
                          onFocus={() => loadModels()}
                          onKeyDown={(e) => handleModelKeyDown(e)}
                        />
                      </FormControl>
                      {showModelDropdown && availableModels.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {availableModels.map((model, index) => (
                            <div
                              key={model.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${index === selectedModelIndex ? 'bg-gray-100' : ''}`}
                              onClick={() => selectModel(model)}
                            >
                              {model.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Seriennummer */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
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
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>Positionen*</FormLabel>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowAddItemForm(true)}
                    >
                      Position hinzufügen
                    </Button>
                  </div>
                  
                  {showAddItemForm && (
                    <div className="mb-6 p-4 border rounded-md bg-muted/20">
                      <h3 className="text-md font-medium mb-3">Neue Position</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="col-span-2">
                          <label className="text-sm font-medium block mb-1">Beschreibung</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-md"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            placeholder="z.B. Display-Austausch"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium block mb-1">Menge</label>
                          <input 
                            type="number" 
                            className="w-full p-2 border rounded-md"
                            value={newItem.quantity}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 1;
                              const unitPrice = parseFloat(newItem.unitPrice.replace(',', '.')) || 0;
                              const total = (quantity * unitPrice).toFixed(2).replace('.', ',');
                              setNewItem({
                                ...newItem, 
                                quantity, 
                                totalPrice: total
                              });
                            }}
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium block mb-1">Einzelpreis (€) - Brutto</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border rounded-md"
                            value={newItem.unitPrice}
                            onChange={(e) => {
                              const unitPrice = e.target.value.replace(',', '.');
                              if (!isNaN(parseFloat(unitPrice)) || unitPrice === '' || unitPrice === '.') {
                                const formattedPrice = unitPrice === '' ? '0' : unitPrice;
                                const quantity = newItem.quantity || 1;
                                const total = (quantity * parseFloat(formattedPrice)).toFixed(2).replace('.', ',');
                                
                                setNewItem({
                                  ...newItem, 
                                  unitPrice: e.target.value,
                                  totalPrice: total
                                });
                              }
                            }}
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <Button type="button" variant="ghost" onClick={() => setShowAddItemForm(false)}>
                          Abbrechen
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleAddItem} 
                          disabled={!newItem.description || parseFloat(newItem.unitPrice.replace(',', '.')) <= 0}
                        >
                          Position hinzufügen
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {items.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Pos.</th>
                            <th className="p-2 text-left">Beschreibung</th>
                            <th className="p-2 text-center">Menge</th>
                            <th className="p-2 text-right">Einzelpreis</th>
                            <th className="p-2 text-right">Gesamt</th>
                            <th className="p-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 text-left">{index + 1}</td>
                              <td className="p-2 text-left">{item.description}</td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-right">{item.unitPrice}</td>
                              <td className="p-2 text-right">{item.totalPrice}</td>
                              <td className="p-2 text-center">
                                <Button 
                                  type="button"
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeItem(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-md text-muted-foreground">
                      Keine Positionen vorhanden. Fügen Sie Positionen hinzu, um den Kostenvoranschlag zu detaillieren.
                    </div>
                  )}

                  <div className="flex flex-col items-end mt-4 space-y-2">
                    <FormField
                      control={form.control}
                      name="subtotal"
                      render={({ field }) => (
                        <div className="flex justify-between w-48">
                          <span className="text-muted-foreground">Zwischensumme</span>
                          <span>{field.value}€</span>
                        </div>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <div className="flex justify-between w-48">
                          <span className="text-muted-foreground">MwSt ({field.value}%)</span>
                          <FormField
                            control={form.control}
                            name="taxAmount"
                            render={({ field }) => <span>{field.value}€</span>}
                          />
                        </div>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totalPrice"
                      render={({ field }) => (
                        <div className="flex justify-between w-48 font-bold text-lg pt-2 border-t">
                          <span>Gesamt</span>
                          <span>{field.value}€</span>
                        </div>
                      )}
                    />
                  </div>
                </div>
                
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