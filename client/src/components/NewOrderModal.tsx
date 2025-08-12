import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import type { Customer } from '@/lib/types';
// Alte Geräteauswahl-Hooks werden nicht mehr verwendet
// Stattdessen wird die GlobalDeviceSelector-Komponente verwendet
import { useModelSeries, type CreateModelSeriesDTO } from '@/hooks/useModelSeries';
// Import für die neue GlobalDeviceSelector-Komponente
import { GlobalDeviceSelector } from '@/components/GlobalDeviceSelector';
// Die lokalen Fehlerbeschreibungen werden nicht mehr verwendet
// Stattdessen werden die Fehlerbeschreibungen aus der Datenbank geladen
import { 
  getBrandsForDeviceType,
  clearAllModels,
  deleteModelLegacy
} from '@/lib/deviceHelpers';
// Import für saveModelDb entfernt - nicht mehr benötigt mit GlobalDeviceSelector
import { X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  onSuccess?: () => void;
}

export function NewOrderModal({ open, onClose, customerId, onSuccess }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // States für die Formularfelder und UI
  const [availableIssues, setAvailableIssues] = useState<string[]>([]);
  const [issueFields, setIssueFields] = useState<string[]>(['']); // Array für mehrere Fehlerbeschreibungsfelder
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(customerId || null);
  const [filterText, setFilterText] = useState<string>('');  
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number>(-1);  
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);
  const [showIssueDropdown, setShowIssueDropdown] = useState<boolean>(false);
  const [isModelChanged, setIsModelChanged] = useState(false);
  const [showExistingCustomerDialog, setShowExistingCustomerDialog] = useState<boolean>(false);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  
  // Autocomplete States für Geräteeingabe
  const [showDeviceTypeDropdown, setShowDeviceTypeDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [availableDeviceTypes, setAvailableDeviceTypes] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedDeviceTypeIndex, setSelectedDeviceTypeIndex] = useState(-1);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(-1);
  const [selectedModelIndex, setSelectedModelIndex] = useState(-1);
  
  // Prüfen, ob der aktuelle Benutzer Bugi (Admin) ist
  const isAdmin = user?.id === 3;
  
  // State für GlobalDeviceSelector IDs
  const [selectedDeviceTypeId, setSelectedDeviceTypeId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  
  // Handler für GlobalDeviceSelector Callbacks
  const handleDeviceTypeSelect = (deviceType: string, deviceTypeId: number | null) => {
    form.setValue('deviceType', deviceType);
    setSelectedDeviceTypeId(deviceTypeId);
  };

  const handleBrandSelect = (brand: string, brandId: number | null) => {
    form.setValue('brand', brand);
    setSelectedBrandId(brandId);
  };

  const handleModelSelect = (model: string, modelId: number | null) => {
    form.setValue('model', model);
    setSelectedModelId(modelId);
  };
  
  // Hooks für API-Anfragen (nur noch ModelSeries wird verwendet)
  const modelSeries = useModelSeries();
  
  // Hook zum Laden der Kundendaten wenn das Modal mit einem customerId öffnet
  const {
    data: preSelectedCustomer,
    isLoading: isLoadingCustomer,
  } = useQuery({
    queryKey: ['/api/customers', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const response = await apiRequest('GET', `/api/customers/${customerId}`);
      return await response.json();
    },
    enabled: !!customerId && open,
  });
  
  // useEffect um Kundendaten zu laden wenn das Modal mit einem customerId öffnet
  useEffect(() => {
    if (preSelectedCustomer && customerId && open) {
      console.log("LOADING CUSTOMER DATA for ID:", customerId);
      console.log("Customer data:", preSelectedCustomer);
      
      // Setze den ausgewählten Kunden
      setSelectedCustomerId(preSelectedCustomer.id);
      console.log("SET selectedCustomerId to:", preSelectedCustomer.id);
      
      // Fülle das Formular mit den Kundendaten
      fillCustomerData(preSelectedCustomer);
    }
  }, [preSelectedCustomer, customerId, open]);
  
  // useEffect zum Zurücksetzen des States wenn das Modal geschlossen wird
  useEffect(() => {
    if (!open) {
      console.log("MODAL CLOSED - Resetting state");
      setSelectedCustomerId(null);
      setMatchingCustomers([]);
      form.reset();
      // localStorage löschen um sicherzustellen, dass keine alten Kundendaten beim nächsten Öffnen verwendet werden
      localStorage.removeItem('selectedCustomerData');
    }
  }, [open]);
  
  // Handler-Funktionen für Autocomplete-System (definiert vor JSX-Verwendung)
  const loadDeviceTypes = async () => {
    try {
      const response = await fetch('/api/global/device-types');
      if (response.ok) {
        const deviceTypes = await response.json();
        setAvailableDeviceTypes(deviceTypes);
        setShowDeviceTypeDropdown(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gerätetypen:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const currentDeviceType = form.watch('deviceType');
      let url = '/api/global/brands';
      
      // Wenn ein Gerätetyp eingegeben wurde, versuche ihn zu finden
      if (currentDeviceType && availableDeviceTypes.length > 0) {
        const matchingDeviceType = availableDeviceTypes.find(dt => 
          dt.name.toLowerCase() === currentDeviceType.toLowerCase()
        );
        if (matchingDeviceType) {
          url += `?deviceTypeId=${matchingDeviceType.id}`;
        }
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const brands = await response.json();
        setAvailableBrands(brands);
        setShowBrandDropdown(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Hersteller:', error);
    }
  };

  const loadModels = async () => {
    try {
      const currentBrand = form.watch('brand');
      const currentDeviceType = form.watch('deviceType');
      let url = '/api/global/models';
      
      // Wenn Hersteller und Gerätetyp eingegeben wurden, filtere entsprechend
      if (currentBrand && availableBrands.length > 0) {
        const matchingBrand = availableBrands.find(b => 
          b.name.toLowerCase() === currentBrand.toLowerCase()
        );
        if (matchingBrand) {
          url += `?brandId=${matchingBrand.id}`;
          
          if (currentDeviceType && availableDeviceTypes.length > 0) {
            const matchingDeviceType = availableDeviceTypes.find(dt => 
              dt.name.toLowerCase() === currentDeviceType.toLowerCase()
            );
            if (matchingDeviceType) {
              url += `&deviceTypeId=${matchingDeviceType.id}`;
            }
          }
        }
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
        setShowModelDropdown(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Modelle:', error);
    }
  };

  const handleDeviceTypeInput = (value: string) => {
    if (!value) {
      setShowDeviceTypeDropdown(false);
      return;
    }
    
    const filtered = availableDeviceTypes.filter(deviceType =>
      deviceType.name.toLowerCase().includes(value.toLowerCase())
    );
    setAvailableDeviceTypes(filtered);
    setShowDeviceTypeDropdown(filtered.length > 0);
    setSelectedDeviceTypeIndex(-1);
  };

  const handleBrandInput = (value: string) => {
    if (!value) {
      setShowBrandDropdown(false);
      return;
    }
    
    const filtered = availableBrands.filter(brand =>
      brand.name.toLowerCase().includes(value.toLowerCase())
    );
    setAvailableBrands(filtered);
    setShowBrandDropdown(filtered.length > 0);
    setSelectedBrandIndex(-1);
  };

  const handleModelInput = (value: string) => {
    if (!value) {
      setShowModelDropdown(false);
      return;
    }
    
    const filtered = availableModels.filter(model =>
      model.name.toLowerCase().includes(value.toLowerCase())
    );
    setAvailableModels(filtered);
    setShowModelDropdown(filtered.length > 0);
    setSelectedModelIndex(-1);
  };

  const selectDeviceType = (deviceType: any) => {
    form.setValue('deviceType', deviceType.name);
    setShowDeviceTypeDropdown(false);
    setSelectedDeviceTypeIndex(-1);
    // Lade neue Hersteller für den ausgewählten Gerätetyp
    loadBrands();
    // Springe zum nächsten Feld (Hersteller)
    setTimeout(() => {
      const brandInput = document.querySelector('input[name="brand"]') as HTMLInputElement;
      if (brandInput) {
        brandInput.focus();
      }
    }, 100);
  };

  const selectBrand = (brand: any) => {
    form.setValue('brand', brand.name);
    setShowBrandDropdown(false);
    setSelectedBrandIndex(-1);
    // Lade neue Modelle für den ausgewählten Hersteller
    loadModels();
    // Springe zum nächsten Feld (Modell)
    setTimeout(() => {
      const modelInput = document.querySelector('input[name="model"]') as HTMLInputElement;
      if (modelInput) {
        modelInput.focus();
      }
    }, 100);
  };

  const selectModel = (model: any) => {
    form.setValue('model', model.name);
    if (model.modelSeries) {
      form.setValue('modelSeries', model.modelSeries);
    }
    setShowModelDropdown(false);
    setSelectedModelIndex(-1);
    // Springe zum nächsten Feld (Seriennummer)
    setTimeout(() => {
      const serialNumberInput = document.querySelector('input[name="serialNumber"]') as HTMLInputElement;
      if (serialNumberInput) {
        serialNumberInput.focus();
      }
    }, 100);
  };

  // Keyboard Navigation
  const handleDeviceTypeKeyDown = (e: React.KeyboardEvent) => {
    if (!showDeviceTypeDropdown) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedDeviceTypeIndex(prev => 
        prev < availableDeviceTypes.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedDeviceTypeIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (selectedDeviceTypeIndex >= 0) {
        selectDeviceType(availableDeviceTypes[selectedDeviceTypeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDeviceTypeDropdown(false);
      setSelectedDeviceTypeIndex(-1);
    }
  };

  const handleBrandKeyDown = (e: React.KeyboardEvent) => {
    if (!showBrandDropdown) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedBrandIndex(prev => 
        prev < availableBrands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedBrandIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (selectedBrandIndex >= 0) {
        selectBrand(availableBrands[selectedBrandIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowBrandDropdown(false);
      setSelectedBrandIndex(-1);
    }
  };

  const handleModelKeyDown = (e: React.KeyboardEvent) => {
    if (!showModelDropdown) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedModelIndex(prev => 
        prev < availableModels.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedModelIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (selectedModelIndex >= 0) {
        selectModel(availableModels[selectedModelIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowModelDropdown(false);
      setSelectedModelIndex(-1);
    }
  };
  
  // In der neuen Version werden die Mutations für Gerätetypen, Hersteller und Modelle 
  // nicht mehr benötigt, da diese jetzt vom Superadmin verwaltet werden
  // und über den GlobalDeviceSelector ausgewählt werden
  
  // API Device Types (nicht mehr benötigt, GlobalDeviceSelector übernimmt die Auswahl)
  const apiDeviceTypes = null;
  
  // Fehlerkatalog-Einträge aus dem globalen Fehlerkatalog des Superadmins
  const { data: errorCatalogData = [], isLoading: isLoadingErrorCatalog } = useQuery({
    queryKey: ['/api/global/error-catalog'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/global/error-catalog');
      return response.json();
    },
    enabled: true,
  });
  
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
      console.log("MODAL OPENING - customerId:", customerId);
      
      // Alle Zustandsvariablen zurücksetzen
      setAvailableIssues([]);
      setAvailableBrands([]);
      setAvailableDeviceTypes([]);
      setAvailableModels([]);
      setIssueFields(['']); // Nur ein leeres Feld für Fehlerbeschreibung
      setShowDeviceTypeDropdown(false);
      setShowBrandDropdown(false);
      setShowModelDropdown(false);
      setFilterText('');
      setSelectedIssueIndex(-1);
      setSelectedCustomerIndex(-1);
      setShowIssueDropdown(false);
      setIsModelChanged(false);
      setMatchingCustomers([]);
      
      if (!customerId) {
        console.log("NO CUSTOMER ID - Resetting form and checking for saved customer data");
        
        setSelectedCustomerId(null);
        form.reset();
        
        // Explizit alle Kundenfelder löschen für neuen Auftrag
        form.setValue('firstName', '');
        form.setValue('lastName', '');
        form.setValue('phone', '');
        form.setValue('email', '');
        form.setValue('address', '');
        form.setValue('zipCode', '');
        form.setValue('city', '');
        form.setValue('deviceType', '');
        form.setValue('brand', '');
        form.setValue('model', '');
        form.setValue('issue', '');
        form.setValue('estimatedCost', '');
        form.setValue('notes', '');
        
        // Prüfen, ob Kundendaten im localStorage vorhanden sind und diese verwenden
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
          } catch (error) {
            console.error('Fehler beim Parsen der gespeicherten Kundendaten:', error);
          }
        }
      } else {
        console.log("CUSTOMER ID PROVIDED - Will load customer data via useQuery");
        // Kundendaten werden über useQuery geladen, nicht über localStorage
      }
    }
  }, [open, customerId]);


  
  // Wichtige Form-Values, die beobachtet werden
  const watchDeviceType = form.watch('deviceType');
  const watchBrand = form.watch('brand');
  const watchModelSeries = form.watch('modelSeries');
  const watchModel = form.watch('model');
  const watchIssue = form.watch('issue');
  
  // Setze device type id basierend auf watchDeviceType - nicht mehr benötigt, da GlobalDeviceSelector es bereits handhabt
  // useEffect für die Geräteauswahl entfernt, da GlobalDeviceSelector diese Funktion jetzt übernimmt
  
  // Fehlerbeschreibungen aus dem globalen Fehlerkatalog laden
  const { data: deviceIssues, isLoading: isLoadingIssues, refetch: refetchErrorCatalog } = useQuery({
    queryKey: ['/api/global/error-catalog', watchDeviceType],
    enabled: !!watchDeviceType,
    staleTime: 0, // Sorgt dafür, dass die Daten immer neu geladen werden
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      if (!watchDeviceType) return [];
      
      // Entsprechenden Gerätetyp für API-Anfrage bestimmen
      let deviceTypeParam = watchDeviceType.toLowerCase();
      
      // Normalisiere auf bekannte API-Werte
      if (deviceTypeParam === 'smartphone' || deviceTypeParam === 'tablet' || 
          deviceTypeParam === 'laptop' || deviceTypeParam === 'spielekonsole') {
        // Diese Werte werden direkt unterstützt
      } else if (deviceTypeParam === 'watch' || deviceTypeParam === 'smartwatch') {
        deviceTypeParam = 'smartwatch';
      } else if (deviceTypeParam === 'game console' || deviceTypeParam === 'konsole') {
        deviceTypeParam = 'spielekonsole';
      } else {
        console.log(`Unbekannter Gerätetyp für Fehlerkatalog: ${deviceTypeParam}, verwende "smartphone"`);
        deviceTypeParam = 'smartphone'; // Fallback zu Smartphone
      }
      
      console.log(`Lade Fehlereinträge für Gerätetyp: ${deviceTypeParam}`);
      try {
        const response = await apiRequest('GET', `/api/global/error-catalog/${deviceTypeParam}`);
        const data = await response.json();
        console.log(`${data.length} Fehlereinträge für ${deviceTypeParam} geladen`);
        return data;
      } catch (error) {
        console.error(`Fehler beim Laden der Fehlereinträge für ${deviceTypeParam}:`, error);
        return [];
      }
    },
  });

  // Update Fehlerbeschreibungen basierend auf ausgewähltem Gerätetyp
  useEffect(() => {
    if (watchDeviceType) {
      // Zurücksetzen der Hersteller
      form.setValue('brand', '');
      
      // Neu laden des Fehlerkatalogs bei Änderung des Gerätetyps
      console.log("Gerätetyp geändert, lade Fehlerkatalog neu");
      refetchErrorCatalog();
    }
  }, [watchDeviceType, form, refetchErrorCatalog]);
  
  // Aktualisiere die verfügbaren Fehlerbeschreibungen, wenn die API-Abfrage abgeschlossen ist
  useEffect(() => {
    if (deviceIssues && deviceIssues.length > 0) {
      // Extrahiere nur die Fehlertexte aus dem Fehlerkatalog
      const errorTexts = deviceIssues.map((issue: any) => issue.errorText);
      console.log(`${errorTexts.length} Fehlereinträge für Dropdown geladen`);
      setAvailableIssues(errorTexts);
    } else {
      // Fallback für den Fall, dass keine passenden Fehlereinträge gefunden wurden
      console.log("Keine Fehlereinträge für den ausgewählten Gerätetyp gefunden, verwende Standardliste");
      setAvailableIssues([
        'Display defekt',
        'Akku schwach',
        'Mikrofon defekt',
        'Lautsprecher defekt',
        'Ladebuchse defekt',
        'Kamera defekt',
        'Wasserschaden',
        'Software-Probleme',
        'Tastatur defekt',
        'Touchscreen reagiert nicht',
        'WLAN-Probleme',
        'Bluetooth-Probleme'
      ]);
    }
  }, [deviceIssues]);
  
  // Die Hooks für Brands und deviceTypes wurden entfernt, da wir jetzt GlobalDeviceSelector verwenden
  
  // Die alte Modellreihen- und Modellabfrage wurde entfernt, da sie durch GlobalDeviceSelector ersetzt wurde
  
  // Funktion zum Speichern eines Gerätetyps ist nicht mehr erforderlich,
  // da wir jetzt den GlobalDeviceSelector verwenden und Geräte nur vom Superadmin erstellt werden
  
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
        notes: formData.notes,
        // Neue ID-Felder von der GlobalDeviceSelector
        deviceTypeId: selectedDeviceTypeId,
        brandId: selectedBrandId,
        modelId: selectedModelId
      };
      
      // Hier speichern wir das Modell, den Gerätetyp und die Hersteller, wenn sie Werte haben - aber nur wenn der Auftrag gespeichert wird
      // und nur wenn der Benutzer Admin ist (Bugi, ID 3)
      if (repairData.model && repairData.deviceType && repairData.brand && isAdmin) {
        // Da wir jetzt den GlobalDeviceSelector verwenden, wird keine automatische Speicherung mehr benötigt
        // Die Geräte werden vom Superadmin verwaltet
        console.log("Repair wird mit globalen Gerätedaten erstellt:", {
          deviceType: repairData.deviceType,
          brand: repairData.brand,
          model: repairData.model,
          deviceTypeId: selectedDeviceTypeId,
          brandId: selectedBrandId,
          modelId: selectedModelId
        });
      }
      
      console.log("Sending repair data:", repairData);
      const result = await createRepairMutation.mutateAsync(repairData);
      
      // localStorage nach erfolgreicher Auftragserstellung löschen (für existierende Kunden)
      localStorage.removeItem('selectedCustomerData');
      console.log("localStorage nach Auftragserstellung gelöscht (existierender Kunde)");
      console.log("Formular wird jetzt vollständig zurückgesetzt...");
      
      // Erfolgsmeldung anzeigen
      toast({
        title: "Auftrag erstellt",
        description: `Auftrag ${result.orderCode} wurde erfolgreich erstellt.`,
      });
      
      // Formular explizit zurücksetzen
      form.reset();
      
      // Explizit alle Formularfelder löschen
      form.setValue('firstName', '');
      form.setValue('lastName', '');
      form.setValue('phone', '');
      form.setValue('email', '');
      form.setValue('address', '');
      form.setValue('zipCode', '');
      form.setValue('city', '');
      form.setValue('deviceType', '');
      form.setValue('brand', '');
      form.setValue('model', '');
      form.setValue('issue', '');
      form.setValue('estimatedCost', '');
      form.setValue('notes', '');
      form.setValue('serialNumber', '');
      form.setValue('depositAmount', '');
      
      // Zusätzlich alle Zustandsvariablen zurücksetzen
      setSelectedCustomerId(null);
      setAvailableIssues([]);
      setAvailableBrands([]);
      setAvailableDeviceTypes([]);
      setAvailableModels([]);
      setIssueFields(['']);
      setShowDeviceTypeDropdown(false);
      setShowBrandDropdown(false);
      setShowModelDropdown(false);
      setFilterText('');
      setSelectedIssueIndex(-1);
      setSelectedCustomerIndex(-1);
      setShowIssueDropdown(false);
      setIsModelChanged(false);
      setMatchingCustomers([]);
      
      // Modal schließen
      onClose();
      
      // Callback aufrufen, wenn erfolgreich
      console.log("NewOrderModal (createRepairWithExistingCustomer): onSuccess-Callback aufrufen", { onSuccess: !!onSuccess });
      if (onSuccess) {
        console.log("NewOrderModal (createRepairWithExistingCustomer): onSuccess() wird aufgerufen");
        onSuccess();
      }
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
      // Cache für Reparaturen und Statistiken aktualisieren
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      console.log("Neue Reparatur erstellt und Cache aktualisiert");
      
      // localStorage nach erfolgreicher Auftragserstellung löschen
      localStorage.removeItem('selectedCustomerData');
      console.log("localStorage nach Auftragserstellung gelöscht");
      console.log("Formular wird jetzt vollständig zurückgesetzt...");
      
      // Erfolgsmeldung anzeigen (nur mit Auftragscode, nicht mit ID)
      toast({
        title: "Auftrag erstellt",
        description: `Auftrag ${data.orderCode} wurde erfolgreich erstellt.`,
      });
      
      // Modal schließen und Formular explizit zurücksetzen
      form.reset();
      
      // Explizit alle Formularfelder löschen
      form.setValue('firstName', '');
      form.setValue('lastName', '');
      form.setValue('phone', '');
      form.setValue('email', '');
      form.setValue('address', '');
      form.setValue('zipCode', '');
      form.setValue('city', '');
      form.setValue('deviceType', '');
      form.setValue('brand', '');
      form.setValue('model', '');
      form.setValue('issue', '');
      form.setValue('estimatedCost', '');
      form.setValue('notes', '');
      form.setValue('serialNumber', '');
      form.setValue('depositAmount', '');
      
      // Zusätzlich alle Zustandsvariablen zurücksetzen
      setSelectedCustomerId(null);
      setAvailableIssues([]);
      setAvailableBrands([]);
      setAvailableDeviceTypes([]);
      setAvailableModels([]);
      setIssueFields(['']);
      setShowDeviceTypeDropdown(false);
      setShowBrandDropdown(false);
      setShowModelDropdown(false);
      setFilterText('');
      setSelectedIssueIndex(-1);
      setSelectedCustomerIndex(-1);
      setShowIssueDropdown(false);
      setIsModelChanged(false);
      setMatchingCustomers([]);
      
      onClose();
      
      // Callback aufrufen, wenn erfolgreich
      console.log("NewOrderModal (createRepairMutation): onSuccess-Callback aufrufen", { onSuccess: !!onSuccess });
      if (onSuccess) {
        console.log("NewOrderModal (createRepairMutation): onSuccess() wird aufgerufen");
        onSuccess();
      }
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
      let finalCustomerId = selectedCustomerId;
      
      console.log("=== REPAIR CREATION DEBUG ===");
      console.log("selectedCustomerId:", selectedCustomerId);
      console.log("customerId prop:", customerId);
      console.log("finalCustomerId (initial):", finalCustomerId);
      console.log("Form data:", data);
      console.log("preSelectedCustomer:", preSelectedCustomer);
      
      // Wenn kein Kunde ausgewählt wurde, erstellen wir einen neuen Kunden
      if (!finalCustomerId) {
        console.log("NO CUSTOMER SELECTED - Creating new customer");
        const customerData = {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          zipCode: data.zipCode || null,
          city: data.city || null
        };
        
        // Kunden erstellen und ID sichern
        const newCustomer = await createCustomerMutation.mutateAsync(customerData);
        finalCustomerId = newCustomer.id;
        console.log("Neuer Kunde erstellt mit ID:", finalCustomerId);
      } else {
        console.log("CUSTOMER ALREADY SELECTED - Using existing customer ID:", finalCustomerId);
      }
      
      console.log("FINAL finalCustomerId before repair creation:", finalCustomerId);
      
      // Jetzt wird der Auftrag erstellt mit der Kunden-ID
      // Stellen wir sicher, dass wir eine gültige finalCustomerId haben
      if (!finalCustomerId) {
        console.error("Konnte keinen Kunden finden oder erstellen");
        toast({
          title: "Fehler",
          description: "Es konnte kein Kunde für den Auftrag gefunden oder erstellt werden.",
          variant: "destructive",
        });
        return;
      }
      
      // Log der ausgewählten Geräte-Daten
      console.log("GlobalDeviceSelector ausgewählte Werte:");
      console.log("- deviceType:", data.deviceType);
      console.log("- brand:", data.brand);
      console.log("- model:", data.model);
      
      const repairData = {
        customerId: finalCustomerId,
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
      
      console.log("Sende Reparaturdaten mit Kunden-ID:", repairData.customerId);
      console.log("Vollständige Daten:", JSON.stringify(repairData, null, 2));
      
      // Validierung vor dem Senden
      if (!repairData.customerId) {
        console.error("Fehler: Keine Kunden-ID");
        throw new Error("Bitte wählen Sie einen Kunden aus oder erstellen Sie einen neuen");
      }
      if (!repairData.deviceType) {
        console.error("Fehler: Kein Gerätetyp");
        throw new Error("Bitte wählen Sie einen Gerätetyp aus");
      }
      if (!repairData.brand) {
        console.error("Fehler: Kein Hersteller");
        throw new Error("Bitte wählen Sie einen Hersteller aus");
      }
      if (!repairData.model) {
        console.error("Fehler: Kein Modell");
        throw new Error("Bitte wählen Sie ein Modell aus");
      }
      if (!repairData.issue) {
        console.error("Fehler: Keine Fehlerbeschreibung");
        throw new Error("Bitte geben Sie eine Fehlerbeschreibung ein");
      }
      
      console.log("Alle Validierungen bestanden, sende Daten...");
      
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
            <DialogDescription>
              Erstellen Sie einen neuen Reparaturauftrag für einen Kunden
            </DialogDescription>
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
                
                {/* Geräteeingabe mit Autocomplete wie bei Kundeneingabe */}
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
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Versteckte Felder für Modellserie */}
                  <input type="hidden" {...form.register("modelSeries")} />
                  
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