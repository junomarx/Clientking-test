import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, Monitor, Tablet, Gamepad2, HardDrive } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';

interface DeviceStats {
  deviceTypeStats: Array<{
    deviceType: string;
    count: number;
  }>;
  brandStats: Array<{
    brand: string;
    count: number;
  }>;
  detailedStats: Array<{
    deviceType: string;
    brand: string;
    count: number;
  }>;
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
    return <Monitor className="h-4 w-4" />;
  }
  if (type.includes('nintendo') || type.includes('playstation') || type.includes('xbox') || type.includes('konsole')) {
    return <Gamepad2 className="h-4 w-4" />;
  }
  return <HardDrive className="h-4 w-4" />;
};

export default function DeviceStatisticsTab() {
  const { data: deviceStats, isLoading, error } = useQuery<DeviceStats>({
    queryKey: ['/api/superadmin/device-statistics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/superadmin/device-statistics');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Lade Gerätestatistiken...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Fehler beim Laden der Gerätestatistiken: {error.message}
      </div>
    );
  }

  if (!deviceStats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Übersicht */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Gerätestatistiken Übersicht
          </CardTitle>
          <CardDescription>
            Statistische Auswertung aller Geräte in allen Reparaturaufträgen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {deviceStats?.totalDevices?.toLocaleString() || '0'}
          </div>
          <p className="text-sm text-muted-foreground">Geräte insgesamt</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geräte pro Gerätetyp */}
        <Card>
          <CardHeader>
            <CardTitle>Geräte pro Gerätetyp</CardTitle>
            <CardDescription>
              Anzahl der Geräte aufgeschlüsselt nach Gerätetyp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceStats.deviceTypeStats.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(item.deviceType)}
                    <span className="font-medium">{item.deviceType}</span>
                  </div>
                  <Badge variant="secondary">
                    {item.count.toLocaleString()}
                  </Badge>
                </div>
              ))}
              {deviceStats.deviceTypeStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Geräte gefunden
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Geräte pro Hersteller */}
        <Card>
          <CardHeader>
            <CardTitle>Geräte pro Hersteller</CardTitle>
            <CardDescription>
              Anzahl der Geräte aufgeschlüsselt nach Hersteller (alle Gerätetypen)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceStats.brandStats.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{item.brand}</span>
                  <Badge variant="secondary">
                    {item.count.toLocaleString()}
                  </Badge>
                </div>
              ))}
              {deviceStats.brandStats.length === 0 && (
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
            Geräte pro Gerätetyp und Hersteller
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gerätetyp</TableHead>
                <TableHead>Hersteller</TableHead>
                <TableHead className="text-right">Anzahl</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceStats.detailedStats.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="flex items-center gap-2">
                    {getDeviceIcon(item.deviceType)}
                    {item.deviceType}
                  </TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">
                      {item.count.toLocaleString()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {deviceStats.detailedStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    Keine detaillierten Daten verfügbar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}