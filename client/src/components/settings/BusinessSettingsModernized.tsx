import React, { useState, useEffect, useRef } from 'react';
import { Save, Building, User, Palette, Upload, X } from 'lucide-react';
import { useBusinessSettings } from '@/hooks/use-business-settings';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Schema für die Geschäftseinstellungen
const businessSettingsSchema = z.object({
  businessName: z.string().min(1, "Unternehmensname ist erforderlich"),
  ownerFirstName: z.string().min(1, "Vorname ist erforderlich"),
  ownerLastName: z.string().min(1, "Nachname ist erforderlich"),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(), // USt-IdNr.
  companySlogan: z.string().optional(), // Firmenlaut/Unternehmensslogan
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

interface BusinessSettingsModernizedProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "unternehmen" | "email" | "design";
}

export default function BusinessSettingsModernized({ open, onClose, initialTab = "unternehmen" }: BusinessSettingsModernizedProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const { settings, isLoading } = useBusinessSettings();
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Max. Logo-Größe in Bytes (2MB)
  const MAX_LOGO_SIZE = 2 * 1024 * 1024;

  // Form Definition mit React Hook Form und Zod Validierung
  const form = useForm<ExtendedBusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      businessName: "",
      ownerFirstName: "",
      ownerLastName: "",
      taxId: "",
      vatNumber: "",
      companySlogan: "",
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
      // Stelle sicher, dass receiptWidth als Enum-Wert behandelt wird und NULL-Werte in leere Strings umgewandelt werden
      const formattedSettings = {
        ...settings,
        logoImage: settings.logoImage || "",
        // Validiere receiptWidth und setze auf "80mm" wenn ungültig
        receiptWidth: (settings.receiptWidth === "58mm" || settings.receiptWidth === "80mm") 
          ? settings.receiptWidth as "58mm" | "80mm"
          : "80mm",
        // Konvertiere null-Werte zu leeren Strings oder dem entsprechenden korrekten Typ
        taxId: settings.taxId || "",
        vatNumber: settings.vatNumber || "",
        companySlogan: settings.companySlogan || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        smtpHost: settings.smtpHost || "",
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword || "",
        smtpPort: settings.smtpPort || "",
        smtpSenderName: settings.smtpSenderName || "",
        reviewLink: settings.reviewLink || ""
      };
      
      form.reset(formattedSettings);
      
      // Setze das Logo-Vorschaubild, wenn vorhanden
      if (settings.logoImage) {
        setLogoPreview(settings.logoImage);
      }
    }
  }, [settings, form]);
  
  // Funktion zum Hochladen des Logos
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Überprüfe die Dateigröße
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
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setLogoPreview(dataUrl);
        form.setValue('logoImage', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Funktion zum Entfernen des hochgeladenen Logos
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    form.setValue('logoImage', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unternehmenseinstellungen</DialogTitle>
          <DialogDescription>
            Geben Sie hier die Daten Ihres Unternehmens ein. Diese werden für Rechnungen und andere Dokumente verwendet.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="unternehmen" className="flex items-center gap-1">
                  <Building className="h-4 w-4" /> Unternehmen
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-1">
                  <User className="h-4 w-4" /> E-Mail
                </TabsTrigger>
                <TabsTrigger value="design" className="flex items-center gap-1">
                  <Palette className="h-4 w-4" /> Darstellung
                </TabsTrigger>
              </TabsList>
              
              {/* Tab: Unternehmensinformationen */}
              <TabsContent value="unternehmen" className="space-y-6">
                <div className="space-y-4 p-4 border rounded-md shadow-sm">
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    
                    <FormField
                      control={form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>USt-IdNr. (EU VAT Number)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="z.B. ATU12345678" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="companySlogan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firmenlaut (Unternehmensslogan)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="z.B. Ihr Partner für schnelle Reparaturen" />
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
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center relative">
                      {logoPreview || form.watch('logoImage') ? (
                        <>
                          <img 
                            src={logoPreview || form.watch('logoImage')} 
                            alt="Logo" 
                            className="max-w-full max-h-full object-contain" 
                          />
                          <button 
                            type="button"
                            onClick={handleRemoveLogo}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm hover:bg-red-50"
                            aria-label="Logo entfernen"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </>
                      ) : (
                        <Building className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('LOGO BUTTON CLICKED');
                          
                          // Direkter Ansatz ohne Ref
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/png,image/svg+xml';
                          
                          // Event-Handler hinzufügen
                          input.onchange = (event) => {
                            const target = event.target as HTMLInputElement;
                            console.log('File selected:', target.files);
                            if (target.files && target.files.length > 0) {
                              // Manuell handleLogoUpload aufrufen
                              const fakeEvent = { 
                                target: { files: target.files } 
                              } as React.ChangeEvent<HTMLInputElement>;
                              handleLogoUpload(fakeEvent);
                            }
                          };
                          
                          // Input zum DOM hinzufügen und klicken
                          document.body.appendChild(input);
                          input.click();
                          
                          // Nach Auswahl wieder entfernen
                          setTimeout(() => {
                            document.body.removeChild(input);
                          }, 1000);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Logo hochladen
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG oder SVG, max. 2MB</p>
                      {logoError && (
                        <p className="text-xs text-red-500 mt-1">{logoError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Tab: E-Mail-Einstellungen */}
              <TabsContent value="email" className="space-y-6">
                <div className="space-y-4 p-4 border rounded-md shadow-sm">
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
              </TabsContent>
              
              {/* Tab: Darstellungseinstellungen */}
              <TabsContent value="design" className="space-y-6">
                <div className="space-y-4 p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium border-b pb-2 mb-4">Druckeinstellungen</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Legen Sie die Breite für Ihre Kassenzettel und Belege fest.
                  </p>
                  
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
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
