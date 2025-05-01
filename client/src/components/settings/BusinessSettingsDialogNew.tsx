// Komplett neue Implementierung des BusinessSettingsDialog
import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  TabsContent
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useBusinessSettings } from "@/hooks/use-business-settings";
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
  MailPlus,
  BellRing,
  Globe,
  AlertCircle
} from "lucide-react";
// DeviceTypeSettings wird nicht mehr verwendet

// Schema für die Geschäftseinstellungen
const businessSettingsSchema = z.object({
  businessName: z.string().min(1, "Unternehmensname ist erforderlich"),
  ownerFirstName: z.string().min(1, "Vorname ist erforderlich"),
  ownerLastName: z.string().min(1, "Nachname ist erforderlich"),
  taxId: z.string().optional(),
  streetAddress: z.string().min(1, "Straße und Hausnummer sind erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  zipCode: z.string().min(1, "PLZ ist erforderlich"),
  country: z.string().min(1, "Land ist erforderlich"),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  // colorTheme wurde entfernt - ein Standard-Theme wird jetzt für alle verwendet
  receiptWidth: z.enum(["58mm", "80mm"]),
  // SMTP-Einstellungen
  smtpSenderName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.string().optional(),
  // Bewertungslink
  reviewLink: z.string().optional(),
});

// Erweiterte Formulardaten die nicht im Schema sind
interface ExtendedBusinessSettingsFormValues extends z.infer<typeof businessSettingsSchema> {
  logoImage?: string;
  // Das colorTheme-Feld ist für die Typisierung weiterhin vorhanden, wird aber nicht mehr verwendet
  colorTheme?: string;
}

interface BusinessSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  initialActiveTab?: "unternehmen" | "email" | "design";
}

export function BusinessSettingsDialogNew({ open, onClose, initialActiveTab = "unternehmen" }: BusinessSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  // Verwende den initialActiveTab als Anfangswert
  const [activeTab, setActiveTab] = useState<"unternehmen" | "email" | "design">(initialActiveTab);
  
  // Abrufen des Preispakets, um zu prüfen, ob der Benutzer im Basic-Paket ist
  const { data: quotaData } = useQuery<{
    pricingPlan: string;
    displayName: string;
  }>({
    queryKey: ["/api/repair-quota"],
  });
  
  // Ist der Benutzer auf Professional oder höher?
  const isProfessionalOrHigher = quotaData?.pricingPlan === 'professional' || quotaData?.pricingPlan === 'enterprise';
  
  // Verwende den BusinessSettings Hook
  const { settings, isLoading, refetch } = useBusinessSettings();

  // Max. Logo-Größe in Bytes (1MB)
  const MAX_LOGO_SIZE = 1024 * 1024;

  console.log("NEUE IMPLEMENTATION - BusinessSettingsDialog geöffnet");
  console.log("NEUE IMPLEMENTATION - Settings im Hook:", settings ? settings.id : 'keine');
  
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
      // colorTheme wird nicht mehr verwendet - Standard-Theme für alle
      receiptWidth: "80mm",
      // SMTP-Einstellungen
      smtpSenderName: "",
      smtpHost: "",
      smtpUser: "",
      smtpPassword: "",
      smtpPort: "",
      // Bewertungslink
      reviewLink: "",
    },
  });

  // Aktualisiere die Formularwerte, wenn die Daten geladen sind
  React.useEffect(() => {
    if (settings) {
      console.log("NEUE IMPLEMENTATION - Einstellungen geladen, setze Formulardaten", settings.id);
      
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
        reviewLink: settings.reviewLink || "",
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
      console.log('NEUE IMPLEMENTATION - Sende Daten an Server:', { hasLogo: !!logoPreview });
      
      try {
        // In dieser neuen Implementierung senden wir keine userId mehr mit
        const requestData = {
          ...data, // Die regulären Formulardaten
          logoImage: logoPreview // Das Logo als Base64
        };
        
        console.log('NEUE IMPLEMENTATION - Request data keys:', Object.keys(requestData));
        
        const response = await apiRequest("POST", "/api/business-settings", requestData);
        console.log('NEUE IMPLEMENTATION - Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server-Fehler: ${response.status} ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('NEUE IMPLEMENTATION - Response from server:', responseData.id);
        return responseData;
      } catch (error) {
        console.error('NEUE IMPLEMENTATION - Error in mutation:', error);
        if (error instanceof Error) {
          console.error('NEUE IMPLEMENTATION - Error message:', error.message);
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidiere den Cache ohne spezifische User-ID
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      
      toast({
        title: "Erfolg!",
        description: "Unternehmenseinstellungen wurden aktualisiert.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      
      // Cache direkt aktualisieren durch erneutes Abrufen
      refetch();
      
      onClose(); // Dialog schließen
    },
    onError: (error) => {
      console.error('NEUE IMPLEMENTATION - Mutation error:', error);
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
    },
  });

  function onSubmit(data: ExtendedBusinessSettingsFormValues) {
    console.log('NEUE IMPLEMENTATION - Form submitted with data:', Object.keys(data));
    
    try {
      console.log('NEUE IMPLEMENTATION - Submitting form data directly without userId');
      updateMutation.mutate(data);
    } catch (error) {
      console.error('NEUE IMPLEMENTATION - Fehler bei der Formularverarbeitung:', error);
      toast({
        title: "Fehler!",
        description: "Beim Verarbeiten der Formulardaten ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unternehmenseinstellungen</DialogTitle>
          <DialogDescription>
            Geben Sie hier die Daten Ihres Unternehmens ein. Diese werden für Rechnungen und andere Dokumente verwendet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue={initialActiveTab} value={activeTab} onValueChange={(value) => {
              // Verhindert, dass ein neues Fenster geöffnet wird
              setActiveTab(value as "unternehmen" | "email" | "design");
            }}>

              <TabsList className="w-full grid grid-cols-3 gap-1">
                <TabsTrigger value="unternehmen" className="flex items-center justify-center text-xs sm:text-sm">
                  <Building2 className="h-4 w-4 mr-1 sm:mr-2" /> <span>Firma</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center justify-center text-xs sm:text-sm">
                  <MailPlus className="h-4 w-4 mr-1 sm:mr-2" /> <span>E-Mail</span>
                </TabsTrigger>
                <TabsTrigger value="design" className="flex items-center justify-center text-xs sm:text-sm">
                  <Palette className="h-4 w-4 mr-1 sm:mr-2" /> <span>Design</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="unternehmen" className="mt-4">
                {/* Logo Upload UI */}
                <div className="mb-6">
                  <FormLabel>Firmenlogo</FormLabel>
                  <FormDescription className="text-xs sm:text-sm">
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
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" /> Logo hochladen
                      </Button>
                      
                      {/* Fehler Anzeige */}
                      {logoError && (
                        <Alert variant="destructive" className="py-2 px-3">
                          <AlertDescription className="text-xs">
                            {logoError}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Unternehmensname*</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Handyshop GmbH" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownerFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname des Inhabers*</FormLabel>
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
                        <FormLabel>Nachname des Inhabers*</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Mustermann" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>UID-Nummer (ATU)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ATU12345678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetAddress"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Straße und Hausnummer*</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Hauptstraße 1" />
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
                        <FormLabel>PLZ*</FormLabel>
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
                        <FormLabel>Ort*</FormLabel>
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
                      <FormItem>
                        <FormLabel>Land*</FormLabel>
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
                          <Input {...field} placeholder="info@handyshop.at" type="email" />
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
              </TabsContent>
              
              <TabsContent value="email" className="mt-4 space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-medium flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" /> SMTP-Einstellungen
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                    Geben Sie die SMTP-Einstellungen Ihres E-Mail-Servers ein. Diese werden verwendet, um E-Mails an Ihre Kunden zu senden.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="smtpSenderName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Absendername</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Handyshop Support" />
                        </FormControl>
                        <FormDescription className="text-xs sm:text-sm">
                          Name, der beim Empfänger als Absender angezeigt wird
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="smtpHost"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>SMTP Server</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="smtp.example.com" />
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
                  
                  <div className="sm:col-span-2">
                    <div className="mt-2 mb-4 border-t border-border pt-4">
                      <h4 className="text-xs sm:text-sm font-medium mb-2">Anmeldeinformationen</h4>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="smtpUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Benutzername</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="user@example.com" />
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
                          <Input {...field} type="password" placeholder="**********" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="sm:col-span-2">
                    <div className="mt-2 mb-4 border-t border-border pt-4">
                      <h4 className="text-xs sm:text-sm font-medium mb-2">Kommunikation mit Kunden</h4>
                    </div>
                  </div>
                  
                  {isProfessionalOrHigher ? (
                    <FormField
                      control={form.control}
                      name="reviewLink"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="flex items-center gap-1 sm:gap-2">
                            <Globe className="h-3 w-3 sm:h-4 sm:w-4" /> Bewertungslink
                          </FormLabel>
                          <FormDescription className="text-xs sm:text-sm">
                            Link zu Ihrer Google-Bewertungsseite oder ähnlichem. Wird für Kundenbewertungsanfragen verwendet.
                          </FormDescription>
                          <FormControl>
                            <Input {...field} placeholder="https://g.page/r/..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="sm:col-span-2 p-3 border rounded-md bg-amber-50 text-amber-600 text-sm">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Bewertungslink nur in Professional verfügbar
                      </span>
                      <p className="mt-1 text-xs text-amber-600">
                        Upgrade auf Professional, um Bewertungsanfragen an Kunden zu senden
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="design" className="mt-4 space-y-6">
                
                <FormField
                  control={form.control}
                  name="receiptWidth"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-1 sm:gap-2">
                        <Printer className="h-3 w-3 sm:h-4 sm:w-4" /> Bonbreite
                      </FormLabel>
                      <FormDescription className="text-xs sm:text-sm">
                        Wählen Sie die Breite Ihres Bondruckers für die richtige Formatierung der Belege.
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
                            <SelectItem value="58mm">58mm (klein)</SelectItem>
                            <SelectItem value="80mm">80mm (standard)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              

            </Tabs>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Speichern...
                  </>
                ) : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}