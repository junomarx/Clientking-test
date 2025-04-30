import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { useDeviceTypes } from '@/hooks/useDeviceTypes';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { useModelSeries, type CreateModelSeriesDTO } from '@/hooks/useModelSeries';
import { 
  getIssuesForDeviceType, saveIssue, deleteIssue, 
  DEFAULT_ISSUES
} from '@/lib/localStorage';
import { 
  getBrandsForDeviceType,
  clearAllModels,
  deleteModelLegacy,
  saveModelIntelligent as saveModelDb
} from '@/lib/deviceHelpers';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Standard Vorschläge für Gerätetypen - werden nur verwendet, wenn keine gespeicherten Werte vorhanden sind
const defaultDeviceTypes = ['Smartphone', 'Tablet', 'Watch', 'Laptop', 'Spielekonsole'];

// Standard-Marken für gängige Gerätetypen als Fallback, wenn keine gespeicherten Werte vorhanden sind
const defaultBrands: Record<string, string[]> = {
  'smartphone': ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Nokia', 'Motorola', 'Sony', 'LG', 'Oppo'],
  'tablet': ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Microsoft', 'Amazon', 'Acer', 'Asus', 'Google'],
  'laptop': ['Apple', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Samsung', 'Huawei', 'MSI', 'Toshiba', 'Sony'],
  'watch': ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Huawei', 'Fossil', 'Xiaomi', 'TicWatch', 'Withings']
};

// Form schema
const orderFormSchema = z.object({
  // Customer info
  firstName: z.string().min(2, { message: 'Vorname muss mindestens 2 Zeichen lang sein' }),
  lastName: z.string().min(2, { message: 'Nachname muss mindestens 2 Zeichen lang sein' }),
  phone: z.string().min(5, { message: 'Telefonnummer eingeben' }),
  email: z.string().email({ message: 'Gültige E-Mail-Adresse eingeben' }).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  
  // Device info
  deviceType: z.string().min(1, { message: 'Bitte Geräteart eingeben' }),
  brand: z.string().min(1, { message: 'Bitte Marke auswählen' }),
  modelSeries: z.string().optional().or(z.literal('')),
  model: z.string().min(1, { message: 'Bitte Modell eingeben' }),
  serialNumber: z.string().optional(),
  
  // Issue info
  issue: z.string().min(5, { message: 'Bitte Fehlerbeschreibung eingeben' }),
  estimatedCost: z.string().optional(),
  depositAmount: z.string().optional(),
  status: z.enum(['eingegangen', 'in_reparatur', 'ausser_haus', 'fertig', 'abgeholt'], {
    required_error: 'Bitte Status auswählen',
  }),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  customerId?: number | null;
}

// Schnittstelle für Gerätetyp aus der API
interface DeviceType {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

// Hilfsfunktion zum intelligenten Speichern von Modellen
// Die Implementierung dieser Funktion wurde in deviceHelpers.ts verschoben

// Hilfsfunktion zum Speichern einer Marke
function saveBrand(
  brandName: string, 
  deviceTypeId: number | null, 
  createBrandMutation: any
): void {
  if (deviceTypeId && brandName) {
    createBrandMutation.mutate({
      name: brandName,
      deviceTypeId: deviceTypeId
    });
  }
}

export function NewOrderModal({ open, onClose, customerId }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [showExistingCustomerDialog, setShowExistingCustomerDialog] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isDeviceTypeDropdownOpen, setIsDeviceTypeDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isIssueDropdownOpen, setIsIssueDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [availableIssues, setAvailableIssues] = useState<string[]>([]);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(-1);
  const [filterText, setFilterText] = useState<string>("");
  
  // Das automatische Scrollen wird direkt im Form Element implementiert
  
  // API-Hooks initialisieren
  const { getAllDeviceTypes } = useDeviceTypes();
  const { getBrandsByDeviceTypeId, createBrand } = useBrands();
  const { getModelSeriesByDeviceTypeAndBrand, createModelSeries } = useModelSeries();
  const { getModelsByModelSeriesId, createModels } = useModels();
  
  // API-Abfragen
  const deviceTypesQuery = getAllDeviceTypes();
  
  // API-Mutations
  const createBrandMutation = createBrand();
  const createModelSeriesMutation = createModelSeries();
  const createModelsMutation = createModels();
  
  // Hilfsvariablen für DeviceType und Brand IDs
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelSeriesId, setSelectedModelSeriesId] = useState<number | null>(null);
  
  // Gerätetypen von der API abrufen
  const { data: apiDeviceTypes, isLoading: isLoadingDeviceTypes } = useQuery<DeviceType[]>({
    queryKey: ["/api/device-types"],
    enabled: open // Nur abfragen, wenn der Modal geöffnet ist
  });
  
  // Mutation zum Erstellen eines neuen Gerätetyps
  const createDeviceTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/device-types', { name });
      return response.json();
    },
    onSuccess: () => {
      // Nach erfolgreicher Erstellung die Liste der Gerätetypen aktualisieren
      queryClient.invalidateQueries({ queryKey: ["/api/device-types"] });
    },
    onError: (error: any) => {
      console.error("Fehler beim Erstellen des Gerätetyps:", error);
      toast({
        title: "Fehler",
        description: `Der Gerätetyp konnte nicht gespeichert werden: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Form definition
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      zipCode: '',
      city: '',
      deviceType: '',
      brand: '',
      modelSeries: '',
      model: '',
      serialNumber: '',
      issue: '',
      estimatedCost: '',
      depositAmount: '',
      status: 'eingegangen',
      notes: '',
    },
  });
  
  const watchDeviceType = form.watch('deviceType');
  const watchBrand = form.watch('brand');
  const watchModelSeries = form.watch('modelSeries');
  const watchModel = form.watch('model');
  
  // Zustand für die gespeicherten Modelle und Gerätetypen
  const [savedModels, setSavedModels] = useState<string[]>([]);
  const [savedModelSeries, setSavedModelSeries] = useState<string[]>([]);
  const [savedDeviceTypes, setSavedDeviceTypes] = useState<string[]>([]);
  const [selectedDeviceTypeIndex, setSelectedDeviceTypeIndex] = useState<number>(-1);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState<number>(-1);
  const [selectedModelSeriesIndex, setSelectedModelSeriesIndex] = useState<number>(-1);
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(-1);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);
  const [isModelSeriesDropdownOpen, setIsModelSeriesDropdownOpen] = useState(false);
  
  // Laden des vorausgewählten Kunden
  useEffect(() => {
    // Prüfen, ob Kundendaten im LocalStorage vorhanden sind
    const customerDataString = localStorage.getItem('selectedCustomerData');
    
    if (customerDataString) {
      try {
        // Kunde aus localStorage parsen
        const customer = JSON.parse(customerDataString);
        console.log("Kundendaten aus LocalStorage geladen:", customer);
        
        // Zur Sicherheit prüfen, ob wir ein gültiges Kundenobjekt haben
        if (customer && customer.id) {
          // Kundendaten in Formular eintragen
          form.setValue('firstName', customer.firstName);
          form.setValue('lastName', customer.lastName);
          form.setValue('phone', customer.phone);
          if (customer.email) {
            form.setValue('email', customer.email);
          }
          
          // Customer ID setzen
          setSelectedCustomerId(customer.id);
          
          // Fokus auf das nächste Feld (Geräteart) setzen
          setTimeout(() => {
            const deviceTypeInput = document.querySelector('input[name="deviceType"]');
            if (deviceTypeInput) {
              (deviceTypeInput as HTMLInputElement).focus();
            }
          }, 100);
          
          console.log("Kundendaten wurden in Formular eingefügt");
          
          // LocalStorage leeren, damit es nur einmal verwendet wird
          localStorage.removeItem('selectedCustomerData');
        }
      } catch (error) {
        console.error("Fehler beim Parsen der Kundendaten:", error);
        localStorage.removeItem('selectedCustomerData');
      }
    } else if (open && customerId) {
      console.log("Versuche Kunde zu laden mit ID:", customerId);
      const fetchCustomer = async () => {
        try {
          const response = await fetch(`/api/customers/${customerId}`, {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          if (!response.ok) {
            throw new Error('Kunde konnte nicht geladen werden');
          }
          
          const customer = await response.json();
          console.log("Kunde geladen:", customer);
          
          if (customer) {
            // Kundendaten in Formular eintragen
            form.setValue('firstName', customer.firstName);
            form.setValue('lastName', customer.lastName);
            form.setValue('phone', customer.phone);
            if (customer.email) {
              form.setValue('email', customer.email);
            }
            
            // Customer ID setzen
            setSelectedCustomerId(customer.id);
            
            // Fokus auf das nächste Feld (Geräteart) setzen
            setTimeout(() => {
              const deviceTypeInput = document.querySelector('input[name="deviceType"]');
              if (deviceTypeInput) {
                (deviceTypeInput as HTMLInputElement).focus();
              }
            }, 100);
          }
        } catch (error) {
          console.error("Error loading customer:", error);
          toast({
            title: "Fehler",
            description: "Der Kunde konnte nicht geladen werden.",
            variant: "destructive",
          });
        }
      };
      
      fetchCustomer();
    }
  }, [open, customerId, form, toast]);

  // Update Gerätetyp-Liste beim ersten Rendern und wenn das Modal geöffnet wird
  useEffect(() => {
    if (open && apiDeviceTypes) {
      // Aus den API-Gerätetypen nur die Namen für die Dropdown-Liste extrahieren
      const deviceTypeNames = apiDeviceTypes.map(deviceType => deviceType.name);
      console.log('Geladene Gerätearten von API:', deviceTypeNames);
      
      // Wenn keine API-Gerätetypen verfügbar sind, verwenden wir die Standardliste
      const typesToUse = deviceTypeNames.length > 0 ? deviceTypeNames : defaultDeviceTypes;
      
      setSavedDeviceTypes(typesToUse);
    } else if (open && !apiDeviceTypes) {
      // Fallback zu den Standardtypen, wenn die API noch keine Daten geliefert hat
      setSavedDeviceTypes(defaultDeviceTypes);
    }
  }, [open, apiDeviceTypes]);
  
  // Setze selectedDeviceTypeId basierend auf watchDeviceType
  useEffect(() => {
    if (watchDeviceType && deviceTypesQuery.data) {
      const deviceType = deviceTypesQuery.data.find(dt => dt.name === watchDeviceType);
      if (deviceType) {
        setSelectedDeviceTypeId(deviceType.id);
      } else {
        setSelectedDeviceTypeId(null);
      }
    } else {
      setSelectedDeviceTypeId(null);
    }
  }, [watchDeviceType, deviceTypesQuery.data]);
  
  // Abfrage für Marken basierend auf DeviceType
  const brandsQuery = getBrandsByDeviceTypeId(selectedDeviceTypeId);
  
  // Update Marken und Fehlerbeschreibungen basierend auf ausgewähltem Gerätetyp
  useEffect(() => {
    if (watchDeviceType) {
      // Lade verfügbare Fehlerbeschreibungen aus localStorage
      const issues = getIssuesForDeviceType(watchDeviceType);
      setAvailableIssues(issues);
      
      // Zurücksetzen der Marke
      form.setValue('brand', '');
    } else {
      setAvailableIssues([]);
    }
  }, [watchDeviceType, form]);
  
  // Update availableBrands wenn brandsQuery sich ändert
  useEffect(() => {
    if (brandsQuery.data) {
      const brandNames = brandsQuery.data.map(brand => brand.name);
      setAvailableBrands(brandNames);
    } else {
      setAvailableBrands([]);
    }
  }, [brandsQuery.data]);
  
  // Setze selectedBrandId basierend auf watchBrand
  useEffect(() => {
    if (watchBrand && brandsQuery.data) {
      const brand = brandsQuery.data.find(b => b.name === watchBrand);
      if (brand) {
        setSelectedBrandId(brand.id);
      } else {
        setSelectedBrandId(null);
      }
    } else {
      setSelectedBrandId(null);
    }
  }, [watchBrand, brandsQuery.data]);
  
  // Abfrage für Modellreihen basierend auf Brand
  const { data: modelSeriesData, isLoading: isLoadingModelSeries } = useQuery({
    queryKey: ['/api/model-series', { brandId: selectedBrandId }],
    enabled: !!selectedBrandId,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/model-series?brandId=${selectedBrandId}`);
      return await res.json();
    },
    staleTime: 30000, // 30 Sekunden Caching
  });
  
  // Lade gespeicherte Modellreihen, wenn sich Geräteart oder Marke ändert
  useEffect(() => {
    if (modelSeriesData) {
      // Extrahiere die Namen der Modellreihen
      const modelSeriesNames = modelSeriesData.map((ms: any) => ms.name);
      setSavedModelSeries(modelSeriesNames);
      
      // Bei Apple Smartphones keine Modellreihen anzeigen
      if (watchDeviceType?.toLowerCase() === 'smartphone' && watchBrand?.toLowerCase() === 'apple') {
        setSavedModelSeries([]);
      }
      
      // Wenn nur eine Modellreihe existiert, wähle diese automatisch aus
      if (modelSeriesNames.length === 1) {
        form.setValue('modelSeries', modelSeriesNames[0]);
      } else {
        // Zurücksetzen der Modellreihe, wenn mehr als eine existiert
        form.setValue('modelSeries', '');
      }
    } else {
      setSavedModelSeries([]);
      form.setValue('modelSeries', '');
    }
    
    // Modell zurücksetzen, wenn sich Geräteart oder Marke ändert
    form.setValue('model', '');
    setSelectedModelSeriesId(null);
  }, [watchDeviceType, watchBrand, modelSeriesData, form]);
  
  // Setze selectedModelSeriesId basierend auf watchModelSeries
  useEffect(() => {
    if (watchModelSeries && modelSeriesData) {
      const modelSeries = modelSeriesData.find((ms: any) => ms.name === watchModelSeries);
      if (modelSeries) {
        setSelectedModelSeriesId(modelSeries.id);
      } else {
        setSelectedModelSeriesId(null);
      }
    } else {
      setSelectedModelSeriesId(null);
    }
  }, [watchModelSeries, modelSeriesData]);
  
  // Abfrage für Modelle basierend auf Modellreihe
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ['/api/models', { modelSeriesId: selectedModelSeriesId }],
    enabled: !!selectedModelSeriesId,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/models?modelSeriesId=${selectedModelSeriesId}`);
      return await res.json();
    },
    staleTime: 30000, // 30 Sekunden Caching
  });
  
  // Lade gespeicherte Modelle, wenn sich Modellreihe ändert
  useEffect(() => {
    if (modelsData) {
      // Extrahiere die Namen der Modelle
      const modelNames = modelsData.map((model: any) => model.name);
      setSavedModels(modelNames);
    } else {
      setSavedModels([]);
    }
  }, [modelsData]);
  
  // Funktion zum Speichern eines Gerätetyps, wenn er nicht existiert
  const saveDeviceType = (deviceType: string) => {
    if (!deviceType) return;
    
    // API aufrufen, um den Gerätetyp zu speichern
    createDeviceTypeMutation.mutate(deviceType);
  };
  
  // Funktion zum Speichern einer neuen Fehlerbeschreibung
  const saveNewIssue = (issue: string, deviceType: string) => {
    if (issue && deviceType) {
      saveIssue(deviceType, issue);
      
      // Aktualisiere die Liste
      setAvailableIssues([...getIssuesForDeviceType(deviceType)]);
      
      toast({
        title: "Fehlerbeschreibung gespeichert",
        description: `Fehlerbeschreibung für ${deviceType} wurde gespeichert.`,
      });
    }
  };
  
  // Funktion zum Löschen einer Fehlerbeschreibung
  const handleDeleteIssue = (issue: string, deviceType: string) => {
    if (issue && deviceType) {
      deleteIssue(deviceType, issue);
      
      // Aktualisiere die Liste
      setAvailableIssues(getIssuesForDeviceType(deviceType));
      
      toast({
        title: "Fehlerbeschreibung gelöscht",
        description: `Fehlerbeschreibung für ${deviceType} wurde gelöscht.`,
      });
    }
  };
  
  // Funktion zum Überprüfen, ob ein Kunde bereits existiert
  const checkForExistingCustomer = async (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return;
    
    try {
      // API aufrufen, um nach existierenden Kunden zu suchen
      const response = await fetch(`/api/customers/search?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
      if (!response.ok) {
        throw new Error('Fehler bei der Kundensuche');
      }
      
      const customers = await response.json();
      setMatchingCustomers(customers);
      
      if (customers.length > 0) {
        setShowExistingCustomerDialog(true);
      }
    } catch (error) {
      console.error('Error searching for customers:', error);
    }
  };
  
  // Hilfsfunktion zum Ausfüllen der Kundendaten im Formular
  const fillCustomerData = (customer: Customer) => {
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone);
    if (customer.email) {
      form.setValue('email', customer.email);
    }
    if (customer.address) {
      form.setValue('address', customer.address);
    }
    if (customer.zipCode) {
      form.setValue('zipCode', customer.zipCode);
    }
    if (customer.city) {
      form.setValue('city', customer.city);
    }
    
    // Setze selected customer ID
    setSelectedCustomerId(customer.id);
  };
  
  // Funktion zum Erstellen eines Auftrags mit existierendem Kunden
  const createRepairWithExistingCustomer = async (customer: Customer, formData: OrderFormValues) => {
    try {
      // Repair data anlegen
      const repairData = {
        customerId: customer.id,
        deviceType: formData.deviceType,
        brand: formData.brand,
        modelSeries: formData.modelSeries || null,
        model: formData.model,
        serialNumber: formData.serialNumber || null,
        issue: formData.issue,
        estimatedCost: formData.estimatedCost === "" ? null : formData.estimatedCost,
        depositAmount: formData.depositAmount === "" ? null : formData.depositAmount,
        status: formData.status || 'eingegangen', // Standardwert
        notes: formData.notes
      };
      
      // Hier speichern wir das Modell, den Gerätetyp und die Marke, wenn sie Werte haben - aber nur wenn der Auftrag gespeichert wird
      if (repairData.model && repairData.deviceType && repairData.brand) {
        // Gerätetyp in der Datenbank speichern, wenn er noch nicht existiert
        const exists = apiDeviceTypes?.some(dt => dt.name.toLowerCase() === repairData.deviceType.toLowerCase());
        if (!exists) {
          createDeviceTypeMutation.mutate(repairData.deviceType);
        }
        
        // Marke und Modell jetzt in der Datenbank speichern
        saveModelDb(
          repairData.deviceType, 
          repairData.brand, 
          repairData.modelSeries, 
          repairData.model,
          selectedDeviceTypeId,
          selectedBrandId,
          createDeviceTypeMutation,
          createBrandMutation,
          createModelSeriesMutation,
          createModelsMutation
        );
      }
      
      console.log("Sending repair data:", repairData);
      await createRepairMutation.mutateAsync(repairData);
    } catch (error) {
      console.error("Error creating repair with existing customer:", error);
      // Zeige eine Fehlermeldung an
      toast({
        title: "Fehler beim Speichern",
        description: "Der Auftrag konnte nicht gespeichert werden. Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
    }
  };
  
  // Überprüft den Nachnamen, sobald er eingegeben wird
  const checkCustomerAfterLastNameInput = async (firstName: string, lastName: string) => {
    if (firstName.length >= 1 && lastName.length >= 1) {
      await checkForExistingCustomer(firstName, lastName);
    }
  };
  
  // Mutation zum Erstellen eines neuen Auftrags
  const createRepairMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/repairs', data);
      return await response.json();
    },
    onSuccess: (data) => {
      // Cache aktualisieren
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      
      // Erfolgsmeldung anzeigen
      toast({
        title: "Auftrag erstellt",
        description: `Auftrag #${data.orderNumber || data.id} wurde erfolgreich erstellt.`,
      });
      
      // Modal schließen und Formular zurücksetzen
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creating repair:', error);
      toast({
        title: "Fehler",
        description: "Der Auftrag konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation zum Erstellen eines neuen Kunden
  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/customers', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Setze selected customer ID für den nächsten Schritt
      setSelectedCustomerId(data.id);
      
      // Erfolgsmeldung anzeigen, aber nicht den Modal schließen
      toast({
        title: "Kunde erstellt",
        description: `${data.firstName} ${data.lastName} wurde erfolgreich angelegt.`,
      });
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      toast({
        title: "Fehler",
        description: "Der Kunde konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    },
  });
  
  // Handler für Formular-Submission
  const onSubmit = async (data: OrderFormValues) => {
    try {
      // Wenn kein Kunde ausgewählt wurde, erstellen wir einen neuen Kunden
      if (!selectedCustomerId) {
        const customerData = {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          zipCode: data.zipCode || null,
          city: data.city || null
        };
        
        // Kunden erstellen
        await createCustomerMutation.mutateAsync(customerData);
      }
      
      // Jetzt wird der Auftrag erstellt mit der Kunden-ID
      const repairData = {
        customerId: selectedCustomerId,
        deviceType: data.deviceType,
        brand: data.brand,
        modelSeries: data.modelSeries || null,
        model: data.model,
        serialNumber: data.serialNumber || null,
        issue: data.issue,
        estimatedCost: data.estimatedCost === "" ? null : data.estimatedCost,
        depositAmount: data.depositAmount === "" ? null : data.depositAmount,
        status: data.status || 'eingegangen',
        notes: data.notes || null
      };
      
      // Speichern des Gerätehierarchie mit der Datenbank-API
      if (repairData.model && repairData.deviceType && repairData.brand) {
        // Gerätetyp in der Datenbank speichern, wenn er noch nicht existiert
        const exists = apiDeviceTypes?.some(dt => dt.name.toLowerCase() === repairData.deviceType.toLowerCase());
        if (!exists) {
          createDeviceTypeMutation.mutate(repairData.deviceType);
        }
        
        // Marke und Modell jetzt in der Datenbank speichern
        saveModelDb(
          repairData.deviceType, 
          repairData.brand, 
          repairData.modelSeries, 
          repairData.model,
          selectedDeviceTypeId,
          selectedBrandId,
          createDeviceTypeMutation,
          createBrandMutation,
          createModelSeriesMutation,
          createModelsMutation
        );
      }
      
      // Fehlerbeschreibung im localStorage speichern, wenn sie nicht existiert
      if (data.issue && !availableIssues.includes(data.issue)) {
        saveNewIssue(data.issue, data.deviceType);
      }
      
      // Auftrag erstellen
      await createRepairMutation.mutateAsync(repairData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Fehler",
        description: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };
  
  // Handler für Benutzeraktionen bei vorhandenen Kunden  
  const handleUseExistingCustomer = (customer: Customer) => {
    // Dialog schließen und Daten übernehmen
    setShowExistingCustomerDialog(false);
    
    // Kundeninformationen in das Formular eintragen
    fillCustomerData(customer);
    
    // Fokus auf das nächste Feld setzen
    setTimeout(() => {
      const deviceTypeInput = document.querySelector('input[name="deviceType"]');
      if (deviceTypeInput) {
        (deviceTypeInput as HTMLInputElement).focus();
      }
    }, 100);
  };
  
  // Tastatur-Navigation für Dropdown-Listen
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: string) => {
    if (type === 'issue') {
      // Für die Fehlerbeschreibung
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIssueIndex(prev => {
          const filtered = availableIssues.filter(issue => 
            !filterText || issue.toLowerCase().includes(filterText.toLowerCase())
          );
          return Math.min(prev + 1, filtered.length - 1);
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIssueIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIssueIndex >= 0) {
        e.preventDefault();
        const filtered = availableIssues.filter(issue => 
          !filterText || issue.toLowerCase().includes(filterText.toLowerCase())
        );
        if (filtered[selectedIssueIndex]) {
          form.setValue('issue', filtered[selectedIssueIndex]);
          setIsIssueDropdownOpen(false);
        }
      } else if (e.key === 'Tab') {
        setIsIssueDropdownOpen(false);
      } else {
        // Filtertext aktualisieren
        setFilterText((e.target as HTMLInputElement).value);
        // Wenn der Benutzer etwas tippt, wird der Index zurückgesetzt
        setSelectedIssueIndex(-1);
      }
    }
  };
  
  // Rendere das Modal mit dem Formular
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Reparaturauftrag</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kundeninformationen</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vorname*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Vorname" 
                              {...field} 
                              onBlur={(e) => {
                                field.onBlur();
                                if (field.value && form.getValues('lastName')) {
                                  checkCustomerAfterLastNameInput(field.value, form.getValues('lastName'));
                                }
                              }}
                              autoFocus
                            />
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
                          <FormLabel>Nachname*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nachname" 
                              {...field} 
                              onBlur={(e) => {
                                field.onBlur();
                                if (field.value && form.getValues('firstName')) {
                                  checkCustomerAfterLastNameInput(form.getValues('firstName'), field.value);
                                }
                              }}
                            />
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
                        <FormLabel>Telefon*</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefonnummer" {...field} />
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
                          <Input placeholder="E-Mail-Adresse (optional)" {...field} />
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
                          <Input placeholder="Straße und Hausnummer (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ</FormLabel>
                          <FormControl>
                            <Input placeholder="Postleitzahl (optional)" {...field} />
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
                          <FormLabel>Ort</FormLabel>
                          <FormControl>
                            <Input placeholder="Ort (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Geräteinformationen</h3>
                  
                  <FormField
                    control={form.control}
                    name="deviceType"
                    render={({ field }) => (
                      <FormItem className="relative">
                        <FormLabel>Geräteart*</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="z.B. Smartphone, Tablet, etc."
                              onFocus={() => setIsDeviceTypeDropdownOpen(true)}
                              onBlur={() => {
                                // Verzögerung hinzufügen, damit der Klick auf ein Element registriert wird
                                setTimeout(() => setIsDeviceTypeDropdownOpen(false), 200);
                                
                                // Standard onBlur-Verhalten
                                field.onBlur();
                                
                                // Gerätetyp speichern, wenn er nicht existiert
                                if (field.value && !savedDeviceTypes.includes(field.value)) {
                                  saveDeviceType(field.value);
                                }
                              }}
                              autoComplete="off"
                            />
                            
                            {isDeviceTypeDropdownOpen && savedDeviceTypes.length > 0 && (
                              <div className="absolute z-10 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                                {savedDeviceTypes.map((type, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-2 hover:bg-gray-100 cursor-pointer ${selectedDeviceTypeIndex === index ? 'bg-gray-100' : ''}`}
                                    onClick={() => {
                                      form.setValue('deviceType', type);
                                      setIsDeviceTypeDropdownOpen(false);
                                    }}
                                  >
                                    {type}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem className="relative">
                        <FormLabel>Marke*</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="z.B. Apple, Samsung, etc."
                              onFocus={() => setIsBrandDropdownOpen(true)}
                              onBlur={() => {
                                setTimeout(() => setIsBrandDropdownOpen(false), 200);
                                field.onBlur();
                              }}
                              autoComplete="off"
                              disabled={!watchDeviceType} // Deaktivieren, wenn keine Geräteart ausgewählt
                            />
                            
                            {isBrandDropdownOpen && availableBrands.length > 0 && (
                              <div className="absolute z-10 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                                {availableBrands.map((brand, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-2 hover:bg-gray-100 cursor-pointer ${selectedBrandIndex === index ? 'bg-gray-100' : ''}`}
                                    onClick={() => {
                                      form.setValue('brand', brand);
                                      setIsBrandDropdownOpen(false);
                                    }}
                                  >
                                    {brand}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Modellreihe-Feld - nur anzeigen, wenn Modellreihen verfügbar sind */}
                  {savedModelSeries.length > 0 && (
                    <FormField
                      control={form.control}
                      name="modelSeries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modellreihe</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Modellreihe auswählen (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {savedModelSeries.map((series, index) => (
                                <SelectItem key={index} value={series}>
                                  {series}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem className="relative">
                        <FormLabel>Modell*</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="z.B. iPhone 15 Pro"
                              onFocus={() => setIsModelDropdownOpen(true)}
                              onBlur={() => {
                                setTimeout(() => setIsModelDropdownOpen(false), 200);
                                field.onBlur();
                              }}
                              autoComplete="off"
                              disabled={!watchBrand} // Deaktivieren, wenn keine Marke ausgewählt
                            />
                            
                            {isModelDropdownOpen && savedModels.length > 0 && (
                              <div className="absolute z-10 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                                {savedModels.map((model, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-2 hover:bg-gray-100 cursor-pointer ${selectedModelIndex === index ? 'bg-gray-100' : ''}`}
                                    onClick={() => {
                                      form.setValue('model', model);
                                      setIsModelDropdownOpen(false);
                                    }}
                                  >
                                    {model}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Auftragsdetails</h3>
                
                <FormField
                  control={form.control}
                  name="issue"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel>Fehlerbeschreibung*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            {...field} 
                            placeholder="Beschreibung des Problems"
                            onFocus={() => setIsIssueDropdownOpen(true)}
                            onKeyDown={(e) => handleKeyDown(e, 'issue')}
                            onBlur={() => {
                              setTimeout(() => setIsIssueDropdownOpen(false), 200);
                              field.onBlur();
                            }}
                            autoComplete="off"
                          />
                          
                          {isIssueDropdownOpen && availableIssues.length > 0 && (
                            <div className="absolute z-10 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
                              {availableIssues
                                .filter(issue => !filterText || issue.toLowerCase().includes(filterText.toLowerCase()))
                                .map((issue, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center ${selectedIssueIndex === index ? 'bg-gray-100' : ''}`}
                                    onClick={() => {
                                      form.setValue('issue', issue);
                                      setIsIssueDropdownOpen(false);
                                    }}
                                  >
                                    <span>{issue}</span>
                                    <button
                                      type="button"
                                      className="text-red-500 hover:bg-red-100 rounded-full w-5 h-5 flex items-center justify-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteIssue(issue, watchDeviceType);
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kostenvoranschlag</FormLabel>
                        <FormControl>
                          <Input placeholder="Betrag in €" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anzahlung</FormLabel>
                        <FormControl>
                          <Input placeholder="Betrag in €" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status*</FormLabel>
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
                      <FormLabel>Notizen</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Interne Notizen zum Auftrag"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRepairMutation.isPending || createCustomerMutation.isPending}
                >
                  {createRepairMutation.isPending || createCustomerMutation.isPending ? 
                    'Wird gespeichert...' : 'Auftrag erstellen'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog für existierende Kunden */}
      <AlertDialog open={showExistingCustomerDialog} onOpenChange={setShowExistingCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde existiert bereits</AlertDialogTitle>
            <AlertDialogDescription>
              Es wurden {matchingCustomers.length} Kunden mit ähnlichem Namen gefunden. 
              Möchten Sie einen bestehenden Kunden verwenden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-60 overflow-y-auto">
            {matchingCustomers.map((customer, index) => (
              <div 
                key={customer.id} 
                className={`p-3 mb-2 border rounded cursor-pointer hover:bg-gray-50 ${selectedCustomerIndex === index ? 'border-primary' : 'border-gray-200'}`}
                onClick={() => setSelectedCustomerIndex(index)}
              >
                <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                <div className="text-sm text-gray-500">Tel: {customer.phone}</div>
                {customer.email && <div className="text-sm text-gray-500">E-Mail: {customer.email}</div>}
                {customer.address && <div className="text-sm text-gray-500">Adresse: {customer.address}</div>}
              </div>
            ))}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExistingCustomerDialog(false)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCustomerIndex >= 0 && matchingCustomers[selectedCustomerIndex]) {
                  handleUseExistingCustomer(matchingCustomers[selectedCustomerIndex]);
                }
              }}
              disabled={selectedCustomerIndex < 0}
            >
              Verwenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}