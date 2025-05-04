import React, { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
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
  UserCog
} from "lucide-react";
import { EmailTemplateTab } from "@/components/settings/EmailTemplateTab";
import { BusinessSettingsDialogNew } from "@/components/settings/BusinessSettingsDialogNew";

import { UserSettingsTab } from "@/components/settings/UserSettingsTab";

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
  
  // Bewertungslink
  reviewLink: z.string().url("Bitte geben Sie eine gültige URL ein").optional(),
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
  
  // Benutzer-ID aus dem Auth-Kontext holen
  const { user } = useAuth();

  // Max. Logo-Größe in Bytes (1MB)
  const MAX_LOGO_SIZE = 1024 * 1024;

  // Lade die bestehenden Unternehmenseinstellungen
  const { data: settings, isLoading } = useQuery<BusinessSettings | null>({
    queryKey: ["/api/business-settings"],
    enabled: open,
  });

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
      reviewLink: "",
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
    setLogoError(null); // Setzt Fehler zurück

    try {
      const result = await validateImage(file);
      if (result.isValid && result.base64) {
        setLogoPreview(result.base64);
        form.setValue("logoImage", result.base64); // Setzt Base64-Bild im Formular
      } else if (result.error) {
        setLogoError(result.error);
        setLogoPreview(null);
        form.setValue("logoImage", ""); // Löscht das Bild aus dem Formular bei Fehler
      }
    } catch (err) {
      console.error("Fehler beim Validieren des Logos:", err);
      setLogoError("Ein unerwarteter Fehler ist aufgetreten.");
    }

    // Leert das Input-Element für wiederholte Uploads derselben Datei
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Event-Handler zum Löschen des Logos
  const handleDeleteLogo = () => {
    setLogoPreview(null);
    form.setValue("logoImage", "");
    setLogoError(null);
  };

  // Mutation für das Update der Unternehmenseinstellungen
  const updateMutation = useMutation({
    mutationFn: async (data: ExtendedBusinessSettingsFormValues) => {
      console.log("Sende Daten an API:", data);
      const response = await apiRequest("POST", "/api/business-settings", data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      onClose(); // Dialog schließen
      toast({
        title: "Erfolg!",
        description: "Die Einstellungen wurden gespeichert.",
        duration: 2000, // Verkürzt auf 2 Sekunden
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
        duration: 3000,
      });
    }
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
            <TabsTrigger value="user" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Benutzer
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

          {/* Tab: Kommunikation (E-Mail) */}
          <TabsContent value="communication" className="max-h-[65vh] overflow-y-auto">
            <Tabs defaultValue="email" className="w-full">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4" /> E-Mail-Einstellungen
              </div>
              
              {/* E-Mail-Einstellungen */}
              <TabsContent value="email">
                <Tabs defaultValue="templates" value={activeEmailTab} onValueChange={setActiveEmailTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="templates">E-Mail-Vorlagen</TabsTrigger>
                    <TabsTrigger value="settings">SMTP-Einstellungen</TabsTrigger>
                  </TabsList>
                  
                  {/* E-Mail-Vorlagen */}
                  <TabsContent value="templates">
                    <EmailTemplateTab />
                  </TabsContent>
                  
                  {/* SMTP-Einstellungen */}
                  <TabsContent value="settings">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* SMTP-Einstellungen */}
                        <div className="space-y-4">
                          <h3 className="text-md font-medium mb-3">SMTP-Einstellungen</h3>
                          <FormDescription>
                            Tragen Sie hier Ihre SMTP-Servereinstellungen ein, damit Sie E-Mails mit Ihrem eigenen Mail-Server versenden können.
                            Falls keine SMTP-Einstellungen angegeben werden, wird automatisch der Brevo-Dienst verwendet.
                          </FormDescription>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="smtpSenderName"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>Absendername</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Handyshop Service" />
                                  </FormControl>
                                  <FormDescription>
                                    Der Name, der als Absender angezeigt wird
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
                                  <FormLabel>SMTP-Server</FormLabel>
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
                                  <FormLabel>SMTP-Port</FormLabel>
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
                                  <FormLabel>SMTP-Benutzername</FormLabel>
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
                                <FormItem className="sm:col-span-2">
                                  <FormLabel>SMTP-Passwort</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="password" 
                                      placeholder="••••••••"
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Lassen Sie dieses Feld leer, um das bestehende Passwort beizubehalten
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Bewertungslink */}
                        <div className="space-y-4 border-t pt-6">
                          <h3 className="text-md font-medium mb-3">Bewertungslink</h3>
                          <FormDescription>
                            Geben Sie hier Ihren Link zu Google Bewertungen, Facebook oder einer anderen Plattform an.
                            Dieser Link wird in Bewertungs-E-Mails an Kunden verwendet.
                          </FormDescription>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name="reviewLink"
                              render={({ field }) => (
                                <FormItem className="col-span-1">
                                  <FormLabel>Link für Kundenbewertungen</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="https://g.page/r/..." />
                                  </FormControl>
                                  <FormDescription>
                                    Vollständige URL, z.B. Google-Bewertungslink, Facebook oder Ihre eigene Bewertungsseite
                                  </FormDescription>
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
              


            </Tabs>
          </TabsContent>
          
          {/* Tab: Darstellung und Design */}
          <TabsContent value="appearance" className="max-h-[65vh] overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Farbschema Auswahl */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Design
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="colorTheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farbschema</FormLabel>
                        <FormDescription>
                          Wählen Sie ein Farbschema für Ihre Anwendung. Bitte beachten Sie, dass die Änderung des Farbschemas ein Neuladen der Seite erfordert.
                        </FormDescription>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
                          {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
                            <div
                              key={color}
                              className={`relative rounded-md p-2 cursor-pointer border-2 flex items-center justify-center
                                ${field.value === color ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}
                                transition-all
                              `}
                              onClick={() => field.onChange(color)}
                              data-active={field.value === color}
                            >
                              <div 
                                className={`w-full h-8 rounded-md
                                  ${color === 'blue' ? 'bg-blue-500' : 
                                    color === 'green' ? 'bg-green-500' : 
                                    color === 'purple' ? 'bg-purple-500' : 
                                    color === 'red' ? 'bg-red-500' : 
                                    'bg-orange-500'
                                  }
                                `} 
                              />
                              <FormLabel className="font-medium w-full text-center mt-1 capitalize cursor-pointer">
                                {color}
                              </FormLabel>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Bonbreite Auswahl */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium mb-3 flex items-center gap-2">
                    <Printer className="h-4 w-4" /> Druckeinstellungen
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="receiptWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonbreite</FormLabel>
                        <FormDescription>
                          Wählen Sie die Breite der Bons, die Sie ausdrucken möchten.
                        </FormDescription>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full max-w-[200px]">
                              <SelectValue placeholder="80mm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="58mm">58mm</SelectItem>
                            <SelectItem value="80mm">80mm</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Wird gespeichert..." : "Darstellungseinstellungen speichern"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Tab: Benutzereinstellungen */}
          <TabsContent value="user" className="max-h-[65vh] overflow-y-auto">
            <UserSettingsTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}