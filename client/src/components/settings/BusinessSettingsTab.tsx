import React, { useState } from 'react';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Save, Building } from 'lucide-react';

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
  // Öffnungszeiten für E-Mail-Vorlagen
  openingHours: z.string().optional(),
  receiptWidth: z.enum(["58mm", "80mm"]),
  // SMTP-Einstellungen
  smtpSenderName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.string().optional(),
  // Bewertungslink
  reviewLink: z.string().optional(),
  // Kiosk-Modus PIN
  kioskPin: z.string().min(4, "PIN muss mindestens 4 Zeichen haben").max(10, "PIN darf maximal 10 Zeichen haben").optional(),
  // Reparaturbedingungen
  repairTerms: z.string().optional(),
});

// Erweiterte Formulardaten mit zusätzlichen Feldern
interface ExtendedBusinessSettingsFormValues extends z.infer<typeof businessSettingsSchema> {
  logoImage?: string;
}

export function BusinessSettingsTab() {
  // Refs und State für das Logo-Upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const { settings, isLoading } = useBusinessSettings();
  const { toast } = useToast();
  
  // Maximale Dateigröße für Logo in Bytes (2MB)
  const MAX_LOGO_SIZE = 2 * 1024 * 1024;

  // Form Definition mit React Hook Form und Zod Validierung
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
      // Öffnungszeiten für E-Mail-Vorlagen
      openingHours: "",
      receiptWidth: "80mm",
      // SMTP-Einstellungen
      smtpSenderName: "",
      smtpHost: "",
      smtpUser: "",
      smtpPassword: "",
      smtpPort: "",
      // Bewertungslink
      reviewLink: "",
      // Kiosk-Modus PIN
      kioskPin: "1234",
      // Reparaturbedingungen
      repairTerms: "",
    },
  });

  // Funktion für das Logo-Upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    
    // Keine Datei ausgewählt
    if (!file) return;
    
    // Überprüfe die Dateigröße (max 2MB)
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(`Die Datei ist zu groß (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximale Größe: 2 MB.`);
      return;
    }
    
    // Überprüfe den Dateityp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Nur JPG, PNG und SVG-Dateien sind erlaubt.');
      return;
    }
    
    // Lese die Datei als Data-URL
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('File loaded successfully');
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setLogoPreview(dataUrl);
        form.setValue('logoImage', dataUrl);
        console.log('Logo preview set and form value updated');
        
        // Sofort die Einstellungen mit dem neuen Logo speichern
        const currentFormData = form.getValues();
        updateMutation.mutate({
          ...currentFormData,
          logoImage: dataUrl
        });
      }
    };
    reader.onerror = () => {
      setLogoError('Fehler beim Lesen der Datei.');
    };
    reader.readAsDataURL(file);
  };
  
  // Aktualisieren der Formularwerte, wenn Einstellungen geladen werden
  React.useEffect(() => {
    if (settings) {
      // Wenn ein gespeichertes Logo-Bild existiert, initialisiere die Vorschau
      if (settings.logoImage) {
        setLogoPreview(settings.logoImage);
      }
      
      // Extrahieren Sie nur die benötigten Felder für das Formular
      const receiptWidth = (settings.receiptWidth === "58mm" || settings.receiptWidth === "80mm") 
        ? settings.receiptWidth as "58mm" | "80mm" 
        : "80mm" as const;
        
      // Sicherstellen, dass null-Werte in undefined umgewandelt werden
      const formattedSettings: ExtendedBusinessSettingsFormValues = {
        businessName: settings.businessName || "",
        ownerFirstName: settings.ownerFirstName || "",
        ownerLastName: settings.ownerLastName || "",
        taxId: settings.taxId ?? "",
        streetAddress: settings.streetAddress || "",
        city: settings.city || "",
        zipCode: settings.zipCode || "",
        country: settings.country || "Österreich",
        phone: settings.phone === null ? undefined : settings.phone,
        email: settings.email === null ? undefined : settings.email,
        website: settings.website === null ? undefined : settings.website,
        logoImage: settings.logoImage === null ? undefined : settings.logoImage,
        receiptWidth,
        smtpHost: settings.smtpHost === null ? undefined : settings.smtpHost,
        smtpPort: settings.smtpPort === null ? undefined : settings.smtpPort,
        smtpUser: settings.smtpUser === null ? undefined : settings.smtpUser,
        smtpPassword: settings.smtpPassword === null ? undefined : settings.smtpPassword,
        smtpSenderName: settings.smtpSenderName === null ? undefined : settings.smtpSenderName,
        openingHours: settings.openingHours === null ? undefined : settings.openingHours,
        reviewLink: settings.reviewLink === null ? undefined : settings.reviewLink,
        kioskPin: settings.kioskPin === null ? "1234" : settings.kioskPin
      };
      
      form.reset(formattedSettings);
    }
  }, [settings, form]);

  // Mutation für das Update der Unternehmenseinstellungen
  const updateMutation = useMutation({
    mutationFn: async (data: ExtendedBusinessSettingsFormValues) => {
      const response = await apiRequest("POST", "/api/business-settings", data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      toast({
        title: "Erfolg!",
        description: "Die Einstellungen wurden gespeichert.",
        duration: 2000,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  // Formular absenden
  function onSubmit(data: ExtendedBusinessSettingsFormValues) {
    console.log('Form submitted with data:', Object.keys(data));
    updateMutation.mutate(data);
  }

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Lade Einstellungen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Geschäftseinstellungen</h1>
          <p className="text-sm text-gray-500">Verwalten Sie Ihre geschäftlichen Daten</p>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending} 
          variant="default" 
          size="sm" 
          className="flex items-center h-8 text-xs px-3"
        >
          <Save className="h-3 w-3 mr-1" /> Speichern
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="mb-4 md:mb-6">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="text-base md:text-lg font-semibold">Geschäftsinformationen</CardTitle>
              <CardDescription className="text-xs md:text-sm">Grundlegende Informationen über Ihr Unternehmen</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-3 space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Unternehmensname*</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Handyshop GmbH" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Steuernummer</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. ATU12345678" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ownerFirstName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Vorname*</FormLabel>
                      <FormControl>
                        <Input placeholder="Max" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ownerLastName"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Nachname*</FormLabel>
                      <FormControl>
                        <Input placeholder="Mustermann" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Adresse */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Straße und Hausnummer*</FormLabel>
                      <FormControl>
                        <Input placeholder="Hauptstraße 1" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">PLZ*</FormLabel>
                      <FormControl>
                        <Input placeholder="1010" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Ort*</FormLabel>
                      <FormControl>
                        <Input placeholder="Wien" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Land*</FormLabel>
                      <FormControl>
                        <Input placeholder="Österreich" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Kontakt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+43 1 234 5678" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">E-Mail</FormLabel>
                      <FormControl>
                        <Input placeholder="info@handyshop.at" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Website</FormLabel>
                      <FormControl>
                        <Input placeholder="www.handyshop.at" {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="openingHours"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Öffnungszeiten</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Mo-Fr: 9-18 Uhr, Sa: 9-13 Uhr" 
                          {...field} 
                          className="h-9 text-sm" 
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="reviewLink"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Bewertungslink</FormLabel>
                      <FormControl>
                        <Input placeholder="https://g.page/review/..." {...field} className="h-9 text-sm" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="kioskPin"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Kiosk-Modus PIN</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234" 
                          {...field} 
                          className="h-9 text-sm" 
                          type="password"
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                      <p className="text-xs text-gray-500">
                        PIN für die Aktivierung des Kiosk-Modus auf Tablets (4-10 Zeichen)
                      </p>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Reparaturbedingungen */}
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="repairTerms"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm">Reparaturbedingungen</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Geben Sie hier Ihre Reparaturbedingungen ein. Diese werden bei der Kiosk-Unterschrift angezeigt..."
                          {...field} 
                          className="min-h-[120px] text-sm"
                          rows={6}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                      <p className="text-xs text-gray-500">
                        Diese Bedingungen werden Kunden bei der digitalen Unterschrift im Kiosk-Modus angezeigt
                      </p>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Logo Upload */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <FormLabel className="text-sm mb-0">Firmenlogo</FormLabel>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Logo hochladen
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
                
                {logoError && (
                  <div className="text-red-500 text-xs mb-2">{logoError}</div>
                )}
                
                <div className="border border-gray-200 rounded-md p-3 h-24 md:h-32 flex items-center justify-center bg-gray-50">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Firmenlogo Vorschau" 
                      className="max-h-full max-w-full" 
                    />
                  ) : (
                    <div className="text-gray-400 text-xs">Kein Logo hochgeladen</div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Empfohlene Größe: 300x100px. Max: 2MB. Formate: JPG, PNG, SVG.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}