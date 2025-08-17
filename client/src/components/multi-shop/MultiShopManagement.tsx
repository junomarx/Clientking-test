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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Building2, UserPlus, UserMinus, Users, ShieldCheck, Plus } from "lucide-react";
// Lokale MultiShopAdmin Interface
interface MultiShopAdmin {
  id: number;
  username: string;
  email?: string;
  accessibleShops: {
    id: number;
    name: string;
    businessName: string;
    isActive: boolean;
    shopId: number;
    grantedAt: string;
  }[];
}
import { MultiShopAdminDetailsDialog } from "../superadmin/MultiShopAdminDetailsDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Direkte API-Aufrufe für Superadmin Multi-Shop Verwaltung
  const { data: multiShopAdmins = [], isLoading: isLoadingAdmins } = useQuery<MultiShopAdmin[]>({
    queryKey: ["/api/superadmin/multi-shop-admins"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/multi-shop-admins");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
  const [isCreateAdminDialogOpen, setIsCreateAdminDialogOpen] = useState(false);
  const [isShopSelectOpen, setIsShopSelectOpen] = useState(false);
  const [selectedAdminForDetails, setSelectedAdminForDetails] = useState<number | null>(null);

  // Alle Shops für Select abrufen (ohne Duplikate)
  const { data: allShopsRaw = [] } = useQuery<Shop[]>({
    queryKey: ["/api/superadmin/shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/shops");
      return response.json();
    },
  });

  // Duplikate entfernen basierend auf businessName
  const allShops = allShopsRaw.filter((shop, index, self) => 
    index === self.findIndex(s => s.businessName === shop.businessName)
  );

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

  // Grant Access Mutation
  const grantAccessMutation = useMutation({
    mutationFn: async (data: GrantAccessFormData) => {
      const response = await apiRequest("POST", "/api/superadmin/grant-access", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/multi-shop-admins"] });
      toast({
        title: "Zugang gewährt",
        description: "Shop-Zugang wurde erfolgreich gewährt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Gewähren des Zugangs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke Access Mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (data: GrantAccessFormData) => {
      const response = await apiRequest("DELETE", "/api/superadmin/revoke-access", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/multi-shop-admins"] });
      toast({
        title: "Zugang entzogen",
        description: "Shop-Zugang wurde erfolgreich entzogen",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Entziehen des Zugangs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete Admin Mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: number) => {
      const response = await apiRequest("DELETE", `/api/superadmin/multi-shop-admin/${adminId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/multi-shop-admins"] });
      toast({
        title: "Admin gelöscht",
        description: "Der Multi-Shop Admin wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GrantAccessFormData) => {
    grantAccessMutation.mutate(data);
    setIsGrantDialogOpen(false);
    form.reset();
  };

  const onCreateAdmin = async (data: CreateAdminFormData) => {
    try {
      console.log("Erstelle Multi-Shop Admin:", data);
      
      // Erst den neuen Admin erstellen
      const createResponse = await apiRequest("POST", "/api/multi-shop/create-admin", {
        username: data.username,
        password: data.password,
        email: data.email,
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || "Fehler beim Erstellen des Admins");
      }
      
      const newUser = await createResponse.json();
      console.log("Admin erstellt:", newUser);
      
      // Dann Shop-Zugänge gewähren
      for (const shopId of data.shopIds) {
        console.log(`Gewähre Zugang für Shop ${shopId}`);
        await grantAccessMutation.mutateAsync({ userId: newUser.id, shopId });
      }
      
      setIsCreateAdminDialogOpen(false);
      createAdminForm.reset();
      console.log("Multi-Shop Admin erfolgreich erstellt");
    } catch (error: any) {
      console.error("Fehler beim Erstellen des Multi-Shop Admins:", error);
      alert(`Fehler: ${error.message}`);
    }
  };

  const handleRevokeAccess = (userId: number, shopId: number) => {
    if (confirm("Möchten Sie diesen Shop-Zugang wirklich entziehen?")) {
      revokeAccessMutation.mutate({ userId, shopId });
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
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Shop-Zugänge</FormLabel>
                          <p className="text-sm text-muted-foreground mb-2">
                            Wählen Sie die Shops aus, auf die der Admin Zugang haben soll.
                          </p>
                          
                          <Popover open={isShopSelectOpen} onOpenChange={setIsShopSelectOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                >
                                  {field.value?.length > 0
                                    ? `${field.value.length} Shop${field.value.length !== 1 ? 's' : ''} ausgewählt`
                                    : "Shops auswählen..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Shop suchen..." />
                                <CommandEmpty>Keine Shops gefunden.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                  {allShops.map((shop) => (
                                    <CommandItem
                                      value={shop.businessName}
                                      key={shop.id}
                                      onSelect={() => {
                                        const isSelected = field.value?.includes(shop.id);
                                        if (isSelected) {
                                          field.onChange(field.value?.filter(id => id !== shop.id));
                                        } else {
                                          field.onChange([...(field.value || []), shop.id]);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value?.includes(shop.id) ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {shop.businessName}
                                      {!shop.isActive && (
                                        <span className="ml-auto text-muted-foreground text-xs">(Inaktiv)</span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Ausgewählte Shops anzeigen */}
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {field.value.map((shopId) => {
                                const shop = allShops.find(s => s.id === shopId);
                                if (!shop) return null;
                                return (
                                  <div
                                    key={shopId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                                  >
                                    {shop.businessName}
                                    <X
                                      className="h-3 w-3 cursor-pointer hover:text-primary/70"
                                      onClick={() => {
                                        field.onChange(field.value?.filter(id => id !== shopId));
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
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
                      <Button type="submit" disabled={grantAccessMutation.isPending}>
                        {grantAccessMutation.isPending ? "Erstelle..." : "Admin erstellen"}
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
                      <Button type="submit" disabled={grantAccessMutation.isPending}>
                        {grantAccessMutation.isPending ? "Gewähre..." : "Zugang gewähren"}
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {admin.accessibleShops.length} Shop{admin.accessibleShops.length !== 1 ? "s" : ""}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAdminForDetails(admin.id)}
                      >
                        Details
                      </Button>
                    </div>
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
                            {shopAccess.businessName || shopAccess.name}
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
                              disabled={revokeAccessMutation.isPending}
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
      
      {/* Multi-Shop Admin Details Dialog */}
      {selectedAdminForDetails && (
        <MultiShopAdminDetailsDialog
          admin={multiShopAdmins.find(a => a.id === selectedAdminForDetails) || null}
          isOpen={selectedAdminForDetails !== null}
          onClose={() => setSelectedAdminForDetails(null)}
          onRevoke={(adminId, shopId) => revokeAccessMutation.mutate({ userId: adminId, shopId })}
          onDelete={(adminId) => deleteAdminMutation.mutate(adminId)}
          onGrantAccess={(adminId, shopId) => grantAccessMutation.mutate({ userId: adminId, shopId })}
        />
      )}
    </Card>
  );
}