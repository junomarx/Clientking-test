import React, { useState, useEffect } from 'react';
import { Save, Building, User, Palette, ChevronLeft, Package, ChevronDown } from 'lucide-react';
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
import { SmsTemplateTab } from '@/components/settings/SmsTemplateTab';
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

// Hauptseite für Einstellungen
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("business");
  const [activeEmailTab, setActiveEmailTab] = useState<string>("templates");
  const [activeUserTab, setActiveUserTab] = useState<string>("account");
  const [, setLocation] = useLocation();
  const { settings, isLoading } = useBusinessSettings();
  const { toast } = useToast();

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

  // Aktualisieren der Formularwerte, wenn Einstellungen geladen werden
  React.useEffect(() => {
    if (settings) {
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
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/app')}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={updateMutation.isPending} 
          variant="outline" 
          size="sm" 
          className="flex items-center"
        >
          <Save className="h-4 w-4 mr-2" /> Speichern
        </Button>
      </div>

      <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
        <Tabs defaultValue="business" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile: Dropdown-Menü für die Tabs (unter 768px) */}
          <div className="block md:hidden w-full mb-6">
            <div className="relative">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Wählen Sie eine Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Geschäft</SelectItem>
                  <SelectItem value="emails">E-Mail</SelectItem>
                  <SelectItem value="appearance">Erscheinungsbild</SelectItem>
                  <SelectItem value="prints">Ausdrucke</SelectItem>
                  <SelectItem value="subscription">Abonnement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop: Normale Tabs-Ansicht (ab 768px) */}
          <div className="hidden md:block w-full">
            <TabsList className="bg-white border mb-6 flex-row flex w-full">
              <TabsTrigger value="business" className="w-full py-3">Geschäft</TabsTrigger>
              <TabsTrigger value="emails" className="w-full py-3">E-Mail</TabsTrigger>
              <TabsTrigger value="appearance" className="w-full py-3">Erscheinungsbild</TabsTrigger>
              <TabsTrigger value="prints" className="w-full py-3">Ausdrucke</TabsTrigger>
              <TabsTrigger value="subscription" className="w-full py-3">Abonnement</TabsTrigger>
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
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <FormField
                          control={form.control}
                          name="ownerFirstName"
                          render={({ field }) => (
                            <FormItem className="flex-1 w-full">
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
                            <FormItem className="flex-1 w-full">
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
                          <FormLabel>Steuer-ID / UID-Nummer</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Adresse</CardTitle>
                <CardDescription>Die Geschäftsadresse Ihres Unternehmens.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem className="w-full">
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
                          <FormItem className="w-full sm:col-span-2">
                            <FormLabel>Ort</FormLabel>
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
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Land</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Kontaktdaten</CardTitle>
                <CardDescription>Wie Kunden Sie erreichen können.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="w-full">
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
                          <FormItem className="w-full">
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
                          <FormItem className="w-full sm:col-span-2 md:col-span-1">
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Firmenlogo</CardTitle>
                <CardDescription>Upload Ihres Firmenlogos für Dokumente und Rechnungen.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                    {form.watch('logoImage') ? (
                      <img src={form.watch('logoImage')} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Building className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" type="button">Logo hochladen</Button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG oder SVG, max. 2MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* E-Mail-Einstellungen Tab */}
          <TabsContent value="emails" className="mt-4">
            <Tabs value={activeEmailTab} onValueChange={setActiveEmailTab} className="mb-6">
              {/* Mobile: Dropdown-Menü für E-Mail-Tabs (unter 768px) */}
              <div className="block md:hidden w-full mb-6">
                <div className="relative">
                  <Select value={activeEmailTab} onValueChange={setActiveEmailTab}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Wählen Sie eine Kategorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="settings">SMTP-Einstellungen</SelectItem>
                      <SelectItem value="templates">E-Mail-Vorlagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Desktop: Normale Tabs-Ansicht für E-Mail-Tabs (ab 768px) */}
              <div className="hidden md:block w-full">
                <TabsList className="bg-white border mb-6 w-full flex-row flex">
                  <TabsTrigger value="settings" className="w-full py-3">SMTP-Einstellungen</TabsTrigger>
                  <TabsTrigger value="templates" className="w-full py-3">E-Mail-Vorlagen</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="settings" className="space-y-6">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">SMTP-Einstellungen</CardTitle>
                    <CardDescription>Konfigurieren Sie Ihren E-Mail-Server für ausgehende E-Mails.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Form {...form}>
                      <form className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="smtpHost"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>SMTP-Host</FormLabel>
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
                              <FormItem className="w-full">
                                <FormLabel>SMTP-Port</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="z.B. 587" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="smtpUser"
                            render={({ field }) => (
                              <FormItem className="w-full">
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
                              <FormItem className="w-full">
                                <FormLabel>SMTP-Passwort</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="smtpSenderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Absendername</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="z.B. Handy Reparatur Service" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Bewertungslink</CardTitle>
                    <CardDescription>Link für Kunden, um Ihr Geschäft zu bewerten.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form className="space-y-4">
                        <FormField
                          control={form.control}
                          name="reviewLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link zur Bewertungsseite</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://g.page/r/..." />
                              </FormControl>
                              <FormMessage />
                              <p className="text-xs text-gray-500 mt-1">
                                Dieser Link wird in E-Mails mit Bewertungsanfragen verwendet.
                              </p>
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="templates">
                <EmailTemplateTab />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          {/* Erscheinungsbild Tab */}
          <TabsContent value="appearance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Designoptionen</CardTitle>
                <CardDescription>Passen Sie das Erscheinungsbild Ihrer Anwendung an.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Farbschema</Label>
                  <Select defaultValue="blue">
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie ein Farbschema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blau (Standard)</SelectItem>
                      <SelectItem value="green">Grün</SelectItem>
                      <SelectItem value="purple">Lila</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Nur für Professional und Enterprise verfügbar</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Dunkelmodus</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="darkmode" disabled />
                    <Label htmlFor="darkmode">Automatischer Dunkelmodus</Label>
                  </div>
                  <p className="text-xs text-gray-500">Nur für Professional und Enterprise verfügbar</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Ausdrucke Tab */}
          <TabsContent value="prints" className="mt-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Belegdruck</CardTitle>
                <CardDescription>Einstellungen für das Drucken von Belegen und Etiketten.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="receiptWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bonbreite</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wählen Sie eine Bonbreite" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="58mm">58mm (kleine Bondrucker)</SelectItem>
                              <SelectItem value="80mm">80mm (Standard-Bondrucker)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <Label>Standardtext für Belege</Label>
                      <Textarea placeholder="Dieser Text erscheint am Ende jeder Quittung" className="h-24" />
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