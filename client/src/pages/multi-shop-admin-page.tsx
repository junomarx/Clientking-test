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
              € {stats?.totalRevenue?.toLocaleString() || '89.420'}
            </div>
            <p className="text-xs text-green-600 mt-1">
              +7.2% vs Vormonat
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
              {stats?.openRepairs || '47'}
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
              {stats?.completedRepairs || '156'}
            </div>
            <p className="text-xs text-green-600 mt-1">
              +8% vs Vormonat
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
              {stats?.activeShops || '3'}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Alle online
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
            <div className="h-80 flex items-end justify-around gap-4 p-4">
              {/* Placeholder für Chart - wird später durch echtes Chart ersetzt */}
              <div className="flex flex-col items-center gap-2">
                <div className="bg-blue-500 w-12 h-32 rounded-t"></div>
                <div className="bg-green-500 w-12 h-24 rounded-t"></div>
                <div className="bg-orange-500 w-12 h-20 rounded-t"></div>
                <span className="text-xs text-gray-600">Shop Wien</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-blue-500 w-12 h-40 rounded-t"></div>
                <div className="bg-green-500 w-12 h-28 rounded-t"></div>
                <div className="bg-orange-500 w-12 h-24 rounded-t"></div>
                <span className="text-xs text-gray-600">Shop Graz</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-blue-500 w-12 h-48 rounded-t"></div>
                <div className="bg-green-500 w-12 h-32 rounded-t"></div>
                <div className="bg-orange-500 w-12 h-28 rounded-t"></div>
                <span className="text-xs text-gray-600">Shop Linz</span>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Shop Wien
                </span>
                <span className="font-semibold">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Shop Graz
                </span>
                <span className="font-semibold">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  Shop Linz
                </span>
                <span className="font-semibold">20%</span>
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
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Mitarbeiter gesamt</span>
              </div>
              <Badge variant="outline" className="font-semibold">18</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-orange-600" />
                <span>Lagerbestände niedrig</span>
              </div>
              <Badge variant="outline" className="font-semibold text-orange-600">5</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Heute abgeschlossen</span>
              </div>
              <Badge variant="outline" className="font-semibold text-green-600">12</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Letzte Aktivitäten */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Neue Reparatur eingegangen</p>
                  <p className="text-sm text-gray-500">Shop Wien</p>
                </div>
                <span className="text-xs text-gray-400">vor 5 Min</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Displaytausch abgeschlossen</p>
                  <p className="text-sm text-gray-500">Shop Graz</p>
                </div>
                <span className="text-xs text-gray-400">vor 15 Min</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ersatzteil bestellt</p>
                  <p className="text-sm text-gray-500">Shop Linz</p>
                </div>
                <span className="text-xs text-gray-400">vor 1h 30m</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mitarbeiter Max verschickt</p>
                  <p className="text-sm text-gray-500">Shop Wien</p>
                </div>
                <span className="text-xs text-gray-400">vor 1 Tag</span>
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
    queryKey: ["/api/multi-shop/shops"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/multi-shop/shops");
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
              Gesamtumsatz Shops
            </CardTitle>
            <Euro className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">€ 86.200</div>
            <p className="text-xs text-green-600 mt-1">+1.8% vs Vormonat</p>
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
            <div className="text-2xl font-bold text-gray-900">18</div>
            <p className="text-xs text-gray-500 mt-1">Alle Standorte</p>
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
            <div className="text-2xl font-bold text-gray-900">47</div>
            <p className="text-xs text-orange-600 mt-1">Alle Standorte</p>
          </CardContent>
        </Card>
      </div>

      {/* Shop Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Shop Wien</CardTitle>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ONLINE</Badge>
            </div>
            <CardDescription>Verwaltung und Übersicht aller Shop-Standorte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Gesamtumsatz</p>
                <p className="text-xl font-bold">€35.200</p>
                <p className="text-xs text-green-600">+5.2% vs VM</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mitarbeiter</p>
                <p className="text-xl font-bold">8</p>
                <p className="text-xs text-gray-500">+12.5% Auslastung</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Offen:</span>
                <span className="ml-2 font-semibold text-orange-600">15</span>
              </div>
              <div>
                <span className="text-gray-600">Erledigt:</span>
                <span className="ml-2 font-semibold text-green-600">67</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span>Manager: </span>
              <span className="font-medium">Thomas Miller</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Edit3 className="h-4 w-4 mr-1" />
                Bearbeiten
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Shop Graz</CardTitle>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ONLINE</Badge>
            </div>
            <CardDescription>Verwaltung und Übersicht aller Shop-Standorte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Gesamtumsatz</p>
                <p className="text-xl font-bold">€28.800</p>
                <p className="text-xs text-green-600">+2.1% vs VM</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mitarbeiter</p>
                <p className="text-xl font-bold">6</p>
                <p className="text-xs text-gray-500">+8.3% Auslastung</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Offen:</span>
                <span className="ml-2 font-semibold text-orange-600">20</span>
              </div>
              <div>
                <span className="text-gray-600">Erledigt:</span>
                <span className="ml-2 font-semibold text-green-600">52</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span>Manager: </span>
              <span className="font-medium">Anna Schmidt</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Edit3 className="h-4 w-4 mr-1" />
                Bearbeiten
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Shop Linz</CardTitle>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">ONLINE</Badge>
            </div>
            <CardDescription>Verwaltung und Übersicht aller Shop-Standorte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Gesamtumsatz</p>
                <p className="text-xl font-bold">€22.100</p>
                <p className="text-xs text-green-600">+1.7% vs VM</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mitarbeiter</p>
                <p className="text-xl font-bold">4</p>
                <p className="text-xs text-gray-500">+6.2% Auslastung</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Offen:</span>
                <span className="ml-2 font-semibold text-orange-600">12</span>
              </div>
              <div>
                <span className="text-gray-600">Erledigt:</span>
                <span className="ml-2 font-semibold text-green-600">37</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span>Manager: </span>
              <span className="font-medium">Michael Weber</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Edit3 className="h-4 w-4 mr-1" />
                Bearbeiten
              </Button>
            </div>
          </CardContent>
        </Card>
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Mitarbeiter gesamt
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">6</div>
            <p className="text-xs text-gray-500 mt-1">Alle Standorte</p>
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
            <div className="text-2xl font-bold text-gray-900">4.7</div>
            <p className="text-xs text-green-600 mt-1">★★★★★</p>
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
            <div className="text-2xl font-bold text-gray-900">969</div>
            <p className="text-xs text-gray-500 mt-1">Letzter Monat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Standorte
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">3</div>
            <p className="text-xs text-blue-600 mt-1">Wien, Graz, Linz</p>
          </CardContent>
        </Card>
      </div>

      {/* Mitarbeiter Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle>Mitarbeiterübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Mitarbeiter</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Shop</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Seit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Reparaturen</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Bewertung</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">Max Mustermann</p>
                      <p className="text-sm text-gray-500">max.mustermann@clientking.at • +43 1 234 567 8</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">Senior Techniker</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Shop Wien</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">15.3.2020</p>
                      <p className="text-sm text-gray-500">3 Jahre</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">245</p>
                      <p className="text-sm text-gray-500">abgeschlossen</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">4.8</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4 mr-1" />
                      Verwalten
                    </Button>
                  </td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">Lisa Huber</p>
                      <p className="text-sm text-gray-500">lisa.huber@clientking.at • +43 1 234 567 9</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="bg-green-50 text-green-700">Techniker</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Shop Wien</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">22.7.2021</p>
                      <p className="text-sm text-gray-500">2 Jahre</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">189</p>
                      <p className="text-sm text-gray-500">abgeschlossen</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">4.6</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <Edit3 className="h-4 w-4 mr-1" />
                      Verwalten
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Shop Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop Wien</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">2</div>
              <p className="text-sm text-gray-600">Mitarbeiter</p>
              <div className="text-lg font-semibold text-green-600">434</div>
              <p className="text-xs text-gray-500">Reparaturen gesamt</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Shop Graz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">2</div>
              <p className="text-sm text-gray-600">Mitarbeiter</p>
              <div className="text-lg font-semibold text-green-600">290</div>
              <p className="text-xs text-gray-500">Reparaturen gesamt</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shop Linz</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">2</div>
              <p className="text-sm text-gray-600">Mitarbeiter</p>
              <div className="text-lg font-semibold text-green-600">245</div>
              <p className="text-xs text-gray-500">Reparaturen gesamt</p>
            </div>
          </CardContent>
        </Card>
      </div>
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