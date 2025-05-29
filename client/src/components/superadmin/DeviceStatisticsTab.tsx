import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Tablet, Laptop, Watch, Gamepad2, BarChart3 } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";

// Typen für die API-Response
interface DeviceTypeStats {
  deviceType: string;
  count: number;
}

interface BrandStats {
  brand: string;
  count: number;
}

interface CombinedStats {
  deviceType: string;
  brand: string;
  count: number;
}

interface DeviceStatistics {
  totalDeviceTypes: number;
  totalBrands: number;
  totalDevices: number;
  deviceTypeStats: DeviceTypeStats[];
  brandStats: BrandStats[];
  combinedStats: CombinedStats[];
}

// Icon-Mapping für Gerätetypen
const getDeviceIcon = (deviceType: string) => {
  if (!deviceType) return <Smartphone className="h-4 w-4" />;
  const type = deviceType.toLowerCase();
  if (type.includes('iphone') || type.includes('handy') || type.includes('smartphone')) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (type.includes('ipad') || type.includes('tablet')) {
    return <Tablet className="h-4 w-4" />;
  }
  if (type.includes('macbook') || type.includes('laptop') || type.includes('computer')) {
    return <Laptop className="h-4 w-4" />;
  }
  if (type.includes('watch') || type.includes('smartwatch')) {
    return <Watch className="h-4 w-4" />;
  }
  if (type.includes('konsole') || type.includes('playstation') || type.includes('xbox') || type.includes('nintendo')) {
    return <Gamepad2 className="h-4 w-4" />;
  }
  return <Smartphone className="h-4 w-4" />;
};

export default function DeviceStatisticsTab() {
  const { data: deviceStats, isLoading, error } = useQuery<DeviceStatistics>({
    queryKey: ["/api/superadmin/device-statistics"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Lade Gerätestatistiken...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Fehler beim Laden der Statistiken</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!deviceStats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Keine Daten verfügbar</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gesamt-Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gesamt-Gerätestatistiken
          </CardTitle>
          <CardDescription>
            Übersicht aller erfassten Geräte basierend auf Reparaturdaten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {deviceStats.totalDevices?.toLocaleString() || '0'}
          </div>
          <p className="text-sm text-muted-foreground">Geräte insgesamt</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gerätetypen */}
        <Card>
          <CardHeader>
            <CardTitle>Nach Gerätetyp</CardTitle>
            <CardDescription>
              Verteilung der Geräte nach Kategorien
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceStats.deviceTypeStats?.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(item.deviceType)}
                    <span className="font-medium">{item.deviceType || 'Unbekannt'}</span>
                  </div>
                  <Badge variant="secondary">
                    {item.count?.toLocaleString() || '0'}
                  </Badge>
                </div>
              )) || []}
              {(!deviceStats.deviceTypeStats || deviceStats.deviceTypeStats.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Geräte gefunden
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hersteller */}
        <Card>
          <CardHeader>
            <CardTitle>Nach Hersteller</CardTitle>
            <CardDescription>
              Top Hersteller aller Gerätetypen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceStats.brandStats?.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {(item.brand || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{item.brand || 'Unbekannt'}</span>
                  </div>
                  <Badge variant="secondary">
                    {item.count?.toLocaleString() || '0'}
                  </Badge>
                </div>
              )) || []}
              {(!deviceStats.brandStats || deviceStats.brandStats.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Hersteller gefunden
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detaillierte Aufschlüsselung */}
      <Card>
        <CardHeader>
          <CardTitle>Detaillierte Aufschlüsselung</CardTitle>
          <CardDescription>
            Gerätetyp und Hersteller kombiniert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {deviceStats.combinedStats?.slice(0, 20).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(item.deviceType)}
                  <div>
                    <span className="font-medium">{item.deviceType || 'Unbekannt'}</span>
                    <span className="text-muted-foreground"> • {item.brand || 'Unbekannt'}</span>
                  </div>
                </div>
                <Badge variant="secondary">
                  {item.count?.toLocaleString() || '0'}
                </Badge>
              </div>
            )) || []}
            {(!deviceStats.combinedStats || deviceStats.combinedStats.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Kombinationen gefunden
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}