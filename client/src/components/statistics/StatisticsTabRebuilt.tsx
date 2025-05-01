import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FilePlus2, FileText, Database, Users, Download, ChartBar, Coins, Calendar, PackageOpen, Truck, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { SimpleDatePicker } from './SimpleDatePicker';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repair } from '@shared/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Hilfsfunktion zum Prüfen, ob der Benutzer detaillierte Statistiken sehen darf
const checkCanViewDetailedStats = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/can-view-detailed-stats');
    if (!response.ok) return false;
    const data = await response.json();
    return data.canViewDetailedStats;
  } catch (error) {
    console.error('Fehler bei der Prüfung der Statistik-Berechtigungen:', error);
    return false;
  }
};

// Basis-Statistiken
interface Stats {
  totalOrders: number;
  inRepair: number;
  completed: number;
  today: number;
  readyForPickup: number;
  outsourced: number;
  received: number; // Neu: Anzahl der eingegangenen Reparaturen
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

interface StatisticsTabRebuiltProps {
  onTabChange?: (tab: 'dashboard' | 'repairs' | 'customers' | 'statistics') => void;
}

// Neu aufgebaute Statistik-Komponente ohne die problematischen Hook-Abhängigkeiten
export function StatisticsTabRebuilt({ onTabChange }: StatisticsTabRebuiltProps) {
  // Tab-Auswahl
  const [activeTab, setActiveTab] = useState('general');
  
  // Zeitraum-Filter
  const [timeRange, setTimeRange] = useState('all');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  const [customDateRangeActive, setCustomDateRangeActive] = useState(false);
  
  // Berechtigung für detaillierte Statistiken
  const [canViewDetailedStats, setCanViewDetailedStats] = useState<boolean | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  
  // Prüfung der Berechtigung beim Laden der Komponente
  useEffect(() => {
    setIsCheckingPermission(true);
    checkCanViewDetailedStats()
      .then(canView => {
        setCanViewDetailedStats(canView);
        // Wenn keine Berechtigung für detaillierte Statistiken, dann auf Basic-Tab wechseln
        if (!canView && activeTab !== 'general') {
          setActiveTab('general');
        }
      })
      .catch(() => {
        setCanViewDetailedStats(false);
        setActiveTab('general');
      })
      .finally(() => {
        setIsCheckingPermission(false);
      });
  }, []);
  
  // Funktion zum Navigieren zur Reparaturseite mit Statusfilter
  const navigateToRepairsWithFilter = (status: string) => {
    // Statusparameter konvertieren
    let statusParam = '';
    
    // Karte-Status zum URL-Parameter konvertieren
    switch(status) {
      case 'Eingegangen':
        statusParam = 'eingegangen';
        break;
      case 'In Reparatur':
        statusParam = 'in_reparatur';
        break;
      case 'Außer Haus':
        statusParam = 'ausser_haus';
        break;
      case 'Abholbereit':
        statusParam = 'fertig';
        break;
      case 'Abgeholt':
        statusParam = 'abgeholt';
        break;
      default:
        statusParam = status.toLowerCase();
    }
    
    // Setze den URL-Parameter, ohne die Seite zu wechseln
    const currentUrl = window.location.pathname;
    const newUrl = `${currentUrl}?status=${statusParam}`;
    window.history.pushState({}, '', newUrl);
    
    // Wechsle zum Repairs-Tab
    if (onTabChange) {
      onTabChange('repairs');
    }
  };
  
  // Basisdaten für Statistiken laden
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/stats', timeRange, customDateRangeActive, customDateStart, customDateEnd],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Benutzerdefinierter Zeitraum
      if (timeRange === 'custom' && customDateRangeActive && customDateStart && customDateEnd) {
        params.append('startDate', format(customDateStart, 'yyyy-MM-dd'));
        params.append('endDate', format(customDateEnd, 'yyyy-MM-dd'));
      }
      // Vordefinierte Zeiträume
      else if (timeRange === 'today') {
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
    queryKey: ['/api/stats/detailed', timeRange, customDateRangeActive, customDateStart, customDateEnd],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Benutzerdefinierter Zeitraum
      if (timeRange === 'custom' && customDateRangeActive && customDateStart && customDateEnd) {
        params.append('startDate', format(customDateStart, 'yyyy-MM-dd'));
        params.append('endDate', format(customDateEnd, 'yyyy-MM-dd'));
      }
      // Vordefinierte Zeiträume
      else if (timeRange === 'today') {
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
    { value: 'lastMonth', label: 'Letzter Monat' },
    { value: 'custom', label: 'Benutzerdefiniert' }
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
              onValueChange={(value) => {
                setTimeRange(value);
                // Beim Wechsel zu "Benutzerdefiniert" das Datumsfenster öffnen
                if (value === 'custom') {
                  setCustomDatePickerOpen(true);
                } else {
                  setCustomDateRangeActive(false);
                }
              }}
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
      
      {/* Datumsauswahl für benutzerdefinierten Zeitraum */}
      <SimpleDatePicker 
        isOpen={customDatePickerOpen}
        onClose={() => setCustomDatePickerOpen(false)}
        startDate={customDateStart}
        endDate={customDateEnd}
        onStartDateChange={setCustomDateStart}
        onEndDateChange={setCustomDateEnd}
        onApply={() => {
          if (customDateStart && customDateEnd) {
            setCustomDateRangeActive(true);
            setCustomDatePickerOpen(false);
          }
        }}
      />
      
      {/* Zeitraum-Anzeige wenn Filter aktiv */}
      {(timeRange !== 'all' || customDateRangeActive) && (
        <div className="mb-4">
          <Badge variant="outline" className="mb-4">
            <Calendar className="h-3 w-3 mr-1" />
            Zeitraum: {timeRange === 'custom' && customDateRangeActive 
              ? `${customDateStart?.toLocaleDateString()} - ${customDateEnd?.toLocaleDateString()}`
              : timeRangeOptions.find(o => o.value === timeRange)?.label}
          </Badge>
        </div>
      )}
      
      {/* Hinweis für Basic-Nutzer */}
      {canViewDetailedStats === false && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eingeschränkte Ansicht</AlertTitle>
          <AlertDescription>
            Detaillierte Statistiken sind nur im Professional- und Enterprise-Paket verfügbar.
            Für erweiterte Analysen und Auswertungen upgraden Sie bitte Ihr Paket.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Tab-Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto">
          <TabsTrigger value="general">
            <Database className="h-4 w-4 mr-2" />
            Übersicht
          </TabsTrigger>
          
          <TooltipProvider>
            <Tooltip open={canViewDetailedStats === false ? undefined : false}>
              <TooltipTrigger asChild>
                <div>
                  <TabsTrigger 
                    value="device" 
                    disabled={canViewDetailedStats === false || isCheckingPermission}
                    className="relative"
                  >
                    {canViewDetailedStats === false && (
                      <Lock className="h-3 w-3 absolute top-1 right-1 text-amber-500" />
                    )}
                    <ChartBar className="h-4 w-4 mr-2" />
                    Geräte
                  </TabsTrigger>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Nur im Professional- und Enterprise-Paket verfügbar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip open={canViewDetailedStats === false ? undefined : false}>
              <TooltipTrigger asChild>
                <div>
                  <TabsTrigger 
                    value="revenue" 
                    disabled={canViewDetailedStats === false || isCheckingPermission}
                    className="relative"
                  >
                    {canViewDetailedStats === false && (
                      <Lock className="h-3 w-3 absolute top-1 right-1 text-amber-500" />
                    )}
                    <Coins className="h-4 w-4 mr-2" />
                    Umsatz
                  </TabsTrigger>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Nur im Professional- und Enterprise-Paket verfügbar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TabsList>
        
        {/* Übersichts-Tab */}
        <TabsContent value="general" className="space-y-4">
          {/* Kennzahlenkarten */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            
            <Card 
              className="cursor-pointer hover:border-primary transition-colors" 
              onClick={() => navigateToRepairsWithFilter('Eingegangen')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eingegangen</CardTitle>
                <PackageOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.received || 0}</div>
                <p className="text-xs text-muted-foreground">neue Aufträge</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:border-primary transition-colors" 
              onClick={() => navigateToRepairsWithFilter('In Reparatur')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Reparatur</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.inRepair || 0}</div>
                <p className="text-xs text-muted-foreground">in Bearbeitung</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:border-primary transition-colors" 
              onClick={() => navigateToRepairsWithFilter('Außer Haus')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Außer Haus</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.outsourced || 0}</div>
                <p className="text-xs text-muted-foreground">ausgelagert</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:border-primary transition-colors" 
              onClick={() => navigateToRepairsWithFilter('Abholbereit')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Abholbereit</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.readyForPickup || 0}</div>
                <p className="text-xs text-muted-foreground">fertig</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:border-primary transition-colors" 
              onClick={() => navigateToRepairsWithFilter('Abgeholt')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Abgeholt</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats?.completed || 0) - (stats?.readyForPickup || 0)}</div>
                <p className="text-xs text-muted-foreground">abgeschlossen</p>
              </CardContent>
            </Card>
            
            <div className="col-span-2 lg:col-span-3 xl:col-span-6">
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
          {canViewDetailedStats === false ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Premium-Funktion</h3>
              <p className="text-muted-foreground">
                Die detaillierte Geräte-Statistik ist nur im Professional- und Enterprise-Paket verfügbar.
              </p>
            </div>
          ) : (
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
          )}
        </TabsContent>
        
        {/* Umsatz-Tab */}
        <TabsContent value="revenue">
          {canViewDetailedStats === false ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Premium-Funktion</h3>
              <p className="text-muted-foreground">
                Die detaillierte Umsatz-Statistik ist nur im Professional- und Enterprise-Paket verfügbar.
              </p>
            </div>
          ) : detailedStats?.revenue ? (
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