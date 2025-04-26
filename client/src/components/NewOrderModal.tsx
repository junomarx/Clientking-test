import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { 
  saveModel, getModelsForDeviceAndBrand, deleteModel, clearAllModels,
  saveDeviceType, getSavedDeviceTypes, deleteDeviceType, clearAllDeviceTypes,
  saveBrand, getBrandsForDeviceType, deleteBrand, clearAllBrands
} from '@/lib/localStorage';

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

// Form schema
const orderFormSchema = z.object({
  // Customer info
  firstName: z.string().min(2, { message: 'Vorname muss mindestens 2 Zeichen lang sein' }),
  lastName: z.string().min(2, { message: 'Nachname muss mindestens 2 Zeichen lang sein' }),
  phone: z.string().min(5, { message: 'Telefonnummer eingeben' }),
  email: z.string().email({ message: 'Gültige E-Mail-Adresse eingeben' }).optional().or(z.literal('')),
  
  // Device info
  deviceType: z.string().min(1, { message: 'Bitte Geräteart eingeben' }),
  brand: z.string().min(1, { message: 'Bitte Marke auswählen' }),
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
}

export function NewOrderModal({ open, onClose }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [showExistingCustomerDialog, setShowExistingCustomerDialog] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isDeviceTypeDropdownOpen, setIsDeviceTypeDropdownOpen] = useState(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  
  // Form definition
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      deviceType: '',
      brand: '',
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
  const watchModel = form.watch('model');
  
  // Zustand für die gespeicherten Modelle und Gerätetypen
  const [savedModels, setSavedModels] = useState<string[]>([]);
  const [savedDeviceTypes, setSavedDeviceTypes] = useState<string[]>([]);
  const [selectedDeviceTypeIndex, setSelectedDeviceTypeIndex] = useState<number>(-1);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState<number>(-1);
  const [selectedModelIndex, setSelectedModelIndex] = useState<number>(-1);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1);
  
  // Update Gerätetyp-Liste beim ersten Rendern
  useEffect(() => {
    const deviceTypes = getSavedDeviceTypes();
    // Wenn keine gespeicherten Gerätetypen vorhanden sind, verwenden wir die Standardliste
    setSavedDeviceTypes(deviceTypes.length > 0 ? deviceTypes : defaultDeviceTypes);
  }, []);
  
  // Update Marken basierend auf ausgewähltem Gerätetyp
  useEffect(() => {
    if (watchDeviceType) {
      const brands = getBrandsForDeviceType(watchDeviceType);
      setAvailableBrands(brands);
      form.setValue('brand', '');
    } else {
      setAvailableBrands([]);
    }
  }, [watchDeviceType, form]);
  

  
  // Lade gespeicherte Modelle, wenn sich Geräteart oder Marke ändert
  useEffect(() => {
    if (watchDeviceType && watchBrand) {
      const models = getModelsForDeviceAndBrand(watchDeviceType, watchBrand);
      setSavedModels(models);
    } else {
      setSavedModels([]);
    }
  }, [watchDeviceType, watchBrand]);
  
  // Diese automatische Speicherung bei Änderungen ist entfernt, da Modelle nur gespeichert werden
  // sollen, wenn der Auftrag tatsächlich gespeichert wird
  
  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: { 
      firstName: string; 
      lastName: string; 
      phone: string; 
      email?: string 
    }) => {
      const response = await apiRequest('POST', '/api/customers', data);
      return response.json();
    }
  });
  
  // Create repair mutation
  const createRepairMutation = useMutation({
    mutationFn: async (data: {
      customerId: number;
      deviceType: string;
      brand: string;
      model: string;
      serialNumber?: string;
      issue: string;
      estimatedCost?: string | null;
      depositAmount?: string | null;
      status: string;
      notes?: string;
    }) => {
      const response = await apiRequest('POST', '/api/repairs', data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/repairs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Close the modal
      handleClose();
      
      // Show success message
      toast({
        title: "Auftrag gespeichert",
        description: "Der Reparaturauftrag wurde erfolgreich angelegt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler beim Speichern",
        description: "Der Auftrag konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
      console.error("Error saving order:", error);
    }
  });
  
  // Funktion zum Suchen von Kunden in Echtzeit basierend auf dem Vornamen
  const searchCustomersByFirstName = async (firstName: string) => {
    try {
      if (firstName.length < 2) {
        setMatchingCustomers([]);
        setIsCustomerDropdownOpen(false);
        return;
      }
      
      const queryParams = new URLSearchParams({ firstName }).toString();
      
      const response = await fetch(`/api/customers?${queryParams}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Kunden');
      }
      
      const customers = await response.json();
      
      setMatchingCustomers(customers);
      setIsCustomerDropdownOpen(customers.length > 0);
    } catch (error) {
      console.error("Error searching for customers:", error);
      setMatchingCustomers([]);
      setIsCustomerDropdownOpen(false);
    }
  };
  
  // Funktion zum Prüfen, ob ein Kunde mit gleichem Namen existiert
  const checkForExistingCustomer = async (firstName: string, lastName: string) => {
    try {
      if (firstName.length < 1 || lastName.length < 1) {
        setMatchingCustomers([]);
        setIsCustomerDropdownOpen(false);
        return false;
      }
      
      const queryParams = new URLSearchParams({ 
        firstName, 
        lastName 
      }).toString();
      
      const response = await fetch(`/api/customers?${queryParams}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Kunden');
      }
      
      const customers = await response.json();
      
      if (customers && customers.length > 0) {
        setMatchingCustomers(customers);
        setIsCustomerDropdownOpen(true);
        return true;
      }
      
      // Wenn keine Kunden gefunden wurden, leere die Liste und schließe das Dropdown
      setMatchingCustomers([]);
      setIsCustomerDropdownOpen(false);
      return false;
    } catch (error) {
      console.error("Error checking for existing customer:", error);
      setMatchingCustomers([]);
      setIsCustomerDropdownOpen(false);
      return false;
    }
  };
  
  // Funktion zum Ausfüllen der Kundendaten bei Auswahl eines Kunden aus dem Dropdown
  const fillCustomerData = (customer: Customer) => {
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone);
    if (customer.email) {
      form.setValue('email', customer.email);
    }
    
    // Setzt auch die customerId, um den Auftrag diesem Kunden zuzuweisen
    setSelectedCustomerId(customer.id);
    
    // Schließt das Dropdown
    setIsCustomerDropdownOpen(false);
  };
  
  // Funktion zum Erstellen eines neuen Auftrags mit vorhandenem Kunden
  const createRepairWithExistingCustomer = async (customer: Customer, formData: OrderFormValues) => {
    try {
      // Überprüfe, ob alle erforderlichen Felder vorhanden sind
      // Wenn nicht, verwende Standardwerte für fehlende Pflichtfelder
      const repairData = {
        customerId: customer.id,
        deviceType: formData.deviceType || 'smartphone', // Standardwert
        brand: formData.brand || 'apple', // Standardwert
        model: formData.model || 'Unbekanntes Modell', // Standardwert
        serialNumber: formData.serialNumber,
        issue: formData.issue || 'Wird später hinzugefügt', // Standardwert
        estimatedCost: formData.estimatedCost === "" ? null : formData.estimatedCost,
        depositAmount: formData.depositAmount === "" ? null : formData.depositAmount,
        status: formData.status || 'eingegangen', // Standardwert
        notes: formData.notes
      };
      
      // Hier speichern wir das Modell, den Gerätetyp und die Marke, wenn sie Werte haben - aber nur wenn der Auftrag gespeichert wird
      if (repairData.model && repairData.deviceType && repairData.brand) {
        saveModel(repairData.deviceType, repairData.brand, repairData.model);
        saveDeviceType(repairData.deviceType);
        saveBrand(repairData.deviceType, repairData.brand);
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
  
  // Bearbeiten des Formularsubmits
  const onSubmit = async (data: OrderFormValues) => {
    try {
      let customerId: number;
      
      // Wenn bereits ein Kunde ausgewählt wurde, verwenden wir dessen ID
      if (selectedCustomerId) {
        customerId = selectedCustomerId;
      } else {
        // Ansonsten erstellen wir einen neuen Kunden
        const customerData = {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || '0000000000', // Standardwert für Telefonnummer
          email: data.email
        };
        
        const customer = await createCustomerMutation.mutateAsync(customerData);
        customerId = customer.id;
      }
      
      // Dann erstelle den Reparaturauftrag mit der Kunden-ID, mit Standardwerten für fehlende Pflichtfelder
      const repairData = {
        customerId,
        deviceType: data.deviceType || 'smartphone', // Standardwert
        brand: data.brand || 'apple', // Standardwert
        model: data.model || 'Unbekanntes Modell', // Standardwert
        serialNumber: data.serialNumber,
        depositAmount: data.depositAmount === "" ? null : data.depositAmount,
        issue: data.issue || 'Wird später hinzugefügt', // Standardwert
        estimatedCost: data.estimatedCost === "" ? null : data.estimatedCost,
        status: data.status || 'eingegangen', // Standardwert
        notes: data.notes
      };
      
      // Hier speichern wir das Modell, den Gerätetyp und die Marke, wenn sie Werte haben - aber nur wenn der Auftrag gespeichert wird
      if (repairData.model && repairData.deviceType && repairData.brand) {
        saveModel(repairData.deviceType, repairData.brand, repairData.model);
        saveDeviceType(repairData.deviceType);
        saveBrand(repairData.deviceType, repairData.brand);
      }
      
      console.log("Sending repair data (submit):", repairData);
      await createRepairMutation.mutateAsync(repairData);
    } catch (error) {
      console.error("Error in form submission:", error);
      // Fehlermeldung anzeigen
      toast({
        title: "Fehler beim Speichern",
        description: "Der Auftrag konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };
  
  const handleClose = () => {
    form.reset();
    setSelectedCustomerId(null);
    setMatchingCustomers([]);
    onClose();
  };
  
  // Determine if the form is submitting
  const isSubmitting = createCustomerMutation.isPending || createRepairMutation.isPending;

  // Handler für Kundenbestätigung im Dialog
  const handleUseExistingCustomer = (customer: Customer) => {
    // Kundendaten in Formular übernehmen
    form.setValue('firstName', customer.firstName);
    form.setValue('lastName', customer.lastName);
    form.setValue('phone', customer.phone);
    form.setValue('email', customer.email || '');
    
    // Dialog schließen
    setShowExistingCustomerDialog(false);
    
    // Repair mit vorhandenem Kunden erstellen
    createRepairWithExistingCustomer(customer, form.getValues());
  };
  
  // Handler für neuen Kunden im Dialog
  const handleCreateNewCustomer = async () => {
    setShowExistingCustomerDialog(false);
    
    // Die aktuelle Form mit einem neuen Kunden fortsetzen
    try {
      const formData = form.getValues();
      
      const customerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || '0000000000', // Standardwert für Telefonnummer
        email: formData.email
      };
      
      const customer = await createCustomerMutation.mutateAsync(customerData);
      
      // Dann erstelle den Reparaturauftrag mit der Kunden-ID, mit Standardwerten für fehlende Pflichtfelder
      const repairData = {
        customerId: customer.id,
        deviceType: formData.deviceType || 'smartphone', // Standardwert
        brand: formData.brand || 'apple', // Standardwert
        model: formData.model || 'Unbekanntes Modell', // Standardwert
        depositAmount: formData.depositAmount === "" ? null : formData.depositAmount,
        serialNumber: formData.serialNumber,
        issue: formData.issue || 'Wird später hinzugefügt', // Standardwert
        estimatedCost: formData.estimatedCost === "" ? null : formData.estimatedCost,
        status: formData.status || 'eingegangen', // Standardwert
        notes: formData.notes
      };
      
      // Hier speichern wir das Modell, den Gerätetyp und die Marke, wenn sie Werte haben - aber nur wenn der Auftrag gespeichert wird
      if (repairData.model && repairData.deviceType && repairData.brand) {
        saveModel(repairData.deviceType, repairData.brand, repairData.model);
        saveDeviceType(repairData.deviceType);
        saveBrand(repairData.deviceType, repairData.brand);
      }
      
      console.log("Sending repair data (new customer):", repairData);
      await createRepairMutation.mutateAsync(repairData);
    } catch (error) {
      console.error("Error creating new customer and repair:", error);
      // Fehlermeldung anzeigen
      toast({
        title: "Fehler beim Speichern",
        description: "Der Auftrag konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Dialog zur Bestätigung des vorhandenen Kunden */}
      <AlertDialog open={showExistingCustomerDialog} onOpenChange={setShowExistingCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde bereits vorhanden</AlertDialogTitle>
            <AlertDialogDescription>
              {matchingCustomers.length === 1 ? (
                <>
                  Es gibt bereits einen Kunden mit dem Namen "{matchingCustomers[0]?.firstName} {matchingCustomers[0]?.lastName}".
                  Möchten Sie diesen bestehenden Kunden verwenden oder einen neuen Kunden anlegen?
                </>
              ) : (
                <>
                  Es wurden {matchingCustomers.length} Kunden mit demselben Namen gefunden.
                  Bitte wählen Sie einen vorhandenen Kunden oder legen Sie einen neuen an.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {matchingCustomers.length > 0 && (
            <div className="my-4 max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="py-2 text-left">Name</th>
                    <th className="py-2 text-left">Telefon</th>
                    <th className="py-2 text-left">E-Mail</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {matchingCustomers.map(customer => (
                    <tr key={customer.id} className="border-b hover:bg-blue-50">
                      <td className="py-2">{customer.firstName} {customer.lastName}</td>
                      <td className="py-2">{customer.phone}</td>
                      <td className="py-2">{customer.email || '-'}</td>
                      <td className="py-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleUseExistingCustomer(customer)}
                        >
                          Auswählen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateNewCustomer}
              className="bg-primary hover:bg-primary/90"
            >
              Neuen Kunden anlegen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Hauptdialog zum Erstellen eines neuen Auftrags */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary">Neuen Auftrag erfassen</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              {/* Customer Information Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Kundeninformationen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="Vorname" 
                              onChange={(e) => {
                                field.onChange(e);
                                // Keine Suche nach Kunden bei Änderung des Vornamens
                                // Nur wenn der Nachname bereits eingegeben wurde, prüfe nach Änderung des Vornamens
                                const lastName = form.getValues().lastName;
                                if (lastName.length >= 2) {
                                  checkCustomerAfterLastNameInput(e.target.value, lastName);
                                }
                              }}
                            />
                          </div>
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
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="Nachname"
                              onChange={(e) => {
                                field.onChange(e);
                                // Sofort nach jeder Eingabe im Nachnamen nach Kunden suchen
                                const firstName = form.getValues().firstName;
                                checkCustomerAfterLastNameInput(firstName, e.target.value);
                              }}
                              onBlur={() => {
                                // Verzögerung, damit der Benutzer Zeit hat, einen Eintrag im Dropdown zu wählen
                                setTimeout(() => setIsCustomerDropdownOpen(false), 200);
                              }}
                            />
                            
                            {/* Dropdown für die Kundenergebnisse */}
                            {matchingCustomers.length > 0 && isCustomerDropdownOpen && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                                <div className="sticky top-0 bg-background border-b p-2">
                                  <span className="text-sm font-medium">Vorhandene Kunden</span>
                                </div>
                                
                                {matchingCustomers.map(customer => (
                                  <div 
                                    key={customer.id} 
                                    className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                    onMouseDown={(e) => {
                                      // Verhindert onBlur vor dem Klick
                                      e.preventDefault();
                                    }}
                                    onClick={() => fillCustomerData(customer)}
                                  >
                                    <div className="flex-grow">
                                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                    </div>
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Telefonnummer" />
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
                        <FormLabel>E-Mail (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="email@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Device Information Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Geräteinformationen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geräteart</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="z.B. Smartphone, Tablet, Watch, Laptop" 
                              onChange={(e) => {
                                field.onChange(e);
                                // Bei Eingabe das Dropdown öffnen
                                setIsDeviceTypeDropdownOpen(e.target.value.length > 0);
                                // Bei jeder Eingabe den Index zurücksetzen
                                setSelectedDeviceTypeIndex(-1);
                              }}
                              onBlur={(e) => {
                                // Wenn ein Element ausgewählt ist und Tab gedrückt wurde
                                const filteredTypes = savedDeviceTypes
                                  .filter(type => !field.value || type.toLowerCase().includes(field.value.toLowerCase()));
                                
                                // Wenn ein Element ausgewählt ist und wir wegnavigieren (z.B. mit Tab)
                                if (selectedDeviceTypeIndex >= 0 && filteredTypes.length > 0) {
                                  const selectedType = filteredTypes[selectedDeviceTypeIndex];
                                  field.onChange(selectedType);
                                  
                                  // Nur wenn der Fokus auf ein anderes Element gesetzt wird (nicht bei Klick außerhalb)
                                  if (e.relatedTarget) {
                                    const brandInput = document.querySelector('input[name="brand"]');
                                    if (brandInput) {
                                      setTimeout(() => {
                                        (brandInput as HTMLInputElement).focus();
                                      }, 10);
                                    }
                                  }
                                }
                                
                                // Verzögerung, damit der Benutzer Zeit hat, einen Eintrag im Dropdown zu wählen
                                setTimeout(() => {
                                  setIsDeviceTypeDropdownOpen(false);
                                  setSelectedDeviceTypeIndex(-1);
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (!isDeviceTypeDropdownOpen) return;
                                
                                const filteredTypes = savedDeviceTypes
                                  .filter(type => !field.value || type.toLowerCase().includes(field.value.toLowerCase()));
                                
                                // Pfeiltaste nach unten
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSelectedDeviceTypeIndex(prev => 
                                    prev < filteredTypes.length - 1 ? prev + 1 : 0
                                  );
                                } 
                                // Pfeiltaste nach oben
                                else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedDeviceTypeIndex(prev => 
                                    prev > 0 ? prev - 1 : filteredTypes.length - 1
                                  );
                                } 
                                // Enter-Taste
                                else if (e.key === 'Enter' && selectedDeviceTypeIndex >= 0 && filteredTypes.length > 0) {
                                  e.preventDefault();
                                  const selectedType = filteredTypes[selectedDeviceTypeIndex];
                                  field.onChange(selectedType);
                                  setIsDeviceTypeDropdownOpen(false);
                                  setSelectedDeviceTypeIndex(-1);
                                  
                                  // Fokus zum nächsten Feld setzen
                                  const brandInput = document.querySelector('input[name="brand"]');
                                  if (brandInput) {
                                    (brandInput as HTMLInputElement).focus();
                                  }
                                }
                              }}
                            />
                            
                            {/* Dropdown für die gespeicherten Gerätetypen */}
                            {savedDeviceTypes.length > 0 && isDeviceTypeDropdownOpen && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                                <div className="sticky top-0 bg-background border-b p-2">
                                  <span className="text-sm font-medium">Gespeicherte Gerätetypen</span>
                                </div>
                                
                                {savedDeviceTypes
                                  .filter(type => !field.value || type.toLowerCase().includes(field.value.toLowerCase()))
                                  .map((deviceType, index) => (
                                  <div 
                                    key={index} 
                                    className={`px-3 py-2 hover:bg-muted cursor-pointer ${selectedDeviceTypeIndex === index ? 'bg-muted' : ''}`}
                                    onMouseDown={(e) => {
                                      // Verhindert onBlur vor dem Klick
                                      e.preventDefault();
                                    }}
                                    onClick={() => {
                                      field.onChange(deviceType);
                                      setIsDeviceTypeDropdownOpen(false);
                                      
                                      // Fokus zum nächsten Feld setzen
                                      const brandInput = document.querySelector('input[name="brand"]');
                                      if (brandInput) {
                                        (brandInput as HTMLInputElement).focus();
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      setSelectedDeviceTypeIndex(index);
                                    }}
                                  >
                                    {deviceType}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Typisch: Smartphone, Tablet, Watch, Laptop
                        </FormDescription>
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
                              {...field} 
                              placeholder="z.B. Apple, Samsung, Huawei, ..." 
                              disabled={!watchDeviceType}
                              onChange={(e) => {
                                field.onChange(e);
                                // Bei Eingabe das Dropdown öffnen
                                if (watchDeviceType) {
                                  setAvailableBrands(getBrandsForDeviceType(watchDeviceType));
                                  setIsBrandDropdownOpen(e.target.value.length > 0);
                                  // Bei jeder Eingabe den Index zurücksetzen
                                  setSelectedBrandIndex(-1);
                                }
                              }}
                              onBlur={(e) => {
                                // Verwende die gefilterten Marken
                                const filteredBrands = availableBrands
                                  .filter(brand => !field.value || brand.toLowerCase().includes(field.value.toLowerCase()));
                                
                                // Wenn ein Element ausgewählt ist und wir wegnavigieren (z.B. mit Tab)
                                if (selectedBrandIndex >= 0 && filteredBrands.length > 0) {
                                  const selectedBrand = filteredBrands[selectedBrandIndex];
                                  field.onChange(selectedBrand);
                                  
                                  // Nur wenn der Fokus auf ein anderes Element gesetzt wird (nicht bei Klick außerhalb)
                                  if (e.relatedTarget) {
                                    const modelInput = document.querySelector('input[name="model"]');
                                    if (modelInput) {
                                      setTimeout(() => {
                                        (modelInput as HTMLInputElement).focus();
                                      }, 10);
                                    }
                                  }
                                }
                                
                                // Verzögerung, damit der Benutzer Zeit hat, einen Eintrag im Dropdown zu wählen
                                setTimeout(() => {
                                  setIsBrandDropdownOpen(false);
                                  setSelectedBrandIndex(-1);
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (!isBrandDropdownOpen) return;
                                
                                const filteredBrands = availableBrands
                                  .filter(brand => !field.value || brand.toLowerCase().includes(field.value.toLowerCase()));
                                
                                // Pfeiltaste nach unten
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSelectedBrandIndex(prev => 
                                    prev < filteredBrands.length - 1 ? prev + 1 : 0
                                  );
                                } 
                                // Pfeiltaste nach oben
                                else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedBrandIndex(prev => 
                                    prev > 0 ? prev - 1 : filteredBrands.length - 1
                                  );
                                } 
                                // Enter-Taste
                                else if (e.key === 'Enter' && selectedBrandIndex >= 0 && filteredBrands.length > 0) {
                                  e.preventDefault();
                                  const selectedBrand = filteredBrands[selectedBrandIndex];
                                  field.onChange(selectedBrand);
                                  setIsBrandDropdownOpen(false);
                                  setSelectedBrandIndex(-1);
                                  
                                  // Fokus zum nächsten Feld setzen
                                  const modelInput = document.querySelector('input[name="model"]');
                                  if (modelInput) {
                                    (modelInput as HTMLInputElement).focus();
                                  }
                                }
                              }}
                            />
                            
                            {/* Dropdown für die gespeicherten Marken */}
                            {availableBrands.length > 0 && watchDeviceType && field.value && isBrandDropdownOpen && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                                <div className="sticky top-0 bg-background border-b p-2">
                                  <span className="text-sm font-medium">Gespeicherte Marken</span>
                                </div>
                                
                                {availableBrands
                                  .filter(brand => !field.value || brand.toLowerCase().includes(field.value.toLowerCase()))
                                  .map((brand, index) => (
                                  <div 
                                    key={index} 
                                    className={`px-3 py-2 hover:bg-muted cursor-pointer ${selectedBrandIndex === index ? 'bg-muted' : ''}`}
                                    onMouseDown={(e) => {
                                      // Verhindert onBlur vor dem Klick
                                      e.preventDefault();
                                    }}
                                    onClick={() => {
                                      field.onChange(brand);
                                      // Nach der Auswahl den Fokus zum nächsten Feld setzen
                                      const modelInput = document.querySelector('input[name="model"]');
                                      if (modelInput) {
                                        (modelInput as HTMLInputElement).focus();
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      setSelectedBrandIndex(index);
                                    }}
                                  >
                                    {brand}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          {watchDeviceType ? 
                            "Geben Sie die Marke des Geräts ein" : 
                            "Bitte zuerst eine Geräteart auswählen"
                          }
                        </FormDescription>
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
                          <div className="relative">
                            <Input 
                              {...field} 
                              placeholder="z.B. iPhone 13 Pro"
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                setIsModelDropdownOpen(e.target.value.length > 0);
                                // Bei jeder Eingabe den Index zurücksetzen
                                setSelectedModelIndex(-1);
                                // Keine automatische Speicherung mehr während der Eingabe
                              }}
                              onFocus={() => {
                                if (savedModels.length > 0) {
                                  setIsModelDropdownOpen(field.value?.length > 0);
                                }
                              }}
                              onBlur={(e) => {
                                // Verwende die gefilterten Modelle
                                const filteredModels = savedModels
                                  .filter(model => !field.value || model.toLowerCase().includes(field.value.toLowerCase()));
                                
                                // Wenn ein Element ausgewählt ist und wir wegnavigieren (z.B. mit Tab)
                                if (selectedModelIndex >= 0 && filteredModels.length > 0) {
                                  const selectedModel = filteredModels[selectedModelIndex];
                                  field.onChange(selectedModel);
                                  
                                  // Nur wenn der Fokus auf ein anderes Element gesetzt wird (nicht bei Klick außerhalb)
                                  if (e.relatedTarget) {
                                    const serialNumberInput = document.querySelector('input[name="serialNumber"]');
                                    if (serialNumberInput) {
                                      setTimeout(() => {
                                        (serialNumberInput as HTMLInputElement).focus();
                                      }, 10);
                                    }
                                  }
                                }
                                
                                // Verzögert schließen, um Klick auf Dropdown-Items zu ermöglichen
                                setTimeout(() => {
                                  setIsModelDropdownOpen(false);
                                  setSelectedModelIndex(-1);
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (!isModelDropdownOpen) return;
                                
                                const filteredModels = savedModels
                                  .filter(model => !field.value || model.toLowerCase().includes(field.value.toLowerCase()));
                                
                                // Pfeiltaste nach unten
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSelectedModelIndex(prev => 
                                    prev < filteredModels.length - 1 ? prev + 1 : 0
                                  );
                                } 
                                // Pfeiltaste nach oben
                                else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedModelIndex(prev => 
                                    prev > 0 ? prev - 1 : filteredModels.length - 1
                                  );
                                } 
                                // Enter-Taste
                                else if (e.key === 'Enter' && selectedModelIndex >= 0 && filteredModels.length > 0) {
                                  e.preventDefault();
                                  const selectedModel = filteredModels[selectedModelIndex];
                                  field.onChange(selectedModel);
                                  setIsModelDropdownOpen(false);
                                  setSelectedModelIndex(-1);
                                  
                                  // Fokus zum nächsten Feld setzen
                                  const serialNumberInput = document.querySelector('input[name="serialNumber"]');
                                  if (serialNumberInput) {
                                    (serialNumberInput as HTMLInputElement).focus();
                                  }
                                }
                              }}
                            />
                            
                            {savedModels.length > 0 && isModelDropdownOpen && (
                              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto">
                                <div className="sticky top-0 bg-background border-b flex justify-between items-center p-2">
                                  <span className="text-sm font-medium">Gespeicherte Modelle</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (window.confirm('Möchten Sie wirklich alle gespeicherten Modelle löschen?')) {
                                        clearAllModels(); // Importierte Funktion aus localStorage.ts
                                        setSavedModels([]);
                                      }
                                    }}
                                  >
                                    Alle löschen
                                  </Button>
                                </div>
                                
                                {savedModels
                                  .filter(model => !field.value || model.toLowerCase().includes(field.value.toLowerCase()))
                                  .map((model, index) => (
                                    <div 
                                      key={model} 
                                      className={`px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center ${selectedModelIndex === index ? 'bg-muted' : ''}`}
                                      onMouseDown={(e) => {
                                        // Verhindert onBlur vor dem Klick
                                        e.preventDefault();
                                      }}
                                      onMouseEnter={() => {
                                        setSelectedModelIndex(index);
                                      }}
                                    >
                                      <div
                                        className="flex-grow"
                                        onClick={() => {
                                          field.onChange(model);
                                          setIsModelDropdownOpen(false);
                                          
                                          // Fokus zum nächsten Feld setzen
                                          const serialNumberInput = document.querySelector('input[name="serialNumber"]');
                                          if (serialNumberInput) {
                                            (serialNumberInput as HTMLInputElement).focus();
                                          }
                                        }}
                                      >
                                        {model}
                                      </div>
                                      <button
                                        type="button"
                                        className="text-destructive hover:bg-destructive hover:text-white rounded-full w-5 h-5 flex items-center justify-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteModel(watchDeviceType, watchBrand, model);
                                          setSavedModels(prev => prev.filter(m => m !== model));
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  
                                {savedModels.filter(model => !field.value || model.toLowerCase().includes(field.value.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-2 text-muted-foreground text-sm">
                                    Keine passenden Modelle gefunden
                                  </div>
                                )}
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
                        <FormLabel>Seriennummer (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Seriennummer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Problem Information Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg border-b pb-2">Problembeschreibung</h3>
                
                <FormField
                  control={form.control}
                  name="issue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fehlerbeschreibung</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Beschreiben Sie das Problem"
                          className="resize-none min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kostenvoranschlag (€)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="z.B. 150 oder 150-180"
                            {...field}
                            value={field.value === null || field.value === undefined ? '' : field.value}
                          />
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
                        <FormLabel>Anzahlung (€)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="z.B. 50"
                            {...field}
                            value={field.value === null || field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>Gerät beim Kunden, wenn ausgefüllt</FormDescription>
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
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notizen (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Interne Notizen"
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Speichere...' : 'Auftrag speichern'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}