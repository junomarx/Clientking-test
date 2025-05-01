import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight,
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
  FileDown,
  FileUp,
  Trash,
  Shield,
  UserIcon,
  Smartphone,
  Users,
  Save,
  Cog,
  LayoutDashboard,
  Menu,
  Layers,
  AlertCircle,
  Download
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { DeviceManagementTab } from "@/components/settings/DeviceManagementTab";
import { DeviceTypeSettings } from "@/components/settings/DeviceTypeSettings";
import { DeviceIssuesTab } from "@/components/settings/DeviceIssuesTab";
import ToastTestDialog from "@/components/ToastTestDialog";

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
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editPricingPlan, setEditPricingPlan] = useState<"basic" | "professional" | "enterprise">("basic");
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
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Laden der Benutzer",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
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
    mutationFn: async (userData: { id: number; username: string; email: string; isAdmin: boolean; pricingPlan?: string }) => {
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
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteUser = (user: UserResponse) => {
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
      pricingPlan: editPricingPlan
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Benutzer</TableHead>
              <TableHead className="hidden md:table-cell">E-Mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead className="hidden md:table-cell">Preispaket</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user.username}</span>
                  <span className="md:hidden">{user.username.substring(0, 6)}{user.username.length > 6 ? '...' : ''}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{user.email}</TableCell>
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
                <TableCell className="hidden md:table-cell">
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
                        onClick={() => handleDeleteUser(user)}
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
      
      {/* Benutzer bearbeiten Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Benutzername</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Rolle</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="user-role"
                    name="role"
                    value="user"
                    checked={editRole === "user"}
                    onChange={() => setEditRole("user")}
                    className="h-4 w-4 text-primary"
                  />
                  <Label htmlFor="user-role" className="text-sm font-normal">Benutzer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="admin-role"
                    name="role"
                    value="admin"
                    checked={editRole === "admin"}
                    onChange={() => setEditRole("admin")}
                    className="h-4 w-4 text-primary"
                  />
                  <Label htmlFor="admin-role" className="text-sm font-normal">Administrator</Label>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pricing-plan">Preispaket</Label>
              <Select
                value={editPricingPlan}
                onValueChange={(value) => setEditPricingPlan(value as "basic" | "professional" | "enterprise")}
              >
                <SelectTrigger id="pricing-plan">
                  <SelectValue placeholder="Preispaket auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Abbrechen</Button>
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
      
      {/* Benutzer löschen Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Benutzer löschen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Sind Sie sicher, dass Sie den Benutzer <strong>{selectedUser?.username}</strong> löschen möchten?</p>
            <p className="text-sm text-muted-foreground mt-2">Alle Daten dieses Benutzers werden unwiderruflich gelöscht.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Abbrechen</Button>
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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/admin/system/diagnostics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/system/diagnostics");
      if (!response.ok) {
        throw new Error(`Failed to fetch system diagnostics: ${response.statusText}`);
      }
      return await response.json() as {
        database: { status: string; issues: string[] | null };
        email: { status: string; issues: string[] | null };
        performance: { memoryUsage: number; cpuUsage: number };
      };
    }
  });
  
  const runDiagnosticsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/system/run-diagnostics");
      if (!response.ok) {
        throw new Error(`Failed to run diagnostics: ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });
  
  const fixDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/system/fix-database");
      if (!response.ok) {
        throw new Error(`Failed to fix database: ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <h3 className="text-lg font-semibold">Systemdiagnose</h3>
        <Button onClick={() => refetch()} className="gap-2" variant="outline">
          <RefreshCw className="h-4 w-4" />
          Aktualisieren
        </Button>
      </div>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Datenbank
              </div>
              {data?.database.status === "healthy" ? (
                <Badge variant="success" className="gap-1">
                  <Check className="h-3.5 w-3.5" /> Gesund
                </Badge>
              ) : data?.database.status === "issues" ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Probleme gefunden
                </Badge>
              ) : (
                <Badge variant="outline">Unbekannt</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : data?.database.issues && data.database.issues.length > 0 ? (
              <>
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1">
                      {data.database.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => fixDatabaseMutation.mutate()}
                  disabled={fixDatabaseMutation.isPending}
                  className="w-full"
                >
                  {fixDatabaseMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Datenbankprobleme beheben
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Die Datenbank ist in gutem Zustand und funktioniert normal.</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-Mail-System
              </div>
              {data?.email.status === "healthy" ? (
                <Badge variant="success" className="gap-1">
                  <Check className="h-3.5 w-3.5" /> Gesund
                </Badge>
              ) : data?.email.status === "issues" ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Probleme gefunden
                </Badge>
              ) : (
                <Badge variant="outline">Unbekannt</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : data?.email.issues && data.email.issues.length > 0 ? (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {data.email.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-muted-foreground text-sm">Der E-Mail-Dienst ist korrekt konfiguriert und funktioniert normal.</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Systemressourcen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : data ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Speichernutzung</Label>
                    <span className="text-sm">{data.performance.memoryUsage}%</span>
                  </div>
                  <Progress value={data.performance.memoryUsage} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>CPU-Auslastung</Label>
                    <span className="text-sm">{data.performance.cpuUsage}%</span>
                  </div>
                  <Progress value={data.performance.cpuUsage} />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      
      <Button 
        onClick={() => runDiagnosticsMutation.mutate()}
        disabled={runDiagnosticsMutation.isPending}
        className="w-full"
      >
        {runDiagnosticsMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Vollständige Diagnose durchführen
      </Button>
    </div>
  );
}

function ActivityLogTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/activity-log"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/activity-log");
      if (!response.ok) {
        throw new Error(`Failed to fetch activity log: ${response.statusText}`);
      }
      return await response.json() as Array<{
        id: number;
        userId: number;
        username: string;
        action: string;
        details: string;
        timestamp: string;
      }>;
    },
  });
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Aktivitätsprotokoll</h3>
      
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : data && data.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {data.map((log) => (
                  <div key={log.id} className="flex items-start space-x-4 border-b pb-4 last:border-0">
                    <div className="flex-shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{log.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{log.username}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="mr-1">⏰</span>
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4">Keine Aktivitäten gefunden.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackupRestoreTab() {
  const { toast } = useToast();
  
  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/backup");
      if (!response.ok) {
        throw new Error(`Failed to create backup: ${response.statusText}`);
      }
      return await response.blob();
    },
    onSuccess: (blob) => {
      // Backup-Datei herunterladen
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Backup erstellt",
        description: "Das Backup wurde erfolgreich erstellt und heruntergeladen.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Erstellen des Backups",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const [file, setFile] = useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const restoreMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("backup", file);
      
      const response = await fetch("/api/admin/restore", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to restore backup: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setFile(null);
      toast({
        title: "Backup wiederhergestellt",
        description: "Das Backup wurde erfolgreich wiederhergestellt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Wiederherstellen des Backups",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleRestore = () => {
    if (file) {
      restoreMutation.mutate(file);
    }
  };
  
  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/clear-data");
      if (!response.ok) {
        throw new Error(`Failed to clear data: ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Daten gelöscht",
        description: "Alle Kundendaten und Reparaturen wurden erfolgreich gelöscht.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler beim Löschen der Daten",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Backup & Restore</h3>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Backup erstellen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Erstellen Sie ein Backup aller Daten (Kunden, Reparaturen, Einstellungen). 
              Die Backup-Datei wird auf Ihrem Gerät gespeichert.
            </p>
            <Button 
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              className="w-full"
            >
              {backupMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Backup erstellen und herunterladen
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Backup wiederherstellen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Stellen Sie ein zuvor erstelltes Backup wieder her. 
              Achtung: Bestehende Daten werden überschrieben!
            </p>
            
            <div className="space-y-4">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={restoreMutation.isPending}
              />
              
              <Button 
                onClick={handleRestore}
                disabled={!file || restoreMutation.isPending}
                className="w-full"
              >
                {restoreMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Backup wiederherstellen
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash className="h-5 w-5" />
              Daten löschen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Löschen Sie alle Kundendaten und Reparaturen. 
              Benutzerkonten und Einstellungen bleiben erhalten. 
              Dieser Vorgang kann nicht rückgängig gemacht werden!
            </p>
            
            <Button 
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Alle Daten löschen
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Daten löschen Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alle Daten löschen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-2">Sind Sie absolut sicher, dass Sie alle Daten löschen möchten?</p>
            <p className="text-sm text-muted-foreground">Dieser Vorgang wird <strong>alle Kunden und Reparaturen</strong> unwiderruflich löschen. Benutzerkonten und Einstellungen bleiben erhalten.</p>
            <div className="mt-4 p-4 bg-destructive/10 rounded-md border border-destructive/20">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sicherheitshinweis
              </p>
              <p className="text-xs mt-1">Erstellen Sie vor dem Löschen ein Backup, falls Sie die Daten später wiederherstellen möchten.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Abbrechen</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                clearDataMutation.mutate();
                setIsDeleteDialogOpen(false);
              }}
              disabled={clearDataMutation.isPending}
            >
              {clearDataMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Alle Daten endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard");
      if (!response.ok) {
        throw new Error(`Failed to fetch admin dashboard data: ${response.statusText}`);
      }
      return await response.json() as AdminDashboardStats;
    },
  });
  
  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  
  if (error || !data) {
    return <Alert variant="destructive"><AlertDescription>Fehler beim Laden der Dashboard-Daten</AlertDescription></Alert>;
  }
  
  const userStats = data.users;
  const repairStats = data.repairs;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="h-5 w-5" />
              Benutzerstatistik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{userStats.total}</span>
                <span className="text-xs text-muted-foreground">Gesamt</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{userStats.active}</span>
                <span className="text-xs text-muted-foreground">Aktiv</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{userStats.pending}</span>
                <span className="text-xs text-muted-foreground">Ausstehend</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{userStats.admin}</span>
                <span className="text-xs text-muted-foreground">Admins</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Reparaturstatistik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{repairStats.totalOrders}</span>
                <span className="text-xs text-muted-foreground">Gesamt</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{repairStats.today}</span>
                <span className="text-xs text-muted-foreground">Heute</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{repairStats.inRepair}</span>
                <span className="text-xs text-muted-foreground">In Reparatur</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-md">
                <span className="text-2xl font-bold">{repairStats.completed}</span>
                <span className="text-xs text-muted-foreground">Abgeschlossen</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Systemstatus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm">Datenbank</span>
              </div>
              <Badge variant="outline" className="bg-green-50">Online</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm">E-Mail-System</span>
              </div>
              <Badge variant="outline" className="bg-green-50">Bereit</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <span className="text-sm">Speicher</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={65} className="w-24 h-2" />
                <span className="text-xs">65%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isToastTestOpen, setIsToastTestOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Wenn kein Benutzer oder kein Admin, zur Hauptseite umleiten
    if (user === null) {
      setLocation("/auth");
      toast({
        title: "Zugriff verweigert",
        description: "Sie müssen angemeldet sein, um auf den Administrationsbereich zuzugreifen.",
        variant: "destructive",
      });
    } else if (user && !user.isAdmin) {
      setLocation("/");
      toast({
        title: "Zugriff verweigert",
        description: "Sie benötigen Administratorrechte, um auf diesen Bereich zuzugreifen.",
        variant: "destructive",
      });
    }
  }, [user, setLocation, toast]);
  
  if (user === null || !user || !user.isAdmin) {
    return null; // Wird durch useEffect umgeleitet
  }
  
  return (
    <div className="flex h-screen">
      {/* Desktop-Ansicht mit neuer Sidebar */}
      <div className="hidden md:block">
        {/* Seitenleiste für Desktop-Ansicht */}
        <div 
          className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white fixed h-full transition-all duration-300 ease-in-out overflow-y-auto`}
          style={{ paddingLeft: sidebarCollapsed ? '0.75rem' : '1.5rem', paddingRight: sidebarCollapsed ? '0.75rem' : '1.5rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
        >
          <div className="mb-8 flex items-center justify-center md:justify-start">
            {sidebarCollapsed ? (
              <div className="flex justify-center w-full">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white font-bold">
                  HS
                </div>
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
                    <span className="text-sm">Geräteverwaltung</span>
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
            {activeTab === "deviceTypes" && <DeviceTypeSettings />}
            {activeTab === "deviceIssues" && <DeviceIssuesTab />}
            {activeTab === "deviceImport" && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Gerätedaten importieren</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hier können Sie Gerätedaten (Typen, Marken, Modelle) importieren.
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
              

            </div>
          </div>
          
          <div className="bg-white rounded-md shadow-sm p-4 mb-6">
            {activeTab === "dashboard" && <AdminDashboard />}
            {activeTab === "users" && <UserTable />}
            {activeTab === "devices" && <DeviceManagementTab />}
            {activeTab === "deviceTypes" && <DeviceTypeSettings />}
            {activeTab === "deviceIssues" && <DeviceIssuesTab />}
            {activeTab === "deviceImport" && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Gerätedaten importieren</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hier können Sie Gerätedaten (Typen, Marken, Modelle) importieren.
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
          </div>
      
      {/* Toast-Test Dialog */}
      <ToastTestDialog
        open={isToastTestOpen}
        onOpenChange={setIsToastTestOpen}
      />
      
      {/* Toast-Test Button - für Bugi's Admin-Bereich */}
      <div className="fixed bottom-16 right-4 z-10">
        <Button onClick={() => setIsToastTestOpen(true)} variant="secondary" size="sm" className="shadow-md">
          Toast-Test
        </Button>
      </div>
        </div>
      </div>
    </div>
  );
}