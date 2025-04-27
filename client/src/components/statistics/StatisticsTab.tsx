import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
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
  X
} from 'lucide-react';
import { Repair } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isSameDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { de } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Farben für Diagramme
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface DetailedStats {
  byDeviceType: Record<string, number>;
  byBrand: Record<string, number>;
  byIssue: Record<string, number>;
  mostRecentRepairs: Repair[];
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

const deviceTypeLabels: Record<string, string> = {
  'smartphone': 'Smartphones',
  'tablet': 'Tablets',
  'laptop': 'Laptops',
  'watch': 'Smartwatches',
  'spielekonsole': 'Spielekonsolen'
};

const timeRangeOptions = [
  { value: 'all', label: 'Alle Daten' },
  { value: '7days', label: 'Letzte 7 Tage' },
  { value: '30days', label: 'Letzte 30 Tage' },
  { value: 'thisMonth', label: 'Diesen Monat' },
  { value: 'lastMonth', label: 'Letzten Monat' },
  { value: 'custom', label: 'Benutzerdefiniert' }
];

export function StatisticsTab() {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [customDateRangeActive, setCustomDateRangeActive] = useState(false);
  const [dateSelectionMode, setDateSelectionMode] = useState<'start' | 'end'>('start');

  // Dialog öffnen, wenn benutzerdefinierter Zeitraum ausgewählt
  useEffect(() => {
    if (timeRange === 'custom' && !customDateRangeActive) {
      setCustomDateDialogOpen(true);
    }
  }, [timeRange, customDateRangeActive]);

  // Funktion für das Zurücksetzen des benutzerdefinierten Zeitraums
  const resetCustomDateRange = () => {
    setCustomDateRangeActive(false);
    setCustomDateStart(undefined);
    setCustomDateEnd(undefined);
    setTimeRange('all');
  };

  // Funktion zum Umschalten des Auswahlmodus und Setzen der Daten
  const handleDateSelect = (date: Date | undefined) => {
    if (dateSelectionMode === 'start') {
      setCustomDateStart(date);
      setDateSelectionMode('end');
    } else {
      setCustomDateEnd(date);
      // Automatisch zurück zum Start-Modus für die nächste Auswahl
      setDateSelectionMode('start');
    }
  };

  // Funktion für das Zurücksetzen der aktuellen Auswahl
  const resetDateSelection = () => {
    setCustomDateStart(undefined);
    setCustomDateEnd(undefined);
    setDateSelectionMode('start');
  };

  // Funktion für das Anwenden des benutzerdefinierten Zeitraums
  const applyCustomDateRange = () => {
    if (customDateStart && customDateEnd) {
      setCustomDateRangeActive(true);
      setCustomDateDialogOpen(false);
    } else {
      alert('Bitte wählen Sie ein Start- und Enddatum aus.');
    }
  };

  // Datumsbereich basierend auf der ausgewählten Option berechnen
  const getDateRange = () => {
    // Wenn benutzerdefinierter Zeitraum aktiv ist, verwende diese Daten
    if (customDateRangeActive && customDateStart && customDateEnd) {
      // Setze den Endzeitpunkt auf das Ende des Tages für korrekten Vergleich
      const endWithTime = new Date(customDateEnd);
      endWithTime.setHours(23, 59, 59, 999);
      return { start: customDateStart, end: endWithTime };
    }

    const now = new Date();
    switch(timeRange) {
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '30days':
        return { start: subDays(now, 30), end: now };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { 
          start: startOfMonth(lastMonth), 
          end: endOfMonth(lastMonth)
        };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const dateRange = getDateRange();
  
  // Abfrage für allgemeine Statistiken mit Zeitraumfilterung
  const statsQueryParams = new URLSearchParams();
  if (dateRange.start) statsQueryParams.append('startDate', dateRange.start.toISOString());
  if (dateRange.end) statsQueryParams.append('endDate', dateRange.end.toISOString());
  
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/stats', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/stats?${statsQueryParams.toString()}`);
      return await res.json();
    }
  });

  // Abfrage für detaillierte Statistiken mit Zeitraumfilterung
  const { data: detailedStats, isLoading: detailedStatsLoading } = useQuery<DetailedStats>({
    queryKey: ['/api/stats/detailed', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/stats/detailed?${statsQueryParams.toString()}`);
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

  // Daten für Gerätetype-Diagramm vorbereiten
  const deviceTypeData = detailedStats?.byDeviceType
    ? Object.entries(detailedStats.byDeviceType).map(([key, value]) => ({
        name: deviceTypeLabels[key] || key,
        value
      }))
    : [];

  // Daten für Marken-Diagramm vorbereiten
  const brandData = detailedStats?.byBrand
    ? Object.entries(detailedStats.byBrand).map(([key, value]) => ({
        name: key,
        value
      }))
    : [];

  // Daten für Probleme-Diagramm vorbereiten
  const issueData = detailedStats?.byIssue
    ? Object.entries(detailedStats.byIssue)
        .sort((a, b) => b[1] - a[1]) // Nach häufigkeit sortieren
        .slice(0, 8) // Zeige nur die 8 häufigsten Probleme
        .map(([key, value]) => ({
          name: key,
          value
        }))
    : [];

  // Neueste Reparaturen
  const recentRepairs = detailedStats?.mostRecentRepairs || [];

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

  // PDF-Export-Funktion
  const exportToPDF = () => {
    if (!repairs || repairs.length === 0) return;
    
    try {
      // PDF im A4-Format erstellen
      const pdf = new jsPDF();
      
      // Dokumententitel
      const title = `Reparaturstatistik ${timeRange !== 'all' ? '(gefiltert)' : ''}`;
      pdf.setFontSize(18);
      pdf.text(title, 14, 20);
      
      // Datum
      pdf.setFontSize(10);
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Statistik-Zusammenfassung
      pdf.setFontSize(12);
      pdf.text('Gesamtübersicht:', 14, 40);
      
      pdf.setFontSize(10);
      pdf.text(`Anzahl Kunden: ${stats?.customerCount || 0}`, 14, 50);
      pdf.text(`Gesamtzahl Reparaturen: ${stats?.repairCount || 0}`, 14, 55);
      pdf.text(`Reparaturen in Bearbeitung: ${stats?.inRepair || 0}`, 14, 60);
      pdf.text(`Abgeschlossene Reparaturen: ${stats?.completed || 0}`, 14, 65);
      pdf.text(`Abholbereit: ${stats?.readyForPickup || 0}`, 14, 70);
      pdf.text(`Bei Fremddienstleistern: ${stats?.outsourced || 0}`, 14, 75);
      
      // Zeitraumfilter-Info
      if (timeRange !== 'all') {
        const rangeOption = timeRangeOptions.find(opt => opt.value === timeRange);
        pdf.text(`Zeitraum: ${rangeOption?.label || timeRange}`, 14, 85);
        pdf.text(`Gefilterte Reparaturen: ${stats?.filteredRepairCount || 0}`, 14, 90);
      }
      
      // Reparaturtabelle
      pdf.setFontSize(12);
      pdf.text('Letzte Reparaturen:', 14, 100);
      
      // Tabellenkopf
      const headers = ['Auftragsnr.', 'Marke', 'Modell', 'Status', 'Datum'];
      const columnWidths = [30, 35, 50, 25, 35];
      let y = 110;
      
      // Spaltenüberschriften
      let x = 14;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      headers.forEach((header, i) => {
        pdf.text(header, x, y);
        x += columnWidths[i];
      });
      
      // Trennlinie
      pdf.line(14, y + 2, 200, y + 2);
      
      // Tabellendaten (nur die letzten 10 Reparaturen anzeigen)
      pdf.setFont('helvetica', 'normal');
      const tableData = repairs.slice(0, 10).map(repair => [
        repair.orderCode || `#${repair.id}`,
        repair.brand,
        repair.model,
        repair.status,
        new Date(repair.createdAt).toLocaleDateString()
      ]);
      
      // Tabellendaten einfügen
      tableData.forEach((row, rowIndex) => {
        y += 10;
        
        // Neue Seite, wenn am Ende der Seite
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        
        let x = 14;
        row.forEach((cell, cellIndex) => {
          // Texte abschneiden, um in Spalten zu passen
          const maxWidth = columnWidths[cellIndex] - 5;
          const text = cell.toString();
          const truncatedText = text.length > maxWidth / 2 
            ? text.substring(0, maxWidth / 2) + '...' 
            : text;
            
          pdf.text(truncatedText, x, y);
          x += columnWidths[cellIndex];
        });
      });
      
      // PDF herunterladen
      pdf.save('reparatur-statistik.pdf');
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Beim PDF-Export ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
    }
  };

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Reparaturstatistik
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Kunden:</span>
              <Badge variant="outline" className="bg-blue-50">
                {stats?.customerCount || 0}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Reparaturen gesamt:</span>
              <Badge variant="outline" className="bg-green-50">
                {stats?.repairCount || 0}
              </Badge>
            </div>
            {timeRange !== 'all' && (
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Gefilterte Reparaturen:</span>
                <Badge variant="outline" className="bg-purple-50">
                  {stats?.filteredRepairCount || 0}
                </Badge>
              </div>
            )}
            {customDateRangeActive && (
              <div className="flex items-center gap-1.5 ml-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">Zeitraum:</span>
                <Badge variant="outline" className="bg-indigo-50">
                  {customDateStart && format(customDateStart, 'dd.MM.yyyy')} - {customDateEnd && format(customDateEnd, 'dd.MM.yyyy')}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 text-gray-500" 
                  onClick={resetCustomDateRange}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <Select 
              value={timeRange} 
              onValueChange={setTimeRange}
              disabled={customDateRangeActive} // Deaktivieren wenn benutzerdefinierter Bereich aktiv
            >
              <SelectTrigger className="w-[180px]">
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
          
          <div className="flex gap-2">
            <div className="flex gap-1 items-center bg-gray-100 p-1 rounded-lg">
              <Button 
                variant={exportFormat === 'excel' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setExportFormat('excel')}
              >
                Excel
              </Button>
              <Button 
                variant={exportFormat === 'pdf' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setExportFormat('pdf')}
              >
                PDF
              </Button>
            </div>
            <Button 
              onClick={handleExport} 
              variant="default" 
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {/* Dialog für benutzerdefinierten Datumsbereich */}
      <Dialog open={customDateDialogOpen} onOpenChange={setCustomDateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zeitraum auswählen</DialogTitle>
            <DialogDescription>
              Wählen Sie einen benutzerdefinierten Zeitraum für Ihre Statistik aus.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">
                {dateSelectionMode === 'start' ? 'Startdatum auswählen' : 'Enddatum auswählen'}
              </h3>
              
              <div className="flex items-center gap-2">
                {/* Zeigt die aktuelle Auswahl an */}
                {customDateStart && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Start: {format(customDateStart, 'dd.MM.yyyy')}
                  </Badge>
                )}
                
                {customDateEnd && (
                  <Badge className="bg-green-100 text-green-800">
                    Ende: {format(customDateEnd, 'dd.MM.yyyy')}
                  </Badge>
                )}
                
                {/* Button zum Zurücksetzen */}
                {(customDateStart || customDateEnd) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={resetDateSelection} 
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="border rounded-md p-3">
              <CalendarComponent
                mode="single"
                selected={dateSelectionMode === 'start' ? customDateStart : customDateEnd}
                onSelect={handleDateSelect}
                locale={de}
                disabled={(date) => {
                  if (dateSelectionMode === 'start') {
                    return customDateEnd ? isAfter(date, customDateEnd) : false;
                  } else {
                    return customDateStart ? isBefore(date, customDateStart) : false;
                  }
                }}
                className="mx-auto"
              />
            </div>
            
            {/* Hilfetext */}
            <p className="text-xs text-muted-foreground mt-1">
              {dateSelectionMode === 'start' 
                ? "Wählen Sie das Startdatum aus." 
                : "Wählen Sie das Enddatum aus."}
            </p>
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => {
              setCustomDateDialogOpen(false);
              if (timeRange === 'custom' && !customDateRangeActive) {
                setTimeRange('all');
              }
            }}>
              Abbrechen
            </Button>
            <Button onClick={applyCustomDateRange}>
              Anwenden
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <Database className="mr-2 h-4 w-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Smartphone className="mr-2 h-4 w-4" />
            Nach Gerätetyp
          </TabsTrigger>
          <TabsTrigger value="issues">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Nach Problem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gerätetyp-Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Reparaturen nach Gerätetyp</CardTitle>
                <CardDescription>Verteilung der Reparaturen nach Gerätetyp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Marken-Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Hersteller</CardTitle>
                <CardDescription>Die häufigsten Marken</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={brandData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Anzahl" fill="#8884d8">
                        {brandData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Häufige Probleme */}
          <Card>
            <CardHeader>
              <CardTitle>Häufigste Probleme</CardTitle>
              <CardDescription>Die am häufigsten aufgetretenen Probleme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={issueData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Anzahl" fill="#8884d8">
                      {issueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Neueste Reparaturen */}
          <Card>
            <CardHeader>
              <CardTitle>Neueste Reparaturen</CardTitle>
              <CardDescription>Die 5 zuletzt erstellten Aufträge</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Auftragsnr.</th>
                      <th className="px-6 py-3">Marke</th>
                      <th className="px-6 py-3">Modell</th>
                      <th className="px-6 py-3">Problem</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRepairs.map((repair) => (
                      <tr key={repair.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{repair.orderCode}</td>
                        <td className="px-6 py-4">{repair.brand}</td>
                        <td className="px-6 py-4">{repair.model}</td>
                        <td className="px-6 py-4">{repair.issue.substring(0, 30)}...</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            repair.status === 'fertig' 
                              ? 'bg-green-100 text-green-800' 
                              : repair.status === 'in_reparatur' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {repair.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">{new Date(repair.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Detaillierte Ansicht nach Gerätetyp</CardTitle>
              <CardDescription>Alle Reparaturen nach Gerätetyp aufgeschlüsselt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={160}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Detaillierte Ansicht nach Problem</CardTitle>
              <CardDescription>Analyse der häufigsten Probleme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={issueData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Anzahl" fill="#8884d8">
                      {issueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}