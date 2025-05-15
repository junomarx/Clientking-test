import React, { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Users, Layers, Smartphone, Cog, Save, ChevronDown, ChevronRight, ChevronLeft, MoreVertical, Pencil, Trash2, LayoutDashboard, Download, Shield, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { DeviceManagementTab } from "@/components/settings/DeviceManagementTab";
import { DeviceTypeSettings } from "@/components/settings/DeviceTypeSettings";
import { DeviceIssuesTab } from "@/components/settings/DeviceIssuesTab";
import { BrandSettings } from "@/components/settings/BrandSettings";
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog";
import { FeatureOverridesTestPanel } from "@/components/admin/FeatureOverridesTestPanel";
import { PlanFeaturesManager } from "@/components/admin/PlanFeaturesManager";
import { FeatureMatrixTab } from "@/components/admin/FeatureMatrixTab";
import SupportRequestsTab from "@/components/admin/SupportRequestsTab";
import ToastTestDialog from "@/components/ToastTestDialog";
import { Feature, FeatureOverrides } from "@/lib/permissions";
import { User } from "@shared/schema";

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
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditUser(user);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Bearbeiten
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user, e);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Löschen
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bearbeiten-Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Informationen des Benutzers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Benutzername</Label>
              <Input 
                id="edit-name" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-Mail</Label>
              <Input 
                id="edit-email" 
                type="email" 
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)} 
              />
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-plan">Preispaket</Label>
              <Select 
                value={editPricingPlan} 
                onValueChange={(value) => setEditPricingPlan(value as "basic" | "professional" | "enterprise")}
              >
                <SelectTrigger id="pricing-plan">
                  <SelectValue placeholder="Wählen Sie ein Preispaket" />
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
            <Button onClick={submitEditUser} disabled={editUserMutation.isPending}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen-Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diesen Benutzer löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                "Löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details-Dialog */}
      {selectedUser && (
        <UserDetailsDialog 
          user={selectedUser} 
          open={isDetailsDialogOpen} 
          onOpenChange={setIsDetailsDialogOpen} 
          onEdit={() => handleEditUser(selectedUser)}
          onDelete={() => handleDeleteUser(selectedUser)}
        />
      )}
    </div>
  );
}

function SystemDiagnosticTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Systemdiagnose</h3>
      <div className="space-y-4">
        <Alert>
          <AlertDescription>Die Systemdiagnose wird hier angezeigt.</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function ActivityLogTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Aktivitätsprotokoll</h3>
      <div className="space-y-4">
        <Alert>
          <AlertDescription>Die neuesten Aktivitäten werden hier angezeigt.</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function BackupRestoreTab() {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/admin/export");
      if (!response.ok) {
        throw new Error("Fehler beim Exportieren der Daten");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // Daten als JSON-Datei herunterladen
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `handyshop-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export erfolgreich",
        description: "Die Daten wurden erfolgreich exportiert."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export fehlgeschlagen",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Importieren der Daten");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setImportFile(null);
      toast({
        title: "Import erfolgreich",
        description: "Die Daten wurden erfolgreich importiert."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import fehlgeschlagen",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleImport = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    }
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Backup & Restore</h3>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Section */}
        <div className="bg-muted/30 p-6 rounded-lg border">
          <h4 className="text-lg font-medium mb-4">Daten exportieren</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Exportieren Sie alle Daten als JSON-Datei für Backup-Zwecke.
          </p>
          <Button 
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="w-full"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportiere...
              </>
            ) : (
              "Alle Daten exportieren"
            )}
          </Button>
        </div>
        
        {/* Import Section */}
        <div className="bg-muted/30 p-6 rounded-lg border">
          <h4 className="text-lg font-medium mb-4">Daten importieren</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Importieren Sie Daten aus einer zuvor exportierten JSON-Datei.
          </p>
          <div className="space-y-4">
            <input 
              type="file" 
              accept=".json"
              className="w-full" 
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <Button 
              onClick={handleImport}
              disabled={importMutation.isPending || !importFile}
              className="w-full"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                "Daten importieren"
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <Alert className="bg-amber-50 text-amber-900 border-amber-200">
        <AlertDescription className="flex items-start gap-2">
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Wichtiger Hinweis zum Datenimport</p>
            <p className="text-sm mt-1">Der Import überschreibt bestehende Daten. Stellen Sie sicher, dass Sie ein Backup erstellt haben, bevor Sie einen Import durchführen.</p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/dashboard");
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
      }
      return await response.json() as AdminDashboardStats;
    },
  });
  
  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  
  if (error) {
    return <Alert variant="destructive"><AlertDescription>Fehler beim Laden der Dashboard-Daten</AlertDescription></Alert>;
  }
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Benutzerstatistiken */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-blue-700 text-sm font-medium mb-2">Benutzer</h3>
          <p className="text-2xl font-bold text-blue-900">{stats?.users.total || 0}</p>
          <div className="mt-2 text-xs text-blue-600 space-y-1">
            <div className="flex justify-between">
              <span>Aktiv:</span>
              <span className="font-medium">{stats?.users.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Inaktiv:</span>
              <span className="font-medium">{stats?.users.pending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Administratoren:</span>
              <span className="font-medium">{stats?.users.admin || 0}</span>
            </div>
          </div>
        </div>
        
        {/* Reparaturstatistiken */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <h3 className="text-green-700 text-sm font-medium mb-2">Reparaturen insgesamt</h3>
          <p className="text-2xl font-bold text-green-900">{stats?.repairs.totalOrders || 0}</p>
          <div className="mt-2 text-xs text-green-600 space-y-1">
            <div className="flex justify-between">
              <span>In Bearbeitung:</span>
              <span className="font-medium">{stats?.repairs.inRepair || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Abholbereit:</span>
              <span className="font-medium">{stats?.repairs.readyForPickup || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Abgeschlossen:</span>
              <span className="font-medium">{stats?.repairs.completed || 0}</span>
            </div>
          </div>
        </div>
        
        {/* Heute-Statistiken */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
          <h3 className="text-amber-700 text-sm font-medium mb-2">Heute</h3>
          <p className="text-2xl font-bold text-amber-900">{stats?.repairs.today || 0}</p>
          <div className="mt-2 text-xs text-amber-600">
            <div className="flex justify-between">
              <span>Neue Aufträge</span>
            </div>
          </div>
        </div>
        
        {/* Externe Reparaturen */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <h3 className="text-purple-700 text-sm font-medium mb-2">Externe Reparaturen</h3>
          <p className="text-2xl font-bold text-purple-900">{stats?.repairs.outsourced || 0}</p>
          <div className="mt-2 text-xs text-purple-600">
            <div className="flex justify-between">
              <span>Bei externen Partnern</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Letzter Login und Systemstatus */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-muted/30 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Letzte Logins</h3>
          <p className="text-sm text-muted-foreground">Diese Funktion ist noch in Entwicklung.</p>
        </div>
        
        <div className="bg-muted/30 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Systemstatus</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Datenbankverbindung</span>
              <Badge variant="success">Online</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">SMTP-Server</span>
              <Badge variant="success">Online</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Speichernutzung</span>
              <span className="text-sm font-medium">32%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  if (!user || !user.isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">Zugriff verweigert</h1>
          <p className="text-center text-muted-foreground mb-6">
            Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.
          </p>
          <Button 
            onClick={() => setLocation("/")}
            className="w-full"
          >
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Desktop-Ansicht mit Seitenleiste (nur auf md und größer sichtbar) */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white h-screen transition-all duration-300 ease-in-out overflow-hidden`}>
          <div className="p-4">
            <h1 className="text-xl font-bold mb-6 truncate">Admin-Panel</h1>
            <nav className="space-y-2">
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
                className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "pakete" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                onClick={() => setActiveTab("pakete")}
              >
                <Layers className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="ml-3">Pakete</span>}
              </div>
              
              <div 
                className={`flex items-center p-2 rounded-md hover:bg-gray-800 ${activeTab === "supportRequests" ? 'text-blue-400 font-medium' : 'text-gray-300'} cursor-pointer`}
                onClick={() => setActiveTab("supportRequests")}
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="ml-3">Support-Anfragen</span>}
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
            {activeTab === "pakete" && <FeatureMatrixTab />}
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
                variant={activeTab === "pakete" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "pakete" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("pakete")}
              >
                <Layers className="h-4 w-4 mr-2" /> Pakete
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
                variant={activeTab === "support-requests" ? "default" : "outline"}
                className={`p-3 h-auto justify-start ${activeTab === "support-requests" ? "bg-primary text-white" : "bg-secondary/10"}`}
                onClick={() => setActiveTab("support-requests")}
              >
                <ShieldAlert className="h-4 w-4 mr-2" /> Support-Anfragen
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
            {activeTab === "pakete" && <FeatureMatrixTab />}
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