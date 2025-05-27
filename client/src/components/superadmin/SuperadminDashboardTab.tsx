import React, { useMemo, useContext, createContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

// Context für die Tab-Kommunikation
export const SuperadminContext = createContext<((tab: string) => void) | undefined>(undefined);
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import SuperadminStatsOverview from './SuperadminStatsOverview';
import { User } from '@shared/schema';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BadgeCheck, BadgeX, UserPlus, Wrench, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { CreateTestUserDialog } from './CreateTestUserDialog';
import { DeploymentFixDialog } from './DeploymentFixDialog';

// Diese Interface-Definition entspricht der tatsächlichen API-Antwort
interface SuperadminStats {
  users: {
    totalUsers: string;
    activeUsers: string;
    inactiveUsers: string;
  };
  shops: {
    totalShops: string;
  };
  repairs: {
    totalRepairs: string;
  };
  packages: {
    totalPackages: string;
  };
  orders: {
    totalOrders: string;
  };
  revenue: {
    totalRevenue: string;
  };
}

export default function SuperadminDashboardTab() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const setActiveTab = useContext<((tab: string) => void) | undefined>(SuperadminContext);

  const { data: stats, isLoading, error } = useQuery<SuperadminStats>({
    queryKey: ["/api/superadmin/stats"],
  });
  
  // Abrufen der nicht aktivierten Benutzer
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/superadmin/users"],
  });
  
  // Finde nicht aktivierte Benutzer und sortiere alphabetisch
  const inactiveUsers = useMemo(() => {
    if (!users) return [];
    return users
      .filter(user => !user.isActive)
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users]);
  
  // Benutzer aktivieren
  const handleActivateUser = async (userId: number) => {
    try {
      await apiRequest("PATCH", `/api/superadmin/users/${userId}`, {
        isActive: true
      });
      
      // Cache aktualisieren
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      
      toast({
        title: "Benutzer aktiviert",
        description: "Der Benutzer wurde erfolgreich aktiviert.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Aktivieren",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  };

  if (error) {
    toast({
      variant: "destructive",
      title: "Fehler beim Laden der Statistiken",
      description: error.message,
    });
  }

  // Benutzer-Status für das Kreisdiagramm vorbereiten
  const userStatusData = stats ? [
    { name: 'Aktiv', value: parseInt(stats.users.activeUsers) || 0 },
    { name: 'Inaktiv', value: parseInt(stats.users.inactiveUsers) || 0 },
  ] : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Superadmin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Hier können Sie die globalen Statistiken aller Shops und Benutzer einsehen.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <CreateTestUserDialog>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Testbenutzer erstellen
            </Button>
          </CreateTestUserDialog>
          
          <DeploymentFixDialog>
            <Button variant="outline" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Deployment reparieren
            </Button>
          </DeploymentFixDialog>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basis-Statistiken</TabsTrigger>
          <TabsTrigger value="dsgvo">DSGVO-Statistiken</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
                    <Skeleton className="h-3 md:h-4 w-24 md:w-36" />
                  </CardHeader>
                  <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                    <Skeleton className="h-6 md:h-8 w-14 md:w-16" />
                    <Skeleton className="h-2 md:h-3 w-20 md:w-32 mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-4 md:space-y-6">
              {/* Übersichtskarten */}
              <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Benutzer"
                  value={stats.users.totalUsers}
                  description="Gesamtanzahl der Benutzer"
                />
                <StatsCard
                  title="Shops"
                  value={stats.shops.totalShops}
                  description="Anzahl der Shops"
                />
                <StatsCard
                  title="Reparaturen"
                  value={stats.repairs.totalRepairs}
                  description="Gesamtanzahl der Reparaturen"
                />
                <StatsCard
                  title="Pakete"
                  value={stats.packages.totalPackages}
                  description="Anzahl der Pakete"
                />
              </div>

              {/* Diagramme */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                {/* Benutzer-Status-Diagramm */}
                <Card className="col-span-1">
                  <CardHeader className="py-3 md:py-4">
                    <CardTitle className="text-base md:text-lg">Benutzer-Status</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Aktive vs. inaktive Benutzer</CardDescription>
                  </CardHeader>
                  <CardContent className="h-60 md:h-80 p-2 md:p-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Pie
                          data={userStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => 
                            window.innerWidth < 768 
                              ? `${(percent * 100).toFixed(0)}%`
                              : `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={window.innerWidth < 768 ? 60 : 80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {userStatusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                {/* Nicht aktivierte Benutzer */}
                <Card className="col-span-1">
                  <CardHeader className="py-3 md:py-4">
                    <CardTitle className="text-base md:text-lg">Neue Benutzer</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Nicht aktivierte Benutzerkonten</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingUsers ? (
                      <div className="p-4">
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : inactiveUsers && inactiveUsers.length > 0 ? (
                      <div className="w-full overflow-auto">
                        {/* Desktop Version - normale Tabelle */}
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Benutzername</TableHead>
                                <TableHead>E-Mail</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Aktionen</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inactiveUsers.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.username}</TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                      <BadgeX className="h-3 w-3 mr-1" /> Inaktiv
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        // Direkt zum Users-Tab wechseln
                                        if (setActiveTab) {
                                          setActiveTab("users");
                                          
                                          // Nach kurzer Verzögerung zum Details-Dialog
                                          setTimeout(() => {
                                            // Event für Benutzerdetails simulieren
                                            const event = new CustomEvent('showUserDetails', {
                                              detail: { userId: user.id }
                                            });
                                            document.dispatchEvent(event);
                                          }, 100);
                                        }
                                      }}
                                    >
                                      Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Version - Kartenlayout */}
                        <div className="md:hidden space-y-3 p-3">
                          {inactiveUsers.map((user) => (
                            <Card key={user.id} className="overflow-hidden">
                              <CardHeader className="py-3 px-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-base">{user.username}</CardTitle>
                                    <CardDescription className="text-xs mt-1">{user.email}</CardDescription>
                                  </div>
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    <BadgeX className="h-3 w-3 mr-1" /> Inaktiv
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 pb-3 px-4">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    // Direkt zum Users-Tab wechseln
                                    if (setActiveTab) {
                                      setActiveTab("users");
                                      
                                      // Nach kurzer Verzögerung zum Details-Dialog
                                      setTimeout(() => {
                                        // Event für Benutzerdetails simulieren
                                        const event = new CustomEvent('showUserDetails', {
                                          detail: { userId: user.id }
                                        });
                                        document.dispatchEvent(event);
                                      }, 100);
                                    }
                                  }}
                                >
                                  Details anzeigen
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        Keine inaktiven Benutzer gefunden
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p>Keine Daten verfügbar</p>
          )}
        </TabsContent>

        <TabsContent value="dsgvo">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">DSGVO-konforme Systemstatistiken</h2>
              <p className="text-sm text-muted-foreground">
                Anonymisierte Metriken und Systemdaten, die den Datenschutzrichtlinien entsprechen.
              </p>
            </div>
            <SuperadminStatsOverview />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        <div className="text-xl md:text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
      </CardContent>
    </Card>
  );
}