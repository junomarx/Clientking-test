import React, { useState, useRef } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { BusinessSettings } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Image as ImageIcon, Palette } from "lucide-react";

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
});

// Erweiterte Form-Werte, die nicht direkt im Schema sind
interface ExtendedBusinessSettingsFormValues extends z.infer<typeof businessSettingsSchema> {
  logoImage?: string;
}

interface BusinessSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BusinessSettingsDialog({ open, onClose }: BusinessSettingsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Max. Logo-Größe in Bytes (100KB)
  const MAX_LOGO_SIZE = 100 * 1024;

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
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        resolve({
          isValid: false,
          base64: null,
          error: 'Nur JPEG und PNG Dateien sind erlaubt.'
        });
        return;
      }

      // Bild in Base64 konvertieren
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Überprüfen der Auflösung
          if (img.width > 400 || img.height > 400) {
            resolve({
              isValid: false,
              base64: null,
              error: 'Die Bildauflösung darf maximal 400x400 Pixel betragen.'
            });
          } else {
            resolve({
              isValid: true,
              base64: e.target?.result as string,
              error: null
            });
          }
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
        description: "Unternehmenseinstellungen wurden aktualisiert.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ExtendedBusinessSettingsFormValues) {
    updateMutation.mutate(data);
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
            {/* Logo Upload UI */}
            <div className="mb-6">
              <FormLabel>Firmenlogo</FormLabel>
              <FormDescription>
                Laden Sie Ihr Firmenlogo hoch (max. 100KB, max. 400x400 Pixel, PNG oder JPG).
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
                    accept="image/png,image/jpeg"
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
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="blue" id="blue" className="border-blue-600" />
                          <div className="w-6 h-6 rounded-full bg-blue-600 shadow-sm"></div>
                          <label htmlFor="blue" className="text-sm font-medium">Blau</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="green" id="green" className="border-green-600" />
                          <div className="w-6 h-6 rounded-full bg-green-600 shadow-sm"></div>
                          <label htmlFor="green" className="text-sm font-medium">Grün</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="purple" id="purple" className="border-purple-600" />
                          <div className="w-6 h-6 rounded-full bg-purple-600 shadow-sm"></div>
                          <label htmlFor="purple" className="text-sm font-medium">Lila</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="red" id="red" className="border-red-600" />
                          <div className="w-6 h-6 rounded-full bg-red-600 shadow-sm"></div>
                          <label htmlFor="red" className="text-sm font-medium">Rot</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="orange" id="orange" className="border-orange-600" />
                          <div className="w-6 h-6 rounded-full bg-orange-600 shadow-sm"></div>
                          <label htmlFor="orange" className="text-sm font-medium">Orange</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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