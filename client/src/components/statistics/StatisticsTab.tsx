import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Euro,
  BarChart as BarChartIcon
} from 'lucide-react';
import { Repair } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isSameDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { de } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  revenue: {
    total: number;
    byStatus: Record<string, number>;
    byMonth: Record<string, number>;
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

const deviceTypeLabels: Record<string, string> = {
  'smartphone': 'Smartphones',
  'tablet': 'Tablets',
  'laptop': 'Laptops',
  'watch': 'Smartwatches',
  'spielekonsole': 'Spielekonsolen'
};

// Extrahiere Preise aus estimatedCost-Feldern
function extractPrice(priceString: string | null): number {
  if (!priceString) return 0;
  
  // Entferne alle nicht-numerischen Zeichen außer Punkt und Komma
  const cleaned = priceString.replace(/[^0-9.,]/g, '');
  
  // Ersetze Komma durch Punkt für die korrekte Konvertierung
  const normalized = cleaned.replace(',', '.');
  
  // Konvertiere zu Nummer
  const price = parseFloat(normalized);
  
  return isNaN(price) ? 0 : price;
}

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
  const [revenueTimeRange, setRevenueTimeRange] = useState<string>('all');
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [customDateRangeActive, setCustomDateRangeActive] = useState(false);
  const [dateSelectionMode, setDateSelectionMode] = useState<'start' | 'end'>('start');
  const [isExporting, setIsExporting] = useState(false);
  
  // Referenzen für die Chart-Komponenten
  const deviceTypeChartRef = useRef<HTMLDivElement>(null);
  const brandChartRef = useRef<HTMLDivElement>(null);
  const issueChartRef = useRef<HTMLDivElement>(null);
  const revenueChartRef = useRef<HTMLDivElement>(null);

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
  const getDateRange = (rangeType: string) => {
    // Wenn benutzerdefinierter Zeitraum aktiv ist, verwende diese Daten
    if (rangeType === timeRange && customDateRangeActive && customDateStart && customDateEnd) {
      // Setze den Endzeitpunkt auf das Ende des Tages für korrekten Vergleich
      const endWithTime = new Date(customDateEnd);
      endWithTime.setHours(23, 59, 59, 999);
      return { start: customDateStart, end: endWithTime };
    }

    const now = new Date();
    switch(rangeType) {
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

  // Separate date ranges for general statistics and revenue statistics
  const dateRange = getDateRange(timeRange);
  const revenueDateRange = getDateRange(revenueTimeRange);
  
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
  
  // Separate Abfrage für Umsatzstatistiken mit eigenem Zeitraumfilter
  const revenueQueryParams = new URLSearchParams();
  if (revenueDateRange.start) revenueQueryParams.append('startDate', revenueDateRange.start.toISOString());
  if (revenueDateRange.end) revenueQueryParams.append('endDate', revenueDateRange.end.toISOString());
  // Parameter für die Umsatzberechnung basierend auf Abholung (pickedUp status)
  revenueQueryParams.append('revenueBasedOnPickup', 'true');
  
  const { data: revenueStats, isLoading: revenueStatsLoading } = useQuery<DetailedStats>({
    queryKey: ['/api/stats/detailed', 'revenue', revenueTimeRange],
    queryFn: async () => {
      const res = await fetch(`/api/stats/detailed?${revenueQueryParams.toString()}`);
      return await res.json();
    }
  });

  // Alle Reparaturen für Export
  const { data: repairs } = useQuery<Repair[]>({
    queryKey: ['/api/repairs'],
  });

  const isLoading = statsLoading || detailedStatsLoading || revenueStatsLoading;

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
  
  // Daten für Umsatz-Diagramme für allgemeine Statistiken vorbereiten
  const revenueByStatusData = detailedStats?.revenue?.byStatus
    ? Object.entries(detailedStats.revenue.byStatus).map(([key, value]) => ({
        name: key,
        value: parseFloat(value.toFixed(2))  // Die Werte kommen jetzt direkt als Euro
      }))
    : [];
    
  const revenueByMonthData = detailedStats?.revenue?.byMonth
    ? Object.entries(detailedStats.revenue.byMonth)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // Nach Monatsnummer sortieren
        .map(([key, value]) => {
          // Monatsname basierend auf der Nummer erstellen (1 = Januar, usw.)
          const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
          const monthIndex = parseInt(key) - 1; // 0-basierter Index
          const name = monthNames[monthIndex];
          return {
            name,
            value: parseFloat(value.toFixed(2)) // Die Werte kommen jetzt direkt als Euro
          };
        })
    : [];
    
  // Daten für die separate Umsatz-Ansicht mit eigener Filterung
  const filteredRevenueByStatusData = revenueStats?.revenue?.byStatus
    ? Object.entries(revenueStats.revenue.byStatus).map(([key, value]) => ({
        name: key,
        value: parseFloat(value.toFixed(2))
      }))
    : [];
    
  const filteredRevenueByMonthData = revenueStats?.revenue?.byMonth
    ? Object.entries(revenueStats.revenue.byMonth)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([key, value]) => {
          const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
          const monthIndex = parseInt(key) - 1;
          const name = monthNames[monthIndex];
          return {
            name,
            value: parseFloat(value.toFixed(2))
          };
        })
    : [];

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

  // PDF-Export-Funktion mit Diagrammen
  const exportToPDF = async () => {
    if (!repairs || repairs.length === 0) return;
    
    try {
      setIsExporting(true); // Exportstatus setzen

      // PDF im A4-Format erstellen (Hochformat)
      const pdf = new jsPDF();
      
      // Hintergrund und Design für das Dokument
      pdf.setFillColor(245, 247, 250); // Heller Hintergrund für Kopfbereich
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setDrawColor(0, 110, 183); // Blaue Linie
      pdf.setLineWidth(0.5);
      pdf.line(14, 40, 196, 40);
      
      // Dokumententitel
      const title = `Reparaturstatistik ${timeRange !== 'all' ? '(gefiltert)' : ''}`;
      pdf.setFontSize(22);
      pdf.setTextColor(30, 41, 59); // Dunkelblau für den Titel
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 14, 20);
      
      // Datum
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // Grau für das Datum
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Zeitraumfilter-Info
      if (timeRange !== 'all') {
        const rangeOption = timeRangeOptions.find(opt => opt.value === timeRange);
        pdf.text(`Zeitraum: ${rangeOption?.label || timeRange}`, 120, 30);
        if (stats?.filteredRepairCount !== undefined) {
          pdf.text(`Gefilterte Reparaturen: ${stats.filteredRepairCount}`, 160, 30);
        }
      }
      
      // Überschrift für die Gesamtübersicht
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Gesamtübersicht', 14, 55);
      
      // Tabellarische Übersicht erstellen
      pdf.setFillColor(240, 249, 255); // Heller blauer Hintergrund für Tabelle
      pdf.rect(14, 60, 180, 45, 'F'); // Hintergrund für Tabelle
      
      // Tabelle mit Werten - erste Spalte
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kategorie', 17, 67);
      pdf.text('Anzahl Kunden', 17, 75);
      pdf.text('Reparaturen gesamt', 17, 83);
      pdf.text('In Bearbeitung', 17, 91);
      pdf.text('Abgeschlossen', 17, 99);
      
      // Zweite Spalte (Werte)
      pdf.setFont('helvetica', 'normal');
      pdf.text('Wert', 70, 67);
      pdf.text(`${stats?.customerCount || 0}`, 70, 75);
      pdf.text(`${stats?.repairCount || 0}`, 70, 83);
      pdf.text(`${stats?.inRepair || 0}`, 70, 91);
      pdf.text(`${stats?.completed || 0}`, 70, 99);
      
      // Umsatzdaten in der Tabelle
      if (detailedStats?.revenue) {
        // Dritte Spalte (Überschriften)
        pdf.setFont('helvetica', 'bold');
        pdf.text('Umsatz', 110, 67);
        pdf.text('Gesamtumsatz', 110, 75);
        pdf.text('Durchschnitt pro Reparatur', 110, 83);
        
        // Vierte Spalte (Umsatzwerte)
        pdf.setFont('helvetica', 'normal');
        pdf.text('Wert (€)', 170, 67);
        pdf.text(`${detailedStats.revenue.total.toFixed(2)} €`, 170, 75);
        const avgRevenue = stats?.completed 
          ? (detailedStats.revenue.total / stats.completed).toFixed(2)
          : '0.00';
        pdf.text(`${avgRevenue} €`, 170, 83);
      }
      
      // Diagramme nebeneinander anordnen
      // Links: Gerätetypen
      if (deviceTypeChartRef.current) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Verteilung nach Gerätetyp', 14, 120);
        
        try {
          const deviceTypeCanvas = await html2canvas(deviceTypeChartRef.current, {
            scale: 1,
            backgroundColor: null,
            logging: false
          });
          
          // Kleineres Bild für das PDF
          const imgWidth = 90;
          const imgHeight = (deviceTypeCanvas.height * imgWidth) / deviceTypeCanvas.width;
          
          // Diagramm als Bild zum PDF hinzufügen
          const deviceTypeImg = deviceTypeCanvas.toDataURL('image/png');
          pdf.addImage(deviceTypeImg, 'PNG', 14, 125, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Gerätetyp-Diagramms:', e);
        }
      }
      
      // Rechts: Hersteller-Diagramm
      if (brandChartRef.current) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Verteilung nach Herstellern', 110, 120);
        
        try {
          const brandCanvas = await html2canvas(brandChartRef.current, {
            scale: 1,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = 90;
          const imgHeight = (brandCanvas.height * imgWidth) / brandCanvas.width;
          
          const brandImg = brandCanvas.toDataURL('image/png');
          pdf.addImage(brandImg, 'PNG', 110, 125, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Hersteller-Diagramms:', e);
        }
      }
      
      // Problem-Diagramm unten
      if (issueChartRef.current) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Verteilung nach Problemen', 14, 210);
        
        try {
          const issueCanvas = await html2canvas(issueChartRef.current, {
            scale: 1,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = 180;
          const imgHeight = Math.min(70, (issueCanvas.height * imgWidth) / issueCanvas.width);
          
          const issueImg = issueCanvas.toDataURL('image/png');
          pdf.addImage(issueImg, 'PNG', 14, 215, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Problem-Diagramms:', e);
        }
      }
      
      // Umsatz-Diagramm wenn verfügbar
      if (revenueChartRef.current && detailedStats?.revenue) {
        try {
          // Neue Seite für Umsatzstatistiken
          pdf.addPage();
          
          // Titel für Umsatz-Seite
          pdf.setFontSize(16);
          pdf.setTextColor(30, 41, 59);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Umsatzstatistik', 14, 20);
          
          // Umsatzübersicht
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Übersicht', 14, 30);
          
          // Tabelle für Umsatzübersicht
          pdf.setFillColor(240, 249, 255);
          pdf.rect(14, 35, 180, 25, 'F');
          
          // Tabelle mit Werten
          pdf.setFontSize(9);
          pdf.setTextColor(30, 41, 59);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Kategorie', 17, 42);
          pdf.text('Gesamtumsatz', 17, 50);
          pdf.text('Durchschnitt pro Reparatur', 17, 58);
          
          // Werte
          pdf.setFont('helvetica', 'normal');
          pdf.text('Wert', 100, 42);
          pdf.text(`${detailedStats.revenue.total.toFixed(2)} €`, 100, 50);
          const avgRevenue = stats?.completed 
            ? (detailedStats.revenue.total / stats.completed).toFixed(2)
            : '0.00';
          pdf.text(`${avgRevenue} €`, 100, 58);
          
          // Umsatz nach Status
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Umsatz nach Status', 14, 75);
          
          const revenueCanvas = await html2canvas(revenueChartRef.current, {
            scale: 1,
            backgroundColor: null,
            logging: false
          });
          
          const revenueImgWidth = 180;
          const revenueImgHeight = Math.min(90, (revenueCanvas.height * revenueImgWidth) / revenueCanvas.width);
          
          const revenueImg = revenueCanvas.toDataURL('image/png');
          pdf.addImage(revenueImg, 'PNG', 14, 80, revenueImgWidth, revenueImgHeight);
          
          // Footer für Umsatz-Seite
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Seite 2/2 | Handyshop | Umsatz-Statistik`, 14, 290);
          
        } catch (e) {
          console.error('Fehler beim Erfassen des Umsatz-Diagramms:', e);
        }
      }
      
      // Footer mit Seitenzahl - beachte, dass es 2 Seiten gibt, wenn Umsatzdiagramm vorhanden ist
      const totalPages = (revenueChartRef.current && detailedStats?.revenue) ? 2 : 1;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Seite 1/${totalPages} | Handyshop | Statistik-Export`, 14, 290);
      
      // PDF herunterladen
      pdf.save('reparatur-statistik.pdf');
      
      setIsExporting(false); // Exportstatus zurücksetzen
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      setIsExporting(false);
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
{/* Umsatz-Anzeige entfernt, wird nur im Umsatz-Tab angezeigt */}
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
          <TabsTrigger value="revenue">
            <Euro className="mr-2 h-4 w-4" />
            Umsatz
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
                <div className="h-[300px]" ref={deviceTypeChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Geräte`, 'Anzahl']} />
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
                <div className="h-[300px]" ref={brandChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={brandData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} Geräte`, 'Anzahl']} />
                      <Legend />
                      <Bar dataKey="value" name="Anzahl" fill="#8884d8" label={{ position: 'top', fill: '#666' }}>
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
              <div className="h-[300px]" ref={issueChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={issueData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip formatter={(value) => [`${value} Fälle`, 'Anzahl']} />
                    <Legend />
                    <Bar dataKey="value" name="Anzahl" fill="#8884d8" label={{ position: 'right', fill: '#666' }}>
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
                      <th className="px-6 py-3">Preis</th>
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
                        <td className="px-6 py-4 font-medium text-right">
                          {repair.estimatedCost ? extractPrice(repair.estimatedCost).toFixed(2) : '0.00'} €
                        </td>
                        <td className="px-6 py-4">{new Date(repair.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {/* Summenzeile für abgeholte Reparaturen */}
                    <tr className="bg-gray-100 font-medium border-t-2 border-gray-300">
                      <td className="px-6 py-4" colSpan={4}>Summe abgeholter Reparaturen</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">abgeholt</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-right">
                        {recentRepairs
                          .filter(repair => repair.status === 'abgeholt')
                          .reduce((sum, repair) => {
                            const cost = repair.estimatedCost ? extractPrice(repair.estimatedCost) : 0;
                            return sum + cost;
                          }, 0)
                          .toFixed(2)} €
                      </td>
                      <td className="px-6 py-4"></td>
                    </tr>
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
                    <Tooltip formatter={(value) => [`${value} Geräte`, 'Anzahl']} />
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
                    <Tooltip formatter={(value) => [`${value} Fälle`, 'Anzahl']} />
                    <Legend />
                    <Bar dataKey="value" name="Anzahl" fill="#8884d8" label={{ position: 'right', fill: '#666' }}>
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

        <TabsContent value="revenue">
          {/* Umsatz-Filter-Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-1.5">
              <h3 className="text-md font-semibold text-primary">Umsatzstatistik</h3>
              {revenueStats?.revenue && (
                <Badge variant="outline" className="bg-amber-50 ml-2">
                  {revenueStats.revenue.total.toFixed(2)} €
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <Select 
                value={revenueTimeRange} 
                onValueChange={setRevenueTimeRange}
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
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Gesamtumsatz Card */}
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Umsatzübersicht</CardTitle>
                <CardDescription>Gesamtumsatz und Verteilung</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
                    <Euro className="h-8 w-8 text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-blue-800">Gesamtumsatz</p>
                    <h3 className="text-3xl font-bold text-blue-900">
                      {revenueStats?.revenue ? revenueStats.revenue.total.toFixed(2) : '0.00'} €
                    </h3>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg">
                    <BarChartIcon className="h-8 w-8 text-green-600 mb-2" />
                    <p className="text-sm font-medium text-green-800">Abgeschlossene Reparaturen</p>
                    <h3 className="text-3xl font-bold text-green-900">
                      {stats?.completed || 0}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-lg">
                    <FileText className="h-8 w-8 text-purple-600 mb-2" />
                    <p className="text-sm font-medium text-purple-800">Durchschnittlicher Umsatz</p>
                    <h3 className="text-3xl font-bold text-purple-900">
                      {stats?.completed && detailedStats?.revenue?.total 
                        ? (detailedStats.revenue.total / stats.completed).toFixed(2) 
                        : '0.00'} €
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Umsatz nach Status */}
            <Card>
              <CardHeader>
                <CardTitle>Umsatz nach Status</CardTitle>
                <CardDescription>Verteilung des Umsatzes nach Reparaturstatus</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]" ref={revenueChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) => `${name}: ${value}€ (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} €`, 'Umsatz']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Umsatz nach Monat */}
            <Card>
              <CardHeader>
                <CardTitle>Umsatz nach Monat</CardTitle>
                <CardDescription>Monatliche Umsatzentwicklung</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueByMonthData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} €`, 'Umsatz']} />
                      <Legend />
                      <Bar dataKey="value" name="Umsatz" fill="#8884d8" label={{ position: 'top', fill: '#666' }}>
                        {revenueByMonthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}