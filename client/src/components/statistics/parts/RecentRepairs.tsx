import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Repair } from '@shared/schema';

interface DetailedStats {
  byDeviceType: Record<string, number>;
  byBrand: Record<string, number>;
  byIssue: Record<string, number>;
  mostRecentRepairs: Repair[];
  revenue: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
    byDay: Record<string, number>;
  };
}

interface RecentRepairsProps {
  detailedStats: DetailedStats | undefined;
  customers: any; // Angepasster Typ für Kunden
}

type ExtendedRepair = Repair & { customerName?: string };

export const RecentRepairs: React.FC<RecentRepairsProps> = ({ 
  detailedStats,
  customers
}) => {
  // Repair-Daten mit Kundennamen anreichern
  const recentRepairs: ExtendedRepair[] = useMemo(() => {
    const repairs = detailedStats?.mostRecentRepairs || [];
    
    if (!customers || !Array.isArray(customers)) return repairs as ExtendedRepair[];
    
    return repairs.map(repair => {
      const customer = customers.find((c: any) => c.id === repair.customerId);
      return {
        ...repair,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unbekannt'
      } as ExtendedRepair;
    });
  }, [detailedStats, customers]);
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'inRepair': return 'secondary';
      case 'waitingForParts': return 'outline'; // Statt 'warning'
      case 'readyForPickup': return 'outline'; // Statt 'success'
      case 'pickedUp': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'Erledigt',
      'inRepair': 'In Reparatur',
      'waitingForParts': 'Wartet auf Teile',
      'readyForPickup': 'Abholbereit',
      'pickedUp': 'Abgeholt',
      'cancelled': 'Storniert',
      'outsourced': 'Ausgelagert'
    };
    return statusMap[status] || status;
  };
  
  if (!detailedStats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neueste Reparaturen</CardTitle>
        <CardDescription>Die 5 zuletzt erstellten Aufträge</CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {/* Desktop Tabelle (nur auf größeren Bildschirmen anzeigen) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-secondary/30">
              <tr>
                <th className="px-4 py-2">Auftragsnr.</th>
                <th className="px-4 py-2">Kunde</th>
                <th className="px-4 py-2">Gerät</th>
                <th className="px-4 py-2">Problem</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Datum</th>
              </tr>
            </thead>
            <tbody>
              {recentRepairs.map((repair) => (
                <tr key={repair.id} className="border-b hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium">{repair.orderCode}</td>
                  <td className="px-4 py-3">{repair.customerName}</td>
                  <td className="px-4 py-3">{repair.brand} {repair.model}</td>
                  <td className="px-4 py-3 whitespace-pre-wrap">{repair.issue ? repair.issue.split(',').join('\n') : ''}</td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusBadgeVariant(repair.status)}>
                      {getStatusLabel(repair.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{new Date(repair.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Ansicht (nur auf kleineren Bildschirmen anzeigen) */}
        <div className="md:hidden">
          {recentRepairs.map((repair) => (
            <div key={repair.id} className="p-4 border-b last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-medium">{repair.orderCode}</div>
                  <div className="text-xs text-muted-foreground">{repair.customerName}</div>
                </div>
                <Badge variant={getStatusBadgeVariant(repair.status)}>
                  {getStatusLabel(repair.status)}
                </Badge>
              </div>
              
              <div className="mt-2">
                <div className="text-sm">{repair.brand} {repair.model}</div>
                <div className="text-xs mt-1 text-muted-foreground whitespace-pre-wrap">{repair.issue ? repair.issue.split(',').join('\n') : ''}</div>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(repair.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};