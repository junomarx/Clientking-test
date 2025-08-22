import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Building2, 
  CreditCard, 
  Settings, 
  ShieldCheck, 
  MapPin, 
  Mail, 
  Phone, 
  Euro,
  Calendar,
  Percent,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface MultiShopAdmin {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  accessibleShops: Array<{
    id: number;
    name: string;
    businessName: string;
    ownerName: string;
    city: string;
    email: string;
    shopId: number;
    grantedAt: string;
    isActive: boolean;
  }>;
  totalShops: number;
  profile: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    businessData?: any;
  } | null;
  pricing: {
    pricePerShop: number;
    currency: string;
    billingCycle: string;
    discountPercent: number;
    monthlyTotal: number;
    notes?: string;
  };
}

// Schema für MSA-Profil
const msaProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Gültige E-Mail erforderlich").optional(),
  phone: z.string().optional(),
  businessData: z.object({
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    vatNumber: z.string().optional(),
    taxNumber: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
});

// Schema für MSA-Preisgestaltung
const msaPricingSchema = z.object({
  pricePerShop: z.number().min(0, "Preis muss positiv sein"),
  currency: z.string().default("EUR"),
  billingCycle: z.string().default("monthly"),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

type MSAProfileData = z.infer<typeof msaProfileSchema>;
type MSAPricingData = z.infer<typeof msaPricingSchema>;

interface MultiShopAdminDetailsDialogProps {
  admin: MultiShopAdmin | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MultiShopAdminDetailsDialog({ 
  admin, 
  isOpen, 
  onClose 
}: MultiShopAdminDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // MSA-Profil Form
  const profileForm = useForm<MSAProfileData>({
    resolver: zodResolver(msaProfileSchema),
    defaultValues: {
      firstName: admin?.profile?.firstName || "",
      lastName: admin?.profile?.lastName || "",
      email: admin?.profile?.email || admin?.email || "",
      phone: admin?.profile?.phone || "",
      businessData: {
        companyName: admin?.profile?.businessData?.companyName || "",
        contactPerson: admin?.profile?.businessData?.contactPerson || "",
        street: admin?.profile?.businessData?.street || "",
        city: admin?.profile?.businessData?.city || "",
        zipCode: admin?.profile?.businessData?.zipCode || "",
        country: admin?.profile?.businessData?.country || "Deutschland",
        vatNumber: admin?.profile?.businessData?.vatNumber || "",
        taxNumber: admin?.profile?.businessData?.taxNumber || "",
        email: admin?.profile?.businessData?.email || admin?.email || "",
        phone: admin?.profile?.businessData?.phone || "",
      }
    }
  });

  // MSA-Preisgestaltung Form
  const pricingForm = useForm<MSAPricingData>({
    resolver: zodResolver(msaPricingSchema),
    defaultValues: {
      pricePerShop: admin?.pricing?.pricePerShop || 29.90,
      currency: admin?.pricing?.currency || "EUR",
      billingCycle: admin?.pricing?.billingCycle || "monthly",
      discountPercent: admin?.pricing?.discountPercent || 0,
      notes: admin?.pricing?.notes || "",
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: MSAProfileData) => {
      if (!admin) throw new Error("Kein Admin ausgewählt");
      const response = await apiRequest("PUT", `/api/superadmin/msa-profile/${admin.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/multi-shop-admins"] });
      toast({
        title: "Profil aktualisiert",
        description: "Das MSA-Profil wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async (data: MSAPricingData) => {
      if (!admin) throw new Error("Kein Admin ausgewählt");
      const response = await apiRequest("PUT", `/api/superadmin/msa-pricing/${admin.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/multi-shop-admins"] });
      toast({
        title: "Preisgestaltung aktualisiert",
        description: "Die MSA-Preisgestaltung wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onUpdateProfile = (data: MSAProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const onUpdatePricing = (data: MSAPricingData) => {
    updatePricingMutation.mutate(data);
  };

  if (!admin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            MSA Details: {admin.username}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="shops">Shops</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="pricing">Preisgestaltung</TabsTrigger>
          </TabsList>

          {/* Übersicht Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Grundinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Benutzername</Label>
                    <p className="text-sm">{admin.username}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">E-Mail</Label>
                    <p className="text-sm">{admin.email || "Nicht angegeben"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={admin.isActive ? "default" : "secondary"}>
                      {admin.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Erstellt am</Label>
                    <p className="text-sm">
                      {format(new Date(admin.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Aktuelle Abrechnung
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Anzahl Shops</Label>
                    <p className="text-lg font-semibold">{admin.totalShops}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Preis pro Shop</Label>
                    <p className="text-lg font-semibold">
                      €{admin.pricing.pricePerShop.toFixed(2)}
                    </p>
                  </div>
                  {admin.pricing.discountPercent > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Rabatt</Label>
                      <p className="text-sm text-green-600">
                        -{admin.pricing.discountPercent}%
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <Label className="text-sm font-medium">Monatlicher Gesamtpreis</Label>
                    <p className="text-xl font-bold text-primary">
                      €{admin.pricing.monthlyTotal.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Shops Tab */}
          <TabsContent value="shops" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Zugewiesene Shops ({admin.totalShops})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Geschäftsname</TableHead>
                        <TableHead>Inhaber</TableHead>
                        <TableHead>Stadt</TableHead>
                        <TableHead>Zugang gewährt</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admin.accessibleShops.map((shop) => (
                        <TableRow key={shop.shopId}>
                          <TableCell className="font-medium">
                            {shop.businessName}
                          </TableCell>
                          <TableCell>{shop.ownerName}</TableCell>
                          <TableCell>{shop.city}</TableCell>
                          <TableCell>
                            {format(new Date(shop.grantedAt), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={shop.isActive ? "default" : "secondary"}>
                              {shop.isActive ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profil Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Persönliche Daten
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vorname</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Max" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nachname</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mustermann" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-Mail</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="max@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Geschäftsdaten für Rechnungsstellung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="businessData.companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Firmenname</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mustermann GmbH" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ansprechpartner</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Max Mustermann" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Straße</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Musterstraße 123" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stadt</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Wien" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1010" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Land</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Österreich" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>USt-IdNr.</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ATU12345678" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="businessData.taxNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Steuernummer</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123/456/789" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Speichern..." : "Profil aktualisieren"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Preisgestaltung Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <Form {...pricingForm}>
              <form onSubmit={pricingForm.handleSubmit(onUpdatePricing)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Individuelle Preisgestaltung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={pricingForm.control}
                      name="pricePerShop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preis pro Shop (€)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01" 
                              placeholder="29.90"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pricingForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Währung</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Währung wählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="CHF">CHF</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pricingForm.control}
                      name="billingCycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Abrechnungszyklus</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Zyklus wählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monatlich</SelectItem>
                              <SelectItem value="quarterly">Quartalsweise</SelectItem>
                              <SelectItem value="yearly">Jährlich</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={pricingForm.control}
                      name="discountPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rabatt (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0" 
                              max="100" 
                              placeholder="0"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Zusätzliche Informationen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={pricingForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notizen zur Preisgestaltung</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Zusätzliche Informationen zur individuellen Preisgestaltung..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Preisvorschau */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Preisvorschau
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <Label className="text-sm text-muted-foreground">Anzahl Shops</Label>
                        <p className="text-2xl font-bold">{admin.totalShops}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Preis pro Shop</Label>
                        <p className="text-2xl font-bold">
                          €{pricingForm.watch("pricePerShop")?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Monatlicher Gesamtpreis</Label>
                        <p className="text-3xl font-bold text-primary">
                          €{(
                            admin.totalShops * 
                            (pricingForm.watch("pricePerShop") || 0) * 
                            (1 - (pricingForm.watch("discountPercent") || 0) / 100)
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updatePricingMutation.isPending}
                  >
                    {updatePricingMutation.isPending ? "Speichern..." : "Preisgestaltung aktualisieren"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}