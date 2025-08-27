import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { useOnlineStatus } from "@/hooks/use-online-status";
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
  FileText,
  Circle,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface MultiShopAdmin {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
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
  const [hasChanges, setHasChanges] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const { isUserOnline: isOnlineViaWebSocket, isConnected } = useOnlineStatus();

  // Online-Status Logik (gleich wie in SuperadminUsersTab)
  const { data: backendOnlineStatus } = useQuery({
    queryKey: ['/api/online-status'],
    refetchInterval: 30000,
  });

  const isUserOnline = (userId: number, lastLoginAt: string | null, lastLogoutAt: string | null) => {
    if (backendOnlineStatus && 'onlineUsers' in backendOnlineStatus && Array.isArray(backendOnlineStatus.onlineUsers)) {
      return backendOnlineStatus.onlineUsers.includes(userId);
    }
    if (isConnected) {
      return isOnlineViaWebSocket(userId);
    }
    // Fallback: Zeitstempel-basierte Logik
    if (!lastLoginAt) return false;
    const loginTime = new Date(lastLoginAt);
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    if (lastLogoutAt) {
      const logoutTime = new Date(lastLogoutAt);
      if (logoutTime > loginTime) {
        return false;
      }
    }
    return loginTime > fifteenMinutesAgo;
  };

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

  // Überwache Formular-Änderungen
  useEffect(() => {
    const subscription = profileForm.watch(() => setHasChanges(true));
    return () => subscription.unsubscribe();
  }, [profileForm]);

  useEffect(() => {
    const subscription = pricingForm.watch(() => setHasChanges(true));
    return () => subscription.unsubscribe();
  }, [pricingForm]);

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

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const response = await apiRequest('PATCH', `/api/superadmin/users/${userId}/reset-password`, {
        newPassword
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Passwort zurückgesetzt",
        description: "Das Passwort wurde erfolgreich zurückgesetzt.",
      });
      setNewPassword("");
      setResetPasswordDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Zurücksetzen des Passworts",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = () => {
    if (!admin || !newPassword.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie ein neues Passwort ein.",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ userId: admin.id, newPassword });
  };

  const onUpdateProfile = (data: MSAProfileData) => {
    updateProfileMutation.mutate(data);
    setHasChanges(false);
  };

  const onUpdatePricing = (data: MSAPricingData) => {
    updatePricingMutation.mutate(data);
    setHasChanges(false);
  };

  if (!admin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            MSA Details: {admin.username}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
              <TabsTrigger value="overview">Übersicht</TabsTrigger>
              <TabsTrigger value="shops">Shops</TabsTrigger>
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="pricing">Preisgestaltung</TabsTrigger>
              <TabsTrigger value="security">Sicherheit</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-2" style={{ maxHeight: 'calc(90vh - 260px)' }}>
              {/* Übersicht Tab */}
              <TabsContent value="overview" className="space-y-4 m-0 data-[state=active]:block"
                style={{ height: 'fit-content' }}>
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
                        <Label className="text-sm font-medium">Online-Status</Label>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${
                              isUserOnline(admin.id, admin.lastLoginAt, admin.lastLogoutAt) 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <Circle 
                              className={`h-3 w-3 mr-1 ${
                                isUserOnline(admin.id, admin.lastLoginAt, admin.lastLogoutAt) 
                                  ? 'fill-green-500 text-green-500' 
                                  : 'fill-red-500 text-red-500'
                              }`} 
                            />
                            {isUserOnline(admin.id, admin.lastLoginAt, admin.lastLogoutAt) ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Letzter Login</Label>
                        <p className="text-sm">
                          {admin.lastLoginAt 
                            ? format(new Date(admin.lastLoginAt), "dd.MM.yyyy HH:mm", { locale: de })
                            : "Nie angemeldet"
                          }
                        </p>
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
                        <p className="text-2xl font-bold">{admin.totalShops}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Preis pro Shop</Label>
                        <p className="text-lg">€{admin.pricing.pricePerShop.toFixed(2)}/Monat</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Rabatt</Label>
                        <p className="text-lg">{admin.pricing.discountPercent}%</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Gesamtsumme</Label>
                        <p className="text-2xl font-bold text-primary">
                          €{admin.pricing.monthlyTotal.toFixed(2)}/Monat
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Shop-Übersicht
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {admin.accessibleShops.map((shop) => (
                        <Card key={shop.id} className="border">
                          <CardContent className="pt-4">
                            <h4 className="font-semibold">{shop.businessName}</h4>
                            <p className="text-sm text-muted-foreground">{shop.ownerName}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {shop.city}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {shop.email}
                            </p>
                            <div className="mt-2">
                              <Badge variant={shop.isActive ? "default" : "secondary"}>
                                {shop.isActive ? "Aktiv" : "Inaktiv"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Shops Tab */}
              <TabsContent value="shops" className="space-y-4 m-0 data-[state=active]:block"
                style={{ height: 'fit-content' }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Zugewiesene Shops ({admin.totalShops})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop</TableHead>
                          <TableHead>Inhaber</TableHead>
                          <TableHead>Stadt</TableHead>
                          <TableHead>E-Mail</TableHead>
                          <TableHead>Gewährt am</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admin.accessibleShops.map((shop) => (
                          <TableRow key={shop.id}>
                            <TableCell className="font-medium">{shop.businessName}</TableCell>
                            <TableCell>{shop.ownerName}</TableCell>
                            <TableCell>{shop.city}</TableCell>
                            <TableCell>{shop.email}</TableCell>
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profil Tab */}
              <TabsContent value="profile" className="space-y-4 m-0 data-[state=active]:block"
                style={{ height: 'fit-content' }}>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
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
                                <Input {...field} placeholder="Vorname eingeben" />
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
                                <Input {...field} placeholder="Nachname eingeben" />
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
                                <Input {...field} type="email" placeholder="E-Mail eingeben" />
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
                                <Input {...field} type="tel" placeholder="Telefonnummer eingeben" />
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
                          Geschäftsdaten
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
                                <Input {...field} placeholder="Firmenname eingeben" />
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
                                <Input {...field} placeholder="Ansprechpartner eingeben" />
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
                              <FormLabel>Straße & Hausnummer</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Straße eingeben" />
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
                                <Input {...field} placeholder="Stadt eingeben" />
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
                                <Input {...field} placeholder="PLZ eingeben" />
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
                                <Input {...field} placeholder="Land eingeben" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </form>
                </Form>
              </TabsContent>

              {/* Preisgestaltung Tab */}
              <TabsContent value="pricing" className="space-y-4 m-0 data-[state=active]:block"
                style={{ height: 'fit-content' }}>
                <Form {...pricingForm}>
                  <form onSubmit={pricingForm.handleSubmit(onUpdatePricing)} className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Euro className="h-4 w-4" />
                          Preisgestaltung
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={pricingForm.control}
                          name="pricePerShop"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preis pro Shop</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  min="0" 
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
                  </form>
                </Form>
              </TabsContent>

              {/* Sicherheit Tab */}
              <TabsContent value="security" className="space-y-4 m-0 data-[state=active]:block"
                style={{ height: 'fit-content' }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Passwort-Verwaltung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Wichtiger Hinweis:</strong> Das Zurücksetzen des Passworts überschreibt das aktuelle Passwort. 
                        Der Multi-Shop Admin sollte über die Änderung informiert werden.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="newPassword">Neues Passwort</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Neues Passwort eingeben"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleResetPassword}
                        disabled={!newPassword.trim() || resetPasswordMutation.isPending}
                        className="w-full"
                      >
                        {resetPasswordMutation.isPending ? "Wird zurückgesetzt..." : "Passwort zurücksetzen"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <div className="flex gap-2 w-full justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setHasChanges(false);
                onClose();
              }}
            >
              Schließen
            </Button>
            <div className="flex gap-2">
              {(activeTab === "profile" || activeTab === "pricing") && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (activeTab === "profile") {
                        profileForm.reset();
                      } else {
                        pricingForm.reset();
                      }
                      setHasChanges(false);
                    }}
                    disabled={!hasChanges}
                  >
                    Zurücksetzen
                  </Button>
                  <Button 
                    onClick={() => {
                      if (activeTab === "profile") {
                        profileForm.handleSubmit(onUpdateProfile)();
                      } else {
                        pricingForm.handleSubmit(onUpdatePricing)();
                      }
                    }}
                    disabled={
                      !hasChanges || 
                      (activeTab === "profile" ? updateProfileMutation.isPending : updatePricingMutation.isPending)
                    }
                  >
                    {(activeTab === "profile" ? updateProfileMutation.isPending : updatePricingMutation.isPending) 
                      ? "Speichern..." 
                      : "Speichern"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}