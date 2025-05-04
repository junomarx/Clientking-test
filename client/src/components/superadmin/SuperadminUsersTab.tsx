import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CircleUserRound,
  UserCog,
  ShieldCheck,
  Lock,
  Building2,
  Mail,
  Phone,
  BadgeCheck,
  BadgeX,
  Package,
  Pencil,
  Store
} from 'lucide-react';

// Benutzer-Typ ohne Passwort
interface User {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  shopId: number | null;
  companyName: string | null;
  companyAddress: string | null;
  companyVatNumber: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  packageId: number | null;
  createdAt: string;
}

// Erweiterter Benutzertyp für Formulareingaben
interface UserFormData extends Partial<User> {
  password?: string;
}

// Paket-Typ
interface Package {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: number;
  createdAt: string;
}

export default function SuperadminUsersTab() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Benutzer abrufen
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<User[]>({ 
    queryKey: ["/api/superadmin/users"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/superadmin/users');
        
        const text = await res.text();
        
        if (!res.ok) {
          console.error(`Serverfehler ${res.status}:`, text);
          throw new Error(`Serverfehler: ${res.status}`);
        }
        
        const contentType = res.headers.get('content-type') || '';
        
        if (!contentType.includes('application/json')) {
          console.error('⚠️ Nicht-JSON-Antwort vom Server:', text);
          throw new Error('Die Antwort des Servers ist kein gültiges JSON.');
        }
        
        return JSON.parse(text);
      } catch (err) {
        console.error('❌ Fehler beim Laden der Benutzerdaten:', err);
        throw err;
      }
    },
  });

  // Pakete abrufen
  const { data: packages, isLoading: isLoadingPackages, error: packagesError } = useQuery<Package[]>({ 
    queryKey: ["/api/superadmin/packages"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/superadmin/packages');
        
        const text = await res.text();
        
        if (!res.ok) {
          console.error(`Serverfehler ${res.status}:`, text);
          throw new Error(`Serverfehler: ${res.status}`);
        }
        
        const contentType = res.headers.get('content-type') || '';
        
        if (!contentType.includes('application/json')) {
          console.error('⚠️ Nicht-JSON-Antwort vom Server:', text);
          throw new Error('Die Antwort des Servers ist kein gültiges JSON.');
        }
        
        return JSON.parse(text);
      } catch (err) {
        console.error('❌ Fehler beim Laden der Paketdaten:', err);
        throw err;
      }
    },
  });
  
  // Fehlerbehandlung für Pakete
  useEffect(() => {
    if (packagesError) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Pakete",
        description: packagesError.message,
      });
    }
  }, [packagesError, toast]);

  // Mutation zum Aktivieren/Deaktivieren eines Benutzers
  const toggleActivationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/superadmin/users/${userId}/activate`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Aktivierungsstatus des Benutzers wurde geändert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Aktivierung konnte nicht geändert werden: ${error.message}`,
      });
    },
  });

  // Mutation zum Aktualisieren eines Benutzers
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: UserFormData }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/superadmin/users/${userId}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Benutzer aktualisiert",
        description: "Die Benutzerinformationen wurden erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Benutzer konnte nicht aktualisiert werden: ${error.message}`,
      });
    },
  });

  // Mutation zum Löschen eines Benutzers
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/superadmin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: `Benutzer konnte nicht gelöscht werden: ${error.message}`,
      });
    },
  });

  // State für das Bearbeitungsformular
  const [editForm, setEditForm] = useState<UserFormData>({});

  // Benutzer zur Bearbeitung auswählen
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      isAdmin: user.isAdmin,
      packageId: user.packageId,
      shopId: user.shopId,
      email: user.email,
      companyName: user.companyName,
      companyAddress: user.companyAddress,
      companyVatNumber: user.companyVatNumber,
      companyPhone: user.companyPhone,
      companyEmail: user.companyEmail,
    });
    setIsEditDialogOpen(true);
  };

  // Benutzerdaten aktualisieren
  const handleUpdateUser = () => {
    if (selectedUser) {
      updateUserMutation.mutate({ userId: selectedUser.id, data: editForm });
    }
  };

  // Benutzer löschen
  const handleDeleteUser = (userId: number) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Fehlerbehandlung mit useEffect anstatt im Render-Flow
  useEffect(() => {
    if (usersError) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Benutzer",
        description: usersError.message,
      });
    }
  }, [usersError, toast]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benutzerverwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Benutzer der Plattform</p>
        </div>
      </div>
      
      {isLoadingUsers ? (
        <Skeleton className="w-full h-96" />
      ) : users ? (
        <Card>
          <CardHeader>
            <CardTitle>Alle Benutzer</CardTitle>
            <CardDescription>Insgesamt {users.length} Benutzer im System</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.shopId || '-'}</TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                            <BadgeCheck className="h-3 w-3 mr-1" /> Aktiv
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
                            <BadgeX className="h-3 w-3 mr-1" /> Inaktiv
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="secondary">
                            <UserCog className="h-3 w-3 mr-1" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <CircleUserRound className="h-3 w-3 mr-1" /> Benutzer
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.packageId ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            <Package className="h-3 w-3 mr-1" />
                            {packages?.find(p => p.id === user.packageId)?.name || `Paket ${user.packageId}`}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                            Kein Paket
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isActive ? "outline" : "default"}
                            onClick={() => toggleActivationMutation.mutate(user.id)}
                          >
                            {user.isActive ? (
                              <>
                                <BadgeX className="h-3 w-3 mr-1" /> Deaktivieren
                              </>
                            ) : (
                              <>
                                <BadgeCheck className="h-3 w-3 mr-1" /> Aktivieren
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Löschen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p>Keine Benutzerdaten verfügbar</p>
      )}
      
      {/* Benutzer-Bearbeitungsdialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen für {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="settings" className="w-full mt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
              <TabsTrigger value="company">Unternehmensdaten</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">E-Mail</Label>
                  <Input
                    id="email"
                    className="col-span-3"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="E-Mail-Adresse"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Shop ID</Label>
                  <Input
                    id="shopId"
                    className="col-span-3"
                    type="number"
                    value={editForm.shopId?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, shopId: parseInt(e.target.value) || null })}
                    placeholder="Shop ID"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Passwort zurücksetzen</Label>
                  <div className="col-span-3">
                    <Input
                      id="password"
                      type="password"
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Neues Passwort (leer lassen, um nicht zu ändern)"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Administrator</Label>
                  <div className="col-span-3 flex items-center">
                    <Switch
                      checked={!!editForm.isAdmin}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, isAdmin: checked })}
                    />
                    <span className="ml-2">
                      {editForm.isAdmin ? 'Administrator-Rechte aktiviert' : 'Keine Administrator-Rechte'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Paket</Label>
                  <div className="col-span-3">
                    <Select
                      value={editForm.packageId?.toString() || ''}
                      onValueChange={(value) => 
                        setEditForm({ ...editForm, packageId: value ? parseInt(value) : null })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wählen Sie ein Paket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Kein Paket</SelectItem>
                        {packages?.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id.toString()}>
                            {pkg.name} ({pkg.priceMonthly.toFixed(2)} €/Monat)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="company" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Firmenname</Label>
                  <Input
                    id="companyName"
                    className="col-span-3"
                    value={editForm.companyName || ''}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    placeholder="Firmenname"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Adresse</Label>
                  <Input
                    id="companyAddress"
                    className="col-span-3"
                    value={editForm.companyAddress || ''}
                    onChange={(e) => setEditForm({ ...editForm, companyAddress: e.target.value })}
                    placeholder="Firmenadresse"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">USt-IdNr.</Label>
                  <Input
                    id="companyVatNumber"
                    className="col-span-3"
                    value={editForm.companyVatNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, companyVatNumber: e.target.value })}
                    placeholder="USt-IdNr."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Telefon</Label>
                  <Input
                    id="companyPhone"
                    className="col-span-3"
                    value={editForm.companyPhone || ''}
                    onChange={(e) => setEditForm({ ...editForm, companyPhone: e.target.value })}
                    placeholder="Firmentelefon"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">E-Mail</Label>
                  <Input
                    id="companyEmail"
                    className="col-span-3"
                    value={editForm.companyEmail || ''}
                    onChange={(e) => setEditForm({ ...editForm, companyEmail: e.target.value })}
                    placeholder="Firmen-E-Mail"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateUser}>
              Aktualisieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
