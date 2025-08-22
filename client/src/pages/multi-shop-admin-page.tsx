import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Building2, 
  Users, 
  Package, 
  Activity, 
  TrendingUp,
  Euro,
  CheckCircle,
  Clock,
  Eye,
  Edit3,
  LogOut,
  UserPlus,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// Dashboard Statistiken
function DashboardStats() {
  const { data: stats } = useQuery({
    queryKey: ["/api/multi-shop/dashboard-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/dashboard-stats");
      return response.json();
    }
  });

  const { data: chartData } = useQuery({
    queryKey: ["/api/multi-shop/monthly-revenue"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/monthly-revenue");
      return response.json();
    }
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/multi-shop/recent-activities"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/recent-activities");
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Offene Reparaturen
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.openRepairs || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Alle Standorte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Abgeschlossene Reparaturen
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.completedRepairs || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Aktueller Monat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Aktive Shops
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.activeShops || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registrierte Shops
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monatsumsätze Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monatsumsätze nach Shop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chart-Daten werden geladen...</p>
                <p className="text-sm">Monatsumsätze basierend auf echten Shop-Daten</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Umsatzverteilung */}
        <Card>
          <CardHeader>
            <CardTitle>Umsatzverteilung nach Shop</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Umsatzverteilung wird berechnet...</p>
                <p className="text-sm">Basierend auf echten Shop-Daten</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schnellübersicht */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellübersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Schnellübersicht wird geladen...</p>
                <p className="text-sm">Aktuelle Daten aus allen Shops</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Letzte Aktivitäten */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Aktivitäten werden geladen...</p>
                <p className="text-sm">Letzte Aktionen aus allen Shops</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Shop Übersicht
function ShopsOverview() {
  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  if (!shops || shops.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Keine Shops verfügbar</p>
            <p className="text-sm">Shops werden aus echten Daten geladen</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop Cards - Dynamisch geladen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops.map((shop: any) => (
          <Card key={shop.shopId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{shop.businessName}</CardTitle>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  AKTIV
                </Badge>
              </div>
              <CardDescription>Shop-ID: {shop.shopId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monatsumsatz</p>
                  <p className="text-xl font-bold">€{shop.metrics?.totalRevenue?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mitarbeiter</p>
                  <p className="text-xl font-bold">{shop.metrics?.totalEmployees || '0'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Offen:</span>
                  <span className="ml-2 font-semibold text-orange-600">{shop.metrics?.activeRepairs || '0'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Erledigt:</span>
                  <span className="ml-2 font-semibold text-green-600">{shop.metrics?.completedRepairs || '0'}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <span>Zugriff gewährt: </span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    console.log(`Zeige Details für Shop ${shop.shopId}:`, shop);
                    alert(`Shop-Details für ${shop.businessName}\n\nShop-ID: ${shop.shopId}\nUmsatz: €${shop.metrics?.totalRevenue?.toLocaleString() || '0'}\nMitarbeiter: ${shop.metrics?.totalEmployees || '0'}\nAktive Reparaturen: ${shop.metrics?.activeRepairs || '0'}\nAbgeschlossene Reparaturen: ${shop.metrics?.completedRepairs || '0'}`);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    console.log(`Verwalte Shop ${shop.shopId}:`, shop);
                    alert(`Shop-Verwaltung für ${shop.businessName}\n\nFunktionen:\n• Mitarbeiter verwalten\n• Bestellungen einsehen\n• Einstellungen bearbeiten\n• Umsatz-Reports\n\n(Funktionen werden schrittweise erweitert)`);
                  }}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Verwalten
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Neuer Mitarbeiter Dialog
function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shopId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const { toast } = useToast();

  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/multi-shop/create-employee", {
        shopId: parseInt(data.shopId),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: 'employee'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Mitarbeiter wurde erfolgreich erstellt",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
      setOpen(false);
      setFormData({
        shopId: '',
        firstName: '',
        lastName: '',
        email: '',
        password: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Mitarbeiters",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopId || !formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus",
        variant: "destructive",
      });
      return;
    }
    createEmployeeMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4">
          <UserPlus className="h-4 w-4 mr-2" />
          Neuer Mitarbeiter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Mitarbeiter erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Mitarbeiter für einen Ihrer Shops
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop">Shop auswählen</Label>
            <Select value={formData.shopId} onValueChange={(value) => setFormData({...formData, shopId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Shop auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {shops?.map((shop: any) => (
                  <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                    {shop.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                placeholder="Vorname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                placeholder="Nachname"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="mitarbeiter@shop.de"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Sicheres Passwort"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Abbrechen
            </Button>
            <Button type="submit" disabled={createEmployeeMutation.isPending} className="flex-1">
              {createEmployeeMutation.isPending ? "Erstelle..." : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Employee Dialog
function EditEmployeeDialog({ employee, open, onOpenChange }: { employee: any, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    password: '',
    isActive: employee?.isActive ?? true
  });

  // Update form data when employee changes
  React.useEffect(() => {
    setFormData({
      firstName: employee?.firstName || '',
      lastName: employee?.lastName || '',
      email: employee?.email || '',
      password: '',
      isActive: employee?.isActive ?? true
    });
  }, [employee]);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const { toast } = useToast();

  const editEmployeeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PUT", `/api/multi-shop/employees/${employee.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Erfolg",
        description: "Mitarbeiter wurde erfolgreich aktualisiert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Mitarbeiters",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus",
        variant: "destructive",
      });
      return;
    }
    editEmployeeMutation.mutate(formData);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie die Daten von {employee.firstName} {employee.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="changePassword"
                checked={showPasswordField}
                onChange={(e) => setShowPasswordField(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="changePassword">Passwort ändern</Label>
            </div>
            {showPasswordField && (
              <Input
                id="password"
                type="password"
                placeholder="Neues Passwort"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="isActive">Aktiv</Label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={editEmployeeMutation.isPending}>
              {editEmployeeMutation.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Shop-Wechsel Dialog
function ShopReassignmentDialog({ employee, open, onOpenChange }: { 
  employee: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [selectedShop, setSelectedShop] = useState("");
  const { toast } = useToast();

  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  const reassignMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const response = await apiRequest("PATCH", `/api/multi-shop/employees/${employee.id}/shop`, {
        shopId: parseInt(shopId)
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Shop-Wechsel erfolgreich",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
      onOpenChange(false);
      setSelectedShop("");
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Shop-Wechsel",
        description: error.message || "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedShop) {
      toast({
        title: "Shop auswählen",
        description: "Bitte wählen Sie einen Ziel-Shop aus",
        variant: "destructive",
      });
      return;
    }
    reassignMutation.mutate(selectedShop);
  };

  // Verfügbare Shops (ohne den aktuellen Shop)
  const availableShops = shops?.filter((shop: any) => shop.shopId !== employee.shopId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mitarbeiter zu anderem Shop verschieben</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Mitarbeiter</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border">
              {employee.username || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Aktueller Shop</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded border">
              {employee.businessName}
            </div>
          </div>
          
          <div>
            <Label htmlFor="targetShop" className="text-sm font-medium">Ziel-Shop</Label>
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Shop auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {availableShops.map((shop: any) => (
                  <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                    {shop.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={reassignMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={reassignMutation.isPending || !selectedShop}
            >
              {reassignMutation.isPending ? "Verschiebe..." : "Verschieben"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Employee Actions Dropdown
function EmployeeActionsDropdown({ employee }: { employee: any }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shopReassignDialogOpen, setShopReassignDialogOpen] = useState(false);
  const { toast } = useToast();

  const toggleStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await apiRequest("PATCH", `/api/multi-shop/employees/${employee.id}/status`, { isActive });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Ändern des Status",
        variant: "destructive",
      });
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/multi-shop/employees/${employee.id}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Erfolg",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Mitarbeiters",
        variant: "destructive",
      });
    }
  });

  // Nicht für Shop-Owner
  if (employee.role === 'owner') {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => toggleStatusMutation.mutate(!employee.isActive)}
            disabled={toggleStatusMutation.isPending}
          >
            {employee.isActive ? (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Deaktivieren
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Aktivieren
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShopReassignDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Shop wechseln
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mitarbeiter löschen</AlertDialogTitle>
                <AlertDialogDescription>
                  Sind Sie sicher, dass Sie {employee.firstName} {employee.lastName} löschen möchten? 
                  Diese Aktion kann nicht rückgängig gemacht werden und alle zugehörigen Daten werden entfernt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteEmployeeMutation.mutate()}
                  disabled={deleteEmployeeMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteEmployeeMutation.isPending ? "Lösche..." : "Löschen"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <EditEmployeeDialog 
        employee={employee} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
      />
      
      <ShopReassignmentDialog
        employee={employee}
        open={shopReassignDialogOpen}
        onOpenChange={setShopReassignDialogOpen}
      />
    </>
  );
}

// Mitarbeiter Übersicht
function EmployeesOverview() {
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShop, setSelectedShop] = useState<string>("all");
  
  const { data: employees, isLoading, error } = useQuery({
    queryKey: ["/api/multi-shop/employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/employees");
      return response.json();
    }
  });

  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/accessible-shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/accessible-shops");
      return response.json();
    }
  });

  // Filter- und Suchlogik (MUSS vor den bedingten Returns stehen!)
  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    
    let filtered = [...employees];
    
    // Nach Shop filtern
    if (selectedShop !== "all") {
      filtered = filtered.filter(emp => emp.shopId === parseInt(selectedShop));
    }
    
    // Nach Suchterm filtern
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => {
        const name = emp.username || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        return name.toLowerCase().includes(term) || 
               emp.email.toLowerCase().includes(term);
      });
    }
    
    return filtered;
  }, [employees, selectedShop, searchTerm]);

  // Nach Shops gruppieren (MUSS vor den bedingten Returns stehen!)
  const employeesByShop = React.useMemo(() => {
    const grouped = new Map();
    
    filteredEmployees.forEach(employee => {
      const shopName = employee.businessName;
      if (!grouped.has(shopName)) {
        grouped.set(shopName, []);
      }
      grouped.get(shopName).push(employee);
    });
    
    // Sortiere Shops alphabetisch
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEmployees]);

  console.log("EmployeesOverview Debug:", { employees, isLoading, error });

  // WebSocket-Verbindung für Live-Updates des Online-Status
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/status`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("🔗 WebSocket-Verbindung für Online-Status hergestellt");
      // Initiale Status-Anfrage senden
      socket.send(JSON.stringify({ type: 'request_status' }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'status_update' && message.onlineUsers) {
          const userIds = message.onlineUsers.map((user: any) => user.userId);
          setOnlineUsers(userIds);
          console.log("📡 Online-Status aktualisiert:", userIds);
        }
      } catch (error) {
        console.error("Fehler beim Verarbeiten der WebSocket-Nachricht:", error);
      }
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket-Verbindung für Online-Status geschlossen");
    };

    socket.onerror = (error) => {
      console.error("WebSocket-Fehler:", error);
    };

    return () => {
      socket.close();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-xl font-medium">Lade Mitarbeiter-Daten...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-red-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-red-300" />
            <p className="text-xl font-medium">Fehler beim Laden der Mitarbeiter</p>
            <p className="text-sm">{error.message || "Unbekannter Fehler"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="space-y-6">
        <CreateEmployeeDialog />
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Keine Mitarbeiter vorhanden</p>
            <p className="text-sm">Erstellen Sie den ersten Mitarbeiter</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CreateEmployeeDialog />
      
      {/* Filter und Suche */}
      <Card>
        <CardHeader>
          <CardTitle>Mitarbeiterübersicht ({filteredEmployees?.length || 0} von {employees?.length || 0} Mitarbeitern)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Suchfeld */}
            <div className="flex-1">
              <Input
                placeholder="Nach Name oder E-Mail suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Shop-Filter */}
            <div className="w-full sm:w-64">
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger>
                  <SelectValue placeholder="Shop auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Shops</SelectItem>
                  {shops?.map((shop: any) => (
                    <SelectItem key={shop.shopId} value={shop.shopId.toString()}>
                      {shop.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mitarbeiter nach Shops gruppiert */}
      {employeesByShop.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium">Keine Mitarbeiter gefunden</p>
              <p className="text-sm">Passen Sie Ihre Suchkriterien an</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        employeesByShop.map(([shopName, shopEmployees]) => (
          <Card key={shopName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {shopName} ({shopEmployees.length} Mitarbeiter)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Mitarbeiter</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Rolle</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Online</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopEmployees.map((employee: any) => (
                      <tr key={employee.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">
                              {employee.username 
                                ? employee.username 
                                : (employee.firstName || employee.lastName) 
                                  ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() 
                                  : employee.email || 'Unbekannt'}
                            </p>
                            <p className="text-sm text-gray-500">{employee.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={
                            employee.role === 'owner' ? "bg-purple-50 text-purple-700" :
                            employee.role === 'employee' ? "bg-green-50 text-green-700" :
                            "bg-orange-50 text-orange-700"
                          }>
                            {employee.role === 'owner' ? 'Inhaber' :
                             employee.role === 'employee' ? 'Mitarbeiter' :
                             employee.role === 'kiosk' ? 'Kiosk' : employee.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={
                            employee.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }>
                            {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const isOnlineLive = onlineUsers.length > 0 
                                ? onlineUsers.includes(employee.id) 
                                : employee.isOnline;
                              return (
                                <>
                                  <div className={`w-3 h-3 rounded-full ${isOnlineLive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                  <Badge className={isOnlineLive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                                    {isOnlineLive ? 'Online' : 'Offline'}
                                  </Badge>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <EmployeeActionsDropdown employee={employee} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

}

// Bestellungen Übersicht
function OrdersOverview() {
  const [activeOrdersTab, setActiveOrdersTab] = useState<"active" | "archived">("active");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/multi-shop/orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/orders");
      return response.json();
    },
    refetchInterval: 5000, // Alle 5 Sekunden aktualisieren
  });

  const { data: archivedOrders = [], isLoading: isLoadingArchived } = useQuery({
    queryKey: ["/api/multi-shop/orders/archived"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/orders/archived");
      return response.json();
    },
    refetchInterval: 10000, // Alle 10 Sekunden aktualisieren
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Status-Change-Mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest("PATCH", `/api/multi-shop/orders/${id}/status`, { status });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status geändert",
        description: data.message,
      });
      // Cache invalidieren um aktuelle Daten zu laden
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/multi-shop/orders/archived"] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler beim Ändern des Status",
        description: error.message || "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  // Filter die aktiven Bestellungen
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier && order.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.businessName && order.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filter die archivierten Bestellungen
  const filteredArchivedOrders = archivedOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier && order.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.businessName && order.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Status Badge Komponente
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      'bestellen': 'bg-red-100 text-red-800',
      'bestellt': 'bg-yellow-100 text-yellow-800',
      'eingetroffen': 'bg-blue-100 text-blue-800',
      'erledigt': 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Bestellungen - Zentrale Ersatzteil-Verwaltung</CardTitle>
            <CardDescription>Lade Ersatzteilbestellungen...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Ersatzteilbestellungen werden geladen...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen - Zentrale Ersatzteil-Verwaltung</CardTitle>
          <CardDescription>
            Verwalten Sie Ersatzteilbestellungen für alle Standorte zentral
          </CardDescription>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mt-4">
            <Button
              variant={activeOrdersTab === "active" ? "default" : "outline"}
              onClick={() => setActiveOrdersTab("active")}
              className="flex items-center gap-2"
              size="sm"
            >
              <Package className="h-4 w-4" />
              Aktive Bestellungen
              <Badge variant="secondary" className="ml-2">
                {filteredOrders.length}
              </Badge>
            </Button>
            <Button
              variant={activeOrdersTab === "archived" ? "default" : "outline"}
              onClick={() => setActiveOrdersTab("archived")}
              className="flex items-center gap-2"
              size="sm"
            >
              <CheckCircle className="h-4 w-4" />
              Archivierte Bestellungen
              <Badge variant="secondary" className="ml-2">
                {filteredArchivedOrders.length}
              </Badge>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter und Suche */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Suchen nach Ersatzteil, Hersteller, Modell, Shop oder Order-Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {activeOrdersTab === "active" && (
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Alle Status</option>
                  <option value="bestellen">Zu bestellen</option>
                  <option value="bestellt">Bestellt</option>
                  <option value="eingetroffen">Eingetroffen</option>
                  <option value="erledigt">Erledigt</option>
                </select>
              </div>
            )}
          </div>

          {/* Aktive Bestellungen Tab */}
          {activeOrdersTab === "active" && (
            <>
              {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {orders.length === 0 ? "Keine Ersatzteile gefunden" : "Keine passenden Ersatzteile"}
              </h3>
              <p className="text-gray-500">
                {orders.length === 0 
                  ? "Es gibt derzeit keine Ersatzteilbestellungen in den Shops."
                  : "Keine Ersatzteile entsprechen den aktuellen Filterkriterien."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ersatzteil
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hersteller & Modell
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shop
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order-Code
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{order.partName}</p>
                          {order.supplier && (
                            <p className="text-sm text-blue-600">{order.supplier}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{order.deviceInfo}</p>
                          {order.notes && (
                            <p className="text-sm text-gray-500 mt-1">{order.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={order.status}
                          onValueChange={(newStatus) => {
                            changeStatusMutation.mutate({ id: order.id, status: newStatus });
                          }}
                          disabled={changeStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bestellen">Zu bestellen</SelectItem>
                            <SelectItem value="bestellt">Bestellt</SelectItem>
                            <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                            <SelectItem value="erledigt">Erledigt</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{order.businessName}</p>
                          <p className="text-sm text-gray-500">Shop ID: {order.shopId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-900">{order.orderCode}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
          )}

          {/* Archivierte Bestellungen Tab */}
          {activeOrdersTab === "archived" && (
            <>
              {filteredArchivedOrders.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine archivierten Bestellungen gefunden
                  </h3>
                  <p className="text-gray-500">
                    Bestellungen werden automatisch archiviert, wenn sie als "eingetroffen" oder "erledigt" markiert werden.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ersatzteil
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hersteller & Modell
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shop
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order-Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Archiviert am
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredArchivedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.partName}</p>
                              {order.supplier && (
                                <p className="text-sm text-blue-600">{order.supplier}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.deviceInfo}</p>
                              {order.notes && (
                                <p className="text-sm text-gray-500 mt-1">{order.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => {
                                changeStatusMutation.mutate({ id: order.id, status: newStatus });
                              }}
                              disabled={changeStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bestellen">Zu bestellen</SelectItem>
                                <SelectItem value="bestellt">Bestellt</SelectItem>
                                <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                                <SelectItem value="erledigt">Erledigt</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{order.businessName}</p>
                              <p className="text-sm text-gray-500">Shop ID: {order.shopId}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-900">{order.orderCode}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-500">
                              {new Date(order.updatedAt).toLocaleDateString('de-DE')}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Logs Übersicht
function LogsOverview() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aktivitäts-Logs</CardTitle>
          <CardDescription>
            Übersicht aller Aktivitäten in allen Shops (Reparaturen, Ersatzteile, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aktivitäts-Monitoring
            </h3>
            <p className="text-gray-500">
              Hier werden alle Reparatur-Events (eingegangen, beendet, abgeholt) und Ersatzteil-Aktivitäten angezeigt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MultiShopAdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Multi-Shop Verwaltung</h1>
            <p className="text-gray-600">Zentrale Übersicht aller Standorte</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              ClientKing Multi-Shop Admin
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="flex">
        <div className="w-64 bg-slate-900 text-white min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">ClientKing</h2>
                <p className="text-xs text-gray-400">Multi-Shop Admin</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  activeTab === "dashboard" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                Dashboard
              </button>
              
              <button
                onClick={() => setActiveTab("shops")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  activeTab === "shops" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-slate-800"
                }`}
              >
                <Building2 className="h-5 w-5" />
                Shops
              </button>
              
              <button
                onClick={() => setActiveTab("employees")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  activeTab === "employees" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-slate-800"
                }`}
              >
                <Users className="h-5 w-5" />
                Mitarbeiter
              </button>
              
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  activeTab === "orders" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-slate-800"
                }`}
              >
                <Package className="h-5 w-5" />
                Bestellungen
              </button>
              
              <button
                onClick={() => setActiveTab("logs")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                  activeTab === "logs" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-slate-800"
                }`}
              >
                <Activity className="h-5 w-5" />
                Logs
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "dashboard" && <DashboardStats />}
          {activeTab === "shops" && <ShopsOverview />}
          {activeTab === "employees" && <EmployeesOverview />}
          {activeTab === "orders" && <OrdersOverview />}
          {activeTab === "logs" && <LogsOverview />}
        </div>
      </div>
    </div>
  );
}