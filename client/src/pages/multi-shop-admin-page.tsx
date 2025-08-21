import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Star,
  Eye,
  Edit3,
  LogOut
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
          <Card key={shop.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{shop.businessName || shop.name}</CardTitle>
                <Badge className={shop.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                  {shop.isActive ? "AKTIV" : "INAKTIV"}
                </Badge>
              </div>
              <CardDescription>Shop-ID: {shop.shopId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monatsumsatz</p>
                  <p className="text-xl font-bold">€{shop.metrics?.monthlyRevenue?.toLocaleString() || '0'}</p>
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
                <span className="font-medium">{new Date(shop.grantedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
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

// Mitarbeiter Übersicht
function EmployeesOverview() {
  const { data: employees } = useQuery({
    queryKey: ["/api/multi-shop/employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/employees");
      return response.json();
    }
  });

  if (!employees || employees.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Keine Mitarbeiter-Daten verfügbar</p>
            <p className="text-sm">Mitarbeiter werden aus echten API-Daten geladen</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mitarbeiter Tabelle - Dynamisch geladen */}
      <Card>
        <CardHeader>
          <CardTitle>Mitarbeiterübersicht ({employees?.length || 0} Mitarbeiter)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Mitarbeiter</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Shop</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rolle</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Reparaturen</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Bewertung</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee: any) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{employee.username}</p>
                        <p className="text-sm text-gray-500">{employee.email || 'Keine E-Mail'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {employee.businessName}
                      </Badge>
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
                      <div>
                        <p className="font-medium">{employee.totalRepairs || 0}</p>
                        <p className="text-sm text-gray-500">gesamt</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{employee.averageRating || '4.5'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={employee.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter die archivierten Bestellungen
  const filteredArchivedOrders = archivedOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.deviceInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase());
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
                placeholder="Suchen nach Ersatzteil, Kunde, Gerät oder Order-Code..."
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
                      Kunde & Gerät
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
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{order.partName}</p>
                          <p className="text-sm text-gray-500">ID: {order.id}</p>
                          {order.notes && (
                            <p className="text-sm text-blue-600 mt-1">{order.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{order.customerName}</p>
                          <p className="text-sm text-gray-500">{order.deviceInfo}</p>
                          <p className="text-sm text-gray-500">{order.repairIssue}</p>
                          {order.customerPhone && (
                            <p className="text-sm text-blue-600">{order.customerPhone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => {
                              changeStatusMutation.mutate({ id: order.id, status: newStatus });
                            }}
                            disabled={changeStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bestellen">Zu bestellen</SelectItem>
                              <SelectItem value="bestellt">Bestellt</SelectItem>
                              <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                              <SelectItem value="erledigt">Erledigt</SelectItem>
                            </SelectContent>
                          </Select>
                          {order.orderDate && (
                            <p className="text-xs text-gray-500">
                              Bestellt: {new Date(order.orderDate).toLocaleDateString('de-DE')}
                            </p>
                          )}
                          {order.deliveryDate && (
                            <p className="text-xs text-green-600">
                              Geliefert: {new Date(order.deliveryDate).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{order.businessName}</p>
                        <p className="text-sm text-gray-500">Shop ID: {order.shopId}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {order.orderCode}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Details anzeigen
                            console.log('Zeige Details für Ersatzteil:', order);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
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
                          Kunde & Gerät
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
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{order.partName}</p>
                              {order.supplier && (
                                <p className="text-sm text-gray-500">
                                  Lieferant: {order.supplier}
                                </p>
                              )}
                              {order.partNumber && (
                                <p className="text-xs text-gray-400">
                                  Teil-Nr: {order.partNumber}
                                </p>
                              )}
                              {order.notes && (
                                <p className="text-xs text-gray-500 mt-1">{order.notes}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{order.customerName}</p>
                              {order.customerPhone && (
                                <p className="text-sm text-gray-500">{order.customerPhone}</p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">{order.deviceInfo}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <Select
                                value={order.status}
                                onValueChange={(newStatus) => {
                                  changeStatusMutation.mutate({ id: order.id, status: newStatus });
                                }}
                                disabled={changeStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bestellen">Zu bestellen</SelectItem>
                                  <SelectItem value="bestellt">Bestellt</SelectItem>
                                  <SelectItem value="eingetroffen">Eingetroffen</SelectItem>
                                  <SelectItem value="erledigt">Erledigt</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-gray-900">{order.businessName}</p>
                            <p className="text-sm text-gray-500">Shop ID: {order.shopId}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {order.orderCode}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-500">
                              {new Date(order.updatedAt).toLocaleDateString('de-DE')} {new Date(order.updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
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