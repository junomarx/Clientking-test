import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

interface SuperadminStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    admins: number;
    totalShops: number;
  };
  repairs: {
    totalRepairs: number;
    received: number;
    inRepair: number;
    readyForPickup: number;
    completed: number;
  };
  packages: {
    packageName: string;
    userCount: number;
  }[];
}

export default function SuperadminDashboardTab() {
  const { toast } = useToast();

  const { data: stats, isLoading, error } = useQuery<SuperadminStats>({
    queryKey: ["/api/superadmin/stats"],
  });

  if (error) {
    toast({
      variant: "destructive",
      title: "Fehler beim Laden der Statistiken",
      description: error.message,
    });
  }

  const packageUsageData = Array.isArray(stats?.packages) ? stats.packages : [];

  const userStatusData = stats ? [
    { name: 'Aktiv', value: stats.users.activeUsers },
    { name: 'Inaktiv', value: stats.users.inactiveUsers },
  ] : [];

  const repairStatusData = stats ? [
    { name: 'Eingegangen', value: stats.repairs.received },
    { name: 'In Reparatur', value: stats.repairs.inRepair },
    { name: 'Fertig', value: stats.repairs.readyForPickup },
    { name: 'Abgeholt', value: stats.repairs.completed },
  ] : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Superadmin Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Hier können Sie die globalen Statistiken aller Shops und Benutzer einsehen.</p>
      </div>

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
              value={stats.users.totalShops}
              description="Anzahl der Shops"
            />
            <StatsCard
              title="Reparaturen"
              value={stats.repairs.totalRepairs}
              description="Gesamtanzahl der Reparaturen"
            />
            <StatsCard
              title="Admins"
              value={stats.users.admins}
              description="Anzahl der Admins"
            />
          </div>

          {/* Diagramme */}
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
            {/* Paket-Nutzung-Diagramm */}
            <Card className="col-span-1">
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base md:text-lg">Paket-Nutzung</CardTitle>
                <CardDescription className="text-xs md:text-sm">Verteilung der Benutzer nach Paketen</CardDescription>
              </CardHeader>
              <CardContent className="h-60 md:h-80 p-2 md:p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={packageUsageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="packageName" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} width={25} />
                    <RechartsTooltip />
                    <Bar dataKey="userCount" fill="#8884d8" name="Benutzer">
                      {packageUsageData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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

            {/* Reparatur-Status-Diagramm */}
            <Card className="col-span-1">
              <CardHeader className="py-3 md:py-4">
                <CardTitle className="text-base md:text-lg">Reparatur-Status</CardTitle>
                <CardDescription className="text-xs md:text-sm">Verteilung der Reparaturen nach Status</CardDescription>
              </CardHeader>
              <CardContent className="h-60 md:h-80 p-2 md:p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={repairStatusData}
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
                      {repairStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p>Keine Daten verfügbar</p>
      )}
    </div>
  );
}

function StatsCard({ title, value, description }: { title: string; value: number; description: string }) {
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
