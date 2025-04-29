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
  { value: 'today', label: 'Heute' },
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
    if ((timeRange === 'custom' || revenueTimeRange === 'custom') && !customDateRangeActive) {
      setCustomDateDialogOpen(true);
    }
  }, [timeRange, revenueTimeRange, customDateRangeActive]);

  // Funktion für das Zurücksetzen des benutzerdefinierten Zeitraums
  const resetCustomDateRange = () => {
    setCustomDateRangeActive(false);
    setCustomDateStart(undefined);
    setCustomDateEnd(undefined);
    
    // Setze beide Zeitrahmen zurück, wenn sie auf 'custom' eingestellt sind
    if (timeRange === 'custom') {
      setTimeRange('all');
    }
    if (revenueTimeRange === 'custom') {
      setRevenueTimeRange('all');
    }
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
      
      // Wenn der Dialog für die Umsatzstatistik geöffnet wurde, behalte den benutzerdefinierten Zeitraum bei
      // sonst setze ihn zurück wenn ein anderer Tab aktiv ist
      if (timeRange === 'custom' && revenueTimeRange === 'custom') {
        // Beide Tabs sind auf benutzerdefinierten Zeitraum eingestellt
      } else if (timeRange === 'custom') {
        // Nur der allgemeine Statistik-Tab benötigt den benutzerdefinierten Zeitraum
      } else if (revenueTimeRange === 'custom') {
        // Nur der Umsatz-Tab benötigt den benutzerdefinierten Zeitraum
      }
    } else {
      alert('Bitte wählen Sie ein Start- und Enddatum aus.');
    }
  };

  // Datumsbereich basierend auf der ausgewählten Option berechnen
  const getDateRange = (rangeType: string) => {
    // Wenn benutzerdefinierter Zeitraum aktiv ist, verwende diese Daten
    if ((rangeType === 'custom') && customDateRangeActive && customDateStart && customDateEnd) {
      // Setze den Endzeitpunkt auf das Ende des Tages für korrekten Vergleich
      const endWithTime = new Date(customDateEnd);
      endWithTime.setHours(23, 59, 59, 999);
      return { start: customDateStart, end: endWithTime };
    }

    const now = new Date();
    switch(rangeType) {
      case 'today':
        // Nur der heutige Tag (von 00:00 bis jetzt)
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        return { start: todayStart, end: now };
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
  // Kunden für die Anzeige der Kundennamen laden
  const { data: customers } = useQuery({
    queryKey: ['/api/customers']
  });

  // Erweiterte Repair-Typ, der customerName beinhaltet
  type ExtendedRepair = Repair & { customerName?: string };
  
  // Repair-Daten mit Kundennamen anreichern
  const recentRepairs = useMemo(() => {
    const repairs = detailedStats?.mostRecentRepairs || [];
    
    if (!customers) return repairs as ExtendedRepair[];
    
    return repairs.map(repair => {
      const customer = customers.find((c: any) => c.id === repair.customerId);
      return {
        ...repair,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unbekannt'
      } as ExtendedRepair;
    });
  }, [detailedStats, customers]);
  
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
    
  // Formatiere die Balkendiagramm-Daten abhängig vom ausgewählten Zeitraum
  const getRevenueBarChartData = () => {
    if (!revenueStats?.revenue) return [];
    
    // Wenn nach Tagen gefiltert wird (heute, letzte 7 Tage, letzte 30 Tage, benutzerdefiniert)
    if (revenueTimeRange === 'today' || revenueTimeRange === '7days' || revenueTimeRange === '30days' || 
        (revenueTimeRange === 'custom' && customDateRangeActive)) {
      
      // Bei tagesgenauer Auswertung: prüfen ob Daten nach Tagen vorhanden sind
      if (revenueStats.revenue.byDay) {
        return Object.entries(revenueStats.revenue.byDay)
          .sort((a, b) => {
            // Datumsformat: YYYY-MM-DD
            return new Date(a[0]).getTime() - new Date(b[0]).getTime();
          })
          .map(([key, value]) => {
            // Formatiere das Datum als DD.MM.
            const dateParts = key.split('-');
            const day = dateParts[2];
            const month = dateParts[1];
            const formattedDate = `${day}.${month}.`;
            
            return {
              name: formattedDate,
              value: parseFloat(value.toFixed(2))
            };
          });
      }
    }
    
    // Standard: Nach Monaten gruppiert
    return Object.entries(revenueStats.revenue.byMonth)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([key, value]) => {
        const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        const monthIndex = parseInt(key) - 1;
        const name = monthNames[monthIndex];
        return {
          name,
          value: parseFloat(value.toFixed(2))
        };
      });
  };
  
  const filteredRevenueByMonthData = getRevenueBarChartData();

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

      // PDF im A4-Format erstellen (Querformat für mehr Platz)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // A4 Querformat: 297 x 210 mm
      const pageWidth = 297;
      
      // Hintergrund und Design für das Dokument
      pdf.setFillColor(245, 247, 250); // Heller Hintergrund für Kopfbereich
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setDrawColor(0, 110, 183); // Blaue Linie
      pdf.setLineWidth(0.5);
      pdf.line(14, 30, pageWidth - 14, 30);
      
      // Dokumententitel mit Zeitraum direkt im Titel
      let titleText = 'Reparaturstatistik';
      if (timeRange !== 'all') {
        const rangeOption = timeRangeOptions.find(opt => opt.value === timeRange);
        if (rangeOption) {
          titleText += ` - Zeitraum: ${rangeOption.label}`;
        } else if (timeRange === 'custom' && customDateStart && customDateEnd) {
          // Format custom date range
          const formatDate = (date: Date) => date.toLocaleDateString('de-DE');
          titleText += ` - Zeitraum: ${formatDate(customDateStart)} bis ${formatDate(customDateEnd)}`;
        }
      }
      
      pdf.setFontSize(18);
      pdf.setTextColor(30, 41, 59); // Dunkelblau für den Titel
      pdf.setFont('helvetica', 'bold');
      pdf.text(titleText, 14, 15);
      
      // Datum und Filter-Information
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // Grau für das Datum
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 25);
      
      if (stats?.filteredRepairCount !== undefined) {
        pdf.text(`Erfasste Reparaturen: ${stats.filteredRepairCount}`, pageWidth - 100, 25);
      }
      
      // ===== Erste Zeile: Tabellarische Übersicht und Gerätetypen =====
      const startY = 40;
      
      // Überschrift für die Gesamtübersicht
      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Gesamtübersicht', 14, startY - 5);
      
      // Tabellarische Übersicht erstellen (verkleinert)
      pdf.setFillColor(240, 249, 255); // Heller blauer Hintergrund für Tabelle
      pdf.rect(14, startY, 115, 40, 'F');
      
      // Tabelle mit Werten - erste Spalte
      pdf.setFontSize(9);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kategorie', 17, startY + 7);
      pdf.text('Anzahl Kunden', 17, startY + 15);
      pdf.text('Reparaturen gesamt', 17, startY + 23);
      pdf.text('In Bearbeitung', 17, startY + 31);
      pdf.text('Abgeschlossen', 17, startY + 39);
      
      // Zweite Spalte (Werte)
      pdf.setFont('helvetica', 'normal');
      pdf.text('Wert', 70, startY + 7);
      pdf.text(`${stats?.customerCount || 0}`, 70, startY + 15);
      pdf.text(`${stats?.repairCount || 0}`, 70, startY + 23);
      pdf.text(`${stats?.inRepair || 0}`, 70, startY + 31);
      pdf.text(`${stats?.completed || 0}`, 70, startY + 39);
      
      // Umsatzübersicht daneben
      if (detailedStats?.revenue) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Umsatzübersicht', 140, startY - 5);
        
        pdf.setFillColor(240, 249, 255);
        pdf.rect(140, startY, 143, 40, 'F');
        
        // Umsatztabelle
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Kategorie', 143, startY + 7);
        pdf.text('Gesamtumsatz', 143, startY + 15);
        pdf.text('Durchschnitt pro Reparatur', 143, startY + 23);
        
        // Werte
        pdf.setFont('helvetica', 'normal');
        pdf.text('Wert (€)', 220, startY + 7);
        pdf.text(`${detailedStats.revenue.total.toFixed(2)} €`, 220, startY + 15);
        const avgRevenue = stats?.completed 
          ? (detailedStats.revenue.total / stats.completed).toFixed(2)
          : '0.00';
        pdf.text(`${avgRevenue} €`, 220, startY + 23);
      }
      
      // ===== Zweite Zeile: Diagramme nebeneinander =====
      const chartY = 95;
      const chartHeight = 85; // Höhe der Diagramme

      // Links: Gerätetypen-Diagramm
      if (deviceTypeChartRef.current) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Verteilung nach Gerätetyp', 14, chartY - 5);
        
        try {
          const deviceTypeCanvas = await html2canvas(deviceTypeChartRef.current, {
            scale: 1.5, // Höhere Qualität
            backgroundColor: null,
            logging: false
          });
          
          // Diagramm als Bild zum PDF hinzufügen
          const imgWidth = 85;
          const imgHeight = Math.min(chartHeight, (deviceTypeCanvas.height * imgWidth) / deviceTypeCanvas.width);
          
          const deviceTypeImg = deviceTypeCanvas.toDataURL('image/png');
          pdf.addImage(deviceTypeImg, 'PNG', 14, chartY, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Gerätetyp-Diagramms:', e);
        }
      }
      
      // Mitte: Hersteller-Diagramm
      if (brandChartRef.current) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Verteilung nach Herstellern', 105, chartY - 5);
        
        try {
          const brandCanvas = await html2canvas(brandChartRef.current, {
            scale: 1.5,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = 85;
          const imgHeight = Math.min(chartHeight, (brandCanvas.height * imgWidth) / brandCanvas.width);
          
          const brandImg = brandCanvas.toDataURL('image/png');
          pdf.addImage(brandImg, 'PNG', 105, chartY, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Hersteller-Diagramms:', e);
        }
      }
      
      // Rechts: Problem-Diagramm oder Umsatz-Diagramm (je nach Verfügbarkeit)
      if (issueChartRef.current) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Verteilung nach Problemen', 198, chartY - 5);
        
        try {
          const issueCanvas = await html2canvas(issueChartRef.current, {
            scale: 1.5,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = 85;
          const imgHeight = Math.min(chartHeight, (issueCanvas.height * imgWidth) / issueCanvas.width);
          
          const issueImg = issueCanvas.toDataURL('image/png');
          pdf.addImage(issueImg, 'PNG', 198, chartY, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Problem-Diagramms:', e);
        }
      }
      
      // Umsatz-Diagramm (falls vorhanden) unter den anderen Diagrammen
      if (revenueChartRef.current && detailedStats?.revenue) {
        try {
          const umsatzY = chartY + chartHeight + 10; // Platzierung unter den anderen Diagrammen
          
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Umsatzentwicklung im Zeitraum', 14, umsatzY - 5);
          
          const revenueCanvas = await html2canvas(revenueChartRef.current, {
            scale: 1.5,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = 269; // Volle Breite für das Umsatzdiagramm
          const imgHeight = Math.min(70, (revenueCanvas.height * imgWidth) / revenueCanvas.width);
          
          const revenueImg = revenueCanvas.toDataURL('image/png');
          pdf.addImage(revenueImg, 'PNG', 14, umsatzY, imgWidth, imgHeight);
        } catch (e) {
          console.error('Fehler beim Erfassen des Umsatz-Diagramms:', e);
        }
      }
      
      // Footer am unteren Rand
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')} | Handyshop | Statistik-Export`, 14, 200);
      
      // PDF herunterladen
      pdf.save('reparatur-statistik.pdf');
      
      setIsExporting(false); // Exportstatus zurücksetzen
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      setIsExporting(false);
      alert('Beim PDF-Export ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
    }
  };

  // Spezieller PDF-Export für die Umsatzstatistik 
  const exportRevenueStatsToPDF = async () => {
    if (!revenueStats?.revenue) return;
    
    try {
      setIsExporting(true);

      // PDF im A4-Format erstellen (Querformat für mehr Platz bei Diagrammen)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // A4 Querformat: 297 x 210 mm
      const pageWidth = 297;
      const pageHeight = 210;
      
      // Hintergrund und Design für das Dokument
      pdf.setFillColor(245, 247, 250); // Heller Hintergrund für Kopfbereich
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setDrawColor(0, 110, 183); // Blaue Linie
      pdf.setLineWidth(0.5);
      pdf.line(14, 30, pageWidth - 14, 30);
      
      // Dokumententitel mit Zeitraum im Titel hervorheben
      let titleText = 'Umsatzstatistik';
      let timeRangeText = '';
      
      // Zeitraum deutlich formatieren
      if (revenueTimeRange !== 'all') {
        const rangeOption = timeRangeOptions.find(opt => opt.value === revenueTimeRange);
        if (rangeOption) {
          timeRangeText = rangeOption.label;
        } else if (revenueTimeRange === 'custom' && customDateStart && customDateEnd) {
          const formatDate = (date: Date) => date.toLocaleDateString('de-DE');
          timeRangeText = `${formatDate(customDateStart)} bis ${formatDate(customDateEnd)}`;
        }
      } else {
        timeRangeText = 'Alle Daten';
      }
      
      pdf.setFontSize(20);
      pdf.setTextColor(30, 41, 59); // Dunkelblau für den Titel
      pdf.setFont('helvetica', 'bold');
      pdf.text(titleText, 14, 15);
      
      // Datum und Gesamtumsatz
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128); // Grau für das Datum
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 25);
      
      // Zeitraum deutlich sichtbar machen
      pdf.setFontSize(12);
      pdf.setTextColor(30, 64, 175); // Blau für den Zeitraum
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Zeitraum: ${timeRangeText}`, pageWidth - 120, 15);
      
      // Gesamtumsatz anzeigen
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 112, 60); // Grün für den Umsatz
      pdf.text(`Gesamtumsatz: ${revenueStats.revenue.total.toFixed(2)} €`, pageWidth - 120, 25);
      
      // Layout für bessere Darstellung
      const startY = 40;
      
      // Drei Infokarten in einer Reihe
      const cardWidth = 80;
      const cardHeight = 60;
      const margin = 10;
      
      // Karte 1: Gesamtumsatz
      pdf.setFillColor(235, 245, 255); // Heller blauer Hintergrund
      pdf.rect(14, startY, cardWidth, cardHeight, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 64, 175); // Dunkelblau
      pdf.setFont('helvetica', 'bold');
      pdf.text('Gesamtumsatz', 20, startY + 15);
      pdf.setFontSize(18);
      pdf.text(`${revenueStats.revenue.total.toFixed(2)} €`, 20, startY + 35);
      
      // Karte 2: Anzahl Reparaturen
      pdf.setFillColor(236, 253, 245); // Heller grüner Hintergrund
      pdf.rect(14 + cardWidth + margin, startY, cardWidth, cardHeight, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(6, 95, 70); // Dunkelgrün
      pdf.setFont('helvetica', 'bold');
      pdf.text('Abgeschlossene Reparaturen', 20 + cardWidth + margin, startY + 15);
      pdf.setFontSize(18);
      pdf.text(`${stats?.completed || 0}`, 20 + cardWidth + margin, startY + 35);
      
      // Karte 3: Durchschnittlicher Umsatz pro Reparatur
      pdf.setFillColor(243, 232, 255); // Heller lila Hintergrund
      pdf.rect(14 + (cardWidth + margin) * 2, startY, cardWidth, cardHeight, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(107, 33, 168); // Dunkellila
      pdf.setFont('helvetica', 'bold');
      pdf.text('Durchschnitt pro Reparatur', 20 + (cardWidth + margin) * 2, startY + 15);
      pdf.setFontSize(18);
      const avgRevenue = stats?.completed && revenueStats.revenue.total 
        ? (revenueStats.revenue.total / stats.completed).toFixed(2)
        : '0.00';
      pdf.text(`${avgRevenue} €`, 20 + (cardWidth + margin) * 2, startY + 35);
      
      // Diagramme in zwei Spalten anordnen für bessere Lesbarkeit
      const leftCol = 14;
      const rightCol = pageWidth / 2 + 10;
      const diagramsY = startY + cardHeight + 20;
      
      // Umsatzdiagramm nach Status (Kreisdiagramm) - linke Spalte
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Umsatzverteilung nach Status', leftCol, diagramsY - 5);
      
      try {
        if (revenueChartRef.current) {
          const revenueCanvas = await html2canvas(revenueChartRef.current, {
            scale: 1.5,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = pageWidth / 2 - 30;
          const imgHeight = Math.min(110, (revenueCanvas.height * imgWidth) / revenueCanvas.width);
          
          const revenueImg = revenueCanvas.toDataURL('image/png');
          pdf.addImage(revenueImg, 'PNG', leftCol, diagramsY, imgWidth, imgHeight);
        }
      } catch (e) {
        console.error('Fehler beim Erfassen des Umsatz-Diagramms:', e);
      }
      
      // Balkendiagramm für Umsatz nach Monat/Tag - rechte Spalte
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Umsatzentwicklung im Zeitraum', rightCol, diagramsY - 5);
      
      try {
        const barChartContainer = document.querySelector('.revenue-bar-chart-container');
        if (barChartContainer) {
          const barCanvas = await html2canvas(barChartContainer as HTMLElement, {
            scale: 1.5,
            backgroundColor: null,
            logging: false
          });
          
          const imgWidth = pageWidth / 2 - 30;
          const imgHeight = Math.min(110, (barCanvas.height * imgWidth) / barCanvas.width);
          
          const barImg = barCanvas.toDataURL('image/png');
          pdf.addImage(barImg, 'PNG', rightCol, diagramsY, imgWidth, imgHeight);
        }
      } catch (e) {
        console.error('Fehler beim Erfassen des Balkendiagramms:', e);
      }
      
      // Footer am unteren Rand
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')} | Handyshop | Umsatzstatistik-Export`, 14, pageHeight - 10);
      
      // PDF herunterladen
      pdf.save('umsatzstatistik.pdf');
      
      setIsExporting(false);
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
      // Entscheiden welcher Export verwendet werden soll basierend auf dem aktiven Tab
      const activeTab = document.querySelector('[role="tabpanel"][data-state="active"]')?.getAttribute('data-value');
      if (activeTab === 'revenue') {
        exportRevenueStatsToPDF();
      } else {
        exportToPDF();
      }
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
            <CardContent className="px-0 sm:px-6">
              {/* Desktop Tabelle (nur auf größeren Bildschirmen anzeigen) */}
              <div className="hidden md:block overflow-x-auto">
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
              
              {/* Mobile Karten-Ansicht (nur auf kleineren Bildschirmen anzeigen) */}
              <div className="md:hidden space-y-2 px-4">
                {recentRepairs.map((repair) => (
                  <div key={repair.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50">
                      <div className="font-medium text-sm">{repair.orderCode}</div>
                      <div>
                        {(() => {
                          switch (repair.status) {
                            case 'eingegangen':
                              return <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">Eingegangen</span>;
                            case 'in_reparatur':
                              return <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">In Reparatur</span>;
                            case 'ersatzteil_eingetroffen':
                              return <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">Ersatzteil da</span>;
                            case 'ausser_haus':
                              return <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Außer Haus</span>;
                            case 'fertig':
                              return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Fertig</span>;
                            case 'abgeholt':
                              return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Abgeholt</span>;
                            default:
                              return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">{repair.status}</span>;
                          }
                        })()}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      <div className="p-3 flex justify-between">
                        <span className="text-xs text-gray-500">Kunde</span>
                        <span className="text-sm font-medium">{repair.customerName || repair.customerId || "Unbekannt"}</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="text-xs text-gray-500">Gerät</span>
                        <span className="text-sm">{repair.brand} {repair.model}</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="text-xs text-gray-500">Problem</span>
                        <span className="text-sm text-right max-w-[60%]">{repair.issue.substring(0, 30)}...</span>
                      </div>
                      <div className="p-3 flex justify-between">
                        <span className="text-xs text-gray-500">Preis</span>
                        <span className="text-sm font-medium">{repair.estimatedCost ? extractPrice(repair.estimatedCost).toFixed(2) : '0.00'} €</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Summen in der Mobil-Ansicht */}
                <div className="bg-gray-100 rounded-lg p-3 mt-2 font-medium text-sm">
                  <div className="flex justify-between items-center">
                    <span>Summe abgeholter Reparaturen:</span>
                    <span>
                      {recentRepairs
                        .filter(repair => repair.status === 'abgeholt')
                        .reduce((sum, repair) => {
                          const cost = repair.estimatedCost ? extractPrice(repair.estimatedCost) : 0;
                          return sum + cost;
                        }, 0)
                        .toFixed(2)} €
                    </span>
                  </div>
                </div>
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
                      {stats?.completed && revenueStats?.revenue?.total 
                        ? (revenueStats.revenue.total / stats.completed).toFixed(2) 
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
                        data={filteredRevenueByStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) => `${name}: ${value}€ (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {filteredRevenueByStatusData.map((entry, index) => (
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
                <div className="h-[300px] revenue-bar-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredRevenueByMonthData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} €`, 'Umsatz']} />
                      <Legend />
                      <Bar dataKey="value" name="Umsatz" fill="#8884d8" label={{ position: 'top', fill: '#666' }}>
                        {filteredRevenueByMonthData.map((entry, index) => (
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