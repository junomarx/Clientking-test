import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Package, 
  Wrench, 
  ShoppingBag, 
  CreditCard,
  Building, 
  BarChart4 
} from 'lucide-react';

interface SuperadminStats {
  users: {
    totalUsers: string;
    activeUsers: string;
    inactiveUsers: string;
  };
  packages: {
    totalPackages: string;
  };
  shops: {
    totalShops: string;
  };
  repairs: {
    totalRepairs: string;
  };
  orders: {
    totalOrders: string;
  };
  revenue: {
    totalRevenue: string;
  };
}

export default function SuperadminDashboardTab() {
  // Superadmin-Statistiken abrufen
  const { data: stats, isLoading, error } = useQuery<SuperadminStats>({ 
    queryKey: ["/api/superadmin/stats"],
  });

  // Statistik-Karten mit verschiedenen Farben und Icons
  const statCards = [
    {
      title: "Benutzer gesamt",
      value: stats?.users.totalUsers || "0",
      description: "Registrierte Benutzer",
      icon: <Users className="h-5 w-5" />,
      colorClass: "bg-blue-50 text-blue-700"
    },
    {
      title: "Aktive Benutzer",
      value: stats?.users.activeUsers || "0",
      description: "Derzeit aktive Konten",
      icon: <UserCheck className="h-5 w-5" />,
      colorClass: "bg-green-50 text-green-700"
    },
    {
      title: "Inaktive Benutzer",
      value: stats?.users.inactiveUsers || "0",
      description: "Deaktivierte Konten",
      icon: <UserX className="h-5 w-5" />,
      colorClass: "bg-red-50 text-red-700"
    },
    {
      title: "Pakete",
      value: stats?.packages.totalPackages || "0",
      description: "Verfügbare Pakete",
      icon: <Package className="h-5 w-5" />,
      colorClass: "bg-purple-50 text-purple-700"
    },
    {
      title: "Shops",
      value: stats?.shops.totalShops || "0",
      description: "Aktive Shops",
      icon: <Building className="h-5 w-5" />,
      colorClass: "bg-indigo-50 text-indigo-700"
    },
    {
      title: "Reparaturen",
      value: stats?.repairs.totalRepairs || "0",
      description: "Reparaturen gesamt",
      icon: <Wrench className="h-5 w-5" />,
      colorClass: "bg-amber-50 text-amber-700"
    },
    {
      title: "Bestellungen",
      value: stats?.orders.totalOrders || "0",
      description: "Bestellungen gesamt",
      icon: <ShoppingBag className="h-5 w-5" />,
      colorClass: "bg-emerald-50 text-emerald-700"
    },
    {
      title: "Umsatz",
      value: stats?.revenue.totalRevenue || "0 €",
      description: "Gesamtumsatz",
      icon: <CreditCard className="h-5 w-5" />,
      colorClass: "bg-cyan-50 text-cyan-700"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Skeleton className="h-8 w-16" />
              </div>
              <p className="text-xs text-muted-foreground">
                <Skeleton className="h-3 w-32" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Fehler beim Laden der Statistiken</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Die Superadmin-Statistiken konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Übersicht über alle Systemdaten und Statistiken
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.colorClass}`}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Hier könnten später Diagramme eingefügt werden */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart4 className="h-5 w-5" />
              Benutzerstatistiken
            </CardTitle>
            <CardDescription>
              Benutzeraktivität im Überblick
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center border rounded-md bg-muted/10">
              <p className="text-muted-foreground text-sm">
                Benutzerstatistiken werden hier in zukünftigen Updates angezeigt
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart4 className="h-5 w-5" />
              Reparaturstatistiken
            </CardTitle>
            <CardDescription>
              Reparaturaufkommen im Überblick
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52 flex items-center justify-center border rounded-md bg-muted/10">
              <p className="text-muted-foreground text-sm">
                Reparaturstatistiken werden hier in zukünftigen Updates angezeigt
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
