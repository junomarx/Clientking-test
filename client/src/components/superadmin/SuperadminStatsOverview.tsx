import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription
} from "@/components/ui/card";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Interface für die DSGVO-konformen Statistikdaten
interface DsgvoStats {
  totalShops: number;
  activeShops: number;
  repairsLast30Days: { date: string; count: number }[];
  usersPerShop: { shopId: number; userCount: number }[];
  emailsSent: number;
  lastEmailDate: string | null;
  packageUsage: { packageName: string; userCount: number }[];
  dsgvoExports: number;
  dsgvoDeletes: number;
  lastExport: string | null;
}

export default function SuperadminStatsOverview() {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<DsgvoStats>({
    queryKey: ["/api/superadmin/stats-dsgvo"]
  });

  // Error-Handling mit useEffect, um zu vermeiden, dass toast bei jedem Render aufgerufen wird
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Laden der Statistiken",
        description: "Die DSGVO-konformen Statistikdaten konnten nicht geladen werden.",
      });
    }
  }, [error, toast]);

  // Farbpalette für Diagramme
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Lade-Zustand für die Karten
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className={i > 3 ? "" : i > 1 ? "col-span-2" : ""}>
            <CardHeader>
              <Skeleton className="h-4 w-36 md:w-48" />
              <Skeleton className="h-3 w-24 md:w-40 mt-1" />
            </CardHeader>
            <CardContent>
              {i > 1 ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  // Daten für das Shops-Diagramm (aktiv vs. inaktiv)
  const shopStatusData = [
    { name: 'Aktiv', value: data.activeShops },
    { name: 'Inaktiv', value: Math.max(0, data.totalShops - data.activeShops) }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Shops insgesamt</CardTitle>
          <CardDescription>Alle registrierten Shops</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-bold">{data.totalShops}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktive Shops (30 Tage)</CardTitle>
          <CardDescription>Shops mit Aktivität</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-bold">{data.activeShops}</CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Shop-Status</CardTitle>
          <CardDescription>Aktive vs. inaktive Shops (30 Tage)</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={shopStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => 
                  window.innerWidth < 768 
                    ? `${(percent * 100).toFixed(0)}%`
                    : `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {shopStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Reparaturen (30 Tage)</CardTitle>
          <CardDescription>Tagesübersicht der erstellten Reparaturen</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.repairsLast30Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="count" stroke="#0079F2" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Paketverteilung</CardTitle>
          <CardDescription>Nutzung der verschiedenen Pakete</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.packageUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="packageName" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="userCount" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DSGVO Vorgänge</CardTitle>
          <CardDescription>Letzter Export: {data.lastExport || "Noch keiner"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-muted-foreground">Exporte:</span>{" "}
            <span className="text-xl font-semibold">{data.dsgvoExports}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Löschanfragen:</span>{" "}
            <span className="text-xl font-semibold">{data.dsgvoDeletes}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E-Mail Aktivität</CardTitle>
          <CardDescription>Letzter Versand: {data.lastEmailDate || "Noch keine E-Mails"}</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {data.emailsSent} <span className="text-base font-normal text-muted-foreground">E-Mails (30 Tage)</span>
        </CardContent>
      </Card>
    </div>
  );
}