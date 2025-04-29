import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X, BarChart as BarChartIcon, Download } from 'lucide-react';
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

interface RevenueStatsProps {
  revenueStats: DetailedStats | undefined;
  revenueTimeRange: string;
  setRevenueTimeRange: (range: string) => void;
  revenueDateRange: {
    start: Date | undefined;
    end: Date | undefined;
  };
  setRevenueDateRange: (range: {
    start: Date | undefined;
    end: Date | undefined;
  }) => void;
  revenueDatePickerOpen: boolean;
  setRevenueDatePickerOpen: (open: boolean) => void;
  revenueChartRef: React.RefObject<HTMLDivElement>;
  timeRangeOptions: { value: string, label: string }[];
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
}

// Farben für Diagramme
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const RevenueStats: React.FC<RevenueStatsProps> = ({
  revenueStats,
  revenueTimeRange,
  setRevenueTimeRange,
  revenueDateRange,
  setRevenueDateRange,
  revenueDatePickerOpen,
  setRevenueDatePickerOpen,
  revenueChartRef,
  timeRangeOptions,
  isExporting,
  setIsExporting
}) => {
  const [customDateRangeActive, setCustomDateRangeActive] = useState(false);
  
  // Berechne die nach Status filtrierten Umsatzdaten
  const filteredRevenueByStatusData = revenueStats?.revenue?.byStatus
    ? Object.entries(revenueStats.revenue.byStatus).map(([key, value]) => ({
        name: key,
        value: parseFloat(value.toFixed(2))
      }))
    : [];
  
  // Berechne die nach Zeit filtrierten Umsatzdaten
  const getRevenueChartData = () => {
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
  
  const filteredRevenueByMonthData = getRevenueChartData();
  
  // PDF-Export-Funktion für die Umsatzstatistik 
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
        } else if (revenueTimeRange === 'custom' && revenueDateRange.start && revenueDateRange.end) {
          const formatDate = (date: Date) => date.toLocaleDateString('de-DE');
          timeRangeText = `${formatDate(revenueDateRange.start)} bis ${formatDate(revenueDateRange.end)}`;
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
      
      if (timeRangeText) {
        pdf.text(`Zeitraum: ${timeRangeText}`, 100, 25);
      }
      
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text(
        `Gesamtumsatz: ${revenueStats.revenue.total.toFixed(2)} €`, 
        pageWidth - 120, 
        25
      );
      
      // Inhalt beginnen
      const startY = 40;
      
      // Drei Infokarten in einer Reihe
      const cardWidth = 80;
      const cardHeight = 60;
      const margin = 10;
      
      // Karte 1: Gesamtumsatz
      pdf.setFillColor(240, 249, 255);
      pdf.rect(14, startY, cardWidth, cardHeight, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 112, 60); // Grün für den Umsatz
      pdf.text(`${revenueStats.revenue.total.toFixed(2)} €`, 14 + 10, startY + 30);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(30, 41, 59);
      pdf.text('Gesamtumsatz', 14 + 10, startY + 15);
      
      // Anzahl der Tage im Zeitraum berechnen (wenn möglich)
      let daysInRange = 0;
      if (revenueTimeRange === 'today') {
        daysInRange = 1;
      } else if (revenueTimeRange === '7days') {
        daysInRange = 7;
      } else if (revenueTimeRange === '30days') {
        daysInRange = 30;
      } else if (revenueTimeRange === 'custom' && revenueDateRange.start && revenueDateRange.end) {
        const diffTime = Math.abs(revenueDateRange.end.getTime() - revenueDateRange.start.getTime());
        daysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 um inklusive zu sein
      }
      
      pdf.setFontSize(8);
      if (daysInRange > 0) {
        const avgPerDay = (revenueStats.revenue.total / daysInRange).toFixed(2);
        pdf.text(`Durchschnitt: ${avgPerDay} € pro Tag`, 14 + 10, startY + 40);
      }
      
      // Karte 2: Aufträge nach Status
      const card2X = 14 + cardWidth + margin;
      pdf.setFillColor(240, 249, 255);
      pdf.rect(card2X, startY, cardWidth, cardHeight, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('Umsatz nach Status', card2X + 10, startY + 15);
      
      // Status-Tabelle
      let currentY = startY + 25;
      if (filteredRevenueByStatusData.length > 0) {
        filteredRevenueByStatusData.forEach((item, index) => {
          if (index < 4) { // Maximal 4 Einträge anzeigen, um Platz zu sparen
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(item.name, card2X + 10, currentY);
            
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${item.value.toFixed(2)} €`, card2X + 60, currentY);
            
            currentY += 8;
          }
        });
      } else {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Keine Daten verfügbar', card2X + 10, currentY);
      }
      
      // Karte 3: Durchschnitt pro Reparatur
      const card3X = card2X + cardWidth + margin;
      pdf.setFillColor(240, 249, 255);
      pdf.rect(card3X, startY, cardWidth, cardHeight, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('Durchschnittswerte', card3X + 10, startY + 15);
      
      // Berechnen wir den Durchschnitt pro Reparatur
      const completedOrders = filteredRevenueByStatusData.find(item => item.name === 'completed' || item.name === 'pickedUp');
      const avgPerRepair = completedOrders && completedOrders.value > 0 
        ? (revenueStats.revenue.total / completedOrders.value).toFixed(2)
        : 'N/A';
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Pro Reparatur:', card3X + 10, startY + 30);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${avgPerRepair} €`, card3X + 60, startY + 30);
      
      // Diagramm
      if (revenueChartRef.current) {
        try {
          const canvas = await html2canvas(revenueChartRef.current, {
            scale: 1.5,
            backgroundColor: null,
            logging: false
          });
          
          const chartY = startY + cardHeight + 20;
          const chartWidthMm = 260; // Breite in mm
          const chartHeightMm = 100; // Höhe in mm
          
          const chartImg = canvas.toDataURL('image/png');
          pdf.addImage(chartImg, 'PNG', 14, chartY, chartWidthMm, chartHeightMm);
          
          // Titel für das Diagramm
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 41, 59);
          pdf.text('Umsatzentwicklung im Zeitraum', 14, chartY - 5);
          
        } catch (e) {
          console.error('Fehler beim Erfassen des Umsatz-Diagramms:', e);
        }
      }
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Handyshop | Umsatzstatistik | Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, pageHeight - 10);
      
      // PDF herunterladen
      pdf.save('umsatz-statistik.pdf');
    } catch (e) {
      console.error('Fehler beim PDF-Export:', e);
    } finally {
      setIsExporting(false);
    }
  };
  
  if (!revenueStats) return null;

  return (
    <div className="space-y-4">
      {/* Steuerelemente für die Umsatzansicht */}
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="flex space-x-2">
          <div className="w-full sm:w-auto">
            <Select
              value={revenueTimeRange}
              onValueChange={(value) => {
                setRevenueTimeRange(value);
                if (value === 'custom') {
                  setRevenueDatePickerOpen(true);
                  setCustomDateRangeActive(true);
                } else {
                  setCustomDateRangeActive(false);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
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
          
          {revenueTimeRange === 'custom' && (
            <Button 
              variant="outline" 
              onClick={() => setRevenueDatePickerOpen(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Bearbeiten</span>
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={exportRevenueStatsToPDF}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">PDF Export</span>
          </Button>
        </div>
      </div>
      
      {/* Popup für Datumsauswahl */}
      <Popover open={revenueDatePickerOpen} onOpenChange={setRevenueDatePickerOpen}>
        <PopoverContent className="flex flex-col p-2 space-y-2 w-auto" align="end">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">Zeitraum wählen</span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={() => setRevenueDatePickerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs mb-1 text-muted-foreground">Von</p>
              <CalendarComponent
                mode="single"
                selected={revenueDateRange.start}
                onSelect={(date) => {
                  setRevenueDateRange({
                    ...revenueDateRange,
                    start: date
                  });
                }}
                className="border rounded-md p-2"
                locale={de}
                disabled={{after: revenueDateRange.end || new Date()}}
              />
            </div>
            
            <div>
              <p className="text-xs mb-1 text-muted-foreground">Bis</p>
              <CalendarComponent
                mode="single"
                selected={revenueDateRange.end}
                onSelect={(date) => {
                  setRevenueDateRange({
                    ...revenueDateRange,
                    end: date
                  });
                }}
                className="border rounded-md p-2"
                locale={de}
                disabled={{before: revenueDateRange.start, after: new Date()}}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={() => {
                setRevenueDatePickerOpen(false);
                setCustomDateRangeActive(true);
              }}
              disabled={!revenueDateRange.start || !revenueDateRange.end}
            >
              Übernehmen
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Zeitraum-Anzeige bei benutzerdefiniertem Zeitraum */}
      {revenueTimeRange === 'custom' && revenueDateRange.start && revenueDateRange.end && (
        <div>
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Zeitraum: {format(revenueDateRange.start, 'dd.MM.yyyy')} - {format(revenueDateRange.end, 'dd.MM.yyyy')}
          </Badge>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Umsatzverteilung</CardTitle>
            <CardDescription>Nach Status gruppiert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Umsatz nach Status */}
              <div>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {filteredRevenueByStatusData.map((item) => (
                    <div key={item.name} className="bg-muted/50 p-3 rounded-lg">
                      <dt className="text-sm font-semibold text-muted-foreground">{item.name}</dt>
                      <dd className="text-xl font-bold">{item.value.toFixed(2)} €</dd>
                    </div>
                  ))}
                </dl>
              </div>
              
              {/* Gesamtumsatz */}
              <div className="flex justify-end">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <div className="text-sm font-semibold text-muted-foreground">Gesamtumsatz</div>
                  <div className="text-2xl font-bold text-primary">
                    {revenueStats.revenue.total.toFixed(2)} €
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Umsatzentwicklung</CardTitle>
            <CardDescription>
              {revenueTimeRange === 'today' || revenueTimeRange === '7days' || revenueTimeRange === '30days' || 
              (revenueTimeRange === 'custom' && customDateRangeActive)
                ? 'Nach Tagen gruppiert'
                : 'Nach Monaten gruppiert'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" ref={revenueChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredRevenueByMonthData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} €`, 'Umsatz']} />
                  <Legend />
                  <Bar dataKey="value" name="Umsatz (€)" fill="#8884d8">
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
    </div>
  );
};