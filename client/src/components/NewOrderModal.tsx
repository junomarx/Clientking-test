import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { Customer } from '@/lib/types';
import { useDeviceTypes } from '@/hooks/useDeviceTypes';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { useModelSeries, type CreateModelSeriesDTO } from '@/hooks/useModelSeries';
// Die lokalen Fehlerbeschreibungen werden nicht mehr verwendet
// Stattdessen werden die Fehlerbeschreibungen aus der Datenbank geladen
import { 
  getBrandsForDeviceType,
  clearAllModels,
  deleteModelLegacy
} from '@/lib/deviceHelpers';
import { saveModelDb } from '@/utils/modelUtils';
import { X } from 'lucide-react';

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

// Standard-Herstellern für gängige Gerätetypen als Fallback, wenn keine gespeicherten Werte vorhanden sind
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
  brand: z.string().min(1, { message: 'Bitte Hersteller auswählen' }),
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

export function NewOrderModal({ open, onClose, customerId }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // States für die Formularfelder und UI
  const [availableIssues, setAvailableIssues] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [savedModelSeries, setSavedModelSeries] = useState<string[]>([]);
  const [savedModels, setSavedModels] = useState<string[]>([]);
  const [issueFields, setIssueFields] = useState<string[]>(['']); // Array für mehrere Fehlerbeschreibungsfelder
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelSeriesId, setSelectedModelSeriesId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(customerId || null);
  const [filterText, setFilterText] = useState<string>('');  
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(-1);  
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);
  const [showIssueDropdown, setShowIssueDropdown] = useState<boolean>(false);
  const [isModelChanged, setIsModelChanged] = useState(false);
  const [showExistingCustomerDialog, setShowExistingCustomerDialog] = useState<boolean>(false);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  
  // Dropdown-Menüs States
  const [deviceTypeDropdown, setDeviceTypeDropdown] = useState<string[]>([]);
  const [selectedDeviceTypeIndex, setSelectedDeviceTypeIndex] = useState<number>(-1);
  const [brandDropdown, setBrandDropdown] = useState<string[]>([]);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState<number>(-1);
  const [modelDropdown, setModelDropdown] = useState<string[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(-1);
  
  // Prüfen, ob der aktuelle Benutzer Bugi (Admin) ist
  const isAdmin = user?.id === 3;
  
  // Hooks für API-Anfragen
  const deviceTypes = useDeviceTypes();
  const brands = useBrands();
  const modelSeries = useModelSeries();
  const models = useModels();
  
  // Query-Hooks aufrufen
  const deviceTypesQuery = deviceTypes.getAllDeviceTypes();
  const createDeviceTypeMutation = deviceTypes.createDeviceType();
  const brandMutation = brands.createBrand();
  const modelSeriesMutation = modelSeries.createModelSeries();
  const modelsMutation = models.createModels();
  
  // API Device Types
  const apiDeviceTypes = deviceTypesQuery.data;
  
  // Formular erstellen
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
  
  // Formular zurücksetzen und ggf. mit Kundendaten füllen, wenn das Modal geöffnet wird
  useEffect(() => {
    if (open) {
      // Alle Zustandsvariablen zurücksetzen
      setAvailableIssues([]);
      setAvailableBrands([]);
      setSavedModelSeries([]);
      setSavedModels([]);
      setIssueFields(['']); // Nur ein leeres Feld für Fehlerbeschreibung
      setSelectedDeviceTypeId(null);
      setSelectedBrandId(null);
      setSelectedModelSeriesId(null);
      if (!customerId) {
        setSelectedCustomerId(null);
      }
      setFilterText('');
      setSelectedIssueIndex(-1);
      setSelectedCustomerIndex(-1);
      setShowIssueDropdown(false);
      setIsModelChanged(false);
      setMatchingCustomers([]);
      
      // Formular zurücksetzen
      form.reset();
      
      // Prüfen, ob Kundendaten im localStorage vorhanden sind
      const savedCustomerData = localStorage.getItem('selectedCustomerData');
      if (savedCustomerData) {
        try {
          const customerData = JSON.parse(savedCustomerData);
          console.log('Gespeicherte Kundendaten gefunden:', customerData);
          
          // Formular mit Kundendaten aus localStorage vorausfüllen
          form.setValue('firstName', customerData.firstName || '');
          form.setValue('lastName', customerData.lastName || '');
          form.setValue('phone', customerData.phone || '');
          form.setValue('email', customerData.email || '');
          form.setValue('address', customerData.address || '');
          form.setValue('zipCode', customerData.zipCode || '');
          form.setValue('city', customerData.city || '');
          
          // Automatisch in den Geräte-Tab springen, indem wir den Fokus auf das Gerätetyp-Feld setzen
          setTimeout(() => {
            const deviceTypeInput = document.getElementById('deviceType');
            if (deviceTypeInput) {
              deviceTypeInput.focus();
            }
          }, 300);
          
          // Kundendaten aus dem localStorage entfernen, damit sie nicht für den nächsten Auftrag verwendet werden
          localStorage.removeItem('selectedCustomerData');
        } catch (error) {
          console.error('Fehler beim Parsen der gespeicherten Kundendaten:', error);
        }
      }
    }
  }, [open, customerId]);
  
  // Wichtige Form-Values, die beobachtet werden
  const watchDeviceType = form.watch('deviceType');
  const watchBrand = form.watch('brand');
  const watchModelSeries = form.watch('modelSeries');
  const watchModel = form.watch('model');
  const watchIssue = form.watch('issue');
  
  // Setze device type id basierend auf watchDeviceType
  useEffect(() => {
    if (watchDeviceType && apiDeviceTypes) {
      const deviceType = apiDeviceTypes.find(dt => dt.name === watchDeviceType);
      if (deviceType) {
        setSelectedDeviceTypeId(deviceType.id);
      } else {
        setSelectedDeviceTypeId(null);
      }
    } else {
      setSelectedDeviceTypeId(null);
    }
  }, [watchDeviceType, deviceTypesQuery.data]);
  
  // Abfrage für Herstellern basierend auf DeviceType
  const brandsQuery = brands.getBrandsByDeviceTypeId(selectedDeviceTypeId);
  
  // Fehlerbeschreibungen von der Datenbank laden
  const { data: deviceIssues, isLoading: isLoadingIssues } = useQuery({
    queryKey: ['/api/device-issues', watchDeviceType],
    enabled: !!watchDeviceType,
    queryFn: async () => {
      if (!watchDeviceType) return [];
      const response = await apiRequest('GET', `/api/device-issues/${watchDeviceType}`);
      return await response.json();
    },
  });

  // Update Herstellern und Fehlerbeschreibungen basierend auf ausgewähltem Gerätetyp
  useEffect(() => {
    if (watchDeviceType) {
      // Zurücksetzen der Hersteller
      form.setValue('brand', '');
    }
  }, [watchDeviceType, form]);
  
  // Aktualisiere die verfügbaren Fehlerbeschreibungen, wenn die API-Abfrage abgeschlossen ist
  useEffect(() => {
    if (deviceIssues) {
      setAvailableIssues(deviceIssues);
    } else {
      setAvailableIssues([]);
    }
  }, [deviceIssues]);
  
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
  
  // Lade gespeicherte Modellreihen, wenn sich Geräteart oder Hersteller ändert
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
    
    // Modell zurücksetzen, wenn sich Geräteart oder Hersteller ändert
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
    createDeviceTypeMutation.mutate({ name: deviceType });
  };
  
  // Funktion zum Hinzufügen einer neuen Fehlerbeschreibung
  const addIssueToField = (issue: string, index: number = 0) => {
    // Aktualisiere das entsprechende Feld im Array
    const newIssueFields = [...issueFields];
    newIssueFields[index] = issue;
    
    // Füge ein neues leeres Feld hinzu
    newIssueFields.push('');
    
    // Aktualisiere den State
    setIssueFields(newIssueFields);
    
    // Aktualisiere auch das Formular-Feld für die Submission
    const combinedIssues = newIssueFields.filter(i => i.trim() !== '').join(', ');
    form.setValue('issue', combinedIssues);
    
    // Dropdown schließen
    setShowIssueDropdown(false);
  };
  
  // Funktion zum Löschen einer eingegebenen Fehlerbeschreibung aus dem Formular
  const removeIssueField = (index: number) => {
    const newIssueFields = [...issueFields];
    newIssueFields.splice(index, 1);
    
    // Wenn alle Felder gelöscht wurden, füge ein leeres Feld hinzu
    if (newIssueFields.length === 0) {
      newIssueFields.push('');
    }
    
    setIssueFields(newIssueFields);
    
    // Aktualisiere das Formular-Feld
    const combinedIssues = newIssueFields.filter(i => i.trim() !== '').join(', ');
    form.setValue('issue', combinedIssues);
  };
  
  // Funktion zum Überprüfen, ob ein Kunde bereits existiert
  const checkForExistingCustomer = async (firstName: string, lastName: string) => {
    if (!firstName || !lastName) return;
    
    try {
      // API aufrufen, um nach existierenden Kunden zu suchen
      // Die API filtert bereits nach der UserID des eingeloggten Benutzers
      const response = await apiRequest('GET', `/api/customers?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
      const customers = await response.json();
      
      console.log(`Found ${customers.length} matching customers for ${firstName} ${lastName}`);
      
      // Kunden im State speichern für das Dropdown
      setMatchingCustomers(customers);
      
      // WICHTIG: Auto-Vervollständigung nur anzeigen, nicht automatisch ausfüllen
      // Benutzer soll selbst auswählen können
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
      
      // Hier speichern wir das Modell, den Gerätetyp und die Hersteller, wenn sie Werte haben - aber nur wenn der Auftrag gespeichert wird
      // und nur wenn der Benutzer Admin ist (Bugi, ID 3)
      if (repairData.model && repairData.deviceType && repairData.brand && isAdmin) {
        // Gerätetyp in der Datenbank speichern, wenn er noch nicht existiert
        const exists = apiDeviceTypes?.some(dt => dt.name.toLowerCase() === repairData.deviceType.toLowerCase());
        if (!exists) {
          createDeviceTypeMutation.mutate({ name: repairData.deviceType });
        }
        
        // Hersteller und Modell jetzt in der Datenbank speichern
        const success = saveModelDb(
          repairData.deviceType, 
          repairData.brand, 
          repairData.modelSeries, 
          repairData.model,
          selectedDeviceTypeId,
          selectedBrandId,
          createDeviceTypeMutation,
          brandMutation,
          modelSeriesMutation,
          modelsMutation,
          user
        );
        
        if (!success) {
          console.log("Keine Berechtigung zum Erstellen neuer Modelle - nur vorhandene Modelle können genutzt werden");
        }
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
  
  // Debounce-Timer-ID
  const [searchTimerId, setSearchTimerId] = useState<number | null>(null);
  
  // Überprüft den Nachnamen, sobald er eingegeben wird, aber mit Verzögerung (Debouncing)
  const checkCustomerAfterLastNameInput = (firstName: string, lastName: string) => {
    // Bereits bei einem einzigen Buchstaben im Nachnamen nach Kunden suchen
    if (firstName.length >= 1 && lastName.length >= 1) {
      // Bestehenden Timer löschen, wenn einer existiert
      if (searchTimerId) {
        window.clearTimeout(searchTimerId);
      }
      
      // Neuen Timer setzen (300ms Verzögerung)
      const timerId = window.setTimeout(() => {
        checkForExistingCustomer(firstName, lastName);
      }, 300);
      
      setSearchTimerId(timerId as unknown as number);
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
      // aber nur wenn der Benutzer Admin ist (Bugi, ID 3)
      if (repairData.model && repairData.deviceType && repairData.brand && isAdmin) {
        // Gerätetyp in der Datenbank speichern, wenn er noch nicht existiert
        const exists = apiDeviceTypes?.some(dt => dt.name.toLowerCase() === repairData.deviceType.toLowerCase());
        if (!exists) {
          createDeviceTypeMutation.mutate({ name: repairData.deviceType });
        }
        
        // Hersteller und Modell jetzt in der Datenbank speichern
        const success = saveModelDb(
          repairData.deviceType, 
          repairData.brand, 
          repairData.modelSeries, 
          repairData.model,
          selectedDeviceTypeId,
          selectedBrandId,
          createDeviceTypeMutation,
          brandMutation,
          modelSeriesMutation,
          modelsMutation,
          user
        );
        
        if (!success) {
          console.log("Keine Berechtigung zum Erstellen neuer Modelle - nur vorhandene Modelle können genutzt werden");
        }
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: string, index: number = 0) => {
    if (type === 'issue') {
      // Für die Fehlerbeschreibung
      if (availableIssues.length > 0) {
        // Hole den aktuellen Wert des aktiven Feldes
        const currentValue = issueFields[index];
        
        // Filter basierend auf aktueller Eingabe
        const filtered = availableIssues.filter(issue => 
          !currentValue || issue.toLowerCase().includes(currentValue.toLowerCase())
        );
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIssueIndex(prev => Math.min(prev + 1, filtered.length - 1));
          setShowIssueDropdown(true);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIssueIndex(prev => Math.max(prev - 1, 0));
          setShowIssueDropdown(true);
        } else if (e.key === 'Enter' && selectedIssueIndex >= 0) {
          e.preventDefault();
          if (filtered[selectedIssueIndex]) {
            // Ausgewählte Fehlerbeschreibung hinzufügen und neues Feld erstellen
            addIssueToField(filtered[selectedIssueIndex], index);
            setSelectedIssueIndex(-1);
          }
        } else if (e.key === 'Tab' && selectedIssueIndex >= 0) {
          e.preventDefault();
          if (filtered[selectedIssueIndex]) {
            // Ausgewählte Fehlerbeschreibung hinzufügen und neues Feld erstellen
            addIssueToField(filtered[selectedIssueIndex], index);
            
            // Fokus auf das nächste Feld setzen
            setTimeout(() => {
              const nextField = document.querySelector('input[name="estimatedCost"]');
              if (nextField) {
                (nextField as HTMLInputElement).focus();
              }
            }, 100);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedIssueIndex(-1);
          setShowIssueDropdown(false);
        } else {
          // Zeige Dropdown bei Eingabe
          setShowIssueDropdown(true);
        }
      }
    }
  };

  // Rendere das Modal mit dem Formular
  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Auftrag</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Kundeninformationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Kundeninformationen</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Vorname" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Sofortige Prüfung beim Tippen, nicht erst beim onBlur
                              if (form.getValues('lastName')) {
                                checkCustomerAfterLastNameInput(e.target.value, form.getValues('lastName'));
                              }
                            }}
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
                      <FormItem className="relative">
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nachname" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              // Sofortige Prüfung beim Tippen, nicht erst beim onBlur
                              if (form.getValues('firstName')) {
                                checkCustomerAfterLastNameInput(form.getValues('firstName'), e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              // Tastaturnavigation im Dropdown
                              if (matchingCustomers.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSelectedCustomerIndex(prev => Math.min(prev + 1, matchingCustomers.length - 1));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedCustomerIndex(prev => Math.max(prev - 1, 0));
                                } else if (e.key === 'Enter' && selectedCustomerIndex >= 0) {
                                  e.preventDefault();
                                  const selectedCustomer = matchingCustomers[selectedCustomerIndex];
                                  if (selectedCustomer) {
                                    fillCustomerData(selectedCustomer);
                                    // Dropdown schließen
                                    setMatchingCustomers([]);
                                  }
                                } else if (e.key === 'Tab' && selectedCustomerIndex >= 0) {
                                  e.preventDefault();
                                  const selectedCustomer = matchingCustomers[selectedCustomerIndex];
                                  if (selectedCustomer) {
                                    fillCustomerData(selectedCustomer);
                                    // Dropdown schließen
                                    setMatchingCustomers([]);
                                    
                                    // Fokus auf das Gerätetyp-Feld setzen
                                    setTimeout(() => {
                                      const deviceTypeInput = document.querySelector('input[name="deviceType"]');
                                      if (deviceTypeInput) {
                                        (deviceTypeInput as HTMLInputElement).focus();
                                      }
                                    }, 100);
                                  }
                                } else if (e.key === 'Escape') {
                                  // Dropdown schließen bei Escape
                                  setMatchingCustomers([]);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        {/* Dropdown für gefundene Kunden direkt unter dem Eingabefeld */}
                        {matchingCustomers.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                            <div className="py-1 max-h-60 overflow-auto">
                              {matchingCustomers.map((customer, index) => (
                                <div 
                                  key={customer.id} 
                                  className={`px-3 py-2 cursor-pointer ${selectedCustomerIndex === index ? 'bg-primary/20' : 'hover:bg-muted'}`}
                                  onClick={() => fillCustomerData(customer)}
                                >
                                  <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                                  <div className="text-sm text-gray-500">{customer.phone}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
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
                        <FormLabel>E-Mail <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="E-Mail" {...field} />
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
                        <FormLabel>Adresse <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Straße und Hausnummer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="PLZ" {...field} />
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
                          <FormLabel>Ort <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Ort" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              {/* Geräteinformationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Geräteinformationen</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="deviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geräteart</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="z.B. Smartphone, Tablet, etc." 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                // Reset dependent fields
                                form.setValue('brand', '');
                                form.setValue('modelSeries', '');
                                form.setValue('model', '');
                                
                                // Filter die Gerätetypen
                                if (e.target.value && apiDeviceTypes) {
                                  const filteredTypes = apiDeviceTypes
                                    .map(dt => dt.name)
                                    .filter(name => name.toLowerCase().includes(e.target.value.toLowerCase()));
                                  setDeviceTypeDropdown(filteredTypes);
                                  setSelectedDeviceTypeIndex(-1);
                                } else if (!e.target.value && apiDeviceTypes) {
                                  // Alle Gerätetypen anzeigen wenn Feld leer
                                  setDeviceTypeDropdown(apiDeviceTypes.map(dt => dt.name));
                                  setSelectedDeviceTypeIndex(-1);
                                } else {
                                  setDeviceTypeDropdown([]);
                                }
                              }}
                              onFocus={() => {
                                // Zeige alle verfügbaren Gerätetypen an, wenn Fokus aufs Feld gesetzt wird
                                if (apiDeviceTypes) {
                                  setDeviceTypeDropdown(apiDeviceTypes.map(dt => dt.name));
                                } else {
                                  setDeviceTypeDropdown(defaultDeviceTypes);
                                }
                              }}
                              onBlur={() => {
                                // Dropdown ausblenden wenn Fokus verloren geht
                                // Verzögerung, damit Klick auf Dropdown-Element möglich ist
                                setTimeout(() => setDeviceTypeDropdown([]), 200);
                              }}
                              onKeyDown={(e) => {
                                // Tastaturnavigation im Dropdown
                                if (deviceTypeDropdown.length > 0) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedDeviceTypeIndex(prev => Math.min(prev + 1, deviceTypeDropdown.length - 1));
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedDeviceTypeIndex(prev => Math.max(prev - 1, 0));
                                  } else if (e.key === 'Enter' && selectedDeviceTypeIndex >= 0) {
                                    e.preventDefault();
                                    const selectedType = deviceTypeDropdown[selectedDeviceTypeIndex];
                                    form.setValue('deviceType', selectedType);
                                    setDeviceTypeDropdown([]);
                                  } else if (e.key === 'Tab' && selectedDeviceTypeIndex >= 0) {
                                    e.preventDefault();
                                    const selectedType = deviceTypeDropdown[selectedDeviceTypeIndex];
                                    form.setValue('deviceType', selectedType);
                                    setDeviceTypeDropdown([]);
                                    
                                    // Fokus auf das nächste Feld setzen
                                    setTimeout(() => {
                                      const brandInput = document.querySelector('input[name="brand"]');
                                      if (brandInput) {
                                        (brandInput as HTMLInputElement).focus();
                                      }
                                    }, 100);
                                  } else if (e.key === 'Escape') {
                                    // Dropdown schließen bei Escape
                                    setDeviceTypeDropdown([]);
                                  }
                                }
                              }}
                            />
                            {/* Dropdown für Gerätearten */}
                            {deviceTypeDropdown.length > 0 && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                <div className="py-1 max-h-60 overflow-auto">
                                  {deviceTypeDropdown.map((type, index) => (
                                    <div 
                                      key={index} 
                                      className={`px-3 py-2 cursor-pointer ${selectedDeviceTypeIndex === index ? 'bg-primary/20' : 'hover:bg-muted'}`}
                                      onClick={() => {
                                        form.setValue('deviceType', type);
                                        setDeviceTypeDropdown([]);
                                      }}
                                    >
                                      <div className="font-medium">{type}</div>
                                    </div>
                                  ))}
                                </div>
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
                      <FormItem>
                        <FormLabel>Hersteller</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="z.B. Apple, Samsung, etc." 
                              {...field} 
                              disabled={!watchDeviceType}
                              onChange={(e) => {
                                field.onChange(e);
                                // Reset dependent fields
                                form.setValue('modelSeries', '');
                                form.setValue('model', '');
                                
                                // Filter die Herstellern
                                if (e.target.value && availableBrands.length > 0) {
                                  const filteredBrands = availableBrands
                                    .filter(name => name.toLowerCase().includes(e.target.value.toLowerCase()));
                                  setBrandDropdown(filteredBrands);
                                  setSelectedBrandIndex(-1);
                                } else if (!e.target.value && availableBrands.length > 0) {
                                  // Alle Herstellern anzeigen wenn Feld leer
                                  setBrandDropdown(availableBrands);
                                  setSelectedBrandIndex(-1);
                                } else if (watchDeviceType && defaultBrands[watchDeviceType.toLowerCase()]) {
                                  // Fallback zu Standard-Herstellern
                                  const defaultBrandList = defaultBrands[watchDeviceType.toLowerCase()];
                                  setBrandDropdown(defaultBrandList);
                                } else {
                                  setBrandDropdown([]);
                                }
                              }}
                              onFocus={() => {
                                // Zeige alle verfügbaren Herstellern an, wenn Fokus aufs Feld gesetzt wird
                                if (availableBrands.length > 0) {
                                  setBrandDropdown(availableBrands);
                                } else if (watchDeviceType && defaultBrands[watchDeviceType.toLowerCase()]) {
                                  // Fallback zu Standard-Herstellern
                                  setBrandDropdown(defaultBrands[watchDeviceType.toLowerCase()]);
                                }
                              }}
                              onBlur={() => {
                                // Dropdown ausblenden wenn Fokus verloren geht (mit Verzögerung)
                                setTimeout(() => setBrandDropdown([]), 200);
                              }}
                              onKeyDown={(e) => {
                                // Tastaturnavigation im Dropdown
                                if (brandDropdown.length > 0) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setSelectedBrandIndex(prev => Math.min(prev + 1, brandDropdown.length - 1));
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setSelectedBrandIndex(prev => Math.max(prev - 1, 0));
                                  } else if (e.key === 'Enter' && selectedBrandIndex >= 0) {
                                    e.preventDefault();
                                    const selectedBrand = brandDropdown[selectedBrandIndex];
                                    form.setValue('brand', selectedBrand);
                                    setBrandDropdown([]);
                                  } else if (e.key === 'Tab' && selectedBrandIndex >= 0) {
                                    e.preventDefault();
                                    const selectedBrand = brandDropdown[selectedBrandIndex];
                                    form.setValue('brand', selectedBrand);
                                    setBrandDropdown([]);
                                    
                                    // Fokus auf das nächste Feld setzen
                                    setTimeout(() => {
                                      if (savedModelSeries.length > 0) {
                                        // Falls Modellreihen vorhanden, setze Fokus auf Modellreihen-Dropdown
                                        const modelSeriesButton = document.querySelector('.modelseries-select button');
                                        if (modelSeriesButton) {
                                          (modelSeriesButton as HTMLButtonElement).focus();
                                        }
                                      } else {
                                        // Ansonsten direkt auf das Modell-Feld
                                        const modelInput = document.querySelector('input[name="model"]');
                                        if (modelInput) {
                                          (modelInput as HTMLInputElement).focus();
                                        }
                                      }
                                    }, 100);
                                  } else if (e.key === 'Escape') {
                                    // Dropdown schließen bei Escape
                                    setBrandDropdown([]);
                                  }
                                }
                              }}
                            />
                            {/* Dropdown für Herstellern */}
                            {brandDropdown.length > 0 && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                <div className="py-1 max-h-60 overflow-auto">
                                  {brandDropdown.map((brand, index) => (
                                    <div 
                                      key={index} 
                                      className={`px-3 py-2 cursor-pointer ${selectedBrandIndex === index ? 'bg-primary/20' : 'hover:bg-muted'}`}
                                      onClick={() => {
                                        form.setValue('brand', brand);
                                        setBrandDropdown([]);
                                      }}
                                    >
                                      <div className="font-medium">{brand}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Modellreihenfeld anzeigen, wenn sie verfügbar sind */}
                  {savedModelSeries.length > 0 && (
                    <FormField
                      control={form.control}
                      name="modelSeries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modellreihe</FormLabel>
                          <Select 
                            disabled={!watchBrand || isLoadingModelSeries}
                            onValueChange={field.onChange}
                            value={field.value}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="modelseries-select">
                                <SelectValue placeholder="Modellreihe auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {savedModelSeries.map((series, index) => (
                                <SelectItem key={index} value={series}>{series}</SelectItem>
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
                    render={({ field }) => {
                      const isDisabled = 
                        (!watchBrand) || 
                        (savedModelSeries.length > 0 && !watchModelSeries);
                      
                      return (
                        <FormItem>
                          <FormLabel>Modell</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="z.B. iPhone 13, Galaxy S21, etc." 
                                {...field} 
                                disabled={isDisabled}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setIsModelChanged(true);
                                  
                                  // Filter die Modelle
                                  if (e.target.value && savedModels.length > 0) {
                                    const filteredModels = savedModels
                                      .filter(name => name.toLowerCase().includes(e.target.value.toLowerCase()));
                                    setModelDropdown(filteredModels);
                                    setSelectedModelIndex(-1);
                                  } else if (!e.target.value && savedModels.length > 0) {
                                    // Alle Modelle anzeigen wenn Feld leer
                                    setModelDropdown(savedModels);
                                    setSelectedModelIndex(-1);
                                  } else {
                                    setModelDropdown([]);
                                  }
                                }}
                                onFocus={() => {
                                  // Zeige alle verfügbaren Modelle an, wenn Fokus aufs Feld gesetzt wird
                                  if (savedModels.length > 0) {
                                    setModelDropdown(savedModels);
                                  }
                                }}
                                onBlur={() => {
                                  // Dropdown ausblenden wenn Fokus verloren geht (mit Verzögerung)
                                  setTimeout(() => setModelDropdown([]), 200);
                                }}
                                onKeyDown={(e) => {
                                  // Tastaturnavigation im Dropdown
                                  if (modelDropdown.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      setSelectedModelIndex(prev => Math.min(prev + 1, modelDropdown.length - 1));
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setSelectedModelIndex(prev => Math.max(prev - 1, 0));
                                    } else if (e.key === 'Enter' && selectedModelIndex >= 0) {
                                      e.preventDefault();
                                      const selectedModel = modelDropdown[selectedModelIndex];
                                      form.setValue('model', selectedModel);
                                      setModelDropdown([]);
                                    } else if (e.key === 'Tab' && selectedModelIndex >= 0) {
                                      e.preventDefault();
                                      const selectedModel = modelDropdown[selectedModelIndex];
                                      form.setValue('model', selectedModel);
                                      setModelDropdown([]);
                                      
                                      // Fokus auf das nächste Feld setzen
                                      setTimeout(() => {
                                        const serialNumberInput = document.querySelector('input[name="serialNumber"]');
                                        if (serialNumberInput) {
                                          (serialNumberInput as HTMLInputElement).focus();
                                        }
                                      }, 100);
                                    } else if (e.key === 'Escape') {
                                      // Dropdown schließen bei Escape
                                      setModelDropdown([]);
                                    }
                                  }
                                }}
                              />
                              {/* Dropdown für Modelle */}
                              {modelDropdown.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
                                  <div className="py-1 max-h-60 overflow-auto">
                                    {modelDropdown.map((model, index) => (
                                      <div 
                                        key={index} 
                                        className={`px-3 py-2 cursor-pointer ${selectedModelIndex === index ? 'bg-primary/20' : 'hover:bg-muted'}`}
                                        onClick={() => {
                                          form.setValue('model', model);
                                          setModelDropdown([]);
                                        }}
                                      >
                                        <div className="font-medium">{model}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                  
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seriennummer <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Seriennummer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Auftragsdetails */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Auftragsdetails</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="issue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fehlerbeschreibung</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {/* Für jedes Feld im issueFields-Array */}
                              {issueFields.map((issueText, index) => (
                                <div key={index} className="relative flex items-center">
                                  <Input 
                                    placeholder="Beschreibung des Problems" 
                                    value={issueText}
                                    onChange={(e) => {
                                      const newIssueFields = [...issueFields];
                                      newIssueFields[index] = e.target.value;
                                      setIssueFields(newIssueFields);
                                      
                                      // Aktualisiere auch das Formular-Feld
                                      const combinedIssues = newIssueFields.filter(i => i.trim() !== '').join(', ');
                                      field.onChange(combinedIssues);
                                    }}
                                    onFocus={() => {
                                      setSelectedIssueIndex(-1);
                                      setShowIssueDropdown(true);
                                    }}
                                    onBlur={() => {
                                      // Dropdown mit Verzögerung ausblenden
                                      setTimeout(() => setShowIssueDropdown(false), 200);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, 'issue', index)}
                                  />
                                  
                                  {/* X-Button zum Löschen des Feldes */}
                                  {issueFields.length > 1 && (
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon"
                                      className="ml-2 h-8 w-8 text-red-500 hover:text-red-700"
                                      onClick={() => removeIssueField(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  {/* Dropdown für verfügbare Fehlerbeschreibungen */}
                                  {showIssueDropdown && availableIssues.length > 0 && index === issueFields.length - 1 && (
                                    <div className="absolute z-10 w-full left-0 top-full bg-white rounded-md border shadow-lg max-h-60 overflow-y-auto mt-1">
                                      {availableIssues
                                        .filter(issue => !issueText || issue.toLowerCase().includes(issueText.toLowerCase()))
                                        .map((issue, idx) => (
                                          <div 
                                            key={idx}
                                            className={`px-4 py-2 cursor-pointer flex justify-between items-center ${selectedIssueIndex === idx ? 'bg-primary/20' : 'hover:bg-muted'}`}
                                            onClick={() => {
                                              addIssueToField(issue, index);
                                              setSelectedIssueIndex(-1);
                                            }}
                                          >
                                            <span>{issue}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geschätzte Kosten <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. 120€" {...field} />
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
                        <FormLabel>Anzahlung <span className="text-sm text-gray-500">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. 50€" {...field} />
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
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notizen <span className="text-sm text-gray-500">(optional)</span></FormLabel>
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
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
                <Button type="submit">Auftrag erstellen</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Kein Dialog mehr nötig, da wir die Kunden direkt im Formular anzeigen */}
    </>
  );
}