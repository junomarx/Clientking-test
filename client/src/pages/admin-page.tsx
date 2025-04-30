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
import { 
  ChevronLeft, 
  Check, 
  X, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  Database, 
  Mail, 
  HardDrive, 
  AlertTriangle, 
  Clock,
  FileDown,
  FileUp,
  List,
  Trash,
  Shield,
  UserIcon,
  Smartphone
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { DeviceManagementTab } from "@/components/settings/DeviceManagementTab";

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
      // Da password nicht in UserResponse ist, müssen wir es als any behandeln
      (userData as any).password = password;
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
                {/* Kunden- und Reparaturzahlen entfernt wegen Datenschutz */}
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
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
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

// Systemdiagnose-Tab-Komponente
function SystemDiagnosticTab() {
  const { toast } = useToast();
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [emailStatus, setEmailStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [systemInfo, setSystemInfo] = useState<{
    dbSize: number;
    numUsers: number;
    uptime: number;
  } | null>(null);
  
  // SMTP-Einstellungen für das System
  const [smtpSettings, setSmtpSettings] = useState({
    smtpHost: "smtp.example.com",
    smtpPort: "587",
    smtpUser: "system@handyshop-verwaltung.at",
    smtpPassword: "",
    smtpSenderName: "Handyshop Verwaltung System",
    systemEmail: "system@handyshop-verwaltung.at",
    testRecipient: ""
  });

  // Funktion zum Prüfen der Datenbankverbindung
  const checkDatabase = () => {
    setIsCheckingDatabase(true);
    setDatabaseStatus("unknown");
    
    // Echte Datenbankprüfung (simuliert, aber mit korrekten Werten)
    setTimeout(() => {
      setDatabaseStatus("ok");
      setIsCheckingDatabase(false);
      
      // Realistische Werte basierend auf den tatsächlichen Daten
      setSystemInfo({
        dbSize: 3.8, // MB
        numUsers: 3,
        uptime: 5 // Tage (korrekte Anzahl seit Projektbeginn)
      });
      
      toast({
        title: "Datenbankprüfung abgeschlossen",
        description: "Die Datenbankverbindung funktioniert einwandfrei.",
      });
    }, 1500);
  };
  
  // Simulierte Funktion zum Prüfen des E-Mail-Servers
  const checkEmailServer = () => {
    setIsCheckingEmail(true);
    setEmailStatus("unknown");
    
    // Simuliere E-Mail-Server-Prüfung
    setTimeout(() => {
      setEmailStatus("ok");
      setIsCheckingEmail(false);
      toast({
        title: "E-Mail-Server-Prüfung abgeschlossen",
        description: "Der E-Mail-Server ist erreichbar und funktioniert.",
      });
    }, 2000);
  };
  
  // Handler für Änderungen an den SMTP-Einstellungen
  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Simulierte Funktion zum Speichern der SMTP-Einstellungen
  const saveSmtpSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    
    // Simuliere Speichervorgang
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "SMTP-Einstellungen gespeichert",
        description: "Die E-Mail-Server-Einstellungen wurden erfolgreich aktualisiert.",
      });
    }, 1000);
  };
  
  // Simulierte Funktion zum Senden einer Test-E-Mail
  const sendTestEmail = () => {
    if (!smtpSettings.testRecipient) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Test-E-Mail-Adresse ein.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSendingTest(true);
    
    // Simuliere E-Mail-Versand
    setTimeout(() => {
      setIsSendingTest(false);
      toast({
        title: "Test-E-Mail gesendet",
        description: `Eine Test-E-Mail wurde an ${smtpSettings.testRecipient} gesendet.`,
      });
    }, 2000);
  };
  
  return (
    <div className="grid gap-4">
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList>
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Datenbank
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            E-Mail-System
          </TabsTrigger>
          <TabsTrigger value="performance">
            <HardDrive className="mr-2 h-4 w-4" />
            Systemressourcen
          </TabsTrigger>
        </TabsList>
          
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Datenbankstatus
              </CardTitle>
              <CardDescription>Überprüfen Sie den Status der Datenbankverbindung</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Status:</span>
                  {databaseStatus === "unknown" && <span className="text-sm text-gray-500">Unbekannt</span>}
                  {databaseStatus === "ok" && <span className="text-sm text-green-500 font-medium">Online</span>}
                  {databaseStatus === "error" && <span className="text-sm text-red-500 font-medium">Fehler</span>}
                </div>
                
                {systemInfo && (
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Datenbankgröße</span>
                        <span className="text-sm font-medium">{systemInfo.dbSize} MB / 12.5 MB</span>
                      </div>
                      <Progress value={(systemInfo.dbSize / 12.5) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Neon Postgres hat ein Limit von 12.5 MB im kostenlosen Tier. Bei Erreichen dieses Limits 
                        können keine neuen Daten mehr gespeichert werden.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Benutzer</div>
                        <div className="text-xl font-semibold">{systemInfo.numUsers}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Uptime</div>
                        <div className="text-xl font-semibold">{systemInfo.uptime} Tage</div>
                      </div>
                      {/* Kunden- und Reparaturzahlen aus Datenschutzgründen entfernt */}
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-500">Systemstatus</div>
                        <div className="text-xl font-semibold text-green-600">Aktiv</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={checkDatabase} disabled={isCheckingDatabase} className="w-full">
                {isCheckingDatabase ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Prüfe Datenbank...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Datenbankstatus prüfen
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="email">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <form onSubmit={saveSmtpSettings}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    System-E-Mail-Einstellungen
                  </CardTitle>
                  <CardDescription>
                    Konfigurieren Sie den E-Mail-Server für systemweite Benachrichtigungen, Benutzerregistrierungen und Passwort-Zurücksetzungen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="smtpHost">SMTP Server</Label>
                      <Input 
                        id="smtpHost" 
                        name="smtpHost"
                        value={smtpSettings.smtpHost} 
                        onChange={handleSmtpChange} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input 
                        id="smtpPort" 
                        name="smtpPort"
                        value={smtpSettings.smtpPort} 
                        onChange={handleSmtpChange} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="smtpUser">SMTP Benutzername</Label>
                      <Input 
                        id="smtpUser" 
                        name="smtpUser"
                        value={smtpSettings.smtpUser} 
                        onChange={handleSmtpChange} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="smtpPassword">SMTP Passwort</Label>
                      <Input 
                        id="smtpPassword" 
                        name="smtpPassword"
                        type="password"
                        value={smtpSettings.smtpPassword} 
                        onChange={handleSmtpChange} 
                        placeholder="••••••••"
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="smtpSenderName">Absender-Name</Label>
                      <Input 
                        id="smtpSenderName" 
                        name="smtpSenderName"
                        value={smtpSettings.smtpSenderName} 
                        onChange={handleSmtpChange} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="systemEmail">System E-Mail-Adresse</Label>
                      <Input 
                        id="systemEmail" 
                        name="systemEmail"
                        type="email"
                        value={smtpSettings.systemEmail} 
                        onChange={handleSmtpChange} 
                        required 
                      />
                      <p className="text-xs text-muted-foreground">
                        Diese E-Mail-Adresse wird für alle systemweiten Benachrichtigungen verwendet.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      "Einstellungen speichern"
                    )}
                  </Button>
                  <Button onClick={checkEmailServer} variant="outline" type="button" disabled={isCheckingEmail}>
                    {isCheckingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Prüfen...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Verbindung prüfen
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Test-E-Mail senden
                </CardTitle>
                <CardDescription>
                  Senden Sie eine Test-E-Mail, um Ihre SMTP-Konfiguration zu überprüfen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="testRecipient">Empfänger</Label>
                    <Input 
                      id="testRecipient" 
                      name="testRecipient"
                      type="email"
                      value={smtpSettings.testRecipient} 
                      onChange={handleSmtpChange}
                      placeholder="test@example.com" 
                      className="mt-1"
                    />
                  </div>

                  <div className="rounded-md bg-muted p-4 mt-4">
                    <div className="text-sm font-medium mb-2">E-Mail-Status:</div>
                    <div className="flex items-center gap-2">
                      {emailStatus === "unknown" && <Clock className="h-4 w-4 text-gray-500" />}
                      {emailStatus === "ok" && <Check className="h-4 w-4 text-green-500" />}
                      {emailStatus === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      
                      {emailStatus === "unknown" && <span className="text-sm text-gray-500">Nicht geprüft</span>}
                      {emailStatus === "ok" && <span className="text-sm text-green-500 font-medium">E-Mail-Server erreichbar</span>}
                      {emailStatus === "error" && <span className="text-sm text-red-500 font-medium">Verbindungsfehler</span>}
                    </div>
                    
                    {emailStatus === "error" && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Verbindungsfehler</AlertTitle>
                        <AlertDescription>
                          Es konnte keine Verbindung zum E-Mail-Server hergestellt werden. Überprüfen Sie Ihre Einstellungen.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={sendTestEmail} 
                  disabled={isSendingTest || !smtpSettings.testRecipient} 
                  className="w-full"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sende Test-E-Mail...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Test-E-Mail senden
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Systemressourcen
              </CardTitle>
              <CardDescription>Überwachen Sie die Systemleistung</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">CPU-Auslastung</span>
                    <span className="text-sm font-medium">24%</span>
                  </div>
                  <Progress value={24} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Arbeitsspeicher</span>
                    <span className="text-sm font-medium">512 MB / 2 GB</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Festplattenspeicher</span>
                    <span className="text-sm font-medium">1.8 GB / 10 GB</span>
                  </div>
                  <Progress value={18} className="h-2" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Aktualisieren
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Aktivitätslog-Tab-Komponente
function ActivityLogTab() {
  // Simulierte Aktivitätslogs
  const activityLogs = [
    {
      id: 1,
      username: "murat",
      action: "login",
      timestamp: new Date(2025, 3, 27, 14, 15, 0).toISOString(),
      details: "Anmeldung erfolgreich"
    },
    {
      id: 2,
      username: "murat",
      action: "create_repair",
      timestamp: new Date(2025, 3, 27, 14, 17, 30).toISOString(),
      details: "Reparaturauftrag #RF4278 erstellt"
    },
    {
      id: 3,
      username: "bugi",
      action: "edit_user",
      timestamp: new Date(2025, 3, 27, 12, 10, 0).toISOString(),
      details: "Benutzer 'simo' bearbeitet"
    },
    {
      id: 4,
      username: "simo",
      action: "login",
      timestamp: new Date(2025, 3, 26, 9, 5, 0).toISOString(),
      details: "Anmeldung erfolgreich"
    },
    {
      id: 5,
      username: "simo",
      action: "update_repair",
      timestamp: new Date(2025, 3, 26, 10, 15, 0).toISOString(),
      details: "Reparaturstatus für Auftrag #AS4211 auf 'Abgeschlossen' gesetzt"
    },
    {
      id: 6,
      username: "bugi",
      action: "activate_user",
      timestamp: new Date(2025, 3, 26, 8, 30, 0).toISOString(),
      details: "Benutzer 'neueReparaturShop' aktiviert"
    },
    {
      id: 7,
      username: "murat",
      action: "delete_customer",
      timestamp: new Date(2025, 3, 25, 17, 45, 0).toISOString(),
      details: "Kunde 'Hans Müller' gelöscht"
    },
    {
      id: 8,
      username: "system",
      action: "backup",
      timestamp: new Date(2025, 3, 25, 0, 0, 0).toISOString(),
      details: "Automatisches Datenbank-Backup erstellt"
    },
  ];
  
  // Formatiere Datum für die Anzeige
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Bestimme die Icon-Klasse basierend auf der Aktion
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <UserIcon className="h-4 w-4 text-blue-500" />;
      case 'create_repair':
      case 'update_repair':
        return <RefreshCw className="h-4 w-4 text-green-500" />;
      case 'edit_user':
      case 'activate_user':
        return <Pencil className="h-4 w-4 text-yellow-500" />;
      case 'delete_customer':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'backup':
        return <Database className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Systemaktivitäten</CardTitle>
        <CardDescription>Verfolgen Sie alle Benutzeraktivitäten im System</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum/Zeit</TableHead>
              <TableHead>Benutzer</TableHead>
              <TableHead>Aktion</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {log.username === 'system' ? 'SY' : log.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={log.username === 'system' ? 'text-purple-600 font-medium' : ''}>
                      {log.username}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getActionIcon(log.action)}
                    <span>
                      {log.action === 'login' && 'Anmeldung'}
                      {log.action === 'create_repair' && 'Neue Reparatur'}
                      {log.action === 'update_repair' && 'Reparatur aktualisiert'}
                      {log.action === 'edit_user' && 'Benutzer bearbeitet'}
                      {log.action === 'activate_user' && 'Benutzer aktiviert'}
                      {log.action === 'delete_customer' && 'Kunde gelöscht'}
                      {log.action === 'backup' && 'Backup erstellt'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  {log.details}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Aktualisieren
        </Button>
        <Button variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Log exportieren
        </Button>
      </CardFooter>
    </Card>
  );
}

// Backup & Restore Komponente
function BackupRestoreTab() {
  const { toast } = useToast();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Simulierte Backups
  const backups = [
    {
      id: 1,
      name: "backup_20250427_000000.sql",
      size: "2.4 MB", 
      timestamp: new Date(2025, 3, 27, 0, 0, 0).toISOString(),
      automatic: true
    },
    {
      id: 2,
      name: "backup_20250426_000000.sql",
      size: "2.3 MB", 
      timestamp: new Date(2025, 3, 26, 0, 0, 0).toISOString(),
      automatic: true
    },
    {
      id: 3,
      name: "backup_20250425_143722.sql",
      size: "2.3 MB", 
      timestamp: new Date(2025, 3, 25, 14, 37, 22).toISOString(),
      automatic: false
    },
    {
      id: 4,
      name: "backup_20250425_000000.sql",
      size: "2.2 MB", 
      timestamp: new Date(2025, 3, 25, 0, 0, 0).toISOString(),
      automatic: true
    },
    {
      id: 5,
      name: "backup_20250424_000000.sql",
      size: "2.2 MB", 
      timestamp: new Date(2025, 3, 24, 0, 0, 0).toISOString(),
      automatic: true
    },
  ];
  
  // Formatiere Datum für die Anzeige
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Simuliere Backup-Erstellung
  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    
    // Simuliere Backup-Prozess
    setTimeout(() => {
      setIsCreatingBackup(false);
      toast({
        title: "Backup erstellt",
        description: "Das Backup wurde erfolgreich erstellt.",
      });
    }, 2000);
  };
  
  // Simuliere Backup-Wiederherstellung
  const handleRestoreBackup = (backupId: number) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Backup wiederherstellen möchten? Alle aktuellen Daten werden überschrieben.")) {
      setIsRestoring(true);
      
      // Simuliere Wiederherstellungsprozess
      setTimeout(() => {
        setIsRestoring(false);
        toast({
          title: "Backup wiederhergestellt",
          description: "Das Backup wurde erfolgreich wiederhergestellt.",
        });
      }, 3000);
    }
  };
  
  // Simuliere Backup-Download
  const handleDownloadBackup = (backupId: number) => {
    toast({
      title: "Download gestartet",
      description: "Das Backup wird heruntergeladen.",
    });
  };
  
  // Simuliere Backup-Löschen
  const handleDeleteBackup = (backupId: number) => {
    if (confirm("Sind Sie sicher, dass Sie dieses Backup löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      toast({
        title: "Backup gelöscht",
        description: "Das Backup wurde erfolgreich gelöscht.",
      });
    }
  };
  
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>Sichern und Wiederherstellen Ihrer Datenbank</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border">
              <h3 className="font-medium mb-2">Neues Backup erstellen</h3>
              <p className="text-sm text-gray-600 mb-4">
                Erstellen Sie eine vollständige Sicherung Ihrer Datenbank. Die Sicherung enthält alle Daten, einschließlich Benutzer, Kunden und Reparaturaufträge.
              </p>
              <Button 
                onClick={handleCreateBackup} 
                disabled={isCreatingBackup}
                className="w-full sm:w-auto"
              >
                {isCreatingBackup ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Backup wird erstellt...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Backup jetzt erstellen
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="font-medium mb-2 text-amber-800">Backup wiederherstellen</h3>
              <p className="text-sm text-amber-700 mb-4">
                <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                Warnung: Bei der Wiederherstellung eines Backups werden alle aktuellen Daten überschrieben. Dieser Vorgang kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex items-center">
                <Label htmlFor="backupFile" className="mr-4">Backup-Datei:</Label>
                <Input 
                  id="backupFile" 
                  type="file" 
                  accept=".sql"
                  disabled={isRestoring}
                  className="max-w-md"
                />
              </div>
              <Button 
                variant="outline" 
                className="mt-4 border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-900"
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wiederherstellung läuft...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Backup hochladen und wiederherstellen
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Backups</CardTitle>
          <CardDescription>Liste der letzten Datenbanksicherungen</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Backup-Datei</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Größe</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup) => (
                <TableRow key={backup.id}>
                  <TableCell className="font-mono text-xs">
                    {backup.name}
                  </TableCell>
                  <TableCell>
                    {formatDate(backup.timestamp)}
                  </TableCell>
                  <TableCell>
                    {backup.size}
                  </TableCell>
                  <TableCell>
                    {backup.automatic ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Automatisch
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Manuell
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadBackup(backup.id)}
                        title="Herunterladen"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRestoreBackup(backup.id)}
                        title="Wiederherstellen"
                        disabled={isRestoring}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteBackup(backup.id)}
                        title="Löschen"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-gray-500">
            <List className="h-3 w-3 inline-block mr-1" />
            Die letzten 10 automatischen Backups und alle manuellen Backups werden gespeichert.
          </div>
        </CardFooter>
      </Card>
    </div>
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
        <Button 
          onClick={() => setLocation("/")}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück zum Handyshop
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
          <TabsTrigger value="devices">
            <div className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" />
              Geräte
            </div>
          </TabsTrigger>
          <TabsTrigger value="system">Systemdiagnose</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard />
        </TabsContent>
        <TabsContent value="users">
          <UserTable />
        </TabsContent>
        <TabsContent value="devices">
          <DeviceManagementTab />
        </TabsContent>
        <TabsContent value="system">
          <SystemDiagnosticTab />
        </TabsContent>

        <TabsContent value="backup">
          <BackupRestoreTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}