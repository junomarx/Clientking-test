import React from "react";
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
import { BusinessSettings } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Palette, 
  Printer, 
  Building2, 
  User2, 
  Mail, 
  Phone, 
  MapPin,
  Settings,
  MessageSquare
} from "lucide-react";
import { EmailTemplateTab } from "@/components/settings/EmailTemplateTab";

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
  // logoImage wurde entfernt
}

interface BusinessSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BusinessSettingsDialog({ open, onClose }: BusinessSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // fileInputRef wurde entfernt
  // Logo-Funktionalität wurde entfernt

  // Wir verwenden nur die authentifizierte Sitzung ohne localStorage
  console.log(`BusinessSettingsDialog geöffnet`);
  
  // Lade die bestehenden Unternehmenseinstellungen direkt ohne Benutzer-ID im Query-Key
  // Die Datenisolierung wird komplett vom Server sichergestellt
  const { data: settings, isLoading } = useQuery<BusinessSettings | null>({
    queryKey: ["/api/business-settings"],
    enabled: open, // Aktiviere die Abfrage nur, wenn der Dialog geöffnet ist
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
      // logoImage wurde entfernt
      colorTheme: "blue",
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
        // logoImage wurde entfernt
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

      // Logo-Funktionalität wurde entfernt
    }
  }, [settings, form]);

  // Logo-Funktionalität wurde vollständig entfernt

  const updateMutation = useMutation({
    mutationFn: async (data: ExtendedBusinessSettingsFormValues) => {
      try {
        // NEUER ANSATZ: Wir senden keine userId in den Daten mit
        // Die Authentifizierung und Datenisolierung übernimmt komplett der Server
        const requestData = {
          ...data // Die regulären Formulardaten
          // logoImage-Feld wurde entfernt
        };
        
        console.log('Request data keys:', Object.keys(requestData));
        
        const response = await apiRequest("POST", "/api/business-settings", requestData);
        console.log('Response status:', response.status);
        
        // Wenn der Response nicht ok ist, werfen wir einen Fehler
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server-Fehler: ${response.status} ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('Response from server:', responseData);
        return responseData;
      } catch (error) {
        console.error('Error in mutation:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidiere den Cache global ohne spezifische User-ID
      queryClient.invalidateQueries({ queryKey: ["/api/business-settings"] });
      
      toast({
        title: "Erfolg!",
        description: "Unternehmenseinstellungen wurden aktualisiert.",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
      onClose(); // Dialog schließen
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
        duration: 2000, // Nach 2 Sekunden ausblenden
      });
    },
  });

  function onSubmit(data: ExtendedBusinessSettingsFormValues) {
    console.log('BusinessSettingsDialog - Form submitted with data (new version):', Object.keys(data));
    
    // NEUER ANSATZ: Wir senden die Daten direkt ohne Benutzer-ID
    // Die Datenisolierung wird vollständig vom Server über die Session-Authentifizierung gehandhabt
    try {
      console.log('Submitting form data directly without userId');
      updateMutation.mutate(data);
    } catch (error) {
      console.error('Fehler bei der Formularverarbeitung:', error);
      toast({
        title: "Fehler!",
        description: "Beim Verarbeiten der Formulardaten ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Unternehmenseinstellungen</DialogTitle>
          <DialogDescription>
            Geben Sie hier die Daten Ihres Unternehmens ein. Diese werden für Rechnungen und andere Dokumente verwendet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Logo-Upload-Funktionalität wurde entfernt */}
            
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
              
              <FormField
                control={form.control}
                name="colorTheme"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Farbpalette
                    </FormLabel>
                    <FormDescription>
                      Wählen Sie eine Farbpalette für die Anwendung.
                    </FormDescription>
                    <FormControl>
                      <Select 
                        defaultValue={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Farbpalette wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blue" className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-600 shadow-sm inline-block mr-2"></div>
                            Blau
                          </SelectItem>
                          <SelectItem value="green" className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-green-600 shadow-sm inline-block mr-2"></div>
                            Grün
                          </SelectItem>
                          <SelectItem value="purple" className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-purple-600 shadow-sm inline-block mr-2"></div>
                            Lila
                          </SelectItem>
                          <SelectItem value="red" className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-600 shadow-sm inline-block mr-2"></div>
                            Rot
                          </SelectItem>
                          <SelectItem value="orange" className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-orange-600 shadow-sm inline-block mr-2"></div>
                            Orange
                          </SelectItem>
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
                  <FormItem className="sm:col-span-2 space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Printer className="h-4 w-4" /> Bonbreite
                    </FormLabel>
                    <FormDescription>
                      Wählen Sie die Breite Ihres Thermobondruckers. 
                      Dies beeinflusst die Formatierung der ausgedruckten Belege.
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
                          <SelectItem value="58mm">58mm (schmaler Bon)</SelectItem>
                          <SelectItem value="80mm">80mm (breiter Bon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SMTP-Einstellungen für den E-Mail-Versand */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-3">E-Mail-Server-Einstellungen (SMTP)</h3>
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
                    <FormItem className="sm:col-span-2">
                      <FormLabel>SMTP Server (Host)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="smtp.ihredomain.at" />
                      </FormControl>
                      <FormDescription>
                        Der SMTP-Server Ihres E-Mail-Anbieters, z.B. smtp.gmail.com
                      </FormDescription>
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
                        <Input {...field} placeholder="587 oder 465" />
                      </FormControl>
                      <FormDescription>
                        Typische Ports: 587 (TLS) oder 465 (SSL)
                      </FormDescription>
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
                        <Input {...field} placeholder="ihr-login@ihredomain.at" />
                      </FormControl>
                      <FormDescription>
                        Oft Ihre E-Mail-Adresse
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smtpPassword"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>SMTP Passwort</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="●●●●●●●●" />
                      </FormControl>
                      <FormDescription>
                        Das Passwort für Ihren E-Mail-Account oder ein spezielles App-Passwort
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bewertungslink-Einstellungen */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-3">Bewertungslink</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Geben Sie hier Ihren Link zu Google Bewertungen, Facebook oder einer anderen Plattform an.
                Dieser Link wird in Bewertungs-E-Mails an Kunden verwendet.
              </p>
              
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
              <Button 
                type="submit" 
                className="w-full sm:w-auto"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}