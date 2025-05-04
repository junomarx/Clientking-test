import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Building, Users, Wrench, Shield } from "lucide-react";

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

  const packageUsageData = stats?.packages || [];

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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Superadmin Dashboard</h1>
      <p className="text-muted-foreground">Hier können Sie die globalen Statistiken aller Shops und Benutzer einsehen.</p>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Benutzer"
              value={stats.users.totalUsers}
              description="Gesamtanzahl der Benutzer"
              icon={<Users className="h-5 w-5" />}
            />
            <StatsCard
              title="Shops"
              value={stats.users.totalShops}
              description="Aktive Shops"
              icon={<Building className="h-5 w-5" />}
            />
            <StatsCard
              title="Reparaturen"
              value={stats.repairs.totalRepairs}
              description="Gesamtanzahl der Reparaturen"
              icon={<Wrench className="h-5 w-5" />}
            />
            <StatsCard
              title="Admins"
              value={stats.users.admins}
              description="Anzahl der Admins"
              icon={<Shield className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Paket-Nutzung</CardTitle>
                <CardDescription>Verteilung der Benutzer nach Paketen</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={packageUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="packageName" />
                    <YAxis allowDecimals={false} />
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

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Benutzer-Status</CardTitle>
                <CardDescription>Aktive vs. inaktive Benutzer</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
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

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Reparatur-Status</CardTitle>
                <CardDescription>Verteilung der Reparaturen nach Status</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={repairStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
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

function StatsCard({ title, value, description, icon }: { title: string; value: number; description: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex justify-between items-center">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
