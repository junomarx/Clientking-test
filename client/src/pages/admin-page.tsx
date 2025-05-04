import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  Smartphone,
  ChevronDown,
  MoreVertical,
  Edit,
  Pencil,
  Trash2,
  Save,
  User2,
  FileText,
  FileCheck,
  Truck,
  BarChart3,
  Calendar,
  Download,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Cog,
  Layers,
  History,
  Palette,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeviceManagementTab } from "@/components/settings/DeviceManagementTab";
import { DeviceTypeSettings } from "@/components/settings/DeviceTypeSettings";
import { DeviceIssuesTab } from "@/components/settings/DeviceIssuesTab";
import { BrandSettings } from "@/components/settings/BrandSettings";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { FeatureOverridesTestPanel } from "@/components/admin/FeatureOverridesTestPanel";
import { PlanFeaturesManager } from "@/components/admin/PlanFeaturesManager";
import ToastTestDialog from "@/components/ToastTestDialog";
import { Feature, FeatureOverrides } from "@/lib/permissions";

type UserResponse = Omit<User, "password">;

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editPricingPlan, setEditPricingPlan] = useState<"basic" | "professional" | "enterprise">("basic");
  const [editFeatureOverrides, setEditFeatureOverrides] = useState<FeatureOverrides>({});
  const { toast } = useToast();
  
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }
      return await response.json() as UserResponse[];
    },
  });
  
  // Fehlerbehandlung mit useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Fehler beim Laden der Benutzer",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  const toggleActiveMutation = useMutation({
    mutationFn: async (user: UserResponse) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${user.id}/activate`, { isActive: !user.isActive });
      if (!response.ok) {
        throw new Error(`Failed to toggle user activation: ${response.statusText}`);
      }
      return await response.json() as UserResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Benutzer wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren des Benutzers",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const editUserMutation = useMutation({
    mutationFn: async (userData: { id: number; username: string; email: string; isAdmin: boolean; pricingPlan?: string; featureOverrides?: FeatureOverrides }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userData.id}`, userData);
      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.statusText}`);
      }
      return await response.json() as UserResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Benutzer wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Aktualisieren des Benutzers",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.statusText}`);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Benutzer gelöscht",
        description: "Der Benutzer wurde erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen des Benutzers",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleToggleActive = (user: UserResponse) => {
    toggleActiveMutation.mutate(user);
  };
  
  const handleEditUser = (user: UserResponse) => {
    setSelectedUser(user);
    setEditName(user.username);
    setEditEmail(user.email);
    setEditRole(user.isAdmin ? "admin" : "user");
    setEditPricingPlan((user.pricingPlan as "basic" | "professional" | "enterprise") || "basic");
    // Initialisiere Feature-Übersteuerungen
    setEditFeatureOverrides(user.featureOverrides as FeatureOverrides || {});
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteUser = (user: UserResponse, event?: React.MouseEvent) => {
    // Stop event propagation to prevent details dialog from opening
    if (event) {
      event.stopPropagation();
    }
    
    // Make sure details dialog is closed
    setIsDetailsDialogOpen(false);
    
    // Set selected user and open delete dialog
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  const submitEditUser = () => {
    if (!selectedUser) return;
    
    editUserMutation.mutate({
      id: selectedUser.id,
      username: editName,
      email: editEmail,
      isAdmin: editRole === "admin",
      pricingPlan: editPricingPlan,
      featureOverrides: editFeatureOverrides
    });
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  
  if (error) {
    return <Alert variant="destructive"><AlertDescription>Fehler beim Laden der Benutzer</AlertDescription></Alert>;
  }
  
  return (
    <div className="space-y-4">
      {/* Desktop-Ansicht - Tabelle (nur auf md und größer sichtbar) */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benutzer</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Preispaket</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.map((user) => (
              <TableRow 
                key={user.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  setSelectedUser(user);
                  setIsDetailsDialogOpen(true);
                }}
              >
                <TableCell className="font-medium flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{user.username}</span>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={user.isActive} 
                      onCheckedChange={() => handleToggleActive(user)}
                      disabled={toggleActiveMutation.isPending}
                    />
                    <Badge variant={user.isActive ? "success" : "destructive"}>
                      {user.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isAdmin ? "default" : "outline"}>
                    {user.isAdmin ? "Admin" : "Benutzer"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.pricingPlan === "enterprise" ? "default" : user.pricingPlan === "professional" ? "success" : "outline"}>
                    {user.pricingPlan === "enterprise" ? "Enterprise" : user.pricingPlan === "professional" ? "Professional" : "Basic"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Aktionen</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditUser(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteUser(user, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile-Ansicht - Kartendesign (nur auf kleinen Bildschirmen sichtbar) */}
      <div className="space-y-4 md:hidden">
        {users && users.map((user) => (
          <div 
            key={user.id} 
            className="bg-card rounded-lg border shadow-sm overflow-hidden cursor-pointer"
            onClick={() => {
              setSelectedUser(user);
              setIsDetailsDialogOpen(true);
            }}
          >
            <div className="p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username}</span>
                </div>
                <Badge variant={user.isActive ? "success" : "destructive"}>
                  {user.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">E-Mail:</p>
                  <p className="text-sm truncate">{user.email}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Rolle:</p>
                  <Badge variant={user.isAdmin ? "default" : "outline"} className="mt-1">
                    {user.isAdmin ? "Admin" : "Benutzer"}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">Preispaket:</p>
                <Badge variant={user.pricingPlan === "enterprise" ? "default" : user.pricingPlan === "professional" ? "success" : "outline"} className="mt-1">
                  {user.pricingPlan === "enterprise" ? "Enterprise" : user.pricingPlan === "professional" ? "Professional" : "Basic"}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t p-3 bg-muted/10">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status ändern:</span>
                <Switch 
                  checked={user.isActive} 
                  onCheckedChange={(e) => {
                    e.stopPropagation();
                    handleToggleActive(user);
                  }}
                  disabled={toggleActiveMutation.isPending}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditUser(user);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={(e) => handleDeleteUser(user, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Benutzerinformationen-Dialog */}
      <UserDetailsDialog 
        selectedUser={selectedUser} 
        isOpen={isDetailsDialogOpen} 
        onClose={() => setIsDetailsDialogOpen(false)} 
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />
      
      {/* Bearbeiten-Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Hier können Sie die Benutzerinformationen ändern.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Benutzername</Label>
              <Input 
                id="edit-username" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="Benutzername"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-Mail</Label>
              <Input 
                id="edit-email" 
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)} 
                placeholder="E-Mail"
                type="email"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Preispaket</Label>
              <Select 
                value={editPricingPlan} 
                onValueChange={(value) => setEditPricingPlan(value as "basic" | "professional" | "enterprise")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Preispaket auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Das Preispaket bestimmt, welche Features der Benutzer nutzen kann.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Rolle</Label>
              <RadioGroup value={editRole} onValueChange={(value) => setEditRole(value as "user" | "admin")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="user" id="role-user" />
                  <Label htmlFor="role-user">Benutzer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="role-admin" />
                  <Label htmlFor="role-admin">Administrator</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-red-500 font-medium mt-1">
                Vorsicht: Administrator-Berechtigungen sollten nur "bugi" als System-Administrator haben!
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={submitEditUser}
              disabled={editUserMutation.isPending}
            >
              {editUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Löschen-Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie diesen Benutzer wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {selectedUser && (
                  <>Benutzer <span className="font-bold">{selectedUser.username}</span> wird gelöscht.</>
                )}
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Abbrechen
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SystemDiagnosticTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Systemdiagnose</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Hier finden Sie wichtige Informationen über den Systemstatus.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Dateiintegritätsprüfung
          </h4>
          <p className="text-sm text-muted-foreground">Prüft, ob alle Systemdateien vorhanden und unverändert sind.</p>
          <Button className="w-full" variant="outline">Jetzt prüfen</Button>
        </Card>
        
        <Card className="p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            Sicherheitsscanner
          </h4>
          <p className="text-sm text-muted-foreground">Überprüft das System auf Sicherheitsprobleme.</p>
          <Button className="w-full" variant="outline">Jetzt scannen</Button>
        </Card>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Systemleistung</h4>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm">
              <span>CPU-Auslastung</span>
              <span>23%</span>
            </div>
            <Progress value={23} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Speichernutzung</span>
              <span>54%</span>
            </div>
            <Progress value={54} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>Festplattennutzung</span>
              <span>37%</span>
            </div>
            <Progress value={37} className="h-2" />
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">Cache-Management</h4>
        <p className="text-sm text-muted-foreground mb-2">
          In seltenen Fällen kann es hilfreich sein, den Cache zu leeren, um Probleme zu beheben.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline">Anwendungs-Cache leeren</Button>
          <Button variant="outline">Datenbank-Cache leeren</Button>
        </div>
      </div>
    </div>
  );
}

function ActivityLogTab() {
  const activityLogs = [
    { id: 1, username: "bugi", action: "Benutzer aktualisiert", details: "Benutzer 'testuser' wurde aktiviert", timestamp: new Date(2025, 4, 1, 14, 23) },
    { id: 2, username: "bugi", action: "Gerätedaten importiert", details: "157 neue Geräte hinzugefügt", timestamp: new Date(2025, 4, 1, 12, 15) },
    { id: 3, username: "support", action: "Backup erstellt", details: "Vollständiges Systembackup", timestamp: new Date(2025, 4, 1, 10, 30) },
    { id: 4, username: "bugi", action: "Einstellungen geändert", details: "E-Mail-Konfiguration aktualisiert", timestamp: new Date(2025, 3, 30, 16, 45) },
    { id: 5, username: "support", action: "Benutzer erstellt", details: "Neuer Benutzer 'handyshop7' hinzugefügt", timestamp: new Date(2025, 3, 30, 15, 12) },
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Aktivitätsprotokoll</h3>
      <p className="text-sm text-muted-foreground">
        Hier sehen Sie die letzten Aktionen im Administrationsbereich.
      </p>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benutzer</TableHead>
              <TableHead>Aktion</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Zeitstempel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.username}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.details}</TableCell>
                <TableCell>{log.timestamp.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile-Ansicht */}
      <div className="md:hidden space-y-4">
        {activityLogs.map((log) => (
          <div key={log.id} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/20 p-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{log.username}</span>
                </div>
                <Badge variant="outline">{log.action}</Badge>
              </div>
            </div>
            
            <div className="p-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{log.username}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="mr-1">⏰</span>
                    {log.timestamp.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm">{log.details}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupRestoreTab() {
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const { toast } = useToast();
  
  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/admin/backup");
      if (!response.ok) {
        throw new Error(`Failed to create backup: ${response.statusText}`);
      }
      return await response.blob();
    },
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `handyshop-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setBackupInProgress(false);
      toast({
        title: "Backup erstellt",
        description: "Das Backup wurde erfolgreich erstellt und heruntergeladen.",
      });
    },
    onError: (error: Error) => {
      setBackupInProgress(false);
      toast({
        title: "Fehler beim Erstellen des Backups",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const restoreMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("backupFile", file);
      
      const response = await fetch("/api/admin/restore", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to restore backup: ${response.statusText}`);
      }
      
      return true;
    },
    onSuccess: () => {
      setRestoreInProgress(false);
      setRestoreFile(null);
      toast({
        title: "Backup wiederhergestellt",
        description: "Das Backup wurde erfolgreich wiederhergestellt.",
      });
    },
    onError: (error: Error) => {
      setRestoreInProgress(false);
      toast({
        title: "Fehler bei der Wiederherstellung",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleBackup = () => {
    setBackupInProgress(true);
    backupMutation.mutate();
  };
  
  const handleRestore = () => {
    if (!restoreFile) {
      toast({
        title: "Keine Datei ausgewählt",
        description: "Bitte wählen Sie eine Backup-Datei aus.",
        variant: "destructive",
      });
      return;
    }
    
    setRestoreInProgress(true);
    restoreMutation.mutate(restoreFile);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Backup & Restore</h3>
        <p className="text-sm text-muted-foreground">
          Erstellen Sie regelmäßig Backups Ihrer Daten und stellen Sie sie bei Bedarf wieder her.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-500" />
            <h4 className="font-medium">Backup erstellen</h4>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Erstellt eine Sicherungskopie aller wichtigen Daten (Benutzer, Reparaturen, Kunden, Geräte, etc.)
          </p>
          
          <Button 
            onClick={handleBackup} 
            disabled={backupInProgress} 
            className="w-full"
          >
            {backupInProgress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Backup wird erstellt...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Backup jetzt erstellen
              </>
            )}
          </Button>
        </Card>
        
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-500" />
            <h4 className="font-medium">Backup wiederherstellen</h4>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Stellt ein zuvor erstelltes Backup wieder her. Vorhandene Daten werden überschrieben.
          </p>
          
          <div className="space-y-4">
            <Input 
              type="file" 
              accept=".json" 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setRestoreFile(e.target.files[0]);
                }
              }}
              disabled={restoreInProgress}
            />
            
            <Button 
              onClick={handleRestore} 
              disabled={!restoreFile || restoreInProgress} 
              variant="outline" 
              className="w-full"
            >
              {restoreInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wiederherstellung läuft...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Backup wiederherstellen
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
      
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-semibold">Warnung:</span> Bei der Wiederherstellung eines Backups werden alle aktuellen Daten überschrieben. Dieser Vorgang kann nicht rückgängig gemacht werden.
        </AlertDescription>
      </Alert>
      
      <div>
        <h4 className="font-medium mb-2">Backup-Zeitplan</h4>
        <p className="text-sm text-muted-foreground mb-4">
          In der Enterprise-Version können Sie automatische Backups einrichten.
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch id="weekly-backup" />
            <Label htmlFor="weekly-backup">Wöchentliches Backup</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch id="daily-backup" />
            <Label htmlFor="daily-backup">Tägliches Backup</Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard");
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      return await response.json() as AdminDashboardStats;
    },
  });
  
  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  
  if (error || !stats) {
    return <Alert variant="destructive"><AlertDescription>Fehler beim Laden der Dashboard-Daten</AlertDescription></Alert>;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Benutzer</p>
              <h3 className="text-2xl font-bold">{stats.users.total}</h3>
              <p className="text-xs text-muted-foreground">{stats.users.active} aktiv</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aufträge</p>
              <h3 className="text-2xl font-bold">{stats.repairs.totalOrders}</h3>
              <p className="text-xs text-muted-foreground">{stats.repairs.today} heute</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-full">
              <FileCheck className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Bearbeitung</p>
              <h3 className="text-2xl font-bold">{stats.repairs.inRepair}</h3>
              <p className="text-xs text-muted-foreground">{stats.repairs.readyForPickup} abholbereit</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Truck className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ausgelagert</p>
              <h3 className="text-2xl font-bold">{stats.repairs.outsourced}</h3>
              <p className="text-xs text-muted-foreground">zur Reparatur</p>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Benutzerstatistik</h3>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span>Aktive Benutzer</span>
                <span>{stats.users.active} / {stats.users.total}</span>
              </div>
              <Progress value={(stats.users.active / stats.users.total) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Inaktive Benutzer</span>
                <span>{stats.users.total - stats.users.active} / {stats.users.total}</span>
              </div>
              <Progress value={((stats.users.total - stats.users.active) / stats.users.total) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Administratoren</span>
                <span>{stats.users.admin} / {stats.users.total}</span>
              </div>
              <Progress value={(stats.users.admin / stats.users.total) * 100} className="h-2" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Auftragsstatistik</h3>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm">
                <span>In Bearbeitung</span>
                <span>{stats.repairs.inRepair} / {stats.repairs.totalOrders}</span>
              </div>
              <Progress value={(stats.repairs.inRepair / stats.repairs.totalOrders) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Abgeschlossen</span>
                <span>{stats.repairs.completed} / {stats.repairs.totalOrders}</span>
              </div>
              <Progress value={(stats.repairs.completed / stats.repairs.totalOrders) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Abholbereit</span>
                <span>{stats.repairs.readyForPickup} / {stats.repairs.totalOrders}</span>
              </div>
              <Progress value={(stats.repairs.readyForPickup / stats.repairs.totalOrders) * 100} className="h-2" />
            </div>
          </div>
        </Card>
      </div>
      
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Aktuelle Ereignisse</h3>
        <ActivityLogTab />
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  
  // Umleiten, wenn Benutzer kein Admin ist
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);
  
  // Wenn noch geladen wird oder der Benutzer kein Admin ist, nichts anzeigen
  if (isLoading || !user || !user.isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">
      {isLoading ? <Loader2 className="animate-spin h-8 w-8 text-blue-500" /> : null}
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop-Ansicht (nur auf md und größer sichtbar) */}
      <div className="hidden md:flex h-screen bg-gray-100">
        {/* Seitenleiste - Desktop */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white p-4 transition-all duration-300 ease-in-out flex flex-col`}>
          <div className="flex items-center mb-6">
            {sidebarCollapsed ? (
              <div className="mx-auto bg-blue-500 text-white rounded-md w-8 h-8 flex items-center justify-center">
                <span className="font-bold">A</span>
              </div>
            ) : (
              <h2 className="text-xl font-bold">Handyshop</h2>
            )}
          </div>
          
          <nav className="space-y-4">
            <div 
              className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "dashboard" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Dashboard</span>}
            </div>
            
            <div 
              className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "users" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
              onClick={() => setActiveTab("users")}
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Benutzer</span>}
            </div>
            
            <div 
              className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "planFeatures" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
              onClick={() => setActiveTab("planFeatures")}
            >
              <Layers className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Tarif-Features</span>}
            </div>
            
            {/* Geräte mit Unterkategorien */}
            <div className="space-y-1">
              <div 
                className={`flex items-center justify-between p-2 rounded-md hover:bg-gray-800 ${activeTab === "devices" || activeTab.startsWith("device") ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                onClick={() => {
                  if (sidebarCollapsed) {
                    setActiveTab("devices");
                  } else {
                    setDeviceMenuOpen(!deviceMenuOpen);
                  }
                }}
              >
                <div className="flex items-center">
                  <Smartphone className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="ml-3">Geräte</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${deviceMenuOpen ? 'rotate-90' : ''}`} />
                )}
              </div>
              
              {/* Unterkategorien für Geräte */}
              {(deviceMenuOpen && !sidebarCollapsed) && (
                <div className="ml-7 space-y-1 pl-2 border-l border-gray-700">
                  <div 
                    className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "devices" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                    onClick={() => setActiveTab("devices")}
                  >
                    <span className="text-sm">Übersicht</span>
                  </div>
                  <div 
                    className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "deviceTypes" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                    onClick={() => setActiveTab("deviceTypes")}
                  >
                    <span className="text-sm">Gerätetypen</span>
                  </div>
                  <div 
                    className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "deviceBrands" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                    onClick={() => setActiveTab("deviceBrands")}
                  >
                    <span className="text-sm">Hersteller</span>
                  </div>
                  <div 
                    className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "deviceIssues" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                    onClick={() => setActiveTab("deviceIssues")}
                  >
                    <span className="text-sm">Problemkatalog</span>
                  </div>
                  <div 
                    className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "deviceImport" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                    onClick={() => setActiveTab("deviceImport")}
                  >
                    <span className="text-sm">Importieren</span>
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "system" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
              onClick={() => setActiveTab("system")}
            >
              <Cog className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Systemdiagnose</span>}
            </div>
            
            <div 
              className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "backup" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
              onClick={() => setActiveTab("backup")}
            >
              <Save className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Backup & Restore</span>}
            </div>
            
            <div 
              className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "featureTest" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
              onClick={() => setActiveTab("featureTest")}
            >
              <Layers className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Feature-Tests</span>}
            </div>
            

            
            {/* Design Preview Menüpunkte wurden entfernt */}
            
            <Link href="/">
              <div className="flex items-center p-2 rounded-md hover:bg-gray-800 text-green-400 cursor-pointer mt-8">
                <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="ml-3">Zurück zum Shop</span>}
              </div>
            </Link>
          </nav>
        </div>
        
        {/* Toggle Button für die Seitenleiste */}
        <div 
          className={`fixed z-10 bg-gray-900 text-white rounded-full flex items-center justify-center w-6 h-6 cursor-pointer transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'left-14' : 'left-60'}`}
          style={{ top: '1.5rem' }} 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </div>
        
        {/* Hauptinhalt - Desktop */}
        <div className={`${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex-1 bg-white text-gray-800 w-full transition-all duration-300 ease-in-out h-screen overflow-y-auto p-4`}>
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Administrationsbereich</h1>
            <p className="text-muted-foreground text-sm">
              Verwalten Sie Benutzer und System-Einstellungen
            </p>
          </div>
          
          <div className="bg-white rounded-md p-4 mb-6">
            {activeTab === "dashboard" && <AdminDashboard />}
            {activeTab === "users" && <UserTable />}
            {activeTab === "planFeatures" && <PlanFeaturesManager />}
            {activeTab === "devices" && <DeviceManagementTab />}
            {activeTab === "deviceTypes" && <DeviceTypeSettings />}
            {activeTab === "deviceBrands" && <BrandSettings />}
            {activeTab === "deviceIssues" && <DeviceIssuesTab />}
            {activeTab === "deviceImport" && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Gerätedaten importieren</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hier können Sie Gerätedaten (Typen, Hersteller, Modelle) importieren.
                  </p>
                  <input type="file" accept=".json" className="w-full" />
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" /> Importieren
                  </Button>
                </div>
              </div>
            )}
            {activeTab === "system" && <SystemDiagnosticTab />}
            {activeTab === "backup" && <BackupRestoreTab />}
            {activeTab === "featureTest" && <FeatureOverridesTestPanel />}
          </div>
        </div>
      </div>
      
      {/* Mobile-Ansicht (unverändert) */}
      <div className="md:hidden w-full">
        <div className="container mx-auto py-4 px-4">
          <div className="flex flex-col mb-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold">Administrationsbereich</h1>
              <p className="text-muted-foreground text-sm">
                Verwalten Sie Benutzer und System-Einstellungen
              </p>
            </div>
            
            <Button 
              onClick={() => setLocation("/")}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full mb-4"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück zum Handyshop
            </Button>

            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant={activeTab === "dashboard" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "dashboard" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
              </Button>
              
              <Button 
                variant={activeTab === "users" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "users" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("users")}
              >
                <Users className="h-4 w-4 mr-2" /> Benutzer
              </Button>
              
              <Button 
                variant={activeTab === "planFeatures" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "planFeatures" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("planFeatures")}
              >
                <Layers className="h-4 w-4 mr-2" /> Tarif-Features
              </Button>
              
              <Button 
                variant={activeTab === "devices" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "devices" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("devices")}
              >
                <Smartphone className="h-4 w-4 mr-2" /> Geräte
              </Button>
              
              <Button 
                variant={activeTab === "system" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "system" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("system")}
              >
                <Cog className="h-4 w-4 mr-2" /> Systemdiagnose
              </Button>
              
              <Button 
                variant={activeTab === "backup" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "backup" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("backup")}
              >
                <Save className="h-4 w-4 mr-2" /> Backup & Restore
              </Button>
              
              <Button 
                variant={activeTab === "featureTest" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "featureTest" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("featureTest")}
              >
                <Layers className="h-4 w-4 mr-2" /> Feature-Tests
              </Button>

              {/* Design-Preview Buttons wurden entfernt */}
              

            </div>
          </div>
          
          <div className="bg-white rounded-md shadow-sm p-4 mb-6">
            {activeTab === "dashboard" && <AdminDashboard />}
            {activeTab === "users" && <UserTable />}
            {activeTab === "planFeatures" && <PlanFeaturesManager />}
            {activeTab === "devices" && <DeviceManagementTab />}
            {activeTab === "deviceTypes" && <DeviceTypeSettings />}
            {activeTab === "deviceBrands" && <BrandSettings />}
            {activeTab === "deviceIssues" && <DeviceIssuesTab />}
            {activeTab === "deviceImport" && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Gerätedaten importieren</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hier können Sie Gerätedaten (Typen, Hersteller, Modelle) importieren.
                  </p>
                  <input type="file" accept=".json" className="w-full" />
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" /> Importieren
                  </Button>
                </div>
              </div>
            )}
            {activeTab === "system" && <SystemDiagnosticTab />}
            {activeTab === "backup" && <BackupRestoreTab />}
            {activeTab === "featureTest" && <FeatureOverridesTestPanel />}
          </div>
        </div>
      </div>
      
      <ToastTestDialog />
    </div>
  );
}