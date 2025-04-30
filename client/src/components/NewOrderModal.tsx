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
import { 
  getIssuesForDeviceType, saveIssue, deleteIssue, 
  DEFAULT_ISSUES
} from '@/lib/localStorage';
import { 
  getBrandsForDeviceType,
  clearAllModels,
  deleteModelLegacy
} from '@/lib/deviceHelpers';
import { saveModelDb } from '@/utils/modelUtils';

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

export function NewOrderModal({ open, onClose, customerId }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [availableIssues, setAvailableIssues] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [savedModelSeries, setSavedModelSeries] = useState<string[]>([]);
  const [savedModels, setSavedModels] = useState<string[]>([]);
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelSeriesId, setSelectedModelSeriesId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(customerId || null);
  const [filterText, setFilterText] = useState<string>('');  
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(-1);  
  const [isModelChanged, setIsModelChanged] = useState(false);
  const [showExistingCustomerDialog, setShowExistingCustomerDialog] = useState<boolean>(false);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  
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
  
  // Abfrage für Marken basierend auf DeviceType
  const brandsQuery = brands.getBrandsByDeviceTypeId(selectedDeviceTypeId);
  
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
    createDeviceTypeMutation.mutate({ name: deviceType });
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
      // Die API filtert bereits nach der UserID des eingeloggten Benutzers
      const response = await apiRequest('GET', `/api/customers?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
      const customers = await response.json();
      
      console.log(`Found ${customers.length} matching customers for ${firstName} ${lastName}`);
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
      // und nur wenn der Benutzer Admin ist (Bugi, ID 3)
      if (repairData.model && repairData.deviceType && repairData.brand && isAdmin) {
        // Gerätetyp in der Datenbank speichern, wenn er noch nicht existiert
        const exists = apiDeviceTypes?.some(dt => dt.name.toLowerCase() === repairData.deviceType.toLowerCase());
        if (!exists) {
          createDeviceTypeMutation.mutate({ name: repairData.deviceType });
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
          brandMutation,
          modelSeriesMutation,
          modelsMutation
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
    // Bereits bei einem einzigen Buchstaben im Nachnamen nach Kunden suchen
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
      // aber nur wenn der Benutzer Admin ist (Bugi, ID 3)
      if (repairData.model && repairData.deviceType && repairData.brand && isAdmin) {
        // Gerätetyp in der Datenbank speichern, wenn er noch nicht existiert
        const exists = apiDeviceTypes?.some(dt => dt.name.toLowerCase() === repairData.deviceType.toLowerCase());
        if (!exists) {
          createDeviceTypeMutation.mutate({ name: repairData.deviceType });
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
          brandMutation,
          modelSeriesMutation,
          modelsMutation
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
          setSelectedIssueIndex(-1);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIssueIndex(-1);
      } else {
        // Update des Filtertexts bei Eingabe
        setFilterText(e.currentTarget.value);
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
                      <FormItem>
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
                          />
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
                              list="deviceTypeOptions"
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                // Reset dependent fields
                                form.setValue('brand', '');
                                form.setValue('modelSeries', '');
                                form.setValue('model', '');
                              }}
                            />
                            <datalist id="deviceTypeOptions">
                              {apiDeviceTypes?.map((dt: any) => (
                                <option key={dt.id} value={dt.name} />
                              ))}
                              {/* Fallback, wenn keine Gerätetypen gefunden wurden */}
                              {(!apiDeviceTypes || apiDeviceTypes.length === 0) &&
                                defaultDeviceTypes.map((type, index) => (
                                  <option key={index} value={type} />
                                ))
                              }
                            </datalist>
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
                        <FormLabel>Marke</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="z.B. Apple, Samsung, etc." 
                              list="brandOptions"
                              {...field} 
                              disabled={!watchDeviceType}
                              onChange={(e) => {
                                field.onChange(e);
                                // Reset dependent fields
                                form.setValue('modelSeries', '');
                                form.setValue('model', '');
                              }}
                            />
                            <datalist id="brandOptions">
                              {availableBrands.map((brand, index) => (
                                <option key={index} value={brand} />
                              ))}
                              {/* Fallback für Standardmarken, wenn API keine Ergebnisse liefert */}
                              {(!availableBrands || availableBrands.length === 0) && watchDeviceType &&
                                defaultBrands[watchDeviceType.toLowerCase()]?.map((brand, index) => (
                                  <option key={index} value={brand} />
                                ))
                              }
                            </datalist>
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
                              <SelectTrigger>
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
                                list="modelOptions"
                                {...field} 
                                disabled={isDisabled}
                                onChange={(e) => {
                                  field.onChange(e);
                                  setIsModelChanged(true);
                                }}
                              />
                              <datalist id="modelOptions">
                                {savedModels.map((model, index) => (
                                  <option key={index} value={model} />
                                ))}
                              </datalist>
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
                            <div className="relative">
                              <Input 
                                placeholder="Beschreibung des Problems" 
                                {...field} 
                                onFocus={() => setSelectedIssueIndex(-1)}
                                onKeyDown={(e) => handleKeyDown(e, 'issue')}
                              />
                              {availableIssues.length > 0 && field.value && (
                                <div className="absolute z-10 w-full bg-white rounded-md border shadow-lg max-h-60 overflow-y-auto mt-1">
                                  {availableIssues
                                    .filter(issue => !filterText || issue.toLowerCase().includes(field.value.toLowerCase()))
                                    .map((issue, index) => (
                                      <div 
                                        key={index}
                                        className={`px-4 py-2 cursor-pointer flex justify-between items-center ${selectedIssueIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                        onClick={() => {
                                          form.setValue('issue', issue);
                                          setSelectedIssueIndex(-1);
                                        }}
                                      >
                                        <span>{issue}</span>
                                        <button 
                                          type="button"
                                          className="text-red-500 hover:text-red-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteIssue(issue, watchDeviceType);
                                          }}
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))
                                  }
                                </div>
                              )}
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
      
      {/* Dialog zur Bestätigung existierender Kunden */}
      <AlertDialog open={showExistingCustomerDialog} onOpenChange={setShowExistingCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existierender Kunde gefunden</AlertDialogTitle>
            <AlertDialogDescription>
              Es wurden bereits Kunden mit diesem Namen gefunden. Möchten Sie einen dieser Kunden auswählen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {matchingCustomers.map((customer, index) => (
              <div 
                key={index} 
                className="p-3 mb-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                onClick={() => handleUseExistingCustomer(customer)}
              >
                <p className="font-semibold">{customer.firstName} {customer.lastName}</p>
                <p className="text-sm">{customer.phone}</p>
                {customer.email && <p className="text-sm">{customer.email}</p>}
                {customer.address && customer.zipCode && customer.city && (
                  <p className="text-sm">{customer.address}, {customer.zipCode} {customer.city}</p>
                )}
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Neuen Kunden erstellen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}