import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Gesamtumsatz Monat
            </CardTitle>
            <Euro className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              € {stats?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Nur berechtigte Shops
            </p>
          </CardContent>
        </Card>

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
              Nur berechtigte Shops
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
              Nur berechtigte Shops
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
              Mit Berechtigung
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Echte Chart-Daten basierend auf berechtigten Shops */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Umsätze - Berechtigte Shops
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <div className="h-80 flex items-end justify-around gap-4 p-4">
                {chartData.map((shop, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div 
                      className="bg-blue-500 w-16 rounded-t flex items-end justify-center text-white text-xs font-semibold p-1"
                      style={{ height: shop.value > 0 ? `${Math.max(20, (shop.value / 1000))}px` : '20px' }}
                    >
                      {shop.value > 0 ? `€${shop.value.toLocaleString()}` : 'Keine Daten'}
                    </div>
                    <span className="text-xs text-gray-600 text-center">{shop.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Keine Umsatzdaten verfügbar</p>
                  <p className="text-sm">für berechtigte Shops</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Berechtigte Shops Liste */}
        <Card>
          <CardHeader>
            <CardTitle>Berechtigte Shops</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <div className="space-y-4">
                {chartData.map((shop, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      {shop.name}
                    </span>
                    <span className="font-semibold text-sm">€{shop.value?.toLocaleString() || '0'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Keine Shops verfügbar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Echte Schnellübersicht - nur berechtigte Shops */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellübersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Offene Reparaturen</span>
              </div>
              <Badge variant="outline" className="font-semibold">{stats?.openRepairs || '0'}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Abgeschlossene Reparaturen</span>
              </div>
              <Badge variant="outline" className="font-semibold text-green-600">{stats?.completedRepairs || '0'}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Berechtigte Shops</span>
              </div>
              <Badge variant="outline" className="font-semibold text-blue-600">{stats?.activeShops || '0'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Echte Aktivitäten - nur für berechtigte Shops */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.slice(0, 4).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.shopName}</p>
                    </div>
                    <span className="text-xs text-gray-400">{activity.timeAgo}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Keine aktuellen Aktivitäten</p>
                <p className="text-sm">für berechtigte Shops</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Shop Übersicht
function ShopsOverview() {
  const { data: shops } = useQuery({
    queryKey: ["/api/multi-shop/shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/shops");
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards - Echte Daten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Gesamtumsatz Shops
            </CardTitle>
            <Euro className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              € {shops?.reduce((total: number, shop: any) => total + (shop.totalRevenue || 0), 0)?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Nur berechtigte Shops</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mitarbeiter gesamt
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {shops?.reduce((total: number, shop: any) => total + (shop.employeeCount || 0), 0) || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Berechtigte Shops</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Offene Reparaturen
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {shops?.reduce((total: number, shop: any) => total + (shop.openRepairs || 0), 0) || '0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Berechtigte Shops</p>
          </CardContent>
        </Card>
      </div>

      {/* Echte Shop Cards - nur berechtigte Shops */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops && shops.length > 0 ? (
          shops.map((shop: any, index: number) => (
            <Card key={shop.shopId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{shop.businessName}</CardTitle>
                  <Badge className={shop.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-700"}>
                    {shop.isActive ? 'ONLINE' : 'OFFLINE'}
                  </Badge>
                </div>
                <CardDescription>Shop ID: {shop.shopId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Gesamtumsatz</p>
                    <p className="text-xl font-bold">€{shop.totalRevenue?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-gray-500">{shop.revenueChange || '0.0'}% vs VM</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mitarbeiter</p>
                    <p className="text-xl font-bold">{shop.employeeCount || 0}</p>
                    <p className="text-xs text-gray-500">Anzahl</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Offen:</span>
                    <span className="ml-2 font-semibold text-orange-600">{shop.openRepairs || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Erledigt:</span>
                    <span className="ml-2 font-semibold text-green-600">{shop.completedRepairs || 0}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">Keine berechtigten Shops verfügbar</p>
            <p className="text-sm text-gray-400">Sie haben keine Berechtigung für Shops</p>
          </div>
        )}
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

  return (
    <div className="space-y-6">
      {/* Echte KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mitarbeiter gesamt
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{employees?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Berechtigte Shops</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Durchschnittsbewertung
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {employees?.length > 0 
                ? (employees.reduce((sum: number, emp: any) => sum + parseFloat(emp.rating || '0'), 0) / employees.length).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Durchschnitt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Reparaturen gesamt
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {employees?.reduce((sum: number, emp: any) => sum + (emp.repairCount || 0), 0) || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Alle Mitarbeiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Berechtigte Shops
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {employees ? [...new Set(employees.map((emp: any) => emp.shopId))].length : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Mit Zugriff</p>
          </CardContent>
        </Card>
      </div>

      {/* Mitarbeiter Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Mitarbeiterübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          {employees && employees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Mitarbeiter</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Shop</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Seit</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Reparaturen</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee: any) => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{employee.username || 'Unbekannt'}</p>
                          <p className="text-sm text-gray-500">{employee.email || 'Keine E-Mail'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {employee.role === 'kiosk' ? 'Kiosk' : employee.role === 'employee' ? 'Mitarbeiter' : 'Owner'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          Shop {employee.shopId || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {new Date(employee.createdAt).toLocaleDateString('de-DE')}
                          </p>
                          <p className="text-sm text-gray-500">{employee.yearsOfService} Jahre</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{employee.repairCount || 0}</p>
                          <p className="text-sm text-gray-500">abgeschlossen</p>
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
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">Keine Mitarbeiter verfügbar</p>
              <p className="text-sm text-gray-400">Sie haben keine Berechtigung für Mitarbeiter-Daten</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Echte Shop-Mitarbeiter Statistiken */}
      {employees && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...new Set(employees.map((emp: any) => emp.shopId))].map((shopId: number) => {
            const shopEmployees = employees.filter((emp: any) => emp.shopId === shopId);
            const totalRepairs = shopEmployees.reduce((sum: number, emp: any) => sum + (emp.repairCount || 0), 0);
            
            return (
              <Card key={shopId}>
                <CardHeader>
                  <CardTitle>Shop {shopId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold">{shopEmployees.length}</div>
                    <p className="text-sm text-gray-600">Mitarbeiter</p>
                    <div className="text-lg font-semibold text-green-600">{totalRepairs}</div>
                    <p className="text-xs text-gray-500">Reparaturen gesamt</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Bestellungen Übersicht
function OrdersOverview() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen - Zentrale Ersatzteil-Verwaltung</CardTitle>
          <CardDescription>
            Verwalten Sie Ersatzteilbestellungen für alle Standorte zentral
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Bestellungsmanagement
            </h3>
            <p className="text-gray-500">
              Diese Funktion wird implementiert und ermöglicht zentrale Ersatzteilbestellungen für alle Shops.
            </p>
          </div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Multi-Shop Verwaltung</h1>
            <p className="text-gray-600">Zentrale Übersicht aller Standorte</p>
          </div>
          <div className="text-right">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              ClientKing Multi-Shop Admin
            </Badge>
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