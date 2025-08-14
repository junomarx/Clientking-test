import React, { useState } from 'react';
import { Save, Building, User, Palette, ChevronLeft, Package } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmailTemplateTab } from '@/components/settings/EmailTemplateTab';
import { useLocation } from 'wouter';
import { UserSettingsTab } from '@/components/settings/UserSettingsTab';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  receiptWidth: z.enum(["58mm", "80mm"]),
  labelFormat: z.enum(["portrait", "landscape"]).default("portrait"),
  labelWidth: z.number().min(10).max(200).optional(),
  labelHeight: z.number().min(10).max(200).optional(),
  // SMTP-Einstellungen
  smtpSenderName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.string().optional(),
  // Bewertungslink
  reviewLink: z.string().optional(),
});

// Erweiterte Formulardaten mit zusätzlichen Feldern
interface ExtendedBusinessSettingsFormValues extends z.infer<typeof businessSettingsSchema> {
  logoImage?: string;
}

// Typ-Definition für die API-Antwort des Reparaturkontingents
interface RepairQuota {
  canCreate: boolean;
  currentCount: number;
  limit: number;
  pricingPlan: string;
  displayName: string;
  currentMonth: string;
  currentYear: number;
}

// Komponente zur Anzeige des Preispakets und Reparaturkontingents
function PricingPlanDisplay() {
  // Abrufen des Reparaturkontingents über die API
  const { data: quotaData, isLoading, error } = useQuery<RepairQuota>({
    queryKey: ["/api/repair-quota"],
    // Alle 30 Sekunden aktualisieren, wenn die Seite geöffnet ist
    refetchInterval: 30000,
  });
  
  // Ist der Benutzer auf Professional oder höher?
  const isProfessionalOrHigher = quotaData?.pricingPlan === 'professional' || quotaData?.pricingPlan === 'enterprise';
  
  // Farbkodierung je nach Paket
  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "basic": return "text-gray-500";
      case "professional": return "text-green-500";
      case "enterprise": return "text-blue-500";
      default: return "text-gray-500";
    }
  };
  
  // Prozentsatz der verbrauchten Kontingent berechnen
  const usagePercentage = quotaData 
    ? Math.min(100, Math.round((quotaData.currentCount / quotaData.limit) * 100)) 
    : 0;
  
  if (isLoading) {
    return (
      <div className="border rounded-md p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (error || !quotaData) {
    return (
      <div className="border rounded-md p-4 text-red-500">
        Kontingentinformationen konnten nicht geladen werden.
      </div>
    );
  }
  
  // Bei Professional und Enterprise kein Limit anzeigen
  if (quotaData.pricingPlan !== "basic") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Aktuelles Abonnement</CardTitle>
          <CardDescription>Details zu Ihrem aktuellen Abonnement.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-lg">{quotaData.displayName}</h4>
                <p className="text-gray-600">Nächste Abrechnung am 01.06.2025</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Abonnement-Status</span>
              <span className="font-medium text-green-600">Aktiv</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Funktionen</span>
              <span className="font-medium">Alle verfügbar</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Reparaturaufträge</span>
              <span className="font-medium">Unbegrenzt</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex space-x-4 justify-end">
              <Button variant="outline" size="sm">Abonnement verwalten</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Für Basic-Paket mit Limitierung
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Aktuelles Abonnement</CardTitle>
        <CardDescription>Details zu Ihrem aktuellen Abonnement.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-500 rounded-md flex items-center justify-center text-white">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">{quotaData.displayName}</h4>
              <p className="text-gray-600">Monatliches Limit: {quotaData.limit} Reparaturen</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Verbleibende Reparaturaufträge</span>
              <span>
                {quotaData.limit - quotaData.currentCount} von {quotaData.limit}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Abrechnungszeitraum</span>
            <span className="font-medium">{quotaData.currentMonth} {quotaData.currentYear}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="font-medium text-green-600">Aktiv</span>
          </div>
        </div>
        
        {quotaData.currentCount >= quotaData.limit && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            <strong>Monatliches Limit erreicht.</strong> Upgrade auf Professional für unbegrenzte Aufträge.
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex space-x-4 justify-end">
            <Button>Auf Professional upgraden</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hauptkomponente für die Einstellungen
export function SettingsPageContent() {
  // Refs und State für das Logo-Upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Reguläre States
  const [activeTab, setActiveTab] = useState<string>("business");
  const [activeUserTab, setActiveUserTab] = useState<string>("account");
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
      receiptWidth: "80mm",
      labelFormat: "portrait",
      labelWidth: 32,
      labelHeight: 57,
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
        reviewLink: settings.reviewLink === null ? undefined : settings.reviewLink
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-gray-500">Verwalten Sie Ihre geschäftlichen und persönlichen Einstellungen</p>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending} 
          variant="default" 
          size="sm" 
          className="flex items-center"
        >
          <Save className="h-4 w-4 mr-2" /> Speichern
        </Button>
      </div>

      <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
        <Tabs defaultValue="business" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex overflow-x-auto">
            <TabsList className="bg-white border mb-6">
              <TabsTrigger value="business">Geschäft</TabsTrigger>
              <TabsTrigger value="emails">E-Mail</TabsTrigger>
              <TabsTrigger value="prints">Ausdrucke</TabsTrigger>
              <TabsTrigger value="subscription">Abonnement</TabsTrigger>
            </TabsList>
          </div>

          {/* Geschäftseinstellungen Tab */}
          <TabsContent value="business" className="mt-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Geschäftsinformationen</CardTitle>
                <CardDescription>Informationen über Ihr Unternehmen, die auf Rechnungen und Angeboten angezeigt werden.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geschäftsname</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name="ownerFirstName"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Vorname</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ownerLastName"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Nachname</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UID-Nummer</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="z.B. ATU12345678" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Straße und Hausnummer</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem className="w-1/3">
                              <FormLabel>PLZ</FormLabel>
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
                            <FormItem className="flex-1">
                              <FormLabel>Ort</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Land</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Land auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Österreich">Österreich</SelectItem>
                              <SelectItem value="Deutschland">Deutschland</SelectItem>
                              <SelectItem value="Schweiz">Schweiz</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                              <Input {...field} type="email" />
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
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="reviewLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bewertungslink</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="z.B. Google Maps Bewertungslink" />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground mt-1">Dieser Link wird verwendet, um Kunden nach Auftragsabschluss um eine Bewertung zu bitten.</p>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* E-Mail Tab */}
          <TabsContent value="emails" className="mt-4">
            {/* SMTP Einstellungen */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">SMTP-Einstellungen</CardTitle>
                <CardDescription>Konfigurieren Sie Ihren eigenen E-Mail-Server für Benachrichtigungen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="smtpSenderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Absendername</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="z.B. Mein Handyshop" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP-Server</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="z.B. smtp.example.com" />
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
                            <FormLabel>SMTP-Port</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="z.B. 587" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="smtpUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP-Benutzername</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                            <FormLabel>SMTP-Passwort</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-600 text-sm">
                      Mit der Konfiguration eines eigenen SMTP-Servers können Sie E-Mail-Vorlagen mit Ihrem eigenen Branding versenden.
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* E-Mail-Vorlagen */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">E-Mail-Vorlagen</CardTitle>
                <CardDescription>Verwalten Sie Ihre E-Mail-Vorlagen für Benachrichtigungen.</CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTemplateTab />
              </CardContent>
            </Card>
          </TabsContent>



          {/* Ausdrucke Tab */}
          <TabsContent value="prints" className="mt-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Firmenlogo</CardTitle>
                <CardDescription>Laden Sie Ihr Firmenlogo hoch für Ihre Ausdrucke.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <div>
                      <h3 className="text-md font-medium mb-3">Logo</h3>
                      <div className="mb-4 flex items-center space-x-4">
                        <div className="w-20 h-20 border rounded-md flex items-center justify-center overflow-hidden">
                          {(logoPreview || (settings?.logoImage && settings.logoImage.length > 0)) ? (
                            <img src={logoPreview || settings?.logoImage || ''} alt="Logo" className="max-w-full max-h-full" />
                          ) : (
                            <Building className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            id="logo-upload"
                            ref={fileInputRef}
                            accept="image/jpeg,image/png,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button 
                            variant="outline" 
                            type="button" 
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Logo hochladen
                          </Button>
                          {logoError && (
                            <p className="text-xs text-red-500 mt-1">{logoError}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">Empfohlenes Format: PNG oder JPEG, 500x500px</p>
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Druckeinstellungen</CardTitle>
                <CardDescription>Konfigurieren Sie das Format für Quittungen und Etiketten.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="receiptWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quittungsbreite</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Quittungsbreite auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="58mm">58mm (kleiner Bondrucker)</SelectItem>
                              <SelectItem value="80mm">80mm (Standard-Bondrucker)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="labelFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Etikett-Format</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Etikett-Format auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="portrait">Hochformat (32mm x 57mm)</SelectItem>
                              <SelectItem value="landscape">Querformat (57mm x 32mm)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center space-x-2 my-4">
                      <Switch id="print-logo" />
                      <Label htmlFor="print-logo">Logo auf Quittungen drucken</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 my-4">
                      <Switch id="print-address" />
                      <Label htmlFor="print-address">Adresse auf Quittungen drucken</Label>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Abonnement Tab */}
          <TabsContent value="subscription" className="mt-4">
            <PricingPlanDisplay />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
