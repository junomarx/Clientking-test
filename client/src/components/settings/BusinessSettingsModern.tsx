import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu, Settings, Save, Building, Globe, Mail } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

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

interface BusinessSettingsModernProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "business" | "email" | "appearance";
}

export default function BusinessSettingsModern({ open, onClose, initialTab = "business" }: BusinessSettingsModernProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [collapsed, setCollapsed] = useState(false);
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
  useEffect(() => {
    if (settings) {
      form.reset({
        ...settings,
        logoImage: settings.logoImage || "",
      });
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
    return <div>Lade Einstellungen...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 sm:max-w-[92vw] md:max-w-[90vw] lg:max-w-[85vw] max-h-[90vh] overflow-hidden">
        <div className="flex h-screen overflow-hidden">
          {/* Seitenleiste - fixiert am linken Rand in dunkler Farbe */}
          <div 
            className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white h-full transition-all duration-300 ease-in-out`}
            style={{ paddingLeft: collapsed ? '0.75rem' : '1.5rem', paddingRight: collapsed ? '0.75rem' : '1.5rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
          >
            <div className="mb-8 flex items-center justify-center md:justify-start">
              {collapsed ? (
                <div className="flex justify-center w-full">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold">
                    HS
                  </div>
                </div>
              ) : (
                <h2 className="text-xl font-bold">HandyShop</h2>
              )}
            </div>
            
            <nav className="space-y-4">
              <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer"
                onClick={() => setActiveTab("business")}>
                <Building className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">Geschäftsdaten</span>}
              </div>
              
              <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer"
                onClick={() => setActiveTab("email")}>
                <Mail className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">E-Mail</span>}
              </div>
              
              <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-gray-300 cursor-pointer"
                onClick={() => setActiveTab("appearance")}>
                <Settings className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">Darstellung</span>}
              </div>
            </nav>
          </div>
          
          {/* Toggle Button für die Seitenleiste */}
          <div 
            className={`bg-gray-900 text-white rounded-full flex items-center justify-center w-6 h-6 cursor-pointer transition-all duration-300 ease-in-out ${collapsed ? 'translate-x-14' : 'translate-x-60'}`}
            style={{ marginLeft: '-12px', marginTop: '1.5rem' }} 
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </div>

          {/* Hauptbereich */}
          <div className="flex-1 w-full overflow-auto bg-gray-50">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-xl font-semibold">Einstellungen</h1>
                    <p className="text-sm text-gray-500">Konfigurieren Sie Ihr Geschäft</p>
                  </div>
                  
                  <Button type="submit" disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" /> Speichern
                  </Button>
                </div>

                {/* Geschäftseinstellungen Tab */}
                {activeTab === "business" && (
                  <div className="space-y-6">
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Geschäftsinformationen</CardTitle>
                        <CardDescription>Informationen über Ihr Unternehmen, die auf Rechnungen und Angeboten angezeigt werden.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
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

                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                              control={form.control}
                              name="ownerFirstName"
                              render={({ field }) => (
                                <FormItem>
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
                                <FormItem>
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
                          <div className="grid grid-cols-2 gap-2">
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
                                <FormItem>
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
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
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
                            <Button variant="outline" size="sm" type="button">
                              Logo hochladen
                            </Button>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG oder SVG, max. 2MB</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* E-Mail-Einstellungen Tab */}
                {activeTab === "email" && (
                  <div className="space-y-6">
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">SMTP-Einstellungen</CardTitle>
                        <CardDescription>Konfigurieren Sie Ihren E-Mail-Server für ausgehende E-Mails.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="smtpSenderName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Absendername</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="smtpHost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP-Host</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          <FormField
                            control={form.control}
                            name="smtpPort"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP-Port</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Bewertungslink</CardTitle>
                        <CardDescription>Link für Kundenbewertungen (z.B. Google My Business).</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="reviewLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link für Bewertungen</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Darstellungseinstellungen Tab */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Druckeinstellungen</CardTitle>
                        <CardDescription>Konfigurieren Sie die Druckeinstellungen für Ihre Belege.</CardDescription>
                      </CardHeader>
                      <CardContent>
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
                                  <SelectTrigger>
                                    <SelectValue placeholder="Wählen Sie eine Breite" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="58mm">58mm</SelectItem>
                                    <SelectItem value="80mm">80mm</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
