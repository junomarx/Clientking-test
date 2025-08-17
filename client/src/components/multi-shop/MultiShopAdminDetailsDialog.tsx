import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Save, Shield, ShieldOff, UserMinus, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Schema für Admin-Updates
const updateAdminSchema = z.object({
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  password: z.string().optional(),
  twoFaEmailEnabled: z.boolean(),
  twoFaTotpEnabled: z.boolean(),
  isMultiShopAdmin: z.boolean(),
});

type UpdateAdminFormData = z.infer<typeof updateAdminSchema>;

interface MultiShopAdminDetailsDialogProps {
  adminId: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AdminDetails {
  id: number;
  username: string;
  email: string;
  twoFaEmailEnabled: boolean;
  twoFaTotpEnabled: boolean;
  isMultiShopAdmin: boolean;
  accessibleShops: Array<{
    id: number;
    businessName: string;
    accessLevel: string;
  }>;
}

interface Shop {
  id: number;
  businessName: string;
}

export function MultiShopAdminDetailsDialog({ 
  adminId, 
  isOpen, 
  onOpenChange 
}: MultiShopAdminDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  // Admin Details laden
  const { data: adminDetails, isLoading } = useQuery<AdminDetails>({
    queryKey: ["/api/multi-shop/admin", adminId],
    queryFn: async () => {
      if (!adminId) throw new Error("Keine Admin-ID");
      const response = await apiRequest("GET", `/api/multi-shop/admin/${adminId}`);
      return response.json();
    },
    enabled: !!adminId && isOpen,
  });

  // Alle Shops laden
  const { data: allShops = [] } = useQuery<Shop[]>({
    queryKey: ["/api/superadmin/shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/shops");
      return response.json();
    },
    enabled: isOpen,
  });

  // Form Setup
  const form = useForm<UpdateAdminFormData>({
    resolver: zodResolver(updateAdminSchema),
    defaultValues: {
      email: "",
      password: "",
      twoFaEmailEnabled: false,
      twoFaTotpEnabled: false,
      isMultiShopAdmin: false,
    },
  });

  // Form mit Admin-Daten befüllen
  useEffect(() => {
    if (adminDetails) {
      form.reset({
        email: adminDetails.email,
        password: "",
        twoFaEmailEnabled: adminDetails.twoFaEmailEnabled,
        twoFaTotpEnabled: adminDetails.twoFaTotpEnabled,
        isMultiShopAdmin: adminDetails.isMultiShopAdmin || false,
      });
    }
  }, [adminDetails, form]);

  // Admin aktualisieren
  const updateAdminMutation = useMutation({
    mutationFn: async (data: UpdateAdminFormData) => {
      if (!adminId) throw new Error("Keine Admin-ID");
      const updateData = { ...data };
      // Passwort nur senden, wenn es gesetzt wurde
      if (!updateData.password) {
        delete updateData.password;
      }
      const response = await apiRequest("PUT", `/api/multi-shop/admin/${adminId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Admin erfolgreich aktualisiert" });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admin", adminId] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Shop-Zugang gewähren
  const grantAccessMutation = useMutation({
    mutationFn: async (shopId: number) => {
      if (!adminId) throw new Error("Keine Admin-ID");
      const response = await apiRequest("POST", "/api/multi-shop/grant-access", {
        userId: adminId,
        shopId: shopId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Shop-Zugang erfolgreich gewährt" });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admin", adminId] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admins"] });
      setSelectedShopId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Gewähren des Zugangs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Shop-Zugang entziehen
  const revokeAccessMutation = useMutation({
    mutationFn: async (shopId: number) => {
      if (!adminId) throw new Error("Keine Admin-ID");
      const response = await apiRequest("DELETE", `/api/multi-shop/revoke-access/${adminId}/${shopId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Shop-Zugang erfolgreich entzogen" });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admin", adminId] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/admins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Entziehen des Zugangs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateAdminFormData) => {
    updateAdminMutation.mutate(data);
  };

  const onGrantAccess = () => {
    if (selectedShopId) {
      grantAccessMutation.mutate(selectedShopId);
    }
  };

  const onRevokeAccess = (shopId: number) => {
    revokeAccessMutation.mutate(shopId);
  };

  // Verfügbare Shops (nicht bereits zugewiesen)
  const availableShops = allShops.filter(shop => 
    !adminDetails?.accessibleShops.some(access => access.id === shop.id)
  );

  if (!isOpen || !adminId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Multi-Shop Admin Details: {adminDetails?.username || "Laden..."}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center">Laden...</div>
        ) : adminDetails ? (
          <div className="space-y-6">
            {/* Grunddaten */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grunddaten</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Benutzername</label>
                        <Input value={adminDetails.username} disabled className="mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Der Benutzername kann nicht geändert werden
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Mail-Adresse</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Neues Passwort (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Leer lassen, um Passwort nicht zu ändern" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateAdminMutation.isPending}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateAdminMutation.isPending ? "Speichern..." : "Grunddaten speichern"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Separator />

            {/* Multi-Shop Admin Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Multi-Shop Admin Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Als Multi-Shop Admin ernennen</p>
                    <p className="text-sm text-muted-foreground">
                      Multi-Shop Admins haben Zugriff auf das Multi-Shop Interface
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="isMultiShopAdmin"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* 2FA Einstellungen */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Zwei-Faktor-Authentifizierung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">E-Mail 2FA</p>
                    <p className="text-sm text-muted-foreground">
                      Codes per E-Mail senden
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="twoFaEmailEnabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">TOTP 2FA (Google Authenticator)</p>
                    <p className="text-sm text-muted-foreground">
                      Zeitbasierte Codes
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="twoFaTotpEnabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Shop-Zugänge */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shop-Zugänge verwalten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Neuen Shop-Zugang hinzufügen */}
                {availableShops.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={selectedShopId || ""}
                      onChange={(e) => setSelectedShopId(e.target.value ? parseInt(e.target.value) : null)}
                      className="flex-1 px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="">Shop auswählen...</option>
                      {availableShops.map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.businessName}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={onGrantAccess}
                      disabled={!selectedShopId || grantAccessMutation.isPending}
                      variant="outline"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Zugang gewähren
                    </Button>
                  </div>
                )}

                {/* Aktuelle Shop-Zugänge */}
                <div className="space-y-2">
                  <p className="font-medium">Aktuelle Zugänge:</p>
                  {adminDetails.accessibleShops.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Keine Shop-Zugänge vorhanden
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {adminDetails.accessibleShops.map((shop) => (
                        <div
                          key={shop.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{shop.businessName}</p>
                            <Badge variant="secondary" className="text-xs">
                              {shop.accessLevel}
                            </Badge>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={revokeAccessMutation.isPending}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Entziehen
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Shop-Zugang entziehen</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Möchten Sie den Zugang zu "{shop.businessName}" wirklich entziehen?
                                  Diese Aktion kann nicht rückgängig gemacht werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onRevokeAccess(shop.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Zugang entziehen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-6 text-center text-red-500">
            Fehler beim Laden der Admin-Details
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}