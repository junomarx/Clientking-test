import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, UserPlus, UserMinus, Users, ShieldCheck, Plus } from "lucide-react";
import { useMultiShop, type MultiShopAdmin } from "@/hooks/use-multi-shop";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Schema für Shop-Zugang gewähren
const grantAccessSchema = z.object({
  userId: z.number().min(1, "Benutzer-ID ist erforderlich"),
  shopId: z.number().min(1, "Shop-ID ist erforderlich"),
});

// Schema für neuen Multi-Shop Admin erstellen
const createAdminSchema = z.object({
  username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen haben"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  shopIds: z.array(z.number()).min(1, "Mindestens ein Shop muss ausgewählt werden"),
});

type GrantAccessFormData = z.infer<typeof grantAccessSchema>;
type CreateAdminFormData = z.infer<typeof createAdminSchema>;

// Shop und User Interfaces für Selects
interface Shop {
  id: number;
  businessName: string;
  isActive: boolean;
}

interface User {
  id: number;
  username: string;
  email: string | null;
}

/**
 * Multi-Shop Management Komponente für Superadmins
 * Ermöglicht die Verwaltung von Shop-Zugriffen für Benutzer
 */
export function MultiShopManagement() {
  const { 
    multiShopAdmins, 
    isLoadingAdmins, 
    grantAccess, 
    revokeAccess, 
    isGrantingAccess, 
    isRevokingAccess 
  } = useMultiShop();
  
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isCreateAdminDialogOpen, setIsCreateAdminDialogOpen] = useState(false);

  // Alle Shops für Select abrufen
  const { data: allShops = [] } = useQuery<Shop[]>({
    queryKey: ["/api/superadmin/shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/shops");
      return response.json();
    },
  });

  // Alle Benutzer für Select abrufen
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/superadmin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/users");
      return response.json();
    },
  });

  const form = useForm<GrantAccessFormData>({
    resolver: zodResolver(grantAccessSchema),
    defaultValues: {
      userId: 0,
      shopId: 0,
    },
  });

  const createAdminForm = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      shopIds: [],
    },
  });

  const onSubmit = (data: GrantAccessFormData) => {
    grantAccess(data);
    setIsGrantDialogOpen(false);
    form.reset();
  };

  const onCreateAdmin = async (data: CreateAdminFormData) => {
    try {
      // Erst den neuen Admin erstellen
      const createResponse = await apiRequest("POST", "/api/multi-shop/create-admin", {
        username: data.username,
        password: data.password,
        email: data.email,
      });
      
      const newUser = await createResponse.json();
      
      // Dann Shop-Zugänge gewähren
      for (const shopId of data.shopIds) {
        await grantAccess({ userId: newUser.id, shopId });
      }
      
      setIsCreateAdminDialogOpen(false);
      createAdminForm.reset();
    } catch (error) {
      console.error("Fehler beim Erstellen des Multi-Shop Admins:", error);
    }
  };

  const handleRevokeAccess = (userId: number, shopId: number) => {
    if (confirm("Möchten Sie diesen Shop-Zugang wirklich entziehen?")) {
      revokeAccess({ userId, shopId });
    }
  };

  if (isLoadingAdmins) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Shop Verwaltung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Multi-Shop Verwaltung
          </CardTitle>
          
          <div className="flex gap-2">
            <Dialog open={isCreateAdminDialogOpen} onOpenChange={setIsCreateAdminDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Neuen Admin erstellen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Neuen Multi-Shop Admin erstellen</DialogTitle>
                </DialogHeader>
                
                <Form {...createAdminForm}>
                  <form onSubmit={createAdminForm.handleSubmit(onCreateAdmin)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createAdminForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benutzername</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="admin123" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createAdminForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-Mail</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="admin@example.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={createAdminForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passwort</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Mindestens 6 Zeichen" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createAdminForm.control}
                      name="shopIds"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Shop-Zugänge</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Wählen Sie die Shops aus, auf die der Admin Zugang haben soll.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {allShops.map((shop) => (
                              <FormField
                                key={shop.id}
                                control={createAdminForm.control}
                                name="shopIds"
                                render={({ field }) => (
                                  <FormItem
                                    key={shop.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(shop.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, shop.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== shop.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {shop.businessName}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateAdminDialogOpen(false)}
                      >
                        Abbrechen
                      </Button>
                      <Button type="submit" disabled={isGrantingAccess}>
                        {isGrantingAccess ? "Erstelle..." : "Admin erstellen"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Shop-Zugang gewähren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Shop-Zugang gewähren</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Benutzer</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Benutzer auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.username} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="shopId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Shop auswählen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allShops.map((shop) => (
                                <SelectItem key={shop.id} value={shop.id.toString()}>
                                  {shop.businessName} {!shop.isActive && "(Inaktiv)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsGrantDialogOpen(false)}
                      >
                        Abbrechen
                      </Button>
                      <Button type="submit" disabled={isGrantingAccess}>
                        {isGrantingAccess ? "Gewähre..." : "Zugang gewähren"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {multiShopAdmins.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Keine Multi-Shop Admins</h3>
            <p className="text-sm text-muted-foreground">
              Es wurden noch keine Shop-Zugänge gewährt.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {multiShopAdmins.map((admin) => (
              <Card key={admin.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-medium">{admin.username}</h3>
                        {admin.email && (
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {admin.accessibleShops.length} Shop{admin.accessibleShops.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shop Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Gewährt am</TableHead>
                        <TableHead className="w-[100px]">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admin.accessibleShops.map((shopAccess) => (
                        <TableRow key={shopAccess.shopId}>
                          <TableCell className="font-medium">
                            {shopAccess.shopName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={shopAccess.isActive ? "default" : "secondary"}>
                              {shopAccess.isActive ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(shopAccess.grantedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeAccess(admin.id, shopAccess.shopId)}
                              disabled={isRevokingAccess}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}