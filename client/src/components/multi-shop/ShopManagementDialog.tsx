import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit3, Building2, Phone, Mail, Globe, MapPin, Clock, Star, Settings, Image, FileText, ImageIcon, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema für Business Settings - basiert auf shared/schema.ts
const businessSettingsSchema = z.object({
  businessName: z.string().min(1, "Unternehmensname ist erforderlich"),
  ownerFirstName: z.string().min(1, "Vorname ist erforderlich"),
  ownerLastName: z.string().min(1, "Nachname ist erforderlich"),
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  companySlogan: z.string().optional(),
  streetAddress: z.string().min(1, "Straße und Hausnummer sind erforderlich"),
  city: z.string().min(1, "Ort ist erforderlich"),
  zipCode: z.string().min(1, "PLZ ist erforderlich"),
  country: z.string().min(1, "Land ist erforderlich"),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  receiptWidth: z.enum(["58mm", "80mm"]),
  smtpSenderName: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpPort: z.string().optional(),
  reviewLink: z.string().optional(),
  openingHours: z.string().optional(),
  kioskPin: z.string().optional(),
  logoImage: z.string().optional(),
  repairTerms: z.string().optional(),
});

type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;

interface ShopManagementDialogProps {
  shop: any;
  trigger?: React.ReactNode;
}

export function ShopManagementDialog({ shop, trigger }: ShopManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
  
  // Lade business settings für den Shop
  const { data: businessSettings, isLoading } = useQuery({
    queryKey: [`/api/multi-shop/business-settings/${shop.shopId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/multi-shop/business-settings/${shop.shopId}`);
      return response.json();
    },
    enabled: open,
  });

  const form = useForm<BusinessSettingsFormValues>({
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
      receiptWidth: "80mm",
      smtpSenderName: "",
      smtpHost: "",
      smtpUser: "",
      smtpPassword: "",
      smtpPort: "",
      reviewLink: "",
      openingHours: "",
      kioskPin: "",
      logoImage: "",
      repairTerms: "",
    },
  });

  // Logo Upload Handler
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Überprüfe die Dateigröße (max 2MB)
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(`Die Datei ist zu groß (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximale Größe: 2 MB.`);
      return;
    }
    
    // Überprüfe den Dateityp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Nur JPG, PNG, SVG, GIF und WEBP-Dateien sind erlaubt.');
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
    reader.onerror = () => {
      setLogoError('Fehler beim Lesen der Datei.');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = () => {
    setLogoPreview(null);
    form.setValue('logoImage', '');
  };

  // Aktualisiere Form wenn business settings geladen werden
  React.useEffect(() => {
    if (businessSettings) {
      setLogoPreview(businessSettings.logoImage || null);
      form.reset({
        businessName: businessSettings.businessName || "",
        ownerFirstName: businessSettings.ownerFirstName || "",
        ownerLastName: businessSettings.ownerLastName || "",
        taxId: businessSettings.taxId || "",
        vatNumber: businessSettings.vatNumber || "",
        companySlogan: businessSettings.companySlogan || "",
        streetAddress: businessSettings.streetAddress || "",
        city: businessSettings.city || "",
        zipCode: businessSettings.zipCode || "",
        country: businessSettings.country || "Österreich",
        phone: businessSettings.phone || "",
        email: businessSettings.email || "",
        website: businessSettings.website || "",
        receiptWidth: (businessSettings.receiptWidth === "58mm" || businessSettings.receiptWidth === "80mm") 
          ? businessSettings.receiptWidth : "80mm",
        smtpSenderName: businessSettings.smtpSenderName || "",
        smtpHost: businessSettings.smtpHost || "",
        smtpUser: businessSettings.smtpUser || "",
        smtpPassword: businessSettings.smtpPassword || "",
        smtpPort: businessSettings.smtpPort || "",
        reviewLink: businessSettings.reviewLink || "",
        openingHours: businessSettings.openingHours || "",
        kioskPin: businessSettings.kioskPin || "",
        logoImage: businessSettings.logoImage || "",
        repairTerms: businessSettings.repairTerms || "",
      });
    }
  }, [businessSettings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: BusinessSettingsFormValues) => {
      const response = await apiRequest("POST", `/api/multi-shop/business-settings/${shop.shopId}`, data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/multi-shop/business-settings/${shop.shopId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/accessible-shops"] });
      toast({
        title: "Erfolg!",
        description: "Geschäftseinstellungen wurden aktualisiert.",
        duration: 2000,
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Fehler!",
        description: `Die Einstellungen konnten nicht gespeichert werden: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  function onSubmit(data: BusinessSettingsFormValues) {
    updateMutation.mutate(data);
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex-1">
      <Edit3 className="h-4 w-4 mr-1" />
      Verwalten
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shop-Verwaltung: {shop.businessName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header mit Shop-Info und Edit-Button */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{businessSettings?.businessName || shop.businessName}</h3>
                <p className="text-sm text-muted-foreground">Shop-ID: {shop.shopId}</p>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mt-1">
                  AKTIV
                </Badge>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Bearbeiten
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                      size="sm"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={updateMutation.isPending}
                      size="sm"
                    >
                      {updateMutation.isPending ? "Speichern..." : "Speichern"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {!isEditing ? (
              // Read-Only View
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Geschäftsinformationen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unternehmensname</p>
                      <p>{businessSettings?.businessName || "Nicht angegeben"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Inhaber</p>
                      <p>{businessSettings?.ownerFirstName} {businessSettings?.ownerLastName || "Nicht angegeben"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Steuernummer</p>
                      <p>{businessSettings?.taxId || "Nicht angegeben"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">USt-IdNr.</p>
                      <p>{businessSettings?.vatNumber || "Nicht angegeben"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse & Kontakt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                      <p>{businessSettings?.streetAddress || "Nicht angegeben"}</p>
                      <p>{businessSettings?.zipCode} {businessSettings?.city}</p>
                      <p>{businessSettings?.country}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{businessSettings?.phone || "Nicht angegeben"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p>{businessSettings?.email || "Nicht angegeben"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <p>{businessSettings?.website || "Nicht angegeben"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Öffnungszeiten & Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Öffnungszeiten</p>
                      <p>{businessSettings?.openingHours || "Nicht angegeben"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <p>{businessSettings?.reviewLink ? "Bewertungslink vorhanden" : "Kein Bewertungslink"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Technische Einstellungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bonbreite</p>
                      <p>{businessSettings?.receiptWidth || "80mm"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Kiosk-PIN</p>
                      <p>{businessSettings?.kioskPin ? "****" : "Nicht gesetzt"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">SMTP konfiguriert</p>
                      <p>{businessSettings?.smtpHost ? "Ja" : "Nein"}</p>
                    </div>
                  </CardContent>
                </Card>
                </div>

                {/* Logo & Branding - Vollbreite */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Logo & Branding
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        {businessSettings?.logoImage ? (
                          <img
                            src={businessSettings.logoImage}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain rounded-md"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Logo: {businessSettings?.logoImage ? (
                          <span className="text-green-600">Vorhanden</span>
                        ) : (
                          <span className="text-gray-500">Nicht gesetzt</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Reparaturbedingungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">AGB / Reparaturbedingungen</p>
                      <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                        <p className="whitespace-pre-wrap text-sm">
                          {businessSettings?.repairTerms || "Keine Reparaturbedingungen hinterlegt"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Technische Einstellungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bonbreite</p>
                      <p>{businessSettings?.receiptWidth || "80mm"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Kiosk-PIN</p>
                      <p>{businessSettings?.kioskPin ? "****" : "Nicht gesetzt"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">SMTP konfiguriert</p>
                      <p>{businessSettings?.smtpHost ? "Ja" : "Nein"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Edit Form
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Geschäftsinformationen</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unternehmensname*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="ownerFirstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vorname*</FormLabel>
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
                                <FormLabel>Nachname*</FormLabel>
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
                          name="taxId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Steuernummer</FormLabel>
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
                              <FormLabel>USt-IdNr.</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Adresse & Kontakt</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="streetAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Straße und Hausnummer*</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="zipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PLZ*</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ort*</FormLabel>
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
                                <Input type="email" {...field} />
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
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Service & Einstellungen</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="openingHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Öffnungszeiten</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="z.B. Mo-Fr: 9-18 Uhr, Sa: 9-13 Uhr" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reviewLink"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bewertungslink</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="https://g.page/review/..." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="kioskPin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kiosk-Modus PIN</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" placeholder="4-stellige PIN" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">SMTP E-Mail Einstellungen</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                              <FormLabel>SMTP Host</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="smtp.example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="smtpUser"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Benutzer</FormLabel>
                                <FormControl>
                                  <Input {...field} />
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
                        </div>
                        <FormField
                          control={form.control}
                          name="smtpPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SMTP Passwort</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Logo & Branding - Vollbreite */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Logo & Branding</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <FormLabel>Firmenlogo</FormLabel>
                          <p className="text-xs text-muted-foreground mb-3">
                            Laden Sie Ihr Firmenlogo hoch (max. 2MB, PNG, JPG, SVG, GIF oder WEBP)
                          </p>
                          
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
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
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
                                onChange={handleLogoUpload}
                                className="block w-full text-sm text-slate-500
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-md file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-primary file:text-white
                                          hover:file:bg-primary/80"
                                id="logo-upload"
                              />
                              
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
                      </CardContent>
                    </Card>

                  {/* Reparaturbedingungen - Vollbreite */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Reparaturbedingungen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="repairTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AGB / Reparaturbedingungen</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Geben Sie hier die Reparaturbedingungen und AGB ein..."
                                className="min-h-[150px]"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Diese Bedingungen werden bei der Kiosk-Unterschrift angezeigt und können die gesamte Breite nutzen
                            </p>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </form>
              </Form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}