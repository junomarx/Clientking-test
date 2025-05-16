import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { UserDetailsDialog } from './UserDetailsDialog';
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
  Store,
  Search,
  Info
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
  ownerFirstName?: string;
  ownerLastName?: string;
  streetAddress?: string;
  zipCode?: string;
  city?: string;
  country?: string;
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
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Benutzer abrufen
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<User[]>({ 
    queryKey: ["/api/superadmin/users"],
  });
  
  // Benutzer filtern und sortieren
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    // Filtere nach Suchbegriff
    const filtered = searchQuery 
      ? users.filter(user => 
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.companyName && user.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          user.id.toString().includes(searchQuery))
      : users;
    
    // Sortiere alphabetisch nach Benutzernamen
    return [...filtered].sort((a, b) => a.username.localeCompare(b.username));
  }, [users, searchQuery]);

  // Pakete abrufen
  const { data: packages, isLoading: isLoadingPackages } = useQuery<Package[]>({ 
    queryKey: ["/api/superadmin/packages"],
  });

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
      // 1. Benutzer-Stammdaten aktualisieren
      const response = await apiRequest(
        "PATCH",
        `/api/superadmin/users/${userId}`,
        {
          email: data.email,
          isAdmin: data.isAdmin,
          packageId: data.packageId,
          shopId: data.shopId,
          companyName: data.companyName,
          companyAddress: data.companyAddress,
          companyVatNumber: data.companyVatNumber,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          password: data.password,
        }
      );
      const updatedUser = await response.json();
      
      // 2. Geschäftseinstellungen aktualisieren, sofern zusätzliche Daten vorhanden sind
      if (data.ownerFirstName || data.ownerLastName || data.streetAddress || 
          data.zipCode || data.city || data.country) {
        
        try {
          // Nur die Geschäftseinstellungs-relevanten Felder senden
          const businessSettings = {
            ownerFirstName: data.ownerFirstName,
            ownerLastName: data.ownerLastName,
            streetAddress: data.streetAddress || data.companyAddress,
            zipCode: data.zipCode,
            city: data.city,
            country: data.country,
            businessName: data.companyName,
            email: data.companyEmail,
            phone: data.companyPhone,
            vatNumber: data.companyVatNumber,
          };
          
          const businessSettingsResponse = await apiRequest(
            "PATCH",
            `/api/superadmin/user-business-settings/${userId}`,
            businessSettings
          );
          
          if (!businessSettingsResponse.ok) {
            console.warn("Benutzer konnte aktualisiert werden, aber die Geschäftseinstellungen nicht.", 
                        await businessSettingsResponse.text());
          }
        } catch (error) {
          console.error("Fehler beim Aktualisieren der Geschäftseinstellungen:", error);
          // Hauptoperation war erfolgreich, also keine Exception werfen
        }
      }
      
      return updatedUser;
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
    
    // Geschäftseinstellungen für diesen Benutzer abrufen
    const fetchUserBusinessSettings = async (userId: number) => {
      try {
        const response = await fetch(`/api/superadmin/user-business-settings/${userId}`);
        if (response.ok) {
          const businessSettings = await response.json();
          console.log("Business settings geladen:", businessSettings);
          
          // Formular mit Benutzerdaten und Geschäftseinstellungen füllen
          setEditForm({
            isAdmin: user.isAdmin,
            packageId: user.packageId,
            shopId: user.shopId,
            email: user.email,
            companyName: user.companyName || businessSettings?.businessName,
            companyAddress: user.companyAddress || businessSettings?.streetAddress,
            companyVatNumber: user.companyVatNumber || businessSettings?.vatNumber,
            companyPhone: user.companyPhone || businessSettings?.phone,
            companyEmail: user.companyEmail || businessSettings?.email,
            
            // Zusätzliche Felder aus den Geschäftseinstellungen
            ownerFirstName: businessSettings?.ownerFirstName,
            ownerLastName: businessSettings?.ownerLastName,
            streetAddress: businessSettings?.streetAddress,
            zipCode: businessSettings?.zipCode,
            city: businessSettings?.city,
            country: businessSettings?.country,
          });
        } else {
          // Kein Fehler, nur Formular mit Benutzerdaten füllen
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
        }
      } catch (error) {
        console.error("Fehler beim Abrufen der Geschäftseinstellungen:", error);
        
        // Im Fehlerfall nur Benutzerdaten anzeigen
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
      }
    };
    
    fetchUserBusinessSettings(user.id);
    setIsEditDialogOpen(true);
  };
  
  // Benutzerdetails anzeigen
  const handleShowUserDetails = (userId: number) => {
    setSelectedUserId(userId);
    setIsDetailsDialogOpen(true);
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

  if (usersError) {
    toast({
      variant: "destructive",
      title: "Fehler beim Laden der Benutzer",
      description: usersError.message,
    });
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Benutzerverwaltung</h1>
        <p className="text-sm md:text-base text-muted-foreground">Verwalten Sie alle Benutzer der Plattform</p>
      </div>
      
      {isLoadingUsers ? (
        <Skeleton className="w-full h-96" />
      ) : users ? (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Alle Benutzer</CardTitle>
              <CardDescription>
                {searchQuery 
                  ? `${filteredUsers.length} von ${users.length} Benutzern gefunden` 
                  : `Insgesamt ${users.length} Benutzer im System`}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Input
                type="text"
                placeholder="Suche nach Name, Firma..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table className="w-[900px] md:w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">ID</TableHead>
                    <TableHead>Benutzername</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead className="w-10">Shop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
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
                        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowUserDetails(user.id)}
                            className="w-full sm:w-auto"
                          >
                            <Info className="h-3 w-3 mr-1" /> Details
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            className="w-full sm:w-auto"
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
            <TabsList className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-0">
              <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              <TabsTrigger value="permissions">Berechtigungen</TabsTrigger>
              <TabsTrigger value="company">Unternehmensdaten</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label className="sm:text-right">E-Mail</Label>
                  <Input
                    id="email"
                    className="col-span-1 sm:col-span-3"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="E-Mail-Adresse"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label className="sm:text-right">Shop ID</Label>
                  <Input
                    id="shopId"
                    className="col-span-1 sm:col-span-3"
                    type="number"
                    value={editForm.shopId?.toString() || ''}
                    onChange={(e) => setEditForm({ ...editForm, shopId: parseInt(e.target.value) || null })}
                    placeholder="Shop ID"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                  <Label className="sm:text-right">Passwort zurücksetzen</Label>
                  <div className="col-span-1 sm:col-span-3">
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
                      value={editForm.packageId?.toString() || 'null'}
                      onValueChange={(value) => 
                        setEditForm({ ...editForm, packageId: (value && value !== "null") ? parseInt(value) : null })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wählen Sie ein Paket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Kein Paket</SelectItem>
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
                {/* Persönliche Daten des Eigentümers */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Inhaber-Daten</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Vorname</Label>
                      <Input
                        id="ownerFirstName"
                        className="col-span-3"
                        value={editForm.ownerFirstName || ''}
                        onChange={(e) => setEditForm({ ...editForm, ownerFirstName: e.target.value })}
                        placeholder="Vorname des Inhabers"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Nachname</Label>
                      <Input
                        id="ownerLastName"
                        className="col-span-3"
                        value={editForm.ownerLastName || ''}
                        onChange={(e) => setEditForm({ ...editForm, ownerLastName: e.target.value })}
                        placeholder="Nachname des Inhabers"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Firmeninformationen */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Firmeninformationen</h3>
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
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">USt-IdNr.</Label>
                    <Input
                      id="companyVatNumber"
                      className="col-span-3"
                      value={editForm.companyVatNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, companyVatNumber: e.target.value })}
                      placeholder="USt-IdNr."
                    />
                  </div>
                </div>
                
                {/* Adressinformationen */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="font-medium mb-3">Adressinformationen</h3>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Straße & Nr.</Label>
                    <Input
                      id="streetAddress"
                      className="col-span-3"
                      value={editForm.streetAddress || editForm.companyAddress || ''}
                      onChange={(e) => setEditForm({ ...editForm, streetAddress: e.target.value })}
                      placeholder="Straße und Hausnummer"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">PLZ</Label>
                      <Input
                        id="zipCode"
                        className="col-span-3"
                        value={editForm.zipCode || ''}
                        onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                        placeholder="Postleitzahl"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Ort</Label>
                      <Input
                        id="city"
                        className="col-span-3"
                        value={editForm.city || ''}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="Ort"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
                    <Label className="text-right">Land</Label>
                    <Input
                      id="country"
                      className="col-span-3"
                      value={editForm.country || 'Österreich'}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      placeholder="Land"
                    />
                  </div>
                </div>
                
                {/* Kontaktinformationen */}
                <div>
                  <h3 className="font-medium mb-3">Kontaktinformationen</h3>
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
                  <div className="grid grid-cols-4 items-center gap-4 mt-4">
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

      {/* Benutzerdetails Dialog */}
      <UserDetailsDialog 
        open={isDetailsDialogOpen} 
        onOpenChange={setIsDetailsDialogOpen} 
        userId={selectedUserId}
        onEdit={(user) => {
          setIsDetailsDialogOpen(false);
          handleEditUser(user);
        }}
        onActivate={(userId) => toggleActivationMutation.mutate(userId)}
      />
    </div>
  );
}
