import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { 
  FilePlus2, 
  Smartphone, 
  Database, 
  Download, 
  Users, 
  FileText, 
  Filter,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  Euro,
  BarChartIcon
} from 'lucide-react';
import { Repair } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { de } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Sub-Komponenten direkt aus den lokalen Dateien importieren
import { GeneralStats } from '@/components/statistics/parts/GeneralStats';
import { RevenueStats } from '@/components/statistics/parts/RevenueStats';
import { RecentRepairs } from '@/components/statistics/parts/RecentRepairs';

// Gemeinsame Typen
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

// Zeigt die verschiedenen Statistik-Tabs an
export function StatisticsTab() {
  // Tab state
  const [activeTab, setActiveTab] = useState<string>('general');
  
  // Zeitraum-Filter für Hauptstatistiken
  const [timeRange, setTimeRange] = useState<string>('all');
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  
  // Zeitraum-Filter für Umsatzstatistiken separat
  const [revenueTimeRange, setRevenueTimeRange] = useState<string>('all');
  const [revenueDateRange, setRevenueDateRange] = useState<{
    start: Date | undefined;
    end: Date | undefined;
  }>({
    start: undefined,
    end: undefined
  });
  const [revenueDatePickerOpen, setRevenueDatePickerOpen] = useState(false);

  // Dialogstatus für Umsatzstatistiken
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Refs für Diagramm-Export
  const deviceTypeChartRef = useRef<HTMLDivElement>(null);
  const brandChartRef = useRef<HTMLDivElement>(null);
  const issueChartRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);

  // Basisdaten für Statistiken laden
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/stats', timeRange, customDateStart, customDateEnd],
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
      } else if (timeRange === 'custom' && customDateStart && customDateEnd) {
        params.append('startDate', format(customDateStart, 'yyyy-MM-dd'));
        params.append('endDate', format(customDateEnd, 'yyyy-MM-dd'));
      }
      
      const res = await fetch(`/api/stats?${params.toString()}`);
      return await res.json();
    }
  });
  
  // Detaillierte Statistiken für Diagramme laden
  const queryParams = new URLSearchParams();
  if (timeRange === 'today') {
    queryParams.append('startDate', format(new Date(), 'yyyy-MM-dd'));
  } else if (timeRange === '7days') {
    queryParams.append('startDate', format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  } else if (timeRange === '30days') {
    queryParams.append('startDate', format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  } else if (timeRange === 'thisMonth') {
    queryParams.append('startDate', format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    queryParams.append('endDate', format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  } else if (timeRange === 'lastMonth') {
    const lastMonth = subMonths(new Date(), 1);
    queryParams.append('startDate', format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
    queryParams.append('endDate', format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
  } else if (timeRange === 'custom' && customDateStart && customDateEnd) {
    queryParams.append('startDate', format(customDateStart, 'yyyy-MM-dd'));
    queryParams.append('endDate', format(customDateEnd, 'yyyy-MM-dd'));
  }
  
  // Allgemeine detaillierte Statistiken
  const { data: detailedStats, isLoading: detailedStatsLoading } = useQuery<DetailedStats>({
    queryKey: ['/api/stats/detailed', timeRange, customDateStart, customDateEnd],
    queryFn: async () => {
      const res = await fetch(`/api/stats/detailed?${queryParams.toString()}`);
      return await res.json();
    }
  });

  // Separate Abfrage für Umsatzstatistiken
  const { data: revenueStats, isLoading: revenueStatsLoading } = useQuery<DetailedStats>({
    queryKey: ['/api/stats/detailed', 'revenue', revenueTimeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (revenueDateRange.start) params.append('startDate', revenueDateRange.start.toISOString());
      if (revenueDateRange.end) params.append('endDate', revenueDateRange.end.toISOString());
      params.append('revenueBasedOnPickup', 'true');
      
      const res = await fetch(`/api/stats/detailed?${params.toString()}`);
      return await res.json();
    }
  });

  // Alle Reparaturen für Export
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
  });

  // Kundeninformationen zur Anzeige von Namen
  const { data: customers } = useQuery({
    queryKey: ['/api/customers']
  });

  const isLoading = statsLoading || detailedStatsLoading || revenueStatsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            
            {timeRange === 'custom' && (
              <Button 
                variant="outline" 
                className="ml-2 whitespace-nowrap"
                onClick={() => setCustomDatePickerOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Bearbeiten
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            className="whitespace-nowrap"
            onClick={() => {
              setRevenueDialogOpen(true);
            }}
          >
            <Euro className="h-4 w-4 mr-1" />
            Umsatzanalyse
          </Button>
        </div>
      </div>
      
      {/* Popup für benutzerdefinierte Datumswahl */}
      <Popover open={customDatePickerOpen} onOpenChange={setCustomDatePickerOpen}>
        <PopoverContent className="flex flex-col p-2 space-y-2" align="end">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">Zeitraum wählen</span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={() => setCustomDatePickerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs mb-1 text-muted-foreground">Von</p>
              <CalendarComponent
                mode="single"
                selected={customDateStart}
                onSelect={setCustomDateStart}
                className="border rounded-md p-2"
                locale={de}
                disabled={{after: customDateEnd || new Date()}}
              />
            </div>
            
            <div>
              <p className="text-xs mb-1 text-muted-foreground">Bis</p>
              <CalendarComponent
                mode="single"
                selected={customDateEnd}
                onSelect={setCustomDateEnd}
                className="border rounded-md p-2"
                locale={de}
                disabled={{before: customDateStart, after: new Date()}}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={() => {
                setCustomDatePickerOpen(false);
              }}
              disabled={!customDateStart || !customDateEnd}
            >
              Übernehmen
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Zeitraum-Anzeige bei benutzerdefiniertem Zeitraum */}
      {timeRange === 'custom' && customDateStart && customDateEnd && (
        <div className="mb-4">
          <Badge variant="outline" className="mb-4">
            <Calendar className="h-3 w-3 mr-1" />
            Zeitraum: {format(customDateStart, 'dd.MM.yyyy')} - {format(customDateEnd, 'dd.MM.yyyy')}
          </Badge>
        </div>
      )}
      
      {/* Tab-Navigation für Statistikansichten */}
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto">
          <TabsTrigger value="general">
            <Database className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Allgemein</span>
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Smartphone className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Geräte</span>
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Kunden</span>
          </TabsTrigger>
        </TabsList>

        {/* Allgemeine Statistiken */}
        <TabsContent value="general" className="space-y-4">
          <GeneralStats 
            stats={stats} 
            detailedStats={detailedStats} 
            deviceTypeChartRef={deviceTypeChartRef}
            brandChartRef={brandChartRef}
            issueChartRef={issueChartRef}
          />
        </TabsContent>
        
        {/* Gerätestatistiken */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-4">
            <Card>
              <CardHeader>
                <CardTitle>Häufige Gerätetypen</CardTitle>
                <CardDescription>Verteilung nach Art der Geräte</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Component implementation */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Häufige Marken</CardTitle>
                <CardDescription>Verteilung nach Herstellern</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Component implementation */}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Kundenstatistiken */}
        <TabsContent value="customers" className="space-y-4">
          <RecentRepairs 
            detailedStats={detailedStats} 
            customers={customers} 
          />
        </TabsContent>
      </Tabs>
      
      {/* Dialog für erweiterte Umsatzanalyse */}
      <Dialog open={revenueDialogOpen} onOpenChange={setRevenueDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Umsatzanalyse</DialogTitle>
            <DialogDescription>
              Detaillierte Auswertung der Umsätze nach Zeiträumen und Kategorien.
            </DialogDescription>
          </DialogHeader>
          
          <RevenueStats 
            revenueStats={revenueStats}
            revenueTimeRange={revenueTimeRange}
            setRevenueTimeRange={setRevenueTimeRange}
            revenueDateRange={revenueDateRange}
            setRevenueDateRange={setRevenueDateRange}
            revenueDatePickerOpen={revenueDatePickerOpen}
            setRevenueDatePickerOpen={setRevenueDatePickerOpen}
            revenueChartRef={revenueChartRef}
            timeRangeOptions={timeRangeOptions}
            isExporting={isExporting}
            setIsExporting={setIsExporting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}