import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Smartphone, Tablet, Laptop, Watch, Gamepad2, BarChart3, ChevronRight } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { useState } from "react";

// Typen für die API-Response
interface DeviceTypeStats {
  deviceType: string;
  count: number;
}

interface BrandStats {
  brand: string;
  count: number;
}

interface DetailedStats {
  deviceType: string;
  brand: string;
  count: number;
}

interface RepairStatistics {
  deviceTypeStats: DeviceTypeStats[];
  brandStats: BrandStats[];
  detailedStats: DetailedStats[];
  totalDevices: number;
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

// Komponente für Hersteller-Details-Dialog
function BrandDetailsDialog({ brand, detailedStats }: { brand: string; detailedStats: DetailedStats[] }) {
  const brandDetails = detailedStats.filter(item => item.brand === brand);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-sm flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {brand.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-left">{brand}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {brandDetails.reduce((sum, item) => sum + item.count, 0)} Reparaturen
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-sm flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {brand.charAt(0).toUpperCase()}
              </span>
            </div>
            {brand}
          </DialogTitle>
          <DialogDescription>
            Reparaturverteilung nach Gerätetyp
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {brandDetails.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {getDeviceIcon(item.deviceType)}
                <span className="font-medium">{item.deviceType}</span>
              </div>
              <Badge variant="secondary">
                {item.count} Reparaturen
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RepairStatisticsTab() {
  const { data: repairStats, isLoading, error } = useQuery<RepairStatistics>({
    queryKey: ["/api/superadmin/device-statistics"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Dedupliziere Hersteller und berechne Gesamtreparaturen
  const uniqueBrands = repairStats?.brandStats ? 
    repairStats.brandStats.sort((a, b) => b.count - a.count) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Lade Reparaturstatistiken...</p>
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
              <p className="text-destructive">Fehler beim Laden der Reparaturstatistiken</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!repairStats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Keine Reparaturdaten verfügbar</p>
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
            Anonymisierte Reparaturstatistiken
          </CardTitle>
          <CardDescription>
            DSGVO-konforme Auswertung aller systemweiten Reparaturen ohne Shop-Identifikation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-primary">
                {repairStats.totalDevices?.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-muted-foreground">Reparaturen insgesamt</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {repairStats.deviceTypeStats?.length || '0'}
              </div>
              <p className="text-sm text-muted-foreground">Verschiedene Gerätetypen</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {repairStats.brandStats?.length || '0'}
              </div>
              <p className="text-sm text-muted-foreground">Verschiedene Hersteller</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gerätetypen */}
        <Card>
          <CardHeader>
            <CardTitle>Reparaturen nach Gerätetyp</CardTitle>
            <CardDescription>
              Anzahl durchgeführter Reparaturen pro Gerätetyp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {repairStats.deviceTypeStats?.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(item.deviceType)}
                    <div>
                      <span className="font-medium">{item.deviceType || 'Unbekannt'}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {item.count?.toLocaleString() || '0'} Reparaturen
                  </Badge>
                </div>
              )) || []}
              {(!repairStats.deviceTypeStats || repairStats.deviceTypeStats.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Gerätetypen gefunden
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hersteller */}
        <Card>
          <CardHeader>
            <CardTitle>Reparaturen nach Hersteller</CardTitle>
            <CardDescription>
              Klicken Sie auf einen Hersteller für Details nach Gerätetyp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uniqueBrands.slice(0, 10).map((item, index) => (
                <BrandDetailsDialog 
                  key={index} 
                  brand={item.brand || 'Unbekannt'} 
                  detailedStats={repairStats?.detailedStats || []}
                />
              ))}
              {uniqueBrands.length === 0 && (
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
          <CardTitle>Detaillierte Reparatur-Aufschlüsselung</CardTitle>
          <CardDescription>
            Reparaturanzahl pro Gerätetyp und Hersteller (Top 20)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {repairStats.detailedStats?.slice(0, 20).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(item.deviceType)}
                  <div>
                    <span className="font-medium">{item.deviceType || 'Unbekannt'}</span>
                    <span className="text-muted-foreground"> • {item.brand || 'Unbekannt'}</span>
                  </div>
                </div>
                <Badge variant="secondary">
                  {item.count?.toLocaleString() || '0'} Reparaturen
                </Badge>
              </div>
            )) || []}
            {(!repairStats.detailedStats || repairStats.detailedStats.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine detaillierten Reparaturdaten gefunden
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DSGVO-Hinweis */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">DSGVO-Konformität</p>
              <p className="text-xs text-blue-600">
                Diese Statistiken sind vollständig anonymisiert und enthalten keine personenbezogenen Daten oder Shop-Identifikationen. 
                Sie dienen ausschließlich der Marktanalyse und Geschäftsintelligenz.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}