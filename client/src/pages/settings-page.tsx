import React, { useState } from 'react';
import { Save, Building, User, Palette, ChevronLeft } from 'lucide-react';
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
import { Package } from 'lucide-react';

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
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h4 className="font-medium">Preispaket</h4>
          </div>
          <span className={`font-medium ${getPlanColor(quotaData.pricingPlan)}`}>
            {quotaData.displayName}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Unbegrenzte Reparaturaufträge pro Monat
        </div>
      </div>
    );
  }
  
  // Für Basic-Paket mit Limitierung
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h4 className="font-medium">Preispaket</h4>
        </div>
        <span className={`font-medium ${getPlanColor(quotaData.pricingPlan)}`}>
          {quotaData.displayName}
        </span>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Verbleibende Reparaturaufträge</span>
          <span>
            {quotaData.limit - quotaData.currentCount} von {quotaData.limit}
          </span>
        </div>
        <Progress value={usagePercentage} className="h-2" />
      </div>
      
      <div className="text-xs text-muted-foreground">
        {quotaData.currentMonth} {quotaData.currentYear}
        {quotaData.currentCount >= quotaData.limit && (
          <div className="mt-1 text-red-500 font-medium">
            Monatliches Limit erreicht. Upgrade auf Professional für unbegrenzte Aufträge.
          </div>
        )}
      </div>
    </div>
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
      // Stelle sicher, dass receiptWidth als Enum-Wert behandelt wird
      const formattedSettings = {
        ...settings,
        logoImage: settings.logoImage || "",
        // Validiere receiptWidth und setze auf "80mm" wenn ungültig
        receiptWidth: (settings.receiptWidth === "58mm" || settings.receiptWidth === "80mm") 
          ? settings.receiptWidth 
          : "80mm"
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="business" className="flex items-center gap-1">
            <Building className="h-4 w-4" /> Unternehmen
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-1">
            <User className="h-4 w-4" /> Kommunikation
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-1">
            <Palette className="h-4 w-4" /> Benutzer
          </TabsTrigger>
        </TabsList>
        
        {/* Tab: Unternehmensinformationen */}
        <TabsContent value="business" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4 p-6 border rounded-md shadow-sm">
                <h3 className="text-lg font-medium border-b pb-2 mb-4">Unternehmensdaten</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <FormLabel>Steuer-ID / UID-Nummer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <h3 className="text-md font-medium border-b pb-2 mt-6 mb-4">Adresse</h3>
                
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
                      <FormItem>
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
                      <FormItem className="sm:col-span-2">
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
                
                <h3 className="text-md font-medium border-b pb-2 mt-6 mb-4">Kontaktdaten</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                
                <h3 className="text-md font-medium border-b pb-2 mt-6 mb-4">Firmenlogo</h3>
                
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                    {form.watch('logoImage') ? (
                      <img src={form.watch('logoImage')} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Building className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" type="button">
                      Logo hochladen
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG oder SVG, max. 2MB</p>
                  </div>
                </div>
                
                <h3 className="text-md font-medium border-b pb-2 mt-6 mb-4">Druckeinstellungen</h3>
                
                <FormField
                  control={form.control}
                  name="receiptWidth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bon-Breite</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Wählen Sie eine Breite" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58mm">58mm (schmaler Thermodrucker)</SelectItem>
                            <SelectItem value="80mm">80mm (Standard-Thermodrucker)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        
        {/* Tab: Kommunikation */}
        <TabsContent value="communication" className="space-y-6">
          <div className="border rounded-md p-6 shadow-sm">
            <Tabs defaultValue="templates" value={activeEmailTab} onValueChange={setActiveEmailTab}>
              <TabsList className="mb-4 grid grid-cols-2 gap-1">
                <TabsTrigger value="templates">E-Mail Vorlagen</TabsTrigger>
                <TabsTrigger value="smtp">SMTP-Einstellungen</TabsTrigger>
              </TabsList>
              
              {/* E-Mail-Vorlagen */}
              <TabsContent value="templates">
                <EmailTemplateTab />
              </TabsContent>
              
              {/* SMTP-Einstellungen */}
              <TabsContent value="smtp">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium border-b pb-2 mb-4">SMTP-Einstellungen</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Konfigurieren Sie Ihren eigenen E-Mail-Server für ausgehende E-Mails. 
                        Wenn Sie keine eigenen SMTP-Einstellungen angeben, wird Brevo als Fallback verwendet.
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="smtpSenderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Absendername</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="z.B. Mein Reparaturshop" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="smtpHost"
                          render={({ field }) => (
                            <FormItem>
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
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <Input {...field} type="password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <h3 className="text-md font-medium border-b pb-2 mt-6 mb-4">Bewertungslink</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Der Link zum Abgeben von Kundenbewertungen, der in E-Mails eingefügt werden kann.
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="reviewLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Link für Bewertungen</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="z.B. https://g.page/r/..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {updateMutation.isPending ? "Wird gespeichert..." : "SMTP-Einstellungen speichern"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              {/* SMS-Vorlagen Tab */}
              <TabsContent value="sms">
                <SmsTemplateTab />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
        
        {/* Tab: Benutzer */}
        <TabsContent value="user" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="border rounded-md p-6 shadow-sm">
                <UserSettingsTab />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="border rounded-md p-6 shadow-sm">
                <h3 className="text-lg font-medium mb-4">Preispaket & Kontingent</h3>
                <PricingPlanDisplay />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
