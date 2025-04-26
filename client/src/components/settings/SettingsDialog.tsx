import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BusinessSettings } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Palette, 
  Printer, 
  Building2, 
  User2, 
  Mail, 
  Phone, 
  MapPin,
  Settings,
  MessageSquare,
  Smartphone,
  Plus,
  PenLine,
  Trash
} from "lucide-react";
import { EmailTemplateTab } from "@/components/settings/EmailTemplateTab";
import { SmsTemplateTab } from "@/components/settings/SmsTemplateTab";

const businessSettingsSchema = z.object({
  businessName: z.string().min(2, "Firmenname wird benötigt"),
  ownerFirstName: z.string().min(2, "Vorname wird benötigt"),
  ownerLastName: z.string().min(2, "Nachname wird benötigt"),
  taxId: z.string().optional(),
  streetAddress: z.string().min(3, "Straße wird benötigt"),
  city: z.string().min(2, "Ort wird benötigt"),
  zipCode: z.string().min(4, "PLZ wird benötigt"),
  country: z.string().min(2, "Land wird benötigt").default("Österreich"),
  phone: z.string().optional(),
  email: z.string().email("Ungültige E-Mail").optional(),
  website: z.string().optional(),
  colorTheme: z.enum(["blue", "green", "purple", "red", "orange"]).default("blue"),
  receiptWidth: z.enum(["58mm", "80mm"]).default("80mm"),
  
  // E-Mail-SMTP-Einstellungen
  smtpSenderName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.string().optional(),
});

// Erweiterte Form-Werte, die nicht direkt im Schema sind
interface ExtendedBusinessSettingsFormValues extends z.infer<typeof businessSettingsSchema> {
  logoImage?: string;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("business");
  const [activeEmailTab, setActiveEmailTab] = useState("templates");
  
  // Daten für Gerätearten und Marken aus der API holen
  const { data: deviceTypes = [], isLoading: isLoadingDeviceTypes } = useQuery<any[]>({
    queryKey: ['/api/device-types'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/device-types');
      return res.json();
    }
  });
  
  const { data: brands = [], isLoading: isLoadingBrands } = useQuery<any[]>({
    queryKey: ['/api/brands'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/brands');
      return res.json();
    }
  });
  
  // State für Dialoge
  const [isDeviceTypeDialogOpen, setIsDeviceTypeDialogOpen] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState<{id?: number, name: string} | null>(null);
  const [deviceTypeName, setDeviceTypeName] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<{id?: number, name: string, deviceTypeId: number} | null>(null);
  const [brandFormData, setBrandFormData] = useState({
    name: "",
    deviceTypeId: deviceTypes.length > 0 ? deviceTypes[0].id.toString() : "1" // String, da Select-Komponente Strings erwartet
  });
  
  // Mutations für Gerätearten
  const createDeviceTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      // Hier muss die userId explizit übergeben werden, damit das Backend die Verknüpfung herstellen kann
      const response = await apiRequest("POST", "/api/device-types", { 
        name, 
        userId: businessSettings?.userId 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setIsDeviceTypeDialogOpen(false);
      setSelectedDeviceType(null);
      toast({
        title: "Erfolg!",
        description: "Geräteart hinzugefügt.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Geräteart konnte nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  const updateDeviceTypeMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number, name: string }) => {
      const response = await apiRequest("PATCH", `/api/device-types/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setIsDeviceTypeDialogOpen(false);
      setSelectedDeviceType(null);
      toast({
        title: "Erfolg!",
        description: "Geräteart aktualisiert.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Geräteart konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  const deleteDeviceTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/device-types/${id}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-types'] });
      toast({
        title: "Erfolg!",
        description: "Geräteart gelöscht.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Geräteart konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  // Funktionen für Gerätearten
  const handleAddDeviceType = () => {
    setSelectedDeviceType({ name: "" });
    setDeviceTypeName("");
    setIsDeviceTypeDialogOpen(true);
  };
  
  const handleEditDeviceType = (deviceType: {id: number, name: string}) => {
    setSelectedDeviceType(deviceType);
    setDeviceTypeName(deviceType.name);
    setIsDeviceTypeDialogOpen(true);
  };
  
  const handleSaveDeviceType = (name: string) => {
    if (!name.trim()) return;
    
    if (selectedDeviceType?.id) {
      // Bearbeiten
      updateDeviceTypeMutation.mutate({ id: selectedDeviceType.id, name });
    } else {
      // Neu hinzufügen
      createDeviceTypeMutation.mutate(name);
    }
  };
  
  const handleDeleteDeviceType = (id: number) => {
    // Die Backendlogik prüft bereits, ob die Geräteart von Marken verwendet wird
    if (confirm("Möchten Sie diese Geräteart wirklich löschen?")) {
      deleteDeviceTypeMutation.mutate(id);
    }
  };
  
  // Mutations für Marken
  const createBrandMutation = useMutation({
    mutationFn: async (data: { name: string, deviceTypeId: number }) => {
      // Hier muss auch die userId explizit übergeben werden
      const response = await apiRequest("POST", "/api/brands", {
        ...data,
        userId: businessSettings?.userId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setIsBrandDialogOpen(false);
      setSelectedBrand(null);
      toast({
        title: "Erfolg!",
        description: "Marke hinzugefügt.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Marke konnte nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string, deviceTypeId: number } }) => {
      const response = await apiRequest("PATCH", `/api/brands/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      setIsBrandDialogOpen(false);
      setSelectedBrand(null);
      toast({
        title: "Erfolg!",
        description: "Marke aktualisiert.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Marke konnte nicht aktualisiert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/brands/${id}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brands'] });
      toast({
        title: "Erfolg!",
        description: "Marke gelöscht.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Marke konnte nicht gelöscht werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  // Funktionen für Marken
  const handleAddBrand = () => {
    if (deviceTypes.length === 0) {
      toast({
        title: "Nicht möglich",
        description: "Bitte erstellen Sie zuerst mindestens eine Geräteart.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    setSelectedBrand({ name: "", deviceTypeId: deviceTypes[0].id });
    setBrandFormData({
      name: "",
      deviceTypeId: deviceTypes[0].id.toString()
    });
    setIsBrandDialogOpen(true);
  };
  
  const handleEditBrand = (brand: {id: number, name: string, deviceTypeId: number}) => {
    setSelectedBrand(brand);
    setBrandFormData({
      name: brand.name,
      deviceTypeId: brand.deviceTypeId.toString()
    });
    setIsBrandDialogOpen(true);
  };
  
  const handleSaveBrand = (data: {name: string, deviceTypeId: string}) => {
    const name = data.name.trim();
    if (!name) return;
    
    const deviceTypeId = parseInt(data.deviceTypeId);
    if (isNaN(deviceTypeId)) return;
    
    if (selectedBrand?.id) {
      // Bearbeiten
      updateBrandMutation.mutate({ 
        id: selectedBrand.id, 
        data: { name, deviceTypeId } 
      });
    } else {
      // Neu hinzufügen
      createBrandMutation.mutate({ name, deviceTypeId });
    }
  };
  
  const handleDeleteBrand = (id: number) => {
    if (confirm("Möchten Sie diese Marke wirklich löschen?")) {
      deleteBrandMutation.mutate(id);
    }
  };

  // Max. Logo-Größe in Bytes (1MB)
  const MAX_LOGO_SIZE = 1024 * 1024;

  // Lade die bestehenden Unternehmenseinstellungen
  const { data: settings, isLoading } = useQuery<BusinessSettings | null>({
    queryKey: ["/api/business-settings"],
    enabled: open,
  });
  
  // Für das Hinzufügen von Gerätearten und Marken
  const businessSettings = settings;

  const form = useForm<ExtendedBusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      businessName: "",
      ownerFirstName: "",
      ownerLastName: "",
      taxId: "",
      streetAddress: "",
      city: "",
      zipCode: "",
      country: "Österreich",
      phone: "",
      email: "",
      website: "",
      logoImage: "",
      colorTheme: "blue",
      receiptWidth: "80mm",
      // SMTP-Einstellungen
      smtpSenderName: "",
      smtpHost: "",
      smtpUser: "",
      smtpPassword: "",
      smtpPort: "",
    },
  });

  // Aktualisiere die Formularwerte, wenn die Daten geladen sind
  useEffect(() => {
    if (settings) {
      // Validiere das colorTheme
      let validColorTheme: "blue" | "green" | "purple" | "red" | "orange" = "blue";
      if (["blue", "green", "purple", "red", "orange"].includes(settings.colorTheme)) {
        validColorTheme = settings.colorTheme as "blue" | "green" | "purple" | "red" | "orange";
      }
      
      // Validiere die Bonbreite
      let validReceiptWidth = "80mm";
      if (["58mm", "80mm"].includes(settings.receiptWidth)) {
        validReceiptWidth = settings.receiptWidth as "58mm" | "80mm";
      }
      
      form.reset({
        businessName: settings.businessName,
        ownerFirstName: settings.ownerFirstName,
        ownerLastName: settings.ownerLastName,
        taxId: settings.taxId || "",
        streetAddress: settings.streetAddress,
        city: settings.city,
        zipCode: settings.zipCode,
        country: settings.country,
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        logoImage: settings.logoImage || "",
        colorTheme: validColorTheme,
        receiptWidth: validReceiptWidth as "58mm" | "80mm",
        // SMTP-Einstellungen
        smtpSenderName: settings.smtpSenderName || "",
        smtpHost: settings.smtpHost || "",
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword || "",
        smtpPort: settings.smtpPort || "",
      });

      // Vorschau des gespeicherten Logos anzeigen, wenn vorhanden
      if (settings.logoImage) {
        setLogoPreview(settings.logoImage);
      }
    }
  }, [settings, form]);

  // Funktion zum Validieren des hochgeladenen Bildes
  const validateImage = (file: File): Promise<{ isValid: boolean; base64: string | null; error: string | null }> => {
    return new Promise((resolve) => {
      // Überprüfen der Dateigröße
      if (file.size > MAX_LOGO_SIZE) {
        resolve({
          isValid: false,
          base64: null,
          error: `Die Datei ist zu groß. Maximale Größe ist ${MAX_LOGO_SIZE / 1024}KB.`
        });
        return;
      }

      // Überprüfen des Dateityps
      if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'].includes(file.type)) {
        resolve({
          isValid: false,
          base64: null,
          error: 'Nur JPEG, PNG, SVG, GIF und WEBP Dateien sind erlaubt.'
        });
        return;
      }

      // Bild in Base64 konvertieren
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Keine Auflösungsbegrenzung mehr, stattdessen skalieren wir das Bild bei Bedarf
          // Das Originalformat wird ohne Modifikation im Base64-Format gespeichert
          resolve({
            isValid: true,
            base64: e.target?.result as string,
            error: null
          });
        };
        img.onerror = () => {
          resolve({
            isValid: false,
            base64: null,
            error: 'Das Bild konnte nicht geladen werden.'
          });
        };
        
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Event-Handler für das Hochladen des Logos
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const result = await validateImage(file);

    if (result.isValid && result.base64) {
      setLogoPreview(result.base64);
      form.setValue('logoImage', result.base64);
      setLogoError(null);
    } else {
      setLogoError(result.error || 'Unbekannter Fehler beim Hochladen des Logos.');
      // Input zurücksetzen
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Funktion zum Löschen des Logos
  const handleDeleteLogo = () => {
    setLogoPreview(null);
    form.setValue('logoImage', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: ExtendedBusinessSettingsFormValues) => {
      // Wir senden das Logo als Base64-String mit
      const response = await apiRequest("POST", "/api/business-settings", {
        ...data,
        logoImage: logoPreview
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      toast({
        title: "Erfolg!",
        description: "Einstellungen wurden aktualisiert.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      onClose(); // Dialog schließen
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
    },
  });

  function onSubmit(data: ExtendedBusinessSettingsFormValues) {
    updateMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Passen Sie Ihre Unternehmenseinstellungen und Kommunikationsoptionen an.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Unternehmen
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Kommunikation
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Darstellung
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Geräte & Marken
            </TabsTrigger>
          </TabsList>

          {/* Tab: Unternehmenseinstellungen */}
          <TabsContent value="business" className="max-h-[65vh] overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo Upload UI */}
                <div className="mb-6">
                  <FormLabel>Firmenlogo</FormLabel>
                  <FormDescription>
                    Laden Sie Ihr Firmenlogo hoch (max. 1MB, PNG, JPG, SVG, GIF oder WEBP). Hochauflösende Bilder werden automatisch skaliert.
                  </FormDescription>
                  
                  <div className="mt-3 flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* Logo Vorschau */}
                    <div className={`relative flex justify-center items-center h-24 w-24 rounded-md border border-input 
                      ${logoPreview ? 'bg-white' : 'bg-muted'}`}>
                      {logoPreview ? (
                        <>
                          <img
                            src={logoPreview}
                            alt="Firmenlogo"
                            className="max-h-full max-w-full object-contain rounded-md"
                          />
                          <button
                            type="button"
                            onClick={handleDeleteLogo}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground h-5 w-5 rounded-full flex items-center justify-center"
                            aria-label="Logo löschen"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Upload Button */}
                    <div className="flex flex-col gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Logo hochladen
                      </Button>
                      
                      {logoError && (
                        <Alert variant="destructive" className="p-3 text-sm">
                          <AlertDescription>{logoError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>

                {/* Firmen-Grunddaten */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Unternehmensdaten
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Firmenname *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Handyshop GmbH" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Umsatzsteuer-ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ATU12345678" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Inhaber */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <User2 className="h-4 w-4" /> Inhaber
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vorname (Inhaber) *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Max" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nachname (Inhaber) *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mustermann" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Adresse */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Adresse
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Straße und Hausnummer *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Musterstraße 1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1010" />
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
                          <FormLabel>Ort *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Wien" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Land *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Österreich" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Kontakt */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Kontakt
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+43 1 234 5678" />
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
                            <Input {...field} placeholder="info@handyshop.at" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="www.handyshop.at" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Wird gespeichert..." : "Unternehmensdaten speichern"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Tab: Kommunikation */}
          <TabsContent value="communication" className="max-h-[65vh] overflow-y-auto space-y-6">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> E-Mail
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> SMS
                </TabsTrigger>
              </TabsList>
              
              {/* E-Mail-Einstellungen */}
              <TabsContent value="email">
                <Tabs defaultValue="templates">
                  <TabsList className="mb-4">
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Vorlagen
                    </TabsTrigger>
                    <TabsTrigger value="server" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" /> SMTP-Server
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* E-Mail-Vorlagen */}
                  <TabsContent value="templates">
                    <EmailTemplateTab />
                  </TabsContent>
                  
                  {/* SMTP-Server-Einstellungen */}
                  <TabsContent value="server">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-md font-medium mb-3">E-Mail-Server-Einstellungen (SMTP)</h3>
                          <p className="text-sm text-muted-foreground mb-5">
                            Hier können Sie Ihren eigenen E-Mail-Server konfigurieren, um E-Mails an Kunden zu senden.
                            Diese Einstellungen sind optional. Wenn nicht ausgefüllt, wird der zentrale Mail-Server verwendet.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="smtpSenderName"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Absendername für E-Mails</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Handyshop Service" />
                                  </FormControl>
                                  <FormDescription>
                                    Dieser Name wird als Absender in E-Mails angezeigt
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="smtpHost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMTP Server</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="smtp.beispiel.at" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="smtpPort"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMTP Port</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="587" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="smtpUser"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMTP Benutzername</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="benutzername" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="smtpPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMTP Passwort</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" placeholder="••••••••" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Wird gespeichert..." : "SMTP-Einstellungen speichern"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </TabsContent>
              
              {/* SMS-Einstellungen */}
              <TabsContent value="sms">
                <SmsTemplateTab />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          {/* Tab: Geräte & Marken */}
          <TabsContent value="devices" className="max-h-[65vh] overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Gerätearten</h3>
                <div className="border rounded-md">
                  <div className="p-4 flex justify-between items-center border-b">
                    <div className="font-medium">Gerätearten verwalten</div>
                    <Button size="sm" className="gap-1" onClick={handleAddDeviceType}>
                      <Plus className="h-4 w-4" /> Neue Geräteart
                    </Button>
                  </div>
                  {deviceTypes.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Keine Gerätearten vorhanden. Fügen Sie eine neue Geräteart hinzu.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deviceTypes.map((deviceType) => (
                            <TableRow key={deviceType.id}>
                              <TableCell>{deviceType.name}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditDeviceType(deviceType)}
                                    title="Geräteart bearbeiten"
                                  >
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteDeviceType(deviceType.id)}
                                    title="Geräteart löschen"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Marken</h3>
                <div className="border rounded-md">
                  <div className="p-4 flex justify-between items-center border-b">
                    <div className="font-medium">Marken verwalten</div>
                    <Button size="sm" className="gap-1" onClick={handleAddBrand}>
                      <Plus className="h-4 w-4" /> Neue Marke
                    </Button>
                  </div>
                  {brands.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Keine Marken vorhanden. Fügen Sie eine neue Marke hinzu.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Gerätetyp</TableHead>
                            <TableHead className="text-right">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {brands.map((brand) => (
                            <TableRow key={brand.id}>
                              <TableCell>{brand.name}</TableCell>
                              <TableCell>{brand.deviceTypeName}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditBrand(brand)}
                                    title="Marke bearbeiten"
                                  >
                                    <PenLine className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteBrand(brand.id)}
                                    title="Marke löschen"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Dialog für Geräteart hinzufügen/bearbeiten */}
            <Dialog open={isDeviceTypeDialogOpen} onOpenChange={setIsDeviceTypeDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedDeviceType?.id ? "Geräteart bearbeiten" : "Neue Geräteart hinzufügen"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceTypeName">Name</Label>
                    <Input 
                      id="deviceTypeName" 
                      placeholder="z.B. Smartphone, Tablet, etc." 
                      value={deviceTypeName}
                      onChange={(e) => setDeviceTypeName(e.target.value)}
                      ref={(input) => input?.focus()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeviceTypeDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={() => {
                      const name = deviceTypeName.trim();
                      if (!name) return;
                      handleSaveDeviceType(name);
                    }}
                  >
                    Speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Dialog für Marke hinzufügen/bearbeiten */}
            <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedBrand?.id ? "Marke bearbeiten" : "Neue Marke hinzufügen"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Name</Label>
                    <Input 
                      id="brandName" 
                      placeholder="z.B. Apple, Samsung, etc." 
                      value={brandFormData.name}
                      onChange={(e) => setBrandFormData({...brandFormData, name: e.target.value})}
                      ref={(input) => input?.focus()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deviceTypeSelect">Gerätetyp</Label>
                    <Select 
                      value={brandFormData.deviceTypeId}
                      onValueChange={(value) => setBrandFormData({...brandFormData, deviceTypeId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Gerätetyp auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceTypes.map((dt) => (
                          <SelectItem key={dt.id} value={dt.id.toString()}>
                            {dt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBrandDialogOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={() => {
                      const name = brandFormData.name.trim();
                      if (!name) return;
                      
                      handleSaveBrand({
                        name, 
                        deviceTypeId: brandFormData.deviceTypeId
                      });
                    }}
                  >
                    Speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          {/* Tab: Darstellung */}
          <TabsContent value="appearance" className="max-h-[65vh] overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3">Erscheinungsbild und Darstellungsoptionen</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Passen Sie das Aussehen der Anwendung und Ausgabeformate an.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-8">
                    <FormField
                      control={form.control}
                      name="colorTheme"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="flex items-center gap-2">
                            <Palette className="h-4 w-4" /> Farbpalette
                          </FormLabel>
                          <FormDescription>
                            Wählen Sie eine Farbpalette für die Anwendung.
                          </FormDescription>
                          <div className="grid grid-cols-5 gap-3 my-4">
                            {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
                              <div 
                                key={color}
                                onClick={() => form.setValue('colorTheme', color as any)}
                                className={`
                                  w-full aspect-square rounded-lg cursor-pointer transition-all 
                                  ${field.value === color ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'} 
                                  ${color === 'blue' ? 'bg-blue-600' : ''}
                                  ${color === 'green' ? 'bg-green-600' : ''}
                                  ${color === 'purple' ? 'bg-purple-600' : ''}
                                  ${color === 'red' ? 'bg-red-600' : ''}
                                  ${color === 'orange' ? 'bg-orange-600' : ''}
                                `}
                              />
                            ))}
                          </div>
                          <FormControl>
                            <Select 
                              defaultValue={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Farbpalette wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="blue">Blau</SelectItem>
                                <SelectItem value="green">Grün</SelectItem>
                                <SelectItem value="purple">Lila</SelectItem>
                                <SelectItem value="red">Rot</SelectItem>
                                <SelectItem value="orange">Orange</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="receiptWidth"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="flex items-center gap-2">
                            <Printer className="h-4 w-4" /> Bonbreite
                          </FormLabel>
                          <FormDescription>
                            Wählen Sie die Breite des Thermobondruckers.
                          </FormDescription>
                          <FormControl>
                            <Select 
                              defaultValue={field.value} 
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Bonbreite wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="80mm">80mm Bon</SelectItem>
                                <SelectItem value="58mm">58mm Bon</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Wird gespeichert..." : "Darstellungsoptionen speichern"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}