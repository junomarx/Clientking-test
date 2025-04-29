import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FilePlus2, FileText, Database, Users, Download, ChartBar, Coins, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repair } from '@shared/schema';

// Basis-Statistiken
interface Stats {
  totalOrders: number;
  inRepair: number;
  completed: number;
  today: number;
  readyForPickup: number;
  outsourced: number;
  customerCount?: number;
  repairCount?: number;
  filteredRepairCount?: number;
}

// Detaillierte Statistiken für Diagramme und Analysen
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

// Neu aufgebaute Statistik-Komponente ohne die problematischen Hook-Abhängigkeiten
export function StatisticsTabRebuilt() {
  // Tab-Auswahl
  const [activeTab, setActiveTab] = useState('general');
  
  // Zeitraum-Filter
  const [timeRange, setTimeRange] = useState('all');
  
  // Basisdaten für Statistiken laden
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/stats', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (timeRange === 'today') {
        params.append('startDate', format(new Date(), 'yyyy-MM-dd'));
      } else if (timeRange === '7days') {
        params.append('startDate', format(subDays(new Date(), 7), 'yyyy-MM-dd'));
      } else if (timeRange === '30days') {
        params.append('startDate', format(subDays(new Date(), 30), 'yyyy-MM-dd'));
      } else if (timeRange === 'thisMonth') {
        params.append('startDate', format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        params.append('endDate', format(endOfMonth(new Date()), 'yyyy-MM-dd'));
      } else if (timeRange === 'lastMonth') {
        const lastMonth = subMonths(new Date(), 1);
        params.append('startDate', format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        params.append('endDate', format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
      }
      
      const res = await fetch(`/api/stats?${params.toString()}`);
      return await res.json();
    }
  });
  
  // Detaillierte Statistiken laden
  const { data: detailedStats, isLoading: detailedStatsLoading } = useQuery<DetailedStats>({
    queryKey: ['/api/stats/detailed', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (timeRange === 'today') {
        params.append('startDate', format(new Date(), 'yyyy-MM-dd'));
      } else if (timeRange === '7days') {
        params.append('startDate', format(subDays(new Date(), 7), 'yyyy-MM-dd'));
      } else if (timeRange === '30days') {
        params.append('startDate', format(subDays(new Date(), 30), 'yyyy-MM-dd'));
      } else if (timeRange === 'thisMonth') {
        params.append('startDate', format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        params.append('endDate', format(endOfMonth(new Date()), 'yyyy-MM-dd'));
      } else if (timeRange === 'lastMonth') {
        const lastMonth = subMonths(new Date(), 1);
        params.append('startDate', format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        params.append('endDate', format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
      }
      
      const res = await fetch(`/api/stats/detailed?${params.toString()}`);
      return await res.json();
    }
  });
  
  // Alle Reparaturen für Export
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
  });
  
  const isLoading = statsLoading || detailedStatsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Excel-Export-Funktion
  const exportToExcel = () => {
    if (!repairs || repairs.length === 0) return;

    // CSV-Daten vorbereiten
    const header = "Auftragsnummer,Gerät,Marke,Typ,Problem,Status,Erstellungsdatum\n";
    const csvData = repairs.map(repair => {
      return [
        repair.orderCode,
        repair.model,
        repair.brand,
        repair.deviceType,
        `"${repair.issue.replace(/"/g, '""')}"`, // Escapen von Anführungszeichen in CSV
        repair.status,
        new Date(repair.createdAt).toLocaleDateString(),
      ].join(',');
    }).join('\n');

    // CSV-Datei erstellen und herunterladen
    const csv = header + csvData;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'reparatur-statistik.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Mögliche Zeitraum-Optionen für Filter
  const timeRangeOptions = [
    { value: 'all', label: 'Alle Daten' },
    { value: 'today', label: 'Heute' },
    { value: '7days', label: 'Letzte 7 Tage' },
    { value: '30days', label: 'Letzte 30 Tage' },
    { value: 'thisMonth', label: 'Aktueller Monat' },
    { value: 'lastMonth', label: 'Letzter Monat' }
  ];
  
  return (
    <div>
      {/* Hauptüberschrift und Steuerelemente */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiken</h1>
          <p className="text-muted-foreground">
            Übersicht über alle Aufträge und Kennzahlen
          </p>
        </div>
        
        {/* Zeitraumfilter und Export-Optionen */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full sm:w-auto">
          <div className="flex w-full sm:w-auto">
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Zeitraum wählen" />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
        </div>
      </div>
      
      {/* Zeitraum-Anzeige wenn Filter aktiv */}
      {timeRange !== 'all' && (
        <div className="mb-4">
          <Badge variant="outline" className="mb-4">
            <Calendar className="h-3 w-3 mr-1" />
            Zeitraum: {timeRangeOptions.find(o => o.value === timeRange)?.label}
          </Badge>
        </div>
      )}
      
      {/* Tab-Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto">
          <TabsTrigger value="general">
            <Database className="h-4 w-4 mr-2" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="device">
            <ChartBar className="h-4 w-4 mr-2" />
            Geräte
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <Coins className="h-4 w-4 mr-2" />
            Umsatz
          </TabsTrigger>
        </TabsList>
        
        {/* Übersichts-Tab */}
        <TabsContent value="general" className="space-y-4">
          {/* Kennzahlenkarten */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
                <FilePlus2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">Aufträge</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Bearbeitung</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.inRepair || 0}</div>
                <p className="text-xs text-muted-foreground">offene Aufträge</p>
                {stats && stats.readyForPickup > 0 && (
                  <Badge variant="outline" className="mt-1">
                    {stats.readyForPickup} abholbereit
                  </Badge>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Abgeschlossen</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completed || 0}</div>
                <p className="text-xs text-muted-foreground">erledigte Aufträge</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kunden</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.customerCount || 0}</div>
                <p className="text-xs text-muted-foreground">registrierte Kunden</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Jüngste Reparaturen */}
          {detailedStats?.mostRecentRepairs && detailedStats.mostRecentRepairs.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Neueste Reparaturen</CardTitle>
                <CardDescription>Die zuletzt erfassten Aufträge</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detailedStats.mostRecentRepairs.slice(0, 5).map((repair) => (
                    <div key={repair.id} className="flex justify-between items-center bg-muted p-3 rounded-lg">
                      <div>
                        <div className="font-medium">{repair.orderCode}: {repair.brand} {repair.model}</div>
                        <div className="text-sm text-muted-foreground">
                          {repair.issue.length > 60 ? repair.issue.substring(0, 60) + '...' : repair.issue}
                        </div>
                      </div>
                      <Badge className="ml-2">
                        {repair.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Geräte-Tab */}
        <TabsContent value="device">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gerätetypen */}
            <Card>
              <CardHeader>
                <CardTitle>Nach Gerätetyp</CardTitle>
                <CardDescription>Verteilung der Reparaturen nach Gerätetyp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detailedStats && Object.entries(detailedStats.byDeviceType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count], index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="text-sm">{type}</div>
                        <div className="flex items-center">
                          <div className="w-32 bg-muted h-2 rounded-full overflow-hidden mr-2">
                            <div 
                              className="bg-primary h-full" 
                              style={{
                                width: `${Math.round((count / (stats?.totalOrders || 1)) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
            
            {/* Marken */}
            <Card>
              <CardHeader>
                <CardTitle>Nach Marke</CardTitle>
                <CardDescription>Verteilung der Reparaturen nach Marke</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detailedStats && Object.entries(detailedStats.byBrand)
                    .sort((a, b) => b[1] - a[1])
                    .map(([brand, count], index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="text-sm">{brand}</div>
                        <div className="flex items-center">
                          <div className="w-32 bg-muted h-2 rounded-full overflow-hidden mr-2">
                            <div 
                              className="bg-primary h-full" 
                              style={{
                                width: `${Math.round((count / (stats?.totalOrders || 1)) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
            
            {/* Probleme */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Häufigste Probleme</CardTitle>
                <CardDescription>Die am häufigsten vorkommenden Probleme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {detailedStats && Object.entries(detailedStats.byIssue)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([issue, count], index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="text-sm">{issue.length > 50 ? issue.substring(0, 50) + '...' : issue}</div>
                        <div className="flex items-center">
                          <div className="w-32 bg-muted h-2 rounded-full overflow-hidden mr-2">
                            <div 
                              className="bg-primary h-full" 
                              style={{
                                width: `${Math.round((count / (stats?.totalOrders || 1)) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Umsatz-Tab */}
        <TabsContent value="revenue">
          {detailedStats?.revenue ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Umsatz nach Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Umsatz nach Status</CardTitle>
                  <CardDescription>Verteilung des Umsatzes nach Reparaturstatus</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold pb-4">
                    {detailedStats.revenue.total.toFixed(2)} €
                  </div>
                  <div className="space-y-4">
                    {Object.entries(detailedStats.revenue.byStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, amount], index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium">{status}</div>
                            <div className="text-sm font-medium">{amount.toFixed(2)} €</div>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full" 
                              style={{
                                width: `${Math.round((amount / detailedStats.revenue.total) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
              
              {/* Umsatz nach Monaten */}
              <Card>
                <CardHeader>
                  <CardTitle>Umsatzentwicklung</CardTitle>
                  <CardDescription>
                    {timeRange.includes('day') ? 'Umsatz nach Tagen' : 'Umsatz nach Monaten'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-end justify-between">
                    {timeRange.includes('day') && detailedStats.revenue.byDay ? (
                      // Tägliche Umsatzanzeige
                      Object.entries(detailedStats.revenue.byDay)
                        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                        .map(([date, amount], index) => {
                          const maxAmount = Math.max(
                            ...Object.values(detailedStats.revenue.byDay),
                            1 // Vermeidet Division durch 0
                          );
                          const height = (amount / maxAmount) * 180; // Max Höhe 180px
                          
                          // Datum formatieren (DD.MM)
                          const parts = date.split('-');
                          const formattedDate = `${parts[2]}.${parts[1]}`;
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div className="text-xs mb-1">{amount.toFixed(0)} €</div>
                              <div 
                                className="w-8 bg-primary rounded-t-md"
                                style={{ height: `${height}px` }}
                              />
                              <div className="text-xs mt-1">{formattedDate}</div>
                            </div>
                          );
                        })
                    ) : (
                      // Monatliche Umsatzanzeige
                      Object.entries(detailedStats.revenue.byMonth)
                        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                        .map(([month, amount], index) => {
                          const maxAmount = Math.max(
                            ...Object.values(detailedStats.revenue.byMonth),
                            1 // Vermeidet Division durch 0
                          );
                          const height = (amount / maxAmount) * 180; // Max Höhe 180px
                          
                          // Monatsnamen
                          const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
                          const monthName = monthNames[parseInt(month) - 1];
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div className="text-xs mb-1">{amount.toFixed(0)} €</div>
                              <div 
                                className="w-8 bg-primary rounded-t-md"
                                style={{ height: `${height}px` }}
                              />
                              <div className="text-xs mt-1">{monthName}</div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              Keine Umsatzdaten verfügbar für den gewählten Zeitraum.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}