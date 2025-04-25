import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Check, X, MoreVertical, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

// Typendefinition für User ohne Passwort
type UserResponse = Omit<User, "password">;

// Dashboard-Statistiken Typ
type AdminDashboardStats = {
  users: {
    total: number;
    pending: number;
    active: number;
    admin: number;
  };
  repairs: {
    totalOrders: number;
    inRepair: number;
    completed: number;
    today: number;
    readyForPickup: number;
    outsourced: number;
  };
};

function UserTable() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Benutzer abrufen
  const { data: users, isLoading, error } = useQuery<UserResponse[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });
  
  // Mutation zum Aktivieren/Deaktivieren von Benutzern
  const activateUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/activate`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Benutzerstatus wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Konnte Benutzer nicht aktualisieren: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation zum Löschen von Benutzern
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Konnte Benutzer nicht löschen: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation zum Bearbeiten von Benutzern
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: Partial<UserResponse> }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, userData);
      return res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Benutzer wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: `Konnte Benutzer nicht aktualisieren: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  const handleToggleActive = (user: UserResponse) => {
    if (user.isAdmin) {
      toast({
        title: "Nicht möglich",
        description: "Administratoren können nicht deaktiviert werden.",
        variant: "destructive",
      });
      return;
    }
    
    activateUserMutation.mutate({ id: user.id, isActive: !user.isActive });
  };
  
  const handleEditUser = (user: UserResponse) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteUser = (user: UserResponse) => {
    if (user.isAdmin) {
      toast({
        title: "Nicht möglich",
        description: "Administratoren können nicht gelöscht werden.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Sind Sie sicher, dass Sie den Benutzer "${user.username}" löschen möchten?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };
  
  const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    const formData = new FormData(e.currentTarget);
    const userData: Partial<UserResponse> = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      companyName: formData.get("companyName") as string,
      companyAddress: formData.get("companyAddress") as string || undefined,
      companyVatNumber: formData.get("companyVatNumber") as string || undefined,
      companyPhone: formData.get("companyPhone") as string || undefined,
      companyEmail: formData.get("companyEmail") as string || undefined,
    };
    
    // Neues Passwort, falls angegeben
    const password = formData.get("password") as string;
    if (password) {
      userData.password = password;
    }
    
    // isAdmin, falls Checkbox vorhanden und angehakt
    const adminCheckbox = formData.get("isAdmin");
    if (adminCheckbox !== null) {
      userData.isAdmin = adminCheckbox === "on";
    }
    
    updateUserMutation.mutate({ id: selectedUser.id, userData });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Fehler beim Laden der Benutzer</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Benutzerverwaltung</CardTitle>
          <CardDescription>Hier können Sie alle Benutzer im System verwalten.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Liste aller Benutzer im System</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Benutzer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Aktiv</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
                        Wartet auf Freischaltung
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Badge className="bg-blue-500 hover:bg-blue-600">
                        Administrator
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        Benutzer
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.companyName || "-"}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={user.isActive} 
                      disabled={user.isAdmin || activateUserMutation.isPending}
                      onCheckedChange={() => handleToggleActive(user)} 
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.isAdmin}
                          className={user.isAdmin ? "text-muted-foreground" : "text-red-600 focus:text-red-600"}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Keine Benutzer gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Bearbeitungsdialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Aktualisieren Sie die Informationen für {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={selectedUser?.username}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={selectedUser?.email}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Neues Passwort (leer lassen, um nicht zu ändern)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Neues Passwort"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  defaultValue={selectedUser?.companyName || ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyAddress">Adresse</Label>
                <Textarea
                  id="companyAddress"
                  name="companyAddress"
                  defaultValue={selectedUser?.companyAddress || ""}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="companyVatNumber">USt-IdNr.</Label>
                  <Input
                    id="companyVatNumber"
                    name="companyVatNumber"
                    defaultValue={selectedUser?.companyVatNumber || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyPhone">Telefon</Label>
                  <Input
                    id="companyPhone"
                    name="companyPhone"
                    defaultValue={selectedUser?.companyPhone || ""}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyEmail">Geschäfts-E-Mail</Label>
                <Input
                  id="companyEmail"
                  name="companyEmail"
                  type="email"
                  defaultValue={selectedUser?.companyEmail || ""}
                />
              </div>
              
              {/* Admin-Checkbox nur für bugi anzeigen */}
              {window.localStorage.getItem('username') === 'bugi' && (
                <div className="flex items-center space-x-2">
                  <input
                    id="isAdmin"
                    name="isAdmin"
                    type="checkbox"
                    defaultChecked={selectedUser?.isAdmin}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="isAdmin">Administrator</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminDashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/dashboard");
      return res.json();
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !stats) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Fehler beim Laden der Statistiken</AlertTitle>
        <AlertDescription>{error?.message || "Unbekannter Fehler"}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Benutzer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.users.total}</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-yellow-400 mr-2"></div>
              <span className="text-muted-foreground">Wartend: {stats.users.pending}</span>
            </div>
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span className="text-muted-foreground">Aktiv: {stats.users.active}</span>
            </div>
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-muted-foreground">Admins: {stats.users.admin}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Reparaturen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.repairs.totalOrders}</div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-muted-foreground">In Arbeit: {stats.repairs.inRepair}</span>
            </div>
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span className="text-muted-foreground">Abgeschlossen: {stats.repairs.completed}</span>
            </div>
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-orange-500 mr-2"></div>
              <span className="text-muted-foreground">Abholung: {stats.repairs.readyForPickup}</span>
            </div>
            <div className="flex items-center">
              <div className="flex h-2 w-2 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-muted-foreground">Außer Haus: {stats.repairs.outsourced}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Heute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.repairs.today}</div>
          <p className="text-sm text-muted-foreground mt-4">
            Neue Reparaturaufträge, die heute angelegt wurden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    // Überprüfe, ob der Benutzer ein Administrator ist
    if (!isLoading && user && !user.isAdmin) {
      toast({
        title: "Zugriff verweigert",
        description: "Sie benötigen Administratorrechte für diese Seite.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, isLoading, setLocation, toast]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!user || !user.isAdmin) {
    return null; // Wird durch useEffect umgeleitet
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administrationsbereich</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Benutzer und System-Einstellungen
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/")} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Zurück zur Anwendung
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard />
        </TabsContent>
        <TabsContent value="users">
          <UserTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}